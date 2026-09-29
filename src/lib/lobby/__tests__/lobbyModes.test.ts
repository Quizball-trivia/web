import { describe, expect, it } from "vitest";
import {
  LOBBY_MODES,
  canHostStart,
  isDuelGameEnabled,
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
      friendly_possession: 2, friendly_party_quiz: 6, football_grid: 2, auction: 3, ranked_sim: 2, duel: 2,
    });
    expect(Object.entries(LOBBY_MODES).filter(([, caps]) => caps.guestAllowed).map(([mode]) => mode).sort())
      .toEqual(["auction", "duel", "football_grid", "ranked_sim"]);
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
  });

  it("each duel game is its own picker choice", () => {
    expect(modeChoiceKey({ gameMode: "duel", duelGame: "pistas" })).toBe("duel:pistas");
    expect(modeChoiceKey({ gameMode: "auction", duelGame: null })).toBe("auction");
  });
});
