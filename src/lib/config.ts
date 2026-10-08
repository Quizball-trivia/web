import type { DuelGameId, RoomGameId } from "@/lib/realtime/socket.types";

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

/**
 * Daily mini-games offered as a friend duel ("Jugar con un amigo"), comma-separated, e.g. "buscaminas,pistas,ultimo".
 * Mirrors the backend kill switch DUEL_GAMES_ENABLED; empty = no duel rooms offered.
 */
const isRoomGameId = (game: string): game is RoomGameId => game === "aproximado" || game === "shared_player" || game === "name_chain";
const roomGameList = (raw: string | undefined): RoomGameId[] => (raw ?? "").split(",").map((game) => game.trim()).filter(isRoomGameId);
/** On without any configuration (as on the backend); NEXT_PUBLIC_ROOM_GAMES_DISABLED still switches one off. */
const ROOM_GAMES_ON_BY_DEFAULT: readonly RoomGameId[] = ["shared_player", "name_chain"];
const ROOM_GAMES_DISABLED = roomGameList(process.env.NEXT_PUBLIC_ROOM_GAMES_DISABLED);
/**
 * Room games (2–6 players) offered in friend rooms: the ones named in NEXT_PUBLIC_ROOM_GAMES (e.g. "aproximado") and
 * the ones on by default, minus the disabled ones. Mirrors the backend's room.config.ts.
 */
export const ROOM_GAMES_ENABLED: readonly RoomGameId[] = [...new Set([...roomGameList(process.env.NEXT_PUBLIC_ROOM_GAMES), ...ROOM_GAMES_ON_BY_DEFAULT])]
  .filter((game) => !ROOM_GAMES_DISABLED.includes(game));

export const DUEL_GAMES_ENABLED: readonly DuelGameId[] = (process.env.NEXT_PUBLIC_DUEL_GAMES ?? "")
  .split(",")
  .map((game) => game.trim())
  .filter((game): game is DuelGameId => game === "buscaminas" || game === "pistas" || game === "ultimo" || game === "minuto");
