import { describe, expect, it } from "vitest";
import {
  DUEL_GAMES,
  DUEL_GAME_LABEL_KEYS,
  LOBBY_MODES,
  canHostStart,
  isDuelGameEnabled, isRoomGameEnabled,
  lobbyModeCapabilities,
  modeChoiceKey,
} from "../lobbyModes";

describe("lobby mode capability map (web mirror)", () => {
  it("a duel room seats two, welcomes guests, needs no categories and never becomes party quiz", () => {
    expect(LOBBY_MODES.duel).toEqual({
      capacity: 2, playable: 2, guestAllowed: true, hostStart: { min: 2, max: 2 }, needsCategories: false, promotesToPartyQuiz: false,
    });
  });

  it("keeps the existing seat counts and guest rules", () => {
    expect(Object.fromEntries(Object.entries(LOBBY_MODES).map(([mode, caps]) => [mode, caps.playable]))).toEqual({
      friendly_possession: 2, friendly_party_quiz: 6, football_grid: 2, auction: 3, ranked_sim: 2, duel: 2, room_game: 6,
    });
    expect(Object.entries(LOBBY_MODES).filter(([, caps]) => caps.guestAllowed).map(([mode]) => mode).sort())
      .toEqual(["auction", "duel", "football_grid", "ranked_sim", "room_game"]);
  });

  it("a room game takes 2 to 6 players and must be known and enabled", () => {
    expect(canHostStart("room_game", 1)).toBe(false);
    expect(canHostStart("room_game", 2)).toBe(true);
    expect(canHostStart("room_game", 6)).toBe(true);
    expect(canHostStart("room_game", 7)).toBe(false);
    expect(isRoomGameEnabled("aproximado", ["aproximado"])).toBe(true);
    expect(isRoomGameEnabled("aproximado", [])).toBe(false);
    expect(isRoomGameEnabled("chess", ["aproximado"])).toBe(false);
  });

  it("host start needs the mode's member count", () => {
    expect(canHostStart("duel", 2)).toBe(true);
    expect(canHostStart("duel", 1)).toBe(false);
    expect(canHostStart("auction", 1)).toBe(true);
    expect(canHostStart("ranked_sim", 2)).toBe(false);
    expect(canHostStart(undefined, 2)).toBe(true);
    expect(lobbyModeCapabilities(null)).toBe(LOBBY_MODES.friendly_possession);
  });

  it("a duel game must be known and enabled", () => {
    expect(isDuelGameEnabled("pistas", ["pistas"])).toBe(true);
    expect(isDuelGameEnabled("buscaminas", ["pistas"])).toBe(false);
    expect(isDuelGameEnabled("chess", ["pistas"])).toBe(false);
    expect(isDuelGameEnabled(null, ["pistas"])).toBe(false);
    expect(isDuelGameEnabled("ultimo", ["ultimo"])).toBe(true);
    expect(isDuelGameEnabled("ultimo", ["buscaminas", "pistas"])).toBe(false);
  });

  it("every duel game has a label", () => {
    expect(DUEL_GAMES).toEqual(["buscaminas", "pistas", "ultimo", "minuto"]);
    expect(DUEL_GAME_LABEL_KEYS.ultimo).toBe("friend.duelUltimo");
    expect(DUEL_GAME_LABEL_KEYS.minuto).toBe("friend.duelMinuto");
    for (const game of DUEL_GAMES) expect(DUEL_GAME_LABEL_KEYS[game]).toBeTruthy();
  });

  it("each duel game is its own picker choice", () => {
    expect(modeChoiceKey({ gameMode: "duel", duelGame: "pistas" })).toBe("duel:pistas");
    expect(modeChoiceKey({ gameMode: "duel", duelGame: "ultimo" })).toBe("duel:ultimo");
    expect(modeChoiceKey({ gameMode: "auction", duelGame: null })).toBe("auction");
  });
});
