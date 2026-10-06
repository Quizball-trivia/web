import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const socket = vi.hoisted(() => ({ emit: vi.fn() }));
vi.mock("@/lib/realtime/socket-client", () => ({ connectSocket: vi.fn(), getSocket: () => socket }));
vi.mock("@/utils/logger", () => ({ logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() } }));

import { useLobbyCommandMachine } from "../useLobbyCommandMachine";

const joins = () => socket.emit.mock.calls.filter(([event]) => event === "lobby:join_by_code").length;
const busy = (ack: (r: unknown) => void, correlationId: string) =>
  ack({ ok: false, code: "TRANSITION_IN_PROGRESS", message: "busy", retryable: true, correlationId });

describe("lobby command machine: a superseded command never sends again", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    socket.emit.mockReset();
    socket.emit.mockImplementation((_event: string, payload: { correlationId: string }, ack: (r: unknown) => void) => busy(ack, payload.correlationId));
  });
  afterEach(() => vi.useRealTimers());

  it("a reset during the retry backoff stops the retries", async () => {
    const { result } = renderHook(() => useLobbyCommandMachine());
    let settled: unknown = "pending";
    act(() => { void result.current.joinByCode("ABC123").then((r) => { settled = r; }); });
    await act(async () => { await Promise.resolve(); });
    expect(joins()).toBe(1);
    act(() => result.current.reset());
    await act(async () => { await vi.advanceTimersByTimeAsync(5_000); });
    expect(joins()).toBe(1);
    expect(settled).toBeNull();
  });

  it("unmounting during the backoff settles the command and sends nothing more", async () => {
    const { result, unmount } = renderHook(() => useLobbyCommandMachine());
    let settled: unknown = "pending";
    act(() => { void result.current.joinByCode("ABC123").then((r) => { settled = r; }); });
    await act(async () => { await Promise.resolve(); });
    unmount();
    await act(async () => { await Promise.resolve(); await Promise.resolve(); });
    expect(settled).toBeNull();
    await act(async () => { await vi.advanceTimersByTimeAsync(5_000); });
    expect(joins()).toBe(1);
  });
});
