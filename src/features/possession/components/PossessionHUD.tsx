'use client';

import { motion } from 'motion/react';
import { AvatarDisplay } from '@/components/AvatarDisplay';
import { X } from 'lucide-react';
import { AnimatedPointsCounter } from './AnimatedPointsCounter';
import type { AvatarCustomization } from '@/types/game';

const poppins = {
  fontFamily: "'Poppins', sans-serif",
  fontWeight: 600,
  letterSpacing: '0',
  lineHeight: 1,
} as const;

interface PossessionHUDProps {
  playerGoals: number;
  opponentGoals: number;
  playerPoints?: number;
  opponentPoints?: number;
  playerName: string;
  opponentName: string;
  playerAvatarUrl: string;
  opponentAvatarUrl: string;
  playerAvatarCustomization?: AvatarCustomization | null;
  opponentAvatarCustomization?: AvatarCustomization | null;
  timeRemaining: number | null;
  half: 1 | 2;
  questionInHalf: number;
  zone: string;
  zoneColor: string;
  onQuit?: () => void;
  opponentAnswered?: boolean;
  opponentAnsweredCorrectly?: boolean | null;
}

export function PossessionHUD({
  playerGoals,
  opponentGoals,
  playerPoints = 0,
  opponentPoints = 0,
  playerName: _playerName,
  opponentName: _opponentName,
  playerAvatarCustomization = null,
  opponentAvatarCustomization = null,
  timeRemaining,
  half,
  onQuit,
}: PossessionHUDProps) {
  void _playerName;
  void _opponentName;
  const showTimer = timeRemaining !== null;
  const timerLabel = showTimer
    ? (timeRemaining! >= 10 ? `${timeRemaining}` : `0${timeRemaining}`)
    : '\u00B7\u00B7';

  return (
    <div className="relative w-full mb-3 px-3">
      {/* Quit button — fixed top right corner of screen */}
      {onQuit && (
        <button
          onClick={onQuit}
          className="fixed top-3 right-3 z-50 p-2 rounded-full text-white/50 hover:text-white hover:bg-white/10 transition-colors"
          title="Leave match"
        >
          <X className="size-5" />
        </button>
      )}

      {/* FIRST HALF / 2ND HALF label */}
      <div
        className="text-center text-white"
        style={{ ...poppins, fontSize: 'clamp(12px, 1.4vw, 20px)', opacity: 0.5 }}
      >
        {half === 1 ? 'FIRST HALF' : 'SECOND HALF'}
      </div>

      {/* HUD strip: avatar | PT | score-pill | PT | avatar */}
      <div className="mt-2 flex items-center justify-center gap-3 sm:gap-4">
        {/* Player (left) */}
        <div className="flex items-center gap-2 sm:gap-3">
          <div className="rounded-full bg-[#1645FF] p-2 sm:p-2.5">
            <AvatarDisplay customization={playerAvatarCustomization ?? {}} size="sm" />
          </div>
          <AnimatedPointsCounter value={playerPoints} accentClassName="text-white/50" />
        </div>

        {/* Score pill: [2 | 09 | 3] */}
        <div className="relative inline-flex h-[40px] items-center sm:h-[51px]">
          {/* Left score (player goals) — outline */}
          <div
            className="flex h-full items-center justify-center rounded-l-[20px] border-2 border-r-0 border-[#1645FF] px-3 text-white sm:px-4"
            style={{ ...poppins, fontSize: 'clamp(14px, 1.4vw, 20px)', minWidth: 44 }}
          >
            <motion.span
              key={`p-${playerGoals}`}
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.2 }}
            >
              {playerGoals}
            </motion.span>
          </div>
          {/* Center timer */}
          <div
            className="flex h-full items-center justify-center bg-[#1645FF] px-4 text-white tabular-nums"
            style={{ ...poppins, fontSize: 'clamp(14px, 1.4vw, 20px)', minWidth: 64 }}
          >
            {timerLabel}
          </div>
          {/* Right score (opponent goals) — outline */}
          <div
            className="flex h-full items-center justify-center rounded-r-[20px] border-2 border-l-0 border-[#1645FF] px-3 text-white sm:px-4"
            style={{ ...poppins, fontSize: 'clamp(14px, 1.4vw, 20px)', minWidth: 44 }}
          >
            <motion.span
              key={`o-${opponentGoals}`}
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.2 }}
            >
              {opponentGoals}
            </motion.span>
          </div>
        </div>

        {/* Opponent (right) */}
        <div className="flex items-center gap-2 sm:gap-3">
          <AnimatedPointsCounter value={opponentPoints} align="right" accentClassName="text-white/50" />
          <div className="rounded-full bg-[#FF4B4B] p-2 sm:p-2.5">
            <AvatarDisplay customization={opponentAvatarCustomization ?? {}} size="sm" className="-scale-x-100" />
          </div>
        </div>
      </div>
    </div>
  );
}
