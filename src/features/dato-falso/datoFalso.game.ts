import type { WordDailyGame } from "@/features/wordgames/daily/wordDaily.games";
import type { WordDailyCalendar } from "@/features/wordgames/daily/wordDaily.logic";
import { datoFalsoCopy } from "./datoFalso.copy";

/** Same calendar as the backend (dato-falso.days.ts): staging dates, re-dated with the seed before the production release. */
export const DATO_FALSO_CALENDAR: WordDailyCalendar = { contentStart: "2026-10-17", rankedStart: "2026-10-19", publishedDays: 36 };

export const datoFalsoDailyGame = (locale: string): WordDailyGame => {
  const c = datoFalsoCopy(locale);
  return { modeId: "datoFalso", route: "/dato-falso-futbolero", roomGame: "dato_falso", brand: c.brand, hero: "/assets/demos/game-modes/dato-falso.webp", calendar: DATO_FALSO_CALENDAR, tag: c.tag, lines: c.lines };
};
