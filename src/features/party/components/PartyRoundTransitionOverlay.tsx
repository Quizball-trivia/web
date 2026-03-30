'use client';

import { AnimatePresence, motion } from 'motion/react';

export interface PartyRoundTransitionOverlayProps {
  visible: boolean;
  questionNumber: number;
  totalQuestions: number;
  categoryName: string;
}

export function PartyRoundTransitionOverlay({
  visible,
  questionNumber,
  totalQuestions,
  categoryName,
}: PartyRoundTransitionOverlayProps) {
  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          key="party-round-transition"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="pointer-events-none absolute inset-0 z-20 flex flex-col items-center justify-center rounded-2xl overflow-hidden bg-overlay-bg/95 backdrop-blur-sm"
        >
          {/* Top accent bar */}
          <motion.div
            initial={{ scaleX: 0 }}
            animate={{ scaleX: 1 }}
            transition={{ duration: 0.4, ease: 'easeOut' }}
            className="absolute top-0 inset-x-0 h-[3px] origin-left bg-overlay-accent"
          />

          {/* Bottom accent bar */}
          <motion.div
            initial={{ scaleX: 0 }}
            animate={{ scaleX: 1 }}
            transition={{ duration: 0.4, ease: 'easeOut', delay: 0.05 }}
            className="absolute bottom-0 inset-x-0 h-[3px] origin-right bg-overlay-accent"
          />

          {/* Category name */}
          <motion.div
            initial={{ y: 8, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ type: 'spring', stiffness: 400, damping: 28, delay: 0.1 }}
            className="mb-2 text-xs font-bold font-fun uppercase tracking-[0.2em] text-overlay-accent"
          >
            {categoryName}
          </motion.div>

          {/* QUESTION X */}
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ type: 'spring', stiffness: 350, damping: 22, delay: 0.15 }}
            className="text-3xl font-black font-fun text-white uppercase tracking-wider"
            style={{ textShadow: '0 4px 0 rgba(0,0,0,0.4), 0 0 30px hsl(var(--overlay-accent) / 0.15)' }}
          >
            Question {questionNumber}
          </motion.div>

          {/* Subtitle */}
          <motion.div
            initial={{ y: -6, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ type: 'spring', stiffness: 400, damping: 28, delay: 0.25 }}
            className="text-white/50 text-xs font-bold font-fun uppercase tracking-widest mt-2"
          >
            Question {questionNumber} of {totalQuestions}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
