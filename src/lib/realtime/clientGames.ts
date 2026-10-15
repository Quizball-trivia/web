/**
 * The room games this build can draw, declared in the socket handshake: the server never sends a lobby or a match of a
 * game a tab did not declare (an older tab cannot draw it). Kept equal to the room screen's registry (roomGames.ts) by
 * a test; it lives here so the socket client does not import the game screens.
 */
export const CLIENT_ROOM_GAMES: readonly string[] = ["aproximado", "shared_player", "name_chain", "tenable"];
