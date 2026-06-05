'use client';

import { motion } from 'motion/react';
import { AvatarDisplay } from '@/components/AvatarDisplay';
import { useLocale } from '@/contexts/LocaleContext';
import type { AvatarCustomization } from '@/types/game';

/**
 * Shown after the FINAL, match-deciding penalty kick has FULLY played out (the
 * shot/save animation finished), as a brief "this is how it ended" beat before
 * the results screen.
 *
 * Reported bug it fixes: when the deciding penalty was scored the match cut
 * straight to the end screen — the shot animation was truncated and there was no
 * who-won / final-score moment, so players couldn't tell what happened.
 *
 * Visual language mirrors {@link HalftimeScreen}'s header (dimmed backdrop +
 * avatar-in-colored-circle + name + RP, score in the centre) but WITHOUT the
 * ban cards — just the penalty score and a WON / LOST title, held ~2s.
 *
 * Self-contained (no store access) so it can be driven from /dev/animations for
 * iteration AND mounted in the real penalty flow once the look is dialed in.
 */
export interface PenaltyMatchEndOverlayProps {
  visible: boolean;
  playerWon: boolean;
  /** Final penalty scoreboard from the local player's perspective. */
  myPenaltyGoals: number;
  oppPenaltyGoals: number;
  playerName: string;
  opponentName: string;
  playerAvatarUrl?: string;
  opponentAvatarUrl?: string;
  playerAvatarCustomization?: AvatarCustomization | null;
  opponentAvatarCustomization?: AvatarCustomization | null;
  playerCountryCode?: string | null;
  opponentCountryCode?: string | null;
  playerRankPoints?: number | null;
  opponentRankPoints?: number | null;
}

export function PenaltyMatchEndOverlay({
  visible,
  playerWon,
  myPenaltyGoals,
  oppPenaltyGoals,
  playerName,
  opponentName,
  playerAvatarUrl,
  opponentAvatarUrl,
  playerAvatarCustomization,
  opponentAvatarCustomization,
  playerCountryCode,
  opponentCountryCode,
  playerRankPoints,
  opponentRankPoints,
}: PenaltyMatchEndOverlayProps) {
  const { t } = useLocale();
  if (!visible) return null;

  const accent = playerWon ? '#38B60E' : '#FB3101'; // brand-green / brand-red

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.25 }}
      className="fixed inset-0 z-50 flex flex-col items-center justify-center overflow-hidden"
      role="status"
      aria-live="polite"
    >
      {/* Backdrop — fully opaque so the still-settling pitch / question card
          underneath never bleeds through (that bleed-through was the "animation
          didn't finish" look). Matches the halftime page surface. */}
      <div className="absolute inset-0 bg-surface-page-alt" />
      <div
        className="absolute inset-0"
        style={{ background: 'radial-gradient(ellipse at center, transparent 20%, rgba(0,0,0,0.65) 100%)' }}
      />

      {/* Content — same max width as the halftime/draft header. */}
      <motion.div
        initial={{ scale: 0.94, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: 'spring', stiffness: 260, damping: 22 }}
        className="relative z-10 w-full max-w-3xl flex flex-col items-center font-poppins px-4 sm:px-6"
      >
        {/* WON / LOST title — sits where the "HALF TIME" label is on the ban screen. */}
        <div className="mb-4 sm:mb-5">
          <span
            className="text-sm font-black uppercase tracking-[0.35em] sm:text-base"
            style={{ fontFamily: "'Poppins', sans-serif", fontWeight: 600, letterSpacing: '0.35em', color: accent }}
          >
            {playerWon ? t('possession.won') : t('possession.didNotWin')}
          </span>
        </div>

        {/* Score row — identical structure to HalftimeScreen's header, but the
            centre shows the PENALTY score and neither side is dimmed. */}
        <div className="flex items-center justify-center gap-4 sm:gap-6 w-full">
          {/* Player — avatar in a colored circle, name + RP to the side. */}
          <div className="flex items-center gap-3 min-w-0 flex-1">
            <div className="shrink-0 rounded-full p-3" style={{ backgroundColor: '#1645FF' }}>
              <AvatarDisplay
                customization={playerAvatarCustomization ?? { base: playerAvatarUrl }}
                size="md"
                countryCode={playerCountryCode}
              />
            </div>
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

          {/* Penalty score */}
          <div className="flex items-center gap-2 sm:gap-3 shrink-0">
            <span className="text-4xl sm:text-5xl font-black text-white tabular-nums leading-none">
              {myPenaltyGoals}
            </span>
            <span className="text-2xl sm:text-3xl font-black text-white/30">:</span>
            <span className="text-4xl sm:text-5xl font-black text-white tabular-nums leading-none">
              {oppPenaltyGoals}
            </span>
          </div>

          {/* Opponent — mirrored. */}
          <div className="flex flex-row-reverse items-center gap-3 min-w-0 flex-1">
            <div className="shrink-0 rounded-full p-3" style={{ backgroundColor: '#FF4B4B' }}>
              <AvatarDisplay
                customization={opponentAvatarCustomization ?? { base: opponentAvatarUrl }}
                size="md"
                countryCode={opponentCountryCode}
                className="-scale-x-100"
              />
            </div>
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

        {/* Penalties label under the score */}
        <div className="mt-4 sm:mt-6 text-xs font-bold uppercase tracking-[0.25em] text-white/50">
          {t('possession.penaltyShootout')}
        </div>
      </motion.div>
    </motion.div>
  );
}
