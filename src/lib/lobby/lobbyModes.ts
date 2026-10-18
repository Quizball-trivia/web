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
  room_game: { capacity: 8, playable: 8, guestAllowed: true, hostStart: { min: 2, max: 8 }, needsCategories: false, promotesToPartyQuiz: false },
};

export const ROOM_GAMES: readonly RoomGameId[] = ["aproximado", "shared_player", "name_chain", "tenable", "football_race", "codenames"];

/** Seats of a room game without its own cap (the room mode holds eight; only Football Codenames uses them). */
const ROOM_GAME_DEFAULT_SEATS = 6;
/** Room games with their own seat cap (mirrors the backend's ROOM_GAME_MAX_SEATS). */
const ROOM_GAME_MAX_SEATS: Partial<Record<RoomGameId, number>> = { football_race: 4, codenames: 8 };

/** Members a mode choice can play: a room game may seat fewer than its mode. */
export function choicePlayable(choice: { gameMode: LobbyGameMode; roomGame?: RoomGameId | null }): number {
  const playable = LOBBY_MODES[choice.gameMode].playable;
  if (choice.gameMode !== "room_game") return playable;
  return Math.min(playable, ROOM_GAME_MAX_SEATS[choice.roomGame ?? ROOM_GAMES[0]] ?? ROOM_GAME_DEFAULT_SEATS);
}

/** Tab label, panel title and description of each room game. */
export const ROOM_GAME_LABEL_KEYS: Readonly<Record<RoomGameId, { tab: MessageKey; title: MessageKey; description: MessageKey }>> = {
  aproximado: { tab: "friend.roomTabAproximado", title: "friend.roomAproximado", description: "friend.roomGameDescription" },
  shared_player: { tab: "friend.roomTabSharedPlayer", title: "friend.roomSharedPlayer", description: "friend.roomSharedPlayerDescription" },
  name_chain: { tab: "friend.roomTabNameChain", title: "friend.roomNameChain", description: "friend.roomNameChainDescription" },
  tenable: { tab: "friend.roomTabTenable", title: "friend.roomTenable", description: "friend.roomTenableDescription" },
  football_race: { tab: "friend.roomTabFootballRace", title: "friend.roomFootballRace", description: "friend.roomFootballRaceDescription" },
  codenames: { tab: "friend.roomTabCodenames", title: "friend.roomCodenames", description: "friend.roomCodenamesDescription" },
};

/** Labels of a room game, or null for one this build does not know (a lobby set up by a newer client). */
export const roomGameLabels = (game: string | null | undefined) =>
  game && Object.hasOwn(ROOM_GAME_LABEL_KEYS, game) ? ROOM_GAME_LABEL_KEYS[game as RoomGameId] : null;

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

export function canHostStart(mode: LobbyGameMode | null | undefined, memberCount: number, roomGame?: RoomGameId | null): boolean {
  const shape = lobbyModeCapabilities(mode).hostStart;
  const max = mode === "room_game" ? Math.min(shape?.max ?? 0, choicePlayable({ gameMode: mode, roomGame })) : shape?.max ?? 0;
  return shape !== null && memberCount >= shape.min && memberCount <= max;
}

/** One entry of the room's mode picker: a duel is one choice per game, and so is a room game. */
export type LobbyModeChoice = { gameMode: LobbyGameMode; duelGame: DuelGameId | null; roomGame?: RoomGameId | null };

export function modeChoiceKey(choice: LobbyModeChoice): string {
  if (choice.gameMode === "duel") return `duel:${choice.duelGame}`;
  // A room that names no game (an older server) is the first room game.
  return choice.gameMode === "room_game" ? `room_game:${choice.roomGame ?? ROOM_GAMES[0]}` : choice.gameMode;
}

/** The key of the game a lobby's stored settings name: what its mode picker marks as selected. */
export function settingsChoiceKey(settings: { gameMode: LobbyGameMode; duelGame?: DuelGameId | null; roomGame?: RoomGameId | null } | null | undefined): string {
  const gameMode = settings?.gameMode ?? "friendly_possession";
  return modeChoiceKey({
    gameMode,
    duelGame: gameMode === "duel" ? settings?.duelGame ?? null : null,
    roomGame: gameMode === "room_game" ? settings?.roomGame ?? null : null,
  });
}
