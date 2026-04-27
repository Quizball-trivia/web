'use client';

import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'motion/react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { X } from 'lucide-react';
import { AnimatedPointsCounter } from './AnimatedPointsCounter';

interface PossessionHUDProps {
  playerGoals: number;
  opponentGoals: number;
  playerPoints?: number;
  opponentPoints?: number;
  playerName: string;
  opponentName: string;
  playerAvatarUrl: string;
  opponentAvatarUrl: string;
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
  playerName,
  opponentName,
  playerAvatarUrl,
  opponentAvatarUrl,
  timeRemaining,
  half,
  questionInHalf,
  zone,
  zoneColor,
  onQuit,
  opponentAnswered,
  opponentAnsweredCorrectly,
}: PossessionHUDProps) {
  const isUrgent = timeRemaining !== null && timeRemaining <= 3;
  const showTimer = timeRemaining !== null;

  return (
    <div className="w-full font-fun space-y-3 mb-3 relative">
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

      {/* Player strip — flat, no card chrome */}
      <div className="flex items-center justify-between gap-3 px-3">
        {/* Player side */}
        <div className="flex min-w-0 flex-1 items-center gap-3">
          <Avatar className="size-12 shrink-0">
            <AvatarImage src={playerAvatarUrl} className="object-cover" />
            <AvatarFallback className="text-xs font-bold bg-[#1CB0F6]/20 text-[#1CB0F6]">
              {playerName.slice(0, 2).toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <div className="min-w-0">
            <div className="max-w-[100px] truncate text-xs font-bold text-white/85">{playerName}</div>
            <div className="text-3xl font-black leading-7 tabular-nums text-white">
              {playerGoals}
            </div>
            <AnimatedPointsCounter value={playerPoints} accentClassName="text-[#FFE500]" />
          </div>
        </div>

        {/* Center timer + half */}
        <div className="flex min-w-[100px] shrink-0 flex-col items-center justify-center">
          <div className="mb-1 text-[10px] font-black uppercase tracking-[0.18em] text-white/45">
            {half === 1 ? '1st Half' : '2nd Half'}
          </div>
          <div
            className={cn(
              'text-3xl font-black tabular-nums transition-all duration-200',
              showTimer
                ? isUrgent ? 'text-red-500 opacity-100 scale-100' : 'text-white opacity-100 scale-100'
                : 'text-white/20 opacity-0 scale-90'
            )}
          >
            {showTimer ? timeRemaining : '\u00B7'}
          </div>
          <div className="-mt-0.5 text-[10px] font-black tracking-[0.18em] text-white/35">VS</div>
        </div>

        {/* Opponent side */}
        <div className="flex min-w-0 flex-1 items-center justify-end gap-3">
          <div className="min-w-0 text-right">
            <div className="text-xs font-bold text-white/85 truncate max-w-[100px] ml-auto">{opponentName}</div>
            <motion.div
              key="opp-goals"
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.2 }}
              className="text-3xl leading-7 font-black text-white tabular-nums"
            >
              {opponentGoals}
            </motion.div>
            <AnimatedPointsCounter
              value={opponentPoints}
              align="right"
              accentClassName="text-[#FF4B4B]"
            />
          </div>
          <Avatar className="size-12">
            <AvatarImage src={opponentAvatarUrl} className="object-cover" />
            <AvatarFallback className="text-xs font-bold bg-[#FF4B4B]/20 text-[#FF4B4B]">
              {opponentName.slice(0, 2).toUpperCase()}
            </AvatarFallback>
          </Avatar>
        </div>
      </div>

      {/* Zone pill */}
      <div className="px-3 flex items-center gap-3">

        {/* Zone pill */}
        <AnimatePresence mode="wait">
          <motion.div
            key={zone}
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.8, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="rounded-full px-3 py-1 text-[11px] font-black uppercase tracking-[0.18em]"
            style={{
              backgroundColor: zoneColor + '18',
              color: zoneColor,
            }}
          >
            {zone}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}
