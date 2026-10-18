import { describe, expect, it } from "vitest";
import type { RoomStatePayload } from "@/lib/realtime/socket.types";
import { toSoloState, type CodenamesDailyState } from "../codenames.daily";
import { codenamesRoomRules, toRoomView, toServerCommand, type CodenamesServerView } from "../codenames.server";
import { foldClue } from "../codenames.view";

// INVENTED cards and clues.
const view = (over: Partial<CodenamesServerView> = {}): CodenamesServerView => ({
  phase: "guess", cancelled: false, cancelReason: null, mySeat: 1, host: 0,
  players: [{ seat: 0, status: "in", team: 0, scout: true, sawKey: true }, { seat: 1, status: "in", team: 0, scout: false, sawKey: false }],
  botScout: [false, true], starting: 0, turn: 0, turnNo: 3,
  cards: Array.from({ length: 20 }, (_, i) => ({ id: `card-${i}`, revealed: null, key: null, picks: [] })),
  clue: { word: "Alpha", count: 2, bot: false }, guessesLeft: 3, history: [], used: ["alpha"], result: null, shuffles: 0, ...over,
});

describe("codenames room client", () => {
  it("sends cards by board position for the turn on screen", () => {
    expect(toServerCommand({ type: "flip", cardId: "card-7" }, view())).toEqual({ type: "flip", turn: 3, card: 7 });
    expect(toServerCommand({ type: "pick", cardId: null }, view())).toMatchObject({ type: "point", turn: 3, card: null });
    const a = toServerCommand({ type: "pick", cardId: "card-1" }, view());
    const b = toServerCommand({ type: "pick", cardId: "card-1" }, view());
    expect(codenamesRoomRules.slot(a!)).not.toBe(codenamesRoomRules.slot(b!));
    expect(toServerCommand({ type: "shuffle" }, view({ shuffles: 2 }))).toEqual({ type: "shuffle", seen: 2 });
    expect(toServerCommand({ type: "flip", cardId: "nope" }, view())).toBeNull();
    expect(toServerCommand({ type: "clue", word: "Beta", count: 2 }, view())).toEqual({ type: "clue", turn: 3, word: "Beta", count: 2 });
    expect(toServerCommand({ type: "kickoff" }, view())).toEqual({ type: "kickoff" });
  });

  it("settles a command only when the screen shows its outcome (or its moment has passed)", () => {
    const { settled } = codenamesRoomRules;
    const teams = view({ phase: "teams", players: [{ seat: 0, status: "in", team: null, scout: false, sawKey: false }, { seat: 1, status: "in", team: null, scout: false, sawKey: false }] });
    expect(settled(teams, { type: "join", team: 1, scout: false })).toBe(false);
    const joined = view({ phase: "teams", players: [teams.players[0], { ...teams.players[1], team: 1 }] });
    expect(settled(joined, { type: "join", team: 1, scout: false })).toBe(true);
    expect(settled(view(), { type: "join", team: 1, scout: false })).toBe(true);
    expect(settled(view(), { type: "point", turn: 3, card: 2 })).toBe(true);
    expect(settled(view({ phase: "teams" }), { type: "kickoff" })).toBe(false);
    expect(settled(view({ phase: "teams", shuffles: 1 }), { type: "shuffle", seen: 1 })).toBe(false);
    expect(settled(view({ phase: "teams", shuffles: 2 }), { type: "shuffle", seen: 1 })).toBe(true);
    expect(settled(view(), { type: "flip", turn: 3, card: 4 })).toBe(false);
    const flipped = view({ cards: view().cards.map((c, i) => (i === 4 ? { ...c, revealed: "t0" } : c)) });
    expect(settled(flipped, { type: "flip", turn: 3, card: 4 })).toBe(true);
    expect(settled(view({ turnNo: 4 }), { type: "endTurn", turn: 3 })).toBe(true);
    expect(settled(view({ phase: "clue" }), { type: "clue", turn: 3, word: "x", count: 1 })).toBe(false);
  });

  it("gives every command of a turn its own slot", () => {
    const { slot } = codenamesRoomRules;
    expect(slot({ type: "flip", turn: 3, card: 4 })).not.toBe(slot({ type: "flip", turn: 3, card: 5 }));
    expect(slot({ type: "flip", turn: 3, card: 4 })).not.toBe(slot({ type: "flip", turn: 4, card: 4 }));
    expect(slot({ type: "join", team: 0, scout: true })).not.toBe(slot({ type: "join", team: 1, scout: true }));
  });

  it("names and faces come from the room's seats", () => {
    const snapshot = { seats: [{ seat: 1, userId: "u1", username: "Lia", avatarCustomization: null, avatarUrl: null, isGuest: true }] } as unknown as RoomStatePayload;
    const v = toRoomView(view(), snapshot);
    expect(v.players[1].name).toBe("Lia");
    expect(v.players[0].name).toBe("—");
    expect(v.botScout).toEqual([false, true]);
  });

  it("folds like the server", () => {
    expect(foldClue("  Fenerbahçe ")).toBe(foldClue("FENERBAHCE"));
    expect(foldClue("İstanbul")).toBe("istanbul");
  });
});

describe("codenames daily client", () => {
  const W = (en: string) => ({ en, es: `${en}-es`, tr: en, ru: en, ka: en });
  const state = (over: Partial<CodenamesDailyState> = {}): CodenamesDailyState => ({
    day: "2031-01-01", open: false, deadline: null, serverNow: "2031-01-01T00:00:00Z", done: false, score: 0, ranked: true,
    cards: Array.from({ length: 20 }, (_, i) => ({ id: `card-${i}`, kind: i === 3 ? "mine" : null })),
    clues: [{ word: W("Alpha"), count: 3 }], totalClues: 3, clue: 0, guessesLeft: 3, flips: [{ card: 3, kind: "mine", clue: 0 }],
    end: null, found: 1, total: 8, misses: 0, ...over,
  });

  it("shows the clue in the reader's language and the server's card count", () => {
    const s = toSoloState(state(), "es");
    expect(s.clues[0].word).toBe("Alpha-es");
    expect(s.total).toBe(8);
    expect(s.totalClues).toBe(3);
    expect(s.flips).toEqual([{ cardId: "card-3", kind: "mine", clue: 0 }]);
  });

  it("carries each clue's cards and reasons once the run is over", () => {
    const s = toSoloState(state({ done: true, end: "owngoal", clues: [{ word: W("Alpha"), count: 1, cards: [{ id: "card-3", why: W("why") }] }] }), "es");
    expect(s.status).toBe("done");
    expect(s.clues[0].cards).toEqual([{ id: "card-3", why: "why-es" }]);
  });
});

describe("a side/role ask superseded by a later one", () => {
  it("settles (is never resent over the newer ask), while the latest one waits for the seat to show it", async () => {
    const { toServerCommand, codenamesRoomRules } = await import("../codenames.server");
    const view = { phase: "teams", mySeat: 0, players: [{ seat: 0, team: null, scout: false, status: "in", sawKey: false }], cards: [], turnNo: 0, shuffles: 0 } as never;
    const first = toServerCommand({ type: "join", team: 0, scout: false }, view)!;
    const second = toServerCommand({ type: "join", team: 1, scout: true }, view)!;
    const now = { phase: "teams", mySeat: 0, players: [{ seat: 0, team: null, scout: false, status: "in", sawKey: false }] };
    expect(codenamesRoomRules.settled(now, first)).toBe(true);
    expect(codenamesRoomRules.settled(now, second)).toBe(false);
  });
});
