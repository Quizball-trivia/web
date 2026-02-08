"use client";

import { useEffect, useState } from 'react';

import { motion } from 'motion/react';

import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { cn } from '@/lib/utils';
import { useHeadToHead } from '@/lib/queries/stats.queries';
import { getRankInfo, getDivisionEmoji, getDivisionColor } from '@/utils/rankSystem';
import { StatCard, WinIllustration, DrawIllustration, LossIllustration } from './components/ResultsShared';

// Mock RP values — will be replaced by real data later
const MOCK_OLD_RP = 245;

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
  opponentId: string;
  onPlayAgain: () => void;
  onMainMenu: () => void;
}

export function RealtimeResultsScreen({
  playerUsername,
  playerAvatar,
  opponentUsername,
  opponentAvatar,
  playerScore,
  opponentScore,
  playerCorrect,
  totalQuestions,
  selfUserId,
  opponentId,
  onPlayAgain,
  onMainMenu,
}: RealtimeResultsScreenProps) {
  const playerWon = playerScore > opponentScore;
  const isDraw = playerScore === opponentScore;

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

  const rpChange = isDraw ? 0 : playerWon ? 15 : -15;
  const oldRP = MOCK_OLD_RP;
  const newRP = oldRP + rpChange;
  const accuracy = totalQuestions === 0 ? 0 : Math.round((playerCorrect / totalQuestions) * 100);
  const coinsEarned = playerWon ? 25 : isDraw ? 10 : 5;

  const rankInfo = getRankInfo(newRP);
  const divisionEmoji = getDivisionEmoji(rankInfo.division);
  const divisionColor = getDivisionColor(rankInfo.division);

  const [animatedRP, setAnimatedRP] = useState(0);

  useEffect(() => {
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

        {/* RP Progression */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="bg-[#1a1f2e] rounded-3xl border-b-4 border-b-white/10 p-4"
        >
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <span className="text-lg">{divisionEmoji}</span>
              <span className={cn('text-sm font-bold', divisionColor.text)}>{rankInfo.division}</span>
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

          {/* Progress bar */}
          <div className="relative h-4 bg-white/10 rounded-full overflow-hidden mb-2">
            <motion.div
              initial={{ width: `${getRankInfo(oldRP).progress}%` }}
              animate={{ width: `${rankInfo.progress}%` }}
              transition={{ duration: 1.2, ease: 'easeInOut', delay: 0.5 }}
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
            {rankInfo.pointsToNext !== null && (
              <span>{rankInfo.pointsToNext} pts to next division</span>
            )}
          </div>
        </motion.div>

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
