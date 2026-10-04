export const ROUNDS_PER_DAY = 10;
export const CLUES_PER_ROUND = 10;
export const MAX_SCORE = ROUNDS_PER_DAY * CLUES_PER_ROUND;

/**
 * Same calendar as the backend (pistas.days.ts): boards land at Argentine midnight, never ahead of time. It has no
 * fixed length: the server's board index (/boards) lists the released days, and the game offers only those.
 */
export const RELEASE_TIME_ZONE = "America/Argentina/Buenos_Aires";
/** First playable (archive) day: guests need closed days to play on launch day. */
export const CONTENT_START = "2026-09-27";
/** First ranked day. */
export const RANKED_START = "2026-09-29";

export type ClueKind = "confed" | "position" | "foot" | "decade" | "fact";
export type LocalizedText = { es: string; en: string; ka?: string; tr?: string };

export interface PistasClue {
  kind: ClueKind;
  icon: string | null;
  text: LocalizedText;
}

export type RoundOutcome = "solved" | "missed";

export interface RoundResult {
  outcome: RoundOutcome;
  clues: number;
  points: number;
}

export const pointsFor = (revealed: number) => CLUES_PER_ROUND + 1 - revealed;

/** Early solves are green, late ones amber/orange, misses red: one row of ten fits a WhatsApp line. */
export type ResultTone = "early" | "mid" | "late" | "missed";

export function resultTone(r: RoundResult): ResultTone {
  if (r.outcome === "missed") return "missed";
  if (r.clues <= 3) return "early";
  if (r.clues <= 6) return "mid";
  return "late";
}

const TONE_EMOJI: Record<ResultTone, string> = { early: "🟩", mid: "🟨", late: "🟧", missed: "🟥" };

/** Share text only: on screen the tones are the soft chips of `pistas.tones`. */
export const resultEmoji = (r: RoundResult): string => TONE_EMOJI[resultTone(r)];

export const resultGrid = (results: readonly RoundResult[]) => results.map(resultEmoji).join("");

export function releaseDay(now: Date = new Date()): string {
  const parts = new Intl.DateTimeFormat("en-CA", { timeZone: RELEASE_TIME_ZONE, year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts(now);
  const get = (type: string) => parts.find((p) => p.type === type)?.value ?? "";
  return `${get("year")}-${get("month")}-${get("day")}`;
}

const DAY_MS = 86_400_000;

export function addDays(day: string, delta: number): string {
  return new Date(Date.parse(`${day}T00:00:00Z`) + delta * DAY_MS).toISOString().slice(0, 10);
}

export const puzzleNumber = (day: string) => Math.round((Date.parse(`${day}T00:00:00Z`) - Date.parse(`${CONTENT_START}T00:00:00Z`)) / DAY_MS) + 1;

/** Newest board the calendar can hold: today's. Null before the first board. Whether it is released is the board index's to say. */
export function latestDay(today: string): string | null {
  return today < CONTENT_START ? null : today;
}

/** Every day the calendar can hold, newest first; the game keeps those the board index lists. */
export function playableDays(today: string): string[] {
  const last = latestDay(today);
  const days: string[] = [];
  if (!last) return days;
  for (let d = last; d >= CONTENT_START; d = addDays(d, -1)) days.push(d);
  return days;
}

/** Today's board counts for the ranking (members only). */
export const isLiveDay = (day: string, today: string) => day === today && day >= RANKED_START;

/** Guests only play closed days; a board is closed once its Argentine day is over. */
export const isClosedDay = (day: string, today: string) => day < today;

/** The board a player lands on: today's for accounts, the newest closed one for guests. */
export function defaultDayFor(today: string, signedIn: boolean): string | null {
  const last = latestDay(today);
  if (!last) return null;
  if (signedIn || isClosedDay(last, today)) return last;
  const yesterday = addDays(last, -1);
  return yesterday >= CONTENT_START ? yesterday : null;
}

/** "Pérez" typed as "  PÉREZ!! " still reads the same; the server applies the same rule. */
export function normalizeGuess(raw: string): string {
  return raw
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .trim();
}
