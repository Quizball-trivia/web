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
  mySeat?: 1 | 2 | null;
  firstBanSeat?: 1 | 2 | null;
  myBan?: string | null;
  opponentBan?: string | null;
  onBanCategory?: (categoryId: string) => void;
  myReady?: boolean;
  opponentReady?: boolean;
  onSelectTactic?: (tactic: TacticalCard) => void;
}

const FALLBACK_HALFTIME_SECONDS = 20;
const LEGACY_TACTIC_OPTIONS: DraftCategory[] = [
  { id: 'press-high', name: 'Press High', icon: null },
  { id: 'play-safe', name: 'Play Safe', icon: null },
  { id: 'all-in', name: 'All In', icon: null },
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
  myReady,
  opponentReady,
  onSelectTactic,
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
    if (!visible) return;
    const timer = setInterval(() => setNowMs(Date.now()), 200);
    return () => clearInterval(timer);
  }, [visible]);

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
  const bothBansSubmitted = isLegacyTacticMode
    ? Boolean(myReady && opponentReady)
    : Boolean(myBan && opponentBan);
  const remainingCategory = useMemo(
    () => (bothBansSubmitted
      ? (resolvedOptions.find((category) => !bannedIds.has(category.id)) ?? null)
      : null),
    [bothBansSubmitted, resolvedOptions, bannedIds]
  );

  const myTurn = isLegacyTacticMode
    ? !myReady
    : mySeat === (firstBanSeat ?? 2)
      ? !resolvedMyBan
      : mySeat === 1 || mySeat === 2
        ? Boolean(resolvedOpponentBan && !resolvedMyBan)
        : false;
  const canBan = isLegacyTacticMode ? !myReady : myTurn;

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
                    {isLegacyTacticMode ? 'Pick Your Tactic' : 'Ban 1 Category Each'}
                  </motion.div>

                  {/* Category / tactic cards */}
                  <div className="flex flex-col sm:flex-row gap-3 w-full">
                    {resolvedOptions.map((category, index) => {
                      const isMyBan = resolvedMyBan === category.id;
                      const isOpponentBan = resolvedOpponentBan === category.id;
                      const isRemaining = bothBansSubmitted && !isMyBan && !isOpponentBan && remainingCategory?.id === category.id;
                      const disabled = isMyBan || isOpponentBan || !canBan;

                      const borderColor = isMyBan
                        ? '#1CB0F6'
                        : isOpponentBan
                          ? '#FF4B4B'
                          : isRemaining
                            ? '#58CC02'
                            : '#2a3a42';
                      const borderBottomColor = isMyBan
                        ? '#1a8ac4'
                        : isOpponentBan
                          ? '#c93a3a'
                          : isRemaining
                            ? '#46a302'
                            : '#1a2a30';
                      const bgColor = isRemaining ? '#1f3324' : '#1B2F36';

                      return (
                        <motion.button
                          key={category.id}
                          initial={{ opacity: 0, y: 24, scale: 0.95 }}
                          animate={{ opacity: 1, y: 0, scale: 1 }}
                          transition={{ type: 'spring', stiffness: 300, damping: 22, delay: 0.15 + index * 0.08 }}
                          disabled={disabled}
                          onClick={() => {
                            if (isLegacyTacticMode) {
                              onSelectTactic?.(category.id as TacticalCard);
                              return;
                            }
                            onBanCategory?.(category.id);
                          }}
                          className={cn(
                            'relative flex-1 flex flex-col items-center gap-2 rounded-2xl px-4 py-5 sm:py-6 border-2 border-b-4 transition-all duration-200 min-h-[80px] sm:min-h-[100px]',
                            disabled ? 'cursor-default' : 'cursor-pointer hover:scale-[1.03] active:translate-y-[2px] active:border-b-2'
                          )}
                          style={{
                            backgroundColor: bgColor,
                            borderColor,
                            borderBottomColor,
                            opacity: (isMyBan || isOpponentBan) ? 0.75 : 1,
                          }}
                        >
                          {/* Status icon */}
                          {(isMyBan || isOpponentBan) && (
                            <motion.div
                              initial={{ scale: 0 }}
                              animate={{ scale: 1 }}
                              transition={{ type: 'spring', stiffness: 400, damping: 20 }}
                              className={cn(
                                'absolute -top-2 -right-2 size-7 rounded-full flex items-center justify-center text-xs font-black',
                                isMyBan ? 'bg-[#1CB0F6] text-white' : 'bg-[#FF4B4B] text-white'
                              )}
                            >
                              <svg className="size-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round"><path d="M18 6 6 18" /><path d="m6 6 12 12" /></svg>
                            </motion.div>
                          )}

                          {isRemaining && (
                            <motion.div
                              initial={{ scale: 0 }}
                              animate={{ scale: 1 }}
                              transition={{ type: 'spring', stiffness: 400, damping: 20 }}
                              className="absolute -top-2 -right-2 size-7 rounded-full flex items-center justify-center bg-[#58CC02] text-white"
                            >
                              <svg className="size-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round"><path d="M20 6 9 17l-5-5" /></svg>
                            </motion.div>
                          )}

                          <div className="text-sm sm:text-base font-black text-white/90 text-center leading-snug uppercase tracking-wide">
                            {category.name}
                          </div>
                          <div className={cn(
                            'text-[10px] sm:text-xs font-bold uppercase tracking-widest',
                            isMyBan ? 'text-[#1CB0F6]'
                              : isOpponentBan ? 'text-[#FF4B4B]'
                                : isRemaining ? 'text-[#58CC02]'
                                  : 'text-white/40'
                          )}>
                            {isLegacyTacticMode
                              ? (canBan ? 'Tap To Lock' : 'Locked')
                              : (isMyBan
                                ? 'Your Ban'
                                : isOpponentBan
                                  ? 'Their Ban'
                                  : isRemaining
                                    ? '2nd Half'
                                    : canBan
                                      ? 'Tap To Ban'
                                      : 'Opponent Turn')}
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
                    {!isLegacyTacticMode && bothBansSubmitted
                      ? `2nd half category: ${remainingCategory?.name ?? 'Deciding...'}`
                      : !isLegacyTacticMode && myBan
                        ? 'Waiting for opponent ban...'
                        : !isLegacyTacticMode && !canBan
                          ? 'Opponent is choosing a ban...'
                          : !isLegacyTacticMode
                            ? 'Choose one category to ban'
                      : isLegacyTacticMode
                        ? (myReady ? (opponentReady ? 'Both players locked in' : 'Waiting for opponent...') : 'Choose one tactic')
                        : ''}
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
