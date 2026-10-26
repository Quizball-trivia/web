import type { WordDailyGame } from "@/features/wordgames/daily/wordDaily.games";
import type { WordDailyCalendar } from "@/features/wordgames/daily/wordDaily.logic";
import { conexionesCopy } from "./conexiones.copy";

/** Same calendar as the backend (conexiones.days.ts): staging dates, re-dated with the seed before the production release. */
export const CONEXIONES_CALENDAR: WordDailyCalendar = { contentStart: "2026-10-21", rankedStart: "2026-10-24", publishedDays: 36 };

export const conexionesDailyGame = (locale: string): WordDailyGame => {
  const c = conexionesCopy(locale);
  return { modeId: "conexiones", route: "/conexiones-futboleras", roomGame: "conexiones", brand: c.brand, hero: "/assets/demos/game-modes/conexiones.webp", calendar: CONEXIONES_CALENDAR, tag: c.tag, lines: c.lines };
};
