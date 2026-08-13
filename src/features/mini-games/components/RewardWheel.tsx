'use client';

import { motion } from 'motion/react';

export interface WheelSegment {
  label: string;
  value: number;
  color: string;
  /** Text colour over the segment colour. */
  text?: string;
}

/**
 * A pure reward-wheel animator. The PARENT owns everything stateful: it picks
 * the winning index (weighted — see pickWeightedIndex), computes the absolute
 * `rotation` that lands that slice under the top pointer (see rotationForIndex),
 * and flips `spinning`. The wheel just animates to `rotation` and calls
 * `onSettled` when the spin finishes. Keeping selection + rotation in the parent
 * makes the payout weighting explicit and keeps this component side-effect-free.
 */
export function RewardWheel({
  segments,
  rotation,
  spinning,
  onSettled,
  size = 280,
}: {
  segments: WheelSegment[];
  rotation: number;
  spinning: boolean;
  onSettled: () => void;
  size?: number;
}) {
  const n = segments.length;
  const slice = 360 / n;
  const gradient = `conic-gradient(from -${slice / 2}deg, ${segments
    .map((s, i) => `${s.color} ${i * slice}deg ${(i + 1) * slice}deg`)
    .join(', ')})`;

  return (
    <div className="relative mx-auto" style={{ width: size, height: size }}>
      {/* Pointer */}
      <div
        className="absolute left-1/2 top-[-6px] z-20 -translate-x-1/2"
        style={{ width: 0, height: 0, borderLeft: '12px solid transparent', borderRight: '12px solid transparent', borderTop: '20px solid #FFE500' }}
      />
      {/* Wheel */}
      <motion.div
        className="absolute inset-0 rounded-full border-[6px] border-white/15 shadow-[0_10px_40px_rgba(0,0,0,0.5)]"
        style={{ background: gradient }}
        animate={{ rotate: rotation }}
        transition={{ duration: spinning ? 3.8 : 0, ease: [0.16, 1, 0.3, 1] }}
        onAnimationComplete={() => {
          if (spinning) onSettled();
        }}
      >
        {segments.map((s, i) => {
          const angle = i * slice + slice / 2;
          return (
            <div
              key={i}
              className="absolute left-1/2 top-1/2 origin-left"
              style={{ transform: `rotate(${angle - 90}deg) translateX(6px)` }}
            >
              <span
                className="inline-block font-poppins text-xs font-black tabular-nums"
                style={{ transform: `translate(-2px,-50%) rotate(90deg)`, color: s.text ?? '#0b0f14', width: size / 2 - 22, textAlign: 'right' }}
              >
                {s.label}
              </span>
            </div>
          );
        })}
      </motion.div>
      {/* Hub */}
      <div className="absolute left-1/2 top-1/2 z-10 size-12 -translate-x-1/2 -translate-y-1/2 rounded-full border-4 border-white/20 bg-surface-page shadow-inner" />
    </div>
  );
}

/** Weighted random index from parallel weights (bigger weight = more likely). */
export function pickWeightedIndex(weights: number[]): number {
  const total = weights.reduce((s, w) => s + w, 0);
  let r = Math.random() * total;
  for (let i = 0; i < weights.length; i += 1) {
    r -= weights[i];
    if (r <= 0) return i;
  }
  return weights.length - 1;
}

/** Absolute rotation (deg) that lands `index`'s slice under the top pointer,
 *  continuing forward from `prevRotation` with several full turns + jitter. */
export function rotationForIndex(index: number, count: number, prevRotation: number): number {
  const slice = 360 / count;
  const sliceCenter = index * slice + slice / 2;
  const jitter = (Math.random() - 0.5) * (slice * 0.6);
  const base = prevRotation - (prevRotation % 360);
  return base + 360 * 5 + (360 - sliceCenter) - jitter;
}
