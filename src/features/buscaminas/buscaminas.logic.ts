export const ROUNDS_PER_DAY = 20;
export const CARDS_PER_ROUND = 16;
export const TARGETS_PER_ROUND = 12;
export const PERFECT_BONUS = 3;
export const MAX_SCORE = ROUNDS_PER_DAY * (TARGETS_PER_ROUND + PERFECT_BONUS);

/**
 * The release calendar follows Buenos Aires: the launch audience is Argentine, so the new board lands at their midnight.
 * It has no fixed length: the server's board index (/boards) lists the released days, and the last of them ends the
 * calendar. Helpers take that `lastDay`; while the index has not loaded it is `undefined` and today counts as released.
 */
export const RELEASE_TIME_ZONE = "America/Argentina/Buenos_Aires";
export const LAUNCH_DAY = "2026-09-26";
/** The calendar's last day: a date once the board index is known, null when it lists no board, undefined until it loads. */
export type LastDay = string | null | undefined;

export type Difficulty = "easy" | "medium" | "hard";

/** Public card: whether it fits the clue is only known to the server until the round settles. */
export interface BuscaminasCard {
  id: string;
  name: string;
  img: string;
}

export interface BuscaminasRound {
  id: string;
  difficulty: Difficulty;
  prompt: { es: string; en: string; ka?: string; tr?: string };
  cards: BuscaminasCard[];
}

export interface BuscaminasDay {
  day: string;
  number: number;
  contentVersion?: number;
  rounds: BuscaminasRound[];
}

export type RoundOutcome = "perfect" | "banked" | "mine";

export interface RoundResult {
  outcome: RoundOutcome;
  found: number;
  points: number;
}

export const outcomeEmoji: Record<RoundOutcome, string> = { perfect: "🟩", banked: "🟨", mine: "🟥" };

/** Two rows of ten squares: fits a WhatsApp line on a phone. */
export function resultGrid(results: readonly RoundResult[]): string {
  const squares = results.map((r) => outcomeEmoji[r.outcome]);
  const rows: string[] = [];
  for (let i = 0; i < squares.length; i += 10) rows.push(squares.slice(i, i + 10).join(""));
  return rows.join("\n");
}

/** Calendar date (YYYY-MM-DD) in the release time zone. */
export function releaseDay(now: Date = new Date()): string {
  const parts = new Intl.DateTimeFormat("en-CA", { timeZone: RELEASE_TIME_ZONE, year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts(now);
  const get = (type: string) => parts.find((p) => p.type === type)?.value ?? "";
  return `${get("year")}-${get("month")}-${get("day")}`;
}

const DAY_MS = 86_400_000;
const dayNumber = (day: string) => Math.round((Date.parse(`${day}T00:00:00Z`) - Date.parse(`${LAUNCH_DAY}T00:00:00Z`)) / DAY_MS) + 1;

export function addDays(day: string, delta: number): string {
  return new Date(Date.parse(`${day}T00:00:00Z`) + delta * DAY_MS).toISOString().slice(0, 10);
}

/** The last released day in a board index: the newest day it lists (the server lists only released days). */
export function lastReleasedDay(days: Iterable<string>): string | null {
  let last: string | null = null;
  for (const day of days) if (day >= LAUNCH_DAY && (last === null || day > last)) last = day;
  return last;
}

/** Published puzzle for a release day: before launch → the first; after the last released day → that day (never a silent re-run). */
export function puzzleDayFor(today: string, lastDay?: LastDay): string {
  if (dayNumber(today) < 1) return LAUNCH_DAY;
  return lastDay && today > lastDay ? lastDay : today;
}

/** Days a player may open: launch through today's puzzle, newest first. */
export function playableDays(today: string, lastDay?: LastDay): string[] {
  const days: string[] = [];
  if (lastDay === null) return days;
  for (let d = puzzleDayFor(today, lastDay); dayNumber(d) >= 1; d = addDays(d, -1)) days.push(d);
  return days;
}

export const puzzleNumber = (day: string) => dayNumber(day);

/**
 * Guests play the previous (closed) board; today's board and its ranking need an account.
 * Must match the backend's BUSCAMINAS_GUESTS_PLAY_LIVE (default false).
 */
export const GUESTS_PLAY_LIVE = false;

/** Today's board is live (ranked) only while today is a released day. */
export const isLiveDay = (day: string, today: string, lastDay?: LastDay) =>
  day === today && dayNumber(today) >= 1 && (lastDay === undefined || (lastDay !== null && today <= lastDay));

/** The board a player lands on: today's for accounts, yesterday's for guests while today's is live. */
export function defaultDayFor(today: string, signedIn: boolean, lastDay?: LastDay): string {
  const live = puzzleDayFor(today, lastDay);
  if (signedIn || GUESTS_PLAY_LIVE || !isLiveDay(live, today, lastDay)) return live;
  const yesterday = addDays(live, -1);
  return dayNumber(yesterday) >= 1 ? yesterday : live;
}
