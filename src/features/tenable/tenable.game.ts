import type { WordDailyGame } from "@/features/wordgames/daily/wordDaily.games";
import type { WordDailyCalendar } from "@/features/wordgames/daily/wordDaily.logic";
import { tenableCopy } from "./tenable.copy";

/** Same calendar as the backend (tenable-daily.days.ts). */
export const TENABLE_CALENDAR: WordDailyCalendar = { contentStart: "2026-10-12", rankedStart: "2026-10-17", publishedDays: 116 };

export const tenableDailyGame = (locale: string): WordDailyGame => {
  const c = tenableCopy(locale);
  return { modeId: "tenable", route: "/football-tenable", roomGame: "tenable", brand: c.brand, hero: "/assets/demos/game-modes/lab-top-10-knockout.webp", calendar: TENABLE_CALENDAR, tag: c.tag, lines: c.lines };
};
