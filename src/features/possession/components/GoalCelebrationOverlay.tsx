'use client';

import Image from 'next/image';
import { motion } from 'motion/react';

interface GoalCelebrationOverlayProps {
  scorerName: string;
  isMeScorer: boolean;
  /** When true, skip all audio playback */
  muted?: boolean;
}

export function GoalCelebrationOverlay({ scorerName, isMeScorer }: GoalCelebrationOverlayProps) {
  const accentColor = '#FFE500'; // Always yellow splash

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.25 }}
      className="absolute inset-0 z-20 flex flex-col items-center justify-center pointer-events-none overflow-hidden"
    >
      {/* Background dim — no blur */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="absolute inset-0 bg-black/40"
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

      {/* Celebration hands — slide in then gently sway */}
      <motion.div
        className="pointer-events-none absolute left-0 bottom-[10%] z-30 w-[18%] max-w-[80px] origin-bottom"
        initial={{ opacity: 0, x: -20, rotate: -12 }}
        animate={{ opacity: 1, x: 0, rotate: [-5, 3, -5] }}
        exit={{ opacity: 0, x: -12 }}
        transition={{
          opacity: { duration: 0.3, delay: 0.15 },
          x: { duration: 0.3, delay: 0.15 },
          rotate: { duration: 2.5, repeat: Infinity, ease: 'easeInOut', delay: 0.4 },
        }}
      >
        <Image src="/assets/brand/hand-left.webp" alt="" width={120} height={200} className="w-full h-auto object-contain" />
      </motion.div>

      <motion.div
        className="pointer-events-none absolute right-0 bottom-[10%] z-30 w-[18%] max-w-[80px] origin-bottom"
        initial={{ opacity: 0, x: 20, rotate: 12 }}
        animate={{ opacity: 1, x: 0, rotate: [5, -3, 5] }}
        exit={{ opacity: 0, x: 12 }}
        transition={{
          opacity: { duration: 0.3, delay: 0.15 },
          x: { duration: 0.3, delay: 0.15 },
          rotate: { duration: 2.5, repeat: Infinity, ease: 'easeInOut', delay: 0.6 },
        }}
      >
        <Image src="/assets/brand/hand-right.webp" alt="" width={120} height={200} className="w-full h-auto object-contain" />
      </motion.div>

      {/* Yellow splash ellipse */}
      <motion.div
        className="absolute z-20 pointer-events-none"
        initial={{ opacity: 0, scale: 0.5 }}
        animate={{ opacity: [0, 0.7, 0.4, 0], scale: [0.5, 1.2, 1.4, 1.6] }}
        transition={{ duration: 1.2, delay: 0.1, ease: 'easeOut' }}
      >
        <Image src="/assets/brand/ellipse-yellow.webp" alt="" width={400} height={400} className="w-[60%] max-w-[200px] h-auto object-contain" />
      </motion.div>

      {/* Goal.png image + ball animation — constrained to container height */}
      <motion.div
        initial={{ opacity: 0, scale: 0.94 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.3 }}
        className="absolute inset-0 z-20 flex items-center justify-center pointer-events-none p-2"
      >
        <div className="relative h-full max-h-full flex items-center justify-center">
          <Image src="/assets/goal.png" alt="Goal celebration" width={760} height={538} className="max-h-full w-auto object-contain" />
          <motion.div
            className="absolute left-1/2 top-[44%] flex size-8 -translate-x-1/2 -translate-y-1/2 items-center justify-center"
            initial={{ scale: 1, y: 10, opacity: 0.94 }}
            animate={{ scale: [1, 3, 0.9], y: [10, -16, 8], opacity: [0.94, 1, 0.98] }}
            transition={{ duration: 1.4, times: [0, 0.38, 1], ease: 'easeInOut' }}
          >
            <Image src="/assets/brand/large-ball.png" alt="" width={256} height={256} className="size-6 object-contain drop-shadow-[0_0_8px_rgba(255,255,255,0.32)]" />
          </motion.div>
        </div>
      </motion.div>

      {/* Content — scorer name on top */}
      <div className="relative z-40 flex flex-col items-center">
        <motion.div
          initial={{ y: 8, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.3, duration: 0.3 }}
          className="mt-2 text-[10px] font-bold font-fun uppercase tracking-[0.2em] text-white/70"
        >
          {isMeScorer ? 'You scored!' : `${scorerName} scored`}
        </motion.div>

        {/* Expanding ring */}
        <motion.div
          initial={{ scale: 0.2, opacity: 0.8 }}
          animate={{ scale: 3, opacity: 0 }}
          transition={{ duration: 1, ease: 'easeOut', delay: 0.1 }}
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-16 h-16 rounded-full border-4"
          style={{ borderColor: accentColor }}
        />
      </div>
    </motion.div>
  );
}
