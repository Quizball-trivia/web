'use client';

import { motion } from 'motion/react';

interface GoalCelebrationOverlayProps {
  scorerName: string;
  isMeScorer: boolean;
}

export function GoalCelebrationOverlay({ scorerName, isMeScorer }: GoalCelebrationOverlayProps) {
  const accentColor = isMeScorer ? '#58CC02' : '#FF4B4B';
  const glowColor = isMeScorer ? 'rgba(88,204,2,0.4)' : 'rgba(255,75,75,0.4)';
  const darkGlow = isMeScorer ? 'rgba(70,163,2,0.8)' : 'rgba(200,40,40,0.8)';

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.25 }}
      className="fixed inset-0 z-50 flex flex-col items-center justify-center pointer-events-none"
    >
      {/* Background dim */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="absolute inset-0 bg-black/50 backdrop-blur-[2px]"
      />

      {/* Radial burst lines */}
      <div className="absolute inset-0 flex items-center justify-center overflow-hidden">
        {Array.from({ length: 12 }).map((_, i) => (
          <motion.div
            key={i}
            initial={{ scaleY: 0, opacity: 0 }}
            animate={{ scaleY: 1, opacity: [0, 0.3, 0] }}
            transition={{ duration: 0.8, delay: 0.1 + i * 0.03, ease: 'easeOut' }}
            className="absolute w-[2px] h-[200%] origin-center"
            style={{
              background: `linear-gradient(transparent, ${accentColor}, transparent)`,
              transform: `rotate(${i * 30}deg)`,
            }}
          />
        ))}
      </div>

      {/* Content */}
      <div className="relative flex flex-col items-center">
        {/* GOOOL text */}
        <motion.div
          initial={{ scale: 0.3, opacity: 0 }}
          animate={{ scale: [0.3, 1.15, 1], opacity: 1 }}
          transition={{ duration: 0.5, ease: [0.34, 1.56, 0.64, 1] }}
          className="font-fun font-black text-7xl sm:text-8xl uppercase tracking-wider"
          style={{
            color: accentColor,
            textShadow: `0 0 40px ${glowColor}, 0 6px 0 ${darkGlow}, 0 0 80px ${glowColor}`,
          }}
        >
          GOOOL!
        </motion.div>

        {/* Ball emoji */}
        <motion.div
          initial={{ y: 30, opacity: 0, rotate: -180 }}
          animate={{ y: 0, opacity: 1, rotate: 0 }}
          transition={{ type: 'spring', stiffness: 300, damping: 18, delay: 0.2 }}
          className="text-4xl mt-2"
        >
          ⚽
        </motion.div>

        {/* Scorer name */}
        <motion.div
          initial={{ y: 12, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.3, duration: 0.3 }}
          className="mt-3 text-sm font-bold font-fun uppercase tracking-[0.25em] text-white/70"
        >
          {isMeScorer ? 'You scored!' : `${scorerName} scored`}
        </motion.div>

        {/* Expanding ring */}
        <motion.div
          initial={{ scale: 0.2, opacity: 0.8 }}
          animate={{ scale: 3, opacity: 0 }}
          transition={{ duration: 1, ease: 'easeOut', delay: 0.1 }}
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-32 h-32 rounded-full border-4"
          style={{ borderColor: accentColor }}
        />
      </div>
    </motion.div>
  );
}
