/**
 * Football Darts 501: darts with footballers. Everyone starts on 501; a dart is one named footballer from the leg's category,
 * and his number in it (apps, goals…) comes off. Pure rules: no clock, no I/O (the server owns both).
 */
export const D501 = {
  start: 501,
  /** Landing anywhere from 0 down to this checks out. */
  floor: -10,
  /** A dart scores at most 180, as on a dartboard: a bigger number is a bust. */
  maxDart: 180,
  /** Darts a solo leg allows before it ends without a checkout. */
  soloDarts: 10,
  /** Darts each seat gets in a room leg; after that the lowest remaining wins it. */
  roomDarts: 10,
  legs: 3,
  turnMs: 20_000,
} as const;

/** Totals three darts cannot make. "Pro rules" (optional, off by default) score them as nothing, as Generation Football does. */
export const BOGEYS: ReadonlySet<number> = new Set([163, 166, 169, 172, 173, 175, 176, 178, 179]);

/**
 * score / checkout: the number came off. bust (below the floor) and over180 keep the score; miss = not in the category.
 * bogey: an impossible darts total under pro rules (no score). repeat, unknown and ambiguous are free (the dart is not thrown); time = a room turn ran out (no score).
 */
export type DartVerdict = "score" | "checkout" | "bust" | "over180" | "bogey" | "miss" | "repeat" | "unknown" | "uncovered" | "ambiguous" | "time";

/** Verdicts that use up a dart. */
export const THROWN: ReadonlySet<DartVerdict> = new Set(["score", "checkout", "bust", "over180", "bogey", "miss", "time"]);

export function judgeDart(remaining: number, stat: number | null, pro = false): { verdict: "score" | "checkout" | "bust" | "over180" | "bogey" | "miss"; after: number } {
  if (stat === null) return { verdict: "miss", after: remaining };
  if (stat > D501.maxDart) return { verdict: "over180", after: remaining };
  if (pro && BOGEYS.has(stat)) return { verdict: "bogey", after: remaining };
  const next = remaining - stat;
  if (next < D501.floor) return { verdict: "bust", after: remaining };
  if (next <= 0) return { verdict: "checkout", after: next };
  return { verdict: "score", after: next };
}

/** The numbers that check out from here: [remaining − 10 … remaining] capped at 180, or null when no one dart can. */
export function checkoutWindow(remaining: number): { low: number; high: number } | null {
  if (remaining > D501.maxDart) return null;
  return { low: Math.max(1, remaining), high: Math.min(D501.maxDart, remaining - D501.floor) };
}
