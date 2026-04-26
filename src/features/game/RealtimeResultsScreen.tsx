"use client";

import { useEffect, useMemo, useState } from 'react';

import { AnimatePresence, motion } from 'motion/react';

import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
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
  opponentUsername: string;
  opponentAvatar: string;
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
  opponentUsername,
  opponentAvatar,
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
  const progressPanelVisible = showRankedRpCard || showXpCard;
  const totalGamesLabel = totalMatches > 0
    ? `${totalMatches} GAME${totalMatches === 1 ? '' : 'S'} PLAYED`
    : 'MATCH COMPLETE';

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[#0f1420] p-3 md:p-6">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 bg-[#0f1420] bg-[url('/assets/bg-pattern.png')] bg-cover bg-center bg-no-repeat"
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
        className="relative z-10 w-full max-w-[860px] space-y-3 font-poppins md:space-y-4"
      >
        <div className="pb-1 pt-1 text-center">
          <h1 className={cn(
            'font-poppins text-[2rem] font-semibold uppercase tracking-[0.02em] md:text-[3.5rem]',
            playerWon ? 'text-emerald-400' : isDraw ? 'text-yellow-400' : 'text-[#F36A6A]'
          )}>
            {resultHeading}
          </h1>
        </div>

        <div className="mx-auto w-full max-w-[760px] space-y-3">
          <div className="md:hidden space-y-3">
            <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-3">
              <div className="flex flex-col items-center text-center">
                <Avatar className="size-12 shrink-0 border border-white/15 bg-white/[0.03] shadow-[0_0_0_1px_rgba(255,255,255,0.04)]">
                  <AvatarImage src={playerAvatar} />
                  <AvatarFallback className="bg-white/10 text-sm font-bold">
                    {playerUsername.slice(0, 2).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div className="mt-2 max-w-full truncate text-[1.15rem] font-bold text-white">{playerUsername}</div>
                <div className="text-[0.8rem] font-black uppercase tracking-wide text-[#38D66B]">You</div>
              </div>

              <div className="flex items-center gap-2">
                <AnimatedCounter
                  from={0}
                  to={playerScore}
                  delay={0.25}
                  className="text-[2.25rem] font-black leading-none text-white tabular-nums"
                />
                <div className="flex h-10 w-10 items-center justify-center text-sm font-black text-white/80">
                  VS
                </div>
                <AnimatedCounter
                  from={0}
                  to={opponentScore}
                  delay={0.25}
                  className="text-[2.25rem] font-black leading-none text-white tabular-nums"
                />
              </div>

              <div className="flex flex-col items-center text-center">
                <Avatar className="size-12 shrink-0 border border-[#F36A6A]/70 bg-white/[0.03] shadow-[0_0_16px_rgba(243,106,106,0.24)]">
                  <AvatarImage src={opponentAvatar} />
                  <AvatarFallback className="bg-white/10 text-sm font-bold">
                    {opponentUsername.slice(0, 2).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div className="mt-2 max-w-full truncate text-[1.15rem] font-bold text-white">{opponentUsername}</div>
                <div className="text-[0.8rem] font-black uppercase tracking-wide text-[#F36A6A]">Opponent</div>
              </div>
            </div>
          </div>

          <div className="hidden md:grid items-center gap-6 md:grid-cols-[1fr_auto_auto_auto_1fr]">
            <div className="flex items-center gap-4 justify-self-start">
              <Avatar className="h-[4.5rem] w-[4.5rem] shrink-0 border-2 border-white/15 bg-white/[0.03] shadow-[0_0_0_1px_rgba(255,255,255,0.04)]">
                <AvatarImage src={playerAvatar} />
                <AvatarFallback className="bg-white/10 text-lg font-bold">
                  {playerUsername.slice(0, 2).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <div className="min-w-0">
                <div className="truncate text-[2.1rem] font-bold text-white">{playerUsername}</div>
                <div className="text-lg font-black uppercase tracking-wide text-[#38D66B]">You</div>
              </div>
            </div>

            <div className="text-center">
              <AnimatedCounter
                from={0}
                to={playerScore}
                delay={0.25}
                className="text-[4rem] font-black leading-none text-white tabular-nums"
              />
            </div>

            <div className="mx-auto flex h-14 w-14 items-center justify-center text-xl font-black text-white/80">
              VS
            </div>

            <div className="text-center">
              <AnimatedCounter
                from={0}
                to={opponentScore}
                delay={0.25}
                className="text-[4rem] font-black leading-none text-white tabular-nums"
              />
            </div>

            <div className="flex items-center justify-end gap-4 justify-self-end">
              <div className="min-w-0 text-right">
                <div className="truncate text-[2.1rem] font-bold text-white">{opponentUsername}</div>
                <div className="text-lg font-black uppercase tracking-wide text-[#F36A6A]">Opponent</div>
              </div>
              <Avatar className="h-[4.5rem] w-[4.5rem] shrink-0 border-2 border-[#F36A6A]/70 bg-white/[0.03] shadow-[0_0_24px_rgba(243,106,106,0.32)]">
                <AvatarImage src={opponentAvatar} />
                <AvatarFallback className="bg-white/10 text-lg font-bold">
                  {opponentUsername.slice(0, 2).toUpperCase()}
                </AvatarFallback>
              </Avatar>
            </div>
          </div>

          <div className="flex items-center gap-3 md:gap-6 text-white/35">
            <div className="h-px flex-1 bg-white/15" />
            <div className="whitespace-nowrap text-[0.78rem] font-semibold uppercase tracking-[0.08em] text-white/55 md:text-base">
              {totalGamesLabel}
            </div>
            <div className="h-px flex-1 bg-white/15" />
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
                        <div className="text-xs font-black uppercase tracking-wide text-[#58CC02] md:text-sm">Placement Progress</div>
                        <div className="text-xs font-black text-[#85E000] md:text-sm">{placementPlayed}/{placementRequired}</div>
                      </div>
                      <div className="relative mb-2 h-3 md:h-4 bg-white/10 rounded-full overflow-hidden">
                      <motion.div
                        initial={{ width: `${(Math.max(0, placementPlayed - 1) / placementRequired) * 100}%` }}
                        animate={{ width: `${(placementPlayed / placementRequired) * 100}%` }}
                        transition={{ duration: 0.7, ease: 'easeOut' }}
                        className="absolute inset-y-0 left-0 rounded-full bg-gradient-to-r from-[#58CC02] to-[#85E000]"
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
                      hasServerReveal && `shadow-[0_0_60px_-10px] ${revealTierVisual.glow}`
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

            {progressPanelVisible && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
                className="mx-auto w-full max-w-[760px] border-t border-white/10 pt-4 md:pt-5"
              >
                <div className={cn(
                  'grid gap-4 md:gap-5',
                  showRankedRpCard && showXpCard
                    ? 'grid-cols-1 md:grid-cols-[minmax(0,1fr)_1px_minmax(0,1fr)] md:items-stretch'
                    : 'grid-cols-1'
                )}>
                  {showRankedRpCard && (
                    <div className="grid h-full grid-rows-[auto_auto_auto_auto] gap-3">
                      <div className="text-[1.15rem] font-semibold uppercase tracking-wide text-white md:text-[1.5rem]">
                        {rpTierInfo.tier}
                      </div>

                      <div className="text-[2rem] font-black leading-none text-[#FFD126] md:text-[2.4rem]">
                        {newRP} RP
                      </div>

                      <div className="relative h-3 overflow-hidden rounded-full bg-white/12 md:h-4">
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
                          className="absolute inset-y-0 left-0 rounded-full bg-gradient-to-r from-[#38B60E] to-[#7BDA1A]"
                        />
                      </div>

                      <div className="flex items-center justify-between text-[11px] font-medium text-white/60 md:text-sm">
                        <span>{newRP} RP</span>
                        {rpTierInfo.pointsToNext !== null && (
                          <span>{rpTierInfo.pointsToNext} RP to next tier</span>
                        )}
                      </div>
                    </div>
                  )}

                  {showRankedRpCard && showXpCard && (
                    <div className="hidden w-px bg-white/12 md:block" />
                  )}

                  {showXpCard && preMatchProgression && projectedProgression && (
                    <div className="grid h-full grid-rows-[auto_auto_auto_auto] gap-3">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <div className="text-[1.05rem] font-semibold uppercase tracking-wide text-[#48C7FF] md:text-[1.35rem]">
                            XP Progress
                          </div>
                        </div>
                        <div className="text-[1.35rem] font-black text-[#48C7FF] md:text-[1.65rem]">+{animatedXp} XP</div>
                      </div>

                      <div className="mt-0.5 text-[1.35rem] font-bold text-white md:text-[1.65rem]">
                            Level {projectedProgression.level}
                      </div>

                      <div className="relative h-3 overflow-hidden rounded-full bg-white/12 md:h-4">
                        <motion.div
                          initial={{ width: `${xpBarInitialProgress}%` }}
                          animate={{ width: `${projectedProgression.progressPct}%` }}
                          transition={{ duration: 1.1, ease: 'easeOut', delay: 0.45 }}
                          className="absolute inset-y-0 left-0 rounded-full bg-gradient-to-r from-[#169FF5] to-[#58D7FF]"
                        />
                      </div>

                      <div className="flex flex-col gap-1 text-[11px] font-medium text-white/60 md:flex-row md:items-center md:justify-between md:text-sm">
                        {leveledUp ? (
                          <>
                            <span>{projectedProgression.currentLevelXp} XP carried into level {projectedProgression.level}</span>
                            <span>{xpToNextLevelAfterMatch} to level {projectedProgression.level + 1}</span>
                          </>
                        ) : (
                          <>
                            <span>{projectedProgression.currentLevelXp} / {projectedProgression.xpForNextLevel} XP</span>
                            <span>{projectedProgression.progressPct}% to level {projectedProgression.level + 1}</span>
                          </>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </motion.div>
            )}
          </>
        )}

        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.35 }}
          className="mx-auto w-full max-w-[760px] border-t border-white/10 pt-4 md:pt-5"
        >
          <div className="grid gap-4 md:grid-cols-[minmax(0,1fr)_1px_minmax(0,1fr)] md:items-center">
            <div className="flex items-center gap-3">
              <div>
                <div className="text-[1rem] font-medium uppercase tracking-wide text-white/65 md:text-[1.25rem]">Accuracy</div>
                <div className="text-[1.85rem] font-black leading-none text-[#3BA6FF] md:text-[2.2rem]">{accuracy}%</div>
              </div>
            </div>

            <div className="hidden h-full w-px bg-white/12 md:block" />

            <div className="flex items-center gap-3">
              <div>
                <div className="text-[1rem] font-medium uppercase tracking-wide text-white/65 md:text-[1.25rem]">Correct Answers</div>
                <div className="text-[1.85rem] font-black leading-none text-[#FFD126] md:text-[2.2rem]">
                  {playerCorrect} / {totalQuestions}
                </div>
              </div>
            </div>
          </div>
        </motion.div>

        <AchievementUnlockStrip achievements={unlockedAchievements} />

        {/* Action buttons */}
        <div className="mx-auto flex max-w-[420px] flex-col gap-2.5 pt-1 md:max-w-[500px]">
          <button
            onClick={onPlayAgain}
            className="flex w-full items-center justify-center gap-2.5 rounded-[18px] bg-[#38B60E] py-3.5 text-[1.2rem] font-black uppercase tracking-[0.04em] text-white transition-colors hover:bg-[#43C417] md:rounded-[20px] md:py-4 md:text-[1.35rem]"
          >
            Play Again
          </button>
          <button
            onClick={onMainMenu}
            className="w-full rounded-[18px] border border-white/12 bg-white/[0.02] py-3.5 text-[1.2rem] font-black uppercase tracking-[0.04em] text-white/88 transition-colors hover:bg-white/[0.05] md:rounded-[20px] md:py-4 md:text-[1.35rem]"
          >
            Main Menu
          </button>
        </div>
      </motion.div>
    </div>
  );
}
