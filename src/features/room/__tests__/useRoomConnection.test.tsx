import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

type Handler = (payload: unknown) => void;
const socket = vi.hoisted(() => {
  const handlers = new Map<string, Handler[]>();
  return {
    connected: true,
    emitted: [] as Array<[string, unknown]>,
    on(event: string, fn: Handler) { handlers.set(event, [...(handlers.get(event) ?? []), fn]); },
    off(event: string, fn: Handler) { handlers.set(event, (handlers.get(event) ?? []).filter((h) => h !== fn)); },
    emit(event: string, payload: unknown) { this.emitted.push([event, payload]); },
    fire(event: string, payload: unknown) { for (const fn of handlers.get(event) ?? []) fn(payload); },
    reset() { handlers.clear(); this.emitted = []; },
  };
});
vi.mock("@/lib/realtime/useRealtimeConnection", () => ({ useRealtimeConnection: () => socket }));
vi.mock("@/lib/realtime/realtime-principal", () => ({ useRealtimePrincipal: () => ({ kind: "guest", userId: "u1" }), useEnsureGuestPrincipal: () => "idle" }));
vi.mock("@/contexts/LocaleContext", () => ({ useLocale: () => ({ locale: "es", t: (k: string) => k }) }));

import { roomClientRulesFor } from "../roomGames";
import { useRoomConnection, type RoomClientRules } from "../useRoomConnection";

type Word = { type: "word"; attempt: number; text: string };
/** An invented typing game: one command per attempt, settled once the state has moved past that attempt. */
const wordRules: RoomClientRules<Word> = {
  slot: (command) => String(command.attempt),
  settled: (view, command) => (view as { attempt: number }).attempt !== command.attempt,
};
const GAMES = ["word_game"];
const rulesFor = (game: string) => (game === "word_game" ? wordRules : null);

const snapshot = (stateVersion: number, game: string, view: unknown, extra: Record<string, unknown> = {}) => ({
  matchId: "m1", lobbyId: "l1", game, stateVersion, status: "active", phaseToken: 1, phaseDeadlineAt: null,
  serverNow: new Date(Date.now() + stateVersion).toISOString(), me: { userId: "u1", admitted: true, active: true, seat: 0, slot: 0, ready: true },
  seats: [], view, result: null, ...extra,
});
const atGate = (game: string) => snapshot(1, game, null, { status: "ready", me: { userId: "u1", admitted: false, active: true, seat: null, slot: 0, ready: false } });
const sent = (event: string) => socket.emitted.filter(([name]) => name === event).map(([, payload]) => payload as Record<string, unknown>);

describe("useRoomConnection", () => {
  beforeEach(() => { socket.reset(); vi.useFakeTimers(); });
  afterEach(() => vi.useRealTimers());

  it("readies for a game it can draw, and every ready and resync lists the games it can draw", () => {
    renderHook(() => useRoomConnection("m1", GAMES, rulesFor));
    act(() => socket.fire("room:state", atGate("word_game")));
    expect(sent("room:ready")).toEqual([{ matchId: "m1", locale: "es", games: ["word_game"] }]);
    expect(sent("room:resync")).toEqual([{ matchId: "m1", locale: "es", games: ["word_game"] }]);
  });

  it("a new games array on every render does not reconnect or resync again", () => {
    const { rerender } = renderHook(() => useRoomConnection("m1", ["word_game"], rulesFor));
    rerender();
    rerender();
    expect(sent("room:resync")).toHaveLength(1);
  });

  it("never readies for a game this build cannot draw, however long the gate stays open", () => {
    renderHook(() => useRoomConnection("m1", GAMES, rulesFor));
    act(() => socket.fire("room:state", atGate("a_newer_game")));
    act(() => { vi.advanceTimersByTime(20_000); });
    expect(sent("room:ready")).toEqual([]);
  });

  it("sends one command per slot and frees the slot when the state settles it", () => {
    const { result } = renderHook(() => useRoomConnection("m1", GAMES, rulesFor));
    act(() => socket.fire("room:state", snapshot(1, "word_game", { attempt: 0 })));
    act(() => result.current.send({ type: "word", attempt: 0, text: "one" }));
    // The same attempt again while the first is in flight: nothing new is sent.
    act(() => result.current.send({ type: "word", attempt: 0, text: "two" }));
    expect(sent("room:command")).toHaveLength(1);
    expect(result.current.inFlight).toBe(1);
    act(() => socket.fire("room:state", snapshot(2, "word_game", { attempt: 1 })));
    expect(result.current.inFlight).toBe(0);
    act(() => result.current.send({ type: "word", attempt: 1, text: "three" }));
    expect(sent("room:command").map((c) => (c.command as Word).text)).toEqual(["one", "three"]);
  });

  it("a refused command frees its slot at once", () => {
    const { result } = renderHook(() => useRoomConnection("m1", GAMES, rulesFor));
    act(() => socket.fire("room:state", snapshot(1, "word_game", { attempt: 0 })));
    act(() => result.current.send({ type: "word", attempt: 0, text: "one" }));
    const [first] = sent("room:command");
    act(() => socket.fire("room:command_result", { matchId: "m1", commandId: first.commandId, ok: false, code: "stale_round" }));
    expect(result.current.inFlight).toBe(0);
    expect(result.current.retained).toBeNull();
  });

  it("sends nothing for a game without rules", () => {
    const { result } = renderHook(() => useRoomConnection<Word>("m1", GAMES, rulesFor));
    act(() => socket.fire("room:state", snapshot(1, "a_newer_game", { attempt: 0 })));
    act(() => result.current.send({ type: "word", attempt: 0, text: "one" }));
    expect(sent("room:command")).toEqual([]);
  });
});

describe("room games registry", () => {
  it("knows Aproximado and nothing it cannot draw", () => {
    expect(roomClientRulesFor("aproximado")).not.toBeNull();
    expect(roomClientRulesFor("a_newer_game")).toBeNull();
  });
});
