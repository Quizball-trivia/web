import type { BoardScope, BoardView } from "@/lib/domain/leaderboard";
import { clubs, getClub, type Club } from "@/lib/clubs";
import { normalizeCountryCode } from "@/lib/geo/countryCode";

/** Player totals per board stay hidden until the boards are bigger (owner, 2026-10-16). */
export const SHOW_PLAYER_COUNTS = false;

export type LeaderboardMode = "ranked" | "auction" | "ticTacToe";

const MODES: readonly LeaderboardMode[] = ["ranked", "auction", "ticTacToe"];

const displayNames = new Map<string, Intl.DisplayNames | null>();

/** Country name in the UI language; falls back to the bare code. */
export function countryLabel(code: string, locale: string): string {
  if (!displayNames.has(locale)) {
    try {
      displayNames.set(locale, new Intl.DisplayNames([locale, "en"], { type: "region" }));
    } catch {
      displayNames.set(locale, null);
    }
  }
  return displayNames.get(locale)?.of(code.toUpperCase()) ?? code.toUpperCase();
}

/** Every club a fan can pick; boards of other clubs appear once they have scoring players. */
export const BOARD_CLUB_IDS: readonly string[] = clubs.filter((club) => !club.hidden && !club.restrictedToUserId).map((club) => club.id);

/** A board's club: catalogue id or stored name. Owner-restricted clubs never get a public board. */
export function clubOf(value: string | null | undefined): Club | null {
  const club = getClub(value);
  return club && !club.restrictedToUserId ? club : null;
}

export function sameScope(a: BoardScope, b: BoardScope): boolean {
  if (a.kind !== b.kind) return false;
  if (a.kind === "country" && b.kind === "country") return a.country === b.country;
  if (a.kind === "club" && b.kind === "club") return a.club === b.club;
  return true;
}

export interface BoardParams {
  mode: LeaderboardMode;
  scope: BoardScope | null;
  view: BoardView;
}

/** `/leaderboard?mode=ranked&board=club&club=fc-barcelona&view=standings` */
export function parseBoardParams(params: URLSearchParams): BoardParams {
  const modeParam = params.get("mode");
  const mode = MODES.includes(modeParam as LeaderboardMode) ? (modeParam as LeaderboardMode) : "ranked";
  const view: BoardView = params.get("view") === "standings" ? "standings" : "players";
  const board = params.get("board");
  let scope: BoardScope | null = null;
  if (board === "global") scope = { kind: "global" };
  if (board === "country") {
    const country = normalizeCountryCode(params.get("country"))?.toUpperCase();
    if (country) scope = { kind: "country", country };
  }
  if (board === "club") {
    const club = clubOf(params.get("club"));
    if (club) scope = { kind: "club", club: club.id };
  }
  return { mode, scope, view: scope && scope.kind !== "global" ? view : "players" };
}

export function boardSearch({ mode, scope, view }: BoardParams): string {
  const params = new URLSearchParams();
  if (mode !== "ranked") params.set("mode", mode);
  if (scope && scope.kind !== "global") {
    params.set("board", scope.kind);
    if (scope.kind === "country") params.set("country", scope.country);
    if (scope.kind === "club") params.set("club", scope.club);
    if (view === "standings") params.set("view", "standings");
  }
  const query = params.toString();
  return query ? `?${query}` : "";
}
