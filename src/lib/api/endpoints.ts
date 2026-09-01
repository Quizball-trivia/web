import { apiFetch } from "@/lib/api/client";
import type { paths } from "@/types/api.generated";

type UpdateMeBody =
  NonNullable<
    paths["/api/v1/users/me"]["put"]["requestBody"]
  >["content"]["application/json"];

export function getMe() {
  return apiFetch("get", "/api/v1/users/me");
}

export function updateMe(payload: UpdateMeBody) {
  return apiFetch("put", "/api/v1/users/me", {
    body: payload,
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
