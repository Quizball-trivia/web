'use client';

import { motion } from 'motion/react';
import { X } from 'lucide-react';
import type { Phase } from '../types/possession.types';
import { AnimatedPointsCounter } from './AnimatedPointsCounter';
import { MatchHudAvatar, MatchHudIconButton } from './MatchHudPrimitives';
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
    <div className="relative w-full font-fun space-y-2 mb-3">
      {onQuit && (
        <MatchHudIconButton
          onClick={onQuit}
          className="absolute right-[calc(env(safe-area-inset-right)+0.75rem)] top-[calc(env(safe-area-inset-top)+0.25rem)] z-[70] sm:right-[calc(env(safe-area-inset-right)+0.5rem)] sm:top-[calc(env(safe-area-inset-top)+0.5rem)] lg:fixed lg:right-[calc(env(safe-area-inset-right)+1rem)] lg:top-[calc(env(safe-area-inset-top)+1rem)]"
          title="Leave match"
          aria-label="Leave match"
        >
          <X className="size-5" />
        </MatchHudIconButton>
      )}

      <div className="flex items-center justify-between gap-1 px-12 sm:gap-3 sm:px-3">
        <div className="flex min-w-0 flex-1 items-center gap-1 sm:gap-3">
          <MatchHudAvatar customization={playerAvatarCustomization} side="player" />
          <div className="min-w-0">
            <div className="hidden truncate text-xs font-bold text-white/85 sm:block">{playerName}</div>
            <div className="text-2xl font-black leading-6 tabular-nums text-white sm:text-3xl sm:leading-7">{playerGoals}</div>
            <div className="hidden sm:block">
              <AnimatedPointsCounter value={playerPoints} accentClassName="text-brand-yellow" />
            </div>
            <div className="text-[8px] font-black uppercase leading-none tracking-[0.08em] text-white/45 sm:hidden">
              {playerPoints} pts
            </div>
          </div>
        </div>
        <div className="flex min-w-[44px] shrink-0 flex-col items-center justify-center sm:min-w-[100px]">
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="mb-1 hidden text-[10px] font-black uppercase tracking-[0.18em] text-brand-orange sm:block"
          >
            Shot on Goal
          </motion.div>
          <motion.div
            animate={timeRemaining <= 3 && phase === 'shot' ? { scale: [1, 1.1, 1] } : {}}
            transition={timeRemaining <= 3 ? { repeat: Infinity, duration: 0.6 } : {}}
            className={`text-2xl font-black tabular-nums transition-colors duration-200 sm:text-3xl ${
              phase === 'shot' ? '' : 'hidden sm:block'
            } ${
              phase === 'shot'
                ? timeRemaining <= 3 ? 'text-red-500' : 'text-white'
                : 'text-white/40'
            }`}
          >
            {phase === 'shot' ? timeRemaining : '\u2014'}
          </motion.div>
          <div className="-mt-0.5 hidden text-[10px] font-black tracking-[0.18em] text-brand-orange/70 sm:block">
            {isPlayerAttacker ? 'YOU SHOOT' : 'YOU SAVE'}
          </div>
        </div>
        <div className="flex min-w-0 flex-1 items-center justify-end gap-1 sm:gap-3">
          <div className="min-w-0 text-right">
            <div className="ml-auto hidden truncate text-xs font-bold text-white/85 sm:block">{opponentName}</div>
            <div className="text-2xl font-black leading-6 tabular-nums text-white sm:text-3xl sm:leading-7">{opponentGoals}</div>
            <div className="hidden sm:block">
              <AnimatedPointsCounter
                value={opponentPoints}
                align="right"
                accentClassName="text-brand-red-soft"
              />
            </div>
            <div className="text-[8px] font-black uppercase leading-none tracking-[0.08em] text-white/45 sm:hidden">
              {opponentPoints} pts
            </div>
          </div>
          <MatchHudAvatar customization={opponentAvatarCustomization} side="opponent" />
        </div>
      </div>
    </div>
  );
}
