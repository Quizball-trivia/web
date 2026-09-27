import { API_BASE_URL } from "@/lib/config";
import { getSupabaseAccessToken } from "@/lib/auth/supabase";
import type { RoundResult } from "@/features/buscaminas/buscaminas.logic";

export interface BuscaminasSettled extends RoundResult {
  reveal: { ok: string[]; mines: string[] };
}

/** Server-held run state: answers of the current round are never sent before it is settled. */
export interface BuscaminasRunState {
  day: string;
  round: number;
  picked: string[];
  found: number;
  mine: string | null;
  settled: BuscaminasSettled | null;
  results: RoundResult[];
  done: boolean;
  score: number;
  ranked: boolean;
  rank?: number;
}

export interface BuscaminasRun {
  token: string;
  state: BuscaminasRunState;
}

export interface BuscaminasLeaderboardRow {
  rank: number;
  userId: string;
  username: string;
  avatarUrl: string | null;
  avatarCustomization: import("@/lib/domain/leaderboard").LeaderboardEntry["avatarCustomization"];
  country: string | null;
  tier: string | null;
  score: number;
  perfects: number;
}

export interface BuscaminasLeaderboard {
  day: string;
  players: number;
  top: BuscaminasLeaderboardRow[];
  me: BuscaminasLeaderboardRow | null;
}

export class BuscaminasApiError extends Error {
  constructor(message: string, public readonly status: number) {
    super(message);
    this.name = "BuscaminasApiError";
  }
}

async function call<T>(path: string, method: "GET" | "POST", body?: unknown): Promise<T> {
  const headers = new Headers({ "Content-Type": "application/json" });
  const token = await getSupabaseAccessToken().catch(() => null);
  if (token) headers.set("Authorization", `Bearer ${token}`);
  const response = await fetch(`${API_BASE_URL}/api/v1/buscaminas${path}`, {
    method,
    headers,
    body: body === undefined ? undefined : JSON.stringify(body),
    signal: AbortSignal.timeout(15_000),
  });
  const payload = await response.json().catch(() => null);
  if (!response.ok) {
    const body = payload as { code?: string; message?: string; error?: { code?: string } } | null;
    const message = body?.code ?? body?.error?.code ?? body?.message
      ?? `Request failed (${response.status})`;
    throw new BuscaminasApiError(message, response.status);
  }
  return payload as T;
}

export const buscaminasApi = {
  start: (day: string, contentVersion: number) => call<BuscaminasRun>("/start", "POST", { day, contentVersion }),
  tap: (token: string, cardId: string) => call<BuscaminasRun & { ok: boolean }>("/tap", "POST", { token, cardId }),
  bank: (token: string) => call<BuscaminasRun>("/bank", "POST", { token }),
  next: (token: string) => call<BuscaminasRun>("/next", "POST", { token }),
  leaderboard: (day: string) => call<BuscaminasLeaderboard>(`/leaderboard?day=${encodeURIComponent(day)}`, "GET"),
};
