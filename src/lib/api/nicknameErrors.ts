import { ApiError } from "@/lib/api/api";

/**
 * Cooldown dates must follow the in-app language, not the browser's — a
 * Georgian UI showing an English date reads as a bug.
 */
export function formatCooldownDate(date: Date, locale: string): string {
  return date.toLocaleDateString(locale === "ka" ? "ka-GE" : "en-GB", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

function errorDetails(error: unknown): Record<string, unknown> | null {
  if (!(error instanceof ApiError)) return null;
  const payload = error.data;
  if (!payload || typeof payload !== "object") return null;
  const details = (payload as { details?: unknown }).details;
  return details && typeof details === "object"
    ? (details as Record<string, unknown>)
    : null;
}

function errorCode(error: unknown): string | null {
  if (!(error instanceof ApiError)) return null;
  const payload = error.data;
  if (!payload || typeof payload !== "object") return null;
  const code = (payload as { code?: unknown }).code;
  return typeof code === "string" ? code : null;
}

export function isNicknameTakenError(error: unknown): boolean {
  if (!(error instanceof ApiError) || error.status !== 409) return false;
  return errorDetails(error)?.field === "nickname";
}

export interface NicknameCooldownInfo {
  /** ISO timestamp the next change unlocks, when the server supplied one. */
  nextAvailableAt: string | null;
}

/**
 * The server is the arbiter of the quota — the client can be out of date after
 * a rename in another tab, so this has to be handled even when the UI believed
 * a change was still available.
 */
export function getNicknameCooldown(error: unknown): NicknameCooldownInfo | null {
  if (errorCode(error) !== "NICKNAME_CHANGE_COOLDOWN") return null;
  const nextAvailableAt = errorDetails(error)?.nextAvailableAt;
  return {
    nextAvailableAt: typeof nextAvailableAt === "string" ? nextAvailableAt : null,
  };
}

/**
 * Why the server refused a nickname. Every one of these used to surface as the
 * same "failed to update" toast, which left the user with no idea whether to
 * pick a different name, wait, or retry.
 */
export type NicknameRejection =
  | "taken"
  | "recently_released"
  | "prohibited_content"
  | "empty"
  | "cooldown";

export function getNicknameRejection(error: unknown): NicknameRejection | null {
  if (!(error instanceof ApiError)) return null;
  if (errorCode(error) === "NICKNAME_CHANGE_COOLDOWN") return "cooldown";

  const details = errorDetails(error);
  if (details?.field !== "nickname") return null;

  const reason = details.reason;
  if (reason === "recently_released") return "recently_released";
  if (reason === "prohibited_content") return "prohibited_content";
  if (reason === "empty") return "empty";
  // A 409 on the nickname field with no reason is the plain uniqueness clash.
  return error.status === 409 ? "taken" : null;
}
