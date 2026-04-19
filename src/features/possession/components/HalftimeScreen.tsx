'use client';

import { useEffect, useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '@/lib/utils';
import { PitchVisualization } from './PitchVisualization';
import { BanCategoryCard } from '@/components/shared/BanCategoryCard';
import { AvatarDisplay } from '@/components/AvatarDisplay';
import type { DraftCategory } from '@/lib/realtime/socket.types';

interface HalftimeScreenProps {
  visible: boolean;
  playerGoals: number;
  opponentGoals: number;
  playerName: string;
  opponentName: string;
  playerAvatarUrl: string;
  opponentAvatarUrl: string;
  playerPosition: number;
  /** ISO-country code (e.g. "ge", "us") — renders a flag badge on the avatar. */
  playerCountryCode?: string | null;
  opponentCountryCode?: string | null;
  deadlineAt?: string | null;
  categoryOptions?: DraftCategory[];
  mySeat?: 1 | 2 | null;
  firstBanSeat?: 1 | 2 | null;
  myBan?: string | null;
  opponentBan?: string | null;
  onBanCategory?: (categoryId: string) => void;
  onBanPhaseShown?: () => void;
}

const FALLBACK_HALFTIME_SECONDS = 20;

function CircularTimer({ timeLeft, totalDuration, isUrgent }: { timeLeft: number; totalDuration: number; isUrgent: boolean }) {
  const radius = 26;
  const circumference = 2 * Math.PI * radius;
  const progress = Math.max(0, Math.min(1, timeLeft / totalDuration));
  const offset = circumference * (1 - progress);

  return (
    <motion.div
      animate={isUrgent ? { scale: [1, 1.08, 1] } : { scale: 1 }}
      transition={isUrgent ? { repeat: Infinity, duration: 0.6 } : undefined}
      className="relative flex items-center justify-center"
    >
      <svg width="68" height="68" className="-rotate-90">
        <circle cx="34" cy="34" r={radius} fill="none" stroke="rgba(255,255,255,0.1)" strokeWidth="5" />
        <motion.circle
          cx="34"
          cy="34"
          r={radius}
          fill="none"
          stroke={isUrgent ? '#FF4B4B' : '#58CC02'}
          strokeWidth="5"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          transition={{ duration: 0.3, ease: 'easeOut' }}
        />
      </svg>
      <span className={cn(
        'absolute text-lg font-black tabular-nums font-fun',
        isUrgent ? 'text-red-400' : 'text-white'
      )}>
        {timeLeft}
      </span>
    </motion.div>
  );
}

const HALFTIME_INTRO_MS = 3000; // Show score for 3s before revealing ban cards

export function HalftimeScreen({
  visible,
  playerGoals,
  opponentGoals,
  playerName,
  opponentName,
  playerAvatarUrl,
  opponentAvatarUrl,
  playerPosition,
  playerCountryCode = null,
  opponentCountryCode = null,
  deadlineAt = null,
  categoryOptions = [],
  mySeat = null,
  firstBanSeat = null,
  myBan = null,
  opponentBan = null,
  onBanCategory,
  onBanPhaseShown,
}: HalftimeScreenProps) {
  const [nowMs, setNowMs] = useState(() => Date.now());
  const [showBanPhase, setShowBanPhase] = useState(false);

  // Delay showing the ban cards so the score sinks in first
  useEffect(() => {
    if (!visible) {
      setShowBanPhase(false);
      return;
    }
    const timer = setTimeout(() => setShowBanPhase(true), HALFTIME_INTRO_MS);
    return () => clearTimeout(timer);
  }, [visible]);

  useEffect(() => {
    if (!visible || !showBanPhase) return;
    onBanPhaseShown?.();
  }, [visible, showBanPhase, onBanPhaseShown]);

  useEffect(() => {
    if (!visible || !deadlineAt) return;
    const timer = setInterval(() => {
      const remaining = new Date(deadlineAt).getTime() - Date.now();
      setNowMs(Date.now());
      if (remaining <= 0) clearInterval(timer);
    }, 200);
    return () => clearInterval(timer);
  }, [visible, deadlineAt]);

  // Parse deadline once — only changes when a new halftime starts
  const deadlineMs = useMemo(() => {
    if (!deadlineAt) return null;
    const ms = new Date(deadlineAt).getTime();
    return Number.isFinite(ms) ? ms : null;
  }, [deadlineAt]);

  const totalDuration = useMemo(() => {
    if (!deadlineMs) return FALLBACK_HALFTIME_SECONDS;
    const durationSec = Math.ceil((deadlineMs - nowMs) / 1000);
    return Math.max(1, durationSec);
    // Freeze the ring duration when a new halftime deadline arrives.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [deadlineMs]);

  const timeLeft = useMemo(() => {
    if (!deadlineMs) return FALLBACK_HALFTIME_SECONDS;
    return Math.max(0, Math.ceil((deadlineMs - nowMs) / 1000));
  }, [deadlineMs, nowMs]);

  const isUrgent = timeLeft <= 5;
  const bannedIds = useMemo(
    () => new Set([myBan, opponentBan].filter((id): id is string => Boolean(id))),
    [myBan, opponentBan]
  );
  const bothBansSubmitted = Boolean(myBan && opponentBan);
  const remainingCategory = useMemo(
    () => (bothBansSubmitted
      ? (categoryOptions.find((category) => !bannedIds.has(category.id)) ?? null)
      : null),
    [bothBansSubmitted, categoryOptions, bannedIds]
  );

  const myTurn = mySeat === (firstBanSeat ?? 2)
    ? !myBan
    : mySeat === 1 || mySeat === 2
      ? Boolean(opponentBan && !myBan)
      : false;
  const canBan = myTurn;

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex flex-col items-center overflow-hidden"
        >
          {/* Background: blurred pitch + overlays */}
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
            <div className="absolute inset-0 bg-[#0f1420]/80" />
            <div
              className="absolute inset-0"
              style={{ background: 'radial-gradient(ellipse at center, transparent 20%, rgba(0,0,0,0.6) 100%)' }}
            />
          </div>

          {/* Content */}
          <div className="relative z-10 w-full max-w-md sm:max-w-lg lg:max-w-2xl flex flex-col items-center font-poppins px-4 sm:px-6 pt-6 sm:pt-10">

            {/* Half Time label — flat, no 3D border */}
            <motion.div
              initial={{ y: -10, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ duration: 0.3 }}
              className="mb-4 sm:mb-5"
            >
              <span
                className="text-xs sm:text-sm font-black uppercase tracking-[0.35em] text-[#FF9600]"
                style={{ fontFamily: "'Poppins', sans-serif", fontWeight: 600, letterSpacing: '0.35em' }}
              >
                Half Time
              </span>
            </motion.div>

            {/* Compact score row — flat, no surrounding card
                (avatars w/ flags | score | avatars w/ flags, timer below) */}
            <motion.div
              initial={{ y: -10, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ type: 'spring', stiffness: 250, damping: 22, delay: 0.08 }}
              className="w-full flex flex-col items-center gap-3 mb-6 sm:mb-8"
            >
              <div className="flex items-center justify-center gap-4 sm:gap-6 w-full">
                {/* Player */}
                <div className="flex flex-col items-center gap-1.5 min-w-0 flex-1">
                  <AvatarDisplay
                    customization={{ base: playerAvatarUrl }}
                    size="sm"
                    countryCode={playerCountryCode}
                    className="ring-[3px] ring-[#1CB0F6]"
                  />
                  <span className="text-xs font-black text-white truncate max-w-[120px]">
                    {playerName}
                  </span>
                </div>

                {/* Score */}
                <div className="flex items-center gap-2 sm:gap-3 shrink-0">
                  <span className="text-4xl sm:text-5xl font-black text-white tabular-nums leading-none">
                    {playerGoals}
                  </span>
                  <span className="text-2xl sm:text-3xl font-black text-white/30">:</span>
                  <span className="text-4xl sm:text-5xl font-black text-white tabular-nums leading-none">
                    {opponentGoals}
                  </span>
                </div>

                {/* Opponent */}
                <div className="flex flex-col items-center gap-1.5 min-w-0 flex-1">
                  <AvatarDisplay
                    customization={{ base: opponentAvatarUrl }}
                    size="sm"
                    countryCode={opponentCountryCode}
                    className="ring-[3px] ring-[#FF4B4B]"
                  />
                  <span className="text-xs font-black text-white truncate max-w-[120px]">
                    {opponentName}
                  </span>
                </div>
              </div>

              {/* Timer */}
              <CircularTimer timeLeft={timeLeft} totalDuration={totalDuration} isUrgent={isUrgent} />
            </motion.div>

            {/* Ban phase — slides in after intro delay */}
            <AnimatePresence>
              {showBanPhase && (
                <motion.div
                  initial={{ opacity: 0, y: 30 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ type: 'spring', stiffness: 280, damping: 24 }}
                  className="w-full flex flex-col items-center"
                >
                  {/* Section title */}
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.1 }}
                    className="text-[10px] sm:text-xs font-bold uppercase tracking-[0.25em] text-[#56707A] mb-3 sm:mb-4"
                  >
                    Ban 1 Category Each
                  </motion.div>

                  {/* Category cards — shared BanCategoryCard mirrors /play style */}
                  <div className="grid grid-cols-3 gap-3 sm:gap-5 w-full">
                    {categoryOptions.map((category, index) => {
                      const isMyBan = myBan === category.id;
                      const isOpponentBan = opponentBan === category.id;
                      const isBanned = isMyBan || isOpponentBan;
                      const isRemaining = bothBansSubmitted && !isMyBan && !isOpponentBan && remainingCategory?.id === category.id;
                      const disabled = isBanned || !canBan;

                      return (
                        <BanCategoryCard
                          key={category.id}
                          category={category}
                          colorIndex={index}
                          animationIndex={index}
                          isBanned={isBanned}
                          isRemaining={isRemaining}
                          disabled={disabled}
                          onClick={() => onBanCategory?.(category.id)}
                        />
                      );
                    })}
                  </div>

                  {/* Status text */}
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.3 }}
                    className="mt-4 sm:mt-6 text-xs sm:text-sm font-bold uppercase tracking-widest text-white/50 text-center"
                  >
                    {bothBansSubmitted
                      ? `2nd half category: ${remainingCategory?.name ?? 'Deciding...'}`
                      : myBan
                        ? 'Waiting for opponent ban...'
                        : !canBan
                          ? 'Opponent is choosing a ban...'
                          : 'Choose one category to ban'}
                  </motion.div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
