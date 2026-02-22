import { motion } from 'motion/react';

interface RoundTransitionOverlayProps {
  questionNumber: number;
  categoryName: string;
  half: 1 | 2;
  isExtra?: boolean;
}

export function RoundTransitionOverlay({ questionNumber, categoryName, half, isExtra = false }: RoundTransitionOverlayProps) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.2 }}
      className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-[#131F24]/95 backdrop-blur-sm rounded-2xl overflow-hidden"
    >
      {/* Top accent bar */}
      <motion.div
        initial={{ scaleX: 0 }}
        animate={{ scaleX: 1 }}
        transition={{ duration: 0.4, ease: 'easeOut' }}
        className="absolute top-0 inset-x-0 h-[3px] bg-[#1CB0F6] origin-left"
      />

      {/* Bottom accent bar */}
      <motion.div
        initial={{ scaleX: 0 }}
        animate={{ scaleX: 1 }}
        transition={{ duration: 0.4, ease: 'easeOut', delay: 0.05 }}
        className="absolute bottom-0 inset-x-0 h-[3px] bg-[#1CB0F6] origin-right"
      />

      {/* Category name */}
      <motion.div
        initial={{ y: 8, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ type: 'spring', stiffness: 400, damping: 28, delay: 0.1 }}
        className="text-[#1CB0F6] text-xs font-bold font-fun uppercase tracking-[0.2em] mb-2"
      >
        {categoryName}
      </motion.div>

      {/* QUESTION X */}
      <motion.div
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: 'spring', stiffness: 350, damping: 22, delay: 0.15 }}
        className="text-3xl font-black font-fun text-white uppercase tracking-wider"
        style={{ textShadow: '0 4px 0 rgba(0,0,0,0.4), 0 0 30px rgba(28,176,246,0.15)' }}
      >
        {isExtra ? 'Extra Question' : `Question ${questionNumber}`}
      </motion.div>

      {/* Half subtitle */}
      <motion.div
        initial={{ y: -6, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ type: 'spring', stiffness: 400, damping: 28, delay: 0.25 }}
        className="text-white/50 text-xs font-bold font-fun uppercase tracking-widest mt-2"
      >
        {half === 1 ? '1st Half' : '2nd Half'}
      </motion.div>
    </motion.div>
  );
}
