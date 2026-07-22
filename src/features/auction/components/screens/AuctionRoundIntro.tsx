'use client';

import { useEffect } from 'react';
import { motion } from 'motion/react';
import { useLocale } from '@/contexts/LocaleContext';
import { POS_COLORS } from '../../constants/auction.constants';
import { usePositionLabel } from '../../hooks/usePositionLabel';
import type { PositionGroup } from '../../types';

/** How long the full-screen round intro holds before the clue card takes over. */
export const ROUND_INTRO_MS = 2200;

interface AuctionRoundIntroProps {
  roundIndex: number;
  positionGroup: PositionGroup;
  /** Fired once the intro has played its full duration. */
  onDone: () => void;
}

/**
 * Full-screen beat announcing the next lot: "ROUND N" over the position being
 * auctioned. Owns its own dismissal timer so the caller only reacts to onDone.
 */
export function AuctionRoundIntro({ roundIndex, positionGroup, onDone }: AuctionRoundIntroProps) {
  const { t } = useLocale();
  const posLabel = usePositionLabel();
  const posColor = POS_COLORS[positionGroup];

  useEffect(() => {
    const timeout = window.setTimeout(onDone, ROUND_INTRO_MS);
    return () => window.clearTimeout(timeout);
  }, [onDone]);

  return (
    <motion.div
      data-testid="auction-round-intro"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0, transition: { duration: 0.35 } }}
      className="fixed inset-0 z-40 flex flex-col items-center justify-center gap-6 bg-surface-page-alt bg-[url('/assets/bg-pattern.webp')] bg-cover bg-center bg-no-repeat px-6"
    >
      {/* Position-tinted glow behind the stack */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{ background: `radial-gradient(circle at 50% 45%, ${posColor}22 0%, transparent 60%)` }}
      />

      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
        className="relative font-poppins text-5xl font-black uppercase tracking-[0.12em] text-white sm:text-6xl"
      >
        {t('auctionGame.round', { round: roundIndex })}
      </motion.div>

      <motion.div
        initial={{ opacity: 0, scale: 0.82 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ type: 'spring', stiffness: 200, damping: 14, delay: 0.35 }}
        className="relative rounded-[20px] px-8 py-4 font-poppins text-3xl font-black uppercase tracking-wide text-white sm:text-4xl"
        style={{ backgroundColor: posColor, boxShadow: `0 8px 40px ${posColor}55` }}
      >
        {posLabel(positionGroup)}
      </motion.div>

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.75, duration: 0.4 }}
        className="relative font-poppins text-sm font-semibold uppercase tracking-[0.18em] text-white/55"
      >
        {t('auctionGame.mysteryPlayer')}
      </motion.div>
    </motion.div>
  );
}
