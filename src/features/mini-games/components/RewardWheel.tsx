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
  const lights = Array.from({ length: 12 }, (_, i) => (i * 360) / 12);

  return (
    <div className="relative mx-auto" style={{ width: size, height: size }}>
      {/* Pointer — ratchet-ticks while the wheel spins */}
      <motion.div
        className="absolute left-1/2 top-[-8px] z-30 -translate-x-1/2 origin-top"
        animate={spinning ? { rotate: [-9, 3, -9] } : { rotate: 0 }}
        transition={spinning ? { duration: 0.18, repeat: Infinity, ease: 'easeInOut' } : { type: 'spring', stiffness: 500, damping: 12 }}
        style={{ filter: 'drop-shadow(0 3px 4px rgba(0,0,0,0.45))' }}
      >
        <div style={{ width: 0, height: 0, borderLeft: '13px solid transparent', borderRight: '13px solid transparent', borderTop: '24px solid #FFE500' }} />
        <div className="absolute left-1/2 top-[2px] size-2 -translate-x-1/2 rounded-full bg-white/80" />
      </motion.div>

      {/* Static outer rim with carnival lights */}
      <div className="absolute inset-[-10px] z-20 rounded-full border-[3px] border-[#2b2417] bg-transparent shadow-[0_14px_44px_rgba(0,0,0,0.55),inset_0_2px_10px_rgba(255,229,0,0.15)]" style={{ background: 'radial-gradient(circle, transparent 62%, #171310 63%)' }}>
        {lights.map((deg, i) => (
          <motion.span
            key={deg}
            className="absolute left-1/2 top-1/2 size-2 rounded-full bg-brand-yellow"
            style={{ transform: `translate(-50%,-50%) rotate(${deg}deg) translateY(-${size / 2 + 5}px)` }}
            animate={spinning ? { opacity: [0.25, 1, 0.25] } : { opacity: 0.55 }}
            transition={spinning ? { duration: 0.5, repeat: Infinity, delay: i * 0.045 } : { duration: 0.3 }}
          />
        ))}
      </div>

      {/* Wheel — overshoots past the target then ratchets back */}
      <motion.div
        className="absolute inset-0 rounded-full border-[6px] border-[#171310]"
        style={{ background: gradient }}
        animate={{ rotate: spinning ? [null, rotation + slice * 0.42, rotation] : rotation }}
        transition={
          spinning
            ? { duration: 4.6, times: [0, 0.86, 1], ease: [[0.12, 0.82, 0.2, 1], 'easeOut'] }
            : { duration: 0 }
        }
        onAnimationComplete={() => {
          if (spinning) onSettled();
        }}
      >
        {/* Slice separators */}
        {segments.map((_, i) => (
          <div
            key={`sep-${i}`}
            className="absolute left-1/2 top-0 h-1/2 w-[2px] origin-bottom bg-white/20"
            style={{ transform: `translateX(-50%) rotate(${i * slice - slice / 2}deg)` }}
          />
        ))}
        {segments.map((s, i) => {
          const angle = i * slice + slice / 2;
          return (
            // Rotate a full-size frame to the slice's mid-angle, then park the
            // label at the top — dead centre of the slice, reading outward.
            <div key={i} className="absolute inset-0" style={{ transform: `rotate(${angle}deg)` }}>
              <span
                className="absolute left-1/2 top-[14%] -translate-x-1/2 font-poppins font-black tabular-nums"
                style={{
                  fontSize: s.label.length > 4 ? 13 : 16,
                  color: s.text ?? '#0b0f14',
                  textShadow: s.text ? '0 1px 2px rgba(0,0,0,0.55)' : '0 1px 1px rgba(255,255,255,0.25)',
                }}
              >
                {s.label}
              </span>
            </div>
          );
        })}
        {/* Gloss + depth overlay */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 rounded-full"
          style={{
            background:
              'radial-gradient(circle at 50% 32%, rgba(255,255,255,0.22), transparent 58%), radial-gradient(circle at 50% 50%, transparent 58%, rgba(0,0,0,0.30) 100%)',
          }}
        />
      </motion.div>

      {/* Hub */}
      <div className="absolute left-1/2 top-1/2 z-10 flex size-14 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border-4 border-brand-yellow/80 bg-[#171310] text-xl shadow-[0_2px_10px_rgba(0,0,0,0.6),inset_0_1px_4px_rgba(255,229,0,0.3)]">
        ⚽
      </div>
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
  const jitter = (Math.random() - 0.5) * (slice * 0.5);
  const base = prevRotation - (prevRotation % 360);
  return base + 360 * 6 + (360 - sliceCenter) - jitter;
}
