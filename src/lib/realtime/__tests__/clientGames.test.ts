import { describe, expect, it } from "vitest";
import { ROOM_CLIENT_GAMES } from "@/features/room/roomGames";
import { ROOM_GAMES } from "@/lib/lobby/lobbyModes";
import { CLIENT_ROOM_GAMES } from "../clientGames";

describe("declared room games", () => {
  it("the handshake declares exactly the games the room screen can draw", () => {
    expect([...CLIENT_ROOM_GAMES].sort()).toEqual([...ROOM_CLIENT_GAMES].sort());
  });
  it("every lobby room game is declared", () => {
    for (const game of ROOM_GAMES) expect(CLIENT_ROOM_GAMES).toContain(game);
  });
});
