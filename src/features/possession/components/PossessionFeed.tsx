'use client';

import { motion, AnimatePresence } from 'motion/react';

interface PossessionFeedProps {
  message: string | null;
  direction: 'forward' | 'backward' | 'neutral';
  /** Which side to show feedback on (left = player, right = opponent) */
  side?: 'left' | 'right';
  /** Kept in the feed model for compatibility; result text is intentionally not rendered. */
  penaltyResult?: 'goal' | 'saved' | 'miss' | null;
}

const DIRECTION_COLORS = {
  forward: 'text-emerald-400',
  backward: 'text-red-400',
  neutral: 'text-white/60',
};

export function PossessionFeed({ message, direction, side = 'left' }: PossessionFeedProps) {
  if (!message) return null;

  const isLeft = side === 'left';
  const slideFrom = isLeft ? -60 : 60;

  return (
    <div className={`h-8 flex items-center ${isLeft ? 'justify-start pl-6' : 'justify-end pr-6'} overflow-hidden`}>
      <AnimatePresence mode="wait">
        <motion.div
          key={message}
          initial={{ x: slideFrom, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          exit={{ x: slideFrom, opacity: 0 }}
          transition={{ type: 'spring', stiffness: 300, damping: 25 }}
          className={`text-sm font-black font-fun uppercase tracking-wide ${DIRECTION_COLORS[direction]}`}
        >
          {message}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
