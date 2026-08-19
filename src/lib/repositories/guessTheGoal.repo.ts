import { API_BASE_URL } from "@/lib/config";
import { getSupabaseAccessToken } from "@/lib/auth/supabase";

/**
 * Guess the Goal (server-authoritative mini-game) API client.
 *
 * Hand-typed rather than OpenAPI-generated, mirroring
 * backend-node/src/modules/guess-the-goal/guess-the-goal.service.ts exactly.
 * The server never sends the correct option or the goal's identity before a
 * guess; player ids in the diagram are anonymized (p1..pN).
 */

export interface GgtI18nText {
  en: string;
  ka?: string | null;
}

export interface GgtPlayer {
  id: string;
  team: "attack" | "defense" | "keeper";
  at: [number, number];
}

export interface GgtStep {
  kind: "pass" | "carry" | "run" | "shot";
  player: string;
  to: [number, number];
  via?: [number, number];
  loft?: number;
  withPrev?: boolean;
  duration: number;
}

export interface GgtOption {
  id: string;
  text: GgtI18nText;
}

export interface GgtSession {
  session_id: string;
  state: "active" | "guessed";
  server_now: string;
  started_at: string;
  grace_ms: number;
  max_points: number;
  min_points: number;
  goal: {
    difficulty: string;
    players: GgtPlayer[];
    steps: GgtStep[];
    options: GgtOption[];
    main_moves: number;
    duration_seconds: number;
  };
  bonus?: { question: GgtI18nText; options: GgtOption[] };
  progress: { solved: number; total: number };
}

export interface GgtAwards {
  first_solve: boolean;
  coins: number;
  xp: number;
  daily_cap_reached: boolean;
  wallet_coins: number | null;
  total_xp: number | null;
}

export interface GgtGuessOutcome {
  correct: boolean;
  correct_option_id: string;
  points: number;
  revealed_moves: number;
  title: GgtI18nText;
  fun_fact: GgtI18nText | null;
  bonus?: { question: GgtI18nText; options: GgtOption[] };
  awards: GgtAwards;
  session_state: "guessed" | "complete";
}

export interface GgtBonusOutcome {
  correct: boolean;
  correct_option_id: string;
  bonus_points: number;
  awards: GgtAwards;
}

export interface GgtStats {
  solved: number;
  total: number;
  coins_today: number;
  daily_coin_cap: number;
}

export class GuessTheGoalApiError extends Error {
  constructor(
    message: string,
    public readonly status: number
  ) {
    super(message);
    this.name = "GuessTheGoalApiError";
  }
}

async function call<T>(path: string, method: "GET" | "POST", body?: unknown): Promise<T> {
  const headers = new Headers({ "Content-Type": "application/json" });
  const token = await getSupabaseAccessToken();
  if (token) headers.set("Authorization", `Bearer ${token}`);
  const response = await fetch(`${API_BASE_URL}${path}`, {
    method,
    headers,
    body: body === undefined ? undefined : JSON.stringify(body),
    credentials: "include",
    // A timeout surfaces as a non-GuessTheGoalApiError, i.e. "maybe
    // committed" — the caller reconciles via GET current or a same-option
    // retry (mutations replay their stored result server-side).
    signal: AbortSignal.timeout(15_000),
  });
  if (response.status === 204) return undefined as T;
  const payload = await response.json().catch(() => null);
  if (!response.ok) {
    const message =
      (payload as { message?: string; error?: { message?: string } } | null)?.message
      ?? (payload as { error?: { message?: string } } | null)?.error?.message
      ?? `Request failed (${response.status})`;
    throw new GuessTheGoalApiError(message, response.status);
  }
  return payload as T;
}

export const guessTheGoalApi = {
  start(clientNonce: string): Promise<GgtSession> {
    return call("/api/v1/guess-the-goal/sessions", "POST", { client_nonce: clientNonce });
  },

  /** Returns null when there is no open session (404). */
  async current(): Promise<GgtSession | null> {
    try {
      return await call<GgtSession>("/api/v1/guess-the-goal/sessions/current", "GET");
    } catch (error) {
      if (error instanceof GuessTheGoalApiError && error.status === 404) return null;
      throw error;
    }
  },

  guess(sessionId: string, optionId: string): Promise<GgtGuessOutcome> {
    return call(`/api/v1/guess-the-goal/sessions/${sessionId}/guess`, "POST", {
      option_id: optionId,
    });
  },

  bonus(sessionId: string, optionId: string): Promise<GgtBonusOutcome> {
    return call(`/api/v1/guess-the-goal/sessions/${sessionId}/bonus`, "POST", {
      option_id: optionId,
    });
  },

  stats(): Promise<GgtStats> {
    return call("/api/v1/guess-the-goal/stats", "GET");
  },
};
