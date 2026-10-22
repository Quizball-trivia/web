import { createDailyGameCall } from "@/lib/repositories/dailyGameApi";
import { createWordDailyApi, type WordBoard, type WordBoardRow, type WordRun, type WordRunStateBase } from "@/features/wordgames/daily/wordDaily.api";
import type { WordDailyGame } from "@/features/wordgames/daily/wordDaily.games";
import type { WordDailyCalendar } from "@/features/wordgames/daily/wordDaily.logic";
import { codenamesCopy } from "./codenames.copy";
import type { CardKind, CodenamesSoloState } from "./codenames.view";

/** Same calendar as the backend (codenames.days.ts): board #1 is the launch day. */
export const CODENAMES_CALENDAR: WordDailyCalendar = { contentStart: "2026-10-20", rankedStart: "2026-10-20", publishedDays: 68 };

export const codenamesDailyGame = (locale: string): WordDailyGame => {
  const c = codenamesCopy(locale);
  return { modeId: "codenames", route: "/codenames", roomGame: "codenames", brand: c.brand, hero: "/assets/demos/game-modes/football-codenames.webp", calendar: CODENAMES_CALENDAR, tag: c.tag, lines: c.lines };
};

type Label = { en: string; es: string; tr: string; ru: string; ka: string };

/** Server-held run state (backend codenames.types PublicRunState); the board has no clock, so it is never `open`. */
export interface CodenamesDailyState extends WordRunStateBase {
  cards: Array<{ id: string; kind: CardKind | null }>;
  clues: Array<{ word: Label; count: number; cards?: Array<{ id: string; why: Label }> }>;
  totalClues: number;
  clue: number;
  guessesLeft: number;
  flips: Array<{ card: number; kind: CardKind; clue: number }>;
  end: "complete" | "owngoal" | "clues" | null;
  found: number;
  total: number;
  misses: number;
  /** The run is over and its day closed: the whole key, every clue, the cards each meant and why. */
  disclosed?: boolean;
}
type ServerState = Omit<CodenamesDailyState, "open" | "deadline" | "serverNow">;

const BASE = "/api/v1/codenames";
export type CodenamesMove = "flip" | "stop";
const base = createWordDailyApi<CodenamesDailyState, CodenamesMove, unknown>(BASE);
const request = createDailyGameCall(BASE);
const clockless = <R extends { state: ServerState }>(r: R) => ({ ...r, state: { ...r.state, open: false, deadline: null, serverNow: new Date().toISOString() } });
const withRun = (data: WordRun<CodenamesDailyState> | { run: null }) => ("state" in data ? clockless(data as unknown as { run: { id: string; version: number }; state: ServerState }) : data);

/**
 * The shared word-daily client with the board's own moves (no clock, no next, no pass): a flip (the card's board
 * position as the answer), or, with `{ move: "stop" }`, the end of the current clue.
 */
export const codenamesDailyApi: typeof base = {
  ...base,
  current: (day, locale) => base.current(day, locale).then(withRun),
  start: (day, contentVersion, locale, timeoutMs) => base.start(day, contentVersion, locale, timeoutMs).then((r) => clockless(r as unknown as { run: WordRun<CodenamesDailyState>["run"]; state: ServerState })),
  answer: (run, value, locale, extra) => {
    const move: CodenamesMove = extra?.move === "stop" ? "stop" : "flip";
    const body = { runId: run.run.id, version: run.run.version, ...(move === "flip" ? { card: Number(value) } : {}) };
    return request<{ run: WordRun<CodenamesDailyState>["run"]; state: ServerState }>(`/${move}`, "POST", body, locale, { timeoutMs: 8_000 }).then((r) => ({ ...clockless(r), result: move }));
  },
  next: () => Promise.reject(new Error("unsupported")),
  pass: () => Promise.reject(new Error("unsupported")),
};

/** The day's board in cards found (the server orders by found, then fewer misses). */
export const loadCodenamesBoard = (day: string, locale: string): Promise<WordBoard> => codenamesDailyApi.leaderboard(day, locale).then((board) => {
  const found = (row: WordBoardRow) => ({ ...row, score: Math.floor(row.score / 100) });
  return { ...board, top: board.top.map(found), me: board.me && found(board.me) };
});

const pick = (label: Label, locale: string) => label[locale as keyof Label] ?? label.en;

/** The server run in the screens' shape, in the reader's language. */
export function toSoloState(s: CodenamesDailyState, locale: string): CodenamesSoloState {
  return {
    day: s.day,
    cards: s.cards.map((c) => ({ id: c.id, kind: c.kind })),
    clues: s.clues.map((c) => ({ word: pick(c.word, locale), count: c.count, ...(c.cards ? { cards: c.cards.map((x) => ({ id: x.id, why: pick(x.why, locale) })) } : {}) })),
    totalClues: s.totalClues,
    total: s.total,
    clue: Math.min(s.clue, Math.max(0, s.clues.length - 1)),
    guessesLeft: s.guessesLeft,
    flips: s.flips.map((f) => ({ cardId: s.cards[f.card]?.id ?? "", kind: f.kind, clue: f.clue })),
    status: s.done ? "done" : "playing",
    endReason: s.end,
    ranked: s.ranked,
    rank: s.rank,
    disclosed: s.disclosed ?? false,
  };
}
