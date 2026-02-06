"use client";

import { useEffect, useState } from 'react';

import { motion } from 'motion/react';

import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { cn } from '@/lib/utils';
import { getRankInfo, getDivisionEmoji, getDivisionColor } from '@/utils/rankSystem';

// Mock RP values — will be replaced by real data later
const MOCK_OLD_RP = 245;

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
  onPlayAgain,
  onMainMenu,
}: RealtimeResultsScreenProps) {
  const playerWon = playerScore > opponentScore;
  const isDraw = playerScore === opponentScore;

  const rpChange = playerWon ? 15 : -15;
  const oldRP = MOCK_OLD_RP;
  const newRP = playerWon ? oldRP + 15 : oldRP - 15;
  const accuracy = totalQuestions === 0 ? 0 : Math.round((playerCorrect / totalQuestions) * 100);
  const coinsEarned = playerWon ? 25 : 5;

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

        {/* Player comparison strip */}
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
                rpChange > 0 ? 'text-emerald-400' : 'text-red-400'
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

function StatCard({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div className="bg-[#1a1f2e] rounded-2xl border-b-4 border-b-white/10 p-3 text-center">
      <div className="text-[10px] uppercase tracking-wider text-white/40 font-bold mb-1">{label}</div>
      <div className={cn('text-lg font-black', color)}>{value}</div>
    </div>
  );
}

function WinIllustration() {
  return (
    <svg width="90" height="90" viewBox="0 0 90 90" fill="none">
      {/* Trophy body */}
      <path d="M30 25 H60 L55 55 H35 Z" stroke="#22c55e" strokeWidth="2.5" fill="rgba(34,197,94,0.1)" />
      {/* Trophy handles */}
      <path d="M30 30 Q18 30 18 42 Q18 50 28 50" stroke="#22c55e" strokeWidth="2.5" fill="none" strokeLinecap="round" />
      <path d="M60 30 Q72 30 72 42 Q72 50 62 50" stroke="#22c55e" strokeWidth="2.5" fill="none" strokeLinecap="round" />
      {/* Trophy base */}
      <rect x="37" y="55" width="16" height="4" rx="2" fill="#22c55e" />
      <rect x="33" y="59" width="24" height="4" rx="2" fill="#22c55e" opacity="0.6" />
      {/* Star */}
      <path d="M45 34 L47.5 39 L53 39.8 L49 43.5 L50 49 L45 46.3 L40 49 L41 43.5 L37 39.8 L42.5 39 Z" fill="#22c55e" />
      {/* Sparkles */}
      <circle cx="22" cy="22" r="1.5" fill="#22c55e" opacity="0.6" />
      <circle cx="68" cy="20" r="1" fill="#22c55e" opacity="0.4" />
      <circle cx="75" cy="35" r="1.5" fill="#22c55e" opacity="0.5" />
      <line x1="14" y1="18" x2="18" y2="14" stroke="#22c55e" strokeWidth="1.5" strokeLinecap="round" opacity="0.4" />
      <line x1="72" y1="14" x2="76" y2="10" stroke="#22c55e" strokeWidth="1.5" strokeLinecap="round" opacity="0.4" />
    </svg>
  );
}

function DrawIllustration() {
  return (
    <svg width="90" height="90" viewBox="0 0 90 90" fill="none">
      {/* Two hands shaking - simplified */}
      <path d="M20 45 Q25 35 35 40 L45 45" stroke="#eab308" strokeWidth="2.5" fill="none" strokeLinecap="round" />
      <path d="M70 45 Q65 35 55 40 L45 45" stroke="#eab308" strokeWidth="2.5" fill="none" strokeLinecap="round" />
      {/* Equals sign */}
      <rect x="37" y="54" width="16" height="3" rx="1.5" fill="#eab308" opacity="0.6" />
      <rect x="37" y="60" width="16" height="3" rx="1.5" fill="#eab308" opacity="0.6" />
      {/* Sparkles */}
      <circle cx="45" cy="28" r="2" fill="#eab308" opacity="0.5" />
      <circle cx="30" cy="30" r="1.5" fill="#eab308" opacity="0.3" />
      <circle cx="60" cy="30" r="1.5" fill="#eab308" opacity="0.3" />
    </svg>
  );
}

function LossIllustration() {
  return (
    <svg width="90" height="90" viewBox="0 0 90 90" fill="none">
      {/* Deflected football */}
      <circle cx="45" cy="40" r="14" stroke="#ef4444" strokeWidth="2.5" fill="rgba(239,68,68,0.08)" />
      {/* Pentagon pattern on ball */}
      <path d="M45 30 L50 36 L48 43 L42 43 L40 36 Z" stroke="#ef4444" strokeWidth="1.5" fill="none" opacity="0.5" />
      {/* Deflection arrow */}
      <path d="M62 38 Q68 32 74 36" stroke="#ef4444" strokeWidth="2" strokeLinecap="round" fill="none" />
      <path d="M71 32 L74 36 L70 38" stroke="#ef4444" strokeWidth="2" strokeLinecap="round" fill="none" />
      {/* Impact lines */}
      <line x1="28" y1="35" x2="22" y2="32" stroke="#ef4444" strokeWidth="1.5" strokeLinecap="round" opacity="0.4" />
      <line x1="27" y1="42" x2="20" y2="42" stroke="#ef4444" strokeWidth="1.5" strokeLinecap="round" opacity="0.3" />
      <line x1="28" y1="48" x2="22" y2="52" stroke="#ef4444" strokeWidth="1.5" strokeLinecap="round" opacity="0.4" />
      {/* Sad mouth */}
      <path d="M38 62 Q45 57 52 62" stroke="#ef4444" strokeWidth="2" strokeLinecap="round" fill="none" opacity="0.5" />
    </svg>
  );
}
