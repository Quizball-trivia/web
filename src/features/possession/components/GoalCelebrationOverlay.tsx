'use client';

import Image from 'next/image';
import { motion } from 'motion/react';

interface GoalCelebrationOverlayProps {
  scorerName?: string;
  isMeScorer?: boolean;
  ballSizePx?: number;
  ballCenterPx?: { x: number; y: number };
  /** When true, skip all audio playback */
  muted?: boolean;
}

export function GoalCelebrationOverlay({ ballSizePx = 32, ballCenterPx }: GoalCelebrationOverlayProps) {
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
        className="pointer-events-none absolute bottom-0 left-0 z-50 w-[24%] min-w-[54px] max-w-[92px] origin-bottom sm:bottom-[10%] sm:w-[18%] sm:min-w-0 sm:max-w-[80px]"
        initial={{ opacity: 0, x: -20, rotate: -12 }}
        animate={{ opacity: 1, x: 0, rotate: [-5, 3, -5] }}
        exit={{
          opacity: 0,
          x: -46,
          rotate: -16,
          transition: { duration: 0.9, ease: [0.22, 1, 0.36, 1] },
        }}
        transition={{
          opacity: { duration: 0.3, delay: 0.15 },
          x: { duration: 0.3, delay: 0.15 },
          rotate: { duration: 2.5, repeat: Infinity, ease: 'easeInOut', delay: 0.4 },
        }}
      >
        <Image src="/assets/brand/hand-left.webp" alt="" width={120} height={200} className="w-full h-auto object-contain" />
      </motion.div>

      <motion.div
        className="pointer-events-none absolute bottom-0 right-0 z-50 w-[24%] min-w-[54px] max-w-[92px] origin-bottom sm:bottom-[10%] sm:w-[18%] sm:min-w-0 sm:max-w-[80px]"
        initial={{ opacity: 0, x: 20, rotate: 12 }}
        animate={{ opacity: 1, x: 0, rotate: [5, -3, 5] }}
        exit={{
          opacity: 0,
          x: 46,
          rotate: 16,
          transition: { duration: 0.9, ease: [0.22, 1, 0.36, 1] },
        }}
        transition={{
          opacity: { duration: 0.3, delay: 0.15 },
          x: { duration: 0.3, delay: 0.15 },
          rotate: { duration: 2.5, repeat: Infinity, ease: 'easeInOut', delay: 0.6 },
        }}
      >
        <Image src="/assets/brand/hand-right.webp" alt="" width={120} height={200} className="w-full h-auto object-contain" />
      </motion.div>

      {/* Goal artwork split into two halves so the exit peels open. Appears
          after the ball has risen (delay), then peels out as the ball drops. */}
      <motion.div
        initial={{ opacity: 0, scale: 0.94 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.35, delay: 0.6, ease: [0.22, 1, 0.36, 1] }}
        className="absolute inset-0 z-20 flex items-center justify-center pointer-events-none p-2"
      >
        <div className="relative h-full max-h-full w-full">
          <motion.div
            className="absolute inset-0 flex items-center justify-center"
            exit={{ y: '-115%', opacity: 0 }}
            transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
            style={{ clipPath: 'inset(0 0 50% 0)' }}
          >
            <Image src="/assets/goal.png" alt="Goal celebration" width={760} height={538} className="max-h-full w-auto object-contain" />
          </motion.div>
          <motion.div
            className="absolute inset-0 flex items-center justify-center"
            exit={{ y: '115%', opacity: 0 }}
            transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
            style={{ clipPath: 'inset(50% 0 0 0)' }}
          >
            <Image src="/assets/goal.png" alt="" width={760} height={538} className="max-h-full w-auto object-contain" />
          </motion.div>
        </div>
      </motion.div>

      {/* Ball: rises + enlarges, then HOLDS up while the GOAL text shows. On
          exit it descends slowly while scaling back down, overlapping with the
          text fade, and ends in its starting position. */}
      <motion.div
        className="absolute z-30 flex -translate-x-1/2 -translate-y-1/2 items-center justify-center"
        style={{
          width: ballSizePx,
          height: ballSizePx,
          left: ballCenterPx ? ballCenterPx.x : '50%',
          top: ballCenterPx ? ballCenterPx.y : '50%',
        }}
        initial={{ scale: 1, y: 10, opacity: 0.94 }}
        animate={{ scale: [1, 4.6, 1], y: [10, -32, 0], opacity: [0.94, 1, 1] }}
        exit={{ opacity: 1, scale: 1, transition: { duration: 0.25 } }}
        transition={{ duration: 1.85, times: [0, 0.45, 1], ease: 'easeInOut' }}
      >
        <Image src="https://lfbwhxvwubzeqkztghok.supabase.co/storage/v1/object/public/imgs/world-cup-style-ball-cartoon-transparent.png" alt="" width={256} height={256} unoptimized className="size-full object-contain drop-shadow-[0_0_8px_rgba(255,255,255,0.32)]" />
      </motion.div>
    </motion.div>
  );
}
