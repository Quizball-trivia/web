import type { LeaderboardEntry } from "@/lib/domain/leaderboard";
import { createDailyGameCall, DailyGameApiError, isNetworkFailure, type Identity } from "@/lib/repositories/dailyGameApi";

export { DailyGameApiError, isNetworkFailure };

/** What every word-game daily's run state has (the rest is the game's). */
export interface WordRunStateBase { day: string; open: boolean; deadline: string | null; serverNow: string; done: boolean; score: number; ranked: boolean; rank?: number }
export interface WordRun<State extends WordRunStateBase> { run: { id: string; version: number }; state: State }

export interface WordBoardRow {
  rank: number; userId: string; username: string; avatarUrl: string | null; avatarCustomization: LeaderboardEntry["avatarCustomization"];
  country: string | null; tier: string | null; score: number;
}
export interface WordBoard { day: string; players: number; top: WordBoardRow[]; me: WordBoardRow | null }

/** Turns are ten seconds at most: a move whose answer is lost is re-synced long before a 15 s timeout would. */
const MOVE_TIMEOUT_MS = 5_000;

/** The HTTP client of one word-game daily (the daily kit's routes): members send their session, guests the guest session. */
export function createWordDailyApi<State extends WordRunStateBase, Result extends string, Review>(base: string) {
  const request = createDailyGameCall(base);
  const call = <T,>(path: string, method: "GET" | "POST", body: unknown, locale: string, identity: Identity = "player", timeoutMs?: number) =>
    request<T>(path, method, body, locale, { identity, timeoutMs });
  const move = (run: WordRun<State>) => ({ runId: run.run.id, version: run.run.version });
  return {
    /** `fresh` skips the HTTP cache: after a correction the cached index would hand back the old version. */
    boards: (fresh = false) => call<{ days: Record<string, number>; rankedFrom?: string }>(fresh ? `/boards?r=${Date.now()}` : "/boards", "GET", undefined, "en", "none"),
    current: (day: string, locale: string) => call<WordRun<State> | { run: null }>(`/current?day=${encodeURIComponent(day)}`, "GET", undefined, locale, "optional"),
    /** `timeoutMs`: a re-sync in the middle of a turn must answer within it. */
    start: (day: string, contentVersion: number | undefined, locale: string, timeoutMs?: number) =>
      call<WordRun<State>>("/start", "POST", { day, ...(contentVersion ? { contentVersion } : {}) }, locale, "player", timeoutMs),
    next: (run: WordRun<State>, locale: string) => call<WordRun<State>>("/next", "POST", move(run), locale, "player", MOVE_TIMEOUT_MS),
    answer: (run: WordRun<State>, answer: string, locale: string) =>
      call<WordRun<State> & { result: Result }>("/answer", "POST", { ...move(run), answer }, locale, "player", MOVE_TIMEOUT_MS),
    pass: (run: WordRun<State>, locale: string) => call<WordRun<State>>("/pass", "POST", move(run), locale, "player", MOVE_TIMEOUT_MS),
    /** "That was right": a refused answer of the player's own run (and of which pair, where the day has pairs). True when the server took it. */
    report: (day: string, text: string, locale: string, pair?: number) =>
      call<null>("/report", "POST", { day, text: text.slice(0, 60), ...(pair === undefined ? {} : { pair }) }, locale, "player", MOVE_TIMEOUT_MS).then(() => true, () => false),
    review: (day: string, locale: string) => call<Review>(`/review?day=${encodeURIComponent(day)}`, "GET", undefined, locale, "none"),
    leaderboard: (day: string, locale: string) => call<WordBoard>(`/leaderboard?day=${encodeURIComponent(day)}`, "GET", undefined, locale, "optional"),
  };
}
export type WordDailyApi<State extends WordRunStateBase, Result extends string, Review = unknown> = ReturnType<typeof createWordDailyApi<State, Result, Review>>;
