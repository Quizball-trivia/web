import { API_BASE_URL } from "@/lib/config";

/**
 * Guest identity for the public game pages. The server mints an opaque token;
 * we keep it in localStorage so a returning visitor keeps their day's results.
 * Guests play today's real daily sets; nothing they do touches an account.
 */
const STORAGE_KEY = "qb_guest_token";
export const GUEST_TOKEN_HEADER = "x-guest-token";

export class GuestApiError extends Error {
  constructor(message: string, public readonly status: number) {
    super(message);
    this.name = "GuestApiError";
  }
}

function readStored(): string | null {
  try { return typeof window === "undefined" ? null : window.localStorage.getItem(STORAGE_KEY); } catch { return null; }
}
function store(token: string): void {
  try { window.localStorage.setItem(STORAGE_KEY, token); } catch { /* private mode: token lives for the page */ }
}

let inflight: Promise<string> | null = null;

/** Returns the stored guest token, minting one on first use. */
export async function getGuestToken(locale: string): Promise<string> {
  const stored = readStored();
  if (stored) return stored;
  if (!inflight) {
    inflight = (async () => {
      const res = await fetch(`${API_BASE_URL}/api/v1/guest/session`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ locale }), signal: AbortSignal.timeout(10_000) });
      if (!res.ok) throw new GuestApiError(`Guest session failed (${res.status})`, res.status);
      const { token } = (await res.json()) as { token: string };
      store(token);
      return token;
    })().finally(() => { inflight = null; });
  }
  return inflight;
}

export function forgetGuestToken(): void {
  try { window.localStorage.removeItem(STORAGE_KEY); } catch { /* ignore */ }
}

/** Fetch against the guest API; a rejected token is dropped so the next call mints a fresh one. */
export async function guestFetch<T>(path: string, init: { method?: "GET" | "POST"; body?: unknown; locale: string }): Promise<T> {
  const token = await getGuestToken(init.locale);
  const res = await fetch(`${API_BASE_URL}${path}`, {
    method: init.method ?? "GET",
    headers: { "Content-Type": "application/json", [GUEST_TOKEN_HEADER]: token },
    body: init.body === undefined ? undefined : JSON.stringify(init.body),
    signal: AbortSignal.timeout(15_000),
  });
  if (res.status === 401) forgetGuestToken();
  const payload = await res.json().catch(() => null);
  if (!res.ok) {
    const message = (payload as { message?: string } | null)?.message ?? `Request failed (${res.status})`;
    throw new GuestApiError(message, res.status);
  }
  return payload as T;
}
