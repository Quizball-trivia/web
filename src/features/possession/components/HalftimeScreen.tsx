'use client';

import { useEffect, useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { cn } from '@/lib/utils';
import { PitchVisualization } from './PitchVisualization';
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
  deadlineAt?: string | null;
  categoryOptions?: DraftCategory[];
  mySeat?: 1 | 2 | null;
  firstBanSeat?: 1 | 2 | null;
  myBan?: string | null;
  opponentBan?: string | null;
  onBanCategory?: (categoryId: string) => void;
}

const FALLBACK_HALFTIME_SECONDS = 20;

// Dark-tinted category card colors — mirrored from RankedCategoryBlockingScreen
// so the halftime ban cards match the pre-match draft card design.
const CARD_COLORS = [
  { bg: '#162A3A', dark: '#1CB0F6' },  // blue
  { bg: '#2A2118', dark: '#FF9600' },  // orange
  { bg: '#241A2E', dark: '#CE82FF' },  // purple
  { bg: '#1A2A18', dark: '#58CC02' },  // green
  { bg: '#2A1A1A', dark: '#FF4B4B' },  // red
  { bg: '#2A2618', dark: '#FFC800' },  // gold
];

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
  deadlineAt = null,
  categoryOptions = [],
  mySeat = null,
  firstBanSeat = null,
  myBan = null,
  opponentBan = null,
  onBanCategory,
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
          <div className="relative z-10 w-full max-w-md sm:max-w-lg lg:max-w-2xl flex flex-col items-center font-fun px-4 sm:px-6 pt-8 sm:pt-12">

            {/* Half Time badge */}
            <motion.div
              initial={{ scale: 0.7, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ type: 'spring', stiffness: 350, damping: 22 }}
              className="mb-4 sm:mb-6"
            >
              <div
                className="px-6 py-2 rounded-2xl border-2 border-b-4 border-[#FF9600] border-b-[#CC7800] bg-[#FF9600]/15"
              >
                <span className="text-sm sm:text-base font-black uppercase tracking-[0.3em] text-[#FF9600]">
                  Half Time
                </span>
              </div>
            </motion.div>

            {/* Score card */}
            <motion.div
              initial={{ y: -20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ type: 'spring', stiffness: 250, damping: 22, delay: 0.1 }}
              className="w-full bg-[#1B2F36] rounded-2xl border-2 border-b-4 border-[#2a3a42] border-b-[#1a2a30] p-4 sm:p-6 mb-5 sm:mb-8"
            >
              <div className="flex items-center justify-between">
                {/* Player */}
                <div className="flex flex-col items-center gap-2 flex-1">
                  <Avatar className="size-14 sm:size-16 border-[3px] border-[#1CB0F6] shadow-[0_0_20px_rgba(28,176,246,0.3)]">
                    <AvatarImage src={playerAvatarUrl} />
                    <AvatarFallback className="text-xs font-bold bg-[#1CB0F6]/20 text-[#1CB0F6]">
                      {playerName.slice(0, 2).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <span className="text-xs sm:text-sm font-bold text-white/80 truncate max-w-[90px] sm:max-w-[120px]">{playerName}</span>
                </div>

                {/* Score + Timer */}
                <div className="flex flex-col items-center gap-2 px-3 sm:px-6">
                  <div className="flex items-center gap-3 sm:gap-5">
                    <span className="text-5xl sm:text-6xl font-black text-white tabular-nums leading-none">{playerGoals}</span>
                    <span className="text-2xl sm:text-3xl font-black text-white/25">:</span>
                    <span className="text-5xl sm:text-6xl font-black text-white tabular-nums leading-none">{opponentGoals}</span>
                  </div>
                  <CircularTimer timeLeft={timeLeft} totalDuration={totalDuration} isUrgent={isUrgent} />
                </div>

                {/* Opponent */}
                <div className="flex flex-col items-center gap-2 flex-1">
                  <Avatar className="size-14 sm:size-16 border-[3px] border-[#FF4B4B] shadow-[0_0_20px_rgba(255,75,75,0.3)]">
                    <AvatarImage src={opponentAvatarUrl} />
                    <AvatarFallback className="text-xs font-bold bg-[#FF4B4B]/20 text-[#FF4B4B]">
                      {opponentName.slice(0, 2).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <span className="text-xs sm:text-sm font-bold text-white/80 truncate max-w-[90px] sm:max-w-[120px]">{opponentName}</span>
                </div>
              </div>
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

                  {/* Category / tactic cards — matches pre-match draft card design */}
                  <div className="grid grid-cols-3 gap-2.5 sm:gap-5 w-full">
                    {categoryOptions.map((category, index) => {
                      const isMyBan = myBan === category.id;
                      const isOpponentBan = opponentBan === category.id;
                      const isBanned = isMyBan || isOpponentBan;
                      const isRemaining = bothBansSubmitted && !isMyBan && !isOpponentBan && remainingCategory?.id === category.id;
                      const disabled = isBanned || !canBan;

                      const accentDark = isMyBan
                        ? '#1a8ac4'
                        : isOpponentBan
                          ? '#c93a3a'
                          : isRemaining
                            ? '#46a302'
                            : CARD_COLORS[index % CARD_COLORS.length].dark;

                      return (
                        <motion.button
                          key={category.id}
                          initial={{ opacity: 0, y: 24, scale: 0.95 }}
                          animate={{ opacity: 1, y: 0, scale: 1 }}
                          transition={{ type: 'spring', stiffness: 300, damping: 22, delay: 0.15 + index * 0.08 }}
                          disabled={disabled}
                          onClick={() => onBanCategory?.(category.id)}
                          className={cn(
                            'group relative w-full rounded-2xl sm:rounded-3xl overflow-hidden transition-all duration-200 text-left',
                            !disabled && 'cursor-pointer active:scale-[0.95] active:translate-y-[2px]',
                            disabled && 'cursor-default',
                            !canBan && !isBanned && !isRemaining && 'opacity-60',
                          )}
                        >
                          {/* Artwork area */}
                          <div
                            className="aspect-square sm:aspect-[4/5] relative overflow-hidden"
                            style={{ backgroundColor: category.imageUrl ? '#15242D' : (isBanned ? '#243B44' : CARD_COLORS[index % CARD_COLORS.length].bg) }}
                          >
                            {category.imageUrl ? (
                              <>
                                <div
                                  className={cn(
                                    'absolute inset-0 bg-cover bg-center transition-transform duration-500',
                                    !disabled && 'group-hover:scale-105',
                                    isBanned && 'grayscale'
                                  )}
                                  style={{ backgroundImage: `url("${category.imageUrl}")` }}
                                />
                                <div className={cn(
                                  'absolute inset-0 bg-gradient-to-b from-black/10 via-black/15 to-black/70',
                                  isBanned && 'bg-black/55'
                                )} />
                              </>
                            ) : (
                              <div className="absolute inset-0 flex items-center justify-center">
                                <span className={cn(
                                  'text-8xl transition-all duration-300 drop-shadow-lg',
                                  isBanned && 'grayscale opacity-40 scale-90'
                                )}>
                                  {category.icon || '⚽'}
                                </span>
                              </div>
                            )}

                            {/* BANNED stamp overlay */}
                            <AnimatePresence>
                              {isBanned && (
                                <motion.div
                                  initial={{ opacity: 0 }}
                                  animate={{ opacity: 1 }}
                                  className="absolute inset-0 bg-black/40 flex items-center justify-center"
                                >
                                  <motion.div
                                    initial={{ scale: 0, rotate: -30 }}
                                    animate={{ scale: 1, rotate: -12 }}
                                    transition={{ type: 'spring', stiffness: 400, damping: 14 }}
                                    className="bg-[#FF4B4B] px-3 py-1.5 sm:px-5 sm:py-2.5 rounded-xl sm:rounded-2xl border-b-4 border-[#CC3E3E] shadow-lg"
                                  >
                                    <span className="text-xs sm:text-base font-black text-white uppercase tracking-wide">BANNED</span>
                                  </motion.div>
                                </motion.div>
                              )}
                            </AnimatePresence>

                            {isRemaining && (
                              <motion.div
                                initial={{ scale: 0 }}
                                animate={{ scale: 1 }}
                                transition={{ type: 'spring', stiffness: 400, damping: 20 }}
                                className="absolute top-2 right-2 size-7 rounded-full flex items-center justify-center bg-[#58CC02] text-white shadow-lg"
                              >
                                <svg className="size-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round"><path d="M20 6 9 17l-5-5" /></svg>
                              </motion.div>
                            )}
                          </div>

                          {/* Info area — dark bottom with thick 3D border */}
                          <div
                            className="p-2.5 sm:p-4 bg-[#1B2F36]"
                            style={{ borderBottom: `5px solid ${isBanned ? '#1B2F36' : accentDark}` }}
                          >
                            <h3 className="text-xs sm:text-base font-black text-white leading-tight truncate">{category.name}</h3>
                          </div>
                        </motion.button>
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
