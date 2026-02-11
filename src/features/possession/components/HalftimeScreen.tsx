'use client';

import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { cn } from '@/lib/utils';
import { Flame, Shield, Zap, Info } from 'lucide-react';
import { PitchVisualization } from './PitchVisualization';

import type { TacticalCard } from '../types/possession.types';

interface HalftimeScreenProps {
  visible: boolean;
  playerGoals: number;
  opponentGoals: number;
  playerName: string;
  opponentName: string;
  playerAvatarUrl: string;
  opponentAvatarUrl: string;
  playerPosition: number;
  playerMomentum: number;
  myReady: boolean;
  opponentReady: boolean;
  onSelectTactic: (tactic: TacticalCard) => void;
}

const HALFTIME_DURATION = 15;

const TACTICS = [
  {
    id: 'press-high' as TacticalCard,
    name: 'Press High',
    description: 'Faster pressure, higher risk',
    whatChanges: 'Reach shooting chances faster',
    tooltip: 'Your speed bonus increases, pushing you forward quickly — but mistakes cost more ground.',
    color: '#FF9600',
    Icon: Flame,
  },
  {
    id: 'play-safe' as TacticalCard,
    name: 'Play Safe',
    description: 'Fewer mistakes, slower play',
    whatChanges: 'Lose less ground on mistakes',
    tooltip: "Wrong answers won't push you back as far, but you'll advance more slowly when correct.",
    color: '#1CB0F6',
    Icon: Shield,
  },
  {
    id: 'all-in' as TacticalCard,
    name: 'All In',
    description: 'Everything to win — or lose',
    whatChanges: 'One mistake can decide the match',
    tooltip: 'Huge swings in both directions. You can shoot at lower momentum, but errors are devastating.',
    color: '#FF4B4B',
    Icon: Zap,
  },
] as const;

// ─── Circular Timer ──────────────────────────────────────────
function CircularTimer({ timeLeft, isUrgent }: { timeLeft: number; isUrgent: boolean }) {
  const radius = 22;
  const circumference = 2 * Math.PI * radius;
  const progress = timeLeft / HALFTIME_DURATION;
  const offset = circumference * (1 - progress);

  return (
    <motion.div
      animate={isUrgent ? { scale: [1, 1.08, 1] } : {}}
      transition={isUrgent ? { repeat: Infinity, duration: 0.6 } : {}}
      className="relative flex items-center justify-center"
    >
      <svg width="56" height="56" className="-rotate-90">
        {/* Track */}
        <circle
          cx="28"
          cy="28"
          r={radius}
          fill="none"
          stroke="rgba(255,255,255,0.1)"
          strokeWidth="4"
        />
        {/* Progress */}
        <motion.circle
          cx="28"
          cy="28"
          r={radius}
          fill="none"
          stroke={isUrgent ? '#EF4444' : '#58CC02'}
          strokeWidth="4"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          transition={{ duration: 0.4, ease: 'easeOut' }}
        />
      </svg>
      <span
        className={cn(
          'absolute text-sm font-black tabular-nums font-fun',
          isUrgent ? 'text-red-400' : 'text-white'
        )}
      >
        {timeLeft}
      </span>
    </motion.div>
  );
}

export function HalftimeScreen({
  visible,
  playerGoals,
  opponentGoals,
  playerName,
  opponentName,
  playerAvatarUrl,
  opponentAvatarUrl,
  playerPosition,
  playerMomentum,
  myReady,
  opponentReady,
  onSelectTactic,
}: HalftimeScreenProps) {
  const [selected, setSelected] = useState<TacticalCard>('play-safe');
  const [timeLeft, setTimeLeft] = useState(HALFTIME_DURATION);
  const [hoveredTactic, setHoveredTactic] = useState<TacticalCard | null>(null);

  // Auto-dismiss tooltip after 3s on touch devices
  useEffect(() => {
    if (!hoveredTactic) return;
    const t = setTimeout(() => setHoveredTactic(null), 3000);
    return () => clearTimeout(t);
  }, [hoveredTactic]);

  const [showHint] = useState(() => {
    if (typeof window !== 'undefined') {
      return !localStorage.getItem('halftime-hint-seen');
    }
    return true;
  });
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const hasFiredRef = useRef(false);

  useEffect(() => {
    let resetTimer: ReturnType<typeof setTimeout> | null = null;
    if (visible) {
      // Prevent stale 0s state from auto-submitting before the timer resets.
      hasFiredRef.current = true;
      resetTimer = setTimeout(() => {
        setTimeLeft(HALFTIME_DURATION);
        hasFiredRef.current = false;
      }, 0);
      if (timerRef.current) clearInterval(timerRef.current);
      timerRef.current = setInterval(() => {
        setTimeLeft((prev) => {
          if (prev <= 1) {
            if (timerRef.current) clearInterval(timerRef.current);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
      if (showHint && typeof window !== 'undefined') {
        localStorage.setItem('halftime-hint-seen', 'true');
      }
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
      timerRef.current = null;
      hasFiredRef.current = true;
      resetTimer = setTimeout(() => setTimeLeft(HALFTIME_DURATION), 0);
    }
    return () => {
      if (resetTimer) clearTimeout(resetTimer);
      if (timerRef.current) clearInterval(timerRef.current);
      timerRef.current = null;
    };
  }, [visible, showHint]);

  useEffect(() => {
    if (!visible) return;
    if (timeLeft === 0 && !hasFiredRef.current) {
      hasFiredRef.current = true;
      onSelectTactic(selected);
    }
  }, [visible, timeLeft, selected, onSelectTactic]);

  const isUrgent = timeLeft <= 5;

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex flex-col items-center overflow-hidden"
        >
          {/* ─── Layer 1: Pitch (clearly visible) ─── */}
          <div className="absolute inset-0">
            <div className="absolute inset-0 flex items-center justify-center blur-[2px] scale-[1.02]">
              <div className="w-full max-w-lg">
                <PitchVisualization
                  playerPosition={playerPosition}
                  playerAvatarUrl={playerAvatarUrl}
                  opponentAvatarUrl={opponentAvatarUrl}
                  myMomentum={playerMomentum}
                />
              </div>
            </div>
            {/* Light dark overlay — pitch stays visible */}
            <div className="absolute inset-0 bg-black/50" />
            {/* Soft vignette (edges only) */}
            <div
              className="absolute inset-0"
              style={{
                background: 'radial-gradient(ellipse at center, transparent 40%, rgba(0,0,0,0.5) 100%)',
              }}
            />
          </div>

          {/* ─── Layer 2: UI Content ─── */}
          <div className="relative z-10 w-full max-w-lg flex flex-col items-center font-fun pt-8 px-4">

            {/* ── Broadcast-style score bar ── */}
            <motion.div
              initial={{ y: -30, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ type: 'spring', stiffness: 200, damping: 22 }}
              className="flex items-center gap-4 bg-black/50 backdrop-blur-md rounded-2xl px-5 py-3 border border-white/10 mb-3"
            >
              {/* Player */}
              <div className="flex items-center gap-2.5">
                <Avatar className="size-10 border-2 border-[#1CB0F6]">
                  <AvatarImage src={playerAvatarUrl} />
                  <AvatarFallback className="text-[10px] font-bold bg-[#1CB0F6]/20 text-[#1CB0F6]">
                    {playerName.slice(0, 2).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <span className="text-xs font-bold text-white/80">{playerName}</span>
              </div>

              {/* Score + Timer */}
              <div className="flex items-center gap-3">
                <span className="text-4xl font-black text-white tabular-nums">{playerGoals}</span>
                <CircularTimer timeLeft={timeLeft} isUrgent={isUrgent} />
                <span className="text-4xl font-black text-white tabular-nums">{opponentGoals}</span>
              </div>

              {/* Opponent */}
              <div className="flex items-center gap-2.5">
                <span className="text-xs font-bold text-white/80">{opponentName}</span>
                <Avatar className="size-10 border-2 border-[#FF4B4B]">
                  <AvatarImage src={opponentAvatarUrl} />
                  <AvatarFallback className="text-[10px] font-bold bg-[#FF4B4B]/20 text-[#FF4B4B]">
                    {opponentName.slice(0, 2).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
              </div>
            </motion.div>

            {/* Half Time label */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.2 }}
              className="px-4 py-1 rounded-full bg-white/10 backdrop-blur-sm text-[10px] font-black uppercase tracking-[0.3em] text-white/60 mb-8"
            >
              Half Time
            </motion.div>

            {/* ── Tactic heading ── */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.3 }}
              className="text-white/60 text-xs uppercase tracking-[0.25em] font-bold mb-3"
            >
              Choose Your Tactic
            </motion.div>

            {/* One-time hint */}
            {showHint && (
              <motion.div
                initial={{ opacity: 0, y: -8 }}
                animate={{ opacity: 1, y: 0 }}
                className="mb-3 px-3 py-2 rounded-lg bg-blue-400/10 backdrop-blur-sm border border-blue-400/20 text-center"
              >
                <div className="text-[11px] text-blue-300/90 font-medium leading-relaxed">
                  Your tactic changes how fast you attack and how risky mistakes are.
                </div>
              </motion.div>
            )}

            {/* ── Floating Tactic Cards ── */}
            <div className="flex gap-3 w-full">
              {TACTICS.map((tactic, i) => {
                const isSelected = selected === tactic.id;
                return (
                  <motion.button
                    key={tactic.id}
                    initial={{ opacity: 0, y: 20, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    transition={{
                      type: 'spring',
                      stiffness: 300,
                      damping: 22,
                      delay: 0.2 + i * 0.07,
                    }}
                    onClick={() => setSelected(tactic.id)}
                    onMouseEnter={() => setHoveredTactic(tactic.id)}
                    onMouseLeave={() => setHoveredTactic(null)}
                    className={cn(
                      'relative flex-1 flex flex-col items-center gap-2.5 rounded-2xl px-4 py-5 transition-all duration-200 cursor-pointer',
                      'active:translate-y-[1px]',
                      isSelected
                        ? 'border-2 border-b-4 scale-[1.03]'
                        : 'border-2 border-b-4 opacity-65'
                    )}
                    style={{
                      backgroundColor: isSelected ? '#1B2F36' : '#151F24',
                      borderColor: isSelected ? `${tactic.color}` : '#2a3a42',
                      borderBottomColor: isSelected ? `${tactic.color}90` : '#1a2a30',
                      boxShadow: isSelected
                        ? `0 0 24px ${tactic.color}35, inset 0 1px 0 rgba(255,255,255,0.06)`
                        : 'inset 0 1px 0 rgba(255,255,255,0.04)',
                    }}
                  >
                    {/* Icon — chunky Duolingo-style badge */}
                    <div
                      className="size-14 rounded-2xl flex items-center justify-center border-b-4 transition-all duration-200"
                      style={{
                        backgroundColor: isSelected ? `${tactic.color}40` : `${tactic.color}25`,
                        borderBottomColor: isSelected ? `${tactic.color}70` : `${tactic.color}35`,
                      }}
                    >
                      <tactic.Icon
                        className="size-7"
                        style={{ color: isSelected ? tactic.color : `${tactic.color}CC` }}
                        strokeWidth={2.8}
                        fill={isSelected ? `${tactic.color}40` : `${tactic.color}15`}
                      />
                    </div>

                    {/* Name */}
                    <div
                      className={cn(
                        'text-[15px] font-black uppercase tracking-wide leading-tight',
                        isSelected ? 'text-white' : 'text-white/80'
                      )}
                    >
                      {tactic.name}
                    </div>

                    {/* Emotional description */}
                    <div className={cn(
                      'text-[12px] font-semibold leading-relaxed text-center',
                      isSelected ? 'text-white/70' : 'text-white/50'
                    )}>
                      {tactic.description}
                    </div>

                    {/* "What changes" — only on selected card */}
                    <AnimatePresence>
                      {isSelected && (
                        <motion.div
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: 'auto' }}
                          exit={{ opacity: 0, height: 0 }}
                          transition={{ duration: 0.2 }}
                          className="w-full overflow-hidden"
                        >
                          <div
                            className="text-[10px] font-bold text-center py-1.5 px-2.5 mt-1.5 rounded-lg"
                            style={{
                              color: tactic.color,
                              backgroundColor: `${tactic.color}18`,
                            }}
                          >
                            → {tactic.whatChanges}
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>

                    {/* Info tooltip trigger */}
                    <div className="absolute top-1.5 right-1.5">
                      <div
                        className="relative"
                        onClick={(e) => {
                          e.stopPropagation();
                          setHoveredTactic(hoveredTactic === tactic.id ? null : tactic.id);
                        }}
                      >
                        <Info
                          className="size-3.5 opacity-30 hover:opacity-60 transition-opacity cursor-pointer"
                          style={{ color: isSelected ? tactic.color : '#56707A' }}
                          strokeWidth={2}
                        />
                        {hoveredTactic === tactic.id && (
                          <motion.div
                            initial={{ opacity: 0, y: -4 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="absolute top-5 right-0 w-44 p-2 rounded-lg bg-black/90 backdrop-blur-sm border border-white/15 shadow-xl z-50"
                          >
                            <div className="text-[10px] text-white/90 leading-relaxed">
                              {tactic.tooltip}
                            </div>
                          </motion.div>
                        )}
                      </div>
                    </div>
                  </motion.button>
                );
              })}
            </div>

            {/* Confirm / Waiting button */}
            {!myReady ? (
              <motion.button
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.5 }}
                onClick={() => {
                  if (timerRef.current) clearInterval(timerRef.current);
                  if (!hasFiredRef.current) {
                    hasFiredRef.current = true;
                    onSelectTactic(selected);
                  }
                }}
                className="mt-3 px-10 py-3.5 rounded-xl font-black text-[15px] uppercase tracking-wider text-white bg-[#58CC02] border-2 border-[#58CC02] border-b-4 border-b-[#46a302] hover:bg-[#4ebc02] active:translate-y-[2px] active:border-b-2 transition-all shadow-[0_0_20px_rgba(88,204,2,0.2)]"
              >
                Ready ✓
              </motion.button>
            ) : (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="mt-3 flex flex-col items-center gap-2"
              >
                <div className="px-10 py-3.5 rounded-xl font-black text-[15px] uppercase tracking-wider text-white/50 bg-white/10 border-2 border-white/15 border-b-4 border-b-white/10 cursor-default">
                  ✓ Ready
                </div>
                {!opponentReady && (
                  <motion.div
                    animate={{ opacity: [0.5, 1, 0.5] }}
                    transition={{ duration: 1.5, repeat: Infinity, ease: 'easeInOut' }}
                    className="text-[11px] font-bold text-white/40 uppercase tracking-widest"
                  >
                    Waiting for opponent…
                  </motion.div>
                )}
              </motion.div>
            )}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
