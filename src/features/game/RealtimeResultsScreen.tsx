"use client";

import { useEffect, useMemo, useState } from 'react';

import { AnimatePresence, motion } from 'motion/react';

import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { cn } from '@/lib/utils';
import { useHeadToHead } from '@/lib/queries/stats.queries';
import type { RankedProfileResponse } from '@/lib/repositories/ranked.repo';
import { StatCard, WinIllustration, DrawIllustration, LossIllustration } from './components/ResultsShared';
import type { RankedMatchOutcomePayload } from '@/lib/realtime/socket.types';

import { getTierVisual } from '@/utils/tierVisuals';
import { getRankedTierProgress, tierFromRp } from '@/utils/rankedTier';

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

function computeOptimisticDelta(playerRp: number, opponentRp: number, isWin: boolean, isForfeitLoss = false): number {
  const rankDiff = opponentRp - playerRp;
  if (isWin) return Math.round(25 + clamp(rankDiff / 50, -15, 20));
  const lossDelta = Math.round(-25 + clamp(rankDiff / 50, -25, 10));
  if (isForfeitLoss) return lossDelta - 10;
  return lossDelta;
}

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
  winnerDecisionMethod?: 'goals' | 'penalty_goals' | 'total_points_fallback' | 'forfeit' | null;
  preMatchRp?: number;
  opponentId: string;
  opponentRp?: number;
  rankedOutcome?: RankedMatchOutcomePayload | null;
  preMatchRankedProfile?: RankedProfileResponse | null;
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
  opponentRp,
  rankedOutcome,
  preMatchRankedProfile,
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
  const myWins = h2hSummary?.winsA ?? 0;
  const oppWins = h2hSummary?.winsB ?? 0;
  const h2hDraws = h2hSummary?.draws ?? 0;
  const totalMatches = h2hSummary?.total ?? 0;

  // Derive pre-match scores to animate from old → new
  const oldMyWins = playerWon ? myWins - 1 : myWins;
  const oldOppWins = !playerWon && !isDraw ? oppWins - 1 : oppWins;
  const oldDraws = isDraw ? h2hDraws - 1 : h2hDraws;

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

  // Optimistic RP for post-placement ranked matches (show immediately, don't wait for server)
  const oldRpBase = preMatchRankedProfile?.rp ?? preMatchRp ?? 0;
  const opponentRpValue = typeof opponentRp === 'number' && Number.isFinite(opponentRp)
    ? opponentRp
    : null;
  const canOptimistic = matchType === 'ranked'
    && !isPlacementMatch
    && Number.isFinite(oldRpBase)
    && hasAuthoritativeWinner
    && !isDraw;

  const isSelfWinner = playerWon;
  const isForfeitLoss = winnerDecisionMethod === 'forfeit' && !isSelfWinner;

  // Use server data if available, otherwise optimistic
  const rpChange = myOutcome?.deltaRp
    ?? (canOptimistic
      ? computeOptimisticDelta(oldRpBase, opponentRpValue ?? oldRpBase, isSelfWinner, isForfeitLoss)
      : 0);
  const oldRP = myOutcome?.oldRp ?? oldRpBase;
  const newRP = myOutcome?.newRp ?? (canOptimistic ? Math.max(0, oldRP + rpChange) : 0);

  // Show RP card immediately for optimistic OR when server confirms
  const showRankedRpCard = matchType === 'ranked'
    && !isPlacementMatch
    && (myOutcome != null || canOptimistic);

  const accuracy = totalQuestions === 0 ? 0 : Math.round((playerCorrect / totalQuestions) * 100);
  const coinsEarned = playerWon ? 25 : isDraw ? 10 : 5;

  const rpTierInfo = getRankedTierProgress(newRP);
  const oldRpTierInfo = getRankedTierProgress(oldRP);
  const tierChanged = rpTierInfo.tier !== oldRpTierInfo.tier;
  const tierPromoted = tierChanged && newRP > oldRP;
  const rpTierVisual = getTierVisual(rpTierInfo.tier);

  const [animatedRP, setAnimatedRP] = useState(0);
  const [showRankReveal, setShowRankReveal] = useState(false);
  const [tierTransitionPhase, setTierTransitionPhase] = useState<'fill' | 'settled'>('fill');

  useEffect(() => {
    if (rpChange === 0) {
      setAnimatedRP(0);
      return;
    }

    const duration = 1200;
    const steps = 30;
    const increment = rpChange / steps;
    let currentStep = 0;

    const timer = setInterval(() => {
      currentStep++;
      if (currentStep >= steps) {
        setAnimatedRP(rpChange);
        clearInterval(timer);
      } else {
        setAnimatedRP(Math.round(increment * currentStep));
      }
    }, duration / steps);

    return () => clearInterval(timer);
  }, [rpChange]);

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

  return (
    <div className="min-h-screen bg-[#0f1420] flex items-center justify-center p-4">
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="max-w-sm w-full space-y-4 font-fun"
      >
        {/* Result header with illustration */}
        <div className="text-center py-6">
          {/* Game-themed SVG illustration */}
          <div className="flex justify-center mb-4">
            {playerWon ? (
              <WinIllustration />
            ) : isDraw ? (
              <DrawIllustration />
            ) : (
              <LossIllustration />
            )}
          </div>
          <h1 className={cn(
            'text-3xl font-black',
            playerWon ? 'text-emerald-400' : isDraw ? 'text-yellow-400' : 'text-red-400'
          )}>
            {isDraw ? "It's a Draw!" : playerWon ? 'Victory!' : 'Defeat'}
          </h1>
        </div>

        {/* Player comparison strip + H2H */}
        <div className="bg-[#1a1f2e] rounded-3xl border-b-4 border-b-white/10 p-4 space-y-3">
          {/* Player */}
          <div className={cn(
            'flex items-center gap-3 p-3 rounded-2xl',
            playerWon ? 'bg-emerald-500/10' : 'bg-white/[0.03]'
          )}>
            <Avatar className={cn(
              'size-11 border-2 shrink-0',
              playerWon ? 'border-emerald-400 ring-2 ring-emerald-400/30' : 'border-white/20'
            )}>
              <AvatarImage src={playerAvatar} />
              <AvatarFallback className="text-xs font-bold bg-white/10">
                {playerUsername.slice(0, 2).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <div className="text-sm font-bold text-white truncate">{playerUsername}</div>
              <div className="text-xs text-white/40 font-semibold">You</div>
            </div>
            <div className="text-2xl font-black text-white tabular-nums">{playerScore.toLocaleString()}</div>
          </div>

          {/* Opponent */}
          <div className={cn(
            'flex items-center gap-3 p-3 rounded-2xl',
            !playerWon && !isDraw ? 'bg-red-500/10' : 'bg-white/[0.03]'
          )}>
            <Avatar className={cn(
              'size-11 border-2 shrink-0',
              !playerWon && !isDraw ? 'border-red-400 ring-2 ring-red-400/30' : 'border-white/20'
            )}>
              <AvatarImage src={opponentAvatar} />
              <AvatarFallback className="text-xs font-bold bg-white/10">
                {opponentUsername.slice(0, 2).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <div className="text-sm font-bold text-white truncate">{opponentUsername}</div>
              <div className="text-xs text-white/40 font-semibold">Opponent</div>
            </div>
            <div className="text-2xl font-black text-white tabular-nums">{opponentScore.toLocaleString()}</div>
          </div>

          {/* H2H record (inline) */}
          {h2hSummary && totalMatches > 0 && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.4 }}
            >
              <div className="border-t border-white/[0.06] mt-1 pt-3">
                <div className="flex items-center justify-center gap-3">
                  {/* Player wins */}
                  <AnimatedCounter
                    from={Math.max(0, oldMyWins)}
                    to={myWins}
                    delay={1.8}
                    className="text-2xl font-black text-emerald-400 tabular-nums"
                  />

                  <div className="flex items-center gap-2 text-white/25">
                    <div className="w-5 h-px bg-white/10" />
                    <span className="text-xs font-bold uppercase tracking-wide whitespace-nowrap">
                      {h2hDraws > 0 && (
                        <>
                          <AnimatedCounter
                            from={Math.max(0, oldDraws)}
                            to={h2hDraws}
                            delay={1.8}
                            className="text-yellow-400/80"
                          />
                          <span className="text-white/25 ml-0.5">
                            {h2hDraws === 1 ? 'draw' : 'draws'}
                          </span>
                          <span className="mx-1.5 text-white/10">|</span>
                        </>
                      )}
                      <span className="text-white/30">
                        {totalMatches} {totalMatches === 1 ? 'game' : 'games'}
                      </span>
                    </span>
                    <div className="w-5 h-px bg-white/10" />
                  </div>

                  {/* Opponent wins */}
                  <AnimatedCounter
                    from={Math.max(0, oldOppWins)}
                    to={oppWins}
                    delay={1.8}
                    className="text-2xl font-black text-red-400 tabular-nums"
                  />
                </div>
              </div>
            </motion.div>
          )}
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
                    className="bg-[#1a1f2e] rounded-3xl border-b-4 border-b-white/10 p-4"
                  >
                    <div className="mb-3 flex items-center justify-between">
                      <div className="text-sm font-black uppercase tracking-wide text-[#58CC02]">Placement Progress</div>
                      <div className="text-sm font-black text-[#85E000]">{placementPlayed}/{placementRequired}</div>
                    </div>
                    <div className="relative h-4 bg-white/10 rounded-full overflow-hidden mb-2">
                      <motion.div
                        initial={{ width: `${(Math.max(0, placementPlayed - 1) / placementRequired) * 100}%` }}
                        animate={{ width: `${(placementPlayed / placementRequired) * 100}%` }}
                        transition={{ duration: 0.7, ease: 'easeOut' }}
                        className="absolute inset-y-0 left-0 rounded-full bg-gradient-to-r from-[#58CC02] to-[#85E000]"
                      >
                        <div className="absolute inset-0 rounded-full bg-gradient-to-b from-white/25 to-transparent h-1/2" />
                      </motion.div>
                    </div>
                    <div className="text-xs font-semibold text-white/60">
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
                      'bg-[#1a1f2e] rounded-3xl border-b-4 border-b-white/10 p-6 text-center relative overflow-hidden',
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
                          className="text-5xl mb-2"
                        >
                          {revealTierVisual.emoji}
                        </motion.div>
                        <motion.div
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: 0.4 }}
                        >
                          <div className="text-xs font-bold uppercase tracking-wider text-white/40 mb-1">Your Rank</div>
                          <div className={cn('text-2xl font-black', revealTierVisual.color)}>{revealTier}</div>
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
                        <div className="text-sm font-bold text-white/50">Calculating your rank...</div>
                      </div>
                    )}
                  </motion.div>
                )}
              </AnimatePresence>
            )}

            {/* RP change card for placed players */}
            {showRankedRpCard && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
                className="bg-[#1a1f2e] rounded-3xl border-b-4 border-b-white/10 p-4"
              >
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <span className="text-lg">{rpTierVisual.emoji}</span>
                    <span className={cn('text-sm font-bold', rpTierVisual.color)}>{rpTierInfo.tier}</span>
                  </div>
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ delay: 0.6, type: 'spring' }}
                    className={cn(
                      'text-sm font-black',
                      rpChange > 0 ? 'text-emerald-400' : rpChange < 0 ? 'text-red-400' : 'text-yellow-400'
                    )}
                  >
                    {rpChange > 0 ? '+' : ''}{animatedRP} RP
                  </motion.div>
                </div>

                <div className="relative h-4 bg-white/10 rounded-full overflow-hidden mb-2">
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
                    className="absolute inset-y-0 left-0 rounded-full"
                    style={{
                      background: `linear-gradient(90deg, hsl(var(--primary)), hsl(var(--primary) / 0.7))`,
                    }}
                  >
                    <div className="absolute inset-0 rounded-full bg-gradient-to-b from-white/25 to-transparent h-1/2" />
                  </motion.div>
                </div>

                <div className="flex items-center justify-between text-xs text-white/40 font-semibold">
                  <span>{newRP} RP</span>
                  {rpTierInfo.pointsToNext !== null && (
                    <span>{rpTierInfo.pointsToNext} pts to next tier</span>
                  )}
                </div>
              </motion.div>
            )}
          </>
        )}

        {/* Stats row */}
        <div className="grid grid-cols-3 gap-2">
          <StatCard label="Accuracy" value={`${accuracy}%`} color="text-blue-400" />
          <StatCard label="Correct" value={`${playerCorrect}/${totalQuestions}`} color="text-yellow-400" />
          <StatCard label="Coins" value={`+${coinsEarned}`} color="text-emerald-400" />
        </div>

        {/* Action buttons */}
        <div className="flex flex-col gap-2 pt-2">
          <button
            onClick={onPlayAgain}
            className="w-full py-3.5 rounded-2xl bg-emerald-500 border-b-4 border-b-emerald-600 text-white font-extrabold text-sm hover:bg-emerald-400 active:border-b-2 active:translate-y-[2px] transition-all"
          >
            Play Again
          </button>
          <button
            onClick={onMainMenu}
            className="w-full py-3.5 rounded-2xl bg-white/[0.04] border-2 border-white/10 border-b-4 border-b-white/15 text-white/70 font-extrabold text-sm hover:bg-white/[0.07] active:border-b-2 active:translate-y-[2px] transition-all"
          >
            Main Menu
          </button>
        </div>
      </motion.div>
    </div>
  );
}
