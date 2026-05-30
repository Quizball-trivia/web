import { renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { usePresencePing, useSiteOnlineStore } from "../usePresencePing";

function okResponse(online: number) {
  return {
    ok: true,
    json: async () => ({ online }),
  } as unknown as Response;
}

// Let pending promises (the async ping) settle while on fake timers.
const flush = () => vi.advanceTimersByTimeAsync(0);

describe("usePresencePing", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    useSiteOnlineStore.setState({ siteOnline: null });
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it("pings the presence endpoint on mount", async () => {
    const fetchMock = vi.fn().mockResolvedValue(okResponse(5));
    vi.stubGlobal("fetch", fetchMock);

    renderHook(() => usePresencePing());
    await flush();

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock.mock.calls[0][0]).toContain("/api/v1/presence/ping");
    expect(fetchMock.mock.calls[0][1]).toMatchObject({ method: "POST", credentials: "include" });
  });

  it("pings again every 30s", async () => {
    const fetchMock = vi.fn().mockResolvedValue(okResponse(5));
    vi.stubGlobal("fetch", fetchMock);

    renderHook(() => usePresencePing());
    await flush();
    expect(fetchMock).toHaveBeenCalledTimes(1);

    await vi.advanceTimersByTimeAsync(30_000);
    expect(fetchMock).toHaveBeenCalledTimes(2);

    await vi.advanceTimersByTimeAsync(30_000);
    expect(fetchMock).toHaveBeenCalledTimes(3);
  });

  it("stops pinging after unmount", async () => {
    const fetchMock = vi.fn().mockResolvedValue(okResponse(5));
    vi.stubGlobal("fetch", fetchMock);

    const { unmount } = renderHook(() => usePresencePing());
    await flush();
    expect(fetchMock).toHaveBeenCalledTimes(1);

    unmount();
    await vi.advanceTimersByTimeAsync(60_000);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("stores the returned online count", async () => {
    const fetchMock = vi.fn().mockResolvedValue(okResponse(7));
    vi.stubGlobal("fetch", fetchMock);

    renderHook(() => usePresencePing());
    await flush();

    expect(useSiteOnlineStore.getState().siteOnline).toBe(7);
  });

  it("does not throw or store when the request fails, and keeps the interval alive", async () => {
    const fetchMock = vi.fn().mockRejectedValue(new Error("network"));
    vi.stubGlobal("fetch", fetchMock);

    renderHook(() => usePresencePing());
    await flush();

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(useSiteOnlineStore.getState().siteOnline).toBeNull();

    await vi.advanceTimersByTimeAsync(30_000);
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });
});
