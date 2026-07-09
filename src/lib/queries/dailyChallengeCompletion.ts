import { ApiError } from "@/lib/api/api";
import type { DailyChallengeCompletionResult } from "@/lib/domain/dailyChallenge";

export const DAILY_CHALLENGE_ALREADY_COMPLETED = "DAILY_CHALLENGE_ALREADY_COMPLETED";
export const DAILY_CHALLENGE_COMPLETION_RETRY_DELAYS_MS = [400, 900] as const;

export function getApiErrorCode(error: unknown): string | undefined {
  if (!(error instanceof ApiError)) return undefined;

  const data = error.data;
  if (!data || typeof data !== "object" || !("code" in data)) return undefined;

  const code = (data as { code?: unknown }).code;
  return typeof code === "string" ? code : undefined;
}

export function isDailyChallengeAlreadyCompletedError(error: unknown) {
  return (
    error instanceof ApiError &&
    error.status === 409 &&
    getApiErrorCode(error) === DAILY_CHALLENGE_ALREADY_COMPLETED
  );
}

export function isRetryableDailyChallengeCompletionError(error: unknown) {
  if (isDailyChallengeAlreadyCompletedError(error)) return false;
  if (error instanceof ApiError) {
    return error.status === 408 || error.status === 429 || error.status >= 500;
  }
  return true;
}

export function getDailyChallengeCompletionRetryDelay(attemptIndex: number) {
  return (
    DAILY_CHALLENGE_COMPLETION_RETRY_DELAYS_MS[attemptIndex] ??
    DAILY_CHALLENGE_COMPLETION_RETRY_DELAYS_MS[
      DAILY_CHALLENGE_COMPLETION_RETRY_DELAYS_MS.length - 1
    ]
  );
}

export type DailyChallengeCompletionSuccess =
  | { status: "completed"; result: DailyChallengeCompletionResult }
  | { status: "alreadyCompleted" };
