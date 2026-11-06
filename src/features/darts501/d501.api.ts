import { createWordDailyApi, DailyGameApiError, isNetworkFailure, type WordRunStateBase } from "@/features/wordgames/daily/wordDaily.api";
import { createDailyGameCall } from "@/lib/repositories/dailyGameApi";
import type { DartVerdict } from "./d501.rules";

export interface ServerDart { name: string | null; text: string; verdict: DartVerdict; value: number | null; before: number; after: number }

/** Server-held run state (backend darts501-daily.rules PublicRunState). */
export interface D501ServerRun extends WordRunStateBase {
  category: { id: string; title: string; note: string | null; unit: string; asOf: string; release: string; kind: "player" } | null;
  remaining: number;
  darts: ServerDart[];
  maxDarts: number;
  outs: number | null;
  last: (ServerDart & { n: number }) | null;
  end: "checkout" | "darts" | "gaveUp" | null;
  /** At the end: how many would have checked out from the final score; their names only once the day is closed. */
  finishes: { count: number; shown: Array<{ name: string; value: number }> | null } | null;
}

export interface D501Review {
  day: string; title: string; note: string | null; unit: string; asOf: string;
  top: Array<{ name: string; value: number }>;
  finishes: Array<{ from: number; players: Array<{ name: string; value: number }> }>;
}

const BASE = "/api/v1/darts501";

/**
 * A failure worth asking again: no answer at all (dropped connection, timeout), the server busy or briefly down (5xx), or
 * a member session that could not be read for a moment. A 4xx is the server's answer and is never repeated.
 */
export function isTransientFailure(error: unknown): boolean {
  if (isNetworkFailure(error)) return true;
  return error instanceof DailyGameApiError && (error.status === 0 || error.status >= 500);
}

/** After the first try: how long to wait before each retry. */
export const D501_RETRY_DELAYS_MS = [600, 1_500] as const;

/** `read`, asked again after a transient failure (only for reads: a move is re-synced by the daily kit, never resent). */
export async function withRetry<T>(read: () => Promise<T>, delays: readonly number[] = D501_RETRY_DELAYS_MS, wait = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms))): Promise<T> {
  for (let attempt = 0; ; attempt += 1) {
    try {
      return await read();
    } catch (error) {
      if (attempt >= delays.length || !isTransientFailure(error)) throw error;
      await wait(delays[attempt]);
    }
  }
}

/**
 * Each try of the boards index gives up sooner than the shared 15 s: it is the call that opens the game, and a stuck try
 * is better retried than waited out (production once hung it outright; the backend now bounds it, see darts501-daily.reads).
 */
const BOARDS_TRY_TIMEOUT_MS = 8_000;
const call = createDailyGameCall(BASE);
const base = createWordDailyApi<D501ServerRun, never, D501Review>(BASE);

/** The word-game daily client, with its reads (the index, the player's run, reviews and boards) retried on transient failures. */
export const darts501DailyApi: typeof base = {
  ...base,
  boards: (fresh = false) => withRetry(() => call<{ days: Record<string, number>; rankedFrom?: string }>(fresh ? `/boards?r=${Date.now()}` : "/boards", "GET", undefined, "en", { identity: "none", timeoutMs: BOARDS_TRY_TIMEOUT_MS })),
  current: (day, locale) => withRetry(() => base.current(day, locale)),
  review: (day, locale) => withRetry(() => base.review(day, locale)),
  leaderboard: (day, locale) => withRetry(() => base.leaderboard(day, locale)),
};
