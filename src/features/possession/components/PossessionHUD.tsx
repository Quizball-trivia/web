'use client';

import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'motion/react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';

interface PossessionHUDProps {
  playerGoals: number;
  opponentGoals: number;
  playerName: string;
  opponentName: string;
  playerAvatarUrl: string;
  opponentAvatarUrl: string;
  timeRemaining: number;
  half: 1 | 2;
  questionInHalf: number;
  zone: string;
  zoneColor: string;
  momentum: number;
}

export function PossessionHUD({
  playerGoals,
  opponentGoals,
  playerName,
  opponentName,
  playerAvatarUrl,
  opponentAvatarUrl,
  timeRemaining,
  half,
  questionInHalf,
  zone,
  zoneColor,
  momentum,
}: PossessionHUDProps) {
  const isUrgent = timeRemaining <= 3;

  return (
    <div className="w-full font-fun space-y-3 mb-3">
      {/* Player strip — matching MatchScoreHUD style */}
      <div className="flex items-center justify-between gap-3 px-3">
        {/* Player side */}
        <div className="flex items-center gap-3 flex-1 min-w-0 rounded-2xl bg-[#172333]/85 border border-white/10 px-3 py-2.5">
          <Avatar className="size-11 border-2 border-[#1CB0F6] shrink-0">
            <AvatarImage src={playerAvatarUrl} />
            <AvatarFallback className="text-xs font-bold bg-[#1CB0F6]/20 text-[#1CB0F6]">
              {playerName.slice(0, 2).toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <div className="min-w-0">
            <div className="text-xs font-bold text-white/85 truncate max-w-[100px]">{playerName}</div>
            <div className="text-3xl leading-7 font-black text-white tabular-nums">
              {playerGoals}
            </div>
          </div>
        </div>

        {/* Center timer + half */}
        <div className="shrink-0 flex flex-col items-center justify-center min-w-[100px]">
          <div className="px-2.5 py-0.5 rounded-full bg-white/10 text-[10px] font-black uppercase tracking-[0.15em] text-white/60 mb-1">
            {half === 1 ? '1st Half' : '2nd Half'}
          </div>
          <motion.div
            animate={isUrgent ? { scale: [1, 1.1, 1] } : {}}
            transition={isUrgent ? { repeat: Infinity, duration: 0.6 } : {}}
            className={cn(
              'text-3xl font-black tabular-nums transition-colors duration-200',
              isUrgent ? 'text-red-500 animate-pulse' : 'text-white'
            )}
          >
            {timeRemaining}
          </motion.div>
          <div className="text-[10px] font-black tracking-[0.18em] text-white/35 -mt-0.5">VS</div>
        </div>

        {/* Opponent side */}
        <div className="flex items-center gap-3 flex-1 min-w-0 justify-end rounded-2xl bg-[#172333]/85 border border-white/10 px-3 py-2.5">
          <div className="min-w-0 text-right">
            <div className="text-xs font-bold text-white/85 truncate max-w-[100px] ml-auto">{opponentName}</div>
            <div className="text-3xl leading-7 font-black text-white tabular-nums">
              {opponentGoals}
            </div>
          </div>
          <Avatar className="size-11 border-2 border-[#FF4B4B] shrink-0">
            <AvatarImage src={opponentAvatarUrl} />
            <AvatarFallback className="text-xs font-bold bg-[#FF4B4B]/20 text-[#FF4B4B]">
              {opponentName.slice(0, 2).toUpperCase()}
            </AvatarFallback>
          </Avatar>
        </div>
      </div>

      {/* Progress bar + zone pill */}
      <div className="px-3 flex items-center gap-3">
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

      {/* Momentum meter */}
      <div className="px-3 flex items-center gap-2">
        <span className="text-[9px] font-bold uppercase tracking-widest text-white/25 shrink-0">
          MTM
        </span>
        <div className="flex gap-1 flex-1">
          {Array.from({ length: 6 }).map((_, i) => {
            const filled = i < momentum;
            const isHot = momentum >= 4;
            return (
              <motion.div
                key={i}
                className={cn(
                  'h-2 flex-1 rounded-full transition-colors duration-300',
                  filled
                    ? isHot ? 'bg-orange-400' : 'bg-emerald-400'
                    : 'bg-white/10'
                )}
                animate={filled && isHot ? { opacity: [0.7, 1, 0.7] } : { opacity: 1 }}
                transition={filled && isHot ? { repeat: Infinity, duration: 0.8, delay: i * 0.1 } : {}}
                style={filled ? {
                  boxShadow: isHot
                    ? '0 0 6px rgba(251,146,60,0.5)'
                    : '0 0 4px rgba(52,211,153,0.3)',
                } : undefined}
              />
            );
          })}
        </div>
        {momentum >= 4 && (
          <motion.span
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="text-[9px] font-black uppercase tracking-wider text-orange-400"
          >
            SHOT!
          </motion.span>
        )}
      </div>
    </div>
  );
}
