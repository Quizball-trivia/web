import type { Transition } from 'motion/react';

/**
 * Shared motion tokens for the auction mode. Before this, springs and durations
 * were ad-hoc across every screen (stiffness 120→500, damping 12→26, durations
 * 0.25→0.9) which made the mode feel inconsistent. Compose these instead of
 * hand-tuning per component so entrances/exits share one language.
 */

/** Named spring presets. */
export const SPRING = {
  /** Snappy, energetic — badges, crowns, "pop in" accents. */
  pop: { type: 'spring', stiffness: 420, damping: 16 } as Transition,
  /** Calm settle — cards, seats, panels sliding into place. */
  settle: { type: 'spring', stiffness: 260, damping: 24 } as Transition,
  /** Tight snap — countdown numbers, per-tick emphasis. */
  snap: { type: 'spring', stiffness: 460, damping: 18 } as Transition,
} as const;

/** Named easings. */
export const EASE = {
  /** The house cubic-bezier used for reveals/clues. */
  smooth: [0.22, 1, 0.36, 1] as [number, number, number, number],
} as const;

/** Named durations (seconds). Keep the mode snappy — bias short. */
export const DUR = {
  fast: 0.18,
  base: 0.3,
  slow: 0.5,
} as const;

/**
 * Phase-to-phase crossfade. Every auction phase used to hard mount/unmount with
 * no exit; wrap the phase switch in AnimatePresence and give each phase these
 * variants for a smooth, quick handoff. Opacity-only on purpose: a transform on
 * the wrapper would reposition the phases' `position: fixed` children (SoldFlash,
 * the round intro) for the duration of the animation.
 */
export const PHASE_FADE = {
  initial: { opacity: 0 },
  animate: { opacity: 1 },
  exit: { opacity: 0 },
  transition: { duration: DUR.base, ease: EASE.smooth },
} as const;
