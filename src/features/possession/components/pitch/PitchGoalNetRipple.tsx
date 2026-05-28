'use client';

/**
 * Goal net ripple — the brief rect with the penNet pattern that flashes
 * on penalty + shot goals. The shell wraps this in its own
 * AnimatePresence so a goal-result transition fires the keyframe track.
 *
 * `delay` differs between penalty (0.35) and shot (set by the scene
 * model based on simple-shot or normal flight timing).
 */

import { motion } from 'motion/react';

interface PitchGoalNetRippleProps {
  uniqueKey: 'pen-goal-decor' | 'shot-goal-decor';
  netX: number;
  inward: 1 | -1;
  patternId: string;
  delay: number;
}

export function PitchGoalNetRipple({
  uniqueKey,
  netX,
  inward,
  patternId,
  delay,
}: PitchGoalNetRippleProps) {
  return (
    <motion.g key={uniqueKey}>
      <motion.rect
        x={netX} y="92" width="9" height="46" rx="1"
        fill={`url(#${patternId})`}
        initial={{ opacity: 0 }}
        animate={{
          opacity: [0, 0.8, 0.4, 0],
          x: [netX, netX + 2 * inward, netX + inward, netX],
        }}
        transition={{ duration: 0.5, delay }}
      />
    </motion.g>
  );
}
