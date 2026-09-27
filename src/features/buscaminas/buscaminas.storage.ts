import type { BuscaminasRun } from "@/lib/repositories/buscaminas.repo";

const SCHEMA = 2;
/** Runs are signed for one player: a guest run and each account's run live under their own key. */
const key = (day: string, owner: string) => `qb.buscaminas.v${SCHEMA}.${day}.${owner}`;

interface Saved {
  schema: number;
  contentVersion: number;
  run: BuscaminasRun;
}

function isRun(value: unknown): value is BuscaminasRun {
  if (!value || typeof value !== "object") return false;
  const run = value as BuscaminasRun;
  return typeof run.token === "string" && Boolean(run.state) && Array.isArray(run.state.results) && typeof run.state.done === "boolean";
}

/** The signed run for a day on this device. A content correction (new contentVersion) drops it. */
export function loadRun(day: string, contentVersion: number, owner: string): BuscaminasRun | null {
  try {
    const raw = window.localStorage.getItem(key(day, owner));
    if (!raw) return null;
    const saved = JSON.parse(raw) as Saved;
    if (saved.schema !== SCHEMA || !isRun(saved.run)) return null;
    // A corrected day: drop the old result so the archive and streak stop counting it.
    if (saved.contentVersion !== contentVersion) {
      window.localStorage.removeItem(key(day, owner));
      return null;
    }
    return saved.run;
  } catch {
    return null;
  }
}

export function saveRun(day: string, contentVersion: number, run: BuscaminasRun, owner: string): void {
  try {
    window.localStorage.setItem(key(day, owner), JSON.stringify({ schema: SCHEMA, contentVersion, run } satisfies Saved));
  } catch {
    // Private mode or a full quota: the game still plays, it just won't resume on this device.
  }
}

export function clearRun(day: string, owner: string): void {
  try {
    window.localStorage.removeItem(key(day, owner));
  } catch {
    // Nothing to clear.
  }
}

/** Finished-day scores on this device, for the archive list and the streak. */
/** `versions` (published index) drops results from before a content correction without opening each day. */
export function finishedScores(days: readonly string[], owner: string, versions?: Record<string, number>): Record<string, number> {
  const out: Record<string, number> = {};
  for (const day of days) {
    try {
      const raw = window.localStorage.getItem(key(day, owner));
      if (!raw) continue;
      const saved = JSON.parse(raw) as Saved;
      if (versions?.[day] !== undefined && saved.contentVersion !== versions[day]) continue;
      if (isRun(saved.run) && saved.run.state.done) out[day] = saved.run.state.score;
    } catch {
      // Ignore a corrupt entry.
    }
  }
  return out;
}

/** Days with a started run that has not reached the result screen yet. */
export function inProgressDays(days: readonly string[], owner: string, versions?: Record<string, number>): Set<string> {
  const out = new Set<string>();
  for (const day of days) {
    try {
      const raw = window.localStorage.getItem(key(day, owner));
      if (!raw) continue;
      const saved = JSON.parse(raw) as Saved;
      if (versions?.[day] !== undefined && saved.contentVersion !== versions[day]) continue;
      if (isRun(saved.run) && !saved.run.state.done) out.add(day);
    } catch {
      // Ignore a corrupt entry.
    }
  }
  return out;
}

/** Consecutive finished days ending today (or yesterday, so an unplayed today doesn't read as a broken streak). */
export function streakFrom(daysNewestFirst: readonly string[], finished: Record<string, number>): number {
  let streak = 0;
  for (const [i, day] of daysNewestFirst.entries()) {
    if (day in finished) streak += 1;
    else if (i === 0) continue;
    else break;
  }
  return streak;
}
