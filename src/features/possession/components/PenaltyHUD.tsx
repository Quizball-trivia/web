'use client';

import { motion } from 'motion/react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { X } from 'lucide-react';
import { MAX_PENALTY_ROUNDS } from '../types/possession.types';
import type { Phase } from '../types/possession.types';
import { AnimatedPointsCounter } from './AnimatedPointsCounter';

interface PenaltyHUDProps {
  penaltyPlayerScore: number;
  penaltyOpponentScore: number;
  playerPoints?: number;
  opponentPoints?: number;
  penaltyRound: number;
  isPenaltySuddenDeath: boolean;
  isPlayerShooter: boolean;
  playerName: string;
  opponentName: string;
  playerAvatarUrl: string;
  opponentAvatarUrl: string;
  timeRemaining: number;
  phase: Phase;
  onQuit?: () => void;
}

export function PenaltyHUD({
  penaltyPlayerScore,
  penaltyOpponentScore,
  playerPoints = 0,
  opponentPoints = 0,
  penaltyRound,
  isPenaltySuddenDeath,
  isPlayerShooter,
  playerName,
  opponentName,
  playerAvatarUrl,
  opponentAvatarUrl,
  timeRemaining,
  phase,
  onQuit,
}: PenaltyHUDProps) {
  // Compute initials from names
  const getInitials = (name: string) => {
    if (!name) return '?';
    const words = name.trim().split(/\s+/);
    if (words.length >= 2) {
      return (words[0][0] + words[1][0]).toUpperCase();
    }
    return name.slice(0, 2).toUpperCase();
  };

  const playerInitials = getInitials(playerName);
  const opponentInitials = getInitials(opponentName);

  return (
    <div className="w-full font-fun space-y-2 mb-3">
      {onQuit && (
        <div className="px-3">
          <button
            onClick={onQuit}
            className="shrink-0 p-1.5 rounded-full text-white/40 hover:text-white/70 hover:bg-white/5 transition-colors"
            title="Leave match"
          >
            <X className="size-5" />
          </button>
        </div>
      )}

      <div className="flex items-center justify-between gap-3 px-3">
        <div className="flex min-w-0 flex-1 items-center gap-3">
          <Avatar className="size-11 shrink-0">
            <AvatarImage src={playerAvatarUrl} />
            <AvatarFallback className="text-xs font-bold bg-[#1CB0F6]/20 text-[#1CB0F6]">{playerInitials}</AvatarFallback>
          </Avatar>
          <div className="min-w-0">
            <div className="truncate text-xs font-bold text-white/85">{playerName}</div>
            <div className="text-3xl font-black leading-7 tabular-nums text-white">{penaltyPlayerScore}</div>
            <AnimatedPointsCounter value={playerPoints} accentClassName="text-[#FFE500]" />
          </div>
        </div>
        <div className="flex min-w-[100px] shrink-0 flex-col items-center justify-center">
          <div className="mb-1 text-[10px] font-black uppercase tracking-[0.18em] text-[#FF9600]">
            {isPenaltySuddenDeath ? 'Sudden Death' : `Pen ${penaltyRound}/${MAX_PENALTY_ROUNDS}`}
          </div>
          <motion.div
            animate={timeRemaining <= 2 && phase === 'penalty-playing' ? { scale: [1, 1.1, 1] } : {}}
            transition={timeRemaining <= 2 ? { repeat: Infinity, duration: 0.6 } : {}}
            className={`text-3xl font-black tabular-nums transition-colors duration-200 ${
              phase === 'penalty-playing'
                ? timeRemaining <= 2 ? 'text-red-500' : 'text-white'
                : 'text-white/40'
            }`}
          >
            {phase === 'penalty-playing' ? timeRemaining : '\u2014'}
          </motion.div>
          <div className="-mt-0.5 text-[10px] font-black tracking-[0.18em] text-[#FF9600]/70">
            {isPlayerShooter ? 'YOU SHOOT' : 'YOU SAVE'}
          </div>
        </div>
        <div className="flex min-w-0 flex-1 items-center justify-end gap-3">
          <div className="min-w-0 text-right">
            <div className="ml-auto truncate text-xs font-bold text-white/85">{opponentName}</div>
            <div className="text-3xl font-black leading-7 tabular-nums text-white">{penaltyOpponentScore}</div>
            <AnimatedPointsCounter
              value={opponentPoints}
              align="right"
              accentClassName="text-[#FF4B4B]"
            />
          </div>
          <Avatar className="size-11 shrink-0">
            <AvatarImage src={opponentAvatarUrl} />
            <AvatarFallback className="text-xs font-bold bg-[#FF4B4B]/20 text-[#FF4B4B]">{opponentInitials}</AvatarFallback>
          </Avatar>
        </div>
      </div>
      {/* Penalty score pips */}
      <div className="flex justify-center gap-4 px-3">
        <div className="flex gap-1.5">
          {Array.from({ length: MAX_PENALTY_ROUNDS }).map((_, i) => (
            <div key={`pp-${i}`} className={`size-3 rounded-full border-2 ${i < penaltyPlayerScore ? 'bg-[#58CC02] border-[#58CC02]' : 'bg-transparent border-white/20'}`} />
          ))}
        </div>
        <div className="text-[10px] font-black text-white/30 tracking-wider">PENS</div>
        <div className="flex gap-1.5">
          {Array.from({ length: MAX_PENALTY_ROUNDS }).map((_, i) => (
            <div key={`op-${i}`} className={`size-3 rounded-full border-2 ${i < penaltyOpponentScore ? 'bg-[#FF4B4B] border-[#FF4B4B]' : 'bg-transparent border-white/20'}`} />
          ))}
        </div>
      </div>
    </div>
  );
}
