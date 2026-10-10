import type { GoalResult, MinuteValue, MinutoGoalCard } from "@/features/minuto/minuto.logic";
import { createDailyGameCall, DailyGameApiError, isNetworkFailure, type Identity } from "./dailyGameApi";

/** Server-held run state: the current goal's card (never its minute) and every settled result. */
export interface MinutoRunState {
  day: string;
  round: number;
  totalRounds: number;
  goal: MinutoGoalCard | null;
  settled: GoalResult | null;
  results: GoalResult[];
  done: boolean;
  score: number;
  exact: number;
  ranked: boolean;
  rank?: number;
}

export interface MinutoRun {
  run: { id: string; version: number };
  state: MinutoRunState;
}

export interface MinutoReview {
  day: string;
  goals: Array<{ number: number; goal: MinutoGoalCard; minute: MinuteValue }>;
}

export interface MinutoLeaderboardRow {
  rank: number;
  userId: string;
  username: string;
  avatarUrl: string | null;
  avatarCustomization: import("@/lib/domain/leaderboard").LeaderboardEntry["avatarCustomization"];
  country: string | null;
  tier: string | null;
  score: number;
  exact: number;
}

export interface MinutoLeaderboard {
  day: string;
  players: number;
  top: MinutoLeaderboardRow[];
  me: MinutoLeaderboardRow | null;
}

export class MinutoApiError extends DailyGameApiError {
  constructor(message: string, status: number) {
    super(message, status);
    this.name = "MinutoApiError";
  }
}

const request = createDailyGameCall("/api/v1/minuto", (message, status) => new MinutoApiError(message, status));
const call = <T,>(path: string, method: "GET" | "POST", body: unknown, locale: string, identity: Identity = "player") =>
  request<T>(path, method, body, locale, { identity });

const move = (run: MinutoRun) => ({ runId: run.run.id, version: run.run.version });

export { isNetworkFailure };

export const minutoApi = {
  /** `fresh` skips the HTTP cache: after a correction the cached index would hand back the old version. */
  boards: (fresh = false) => call<{ days: Record<string, number>; rankedFrom?: string }>(fresh ? `/boards?r=${Date.now()}` : "/boards", "GET", undefined, "es", "none"),
  current: (day: string, locale: string) => call<MinutoRun | { run: null }>(`/current?day=${encodeURIComponent(day)}`, "GET", undefined, locale, "optional"),
  start: (day: string, contentVersion: number | undefined, locale: string) => call<MinutoRun>("/start", "POST", { day, ...(contentVersion ? { contentVersion } : {}) }, locale),
  guess: (run: MinutoRun, minute: number, locale: string) => call<MinutoRun>("/guess", "POST", { ...move(run), minute }, locale),
  next: (run: MinutoRun, locale: string) => call<MinutoRun>("/next", "POST", move(run), locale),
  review: (day: string, locale: string) => call<MinutoReview>(`/review?day=${encodeURIComponent(day)}`, "GET", undefined, locale, "none"),
  /** Without a day the server answers with its default board: today's while it is ranked, else the last released day's. */
  leaderboard: (day: string | undefined, locale: string) => call<MinutoLeaderboard>(day ? `/leaderboard?day=${encodeURIComponent(day)}` : "/leaderboard", "GET", undefined, locale, "optional"),
};
