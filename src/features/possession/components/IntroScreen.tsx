'use client';

import { motion, AnimatePresence } from 'motion/react';

interface IntroScreenProps {
  visible: boolean;
  onStart: () => void;
}

export function IntroScreen({ visible, onStart }: IntroScreenProps) {
  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-[#131F24]"
        >
          <motion.button
            initial={{ scale: 0 }}
            animate={{ scale: [0, 1.15, 1] }}
            transition={{ duration: 0.6, ease: 'easeOut' }}
            onClick={onStart}
            className="text-center font-fun cursor-pointer group"
          >
            <motion.div
              animate={{ scale: [1, 1.15, 1] }}
              transition={{ duration: 1.5, repeat: Infinity }}
              className="text-7xl mb-4"
            >
              ⚽
            </motion.div>
            <div className="text-3xl font-black text-white uppercase tracking-widest mb-2">
              Quizball
            </div>
            <div className="text-lg text-[#56707A] group-hover:text-[#1CB0F6] transition-colors">
              Tap to Start
            </div>
          </motion.button>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
