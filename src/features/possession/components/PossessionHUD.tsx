'use client';

import { motion } from 'motion/react';
import { X } from 'lucide-react';
import { AnimatedPointsCounter } from './AnimatedPointsCounter';
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
            {half === 1 ? 'First Half' : 'Second Half'}
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
