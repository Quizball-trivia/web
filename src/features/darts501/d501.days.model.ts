import type { D501BoardKind, D501CalendarDay, D501Days, D501MyDay, D501Tier } from "./d501.api";

/** The player's own result of a day, as the calendar draws it. */
export type MyResult =
  | { state: "out"; darts: number }
  | { state: "left"; left: number }
  | { state: "gaveUp"; left: number }
  | { state: "started"; left: number; darts: number }
  | { state: "none" }
  /** The player's results have not loaded (or failed): nothing is shown as played or unplayed. */
  | { state: "unknown" };

/**
 * One day on the calendar. `closed: false` (today, until both clocks close it): only number and tier are known, the
 * category is the day's ranked secret, so its picture, type, subject and title are null and it never matches a type or
 * text filter.
 */
export interface CalDay {
  day: string; number: number; tier: D501Tier; closed: boolean;
  title: string | null; unit: string | null; kind: D501BoardKind | null; subject: string | null; competition: string | null;
  crest?: string; crests?: string[]; flag?: string;
  stats: { players: number; checkouts: number; bestDarts: number | null } | null;
  mine: MyResult; stale: boolean;
}

export interface CalModel {
  today: string;
  /** The last day the calendar may show: the end of the seeded run from today (today itself when there is none). */
  lastSeeded: string;
  /** Seeded days up to today, newest first. */
  days: CalDay[];
  /** The player's own results: loaded, still loading, or unavailable (then nothing is counted as unplayed). */
  history: "ready" | "loading" | "failed";
  todayMissing: boolean;
  tomorrowSeeded: boolean;
}

const UNIT_KIND: Record<string, D501BoardKind> = { apps: "apps", goals: "goals", caps: "nt", apps_minus_goals: "minus", market_value_eur_m: "value" };

export function mineOf(r: D501MyDay | undefined): MyResult {
  if (!r) return { state: "none" };
  // An unfinished run on corrected content starts over when reopened; a finished one keeps its result.
  if (!r.done) return r.stale || r.darts === 0 ? { state: "none" } : { state: "started", left: r.remaining, darts: r.darts };
  if (r.checkedOut) return { state: "out", darts: r.darts };
  if (r.gaveUp) return { state: "gaveUp", left: r.remaining };
  return { state: "left", left: r.remaining };
}

function calDay(d: D501CalendarDay, mine: D501MyDay | undefined, known: boolean): CalDay {
  const base = { day: d.day, number: d.number, tier: d.tier, closed: d.closed, mine: known ? mineOf(mine) : { state: "unknown" as const }, stale: mine?.stale === true && mine.done };
  if (!d.closed) return { ...base, title: null, unit: null, kind: null, subject: null, competition: null, stats: null };
  const card = d.card;
  return {
    ...base, title: d.title, unit: d.unit, kind: card?.kind ?? UNIT_KIND[d.unit] ?? null, subject: card?.subject ?? null, competition: card?.competition ?? null,
    ...(card?.crest ? { crest: card.crest } : {}), ...(card?.crests ? { crests: card.crests } : {}), ...(card?.flag ? { flag: card.flag } : {}),
    stats: d.stats,
  };
}

export function buildModel(index: D501Days, mine: Record<string, D501MyDay> | null | undefined): CalModel {
  const days = index.days.filter((d) => d.day <= index.today).map((d) => calDay(d, mine?.[d.day], mine != null)).reverse();
  return {
    history: mine === undefined ? "loading" : mine === null ? "failed" : "ready",
    today: index.today,
    lastSeeded: index.seededThrough ?? index.today,
    days,
    todayMissing: !index.todaySeeded,
    tomorrowSeeded: index.tomorrowSeeded,
  };
}

export const isDone = (m: MyResult) => m.state === "out" || m.state === "left" || m.state === "gaveUp";

export interface PlayerStats { played: number; total: number; outs: number; bestDarts: number | null; streak: number }

/** Totals over the listed days; the streak runs back from today (or yesterday, while today is still unplayed). */
export function playerStats(days: CalDay[], today: string): PlayerStats {
  let played = 0;
  let outs = 0;
  let best: number | null = null;
  let streak = 0;
  for (const d of days) {
    if (!isDone(d.mine)) continue;
    played += 1;
    if (d.mine.state === "out") { outs += 1; best = best === null ? d.mine.darts : Math.min(best, d.mine.darts); }
  }
  // Today without a board (or not played yet) does not break the run of days before it.
  let expected = days[0]?.day === today ? today : addDays(today, -1);
  for (const d of days) {
    if (d.day !== expected) break;
    if (isDone(d.mine)) streak += 1;
    else if (d.day !== today) break;
    expected = addDays(expected, -1);
  }
  return { played, total: days.length, outs, bestDarts: best, streak };
}

export function groupByMonth(days: CalDay[]): Array<{ key: string; days: CalDay[] }> {
  const out: Array<{ key: string; days: CalDay[] }> = [];
  for (const d of days) {
    const key = d.day.slice(0, 7);
    if (out[out.length - 1]?.key !== key) out.push({ key, days: [] });
    out[out.length - 1].days.push(d);
  }
  return out;
}

export type StatusFilter = "all" | "todo" | "done";
export interface DayFilter { query: string; kind: D501BoardKind | "all"; status: StatusFilter }
export const NO_FILTER: DayFilter = { query: "", kind: "all", status: "all" };
export const isFiltering = (f: DayFilter) => f.query.trim() !== "" || f.kind !== "all" || f.status !== "all";

/** `labels`: the day's other searchable words (date, month, competition name) in the viewer's language. */
export function matchesFilter(d: CalDay, f: DayFilter, labels: string[] = []): boolean {
  if (f.kind !== "all" && d.kind !== f.kind) return false;
  if (f.status === "todo" && isDone(d.mine)) return false;
  if (f.status === "done" && !isDone(d.mine)) return false;
  const q = f.query.trim().toLowerCase();
  if (!q) return true;
  const words = d.closed ? [d.subject, d.title, d.competition, ...labels] : labels;
  return [...words, `#${d.number}`].filter(Boolean).join(" ").toLowerCase().includes(q);
}

const DAY_MS = 86_400_000;
export const addDays = (day: string, n: number) => new Date(Date.parse(`${day}T00:00:00Z`) + n * DAY_MS).toISOString().slice(0, 10);
export const daysBetween = (a: string, b: string) => Math.round((Date.parse(`${b}T00:00:00Z`) - Date.parse(`${a}T00:00:00Z`)) / DAY_MS);
export const monthOf = (day: string) => day.slice(0, 7);
export function addMonths(month: string, n: number): string {
  const [y, m] = month.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1 + n, 1)).toISOString().slice(0, 7);
}

/** The next board drop: midnight in Buenos Aires (UTC−3, no daylight saving), as an instant. */
export function nextDrop(now = Date.now()): { at: Date; inMs: number } {
  const d = new Date(now);
  let at = Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate(), 3);
  if (at <= now) at += DAY_MS;
  return { at: new Date(at), inMs: at - now };
}
