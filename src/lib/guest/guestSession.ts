import { API_BASE_URL } from "@/lib/config";

/**
 * Guest identity for the public game pages. The server mints an opaque token;
 * this tab keeps it in memory for the whole visit and mirrors it to
 * localStorage so a returning visitor keeps the day's results. Guests play
 * today's real daily sets; nothing they do touches an account.
 */
const STORAGE_KEY = "qb_guest_token";
const LOCK_NAME = "qb_guest_token_mint";
export const GUEST_TOKEN_HEADER = "x-guest-token";

export class GuestApiError extends Error {
  constructor(message: string, public readonly status: number) {
    super(message);
    this.name = "GuestApiError";
  }
}

/** The identity this tab is using. Once set it wins over storage, so a run never changes identity midway. */
let current: string | null = null;
let inflight: Promise<string> | null = null;

function readStored(): string | null {
  try { return typeof window === "undefined" ? null : window.localStorage.getItem(STORAGE_KEY); } catch { return null; }
}
function store(token: string): void {
  try { window.localStorage.setItem(STORAGE_KEY, token); } catch { /* private mode: the in-memory copy carries the visit */ }
}

async function mint(locale: string): Promise<string> {
  const res = await fetch(`${API_BASE_URL}/api/v1/guest/session`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ locale }), signal: AbortSignal.timeout(10_000) });
  if (!res.ok) throw new GuestApiError(`Guest session failed (${res.status})`, res.status);
  const { token } = (await res.json()) as { token: string };
  store(token);
  return token;
}

/** One mint per browser even with several first-use tabs: the Web Lock serialises them and the loser re-reads storage. */
async function mintOnce(locale: string): Promise<string> {
  const locks = typeof navigator !== "undefined" ? (navigator as Navigator & { locks?: { request: <T>(name: string, cb: () => Promise<T>) => Promise<T> } }).locks : undefined;
  const body = async () => readStored() ?? mint(locale);
  return locks ? locks.request(LOCK_NAME, body) : body();
}

/** Returns this tab's guest token, minting one on first use. */
export async function getGuestToken(locale: string): Promise<string> {
  if (current) return current;
  const stored = readStored();
  if (stored) { current = stored; return stored; }
  if (!inflight) inflight = mintOnce(locale).then((token) => { current = token; return token; }).finally(() => { inflight = null; });
  return inflight;
}

/** Drops a token the server rejected — only if it is still the one this tab uses. */
export function forgetGuestToken(rejected: string): void {
  if (current !== rejected) return;
  current = null;
  try { if (readStored() === rejected) window.localStorage.removeItem(STORAGE_KEY); } catch { /* ignore */ }
}

/** Fetch against the guest API with this tab's identity. */
export async function guestFetch<T>(path: string, init: { method?: "GET" | "POST"; body?: unknown; locale: string }): Promise<T> {
  const token = await getGuestToken(init.locale);
  const res = await fetch(`${API_BASE_URL}${path}`, {
    method: init.method ?? "GET",
    headers: { "Content-Type": "application/json", [GUEST_TOKEN_HEADER]: token },
    body: init.body === undefined ? undefined : JSON.stringify(init.body),
    signal: AbortSignal.timeout(15_000),
  });
  if (res.status === 401) forgetGuestToken(token);
  const payload = await res.json().catch(() => null);
  if (!res.ok) {
    const message = (payload as { message?: string } | null)?.message ?? `Request failed (${res.status})`;
    throw new GuestApiError(message, res.status);
  }
  return payload as T;
}
