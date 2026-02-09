'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { cn } from '@/lib/utils';
import { Flame, Shield, Zap } from 'lucide-react';

export type TacticalCard = 'press-high' | 'play-safe' | 'all-in';

interface HalftimeScreenProps {
  visible: boolean;
  playerGoals: number;
  opponentGoals: number;
  playerName: string;
  opponentName: string;
  playerAvatarUrl: string;
  opponentAvatarUrl: string;
  onSelectTactic: (tactic: TacticalCard) => void;
}

const HALFTIME_DURATION = 15;

const TACTICS = [
  {
    id: 'press-high' as TacticalCard,
    name: 'Press High',
    description: 'Faster pressure, higher risk',
    effects: ['1.25x speed bonus', '−12 wrong penalty'],
    color: '#FF9600',
    Icon: Flame,
  },
  {
    id: 'play-safe' as TacticalCard,
    name: 'Play Safe',
    description: 'Fewer mistakes, slower play',
    effects: ['−8 wrong penalty', '+9 correct gain'],
    color: '#1CB0F6',
    Icon: Shield,
  },
  {
    id: 'all-in' as TacticalCard,
    name: 'All In',
    description: 'Everything to win — or lose',
    effects: ['+14/−14 swings', 'Shot at 3 momentum'],
    color: '#FF4B4B',
    Icon: Zap,
  },
] as const;

export function HalftimeScreen({
  visible,
  playerGoals,
  opponentGoals,
  playerName,
  opponentName,
  playerAvatarUrl,
  opponentAvatarUrl,
  onSelectTactic,
}: HalftimeScreenProps) {
  const [selected, setSelected] = useState<TacticalCard>('play-safe');
  const [timeLeft, setTimeLeft] = useState(HALFTIME_DURATION);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const hasFiredRef = useRef(false);

  const startTimer = useCallback(() => {
    setTimeLeft(HALFTIME_DURATION);
    hasFiredRef.current = false;
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          if (timerRef.current) clearInterval(timerRef.current);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  }, []);

  // Start timer when becoming visible
  useEffect(() => {
    if (visible) {
      setSelected('play-safe');
      startTimer();
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [visible, startTimer]);

  // Fire callback when timer expires
  useEffect(() => {
    if (timeLeft === 0 && !hasFiredRef.current) {
      hasFiredRef.current = true;
      onSelectTactic(selected);
    }
  }, [timeLeft, selected, onSelectTactic]);

  const progress = timeLeft / HALFTIME_DURATION;
  const isUrgent = timeLeft <= 5;

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-black/90 px-4"
        >
          <motion.div
            initial={{ scale: 0.85, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ type: 'spring', stiffness: 200, damping: 22 }}
            className="w-full max-w-md flex flex-col items-center font-fun"
          >
            {/* Header */}
            <div className="mb-5 text-center">
              <div className="text-white/40 text-[10px] uppercase tracking-[0.35em] font-bold mb-1">
                Half Time
              </div>
              <div className="text-xl font-black text-white uppercase tracking-wide">
                End of 1st Half
              </div>
            </div>

            {/* Score */}
            <div className="flex items-center justify-center gap-5 mb-7">
              <div className="flex flex-col items-center gap-1.5">
                <Avatar className="size-14 border-[3px] border-[#1CB0F6]">
                  <AvatarImage src={playerAvatarUrl} />
                  <AvatarFallback className="text-xs font-bold bg-[#1CB0F6]/20 text-[#1CB0F6]">
                    {playerName.slice(0, 2).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <span className="text-[10px] text-white/50 uppercase tracking-widest font-bold">
                  {playerName}
                </span>
              </div>

              <div className="flex items-center gap-3">
                <span className="text-5xl font-black text-white tabular-nums">{playerGoals}</span>
                <span className="text-xl text-white/25 font-black">–</span>
                <span className="text-5xl font-black text-white tabular-nums">{opponentGoals}</span>
              </div>

              <div className="flex flex-col items-center gap-1.5">
                <Avatar className="size-14 border-[3px] border-[#FF4B4B]">
                  <AvatarImage src={opponentAvatarUrl} />
                  <AvatarFallback className="text-xs font-bold bg-[#FF4B4B]/20 text-[#FF4B4B]">
                    {opponentName.slice(0, 2).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <span className="text-[10px] text-white/50 uppercase tracking-widest font-bold">
                  {opponentName}
                </span>
              </div>
            </div>

            {/* Tactic heading */}
            <div className="text-white/50 text-[11px] uppercase tracking-[0.25em] font-bold mb-4">
              Choose Your Tactic
            </div>

            {/* Tactical Cards */}
            <div className="flex gap-3 w-full mb-6">
              {TACTICS.map((tactic, i) => {
                const isSelected = selected === tactic.id;
                return (
                  <motion.button
                    key={tactic.id}
                    initial={{ opacity: 0, y: 24, scale: 0.92 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    transition={{
                      type: 'spring',
                      stiffness: 300,
                      damping: 22,
                      delay: 0.15 + i * 0.08,
                    }}
                    onClick={() => setSelected(tactic.id)}
                    className={cn(
                      'flex-1 flex flex-col items-center gap-2.5 rounded-2xl p-4 pt-5 transition-all duration-200 cursor-pointer',
                      'active:translate-y-[2px] active:border-b-2',
                      isSelected
                        ? 'border-2 border-b-4'
                        : 'bg-[#1B2F36] border-2 border-transparent border-b-4 border-b-[#0D1B21] opacity-50'
                    )}
                    style={
                      isSelected
                        ? {
                            backgroundColor: `${tactic.color}10`,
                            borderColor: `${tactic.color}80`,
                            borderBottomColor: `${tactic.color}50`,
                            boxShadow: `0 0 24px ${tactic.color}25, inset 0 1px 0 ${tactic.color}15`,
                          }
                        : undefined
                    }
                  >
                    {/* Icon */}
                    <div
                      className="size-12 rounded-xl flex items-center justify-center border-2"
                      style={{
                        backgroundColor: `${tactic.color}20`,
                        borderColor: `${tactic.color}40`,
                      }}
                    >
                      <tactic.Icon
                        className="size-6"
                        style={{ color: tactic.color }}
                        strokeWidth={2.5}
                      />
                    </div>

                    {/* Name */}
                    <div
                      className={cn(
                        'text-[13px] font-black uppercase tracking-wide leading-tight',
                        isSelected ? 'text-white' : 'text-white/70'
                      )}
                    >
                      {tactic.name}
                    </div>

                    {/* Description */}
                    <div className="text-[11px] font-semibold text-[#56707A] leading-snug text-center">
                      {tactic.description}
                    </div>

                    {/* Effects */}
                    <div className="flex flex-col gap-0.5 w-full">
                      {tactic.effects.map((effect, j) => (
                        <div
                          key={j}
                          className="text-[9px] font-bold uppercase tracking-wider text-center"
                          style={{ color: isSelected ? `${tactic.color}AA` : '#56707A80' }}
                        >
                          {effect}
                        </div>
                      ))}
                    </div>
                  </motion.button>
                );
              })}
            </div>

            {/* Timer bar */}
            <div className="w-full max-w-xs">
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-[10px] font-bold uppercase tracking-widest text-white/30">
                  2nd half in
                </span>
                <motion.span
                  animate={isUrgent ? { scale: [1, 1.15, 1] } : {}}
                  transition={isUrgent ? { repeat: Infinity, duration: 0.5 } : {}}
                  className={cn(
                    'text-sm font-black tabular-nums',
                    isUrgent ? 'text-red-400' : 'text-white/60'
                  )}
                >
                  {timeLeft}s
                </motion.span>
              </div>
              <div className="h-2.5 rounded-full bg-white/10 overflow-hidden">
                <motion.div
                  className="h-full rounded-full"
                  initial={{ width: '100%' }}
                  animate={{ width: `${progress * 100}%` }}
                  transition={{ duration: 0.4, ease: 'easeOut' }}
                  style={{
                    background: isUrgent
                      ? 'linear-gradient(90deg, #EF4444, #DC2626)'
                      : 'linear-gradient(90deg, #58CC02, #46A302)',
                  }}
                />
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
