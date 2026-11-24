import { apiFetch } from "@/lib/api/client";
import type { paths } from "@/types/api.generated";

type UpdateMeBody =
  NonNullable<
    paths["/api/v1/users/me"]["put"]["requestBody"]
  >["content"]["application/json"];

export function getMe() {
  return apiFetch("get", "/api/v1/users/me");
}

export function updateMe(payload: UpdateMeBody, signal?: AbortSignal) {
  return apiFetch("put", "/api/v1/users/me", {
    body: payload,
    signal,
  });
}

export function resetOwnOnboarding() {
  return apiFetch("post", "/api/v1/users/me/reset-onboarding");
}

export function getWeekendLeagueCurrent() {
  return apiFetch("get", "/api/v1/weekend-league/current");
}

export interface WlStandingsEntry {
  user_id: string; nickname: string | null; avatar_url: string | null;
  country: string | null; tier: string; rank: number; points: number;
  advanced: boolean;
}
export interface WlStandingsResponse {
  tournament_id: string | null;
  game_index: number | null;
  entries: WlStandingsEntry[];
}
export function getWeekendLeagueStandings(): Promise<WlStandingsResponse> {
  // Path not yet in api.generated.ts (regenerate on the next openapi pass).
  return apiFetch("get", "/api/v1/weekend-league/standings" as never) as Promise<WlStandingsResponse>;
}

export interface WlHallOfFameEdition {
  week_key: string;
  entrants: number;
  podium: Array<{ rank: number; nickname: string | null; avatar_url: string | null; points: number }>;
}
export interface WlHallOfFameEntry {
  nickname: string | null; avatar_url: string | null;
  gold: number; silver: number; bronze: number; finals_played: number;
}
export interface WlHallOfFameResponse {
  editions: WlHallOfFameEdition[];
  all_time: WlHallOfFameEntry[];
}
export interface OrshabatobaHistoryResponse {
  next: { episode: number; event_date: string };
  editions: Array<{
    episode: number;
    event_date: string;
    players: number;
    podium: Array<{ rank: number; nickname: string | null; avatar_url: string | null; points: number }>;
  }>;
}
/** Past ორშაბათობა show nights + the next one (public, same for everyone). */
export function getOrshabatobaHistory(): Promise<OrshabatobaHistoryResponse> {
  // Path not yet in api.generated.ts (regenerate on the next openapi pass).
  return apiFetch("get", "/api/v1/weekend-league/orshabatoba/history" as never) as Promise<OrshabatobaHistoryResponse>;
}
export interface OrshabatobaLeaderboardResponse {
  episode: number;
  event_date: string;
  rows: Array<{ rank: number; nickname: string | null; avatar_url: string | null; points: number; is_you: boolean }>;
}
/** One past ორშაბათობა show night's full leaderboard (public; marks the signed-in caller's row). */
export function getOrshabatobaLeaderboard(episode: number): Promise<OrshabatobaLeaderboardResponse> {
  return apiFetch("get", `/api/v1/weekend-league/orshabatoba/history/${episode}` as never) as Promise<OrshabatobaLeaderboardResponse>;
}
export function getWeekendLeagueHallOfFame(): Promise<WlHallOfFameResponse> {
  // Path not yet in api.generated.ts (regenerate on the next openapi pass).
  return apiFetch("get", "/api/v1/weekend-league/hall-of-fame" as never) as Promise<WlHallOfFameResponse>;
}

export function getWeekendLeagueQp() {
  return apiFetch("get", "/api/v1/weekend-league/qp");
}

export function enterWeekendLeague() {
  return apiFetch("post", "/api/v1/weekend-league/enter");
}

export function checkinWeekendLeague() {
  return apiFetch("post", "/api/v1/weekend-league/checkin");
}

export interface WlHostStartResponse {
  started: boolean;
  reason: "ok" | "already_started" | "not_enough_players" | "not_open" | "questions_updating" | "questions_invalid" | "wrong_event";
  kickoff_at_ms: number | null;
  registered: number;
}
/** Host-run event (Orshabatoba): the named host account starts the game for everyone. */
export function hostStartWeekendLeague(tournamentId: string): Promise<WlHostStartResponse> {
  // Scoped to the event on screen, so a stale tap can never start a different one.
  return apiFetch("post", "/api/v1/weekend-league/host-start" as never, { body: { tournament_id: tournamentId } } as never) as Promise<WlHostStartResponse>;
}
