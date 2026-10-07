import type { PartnerTransport, PartnerTransportResponse } from "./partnerApiClient";
import type { MeGamesResponse, PartnerGameTile, PartnerPlayerLanguage, RedeemResponse } from "./partnerApi.types";

// Local fixtures for NEXT_PUBLIC_PARTNER_API_MOCK=1: the shell runs without the backend.
// Launch tokens "expired", "used", "unknown", "blocked" and "down" (503) return the matching redeem error;
// "ends" redeems but the session is ended on the next call (exercises the relaunch screen).

const TBILISI_OFFSET_MS = 4 * 60 * 60 * 1000; // Georgia has no DST.
const MOCK_SESSION_MS = 10 * 60 * 1000;

/** Default rule version order (§3), with a mix of states so every tile variant renders. */
const SEEDED_GAMES: Array<Omit<PartnerGameTile, "playsLeft">> = [
  { gameId: "ranked", playsLimit: 10, playsUsed: 3, maxScore: 500, available: true },
  { gameId: "guess-the-goal", playsLimit: 1, playsUsed: 0, maxScore: 140, available: true },
  { gameId: "true-false", playsLimit: 1, playsUsed: 1, maxScore: 200, available: true },
  { gameId: "countdown", playsLimit: 1, playsUsed: 0, maxScore: null, available: true },
  { gameId: "pick-em", playsLimit: 1, playsUsed: 0, maxScore: 500, available: true },
  { gameId: "career-path", playsLimit: 2, playsUsed: 0, maxScore: 300, available: true },
  { gameId: "higher-lower", playsLimit: 1, playsUsed: 1, maxScore: 400, available: true },
  { gameId: "card-detective", playsLimit: 1, playsUsed: 0, maxScore: 1000, available: true },
  { gameId: "road-to-goal", playsLimit: 1, playsUsed: 0, maxScore: 400, available: true },
  { gameId: "trivia-mines", playsLimit: 1, playsUsed: 0, maxScore: null, available: false },
  { gameId: "quiz-board", playsLimit: 1, playsUsed: 0, maxScore: 1800, available: false },
];

const REDEEM_ERRORS: Record<string, PartnerTransportResponse> = {
  expired: { status: 400, body: { error: { code: "token_expired", message: "Launch token has expired" } } },
  used: { status: 400, body: { error: { code: "token_used", message: "Launch token was already used" } } },
  unknown: { status: 400, body: { error: { code: "token_unknown", message: "Launch token is unknown" } } },
  blocked: { status: 403, body: { error: { code: "player_blocked", message: "The player is blocked" } } },
  down: { status: 503, body: { error: { code: "maintenance", message: "Temporarily unavailable" } }, retryAfterMs: 1000 },
};

const SESSION_ENDED: PartnerTransportResponse = {
  status: 401,
  body: { error: { code: "session_ended", message: "Partner session has ended", reason: "replaced" } },
};

export function tbilisiDay(now: Date): string {
  return new Date(now.getTime() + TBILISI_OFFSET_MS).toISOString().slice(0, 10);
}

export function nextTbilisiMidnight(now: Date): Date {
  const local = new Date(now.getTime() + TBILISI_OFFSET_MS);
  const nextLocalMidnight = Date.UTC(local.getUTCFullYear(), local.getUTCMonth(), local.getUTCDate() + 1);
  return new Date(nextLocalMidnight - TBILISI_OFFSET_MS);
}

export function mockMeGames(now = new Date()): MeGamesResponse {
  return {
    partnerDay: tbilisiDay(now),
    resetsAt: nextTbilisiMidnight(now).toISOString(),
    games: SEEDED_GAMES.map((game) => ({ ...game, playsLeft: Math.max(0, game.playsLimit - game.playsUsed) })),
  };
}

export function createMockPartnerTransport({ latencyMs = 250, now = () => new Date() } = {}): PartnerTransport {
  let issued = 0;
  const live = new Set<string>();
  const endingSessions = new Set<string>();

  const issue = (language: PartnerPlayerLanguage): RedeemResponse => {
    issued += 1;
    const accessToken = `mock-access-${issued}`;
    live.add(accessToken);
    return {
      accessToken,
      accessTokenExpiresAt: new Date(now().getTime() + MOCK_SESSION_MS).toISOString(),
      player: { id: "mock-player-1", displayName: "nik****om", language },
      partner: { slug: "freecroco", name: "Freecroco" },
    };
  };

  const bearer = (headers: Record<string, string>) => headers.Authorization?.replace(/^Bearer /, "") ?? "";

  return async (path, request) => {
    if (latencyMs > 0) await new Promise((resolve) => setTimeout(resolve, latencyMs));

    if (path === "/partner/v1/sessions/redeem" && request.method === "POST") {
      const { token } = JSON.parse(request.body ?? "{}") as { token?: string };
      if (!token) return { status: 400, body: { error: { code: "invalid_request", message: "token is required" } } };
      const failure = REDEEM_ERRORS[token];
      if (failure) return failure;
      const session = issue(token === "en" ? "en" : "ka");
      if (token === "ends") endingSessions.add(session.accessToken);
      return { status: 200, body: session };
    }

    const accessToken = bearer(request.headers);
    if (!live.has(accessToken)) return SESSION_ENDED;
    if (endingSessions.has(accessToken)) {
      live.delete(accessToken);
      return { status: 401, body: { error: { code: "session_ended", message: "Partner session has ended", reason: "expired" } } };
    }

    if (path === "/partner/v1/sessions/refresh" && request.method === "POST") {
      live.delete(accessToken);
      return { status: 200, body: issue("ka") };
    }
    if (path === "/partner/v1/me/games" && request.method === "GET") {
      return { status: 200, body: mockMeGames(now()) };
    }
    return { status: 404, body: { error: { code: "invalid_request", message: `No mock for ${request.method} ${path}` } } };
  };
}
