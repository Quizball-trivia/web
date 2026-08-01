'use client';

import { motion } from 'motion/react';

/**
 * A badge that drops in from above, overshoots, bounces, and settles tilted —
 * the shared animation used by the OUTBID badge, the "rivals want this" ribbon,
 * and the deal-quality badge. Pass the visual styling via `className`/`style`;
 * this component only owns the entrance animation + transform-origin.
 */
export function DropInBadge({
  children,
  className,
  style,
  from = -260,
  landingRotate = 4,
  duration = 0.9,
}: {
  children: React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
  /** Starting Y offset (px above resting position). */
  from?: number;
  /** Final tilt angle in degrees. */
  landingRotate?: number;
  duration?: number;
}) {
  const times = [0, 0.55, 0.74, 0.88, 1];
  return (
    <motion.div
      initial={{ y: from, opacity: 0, rotate: landingRotate - 26, scale: 0.6 }}
      animate={{
        opacity: 1,
        y: [from, 14, -6, 3, 0],
        rotate: [landingRotate - 26, landingRotate, landingRotate - 7, landingRotate + 1, landingRotate],
        scale: [0.6, 1.12, 0.97, 1.02, 1],
      }}
      transition={{
        y: { duration, times, ease: [0.4, 0, 0.7, 0.2] },
        rotate: { duration, times, ease: 'easeOut' },
        scale: { duration, times, ease: 'easeOut' },
        opacity: { duration: 0.15 },
      }}
      style={{ transformOrigin: 'center', ...style }}
      className={className}
    >
      {children}
    </motion.div>
  );
}
