'use client';

/**
 * The "PENALTY SHOOTOUT — Get Ready — 5..4..3" overlay that plays before the
 * penalty shootout begins. Dim/blur backdrop, red title, big circular
 * countdown digit. Extracted from RealtimePossessionMatchScreen so the same
 * markup can be previewed in dev/timers.
 */

import { motion } from 'motion/react';
import { useLocale } from '@/contexts/LocaleContext';

interface PenaltyStartCountdownOverlayProps {
  /** Countdown number to show (e.g. 5,4,3,2,1). */
  display: number;
}

export function PenaltyStartCountdownOverlay({ display }: PenaltyStartCountdownOverlayProps) {
  const { t } = useLocale();
  return (
    <motion.div
      key="penalty-countdown"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.3 }}
      className="pointer-events-none absolute inset-0 z-30 flex items-center justify-center"
    >
      <div className="absolute inset-0 bg-surface-page-alt/60 backdrop-blur-sm" />
      <motion.div
        initial={{ scale: 0.6, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: 'spring', stiffness: 300, damping: 22 }}
        className="relative flex w-full max-w-[90vw] flex-col items-center gap-4 px-4 text-center"
      >
        <motion.div
          initial={{ y: -20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.15, duration: 0.4 }}
          className="w-full text-balance text-center text-[clamp(1.5rem,7vw,2.25rem)] font-black uppercase leading-tight tracking-wide text-brand-red-soft [overflow-wrap:normal] [word-break:keep-all]"
          // family-only to preserve font-black / tracking
          style={{ fontFamily: "'Poppins', sans-serif", textShadow: '0 0 30px rgba(255,75,75,0.5), 0 4px 0 rgba(200,40,40,0.8)' }}
        >
          {t('possession.penaltyShootout')}
        </motion.div>
        <motion.div
          key={`pen-cd-${display}`}
          initial={{ scale: 0.72, opacity: 0.4 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: 'spring', stiffness: 340, damping: 22 }}
        >
          <div className="flex size-28 items-center justify-center rounded-full border-4 border-brand-red-soft/70 bg-surface-deep shadow-[0_0_50px_rgba(255,75,75,0.3)]">
            <span
              className="text-5xl font-black leading-none tabular-nums text-white"
              // family-only to preserve font-black
              style={{ fontFamily: "'Poppins', sans-serif" }}
            >
              {display}
            </span>
          </div>
        </motion.div>
        <div
          className="text-sm font-bold uppercase tracking-widest text-white/60"
          // family-only to preserve font-bold / tracking
          style={{ fontFamily: "'Poppins', sans-serif" }}
        >
          {t('possession.getReady')}
        </div>
      </motion.div>
    </motion.div>
  );
}
