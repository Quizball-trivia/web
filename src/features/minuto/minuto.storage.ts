import type { MinutoRun } from "@/lib/repositories/minuto.repo";

const SCHEMA = 1;
/** One entry per board and player: a guest's run and each account's run never mix. */
const key = (day: string, owner: string) => `qb.minuto.v${SCHEMA}.${day}.${owner}`;

interface Saved {
  schema: number;
  contentVersion: number;
  run: MinutoRun;
}

function isRun(value: unknown): value is MinutoRun {
  if (!value || typeof value !== "object") return false;
  const run = value as MinutoRun;
  return typeof run.run?.id === "string" && typeof run.run?.version === "number" && Array.isArray(run.state?.results) && typeof run.state?.done === "boolean";
}

function read(day: string, owner: string): Saved | null {
  try {
    const raw = window.localStorage.getItem(key(day, owner));
    if (!raw) return null;
    const saved = JSON.parse(raw) as Saved;
    return saved.schema === SCHEMA && isRun(saved.run) ? saved : null;
  } catch {
    return null;
  }
}

/** The run cached on this device for a board; a corrected board (new contentVersion) drops it. */
export function loadRun(day: string, contentVersion: number, owner: string): MinutoRun | null {
  const saved = read(day, owner);
  if (!saved) return null;
  if (saved.contentVersion !== contentVersion) {
    clearRun(day, owner);
    return null;
  }
  return saved.run;
}

export function saveRun(day: string, contentVersion: number, run: MinutoRun, owner: string): void {
  try {
    window.localStorage.setItem(key(day, owner), JSON.stringify({ schema: SCHEMA, contentVersion, run } satisfies Saved));
  } catch {
    // Private mode or a full quota: the game still plays, it just won't show in the archive.
  }
}

export function clearRun(day: string, owner: string): void {
  try {
    window.localStorage.removeItem(key(day, owner));
  } catch {
    // Nothing to clear.
  }
}

/** A run the server has finished that this device doesn't know as finished (nothing cached, or a run still open); null when there is nothing to adopt. */
export function finishedFromServer(local: MinutoRun | null, server: MinutoRun | { run: null }): MinutoRun | null {
  if (server.run === null || !server.state.done || local?.state.done) return null;
  return server;
}

/** Finished boards on this device (score), for the archive list and the streak. */
export function finishedScores(days: readonly string[], owner: string, versions?: Record<string, number>): Record<string, number> {
  const out: Record<string, number> = {};
  for (const day of days) {
    const saved = read(day, owner);
    if (!saved || (versions?.[day] !== undefined && saved.contentVersion !== versions[day])) continue;
    if (saved.run.state.done) out[day] = saved.run.state.score;
  }
  return out;
}

export function inProgressDays(days: readonly string[], owner: string, versions?: Record<string, number>): Set<string> {
  const out = new Set<string>();
  for (const day of days) {
    const saved = read(day, owner);
    if (!saved || (versions?.[day] !== undefined && saved.contentVersion !== versions[day])) continue;
    if (!saved.run.state.done) out.add(day);
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
