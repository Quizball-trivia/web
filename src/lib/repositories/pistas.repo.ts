import { API_BASE_URL } from "@/lib/config";
import { getSupabaseAccessToken } from "@/lib/auth/supabase";
import { GUEST_TOKEN_HEADER, forgetGuestToken, getGuestToken, peekGuestToken } from "@/lib/guest/guestSession";
import { useAuthStore } from "@/stores/auth.store";
import type { LocalizedText, PistasClue, RoundOutcome, RoundResult } from "@/features/pistas/pistas.logic";
import { timeoutSignal } from "@/lib/timeoutSignal";

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

export class PistasApiError extends Error {
  constructor(message: string, public readonly status: number) {
    super(message);
    this.name = "PistasApiError";
  }
}

type Identity = "player" | "optional" | "none";

/** Same identity rules as Buscaminas: members send their session, guests the site-wide guest session. */
async function call<T>(path: string, method: "GET" | "POST", body: unknown, locale: string, identity: Identity = "player", retried = false): Promise<T> {
  const headers = new Headers({ "Content-Type": "application/json" });
  let guestToken: string | null = null;
  if (identity !== "none") {
    const member = useAuthStore.getState().status === "authenticated";
    const bearer = await getSupabaseAccessToken().catch(() => null);
    // A signed-in player whose session can't be read right now must not quietly become a guest.
    if (member && !bearer) throw new PistasApiError("session_unavailable", 0);
    if (bearer) headers.set("Authorization", `Bearer ${bearer}`);
    else if (identity === "player") {
      guestToken = await getGuestToken(locale);
      headers.set(GUEST_TOKEN_HEADER, guestToken);
    } else {
      guestToken = peekGuestToken();
      if (guestToken) headers.set(GUEST_TOKEN_HEADER, guestToken);
    }
  }
  const response = await fetch(`${API_BASE_URL}/api/v1/pistas${path}`, {
    method,
    headers,
    body: body === undefined ? undefined : JSON.stringify(body),
    signal: timeoutSignal(15_000),
  });
  if (response.status === 401 && guestToken) {
    forgetGuestToken(guestToken);
    if (!retried) return call<T>(path, method, body, locale, identity, true);
  }
  const payload = await response.json().catch(() => null);
  if (!response.ok) {
    const data = payload as { code?: string; message?: string; details?: { reason?: string }; error?: { code?: string } } | null;
    throw new PistasApiError(data?.details?.reason ?? data?.code ?? data?.error?.code ?? data?.message ?? `Request failed (${response.status})`, response.status);
  }
  return payload as T;
}

const move = (run: PistasRun) => ({ runId: run.run.id, version: run.run.version });

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
