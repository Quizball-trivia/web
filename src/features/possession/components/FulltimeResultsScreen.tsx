'use client';

import { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { cn } from '@/lib/utils';
import { getRankInfo, getDivisionEmoji, getDivisionColor } from '@/utils/rankSystem';
import { StatCard, WinIllustration, DrawIllustration, LossIllustration } from '@/features/game/components/ResultsShared';

const MOCK_OLD_RP = 245;

interface FulltimeResultsScreenProps {
  playerGoals: number;
  opponentGoals: number;
  playerAvatarUrl: string;
  opponentAvatarUrl: string;
  totalCorrect: number;
  totalQuestions: number;
  totalShots: number;
  avgPosition: number;
  onPlayAgain: () => void;
}

export default function FulltimeResultsScreen({
  playerGoals,
  opponentGoals,
  playerAvatarUrl,
  opponentAvatarUrl,
  totalCorrect,
  totalQuestions,
  totalShots,
  avgPosition,
  onPlayAgain,
}: FulltimeResultsScreenProps) {
  const playerWon = playerGoals > opponentGoals;
  const isDraw = playerGoals === opponentGoals;
  const accuracy = totalQuestions === 0 ? 0 : Math.round((totalCorrect / totalQuestions) * 100);
  const coinsEarned = playerWon ? 25 : isDraw ? 10 : 5;

  const rpChange = isDraw ? 0 : playerWon ? 15 : -15;
  const newRP = MOCK_OLD_RP + rpChange;
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
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-[#0f1420] p-4 overflow-y-auto"
    >
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="max-w-sm w-full space-y-4 font-fun my-4"
      >
        {/* Result header with illustration */}
        <div className="text-center py-4">
          <div className="flex justify-center mb-3">
            {playerWon ? <WinIllustration /> : isDraw ? <DrawIllustration /> : <LossIllustration />}
          </div>
          <h1 className={cn(
            'text-3xl font-black',
            playerWon ? 'text-emerald-400' : isDraw ? 'text-yellow-400' : 'text-red-400'
          )}>
            {isDraw ? "It's a Draw!" : playerWon ? 'Victory!' : 'Defeat'}
          </h1>
        </div>

        {/* Player comparison card */}
        <div className="bg-[#1a1f2e] rounded-3xl border-b-4 border-b-white/10 p-4 space-y-3">
          {/* Player row */}
          <div className={cn(
            'flex items-center gap-3 p-3 rounded-2xl',
            playerWon ? 'bg-emerald-500/10' : 'bg-white/[0.03]'
          )}>
            <Avatar className={cn(
              'size-11 border-2 shrink-0',
              playerWon ? 'border-emerald-400 ring-2 ring-emerald-400/30' : 'border-white/20'
            )}>
              <AvatarImage src={playerAvatarUrl} />
              <AvatarFallback className="text-xs font-bold bg-white/10">YO</AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <div className="text-sm font-bold text-white truncate">You</div>
              <div className="text-xs text-white/40 font-semibold">Player</div>
            </div>
            <div className="text-2xl font-black text-white tabular-nums">{playerGoals}</div>
          </div>

          {/* Opponent row */}
          <div className={cn(
            'flex items-center gap-3 p-3 rounded-2xl',
            !playerWon && !isDraw ? 'bg-red-500/10' : 'bg-white/[0.03]'
          )}>
            <Avatar className={cn(
              'size-11 border-2 shrink-0',
              !playerWon && !isDraw ? 'border-red-400 ring-2 ring-red-400/30' : 'border-white/20'
            )}>
              <AvatarImage src={opponentAvatarUrl} />
              <AvatarFallback className="text-xs font-bold bg-white/10">CP</AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <div className="text-sm font-bold text-white truncate">CPU</div>
              <div className="text-xs text-white/40 font-semibold">Opponent</div>
            </div>
            <div className="text-2xl font-black text-white tabular-nums">{opponentGoals}</div>
          </div>
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

          <div className="relative h-4 bg-white/10 rounded-full overflow-hidden mb-2">
            <motion.div
              initial={{ width: `${getRankInfo(MOCK_OLD_RP).progress}%` }}
              animate={{ width: `${rankInfo.progress}%` }}
              transition={{ duration: 1.2, ease: 'easeInOut', delay: 0.5 }}
              className="absolute inset-y-0 left-0 rounded-full bg-gradient-to-r from-emerald-500 to-emerald-400"
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
          <StatCard label="Shots" value={`${totalShots}`} color="text-yellow-400" />
          <StatCard label="Coins" value={`+${coinsEarned}`} color="text-emerald-400" />
        </div>

        {/* Match stats detail */}
        <div className="bg-[#1a1f2e] rounded-3xl border-b-4 border-b-white/10 p-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="flex justify-between items-center px-2 py-1">
              <span className="text-[11px] text-white/40 uppercase tracking-wider font-bold">Avg Position</span>
              <span className="text-sm text-emerald-300 font-black">{avgPosition}%</span>
            </div>
            <div className="flex justify-between items-center px-2 py-1">
              <span className="text-[11px] text-white/40 uppercase tracking-wider font-bold">Correct</span>
              <span className="text-sm text-emerald-300 font-black">{totalCorrect}/{totalQuestions}</span>
            </div>
          </div>
        </div>

        {/* Action buttons */}
        <div className="flex flex-col gap-2 pt-1 pb-4">
          <button
            onClick={onPlayAgain}
            className="w-full py-3.5 rounded-2xl bg-emerald-500 border-b-4 border-b-emerald-600 text-white font-extrabold text-sm hover:bg-emerald-400 active:border-b-2 active:translate-y-[2px] transition-all"
          >
            Play Again
          </button>
          <button
            className="w-full py-3.5 rounded-2xl bg-white/[0.04] border-2 border-white/10 border-b-4 border-b-white/15 text-white/70 font-extrabold text-sm hover:bg-white/[0.07] active:border-b-2 active:translate-y-[2px] transition-all"
          >
            Main Menu
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}
