import { API_BASE_URL } from "@/lib/config";
import {
  isPartnerSessionEndedReason,
  type MeGamesResponse,
  type PartnerGameId,
  type PartnerErrorCode,
  type PartnerSessionEndedReason,
  type RedeemResponse,
} from "./partnerApi.types";
import { createMockPartnerTransport } from "./partnerMock";

export interface PartnerTransportRequest {
  method: "GET" | "POST";
  headers: Record<string, string>;
  body?: string;
  /** Aborted when the client's request deadline passes. */
  signal?: AbortSignal;
}

export interface PartnerTransportResponse {
  status: number;
  body: unknown;
  /** Parsed Retry-After, when the server sent one. */
  retryAfterMs?: number;
}

export type PartnerTransport = (path: string, request: PartnerTransportRequest) => Promise<PartnerTransportResponse>;

export class PartnerApiError extends Error {
  constructor(
    readonly status: number,
    /** Known codes are typed; anything else the server sends is kept as is. */
    readonly code: PartnerErrorCode | (string & {}),
    message: string,
    /** Why a partner session ended (401 session_ended); undefined if the server sent none or an unknown one. */
    readonly reason?: PartnerSessionEndedReason,
    readonly retryAfterMs?: number,
  ) {
    super(message);
    this.name = "PartnerApiError";
  }
}

/** No answer within the request deadline; treated like a network failure. */
export class PartnerTimeoutError extends Error {
  constructor(path: string) {
    super(`Partner API request timed out: ${path}`);
    this.name = "PartnerTimeoutError";
  }
}

export const PARTNER_REQUEST_TIMEOUT_MS = 10_000;

export function isPartnerMockMode(): boolean {
  return process.env.NEXT_PUBLIC_PARTNER_API_MOCK === "1";
}

export function fetchPartnerTransport(baseUrl = API_BASE_URL): PartnerTransport {
  const base = baseUrl.replace(/\/+$/, "");
  return async (path, request) => {
    // Bearer only: the partner token must never be paired with Quizball's own cookies.
    const response = await fetch(`${base}${path}`, {
      method: request.method,
      headers: request.headers,
      body: request.body,
      signal: request.signal,
      credentials: "omit",
      cache: "no-store",
    });
    let body: unknown = null;
    try {
      body = await response.json();
    } catch {
      body = null;
    }
    return { status: response.status, body, retryAfterMs: parseRetryAfter(response.headers.get("Retry-After")) };
  };
}

export function parseRetryAfter(value: string | null, now = Date.now()): number | undefined {
  if (!value) return undefined;
  const seconds = Number(value);
  if (Number.isFinite(seconds)) return Math.max(0, seconds * 1000);
  const date = Date.parse(value);
  return Number.isFinite(date) ? Math.max(0, date - now) : undefined;
}

export function defaultPartnerTransport(): PartnerTransport {
  return isPartnerMockMode() ? createMockPartnerTransport() : fetchPartnerTransport();
}

function errorFrom({ status, body, retryAfterMs }: PartnerTransportResponse): PartnerApiError {
  const error = (body as { error?: { code?: unknown; message?: unknown; reason?: unknown } } | null)?.error;
  const code = typeof error?.code === "string" ? error.code : status >= 500 ? "internal_error" : "invalid_request";
  return new PartnerApiError(
    status,
    code,
    typeof error?.message === "string" ? error.message : `Partner API ${status}`,
    isPartnerSessionEndedReason(error?.reason) ? error.reason : undefined,
    retryAfterMs,
  );
}

export interface PartnerApiClient {
  redeem(token: string): Promise<RedeemResponse>;
  refresh(): Promise<RedeemResponse>;
  getMyGames(): Promise<MeGamesResponse>;
  /** A game's own endpoints: `/partner/v1/games/{gameId}/{path}`. */
  game<T>(gameId: PartnerGameId, path: string, method: "GET" | "POST", body?: unknown): Promise<T>;
}

export interface PartnerApiClientOptions {
  transport: PartnerTransport;
  /** Reads the in-memory access token; the client never persists it. */
  getAccessToken: () => string | null;
  /** Called for every request that finds the session gone (401, a blocked player, or no token in memory). */
  onSessionEnded: (error: PartnerApiError) => void;
  timeoutMs?: number;
}

/** Races the transport against a deadline, so even a transport that ignores the abort signal cannot hang a caller. */
async function withDeadline<T>(path: string, timeoutMs: number, run: (signal: AbortSignal) => Promise<T>): Promise<T> {
  const controller = new AbortController();
  let timer: ReturnType<typeof setTimeout> | undefined;
  const deadline = new Promise<never>((_, reject) => {
    timer = setTimeout(() => {
      controller.abort();
      reject(new PartnerTimeoutError(path));
    }, timeoutMs);
  });
  try {
    return await Promise.race([run(controller.signal), deadline]);
  } finally {
    clearTimeout(timer);
  }
}

export function createPartnerApiClient({
  transport,
  getAccessToken,
  onSessionEnded,
  timeoutMs = PARTNER_REQUEST_TIMEOUT_MS,
}: PartnerApiClientOptions): PartnerApiClient {
  async function send<T>(path: string, method: "GET" | "POST", body?: unknown, auth = true): Promise<T> {
    const headers: Record<string, string> = { Accept: "application/json" };
    if (body !== undefined) headers["Content-Type"] = "application/json";
    if (auth) {
      const token = getAccessToken();
      if (!token) {
        const error = new PartnerApiError(401, "session_ended", "No partner session");
        onSessionEnded(error);
        throw error;
      }
      headers.Authorization = `Bearer ${token}`;
    }
    const payload = body === undefined ? undefined : JSON.stringify(body);
    const response = await withDeadline(path, timeoutMs, (signal) => transport(path, { method, headers, body: payload, signal }));
    if (response.status >= 200 && response.status < 300) return response.body as T;
    const error = errorFrom(response);
    const sessionGone = response.status === 401 || (response.status === 403 && error.code === "player_blocked");
    if (auth && sessionGone) onSessionEnded(error);
    throw error;
  }

  return {
    redeem: (token) => send<RedeemResponse>("/partner/v1/sessions/redeem", "POST", { token }, false),
    refresh: () => send<RedeemResponse>("/partner/v1/sessions/refresh", "POST"),
    getMyGames: () => send<MeGamesResponse>("/partner/v1/me/games", "GET"),
    game: <T,>(gameId: PartnerGameId, path: string, method: "GET" | "POST", body?: unknown) =>
      send<T>(`/partner/v1/games/${gameId}/${path.replace(/^\//, "")}`, method, body),
  };
}
