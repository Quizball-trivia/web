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

import { useRoom } from "../useRoom";

const snapshot = (stateVersion: number, view: unknown, extra: Record<string, unknown> = {}) => ({
  matchId: "m1", lobbyId: "l1", game: "aproximado", stateVersion, status: "active", phaseToken: 1, phaseDeadlineAt: null,
  serverNow: new Date(Date.now() + stateVersion).toISOString(), me: { userId: "u1", admitted: true, active: true, seat: 0, slot: 0, ready: true },
  seats: [], view, result: null, ...extra,
});
const guessing = (round: number, myGuess: number | null = null) => ({ phase: "guess", round, myGuess });
const commands = () => socket.emitted.filter(([event]) => event === "room:command").map(([, p]) => p as { commandId: string; command: { value: number } });

describe("useRoom", () => {
  beforeEach(() => { socket.reset(); vi.useFakeTimers(); });
  afterEach(() => vi.useRealTimers());

  it("review 2026-10-06 W2: leaving the screen cancels its pending timers: nothing is sent for the match afterwards", () => {
    const { result, unmount } = renderHook(() => useRoom("m1"));
    act(() => socket.fire("room:state", snapshot(1, guessing(0))));
    act(() => result.current.guess(0, 40));
    const [sent] = commands();
    act(() => socket.fire("room:command_result", { matchId: "m1", commandId: sent.commandId, ok: true })); // its broadcast never comes
    act(() => result.current.guess(1, 55)); // a second guess, unanswered
    unmount();
    socket.emitted = [];
    act(() => { vi.advanceTimersByTime(30_000); });
    expect(socket.emitted).toEqual([]);
  });

  it("an accepted guess holds the input until the state shows it (the answer comes before the broadcast)", () => {
    const { result } = renderHook(() => useRoom("m1"));
    act(() => socket.fire("room:state", snapshot(1, guessing(0))));
    act(() => result.current.guess(0, 40));
    const [sent] = commands();
    act(() => socket.fire("room:command_result", { matchId: "m1", commandId: sent.commandId, ok: true }));
    expect(result.current.inFlight).toBe(1);
    // A second submit while it is held sends nothing.
    act(() => result.current.guess(0, 99));
    expect(commands()).toHaveLength(1);
    act(() => socket.fire("room:state", snapshot(2, guessing(0, 40))));
    expect(result.current.inFlight).toBe(0);
  });

  it("an accepted guess whose broadcast is lost asks for the state, frees the input, and only ever offers that guess again", () => {
    const { result } = renderHook(() => useRoom("m1"));
    act(() => socket.fire("room:state", snapshot(1, guessing(0))));
    act(() => result.current.guess(0, 40));
    const [first] = commands();
    act(() => socket.fire("room:command_result", { matchId: "m1", commandId: first.commandId, ok: true }));
    expect(result.current.retained).toBeNull();
    socket.emitted = [];
    act(() => { vi.advanceTimersByTime(1_600); });
    expect(socket.emitted.some(([event]) => event === "room:resync")).toBe(true);
    act(() => { vi.advanceTimersByTime(4_000); });
    expect(result.current.inFlight).toBe(0);
    expect(result.current.retained).toEqual({ round: 0, value: 40 });
    // Another number is never sent for the round: the kept guess goes again, as itself.
    act(() => result.current.guess(0, 99));
    expect(commands().at(-1)).toMatchObject({ commandId: first.commandId, command: { value: 40 } });
    act(() => socket.fire("room:state", snapshot(2, guessing(0, 40))));
    expect(result.current.retained).toBeNull();
  });

  it("no answer in time: a retry re-sends the same guess (same id, same number), never a second one", () => {
    const { result } = renderHook(() => useRoom("m1"));
    act(() => socket.fire("room:state", snapshot(1, guessing(0))));
    act(() => result.current.guess(0, 40));
    act(() => { vi.advanceTimersByTime(5_000); });
    expect(result.current.inFlight).toBe(0);
    act(() => result.current.guess(0, 80));
    const [first, retry] = commands();
    expect(retry).toMatchObject({ commandId: first.commandId, command: { value: 40 } });
    // A refusal is definite: then a new number goes out with a new id.
    act(() => socket.fire("room:command_result", { matchId: "m1", commandId: first.commandId, ok: false, code: "invalid" }));
    act(() => result.current.guess(0, 80));
    expect(commands()[2]).toMatchObject({ command: { value: 80 } });
    expect(commands()[2].commandId).not.toBe(first.commandId);
  });

  it("reconnect re-sends an unanswered guess with its id, but not one already accepted", () => {
    const { result } = renderHook(() => useRoom("m1"));
    act(() => socket.fire("room:state", snapshot(1, guessing(0))));
    act(() => result.current.guess(0, 40));
    socket.emitted = [];
    act(() => socket.fire("connect", undefined));
    expect(commands()).toHaveLength(1);
    act(() => socket.fire("room:command_result", { matchId: "m1", commandId: commands()[0].commandId, ok: true }));
    socket.emitted = [];
    act(() => socket.fire("connect", undefined));
    expect(commands()).toHaveLength(0);
    expect(socket.emitted.some(([event]) => event === "room:resync")).toBe(true);
  });

  it("an older snapshot arriving late never rolls the screen back; the gate is confirmed once per version", () => {
    const { result } = renderHook(() => useRoom("m1"));
    act(() => socket.fire("room:state", snapshot(1, null, { status: "ready", me: { userId: "u1", admitted: false, active: true, seat: null, slot: 0, ready: false } })));
    expect(socket.emitted.filter(([event]) => event === "room:ready")).toHaveLength(1);
    act(() => socket.fire("room:state", snapshot(3, guessing(2))));
    act(() => socket.fire("room:state", snapshot(2, guessing(1))));
    expect((result.current.snapshot?.view as { round: number }).round).toBe(2);
  });

  it("an unconfirmed ready is said again: after a failure, and when no confirmation comes", () => {
    renderHook(() => useRoom("m1"));
    const gate = (v: number) => snapshot(v, null, { status: "ready", me: { userId: "u1", admitted: false, active: true, seat: null, slot: 0, ready: false } });
    const readies = () => socket.emitted.filter(([event]) => event === "room:ready").length;
    act(() => socket.fire("room:state", gate(1)));
    expect(readies()).toBe(1);
    // A transient failure: the state is asked for by itself, and the same state again sends the ready again.
    socket.emitted = socket.emitted.filter(([event]) => event === "room:ready");
    act(() => socket.fire("room:error", { matchId: "m1", code: "room_unavailable", message: "room_unavailable" }));
    act(() => { vi.advanceTimersByTime(1_100); });
    expect(socket.emitted.some(([event]) => event === "room:resync")).toBe(true);
    act(() => socket.fire("room:state", gate(1)));
    expect(readies()).toBe(2);
    // No answer at all: the state is asked for, and the ready goes out again with it.
    socket.emitted = [];
    act(() => { vi.advanceTimersByTime(2_100); });
    expect(socket.emitted.some(([event]) => event === "room:resync")).toBe(true);
    act(() => socket.fire("room:state", gate(1)));
    expect(readies()).toBe(1);
  });

  it("the ready watchdog survives repeated unready snapshots and keeps asking until the ready shows", () => {
    renderHook(() => useRoom("m1"));
    const gate = (v: number, ready = false) => snapshot(v, null, { status: "ready", me: { userId: "u1", admitted: false, active: true, seat: null, slot: 0, ready } });
    act(() => socket.fire("room:state", gate(1)));
    act(() => { vi.advanceTimersByTime(1_000); });
    act(() => socket.fire("room:state", gate(1))); // same version again, still unready
    socket.emitted = [];
    act(() => { vi.advanceTimersByTime(1_100); });
    expect(socket.emitted.filter(([event]) => event === "room:resync")).toHaveLength(1);
    socket.emitted = [];
    act(() => { vi.advanceTimersByTime(2_000); });
    expect(socket.emitted.filter(([event]) => event === "room:resync")).toHaveLength(1);
    act(() => socket.fire("room:state", gate(2, true)));
    socket.emitted = [];
    act(() => { vi.advanceTimersByTime(4_000); });
    expect(socket.emitted.filter(([event]) => event === "room:resync")).toHaveLength(0);
  });

  it("a match that is gone is fatal, other errors are shown", () => {
    const { result } = renderHook(() => useRoom("m1"));
    act(() => socket.fire("room:error", { matchId: "m1", code: "rate_limited", message: "rate_limited" }));
    expect(result.current.error).toBe("rate_limited");
    act(() => socket.fire("room:error", { matchId: "m1", code: "room_not_found", message: "room_not_found" }));
    expect(result.current.fatal).toBe("room_not_found");
  });
});
