import { API_BASE_URL } from "@/lib/config";
import { getSupabaseAccessToken } from "@/lib/auth/supabase";
import { GUEST_TOKEN_HEADER, forgetGuestToken, getGuestToken, peekGuestToken } from "@/lib/guest/guestSession";
import { useAuthStore } from "@/stores/auth.store";
import { timeoutSignal } from "@/lib/timeoutSignal";

/** A daily game's API refused a call: `message` is the server's reason code (stale_state, day_over, …). */
export class DailyGameApiError extends Error {
  constructor(message: string, public readonly status: number) {
    super(message);
    this.name = "DailyGameApiError";
  }
}

export type Identity = "player" | "optional" | "none";

/**
 * The HTTP client every daily game shares (Buscaminas' identity rules): members send their session, guests the
 * site-wide guest session; a stale guest token is forgotten and the call retried once.
 */
export function createDailyGameCall(base: string, error: (message: string, status: number) => Error = (m, s) => new DailyGameApiError(m, s)) {
  return async function call<T>(
    path: string, method: "GET" | "POST", body: unknown, locale: string,
    opts: { identity?: Identity; timeoutMs?: number } = {}, retried = false,
  ): Promise<T> {
    const identity = opts.identity ?? "player";
    const headers = new Headers({ "Content-Type": "application/json" });
    let guestToken: string | null = null;
    if (identity !== "none") {
      const member = useAuthStore.getState().status === "authenticated";
      const bearer = await getSupabaseAccessToken().catch(() => null);
      // A signed-in player whose session can't be read right now must not quietly become a guest.
      if (member && !bearer) throw error("session_unavailable", 0);
      if (bearer) headers.set("Authorization", `Bearer ${bearer}`);
      else if (identity === "player") {
        guestToken = await getGuestToken(locale);
        headers.set(GUEST_TOKEN_HEADER, guestToken);
      } else {
        guestToken = peekGuestToken();
        if (guestToken) headers.set(GUEST_TOKEN_HEADER, guestToken);
      }
    }
    const response = await fetch(`${API_BASE_URL}${base}${path}`, {
      method,
      headers,
      body: body === undefined ? undefined : JSON.stringify(body),
      signal: timeoutSignal(opts.timeoutMs ?? 15_000),
    });
    if (response.status === 401 && guestToken) {
      forgetGuestToken(guestToken);
      if (!retried) return call<T>(path, method, body, locale, opts, true);
    }
    const payload = await response.json().catch(() => null);
    if (!response.ok) {
      const data = payload as { code?: string; message?: string; details?: { reason?: string }; error?: { code?: string } } | null;
      throw error(data?.details?.reason ?? data?.code ?? data?.error?.code ?? data?.message ?? `Request failed (${response.status})`, response.status);
    }
    return payload as T;
  };
}

/** No answer at all (dropped connection, timeout): the move may or may not have reached the server. */
export function isNetworkFailure(error: unknown): boolean {
  if (error instanceof DailyGameApiError) return false;
  const name = (error as { name?: unknown } | null)?.name;
  return error instanceof TypeError || name === "AbortError" || name === "TimeoutError";
}
