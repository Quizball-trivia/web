'use client';

import { motion, AnimatePresence } from 'motion/react';

interface PossessionFeedProps {
  message: string | null; // e.g. "+20 → ATTACK!" or null to hide
  direction: 'forward' | 'backward' | 'neutral';
}

const DIRECTION_COLORS = {
  forward: 'text-emerald-400',
  backward: 'text-red-400',
  neutral: 'text-white/60',
};

export function PossessionFeed({ message, direction }: PossessionFeedProps) {
  return (
    <div className="h-8 flex items-center justify-center overflow-hidden">
      <AnimatePresence mode="wait">
        {message && (
          <motion.div
            key={message}
            initial={{ x: 60, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: -60, opacity: 0 }}
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
