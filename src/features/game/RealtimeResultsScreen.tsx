"use client";

import { useEffect, useMemo, useState } from 'react';

import { AnimatePresence, motion } from 'motion/react';

import { cn } from '@/lib/utils';
import { useHeadToHead } from '@/lib/queries/stats.queries';
import type { RankedProfileResponse } from '@/lib/repositories/ranked.repo';
import type { AchievementUnlockPayload, RankedMatchOutcomePayload } from '@/lib/realtime/socket.types';
import { AchievementUnlockStrip } from './components/AchievementUnlockStrip';
import type { UserProgression } from '@/lib/domain';
import { applyXpReward, getMatchXpReward } from '@/lib/domain/matchXp';

import { getTierVisual } from '@/utils/tierVisuals';
import { getRankedTierProgress, tierFromRp } from '@/utils/rankedTier';
import { trackMatchCompleted, trackDivisionPromoted, trackLevelUp } from '@/lib/analytics/game-events';
import { AvatarDisplay } from '@/components/AvatarDisplay';
import type { AvatarCustomization } from '@/types/game';
import { logger } from '@/utils/logger';

/** Animated number that ticks from `from` → `to` after a delay, with a pop + glow */
function AnimatedCounter({
  from,
  to,
  delay = 1.5,
  className,
}: {
  from: number;
  to: number;
  delay?: number;
  className?: string;
}) {
  return (
    <AnimatedCounterInner
      key={`${from}-${to}-${delay}`}
      from={from}
      to={to}
      delay={delay}
      className={className}
    />
  );
}

function AnimatedCounterInner({
  from,
  to,
  delay = 1.5,
  className,
}: {
  from: number;
  to: number;
  delay?: number;
  className?: string;
}) {
  const [value, setValue] = useState(() => from);
  const [popped, setPopped] = useState(false);

  useEffect(() => {
    if (from === to) return;

    const timer = setTimeout(() => {
      setValue(to);
      setPopped(true);
    }, delay * 1000);
    return () => clearTimeout(timer);
  }, [from, to, delay]);

  return (
    <motion.span
      className={className}
      animate={popped ? {
        scale: [1, 1.4, 1],
        textShadow: [
          '0 0 0px transparent',
          '0 0 24px currentColor',
          '0 0 0px transparent',
        ],
      } : {}}
      transition={{ duration: 0.5, ease: 'easeOut' }}
    >
      {value}
    </motion.span>
  );
}

interface RealtimeResultsScreenProps {
  matchType: 'ranked' | 'friendly';
  playerUsername: string;
  playerAvatar: string;
  playerAvatarCustomization?: AvatarCustomization | null;
  opponentUsername: string;
  opponentAvatar: string;
  opponentAvatarCustomization?: AvatarCustomization | null;
  playerScore: number;
  opponentScore: number;
  playerCorrect: number;
  opponentCorrect: number;
  totalQuestions: number;
  selfUserId: string;
  finalWinnerId?: string | null;
  winnerDecisionMethod?: 'goals' | 'penalty_goals' | 'total_points' | 'total_points_fallback' | 'forfeit' | null;
  preMatchRp?: number;
  opponentId: string;
  rankedOutcome?: RankedMatchOutcomePayload | null;
  preMatchRankedProfile?: RankedProfileResponse | null;
  preMatchProgression?: UserProgression | null;
  unlockedAchievements?: AchievementUnlockPayload[];
  onPlayAgain: () => void;
  onMainMenu: () => void;
}

export function RealtimeResultsScreen({
  matchType,
  playerUsername,
  playerAvatar,
  playerAvatarCustomization = null,
  opponentUsername,
  opponentAvatar,
  opponentAvatarCustomization = null,
  playerScore,
  opponentScore,
  playerCorrect,
  totalQuestions,
  selfUserId,
  finalWinnerId,
  winnerDecisionMethod,
  preMatchRp,
  opponentId,
  rankedOutcome,
  preMatchRankedProfile,
  preMatchProgression,
  unlockedAchievements = [],
  onPlayAgain,
  onMainMenu,
}: RealtimeResultsScreenProps) {
  const hasAuthoritativeWinner = finalWinnerId !== undefined;
  const playerWon = hasAuthoritativeWinner
    ? finalWinnerId !== null && finalWinnerId !== opponentId
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
  const showXpCard = Boolean(preMatchProgression && xpEarned > 0);
  const xpBarInitialProgress = preMatchProgression && projectedProgression
    ? projectedProgression.level > preMatchProgression.level
      ? 0
      : preMatchProgression.progressPct
    : 0;
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
  const [trackedMatch, setTrackedMatch] = useState(false);
  useEffect(() => {
    if (trackedMatch) return;
    setTrackedMatch(true);
    trackMatchCompleted(matchType, playerWon, playerScore, opponentScore, rpChange ?? undefined);
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
  const [animatedXp, setAnimatedXp] = useState(0);

  useEffect(() => {
    if (!showXpCard) {
      setAnimatedXp(0);
      return;
    }

    const duration = 1000;
    const steps = 25;
    const increment = xpEarned / steps;
    let currentStep = 0;

    const timer = setInterval(() => {
      currentStep += 1;
      if (currentStep >= steps) {
        setAnimatedXp(xpEarned);
        clearInterval(timer);
      } else {
        setAnimatedXp(Math.round(increment * currentStep));
      }
    }, duration / steps);

    return () => clearInterval(timer);
  }, [showXpCard, xpEarned]);

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
  const resultHeading = isDraw ? 'DRAW' : playerWon ? 'VICTORY' : 'DEFEAT';
  const totalGamesLabel = totalMatches > 0
    ? `${totalMatches} GAME${totalMatches === 1 ? '' : 'S'} PLAYED`
    : 'MATCH COMPLETE';

  const playerTier = matchType === 'ranked' && preMatchRankedProfile?.placementStatus === 'placed'
    ? tierFromRp(oldRpBase)
    : null;
  const opponentRankedOutcome = rankedOutcome?.byUserId[opponentId] ?? null;
  const opponentTier = opponentRankedOutcome?.placementStatus === 'placed'
    ? tierFromRp(opponentRankedOutcome.newRp)
    : null;
  const opponentDisplayRp = opponentRankedOutcome?.newRp ?? null;

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-surface-page-alt p-3 md:p-6">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 bg-surface-page-alt bg-[url('/assets/bg-pattern.png')] bg-cover bg-center bg-no-repeat"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "radial-gradient(circle at top center, rgba(28,176,246,0.08), transparent 32%), radial-gradient(circle at bottom left, rgba(88,204,2,0.06), transparent 28%)",
        }}
      />
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="relative z-10 w-full max-w-[1280px] space-y-4 font-poppins md:space-y-6"
      >
        <div className="pb-2 text-center">
          <h1
            className="font-poppins text-[3rem] font-black uppercase tracking-[0] md:text-[3.75rem]"
            style={{
              lineHeight: '1.3',
              color: playerWon ? '#22C55E' : isDraw ? '#FACC15' : '#FB3101',
            }}
          >
            {resultHeading}
          </h1>
        </div>

        <div className="mx-auto w-full max-w-[1100px]">
          <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-3 sm:gap-6">
            {/* Player (Left) */}
            <div className="flex items-center gap-3 justify-self-start sm:gap-4">
              <div className="rounded-full bg-brand-blue p-1.5 sm:p-2">
                <AvatarDisplay
                  customization={playerAvatarCustomization ?? { base: playerAvatar }}
                  size="lg"
                />
              </div>
              <div className="hidden min-w-0 sm:block">
                <div
                  className="truncate font-poppins font-semibold uppercase text-white text-base sm:text-lg md:text-xl"
                >
                  {playerUsername}
                </div>
                {(preMatchRankedProfile?.rp != null || playerTier) && (
                  <div className="mt-2 flex items-center gap-2">
                    {preMatchRankedProfile?.rp != null && (
                      <span
                        className="inline-flex h-[22px] items-center rounded-[20px] px-3 font-poppins font-semibold uppercase tabular-nums text-[12px] sm:text-[13px] md:text-[15px]"
                        style={{ backgroundColor: '#FFE500', color: '#071013' }}
                      >
                        {preMatchRankedProfile.rp} RP
                      </span>
                    )}
                    {playerTier && (
                      <span
                        className="font-poppins font-semibold uppercase text-[12px] sm:text-[13px] md:text-[15px]"
                        style={{ color: '#FFE500' }}
                      >
                        {playerTier}
                      </span>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Center score pill */}
            <div className="flex flex-col items-center">
              <div
                className="flex h-[44px] min-w-[110px] items-center justify-center rounded-[20px] bg-brand-blue px-5 font-poppins font-semibold tabular-nums text-white text-2xl sm:h-[51px] sm:min-w-[133px] sm:px-6 sm:text-[36px]"
              >
                <AnimatedCounter from={0} to={playerScore} delay={0.25} />
                <span className="mx-1 sm:mx-1.5">:</span>
                <AnimatedCounter from={0} to={opponentScore} delay={0.25} />
              </div>
              <div
                className="mt-2 whitespace-nowrap font-poppins font-semibold uppercase text-white text-xs sm:text-sm md:text-[20px]"
                style={{ opacity: 0.5 }}
              >
                {totalGamesLabel}
              </div>
            </div>

            {/* Opponent (Right) */}
            <div className="flex flex-row-reverse items-center gap-3 justify-self-end sm:gap-4">
              <div className="rounded-full bg-brand-red-soft p-1.5 sm:p-2">
                <AvatarDisplay
                  customization={opponentAvatarCustomization ?? { base: opponentAvatar }}
                  size="lg"
                  className="-scale-x-100"
                />
              </div>
              <div className="hidden min-w-0 text-right sm:block">
                <div
                  className="truncate font-poppins font-semibold uppercase text-white text-base sm:text-lg md:text-xl"
                >
                  {opponentUsername}
                </div>
                {(opponentDisplayRp != null || opponentTier) && (
                  <div className="mt-2 flex flex-row-reverse items-center gap-2">
                    {opponentDisplayRp != null && (
                      <span
                        className="inline-flex h-[22px] items-center rounded-[20px] px-3 font-poppins font-semibold uppercase tabular-nums text-[12px] sm:text-[13px] md:text-[15px]"
                        style={{ backgroundColor: '#FFE500', color: '#071013' }}
                      >
                        {opponentDisplayRp} RP
                      </span>
                    )}
                    {opponentTier && (
                      <span
                        className="font-poppins font-semibold uppercase text-[12px] sm:text-[13px] md:text-[15px]"
                        style={{ color: '#FFE500' }}
                      >
                        {opponentTier}
                      </span>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {matchType === 'ranked' && (
          <>
            {/* Placement progress card */}
            {isPlacementMatch && (
              <AnimatePresence mode="wait">
                {!showRankReveal ? (
                  <motion.div
                    key="placement-progress"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    transition={{ delay: 0.3 }}
                    className="border-t border-white/10 pt-3 md:pt-4"
                  >
                      <div className="mb-2 flex items-center justify-between">
                        <div className="text-xs font-black uppercase tracking-wide text-brand-green-light md:text-sm">Placement Progress</div>
                        <div className="text-xs font-black text-[#85E000] md:text-sm">{placementPlayed}/{placementRequired}</div>
                      </div>
                      <div className="relative mb-2 h-3 md:h-4 bg-white/10 rounded-full overflow-hidden">
                      <motion.div
                        initial={{ width: `${(Math.max(0, placementPlayed - 1) / placementRequired) * 100}%` }}
                        animate={{ width: `${(placementPlayed / placementRequired) * 100}%` }}
                        transition={{ duration: 0.7, ease: 'easeOut' }}
                        className="absolute inset-y-0 left-0 rounded-full bg-gradient-to-r from-brand-green-light to-[#85E000]"
                      >
                        <div className="absolute inset-0 rounded-full bg-gradient-to-b from-white/25 to-transparent h-1/2" />
                      </motion.div>
                    </div>
                      <div className="text-[11px] font-semibold text-white/60 md:text-xs">
                      {justPlaced
                        ? 'Placements complete! Revealing your rank...'
                        : `Complete placements to unlock your rank. ${placementMatchesLeft} match${placementMatchesLeft === 1 ? '' : 'es'} left.`
                      }
                    </div>
                  </motion.div>
                ) : (
                  <motion.div
                    key="rank-reveal"
                    initial={{ opacity: 0, scale: 0.6 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ type: 'spring', damping: 12, stiffness: 150 }}
                    className={cn(
                      'border-t border-white/10 pt-4 md:pt-6 text-center relative overflow-hidden',
                      hasServerReveal && revealTierVisual.glow
                    )}
                  >
                    {hasServerReveal ? (
                      <>
                        {/* Glow background */}
                        <motion.div
                          initial={{ opacity: 0 }}
                          animate={{ opacity: [0, 0.3, 0.15] }}
                          transition={{ duration: 1.5 }}
                          className="absolute inset-0 bg-gradient-to-b from-emerald-500/10 via-emerald-500/5 to-transparent pointer-events-none"
                        />
                        <motion.div
                          initial={{ scale: 0 }}
                          animate={{ scale: [0, 1.3, 1] }}
                          transition={{ duration: 0.6, delay: 0.15 }}
                          className="mb-2 text-4xl md:text-5xl"
                        >
                          {revealTierVisual.emoji}
                        </motion.div>
                        <motion.div
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: 0.4 }}
                        >
                          <div className="mb-1 text-[11px] font-bold uppercase tracking-wider text-white/40 md:text-xs">Your Rank</div>
                          <div className={cn('text-xl font-black md:text-2xl', revealTierVisual.color)}>{revealTier}</div>
                          <div className="text-sm font-bold text-white/60 mt-1">{newRP} RP</div>
                        </motion.div>
                      </>
                    ) : (
                      <div className="flex flex-col items-center gap-3 py-2">
                        <motion.div
                          animate={{ rotate: 360 }}
                          transition={{ duration: 1.2, repeat: Infinity, ease: 'linear' }}
                          className="size-10 rounded-full border-3 border-white/10 border-t-[#58CC02]"
                        />
                        <div className="text-xs font-bold text-white/50 md:text-sm">Calculating your rank...</div>
                      </div>
                    )}
                  </motion.div>
                )}
              </AnimatePresence>
            )}

          </>
        )}

        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="mx-auto w-full max-w-[960px] pt-4 md:pt-6"
        >
          <div className="grid grid-cols-2 gap-x-4 gap-y-6 md:grid-cols-4 md:gap-x-8 md:grid-rows-[auto_auto_auto_auto] md:items-start">
            {/* Accuracy — value row 1, label sits on bar row */}
            <div className="grid grid-rows-subgrid text-center md:row-span-4">
              <div className="font-poppins font-semibold leading-none text-brand-blue text-[2rem] md:text-[36px]">
                {accuracy}%
              </div>
              <div className="hidden md:block" />
              <div
                className="mt-2 font-poppins font-semibold uppercase text-white text-xs sm:text-sm md:mt-0 md:text-[20px] md:self-center"
                style={{ opacity: 0.5 }}
              >
                Accuracy
              </div>
            </div>

            {/* RP card */}
            {showRankedRpCard ? (
              <div className="grid grid-rows-subgrid text-center md:row-span-4">
                <div className="font-poppins font-semibold leading-none text-brand-green text-[2rem] md:text-[36px]">
                  {newRP} RP
                </div>
                <div className="mt-2 font-poppins font-semibold uppercase text-white text-xs sm:text-sm md:mt-0 md:text-[20px] md:self-center">
                  {rpTierInfo.tier}
                </div>
                <div className="mt-3 relative h-[12px] self-center overflow-hidden rounded-[20px] bg-[#2D7715] md:mt-0 md:h-[15px]">
                  <motion.div
                    initial={{ width: `${oldRpTierInfo.progress}%` }}
                    animate={{
                      width: tierChanged && tierTransitionPhase === 'fill'
                        ? (tierPromoted ? '100%' : '0%')
                        : `${rpTierInfo.progress}%`,
                    }}
                    transition={tierTransitionPhase === 'settled' && tierChanged
                      ? { duration: 0.8, ease: 'easeOut' }
                      : { duration: 1.2, ease: 'easeInOut', delay: 0.5 }
                    }
                    className="absolute inset-y-0 left-0 rounded-[20px] bg-brand-green"
                  />
                </div>
                <div
                  className="mt-2 font-poppins font-semibold uppercase text-white text-[11px] sm:text-xs md:mt-0 md:text-[20px] md:self-center"
                  style={{ opacity: 0.5 }}
                >
                  {rpTierInfo.pointsToNext !== null
                    ? `${rpTierInfo.pointsToNext} RP to next tier`
                    : '—'}
                </div>
              </div>
            ) : <div className="hidden md:block md:row-span-4" />}

            {/* XP / Level */}
            {showXpCard && preMatchProgression && projectedProgression ? (
              <div className="grid grid-rows-subgrid text-center md:row-span-4">
                <div className="font-poppins font-semibold leading-none text-brand-yellow text-[2rem] md:text-[36px]">
                  Level {projectedProgression.level}
                </div>
                <div className="mt-2 font-poppins font-semibold uppercase text-white text-xs sm:text-sm md:mt-0 md:text-[20px] md:self-center">
                  XP Progress +{animatedXp} XP
                </div>
                <div className="mt-3 relative h-[12px] self-center overflow-hidden rounded-[20px] bg-[#A1920D] md:mt-0 md:h-[15px]">
                  <motion.div
                    initial={{ width: `${xpBarInitialProgress}%` }}
                    animate={{ width: `${projectedProgression.progressPct}%` }}
                    transition={{ duration: 1.1, ease: 'easeOut', delay: 0.45 }}
                    className="absolute inset-y-0 left-0 rounded-[20px] bg-brand-yellow"
                  />
                </div>
                <div
                  className="mt-2 font-poppins font-semibold uppercase text-white text-[11px] sm:text-xs md:mt-0 md:text-[20px] md:self-center"
                  style={{ opacity: 0.5 }}
                >
                  {xpToNextLevelAfterMatch} XP to level {projectedProgression.level + 1}
                </div>
              </div>
            ) : <div className="hidden md:block md:row-span-4" />}

            {/* Correct Answers — value row 1, label sits on bar row */}
            <div className="grid grid-rows-subgrid text-center md:row-span-4">
              <div className="font-poppins font-semibold leading-none text-brand-blue text-[2rem] md:text-[36px]">
                {playerCorrect}/{totalQuestions}
              </div>
              <div className="hidden md:block" />
              <div
                className="mt-2 font-poppins font-semibold uppercase text-white text-xs sm:text-sm md:mt-0 md:text-[20px] md:self-center"
                style={{ opacity: 0.5 }}
              >
                Correct Answers
              </div>
            </div>
          </div>
        </motion.div>

        <AchievementUnlockStrip achievements={unlockedAchievements} />

        {/* Action buttons */}
        <div className="mx-auto flex w-full max-w-[498px] flex-col gap-3 pt-2 md:gap-4">
          <button
            onClick={onPlayAgain}
            className="flex h-[64px] w-full items-center justify-center rounded-[20px] bg-brand-green font-poppins font-semibold uppercase text-white text-[1.5rem] transition-colors hover:bg-brand-green md:h-[91px] md:text-[36px]"
          >
            Play Again
          </button>
          <button
            onClick={onMainMenu}
            className="flex h-[64px] w-full items-center justify-center rounded-[20px] border-[3px] border-brand-green bg-transparent font-poppins font-semibold uppercase text-white text-[1.5rem] transition-colors hover:bg-brand-green/10 md:h-[91px] md:text-[36px]"
          >
            Main Menu
          </button>
        </div>
      </motion.div>
    </div>
  );
}
