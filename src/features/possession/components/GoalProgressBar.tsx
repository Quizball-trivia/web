'use client';

import { motion } from 'motion/react';

interface GoalProgressBarProps {
  /**
   * Current possession position, 0–100. 50 = midfield (even). 100 = the
   * player's goal threshold. The bar shows the player's progress toward
   * scoring: 0 (even or losing) up to 100 (goal).
   *
   * MUST be the TRUE possession value (server clamp 0..100) — never the
   * 10..90 field-clamped pitch position. The score below is derived as
   * (position − 50) × 2, so a field-clamped input silently caps the meter at
   * 80 while the score flight shows the real points (the +90 vs 80 bug).
   */
  position: number;
  /** Layout: vertical (web, alongside the pitch) or horizontal (mobile, under it). */
  orientation: 'vertical' | 'horizontal';
  /**
   * When true (second half), the bar is flipped to match the flipped pitch:
   * the goal (100) sits at the bottom and the fill grows downward.
   */
  mirrored?: boolean;
  fillColor?: string;
}

const FILL_COLOR = '#FFE500';
// Goal threshold (100) — green to read as the positive "score" target (brand-green).
const GOAL_COLOR = '#38B60E';

/**
 * Single "race to 100" meter: shows the player's own points filling toward a
 * goal at 100. Makes the "score 100 to goal" rule obvious without showing the
 * opponent's progress.
 */
export function GoalProgressBar({
  position,
  orientation,
  mirrored = false,
  fillColor = FILL_COLOR,
}: GoalProgressBarProps) {
  // Player's progress toward their goal: 0 (even/losing) → 100 (goal).
  const score = Math.max(0, Math.min(100, Math.round((position - 50) * 2)));

  if (orientation === 'horizontal') {
    return (
      <div className="w-full px-3 py-2">
        <div
          className="mb-1.5 flex items-baseline justify-between font-poppins leading-none"
          style={mirrored ? { flexDirection: 'row-reverse' } : undefined}
        >
          <span className="text-2xl font-black tabular-nums" style={{ color: fillColor }}>{score}</span>
          <span className="text-base font-black tabular-nums" style={{ color: GOAL_COLOR }}>100</span>
        </div>
        <div className="relative h-3 w-full overflow-hidden rounded-full bg-white/10">
          <motion.div
            className="absolute top-0 h-full rounded-full"
            style={{ backgroundColor: fillColor, ...(mirrored ? { right: 0 } : { left: 0 }) }}
            animate={{ width: `${score}%` }}
            transition={{ type: 'spring', stiffness: 200, damping: 26 }}
          />
        </div>
      </div>
    );
  }

  // Vertical (web): fills toward the goal (100) at the player's attacking end.
  // First half the goal is at the top and the fill grows up; in the second half
  // the pitch flips, so the goal moves to the bottom and the fill grows down.
  // The score rides on the tip of the fill as it grows.
  return (
    <div className="flex h-full flex-col items-center py-2">
      {!mirrored && (
        <span className="mb-2 font-poppins text-lg font-black tabular-nums leading-none" style={{ color: GOAL_COLOR }}>
          100
        </span>
      )}
      <div className="relative w-3 flex-1 rounded-full bg-white/10">
        {/* white goal line at the goal end of the track */}
        <span
          className="absolute left-1/2 z-10 h-[3px] w-5 -translate-x-1/2 rounded-full bg-white"
          style={mirrored ? { bottom: '-1px' } : { top: '-1px' }}
        />
        <motion.div
          className="absolute left-0 w-full rounded-full"
          style={{ backgroundColor: fillColor, ...(mirrored ? { top: 0 } : { bottom: 0 }) }}
          animate={{ height: `${score}%` }}
          transition={{ type: 'spring', stiffness: 200, damping: 26 }}
        />
        {/* score + tick ride on the LEFT of the fill's tip */}
        <motion.div
          className="absolute right-full z-10 mr-1 flex items-center gap-1"
          animate={mirrored ? { top: `calc(${score}% - 0.5rem)` } : { bottom: `calc(${score}% - 0.5rem)` }}
          transition={{ type: 'spring', stiffness: 200, damping: 26 }}
        >
          <span className="font-poppins text-lg font-black tabular-nums leading-none" style={{ color: fillColor }}>
            {score}
          </span>
          <span className="block h-[2px] w-2 rounded-full" style={{ backgroundColor: fillColor }} />
        </motion.div>
      </div>
      {mirrored && (
        <span className="mt-2 font-poppins text-lg font-black tabular-nums leading-none" style={{ color: GOAL_COLOR }}>
          100
        </span>
      )}
    </div>
  );
}
