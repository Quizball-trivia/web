import type { WordDailyGame } from "@/features/wordgames/daily/wordDaily.games";
import type { WordDailyCalendar } from "@/features/wordgames/daily/wordDaily.logic";
import { d501Copy } from "./d501.copy";

/** Same calendar as the backend (darts501-daily.days.ts). */
export const D501_CALENDAR: WordDailyCalendar = { contentStart: "2026-10-24", rankedStart: "2026-10-27", publishedDays: 95 };

export const d501DailyGame = (locale: string): WordDailyGame => {
  const c = d501Copy(locale);
  return {
    modeId: "football-darts-501", route: "/football-darts-501", roomGame: "darts501", brand: c.brand, hero: "/assets/demos/game-modes/football-501.webp",
    calendar: D501_CALENDAR, tag: c.tag, lines: c.lines,
  };
};
