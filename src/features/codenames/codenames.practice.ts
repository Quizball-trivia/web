import { createDailyGameCall } from "@/lib/repositories/dailyGameApi";
import { newSolo, type CardKind, type CodenamesSoloState } from "./codenames.view";

/** A solo word board as the server deals it (backend codenames.words): unranked, played and judged on the device. */
export interface PracticeBoard {
  lang: string;
  cards: Array<{ id: string; word: string; kind: CardKind; football: string; other: string }>;
  clues: Array<{ word: string; count: number; cards: Array<{ id: string; why: string }> }>;
}

const call = createDailyGameCall("/api/v1/codenames");

export const PRACTICE_LANGS = ["en", "es", "tr", "ru", "ka"] as const;

/** The word deck a reader plays: their language's, or English for a language without word boards. */
export const wordDeckLang = (locale: string): string => ((PRACTICE_LANGS as readonly string[]).includes(locale) ? locale : "en");

/** A new board in the reader's language (English for a language without word boards). */
export function loadPractice(locale: string): Promise<PracticeBoard> {
  const lang = wordDeckLang(locale);
  return call<PracticeBoard>(`/words/practice?lang=${lang}`, "GET", undefined, locale, { identity: "none" });
}

/** The board as a solo run: the same rules as the daily, never ranked. */
export function practiceState(board: PracticeBoard): CodenamesSoloState {
  return { ...newSolo("practice", board.cards.map((c) => ({ id: c.id, word: c.word, kind: c.kind })), board.clues), ranked: false };
}
