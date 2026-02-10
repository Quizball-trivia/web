'use client';

import { motion, AnimatePresence } from 'motion/react';

interface PregameOverlayProps {
  visible: boolean;
}

export function PregameOverlay({ visible }: PregameOverlayProps) {
  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80"
        >
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: [0, 1.3, 1] }}
            transition={{ duration: 0.8, ease: 'easeOut' }}
            className="text-center font-fun"
          >
            <div className="text-5xl mb-3">⚽</div>
            <div className="text-4xl font-black text-white uppercase tracking-widest">
              Kick Off!
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
