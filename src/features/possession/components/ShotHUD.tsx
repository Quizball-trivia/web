'use client';

import { motion } from 'motion/react';
import { AvatarDisplay } from '@/components/AvatarDisplay';
import { X } from 'lucide-react';
import type { Phase } from '../types/possession.types';
import { AnimatedPointsCounter } from './AnimatedPointsCounter';
import type { AvatarCustomization } from '@/types/game';

interface ShotHUDProps {
  playerGoals: number;
  opponentGoals: number;
  playerPoints?: number;
  opponentPoints?: number;
  playerAvatarUrl: string;
  opponentAvatarUrl: string;
  playerAvatarCustomization?: AvatarCustomization | null;
  opponentAvatarCustomization?: AvatarCustomization | null;
  timeRemaining: number;
  phase: Phase;
  isPlayerAttacker?: boolean;
  playerName?: string;
  opponentName?: string;
  onQuit?: () => void;
}

export function ShotHUD({
  playerGoals,
  opponentGoals,
  playerPoints = 0,
  opponentPoints = 0,
  playerAvatarCustomization = null,
  opponentAvatarCustomization = null,
  timeRemaining,
  phase,
  isPlayerAttacker = true,
  playerName = 'You',
  opponentName = 'CPU',
  onQuit,
}: ShotHUDProps) {
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
          <AvatarDisplay customization={playerAvatarCustomization ?? {}} size="sm" className="size-11 shrink-0" />
          <div className="min-w-0">
            <div className="truncate text-xs font-bold text-white/85">{playerName}</div>
            <div className="text-3xl font-black leading-7 tabular-nums text-white">{playerGoals}</div>
            <AnimatedPointsCounter value={playerPoints} accentClassName="text-[#FFE500]" />
          </div>
        </div>
        <div className="flex min-w-[100px] shrink-0 flex-col items-center justify-center">
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="mb-1 text-[10px] font-black uppercase tracking-[0.18em] text-[#FF9600]"
          >
            Shot on Goal
          </motion.div>
          <motion.div
            animate={timeRemaining <= 3 && phase === 'shot' ? { scale: [1, 1.1, 1] } : {}}
            transition={timeRemaining <= 3 ? { repeat: Infinity, duration: 0.6 } : {}}
            className={`text-3xl font-black tabular-nums transition-colors duration-200 ${
              phase === 'shot'
                ? timeRemaining <= 3 ? 'text-red-500' : 'text-white'
                : 'text-white/40'
            }`}
          >
            {phase === 'shot' ? timeRemaining : '\u2014'}
          </motion.div>
          <div className="-mt-0.5 text-[10px] font-black tracking-[0.18em] text-[#FF9600]/70">
            {isPlayerAttacker ? 'YOU SHOOT' : 'YOU SAVE'}
          </div>
        </div>
        <div className="flex min-w-0 flex-1 items-center justify-end gap-3">
          <div className="min-w-0 text-right">
            <div className="ml-auto truncate text-xs font-bold text-white/85">{opponentName}</div>
            <div className="text-3xl font-black leading-7 tabular-nums text-white">{opponentGoals}</div>
            <AnimatedPointsCounter
              value={opponentPoints}
              align="right"
              accentClassName="text-[#FF4B4B]"
            />
          </div>
          <AvatarDisplay customization={opponentAvatarCustomization ?? {}} size="sm" className="size-11 shrink-0" />
        </div>
      </div>
    </div>
  );
}
