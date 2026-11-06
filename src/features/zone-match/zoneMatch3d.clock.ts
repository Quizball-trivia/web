/**
 * The 3D view's clock, in seconds. The match runs on real time; the dev animation lab swaps in one it can slow down,
 * pause and scrub. `rate` scales the frame delta to match.
 */
export interface SceneClock {
  now(): number;
  rate(): number;
}

export const REAL_CLOCK: SceneClock = { now: () => performance.now() / 1000, rate: () => 1 };
