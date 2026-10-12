import type { RoomGameId } from "@/lib/realtime/socket.types";
import { nameChainCopy, nameChainDailyCopy, sharedPlayerCopy, sharedPlayerDailyCopy } from "../copy";
import { NAME_CHAIN_CALENDAR, SHARED_PLAYER_CALENDAR, type WordDailyCalendar } from "./wordDaily.logic";

/** What the shared daily screens need to know about one game. */
export interface WordDailyGame {
  /** Analytics / sign-in id and the app route the game lives on. */
  modeId: string;
  route: string;
  roomGame: RoomGameId;
  brand: readonly [string, string];
  hero: string;
  calendar: WordDailyCalendar;
  tag: string;
  /** The rules shown on the intro; a function when they depend on the day (its number). */
  lines: readonly string[] | ((dayNumber: number) => readonly string[]);
}

/** Day 5 is 2026-10-10: from there a pair lasts twenty seconds, the four days before it ten (the server decides; this is the intro's wording). */
const LONG_CLOCK_FROM_DAY = 5;

export const sharedPlayerDailyGame = (locale: string): WordDailyGame => {
  const d = sharedPlayerDailyCopy(locale);
  return { modeId: "sharedPlayer", route: "/ortak-futbolcu", roomGame: "shared_player", brand: sharedPlayerCopy(locale).brand, hero: "/assets/demos/game-modes/ortak-futbolcu.webp", calendar: SHARED_PLAYER_CALENDAR, tag: d.tag, lines: (dayNumber) => d.lines(dayNumber >= LONG_CLOCK_FROM_DAY ? 20 : 10) };
};

export const nameChainDailyGame = (locale: string): WordDailyGame => {
  const d = nameChainDailyCopy(locale);
  return { modeId: "nameChain", route: "/son-harfle", roomGame: "name_chain", brand: nameChainCopy(locale).brand, hero: "/assets/demos/game-modes/son-harfle.webp", calendar: NAME_CHAIN_CALENDAR, tag: d.tag, lines: d.lines };
};
