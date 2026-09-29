import { addDays, releaseDay, RELEASE_TIME_ZONE } from "@/features/pistas/pistas.logic";

export { addDays, releaseDay, RELEASE_TIME_ZONE };

export const CATEGORIES_PER_DAY = 5;
/** Solo points: one per answer named, plus this for naming a whole list. */
export const COMPLETE_BONUS = 5;
export const MAX_MISSES = 3;
/** The category title shows this long before its first answer clock starts (the server's clock includes it). */
export const REVEAL_MS = 3_500;
/** Five lists of at most 60 answers, plus the bonus for each whole list. */
export const MAX_SCORE = CATEGORIES_PER_DAY * 60 + CATEGORIES_PER_DAY * COMPLETE_BONUS;

/** Same calendar as the backend (ultimo.days.ts): boards land at Argentine midnight, never ahead of time. */
export const CONTENT_START = "2026-09-28";
export const RANKED_START = "2026-09-30";
export const PUBLISHED_DAYS = 30;
export const LAST_DAY = addDays(CONTENT_START, PUBLISHED_DAYS - 1);

export type LocalizedText = { es: string; en: string; ka?: string; tr?: string };
export type EndReason = "time" | "misses" | "complete";

export interface CategoryResult {
  named: number;
  complete: boolean;
  reason: EndReason;
  points: number;
  /** A category already played: its title and size (never its names). */
  title: LocalizedText | null;
  total: number | null;
}

const DAY_MS = 86_400_000;
export const puzzleNumber = (day: string) => Math.round((Date.parse(`${day}T00:00:00Z`) - Date.parse(`${CONTENT_START}T00:00:00Z`)) / DAY_MS) + 1;

/** Newest playable board: today's, or the last published one once the run of boards is over. Null before the first board. */
export function latestDay(today: string): string | null {
  if (today < CONTENT_START) return null;
  return today > LAST_DAY ? LAST_DAY : today;
}

/** Today's board counts for the ranking (members only). */
export const isLiveDay = (day: string, today: string) => day === today && day >= RANKED_START && day <= LAST_DAY;

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

/** Share tiles, never red (a short list is still a result): whole list, half or more, some, none. */
export type Tier = "complete" | "good" | "some" | "none";
export const tierOf = (r: Pick<CategoryResult, "complete" | "named">, total: number | null): Tier =>
  r.complete ? "complete" : total !== null && r.named * 2 >= total ? "good" : r.named > 0 ? "some" : "none";
export const TIER_EMOJI: Record<Tier, string> = { complete: "🟨", good: "🟩", some: "🟦", none: "⬛" };

/** Every day a player may open, newest first. */
export function playableDays(today: string): string[] {
  const last = latestDay(today);
  const days: string[] = [];
  if (!last) return days;
  for (let d = last; d >= CONTENT_START; d = addDays(d, -1)) days.push(d);
  return days;
}
