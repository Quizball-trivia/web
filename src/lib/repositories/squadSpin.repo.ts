import { API_BASE_URL } from "@/lib/config";
import { getSupabaseAccessToken } from "@/lib/auth/supabase";

/** Squad Spin (real-coins solo mini game) API client. Hand-typed; shapes mirror
 *  backend-node/src/modules/squad-spin/squad-spin.service.ts. */
export type SquadSpinTier = "t3e" | "t3m" | "t4" | "t5";
export interface SquadSpinSteps { t3e: number; t3m: number; t4: number; t5: number; margin: number }
export interface SquadSpinReel {
  family: "club" | "country" | "league" | "manager" | "trophy_award" | "position";
  id: string;
  key: string;
  label_en: string;
  label_ka: string;
  asset_key: string | null;
}
export interface SquadSpinPlayer { id: string; name_en: string; name_ka: string | null; image_url: string | null }

export interface SquadSpinState {
  round_id: string;
  status: "active" | "cashed" | "lost" | "expired";
  phase: "question" | "decision" | "settled";
  state_version: number;
  stake_coins: number;
  reels: number;
  pot_coins: number;
  mult_bp: number;
  spins_cleared: number;
  steps_bp: SquadSpinSteps;
  spin: { index: number; tier: SquadSpinTier; step_bp: number; next_pot_coins: number; reels: SquadSpinReel[]; dealt_at: string; deadline_at: string } | null;
  decision_deadline_at: string | null;
  payout_coins: number | null;
  commit_hash: string;
  fairness_version: number;
  reveal: { answers: SquadSpinPlayer[]; server_seed: string; hmac_input: string } | null;
  server_now: string;
}

export interface SquadSpinAnswerResult { outcome: "correct" | "wrong" | "late"; player: SquadSpinPlayer | null; answers: SquadSpinPlayer[]; state: SquadSpinState }

export class SquadSpinApiError extends Error {
  constructor(message: string, public readonly status: number) {
    super(message);
    this.name = "SquadSpinApiError";
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
    throw new SquadSpinApiError(message, response.status);
  }
  return payload as T;
}

export const squadSpinApi = {
  start: (stake: number, reels: 3 | 4 | 5, clientNonce: string) => call<SquadSpinState>("/api/v1/squad-spin/rounds", "POST", { stake, reels, client_nonce: clientNonce }),
  async current(): Promise<SquadSpinState | null> {
    try {
      return await call<SquadSpinState>("/api/v1/squad-spin/rounds/current", "GET");
    } catch (error) {
      if (error instanceof SquadSpinApiError && error.status === 404) return null;
      throw error;
    }
  },
  /** Most recent round in any state (404 when the player never played). */
  async latest(): Promise<SquadSpinState | null> {
    try {
      return await call<SquadSpinState>("/api/v1/squad-spin/rounds/latest", "GET");
    } catch (error) {
      if (error instanceof SquadSpinApiError && error.status === 404) return null;
      throw error;
    }
  },
  answer: (roundId: string, text: string, expectedVersion: number) => call<SquadSpinAnswerResult>("/api/v1/squad-spin/rounds/answer", "POST", { round_id: roundId, text, expected_version: expectedVersion }),
  continue: (roundId: string, expectedVersion: number) => call<SquadSpinState>("/api/v1/squad-spin/rounds/continue", "POST", { round_id: roundId, expected_version: expectedVersion }),
  cashout: (roundId: string, expectedVersion: number) => call<SquadSpinState>("/api/v1/squad-spin/rounds/cashout", "POST", { round_id: roundId, expected_version: expectedVersion }),
  heartbeat: () => call<void>("/api/v1/squad-spin/rounds/heartbeat", "POST"),
  stats: () => call<{ playing_now: number; recent_wins: Array<{ nickname: string; amount: number; run_mult: number; settled_at: string }>; top_runs: Array<{ nickname: string; run_mult: number }> }>("/api/v1/squad-spin/stats", "GET"),
};
