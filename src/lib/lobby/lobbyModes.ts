import { DUEL_GAMES_ENABLED, ROOM_GAMES_ENABLED } from "@/lib/config";
import type { MessageKey } from "@/lib/i18n/messages";
import type { DuelGameId, LobbyGameMode, RoomGameId } from "@/lib/realtime/socket.types";

/**
 * What each friend-room mode allows. Mirrors the backend map (backend-node
 * src/modules/lobbies/lobby-modes.ts); the server stays authoritative, this only
 * decides what the room screen offers.
 */
export interface LobbyModeCapabilities {
  /** Members the room may hold (possession grows past 2 and becomes party quiz). */
  capacity: number;
  /** Members who can play it: a mode is switchable only while the room fits. */
  playable: number;
  guestAllowed: boolean;
  /** Member counts a host start accepts; null = no Start button (ranked sim drafts on ready). */
  hostStart: { min: number; max: number } | null;
  needsCategories: boolean;
  promotesToPartyQuiz: boolean;
}

export const LOBBY_MODES: Readonly<Record<LobbyGameMode, LobbyModeCapabilities>> = {
  friendly_possession: { capacity: 6, playable: 2, guestAllowed: false, hostStart: { min: 2, max: 2 }, needsCategories: true, promotesToPartyQuiz: true },
  friendly_party_quiz: { capacity: 6, playable: 6, guestAllowed: false, hostStart: { min: 2, max: 6 }, needsCategories: true, promotesToPartyQuiz: true },
  football_grid: { capacity: 2, playable: 2, guestAllowed: true, hostStart: { min: 2, max: 2 }, needsCategories: false, promotesToPartyQuiz: false },
  auction: { capacity: 3, playable: 3, guestAllowed: true, hostStart: { min: 1, max: 3 }, needsCategories: false, promotesToPartyQuiz: false },
  ranked_sim: { capacity: 6, playable: 2, guestAllowed: true, hostStart: null, needsCategories: false, promotesToPartyQuiz: true },
  duel: { capacity: 2, playable: 2, guestAllowed: true, hostStart: { min: 2, max: 2 }, needsCategories: false, promotesToPartyQuiz: false },
  room_game: { capacity: 6, playable: 6, guestAllowed: true, hostStart: { min: 2, max: 6 }, needsCategories: false, promotesToPartyQuiz: false },
};

export const ROOM_GAMES: readonly RoomGameId[] = ["aproximado", "shared_player", "name_chain"];

/** Tab label, panel title and description of each room game. */
export const ROOM_GAME_LABEL_KEYS: Readonly<Record<RoomGameId, { tab: MessageKey; title: MessageKey; description: MessageKey }>> = {
  aproximado: { tab: "friend.roomTabAproximado", title: "friend.roomAproximado", description: "friend.roomGameDescription" },
  shared_player: { tab: "friend.roomTabSharedPlayer", title: "friend.roomSharedPlayer", description: "friend.roomSharedPlayerDescription" },
  name_chain: { tab: "friend.roomTabNameChain", title: "friend.roomNameChain", description: "friend.roomNameChainDescription" },
};

export function isRoomGameEnabled(value: unknown, enabled: readonly RoomGameId[] = ROOM_GAMES_ENABLED): value is RoomGameId {
  return ROOM_GAMES.includes(value as RoomGameId) && enabled.includes(value as RoomGameId);
}

export const DUEL_GAMES: readonly DuelGameId[] = ["buscaminas", "pistas", "ultimo", "minuto"];

/** "Buscaminas futbolero · duelo" / "Pistas futboleras · duelo" / "Último en pie futbolero · duelo". */
export const DUEL_GAME_LABEL_KEYS: Readonly<Record<DuelGameId, MessageKey>> = {
  buscaminas: "friend.duelBuscaminas",
  pistas: "friend.duelPistas",
  ultimo: "friend.duelUltimo",
  minuto: "friend.duelMinuto",
};

export function lobbyModeCapabilities(mode: LobbyGameMode | null | undefined): LobbyModeCapabilities {
  return (mode && LOBBY_MODES[mode]) || LOBBY_MODES.friendly_possession;
}

export function isDuelGameId(value: unknown): value is DuelGameId {
  return DUEL_GAMES.includes(value as DuelGameId);
}

export function isDuelGameEnabled(value: unknown, enabled: readonly DuelGameId[] = DUEL_GAMES_ENABLED): value is DuelGameId {
  return isDuelGameId(value) && enabled.includes(value);
}

export function canHostStart(mode: LobbyGameMode | null | undefined, memberCount: number): boolean {
  const shape = lobbyModeCapabilities(mode).hostStart;
  return shape !== null && memberCount >= shape.min && memberCount <= shape.max;
}

/** One entry of the room's mode picker: a duel is one choice per game, and so is a room game. */
export type LobbyModeChoice = { gameMode: LobbyGameMode; duelGame: DuelGameId | null; roomGame?: RoomGameId | null };

export function modeChoiceKey(choice: LobbyModeChoice): string {
  if (choice.gameMode === "duel") return `duel:${choice.duelGame}`;
  // A room that names no game (an older server) is the first room game.
  return choice.gameMode === "room_game" ? `room_game:${choice.roomGame ?? ROOM_GAMES[0]}` : choice.gameMode;
}
