import type { CategoryResult, EndReason, LocalizedText } from "@/features/ultimo/ultimo.logic";
import type { LeaderboardEntry } from "@/lib/domain/leaderboard";
import { createDailyGameCall, DailyGameApiError, isNetworkFailure, type Identity } from "./dailyGameApi";

export type UltimoAnswerResult = "ok" | "wrong" | "repeat" | "ambiguous" | "late";

/** Server-held run state (backend ultimo.types PublicRunState): a category's list only as it is said. */
export interface UltimoRunState {
  day: string;
  category: number;
  totalCategories: number;
  /** Null until the category is started: the title is part of what the clock is for. */
  title: LocalizedText | null;
  hint: LocalizedText | null;
  total: number | null;
  open: boolean;
  deadline: string | null;
  serverNow: string;
  turnMs: number;
  said: LocalizedText[];
  misses: number;
  settled: null | (CategoryResult & { reason: EndReason; missing: LocalizedText[] | null; missingCount: number });
  results: CategoryResult[];
  done: boolean;
  score: number;
  answers: number;
  ranked: boolean;
  rank?: number;
}

export interface UltimoRun {
  run: { id: string; version: number };
  state: UltimoRunState;
}

export interface UltimoReview {
  day: string;
  categories: Array<{ number: number; title: LocalizedText; hint: LocalizedText; answers: LocalizedText[] }>;
}

export interface UltimoLeaderboardRow {
  rank: number;
  userId: string;
  username: string;
  avatarUrl: string | null;
  avatarCustomization: LeaderboardEntry["avatarCustomization"];
  country: string | null;
  tier: string | null;
  score: number;
  answers: number;
}

export interface UltimoLeaderboard {
  day: string;
  players: number;
  top: UltimoLeaderboardRow[];
  me: UltimoLeaderboardRow | null;
}

export class UltimoApiError extends DailyGameApiError {
  constructor(message: string, status: number) {
    super(message, status);
    this.name = "UltimoApiError";
  }
}

const request = createDailyGameCall("/api/v1/ultimo", (message, status) => new UltimoApiError(message, status));
/** Turns can be six seconds: a move whose answer is lost is re-synced long before a 15 s timeout would. */
const MOVE_TIMEOUT_MS = 5_000;
const call = <T,>(path: string, method: "GET" | "POST", body: unknown, locale: string, identity: Identity = "player", timeoutMs?: number) =>
  request<T>(path, method, body, locale, { identity, timeoutMs });

const move = (run: UltimoRun) => ({ runId: run.run.id, version: run.run.version });

export { isNetworkFailure };

export const ultimoApi = {
  /** `fresh` skips the HTTP cache: after a correction the cached index would hand back the old version. */
  boards: (fresh = false) => call<{ days: Record<string, number>; rankedFrom?: string }>(fresh ? `/boards?r=${Date.now()}` : "/boards", "GET", undefined, "es", "none"),
  current: (day: string, locale: string) => call<UltimoRun | { run: null }>(`/current?day=${encodeURIComponent(day)}`, "GET", undefined, locale, "optional"),
  start: (day: string, contentVersion: number | undefined, locale: string) => call<UltimoRun>("/start", "POST", { day, ...(contentVersion ? { contentVersion } : {}) }, locale),
  begin: (run: UltimoRun, locale: string) => call<UltimoRun>("/begin", "POST", move(run), locale, "player", MOVE_TIMEOUT_MS),
  answer: (run: UltimoRun, answer: string, locale: string) =>
    call<UltimoRun & { result: UltimoAnswerResult }>("/answer", "POST", { ...move(run), answer }, locale, "player", MOVE_TIMEOUT_MS),
  next: (run: UltimoRun, locale: string) => call<UltimoRun>("/next", "POST", move(run), locale, "player", MOVE_TIMEOUT_MS),
  review: (day: string, locale: string) => call<UltimoReview>(`/review?day=${encodeURIComponent(day)}`, "GET", undefined, locale, "none"),
  leaderboard: (day: string, locale: string) => call<UltimoLeaderboard>(`/leaderboard?day=${encodeURIComponent(day)}`, "GET", undefined, locale, "optional"),
};
