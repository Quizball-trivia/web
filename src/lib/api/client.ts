import { refreshSession } from "@/lib/auth/auth.service";
import {
  ApiError,
  api,
  type ApiRequestOptions,
  type ApiResponse,
  type HttpMethod,
  type PathsWithMethod,
} from "@/lib/api/api";

type ApiFetchOptions<
  M extends HttpMethod,
  P extends PathsWithMethod<M>,
> = ApiRequestOptions<M, P> & {
  skipRefresh?: boolean;
};

// Auth endpoints must never trigger the 401→refresh→retry cycle: a 401/400 from
// these IS the refresh failing, so retrying would recurse. Refresh itself also
// runs with `auth: false`, which is a second guard.
const NON_REFRESHABLE_PATHS = new Set<string>([
  "/api/v1/auth/refresh",
  "/api/v1/auth/login",
  "/api/v1/auth/logout",
  "/api/v1/auth/register",
]);

export async function apiFetch<
  M extends HttpMethod,
  P extends PathsWithMethod<M>,
>(method: M, path: P, options: ApiFetchOptions<M, P> = {}): Promise<ApiResponse<M, P>> {
  try {
    return await api.request(method, path, options);
  } catch (error) {
    const canRefresh =
      error instanceof ApiError &&
      error.status === 401 &&
      !options.skipRefresh &&
      options.auth !== false &&
      !NON_REFRESHABLE_PATHS.has(String(path));

    if (canRefresh) {
      // Single-flight: parallel 401s all await the same refresh attempt.
      const result = await refreshSession();
      if (result.ok) {
        return apiFetch(method, path, { ...options, skipRefresh: true });
      }
      // Terminal failure already cleared tokens inside refreshSession; transient
      // failure leaves them intact for a later attempt. Either way, surface the
      // original 401 to the caller rather than retrying into a loop.
    }
    throw error;
  }
}
