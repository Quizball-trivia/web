import { API_BASE_URL } from "@/lib/config";
import { getSupabaseAccessToken } from "@/lib/auth/supabase";
import { GUEST_TOKEN_HEADER, forgetGuestToken, getGuestToken, peekGuestToken } from "@/lib/guest/guestSession";
import { useAuthStore } from "@/stores/auth.store";
import type { RoundResult } from "@/features/buscaminas/buscaminas.logic";
import { timeoutSignal } from "@/lib/timeoutSignal";

export interface BuscaminasSettled extends RoundResult {
  /** Null while the day is live: today's answers are never revealed. */
  reveal: { ok: string[]; mines: string[] } | null;
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

/** A run is a server row (guest or member); moves are version-checked against it. */
export interface BuscaminasRun {
  run: { id: string; version: number };
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

type Identity = "player" | "optional";

/**
 * Members send their session; guests use the site-wide guest session (minted on first play).
 * Read-only calls ("optional") never mint a guest identity just to look.
 */
async function call<T>(path: string, method: "GET" | "POST", body: unknown, locale: string, identity: Identity = "player", retried = false): Promise<T> {
  const headers = new Headers({ "Content-Type": "application/json" });
  const member = useAuthStore.getState().status === "authenticated";
  const bearer = await getSupabaseAccessToken().catch(() => null);
  // A signed-in player whose session can't be read right now must not quietly become a guest.
  if (member && !bearer) throw new BuscaminasApiError("session_unavailable", 0);
  let guestToken: string | null = null;
  if (bearer) headers.set("Authorization", `Bearer ${bearer}`);
  else if (identity === "player") {
    guestToken = await getGuestToken(locale);
    headers.set(GUEST_TOKEN_HEADER, guestToken);
  } else {
    guestToken = peekGuestToken();
    if (guestToken) headers.set(GUEST_TOKEN_HEADER, guestToken);
  }
  const response = await fetch(`${API_BASE_URL}/api/v1/buscaminas${path}`, {
    method,
    headers,
    body: body === undefined ? undefined : JSON.stringify(body),
    signal: timeoutSignal(15_000),
  });
  if (response.status === 401 && guestToken) {
    // An expired guest session: drop it and try once with a fresh one.
    forgetGuestToken(guestToken);
    // Players retry with a fresh session; read-only calls retry without one (never minting).
    if (!retried) return call<T>(path, method, body, locale, identity, true);
  }
  const payload = await response.json().catch(() => null);
  if (!response.ok) {
    const data = payload as { code?: string; message?: string; error?: { code?: string } } | null;
    throw new BuscaminasApiError(data?.code ?? data?.error?.code ?? data?.message ?? `Request failed (${response.status})`, response.status);
  }
  return payload as T;
}

/** No HTTP answer at all: the connection dropped or the request timed out (never a server refusal). */
export function isNetworkFailure(error: unknown): boolean {
  if (error instanceof BuscaminasApiError) return false;
  const name = (error as { name?: unknown } | null)?.name;
  return error instanceof TypeError || name === "AbortError" || name === "TimeoutError";
}

/** The browser's error name and message for analytics; server refusals are already described by their code. */
export function describeFailure(error: unknown): { errorName: string | null; errorMessage: string | null } {
  if (error instanceof BuscaminasApiError) return { errorName: null, errorMessage: null };
  const e = error as { name?: unknown; message?: unknown } | null;
  return {
    errorName: typeof e?.name === "string" ? e.name : null,
    errorMessage: typeof e?.message === "string" ? e.message.slice(0, 160) : null,
  };
}

const move = (run: BuscaminasRun) => ({ runId: run.run.id, version: run.run.version });

export const buscaminasApi = {
  start: (day: string, contentVersion: number, locale: string) => call<BuscaminasRun>("/start", "POST", { day, contentVersion }, locale),
  tap: (run: BuscaminasRun, cardId: string, locale: string) => call<BuscaminasRun & { ok: boolean }>("/tap", "POST", { ...move(run), cardId }, locale),
  bank: (run: BuscaminasRun, locale: string) => call<BuscaminasRun>("/bank", "POST", move(run), locale),
  next: (run: BuscaminasRun, locale: string) => call<BuscaminasRun>("/next", "POST", move(run), locale),
  leaderboard: (day: string, locale: string) => call<BuscaminasLeaderboard>(`/leaderboard?day=${encodeURIComponent(day)}`, "GET", undefined, locale, "optional"),
};
