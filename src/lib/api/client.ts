import {
  ApiError,
  api,
  type ApiRequestOptions,
  type ApiResponse,
  type HttpMethod,
  type PathsWithMethod,
} from "@/lib/api/api";
import { clearTokens } from "@/lib/auth/tokenStorage";
import { getSupabaseAccessToken, signOutLocal } from "@/lib/auth/supabase";

type ApiFetchOptions<
  M extends HttpMethod,
  P extends PathsWithMethod<M>,
> = ApiRequestOptions<M, P> & {
  skipRefresh?: boolean;
};

// Auth endpoints must never trigger the 401→session-reread→retry cycle.
const NON_REFRESHABLE_PATHS = new Set<string>([
  "/api/v1/auth/refresh",
  "/api/v1/auth/login",
  "/api/v1/auth/login/restore",
  "/api/v1/auth/logout",
  "/api/v1/auth/register",
  "/api/v1/auth/restore-pending-deletion",
  "/api/v1/auth/social-login-token",
]);

export async function apiFetch<
  M extends HttpMethod,
  P extends PathsWithMethod<M>,
>(method: M, path: P, options: ApiFetchOptions<M, P> = {}): Promise<ApiResponse<M, P>> {
  const tokenBefore = options.auth === false ? null : await getSupabaseAccessToken();
  try {
    return await api.request(method, path, options);
  } catch (error) {
    // A "banned" 401 is a terminal account state, not a token problem. Refreshing
    // or retrying is pointless and — because the post-OAuth session auto-refreshes —
    // can replace this precise ban error with a generic "no token" 401 (details:
    // null), so callers can't detect the ban. Throw the clean ban error as-is.
    const isBanned =
      error instanceof ApiError &&
      error.status === 401 &&
      typeof error.data === "object" &&
      error.data !== null &&
      (error.data as { details?: { reason?: unknown } }).details?.reason === "banned";
    if (isBanned) {
      throw error;
    }

    const canRefresh =
      error instanceof ApiError &&
      error.status === 401 &&
      !options.skipRefresh &&
      options.auth !== false &&
      !NON_REFRESHABLE_PATHS.has(String(path));

    if (canRefresh) {
      const tokenAfter = await getSupabaseAccessToken();
      if (tokenAfter && tokenAfter !== tokenBefore) {
        return apiFetch(method, path, { ...options, skipRefresh: true });
      }
      try {
        await signOutLocal();
      } catch {
        // Best-effort; still clear legacy app state below.
      }
      clearTokens();
    }
    throw error;
  }
}
