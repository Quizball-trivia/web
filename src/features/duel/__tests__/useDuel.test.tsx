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
vi.mock("@/lib/realtime/realtime-principal", () => ({ useRealtimePrincipal: () => ({ kind: "member", userId: "u1" }), useEnsureGuestPrincipal: () => "idle" }));
vi.mock("@/contexts/LocaleContext", () => ({ useLocale: () => ({ locale: "es", t: (k: string) => k }) }));

import { useDuel } from "../useDuel";

const snapshot = (stateVersion: number, view: unknown) => ({
  matchId: "m1", game: "minuto", stateVersion, status: "active", phaseToken: 1, phaseDeadlineAt: null, serverNow: new Date().toISOString(),
  seats: [], mySeat: 0, view, result: null,
});

describe("useDuel", () => {
  beforeEach(() => { socket.reset(); vi.useFakeTimers(); });
  afterEach(() => vi.useRealTimers());

  it("a state that already shows the command frees the input even when its acknowledgement never comes", () => {
    const { result } = renderHook(() => useDuel("m1"));
    act(() => result.current.send({ type: "guess", round: 0, minute: 40 }, (next) => (next.view as { me?: { answered?: boolean } } | null)?.me?.answered === true));
    expect(result.current.inFlight).toBe(1);
    act(() => socket.fire("duel:state", snapshot(5, { me: { answered: true } })));
    expect(result.current.inFlight).toBe(0);
  });

  it("no answer and no state at all: the input is freed after a while and the state is asked for", () => {
    const { result } = renderHook(() => useDuel("m1"));
    act(() => result.current.send({ type: "guess", round: 0, minute: 40 }, () => false));
    expect(result.current.inFlight).toBe(1);
    socket.emitted = [];
    act(() => { vi.advanceTimersByTime(5_000); });
    expect(result.current.inFlight).toBe(0);
    expect(socket.emitted.some(([event]) => event === "duel:resync")).toBe(true);
  });

  it("a command re-sent on reconnect gets its own wait: a silent reconnect frees the input again", () => {
    const { result } = renderHook(() => useDuel("m1"));
    act(() => result.current.send({ type: "guess", round: 0, minute: 40 }, () => false));
    act(() => { vi.advanceTimersByTime(3_000); });
    // Reconnect just before the first wait ends: the re-send must get a full wait of its own, not the old one's rest.
    act(() => socket.fire("connect", undefined));
    expect(socket.emitted.filter(([event]) => event === "duel:command")).toHaveLength(2);
    act(() => { vi.advanceTimersByTime(2_500); });
    expect(result.current.inFlight).toBe(1);
    act(() => { vi.advanceTimersByTime(2_500); });
    expect(result.current.inFlight).toBe(0);
  });

  it("reconnect replays only the latest retry when a Minuto guess got no response", () => {
    const { result } = renderHook(() => useDuel("m1"));
    act(() => result.current.send({ type: "guess", round: 0, minute: 40 }, () => false));
    const first = socket.emitted.find(([event]) => event === "duel:command")?.[1] as { commandId: string };
    act(() => { vi.advanceTimersByTime(5_000); });
    expect(result.current.inFlight).toBe(0);
    act(() => result.current.send({ type: "guess", round: 0, minute: 80 }, () => false));
    socket.emitted = [];
    act(() => socket.fire("connect", undefined));
    const replayed = socket.emitted.filter(([event]) => event === "duel:command").map(([, payload]) => payload);
    expect(replayed).toHaveLength(1);
    expect(replayed[0]).toMatchObject({ command: { type: "guess", round: 0, minute: 80 } });
    expect(replayed[0]).not.toMatchObject({ commandId: first.commandId });
    // A late reply for the old attempt must not clear the replacement's pending state.
    act(() => socket.fire("duel:command_result", { matchId: "m1", commandId: first.commandId, ok: false, code: "stale_round" }));
    expect(result.current.inFlight).toBe(1);
  });

  it("does not send two Minuto guesses while the first attempt is still waiting", () => {
    const { result } = renderHook(() => useDuel("m1"));
    act(() => {
      result.current.send({ type: "guess", round: 0, minute: 40 }, () => false);
      result.current.send({ type: "guess", round: 0, minute: 80 }, () => false);
    });
    expect(socket.emitted.filter(([event]) => event === "duel:command")).toHaveLength(1);
    expect(result.current.inFlight).toBe(1);
  });
});
