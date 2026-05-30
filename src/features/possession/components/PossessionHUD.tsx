'use client';

import { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { Zap, X } from 'lucide-react';
import { AnimatedPointsCounter } from './AnimatedPointsCounter';
import { FLIGHT_TOTAL_MS } from './BarBattleFlightOverlay';
import { MatchHudAvatar, MatchHudIconButton } from './MatchHudPrimitives';
import { useLocale } from '@/contexts/LocaleContext';
import type { AvatarCustomization } from '@/types/game';

const poppins = {
  fontFamily: "'Poppins', sans-serif",
  fontWeight: 600,
  letterSpacing: '0',
  lineHeight: 1,
} as const;

interface PossessionHUDProps {
  playerGoals: number;
  opponentGoals: number;
  playerPoints?: number;
  opponentPoints?: number;
  playerName: string;
  opponentName: string;
  playerAvatarUrl: string;
  opponentAvatarUrl: string;
  playerAvatarCustomization?: AvatarCustomization | null;
  opponentAvatarCustomization?: AvatarCustomization | null;
  timeRemaining: number | null;
  half: 1 | 2;
  questionInHalf: number;
  zone: string;
  zoneColor: string;
  onQuit?: () => void;
  opponentAnswered?: boolean;
  opponentAnsweredCorrectly?: boolean | null;
  /** True when the player currently holds the 2× speed streak. */
  speedStreakMine?: boolean;
}

export function PossessionHUD({
  playerGoals,
  opponentGoals,
  playerPoints = 0,
  opponentPoints = 0,
  playerName,
  opponentName,
  playerAvatarCustomization = null,
  opponentAvatarCustomization = null,
  timeRemaining,
  half,
  onQuit,
  speedStreakMine = false,
}: PossessionHUDProps) {
  const { t } = useLocale();
  const showTimer = timeRemaining !== null;
  const timerLabel = showTimer
    ? (timeRemaining! >= 10 ? `${timeRemaining}` : `0${timeRemaining}`)
    : '\u00B7\u00B7';

  return (
    <div className="relative w-full mb-3 px-3">
      {/* Quit button — anchored in the match header so it scrolls away with the HUD. */}
      {onQuit && (
        <MatchHudIconButton
          onClick={onQuit}
          className="absolute right-[calc(env(safe-area-inset-right)+0.75rem)] top-[calc(env(safe-area-inset-top)+0.25rem)] z-[70] sm:right-[calc(env(safe-area-inset-right)+0.5rem)] sm:top-[calc(env(safe-area-inset-top)+0.5rem)] lg:fixed lg:right-[calc(env(safe-area-inset-right)+1rem)] lg:top-[calc(env(safe-area-inset-top)+1rem)]"
          title={t('possession.leaveMatch')}
          aria-label={t('possession.leaveMatch')}
        >
          <X className="size-5" />
        </MatchHudIconButton>
      )}

      <div className="flex items-center justify-between gap-1 px-12 sm:gap-3 sm:px-3">
        <div className="flex min-w-0 flex-1 items-center gap-1 sm:gap-3">
          <MatchHudAvatar customization={playerAvatarCustomization} side="player" />
          <div className="min-w-0">
            <div className="hidden truncate text-xs font-bold text-white/85 sm:block">{playerName}</div>
            <div className="flex items-center gap-2 sm:gap-2.5">
              <div className="text-2xl font-black leading-6 tabular-nums text-white sm:text-3xl sm:leading-7">
                <motion.span
                  key={`p-${playerGoals}`}
                  initial={{ opacity: 0, y: 4 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.2 }}
                >
                  {playerGoals}
                </motion.span>
              </div>
              <SpeedStreakBadge active={speedStreakMine} />
            </div>
            <div className="hidden sm:block">
              <AnimatedPointsCounter value={playerPoints} accentClassName="text-brand-yellow" />
            </div>
            <div className="text-[8px] font-black uppercase leading-none tracking-[0.08em] text-white/45 sm:hidden">
              {playerPoints} pts
            </div>
          </div>
        </div>

        <div className="flex min-w-[52px] shrink-0 flex-col items-center justify-center sm:min-w-[104px]">
          <div className="mb-1 hidden text-[10px] font-black uppercase tracking-[0.18em] text-white/45 sm:block">
            {half === 1 ? t('possession.firstHalf') : t('possession.secondHalf')}
          </div>
          <div
            className="flex h-9 min-w-[52px] items-center justify-center rounded-[16px] bg-brand-blue px-2 text-white tabular-nums sm:h-[44px] sm:min-w-[78px] sm:px-4"
            style={{ ...poppins, fontSize: 'clamp(16px, 2vw, 24px)' }}
          >
            {timerLabel}
          </div>
        </div>

        <div className="flex min-w-0 flex-1 items-center justify-end gap-1 sm:gap-3">
          <div className="min-w-0 text-right">
            <div className="ml-auto hidden truncate text-xs font-bold text-white/85 sm:block">{opponentName}</div>
            <div className="text-2xl font-black leading-6 tabular-nums text-white sm:text-3xl sm:leading-7">
              <motion.span
                key={`o-${opponentGoals}`}
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.2 }}
              >
                {opponentGoals}
              </motion.span>
            </div>
            <div className="hidden sm:block">
              <AnimatedPointsCounter
                value={opponentPoints}
                align="right"
                accentClassName="text-brand-red-soft"
              />
            </div>
            <div className="text-[8px] font-black uppercase leading-none tracking-[0.08em] text-white/45 sm:hidden">
              {opponentPoints} pts
            </div>
          </div>
          <MatchHudAvatar customization={opponentAvatarCustomization} side="opponent" flipped />
        </div>
      </div>
    </div>
  );
}

/**
 * 2× speed-streak badge — shown to the right of the player's score while the
 * streak is active. `data-speed-streak-badge` anchors the future flight
 * animation (the +N ghost gets multiplied here before flying to the pitch).
 */
// Time for the incoming "2×" flight token to travel from the answer source to
// this slot. Derived from the overlay's own flight duration so the two can't
// drift (single source of truth).
const SPEED_STREAK_FLIGHT_MS = FLIGHT_TOTAL_MS;

function SpeedStreakBadge({ active }: { active: boolean }) {
  // Reveal the sticky badge only after the flying 2× token has had time to
  // arrive (so it doesn't sit here while the token is still mid-air).
  const [landed, setLanded] = useState(false);
  useEffect(() => {
    if (!active) {
      queueMicrotask(() => setLanded(false));
      return;
    }
    const timer = setTimeout(() => setLanded(true), SPEED_STREAK_FLIGHT_MS);
    return () => clearTimeout(timer);
  }, [active]);

  const show = active && landed;
  const dropDistance = 720;

  // The wrapper + AnimatePresence stay mounted across the whole streak (and
  // beyond) so the badge's EXIT animation can run when the streak breaks —
  // if we unmounted the wrapper on `!active`, the badge would just vanish.
  // While shown, an invisible spacer reserves the badge's box so the
  // flight-target anchor sits at the true badge center (no landing jump).
  return (
    <div className="relative z-[120] inline-flex items-center justify-center overflow-visible">
      {/* Spacer reserves the badge-sized box for the WHOLE active streak — not
          just after reveal — so the flight target (data-speed-streak-slot) is
          measured at the true badge center while the token is still in flight
          (otherwise it centers on a zero-size box and the landing jumps). */}
      {active && (
        <div aria-hidden className="invisible inline-flex w-max items-center gap-1 whitespace-nowrap rounded-xl px-2.5 py-1 sm:gap-1.5 sm:px-3 sm:py-1.5">
          <Zap className="size-4 sm:size-5" />
          <span className="font-poppins text-lg font-black leading-none sm:text-2xl">2×</span>
        </div>
      )}
      {/* center-of-badge anchor — the flight token lands here */}
      <span
        data-speed-streak-slot="player"
        className="pointer-events-none absolute left-1/2 top-1/2 size-px -translate-x-1/2 -translate-y-1/2"
      />
      <AnimatePresence>
        {show && (
          <motion.div
            initial={{ opacity: 0, scale: 0.8, y: 0, rotate: 0 }}
            animate={{ opacity: 1, scale: 1, y: 0, rotate: 0 }}
            // Lose the streak: the badge unsticks and drops away under gravity
            // (mirrors the failed/zero-point flight fall), tilting as it falls.
            exit={{
              opacity: [1, 1, 0],
              y: [0, -12, dropDistance],
              rotate: [0, -8, 22],
              scale: [1, 1.05, 0.8],
              transition: { duration: 1.05, times: [0, 0.12, 1], ease: [0.45, 0, 0.9, 1] },
            }}
            transition={{ type: 'spring', stiffness: 320, damping: 18 }}
            className="absolute inset-0 z-[120] flex items-center justify-center"
          >
            <div
              data-speed-streak-badge="player"
              className="inline-flex w-max items-center gap-1 whitespace-nowrap rounded-xl bg-brand-yellow px-2.5 py-1 shadow-[0_3px_10px_rgba(0,0,0,0.35)] sm:gap-1.5 sm:px-3 sm:py-1.5"
            >
              <Zap className="size-4 fill-black text-black sm:size-5" />
              <span className="font-poppins text-lg font-black leading-none text-black sm:text-2xl">2×</span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
