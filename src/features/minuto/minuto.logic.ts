export const GOALS_PER_DAY = 10;
export const MAX_SCORE = GOALS_PER_DAY * 3;
export const MIN_MINUTE = 1;
export const MAX_MINUTE = 130;

/** Same calendar as the backend (minuto.days.ts): boards land at Argentine midnight, never ahead of time. */
export const RELEASE_TIME_ZONE = "America/Argentina/Buenos_Aires";
/** First playable (archive) day: guests need closed days to play on launch day. */
export const CONTENT_START = "2026-09-29";
/** First ranked day. */
export const RANKED_START = "2026-10-02";
export const PUBLISHED_DAYS = 75;

export type MinutoLocale = "es" | "en" | "ka" | "tr";
export type LocalizedName = Record<MinutoLocale, string>;
export type Competition = "FIWC" | "EURO" | "COPA" | "CL" | "EL" | "CLI" | "KLUB" | "USC";
export type Stage = "final" | "third" | "semi" | "quarter" | "r16" | "r32" | "group" | "playoff" | "other";

export type MinutoTeam =
  | { kind: "nation"; flag: string; name: LocalizedName }
  | { kind: "club"; crest: string | null; name: LocalizedName };

/** A goal card as the server sends it before the guess: never its minute. */
export interface MinutoGoalCard {
  id: string;
  tier: "easy" | "medium" | "hard";
  comp: Competition;
  year: number;
  date: string;
  stage: Stage;
  group: string | null;
  leg: 1 | 2 | null;
  home: MinutoTeam;
  away: MinutoTeam;
  score: [number, number];
  aet: boolean;
  pens: [number, number] | null;
  side: "home" | "away";
  scorer: { name: LocalizedName; photo: string | null };
  penalty: boolean;
  scoreAfter: [number, number];
  image: { src: string; credit: string; license: string } | null;
}

export interface MinuteValue { base: number; added: number }

export interface GoalResult {
  goal: string;
  guess: number;
  answer: MinuteValue;
  diff: number;
  points: number;
}

/** "90+4'" for added time, "116'" otherwise. */
export const formatMinute = (m: MinuteValue): string => (m.added > 0 ? `${m.base}+${m.added}'` : `${m.base}'`);
export const minuteNumber = (m: MinuteValue): number => m.base + m.added;

/** Exact = green, close = yellow/orange, far = red: one row of ten fits a WhatsApp line. */
export type ResultTone = "exact" | "close" | "near" | "far";

export function resultTone(r: Pick<GoalResult, "diff">): ResultTone {
  if (r.diff === 0) return "exact";
  if (r.diff <= 2) return "close";
  if (r.diff <= 5) return "near";
  return "far";
}

const TONE_EMOJI: Record<ResultTone, string> = { exact: "🟩", close: "🟨", near: "🟧", far: "🟥" };
export const resultEmoji = (r: Pick<GoalResult, "diff">): string => TONE_EMOJI[resultTone(r)];
export const resultGrid = (results: readonly Pick<GoalResult, "diff">[]) => results.map(resultEmoji).join("");

export function releaseDay(now: Date = new Date()): string {
  const parts = new Intl.DateTimeFormat("en-CA", { timeZone: RELEASE_TIME_ZONE, year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts(now);
  const get = (type: string) => parts.find((p) => p.type === type)?.value ?? "";
  return `${get("year")}-${get("month")}-${get("day")}`;
}

const DAY_MS = 86_400_000;

export function addDays(day: string, delta: number): string {
  return new Date(Date.parse(`${day}T00:00:00Z`) + delta * DAY_MS).toISOString().slice(0, 10);
}

export const LAST_DAY = addDays(CONTENT_START, PUBLISHED_DAYS - 1);

export const puzzleNumber = (day: string) => Math.round((Date.parse(`${day}T00:00:00Z`) - Date.parse(`${CONTENT_START}T00:00:00Z`)) / DAY_MS) + 1;

export function latestDay(today: string): string | null {
  if (today < CONTENT_START) return null;
  return today > LAST_DAY ? LAST_DAY : today;
}

export function playableDays(today: string): string[] {
  const last = latestDay(today);
  const days: string[] = [];
  if (!last) return days;
  for (let d = last; d >= CONTENT_START; d = addDays(d, -1)) days.push(d);
  return days;
}

export const isLiveDay = (day: string, today: string) => day === today && day >= RANKED_START && day <= LAST_DAY;
export const isClosedDay = (day: string, today: string) => day < today;

/** Whole minutes only; added time is typed as base + added (45+2 → 47). Null for anything else. */
export function parseMinute(raw: string): number | null {
  const text = raw.trim();
  const plus = /^(\d{1,3})\s*\+\s*(\d{1,2})$/.exec(text);
  const value = plus ? Number(plus[1]) + Number(plus[2]) : /^\d{1,3}$/.test(text) ? Number(text) : NaN;
  return Number.isInteger(value) && value >= MIN_MINUTE && value <= MAX_MINUTE ? value : null;
}
