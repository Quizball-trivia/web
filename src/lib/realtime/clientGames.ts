/**
 * The room games this build can draw, declared in the socket handshake: the server never sends a lobby or a match of a
 * game a tab did not declare (an older tab cannot draw it). Kept equal to the room screen's registry (roomGames.ts) by
 * a test; it lives here so the socket client does not import the game screens.
 */
export const CLIENT_ROOM_GAMES: readonly string[] = ["aproximado", "shared_player", "name_chain", "tenable", "football_race", "codenames", "dato_falso", "conexiones"];
/** Newer versions of a game this build draws (`<game>@<version>`): Codenames word boards (2) and turn timers (3). Declared next to the games. */
export const CLIENT_GAME_VERSIONS: readonly string[] = ["codenames@2", "codenames@3"];
