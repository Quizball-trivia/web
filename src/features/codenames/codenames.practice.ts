import { createDailyGameCall } from "@/lib/repositories/dailyGameApi";
import { isClosedDay } from "@/features/wordgames/daily/wordDaily.logic";
import { codenamesDailyApi, pickLabel, type CodenamesReview } from "./codenames.daily";
import { BOARD_SIZE, newSolo, type CardKind, type CodenamesSoloState } from "./codenames.view";

/** A solo word board as the server deals it (backend codenames.words): unranked, played and judged on the device. */
export interface PracticeBoard {
  lang: string;
  cards: Array<{ id: string; word: string; kind: CardKind; football: string; other: string }>;
  clues: Array<{ word: string; count: number; cards: Array<{ id: string; why: string }> }>;
}

const call = createDailyGameCall("/api/v1/codenames");

export const PRACTICE_LANGS = ["en", "es", "tr", "ru", "ka", "pt", "de", "fr"] as const;

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

// ── Picture practice ──────────────────────────────────────────────────────────────────────────────────────────────

/**
 * A closed day to practise pictures on, at random: never today's board (the server only serves closed days anyway),
 * and none in `avoid` (the board just played, the ones practised already) while another is left. Null: no closed day.
 */
export function pickPracticeDay(days: readonly string[], today: string, avoid: ReadonlySet<string>, random: () => number = Math.random): string | null {
  const closed = days.filter((d) => isClosedDay(d, today));
  const fresh = closed.filter((d) => !avoid.has(d));
  const pool = fresh.length > 0 ? fresh : closed;
  return pool.length > 0 ? pool[Math.floor(random() * pool.length)] : null;
}

/** A closed daily board as a solo run in the reader's language: the daily's rules, never ranked, every reason at the end. */
export function picturePracticeState(review: CodenamesReview, locale: string): CodenamesSoloState | null {
  if (review.cards.length !== BOARD_SIZE || review.clues.length === 0) return null;
  const clues = review.clues.map((c) => ({ word: pickLabel(c.word, locale), count: c.count, cards: c.cards.map((x) => ({ id: x.id, why: pickLabel(x.why, locale) })) }));
  return { ...newSolo(review.day, review.cards.map((c) => ({ id: c.id, kind: c.kind })), clues), ranked: false, disclosed: true };
}

/** The whole board of a closed day, ready to practise on (null when the server's board cannot be played). */
export const loadPicturePractice = (day: string, locale: string): Promise<CodenamesSoloState | null> =>
  codenamesDailyApi.review(day, locale).then((review) => picturePracticeState(review, locale));
