import { API_BASE_URL } from "@/lib/config";
import { getSupabaseAccessToken } from "@/lib/auth/supabase";

/**
 * Free Kicks (real-coins solo mode) API client.
 *
 * Hand-typed rather than OpenAPI-generated: the backend module is new and the
 * generated types lag behind. Shapes mirror
 * backend-node/src/modules/free-kicks/free-kicks.service.ts exactly.
 */

export type FreeKicksZone = "BL" | "BR" | "TL" | "TR" | "BC" | "TC";

export interface I18nText {
  en: string;
  ka: string;
}

export interface FreeKicksQuestion {
  question_id: string;
  prompt: I18nText;
  options: Array<{ id: string; text: I18nText }>;
  deadline_at: string;
}

export interface FreeKicksState {
  round_id: string;
  status: "active" | "cashed" | "lost" | "expired";
  phase: "deciding" | "question" | "post_goal" | "settled";
  state_version: number;
  stake_coins: number;
  pot_coins: number;
  attack: number;
  open_count: number;
  open_zones: FreeKicksZone[];
  answer_locked: boolean;
  goals: number;
  commit_hash: string;
  zone_order_version: number;
  question: FreeKicksQuestion | null;
  payout_coins: number | null;
  server_now: string;
}

export interface FreeKicksAnswerResult {
  outcome: "correct" | "wrong" | "late";
  correct_option_id: string;
  state: FreeKicksState;
}

export interface FreeKicksShootResult {
  scored: boolean;
  keeper_zone: FreeKicksZone;
  proof: {
    server_seed: string;
    commit_hash: string;
    hmac_input: string;
    open_count: number;
    zone_order_version: number;
  };
  state: FreeKicksState;
}

export interface FreeKicksStats {
  playing_now: number;
  recent_wins: Array<{ nickname: string; amount: number; run_mult: number; settled_at: string }>;
  top_runs: Array<{ nickname: string; run_mult: number }>;
}

export class FreeKicksApiError extends Error {
  constructor(
    message: string,
    public readonly status: number
  ) {
    super(message);
    this.name = "FreeKicksApiError";
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
    // A hung request must not wedge the busy lock on a real-money screen;
    // a timeout surfaces as a non-FreeKicksApiError, i.e. "maybe committed",
    // and the caller reconciles via GET current.
    signal: AbortSignal.timeout(15_000),
  });
  if (response.status === 204) return undefined as T;
  const payload = await response.json().catch(() => null);
  if (!response.ok) {
    const message =
      (payload as { message?: string; error?: { message?: string } } | null)?.message
      ?? (payload as { error?: { message?: string } } | null)?.error?.message
      ?? `Request failed (${response.status})`;
    throw new FreeKicksApiError(message, response.status);
  }
  return payload as T;
}

export const freeKicksApi = {
  start(stake: number, clientNonce: string): Promise<FreeKicksState> {
    return call("/api/v1/free-kicks/rounds", "POST", { stake, client_nonce: clientNonce });
  },

  /** Returns null when there is no active round (404). */
  async current(): Promise<FreeKicksState | null> {
    try {
      return await call<FreeKicksState>("/api/v1/free-kicks/rounds/current", "GET");
    } catch (error) {
      if (error instanceof FreeKicksApiError && error.status === 404) return null;
      throw error;
    }
  },

  deal(expectedVersion: number): Promise<FreeKicksState> {
    return call("/api/v1/free-kicks/rounds/question", "POST", { expected_version: expectedVersion });
  },

  answer(questionId: string, optionId: string, expectedVersion: number): Promise<FreeKicksAnswerResult> {
    return call("/api/v1/free-kicks/rounds/answer", "POST", {
      question_id: questionId,
      option_id: optionId,
      expected_version: expectedVersion,
    });
  },

  shoot(zone: FreeKicksZone, expectedVersion: number): Promise<FreeKicksShootResult> {
    return call("/api/v1/free-kicks/rounds/shoot", "POST", { zone, expected_version: expectedVersion });
  },

  nextAttack(expectedVersion: number, clientNonce: string): Promise<FreeKicksState> {
    return call("/api/v1/free-kicks/rounds/next-attack", "POST", {
      expected_version: expectedVersion,
      client_nonce: clientNonce,
    });
  },

  cashout(expectedVersion: number): Promise<FreeKicksState> {
    return call("/api/v1/free-kicks/rounds/cashout", "POST", { expected_version: expectedVersion });
  },

  heartbeat(): Promise<void> {
    return call("/api/v1/free-kicks/rounds/heartbeat", "POST", {});
  },

  stats(): Promise<FreeKicksStats> {
    return call("/api/v1/free-kicks/stats", "GET");
  },
};
