'use client';

/**
 * View-model hook for RealtimeResultsScreen.
 *
 * Owns every derivation, animation-phase state, and analytics effect
 * that the wrapper component previously held inline. The wrapper now
 * passes its props straight in and renders from the returned
 * `MatchResultViewModel`.
 *
 * Critical invariant: the `trackMatchResultsViewed` / `trackLevelUp` /
 * `trackDivisionPromoted` analytics call MUST fire exactly once per
 * mount. The original component guarded that with a `trackedMatch`
 * `useState` flag inside an empty-deps effect; this hook preserves
 * that pattern verbatim (the `useEffect(..., [])` + early-return guard).
 * The regression test
 * `src/features/game/__tests__/RealtimeResultsScreen.test.tsx`
 * pins the fire-once contract end-to-end via the wrapper.
 */

import { useEffect, useMemo, useState } from 'react';
import { useHeadToHead } from '@/lib/queries/stats.queries';
import { applyXpReward, getMatchXpReward } from '@/lib/domain/matchXp';
import { getTierVisual } from '@/utils/tierVisuals';
import { getRankedTierProgress, getNextTierBand, tierFromRp } from '@/utils/rankedTier';
import { trackMatchResultsViewed, trackDivisionPromoted, trackLevelUp } from '@/lib/analytics/game-events';
import { logger } from '@/utils/logger';
import { useLocale } from '@/contexts/LocaleContext';
import type { RankedMatchOutcomePayload } from '@/lib/realtime/socket.types';
import type { RealtimeResultsScreenProps } from './results.types';

export interface MatchResultViewModel {
  // Win/loss/draw resolution
  playerWon: boolean;
  isDraw: boolean;
  resultHeading: 'VICTORY' | 'DEFEAT' | 'DRAW';

  // Head-to-head label
  totalGamesLabel: string;

  // Ranked outcome derivations
  myOutcome: RankedMatchOutcomePayload['byUserId'][string] | null;
  showRankedRpCard: boolean;
  rpChange: number;
  oldRP: number;
  newRP: number;
  rpTierInfo: ReturnType<typeof getRankedTierProgress>;
  oldRpTierInfo: ReturnType<typeof getRankedTierProgress>;
  tierChanged: boolean;
  tierPromoted: boolean;
  nextTierBand: ReturnType<typeof getNextTierBand>;

  // Placement
  isPlacementMatch: boolean;
  placementPlayed: number;
  placementRequired: number;
  placementMatchesLeft: number;
  justPlaced: boolean;

  // Reveal (post-placement)
  hasServerReveal: boolean;
  revealTier: ReturnType<typeof tierFromRp>;
  revealTierVisual: ReturnType<typeof getTierVisual>;

  // XP / level progression
  xpEarned: number;
  projectedProgression: ReturnType<typeof applyXpReward> | null;
  xpToNextLevelAfterMatch: number;
  accuracy: number;

  // Tier display for hero
  playerTier: ReturnType<typeof tierFromRp> | null;
  opponentTier: ReturnType<typeof tierFromRp> | null;
  opponentDisplayRp: number | null;

  // Animation phase state (owned by the hook)
  showRankReveal: boolean;
  tierTransitionPhase: 'fill' | 'settled';
}

export function useMatchResultViewModel(props: RealtimeResultsScreenProps): MatchResultViewModel {
  const { t } = useLocale();
  const {
    matchType,
    playerScore,
    opponentScore,
    playerCorrect,
    totalQuestions,
    selfUserId,
    finalWinnerId,
    winnerDecisionMethod,
    preMatchRp,
    opponentId,
    opponentRankPoints = null,
    rankedOutcome,
    preMatchRankedProfile,
    preMatchProgression,
  } = props;

  const hasAuthoritativeWinner = finalWinnerId !== undefined;
  const playerWon = hasAuthoritativeWinner
    ? finalWinnerId === selfUserId
    : playerScore > opponentScore;
  const isDraw = hasAuthoritativeWinner
    ? finalWinnerId === null
    : playerScore === opponentScore;

  // H2H record (already includes this match)
  const { data: h2hSummary } = useHeadToHead(selfUserId, opponentId);
  const totalMatches = h2hSummary?.total ?? 0;

  // --- Ranked data from backend settlement ---
  const myOutcome = useMemo(() => {
    if (!rankedOutcome) return null;
    const bySelf = rankedOutcome.byUserId[selfUserId];
    if (bySelf) return bySelf;
    const byNonOpponent = Object.entries(rankedOutcome.byUserId).find(([userId]) => userId !== opponentId)?.[1];
    return byNonOpponent ?? null;
  }, [opponentId, rankedOutcome, selfUserId]);

  // Placement state: use pre-match profile (already known) + increment by 1
  const preIsPlacement = preMatchRankedProfile ? preMatchRankedProfile.placementStatus !== 'placed' : false;
  const isPlacementMatch = myOutcome ? myOutcome.isPlacement === true : (matchType === 'ranked' && preIsPlacement);
  const placementPlayed = myOutcome?.placementPlayed ?? (preIsPlacement ? Math.min(preMatchRankedProfile!.placementPlayed + 1, preMatchRankedProfile!.placementRequired) : 0);
  const placementRequired = Math.max(1, myOutcome?.placementRequired ?? preMatchRankedProfile?.placementRequired ?? 3);
  const placementMatchesLeft = Math.max(0, placementRequired - placementPlayed);
  // justPlaced: optimistic if this was the last placement match
  const optimisticJustPlaced = preIsPlacement && placementPlayed >= placementRequired;
  const justPlaced = myOutcome ? (myOutcome.isPlacement && myOutcome.placementStatus === 'placed') : optimisticJustPlaced;

  const oldRpBase = preMatchRankedProfile?.rp ?? preMatchRp ?? 0;

  const isSelfWinner = playerWon;
  const isForfeitLoss = winnerDecisionMethod === 'forfeit' && !isSelfWinner;
  const matchResult: 'win' | 'loss' | 'draw' = isDraw ? 'draw' : isSelfWinner ? 'win' : 'loss';
  const xpEarned = getMatchXpReward({
    mode: matchType,
    result: matchResult,
    isForfeitLoss,
  });
  const projectedProgression = preMatchProgression
    ? applyXpReward(preMatchProgression, xpEarned)
    : null;
  const leveledUp = Boolean(
    preMatchProgression && projectedProgression && projectedProgression.level > preMatchProgression.level
  );
  const xpToNextLevelAfterMatch = projectedProgression
    ? Math.max(0, projectedProgression.xpForNextLevel - projectedProgression.currentLevelXp)
    : 0;

  // Ranked RP is persisted by the backend. Only render the RP card from
  // authoritative settlement data so profile and result screens cannot diverge.
  const rpChange = myOutcome?.deltaRp ?? 0;
  const oldRP = myOutcome?.oldRp ?? oldRpBase;
  const newRP = myOutcome?.newRp ?? oldRP;

  const showRankedRpCard = matchType === 'ranked'
    && !isPlacementMatch
    && myOutcome != null;

  const accuracy = totalQuestions === 0 ? 0 : Math.round((playerCorrect / totalQuestions) * 100);

  const rpTierInfo = getRankedTierProgress(newRP);
  const oldRpTierInfo = getRankedTierProgress(oldRP);
  const tierChanged = rpTierInfo.tier !== oldRpTierInfo.tier;
  const tierPromoted = tierChanged && newRP > oldRP;
  // Next tier (e.g. for "Youth Prospect" → "Reserve") for the NEXT STAGE label.
  const nextTierBand = getNextTierBand(newRP);

  useEffect(() => {
    if (matchType !== 'ranked') return;
    logger.info('Realtime ranked results screen state', {
      selfUserId,
      opponentId,
      hasRankedOutcome: rankedOutcome != null,
      hasMyOutcome: myOutcome != null,
      preMatchRp: oldRpBase,
      oldRp: oldRP,
      newRp: newRP,
      rpChange,
      isPlacementMatch,
      showRankedRpCard,
      winnerDecisionMethod,
    });
  }, [
    isPlacementMatch,
    matchType,
    myOutcome,
    newRP,
    oldRP,
    oldRpBase,
    opponentId,
    rankedOutcome,
    rpChange,
    selfUserId,
    showRankedRpCard,
    winnerDecisionMethod,
  ]);

  // --- Analytics: track match outcome once on mount ---
  // Guarded by a `trackedMatch` state flag so the empty-deps effect
  // can't fire twice (Strict Mode double-invocation, fast refresh, etc).
  // Do NOT add to the dep array — the closure-captured values at first
  // render are what we want to report.
  const [trackedMatch, setTrackedMatch] = useState(false);
  useEffect(() => {
    if (trackedMatch) return;
    setTrackedMatch(true);
    trackMatchResultsViewed(matchType, playerWon, playerScore, opponentScore, rpChange ?? undefined);
    if (leveledUp && projectedProgression) {
      trackLevelUp(projectedProgression.level);
    }
    if (tierPromoted) {
      trackDivisionPromoted(rpTierInfo.tier, newRP);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const [showRankReveal, setShowRankReveal] = useState(false);
  const [tierTransitionPhase, setTierTransitionPhase] = useState<'fill' | 'settled'>('fill');

  // Tier change: fill to boundary first, then settle to new progress after a pause
  useEffect(() => {
    if (!tierChanged) {
      setTierTransitionPhase('settled');
      return;
    }
    setTierTransitionPhase('fill');
    // 0.5s initial delay + 1.2s fill animation + 0.4s pause before resetting
    const timer = setTimeout(() => setTierTransitionPhase('settled'), 2100);
    return () => clearTimeout(timer);
  }, [tierChanged]);

  // Trigger rank reveal after placement bar fills to 100%
  useEffect(() => {
    if (!justPlaced) return;
    const timer = setTimeout(() => setShowRankReveal(true), 1800);
    return () => clearTimeout(timer);
  }, [justPlaced]);

  const hasServerReveal = myOutcome != null;
  const revealTier = tierFromRp(myOutcome?.newRp ?? newRP);
  const revealTierVisual = getTierVisual(revealTier);
  const resultHeading: 'VICTORY' | 'DEFEAT' | 'DRAW' = isDraw ? 'DRAW' : playerWon ? 'VICTORY' : 'DEFEAT';
  const totalGamesLabel = totalMatches > 0
    ? `${totalMatches} GAME${totalMatches === 1 ? '' : 'S'} PLAYED`
    : t('results.matchComplete');

  const playerTier = matchType === 'ranked' && preMatchRankedProfile?.placementStatus === 'placed'
    ? tierFromRp(oldRpBase)
    : null;
  const opponentRankedOutcome = rankedOutcome?.byUserId[opponentId] ?? null;
  const opponentTier = opponentRankedOutcome?.placementStatus === 'placed'
    ? tierFromRp(opponentRankedOutcome.newRp)
    : opponentRankPoints != null
      ? tierFromRp(opponentRankPoints)
      : null;
  const opponentDisplayRp = opponentRankedOutcome?.newRp ?? opponentRankPoints ?? null;

  return {
    playerWon,
    isDraw,
    resultHeading,
    totalGamesLabel,
    myOutcome,
    showRankedRpCard,
    rpChange,
    oldRP,
    newRP,
    rpTierInfo,
    oldRpTierInfo,
    tierChanged,
    tierPromoted,
    nextTierBand,
    isPlacementMatch,
    placementPlayed,
    placementRequired,
    placementMatchesLeft,
    justPlaced,
    hasServerReveal,
    revealTier,
    revealTierVisual,
    xpEarned,
    projectedProgression,
    xpToNextLevelAfterMatch,
    accuracy,
    playerTier,
    opponentTier,
    opponentDisplayRp,
    showRankReveal,
    tierTransitionPhase,
  };
}
