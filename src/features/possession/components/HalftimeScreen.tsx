'use client';

import { useEffect, useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { cn } from '@/lib/utils';
import { PitchVisualization } from './PitchVisualization';
import type { DraftCategory } from '@/lib/realtime/socket.types';
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
  deadlineAt?: string | null;
  categoryOptions?: DraftCategory[];
  myBan?: string | null;
  opponentBan?: string | null;
  onBanCategory?: (categoryId: string) => void;
  myReady?: boolean;
  opponentReady?: boolean;
  onSelectTactic?: (tactic: TacticalCard) => void;
}

const FALLBACK_HALFTIME_SECONDS = 15;
const LEGACY_TACTIC_OPTIONS: DraftCategory[] = [
  { id: 'press-high', name: 'Press High', icon: null },
  { id: 'play-safe', name: 'Play Safe', icon: null },
  { id: 'all-in', name: 'All In', icon: null },
];

function CircularTimer({ timeLeft, totalDuration, isUrgent }: { timeLeft: number; totalDuration: number; isUrgent: boolean }) {
  const radius = 22;
  const circumference = 2 * Math.PI * radius;
  const progress = Math.max(0, Math.min(1, timeLeft / totalDuration));
  const offset = circumference * (1 - progress);

  return (
    <motion.div
      animate={isUrgent ? { scale: [1, 1.08, 1] } : { scale: 1 }}
      transition={isUrgent ? { repeat: Infinity, duration: 0.6 } : undefined}
      className="relative flex items-center justify-center"
    >
      <svg width="56" height="56" className="-rotate-90">
        <circle cx="28" cy="28" r={radius} fill="none" stroke="rgba(255,255,255,0.14)" strokeWidth="4" />
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
          transition={{ duration: 0.3, ease: 'easeOut' }}
        />
      </svg>
      <span className={cn('absolute text-sm font-black tabular-nums font-fun', isUrgent ? 'text-red-400' : 'text-white')}>
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
  deadlineAt = null,
  categoryOptions = [],
  myBan = null,
  opponentBan = null,
  onBanCategory,
  myReady,
  opponentReady,
  onSelectTactic,
}: HalftimeScreenProps) {
  const [nowMs, setNowMs] = useState(() => Date.now());

  useEffect(() => {
    if (!visible) return;
    const timer = setInterval(() => setNowMs(Date.now()), 200);
    return () => clearInterval(timer);
  }, [visible]);

  // Compute total duration once from the initial deadline so the progress ring
  // reflects the actual server-configured halftime length, not a hardcoded value.
  const totalDuration = useMemo(() => {
    if (!deadlineAt) return FALLBACK_HALFTIME_SECONDS;
    const deadlineMs = new Date(deadlineAt).getTime();
    if (!Number.isFinite(deadlineMs)) return FALLBACK_HALFTIME_SECONDS;
    const durationSec = Math.ceil((deadlineMs - Date.now()) / 1000);
    return Math.max(1, durationSec);
  // eslint-disable-next-line react-hooks/exhaustive-deps -- only compute once when deadlineAt first arrives
  }, [deadlineAt]);

  const timeLeft = useMemo(() => {
    if (!deadlineAt) return FALLBACK_HALFTIME_SECONDS;
    const deadlineMs = new Date(deadlineAt).getTime();
    if (!Number.isFinite(deadlineMs)) return FALLBACK_HALFTIME_SECONDS;
    return Math.max(0, Math.ceil((deadlineMs - nowMs) / 1000));
  }, [deadlineAt, nowMs]);

  const isLegacyTacticMode = typeof onSelectTactic === 'function';
  const resolvedOptions = useMemo(
    () => (isLegacyTacticMode ? LEGACY_TACTIC_OPTIONS : categoryOptions),
    [categoryOptions, isLegacyTacticMode]
  );
  const resolvedMyBan = isLegacyTacticMode ? (myReady ? 'locked' : null) : myBan;
  const resolvedOpponentBan = isLegacyTacticMode ? (opponentReady ? 'locked' : null) : opponentBan;
  const isUrgent = timeLeft <= 5;
  const bannedIds = useMemo(
    () => new Set([resolvedMyBan, resolvedOpponentBan].filter((id): id is string => Boolean(id) && id !== 'locked')),
    [resolvedMyBan, resolvedOpponentBan]
  );
  const remainingCategory = useMemo(
    () => resolvedOptions.find((category) => !bannedIds.has(category.id)) ?? null,
    [resolvedOptions, bannedIds]
  );

  const canBan = isLegacyTacticMode ? !myReady : !myBan;

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex flex-col items-center overflow-hidden"
        >
          <div className="absolute inset-0">
            <div className="absolute inset-0 flex items-center justify-center blur-[2px] scale-[1.02]">
              <div className="w-full max-w-lg">
                <PitchVisualization
                  playerPosition={playerPosition}
                  playerAvatarUrl={playerAvatarUrl}
                  opponentAvatarUrl={opponentAvatarUrl}
                  playerName={playerName}
                  opponentName={opponentName}
                  myMomentum={0}
                />
              </div>
            </div>
            <div className="absolute inset-0 bg-black/55" />
            <div
              className="absolute inset-0"
              style={{ background: 'radial-gradient(ellipse at center, transparent 40%, rgba(0,0,0,0.5) 100%)' }}
            />
          </div>

          <div className="relative z-10 w-full max-w-lg lg:max-w-3xl flex flex-col items-center font-fun pt-8 px-4">
            <motion.div
              initial={{ y: -30, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ type: 'spring', stiffness: 200, damping: 22 }}
              className="flex items-center gap-4 bg-black/50 backdrop-blur-md rounded-2xl px-5 py-3 border border-white/10 mb-3"
            >
              <div className="flex items-center gap-2.5">
                <Avatar className="size-10 border-2 border-[#1CB0F6]">
                  <AvatarImage src={playerAvatarUrl} />
                  <AvatarFallback className="text-[10px] font-bold bg-[#1CB0F6]/20 text-[#1CB0F6]">
                    {playerName.slice(0, 2).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <span className="text-xs font-bold text-white/80">{playerName}</span>
              </div>

              <div className="flex items-center gap-3">
                <span className="text-4xl font-black text-white tabular-nums">{playerGoals}</span>
                <CircularTimer timeLeft={timeLeft} totalDuration={totalDuration} isUrgent={isUrgent} />
                <span className="text-4xl font-black text-white tabular-nums">{opponentGoals}</span>
              </div>

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

            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.15 }}
              className="px-4 py-1 rounded-full bg-white/10 backdrop-blur-sm text-[10px] font-black uppercase tracking-[0.3em] text-white/60 mb-8"
            >
              Half Time
            </motion.div>

            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.2 }}
              className="text-white/60 text-xs uppercase tracking-[0.25em] font-bold mb-3"
            >
              {isLegacyTacticMode ? 'Pick Your Tactic' : 'Ban 1 Category Each'}
            </motion.div>

            <div className="flex gap-3 w-full">
              {resolvedOptions.map((category, index) => {
                const isMyBan = resolvedMyBan === category.id;
                const isOpponentBan = resolvedOpponentBan === category.id;
                const isRemaining = !isMyBan && !isOpponentBan && remainingCategory?.id === category.id;
                const disabled = isMyBan || isOpponentBan || !canBan;

                return (
                  <motion.button
                    key={category.id}
                    initial={{ opacity: 0, y: 20, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    transition={{ type: 'spring', stiffness: 300, damping: 22, delay: 0.2 + index * 0.06 }}
                    disabled={disabled}
                    onClick={() => {
                      if (isLegacyTacticMode) {
                        onSelectTactic?.(category.id as TacticalCard);
                        return;
                      }
                      onBanCategory?.(category.id);
                    }}
                    className={cn(
                      'relative flex-1 flex flex-col items-center gap-2.5 rounded-2xl px-4 py-5 border-2 border-b-4 transition-all duration-200',
                      disabled ? 'cursor-default opacity-85' : 'cursor-pointer hover:scale-[1.02] active:translate-y-[1px]'
                    )}
                    style={{
                      backgroundColor: isRemaining ? '#1f3324' : '#151F24',
                      borderColor: isMyBan ? '#1CB0F6' : isOpponentBan ? '#FF4B4B' : isRemaining ? '#58CC02' : '#2a3a42',
                      borderBottomColor: isMyBan
                        ? '#1a8ac4'
                        : isOpponentBan
                          ? '#c93a3a'
                          : isRemaining
                            ? '#46a302'
                            : '#1a2a30',
                    }}
                  >
                    <div className="text-[12px] font-black text-white/90 text-center leading-snug uppercase tracking-wide">
                      {category.name}
                    </div>
                    <div className="text-[10px] font-bold text-white/50 uppercase tracking-widest">
                      {isLegacyTacticMode
                        ? (canBan ? 'Tap To Lock' : 'Locked')
                        : (isMyBan ? 'Your Ban' : isOpponentBan ? 'Opponent Ban' : isRemaining ? 'Half 2 Category' : canBan ? 'Tap To Ban' : 'Pending')}
                    </div>
                  </motion.button>
                );
              })}
            </div>

            <div className="mt-4 text-[11px] font-bold uppercase tracking-widest text-white/70 text-center">
              {!isLegacyTacticMode && myBan
                ? opponentBan
                  ? `Half 2 category: ${remainingCategory?.name ?? 'Deciding...'}`
                  : 'Waiting for opponent ban...'
                : isLegacyTacticMode
                  ? (myReady ? (opponentReady ? 'Both players locked in' : 'Waiting for opponent...') : 'Choose one tactic')
                  : 'Choose one category to ban'}
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
