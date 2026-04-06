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
    <div className="w-full font-fun space-y-3 mb-3">
      {/* Player strip — matching MatchScoreHUD style */}
      <div className="flex items-center justify-between gap-3 px-3">
        {/* Player side */}
        <div className="flex items-center gap-3 flex-1 min-w-0 rounded-2xl px-3 py-2.5">
          <Avatar className="size-12 shrink-0">
            <AvatarImage src={playerAvatarUrl} className="object-cover" />
            <AvatarFallback className="text-xs font-bold bg-[#1CB0F6]/20 text-[#1CB0F6]">
              {playerName.slice(0, 2).toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <div className="min-w-0">
            <div className="text-xs font-bold text-white/85 truncate max-w-[100px]">{playerName}</div>
            <div className="text-3xl leading-7 font-black text-white tabular-nums">
              {playerGoals}
            </div>
            <AnimatedPointsCounter value={playerPoints} accentClassName="text-[#1CB0F6]" />
          </div>
        </div>

        {/* Center timer + half */}
        <div className="shrink-0 flex flex-col items-center justify-center min-w-[100px]">
          <div className="px-2.5 py-0.5 rounded-full bg-white/10 text-[10px] font-black uppercase tracking-[0.15em] text-white/60 mb-1">
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
          <div className="text-[10px] font-black tracking-[0.18em] text-white/35 -mt-0.5">VS</div>
        </div>

        {/* Opponent side */}
        <div className="flex items-center gap-3 flex-1 min-w-0 justify-end rounded-2xl px-3 py-2.5">
          <div className="min-w-0 text-right">
            <div className="text-xs font-bold text-white/85 truncate max-w-[100px] ml-auto">{opponentName}</div>
            <AnimatePresence mode="wait">
              {opponentAnswered && opponentAnsweredCorrectly !== null && opponentAnsweredCorrectly !== undefined ? (
                <motion.div
                  key="opp-result"
                  initial={{ opacity: 0, y: 4 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -4 }}
                  transition={{ duration: 0.2 }}
                  className={cn(
                    "text-xs font-black uppercase tracking-wide",
                    opponentAnsweredCorrectly ? 'text-[#58CC02]' : 'text-[#FF4B4B]'
                  )}
                >
                  {opponentAnsweredCorrectly ? 'Correct' : 'Wrong'}
                </motion.div>
              ) : (
                <motion.div
                  key="opp-goals"
                  initial={{ opacity: 0, y: 4 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -4 }}
                  transition={{ duration: 0.2 }}
                  className="text-3xl leading-7 font-black text-white tabular-nums"
                >
                  {opponentGoals}
                </motion.div>
              )}
            </AnimatePresence>
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

      {/* Progress bar + zone pill */}
      <div className="px-3 flex items-center gap-3">
        {onQuit && (
          <button
            onClick={onQuit}
            className="shrink-0 p-1.5 rounded-full text-white/40 hover:text-white/70 hover:bg-white/5 transition-colors"
            title="Leave match"
          >
            <X className="size-5" />
          </button>
        )}

        {/* Half progress — green gradient segments like MatchScoreHUD */}
        <div className="flex gap-1.5 flex-1">
          {Array.from({ length: 6 }).map((_, i) => (
            <div
              key={i}
              className="h-2.5 flex-1 rounded-full overflow-hidden bg-white/10"
            >
              <div
                className={cn(
                  'h-full rounded-full transition-all duration-500',
                  i < questionInHalf ? 'w-full' : 'w-0'
                )}
                style={i < questionInHalf ? {
                  background: 'linear-gradient(180deg, #4ade80 0%, #22c55e 100%)',
                } : undefined}
              >
                {i < questionInHalf && (
                  <div className="h-1/2 rounded-full bg-gradient-to-b from-white/30 to-transparent" />
                )}
              </div>
            </div>
          ))}
        </div>

        {/* Zone pill */}
        <AnimatePresence mode="wait">
          <motion.div
            key={zone}
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.8, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="px-3 py-1 rounded-full text-[11px] font-black uppercase tracking-widest border-b-2"
            style={{
              backgroundColor: zoneColor + '20',
              color: zoneColor,
              borderBottomColor: zoneColor + '40',
            }}
          >
            {zone}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}
