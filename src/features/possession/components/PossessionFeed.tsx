'use client';

import { motion, AnimatePresence } from 'motion/react';

interface PossessionFeedProps {
  message: string | null;
  direction: 'forward' | 'backward' | 'neutral';
  /** Which side to show feedback on (left = player, right = opponent) */
  side?: 'left' | 'right';
  /** Penalty/shot mode: show icon-based feedback instead of numeric */
  penaltyResult?: 'goal' | 'saved' | 'miss' | null;
}

const DIRECTION_COLORS = {
  forward: 'text-emerald-400',
  backward: 'text-red-400',
  neutral: 'text-white/60',
};

export function PossessionFeed({ message, direction, penaltyResult, side = 'left' }: PossessionFeedProps) {
  const showPenalty = !!penaltyResult;
  const isLeft = side === 'left';
  const slideFrom = isLeft ? -60 : 60;

  return (
    <div className={`h-8 flex items-center ${isLeft ? 'justify-start pl-6' : 'justify-end pr-6'} overflow-hidden`}>
      <AnimatePresence mode="wait">
        {showPenalty && (
          <motion.div
            key={`pen-${penaltyResult}-${side}`}
            initial={{ x: slideFrom, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: slideFrom, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 300, damping: 25 }}
            className={`flex items-center gap-2 text-sm font-black font-fun uppercase tracking-wide ${
              penaltyResult === 'goal' ? 'text-emerald-400' : penaltyResult === 'miss' ? 'text-white/50' : 'text-red-400'
            }`}
          >
            <span className="text-base">{penaltyResult === 'goal' ? '⚽' : penaltyResult === 'miss' ? '💨' : '🧤'}</span>
            {penaltyResult === 'goal' ? 'GOAL' : penaltyResult === 'miss' ? 'MISS' : 'SAVED'}
          </motion.div>
        )}
        {!showPenalty && message && (
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
        )}
      </AnimatePresence>
    </div>
  );
}
