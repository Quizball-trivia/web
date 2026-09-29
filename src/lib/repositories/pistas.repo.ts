import type { LocalizedText, PistasClue, RoundOutcome, RoundResult } from "@/features/pistas/pistas.logic";
import { createDailyGameCall, DailyGameApiError, isNetworkFailure, type Identity } from "./dailyGameApi";

export interface PistasSettled {
  outcome: RoundOutcome;
  clues: number;
  points: number;
  /** Null for a missed player while the day is live: today's answers are revealed after midnight. */
  answer: { display: LocalizedText } | null;
}

/** Server-held run state: only the clues this run has revealed are ever sent. */
export interface PistasRunState {
  day: string;
  round: number;
  totalRounds: number;
  clues: PistasClue[];
  revealed: number;
  pointsInPlay: number;
  wrongGuesses: number;
  ceiling: number | null;
  canReveal: boolean;
  settled: PistasSettled | null;
  results: RoundResult[];
  done: boolean;
  score: number;
  solved: number;
  ranked: boolean;
  rank?: number;
}

export interface PistasRun {
  run: { id: string; version: number };
  state: PistasRunState;
}

export interface PistasReview {
  day: string;
  rounds: Array<{ number: number; answer: { display: LocalizedText }; clues: PistasClue[] }>;
}

export interface PistasLeaderboardRow {
  rank: number;
  userId: string;
  username: string;
  avatarUrl: string | null;
  avatarCustomization: import("@/lib/domain/leaderboard").LeaderboardEntry["avatarCustomization"];
  country: string | null;
  tier: string | null;
  score: number;
  solved: number;
}

export interface PistasLeaderboard {
  day: string;
  players: number;
  top: PistasLeaderboardRow[];
  me: PistasLeaderboardRow | null;
}

export class PistasApiError extends DailyGameApiError {
  constructor(message: string, status: number) {
    super(message, status);
    this.name = "PistasApiError";
  }
}

const request = createDailyGameCall("/api/v1/pistas", (message, status) => new PistasApiError(message, status));
const call = <T,>(path: string, method: "GET" | "POST", body: unknown, locale: string, identity: Identity = "player") =>
  request<T>(path, method, body, locale, { identity });

const move = (run: PistasRun) => ({ runId: run.run.id, version: run.run.version });

export { isNetworkFailure };

export const pistasApi = {
  /** `fresh` skips the HTTP cache: after a correction the cached index would hand back the old version. */
  boards: (fresh = false) => call<{ days: Record<string, number>; rankedFrom?: string }>(fresh ? `/boards?r=${Date.now()}` : "/boards", "GET", undefined, "es", "none"),
  current: (day: string, locale: string) => call<PistasRun | { run: null }>(`/current?day=${encodeURIComponent(day)}`, "GET", undefined, locale, "optional"),
  start: (day: string, contentVersion: number | undefined, locale: string) => call<PistasRun>("/start", "POST", { day, ...(contentVersion ? { contentVersion } : {}) }, locale),
  reveal: (run: PistasRun, locale: string) => call<PistasRun>("/reveal", "POST", move(run), locale),
  guess: (run: PistasRun, guess: string, locale: string) => call<PistasRun & { correct: boolean }>("/guess", "POST", { ...move(run), guess }, locale),
  giveUp: (run: PistasRun, locale: string) => call<PistasRun>("/giveup", "POST", move(run), locale),
  next: (run: PistasRun, locale: string) => call<PistasRun>("/next", "POST", move(run), locale),
  review: (day: string, locale: string) => call<PistasReview>(`/review?day=${encodeURIComponent(day)}`, "GET", undefined, locale, "none"),
  leaderboard: (day: string, locale: string) => call<PistasLeaderboard>(`/leaderboard?day=${encodeURIComponent(day)}`, "GET", undefined, locale, "optional"),
};
