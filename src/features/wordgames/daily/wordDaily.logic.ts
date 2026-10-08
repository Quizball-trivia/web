import { addDays, releaseDay, RELEASE_TIME_ZONE } from "@/features/pistas/pistas.logic";

export { addDays, releaseDay, RELEASE_TIME_ZONE };

/** A word-game daily's calendar: boards land at Argentine midnight, never ahead of time (same as the backend's). */
export interface WordDailyCalendar { contentStart: string; rankedStart: string; publishedDays: number }

/** Same calendars as the backend (shared-player-daily.days.ts, name-chain-daily.days.ts). */
export const SHARED_PLAYER_CALENDAR: WordDailyCalendar = { contentStart: "2026-10-06", rankedStart: "2026-10-08", publishedDays: 75 };
export const NAME_CHAIN_CALENDAR: WordDailyCalendar = { contentStart: "2026-10-06", rankedStart: "2026-10-08", publishedDays: 75 };

const DAY_MS = 86_400_000;
export const lastDayOf = (c: WordDailyCalendar) => addDays(c.contentStart, c.publishedDays - 1);
export const puzzleNumber = (c: WordDailyCalendar, day: string) => Math.round((Date.parse(`${day}T00:00:00Z`) - Date.parse(`${c.contentStart}T00:00:00Z`)) / DAY_MS) + 1;

/** Newest playable board: today's, or the last published one once the run of boards is over. Null before the first board. */
export function latestDay(c: WordDailyCalendar, today: string): string | null {
  if (today < c.contentStart) return null;
  const last = lastDayOf(c);
  return today > last ? last : today;
}

/** Today's board counts for the ranking (members only). */
export const isLiveDay = (c: WordDailyCalendar, day: string, today: string) => day === today && day >= c.rankedStart && day <= lastDayOf(c);

/** Guests only play closed days; a board is closed once its Argentine day is over. */
export const isClosedDay = (day: string, today: string) => day < today;

/** Every day a player may open, newest first. */
export function playableDays(c: WordDailyCalendar, today: string): string[] {
  const last = latestDay(c, today);
  const days: string[] = [];
  if (!last) return days;
  for (let d = last; d >= c.contentStart; d = addDays(d, -1)) days.push(d);
  return days;
}
