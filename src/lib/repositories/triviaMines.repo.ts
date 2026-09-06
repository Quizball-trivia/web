import { API_BASE_URL } from "@/lib/config";
import { getSupabaseAccessToken } from "@/lib/auth/supabase";

/** Trivia Mines (real-coins solo mini game) API client. Hand-typed; shapes mirror
 *  backend-node/src/modules/trivia-mines/trivia-mines.service.ts. */
export interface I18nText { en: string; ka: string; es?: string }

export interface TriviaMinesQuestion {
  question_id: string;
  prompt: I18nText;
  options: Array<{ id: string; text: I18nText }>;
  deadline_at: string;
}

export interface TriviaMinesState {
  round_id: string;
  status: "active" | "cashed" | "lost" | "expired";
  phase: "picking" | "question" | "settled";
  state_version: number;
  stake_coins: number;
  pot_coins: number;
  next_pot_coins: number;
  mult_bp: number;
  opened: number[];
  flagged: number[];
  bust_tile: number | null;
  scouts_left: number;
  board_size: number;
  defender_count: number;
  commit_hash: string;
  fairness_version: number;
  question: TriviaMinesQuestion | null;
  payout_coins: number | null;
  reveal: { defenders: number[]; server_seed: string; hmac_input: string } | null;
  server_now: string;
}

export interface TriviaMinesPickResult { safe: boolean; state: TriviaMinesState }
export interface TriviaMinesAnswerResult { outcome: "correct" | "wrong" | "late"; correct_option_id: string; flagged_tile: number | null; state: TriviaMinesState }

export class TriviaMinesApiError extends Error {
  constructor(message: string, public readonly status: number) {
    super(message);
    this.name = "TriviaMinesApiError";
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
    signal: AbortSignal.timeout(15_000),
  });
  if (response.status === 204) return undefined as T;
  const payload = await response.json().catch(() => null);
  if (!response.ok) {
    const message = (payload as { message?: string; error?: { message?: string } } | null)?.message
      ?? (payload as { error?: { message?: string } } | null)?.error?.message
      ?? `Request failed (${response.status})`;
    throw new TriviaMinesApiError(message, response.status);
  }
  return payload as T;
}

export const triviaMinesApi = {
  start: (stake: number, clientNonce: string) => call<TriviaMinesState>("/api/v1/trivia-mines/rounds", "POST", { stake, client_nonce: clientNonce }),
  async current(): Promise<TriviaMinesState | null> {
    try {
      return await call<TriviaMinesState>("/api/v1/trivia-mines/rounds/current", "GET");
    } catch (error) {
      if (error instanceof TriviaMinesApiError && error.status === 404) return null;
      throw error;
    }
  },
  pick: (tile: number, expectedVersion: number) => call<TriviaMinesPickResult>("/api/v1/trivia-mines/rounds/pick", "POST", { tile, expected_version: expectedVersion }),
  deal: (expectedVersion: number) => call<TriviaMinesState>("/api/v1/trivia-mines/rounds/question", "POST", { expected_version: expectedVersion }),
  answer: (questionId: string, optionId: string, expectedVersion: number) =>
    call<TriviaMinesAnswerResult>("/api/v1/trivia-mines/rounds/answer", "POST", { question_id: questionId, option_id: optionId, expected_version: expectedVersion }),
  cashout: (expectedVersion: number) => call<TriviaMinesState>("/api/v1/trivia-mines/rounds/cashout", "POST", { expected_version: expectedVersion }),
  heartbeat: () => call<void>("/api/v1/trivia-mines/rounds/heartbeat", "POST"),
  stats: () => call<{ playing_now: number; recent_wins: Array<{ nickname: string; amount: number; run_mult: number; settled_at: string }>; top_runs: Array<{ nickname: string; run_mult: number }> }>("/api/v1/trivia-mines/stats", "GET"),
};
