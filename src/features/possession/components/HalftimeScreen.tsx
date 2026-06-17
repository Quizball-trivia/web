'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { motion } from 'motion/react';
import { cn } from '@/lib/utils';
import { PitchVisualization } from './PitchVisualization';
import { BanCategoryCard } from '@/components/shared/BanCategoryCard';
import { TierFrameAvatar } from '@/components/TierFrameAvatar';
import { tierFromRp } from '@/utils/rankedTier';
import { useLocale } from '@/contexts/LocaleContext';
import { getI18nText } from '@/lib/utils/i18n';
import type { DraftCategory } from '@/lib/realtime/socket.types';
import type { AvatarCustomization } from '@/types/game';

interface HalftimeScreenProps {
  visible: boolean;
  playerGoals: number;
  opponentGoals: number;
  playerName: string;
  opponentName: string;
  playerAvatarUrl: string;
  opponentAvatarUrl: string;
  playerAvatarCustomization?: AvatarCustomization | null;
  opponentAvatarCustomization?: AvatarCustomization | null;
  playerPosition: number;
  /** Ranked points — renders the RP pill under each name, like the draft header. */
  playerRankPoints?: number | null;
  opponentRankPoints?: number | null;
  /** ISO-country code (e.g. "ge", "us") — renders a flag badge on the avatar. */
  playerCountryCode?: string | null;
  opponentCountryCode?: string | null;
  deadlineAt?: string | null;
  uiReadyAt?: string | null;
  categoryOptions?: DraftCategory[];
  mySeat?: 1 | 2 | null;
  firstBanSeat?: 1 | 2 | null;
  myBan?: string | null;
  opponentBan?: string | null;
  onBanCategory?: (categoryId: string) => void;
  onBanPhaseShown?: () => void;
  /** When true this is the pre-penalty category ban — shows a "Penalties" heading. */
  isPenaltyBan?: boolean;
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
  playerAvatarCustomization = null,
  opponentAvatarCustomization = null,
  playerPosition,
  playerRankPoints = null,
  opponentRankPoints = null,
  playerCountryCode = null,
  opponentCountryCode = null,
  deadlineAt = null,
  uiReadyAt = null,
  categoryOptions = [],
  mySeat = null,
  firstBanSeat = null,
  myBan = null,
  opponentBan = null,
  onBanCategory,
  onBanPhaseShown,
  isPenaltyBan = false,
}: HalftimeScreenProps) {
  const { t, locale } = useLocale();
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

  const banTimerReady = showBanPhase && Boolean(deadlineAt && uiReadyAt === deadlineAt);
  const timerDeadlineAt = banTimerReady ? deadlineAt : null;

  // Parse the real ban deadline once it has been restarted for the ban UI.
  const deadlineMs = useMemo(() => {
    if (!timerDeadlineAt) return null;
    const ms = new Date(timerDeadlineAt).getTime();
    return Number.isFinite(ms) ? ms : null;
  }, [timerDeadlineAt]);

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

  // Latch "I have already banned" for this ban phase. Server state can briefly
  // wobble (e.g. when the opponent's ban update lands the snapshot can momentarily
  // report my own ban as null), which would flip the turn indicator back to
  // "your turn" for a few seconds. Once I've banned, I must never be told it's my
  // turn again this phase. The latch resets when a NEW ban phase starts (the
  // category set changes) so the second half / penalty ban works normally.
  const phaseKey = useMemo(
    () => categoryOptions.map((c) => c.id).join('|'),
    [categoryOptions],
  );
  const bannedThisPhaseRef = useRef<{ phaseKey: string; banned: boolean }>({ phaseKey, banned: false });
  if (bannedThisPhaseRef.current.phaseKey !== phaseKey) {
    bannedThisPhaseRef.current = { phaseKey, banned: false };
  }
  if (myBan) {
    bannedThisPhaseRef.current.banned = true;
  }
  const alreadyBanned = bannedThisPhaseRef.current.banned;

  const myTurn = mySeat === (firstBanSeat ?? 2)
    ? !myBan
    : mySeat === 1 || mySeat === 2
      ? Boolean(opponentBan && !myBan)
      : false;
  // `alreadyBanned` guard: never show "your turn" again after I've banned, even
  // if a transient server snapshot drops my ban.
  const canBan = myTurn && !alreadyBanned;

  if (!visible) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center overflow-hidden">
      {/* Background: blurred pitch + overlays */}
      <div className="absolute inset-0">
        <div className="absolute inset-0 flex items-center justify-center blur-[2px] scale-[1.02]">
          <div className="w-full max-w-lg">
            <PitchVisualization
              playerPosition={playerPosition}
              playerAvatarUrl={playerAvatarUrl}
              opponentAvatarUrl={opponentAvatarUrl}
              playerAvatarCustomization={playerAvatarCustomization}
              opponentAvatarCustomization={opponentAvatarCustomization}
              playerName={playerName}
              opponentName={opponentName}
              myMomentum={0}
            />
          </div>
        </div>
        <div className="absolute inset-0 bg-surface-page-alt/80" />
        <div
          className="absolute inset-0"
          style={{ background: 'radial-gradient(ellipse at center, transparent 20%, rgba(0,0,0,0.6) 100%)' }}
        />
      </div>

      {/* Content — same width as the pre-match draft (max-w-3xl) so cards and
          avatars render at the same size across all three ban screens. */}
      <div className="relative z-10 w-full max-w-3xl flex flex-col items-center font-poppins px-4 sm:px-6 pt-6 sm:pt-10">
        {/* Half Time label — flat, no 3D border */}
        <div className="mb-4 sm:mb-5">
          <span
            className="text-xs sm:text-sm font-black uppercase tracking-[0.35em] text-brand-orange"
            style={{ fontFamily: "'Poppins', sans-serif", fontWeight: 600, letterSpacing: '0.35em' }}
          >
            {isPenaltyBan ? t('possession.penaltiesBanTitle') : t('possession.halfTime')}
          </span>
        </div>

        {/* Score row — draft-style headers (avatar in a colored circle + name),
            score in the centre, timer below. The non-acting player's avatar is
            dimmed during the ban phase so it's clear whose turn it is. */}
        <div className="w-full flex flex-col items-center gap-3 mb-6 sm:mb-8">
          <div className="flex items-center justify-center gap-4 sm:gap-6 w-full">
            {/* Player — avatar with name + RP to the SIDE, like the draft. */}
            <div className={cn(
              'flex items-center gap-3 min-w-0 flex-1 transition-opacity duration-300',
              showBanPhase && !bothBansSubmitted && !canBan && 'opacity-40',
            )}>
              <TierFrameAvatar
                tier={tierFromRp(playerRankPoints ?? 0)}
                avatarCustomization={playerAvatarCustomization ?? { base: playerAvatarUrl }}
                countryCode={playerCountryCode}
                size="md"
              />
              <div className="hidden min-w-0 sm:block">
                <div className="max-w-[140px] truncate text-[13px] font-black uppercase text-white sm:text-sm">
                  {playerName}
                </div>
                <span
                  className="mt-1.5 inline-block rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.06em] tabular-nums"
                  style={{ backgroundColor: '#FFE500', color: '#1a1800' }}
                >
                  {playerRankPoints != null ? `${playerRankPoints} RP` : '— RP'}
                </span>
              </div>
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

            {/* Opponent — mirrored: avatar on the right, name + RP to its side. */}
            <div className={cn(
              'flex flex-row-reverse items-center gap-3 min-w-0 flex-1 transition-opacity duration-300',
              showBanPhase && !bothBansSubmitted && canBan && 'opacity-40',
            )}>
              <TierFrameAvatar
                tier={tierFromRp(opponentRankPoints ?? 0)}
                avatarCustomization={opponentAvatarCustomization ?? { base: opponentAvatarUrl }}
                countryCode={opponentCountryCode}
                size="md"
                mirrorAvatar
              />
              <div className="hidden min-w-0 text-right sm:block">
                <div className="max-w-[140px] truncate text-[13px] font-black uppercase text-white sm:text-sm">
                  {opponentName}
                </div>
                <span
                  className="mt-1.5 inline-block rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.06em] tabular-nums"
                  style={{ backgroundColor: '#FFE500', color: '#1a1800' }}
                >
                  {opponentRankPoints != null ? `${opponentRankPoints} RP` : '— RP'}
                </span>
              </div>
            </div>
          </div>

          {/* Timer appears only after the backend confirms the ban UI deadline. */}
          {banTimerReady && (
            <CircularTimer timeLeft={timeLeft} totalDuration={totalDuration} isUrgent={isUrgent} />
          )}
        </div>

        {/* Ban phase — slides up into view after the intro. */}
        {showBanPhase && (
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ type: 'spring', stiffness: 280, damping: 24 }}
            className="w-full flex flex-col items-center"
          >
            {/* Section title */}
            <div className="text-[10px] sm:text-xs font-bold uppercase tracking-[0.25em] text-brand-slate mb-1.5 sm:mb-2">
              {t('possession.halftime.banTitle')}
            </div>

            {/* Turn indicator — your turn vs opponent banning, like the draft. */}
            {!bothBansSubmitted && (
              <div
                className={cn(
                  'mb-3 sm:mb-4 text-sm sm:text-base font-black uppercase tracking-[0.12em]',
                  canBan ? 'text-brand-yellow' : 'text-white/55',
                )}
              >
                {canBan
                  ? t('possession.halftime.yourTurn')
                  : t('possession.halftime.opponentBanning')}
              </div>
            )}

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
                    onClick={onBanCategory}
                  />
                );
              })}
            </div>

            {/* Status text */}
            <div
              className="mt-4 sm:mt-6 text-xs sm:text-sm font-bold uppercase tracking-widest text-white/50 text-center"
            >
              {bothBansSubmitted
                ? t('possession.halftime.secondHalfCategory', { name: remainingCategory ? getI18nText(remainingCategory.name, locale) : t('possession.halftime.deciding') })
                : myBan
                  ? t('possession.halftime.banWaitingOpponent')
                  : !canBan
                    ? t('possession.halftime.banOpponentChoosing')
                    : t('possession.halftime.banChooseCategory')}
            </div>
          </motion.div>
        )}
      </div>
    </div>
  );
}
