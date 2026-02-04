import { refresh } from "@/lib/auth/auth.service";
import { clearTokens } from "@/lib/auth/tokenStorage";
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

export async function apiFetch<
  M extends HttpMethod,
  P extends PathsWithMethod<M>,
>(method: M, path: P, options: ApiFetchOptions<M, P> = {}): Promise<ApiResponse<M, P>> {
  try {
    return await api.request(method, path, options);
  } catch (error) {
    if (error instanceof ApiError && error.status === 401 && !options.skipRefresh) {
      const refreshed = await refresh();
      if (refreshed) {
        return apiFetch(method, path, { ...options, skipRefresh: true });
      }
      clearTokens();
    }
    throw error;
  }
}
