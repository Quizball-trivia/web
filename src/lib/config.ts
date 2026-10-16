import type { DuelGameId, RoomGameId } from "@/lib/realtime/socket.types";
/** Analytics only. Native replaces this module with its runtime platform. */
export const CLIENT_PLATFORM = 'web' as const;

function nonBlank(value: string | undefined, fallback: string): string {
  const trimmed = value?.trim();
  return trimmed && trimmed.length > 0 ? trimmed : fallback;
}

export const API_BASE_URL = nonBlank(
  process.env.NEXT_PUBLIC_API_URL,
  "http://localhost:8001",
);

/**
 * Master switch for phone / OTP sign-in. When on, the phone tab/OTP UI appears
 * in the auth modal AND the availability hook probes the backend (phone auth is
 * further gated to Georgian users server-side via GeoIP). When off, the phone
 * UI is hidden entirely and no backend probe runs.
 *
 * ON for now — being tested on staging. Flip to `false` to hide.
 */
export const PHONE_AUTH_ENABLED = true;

/** Guest friend lobbies (play Tic Tac Toe / Auction / Ranked sim with a friend without an account). Off = no route or socket change for guests. */
export const GUEST_LOBBIES_ENABLED = process.env.NEXT_PUBLIC_GUEST_LOBBIES === "true" || process.env.NEXT_PUBLIC_GUEST_LOBBIES === "1";
const ALL_ROOM_GAMES: readonly RoomGameId[] = ["aproximado", "shared_player", "name_chain", "tenable", "football_race"];
const ROOM_GAMES_DISABLED = (process.env.NEXT_PUBLIC_ROOM_GAMES_DISABLED ?? "").split(",").map((game) => game.trim());
/** Room games (2–6 players) offered in friend rooms: all of them, minus NEXT_PUBLIC_ROOM_GAMES_DISABLED (as the backend's room.config.ts). */
export const ROOM_GAMES_ENABLED: readonly RoomGameId[] = ALL_ROOM_GAMES.filter((game) => !ROOM_GAMES_DISABLED.includes(game));

/**
 * Daily mini-games offered as a friend duel ("Jugar con un amigo"), comma-separated, e.g. "buscaminas,pistas,ultimo".
 * Mirrors the backend kill switch DUEL_GAMES_ENABLED; empty = no duel rooms offered.
 */
export const DUEL_GAMES_ENABLED: readonly DuelGameId[] = (process.env.NEXT_PUBLIC_DUEL_GAMES ?? "")
  .split(",")
  .map((game) => game.trim())
  .filter((game): game is DuelGameId => game === "buscaminas" || game === "pistas" || game === "ultimo" || game === "minuto");
