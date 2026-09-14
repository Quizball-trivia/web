import { renderHook, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

describe("useGeoEligibility", () => {
  const fetchSpy = vi.fn();
  beforeEach(() => { vi.stubGlobal("fetch", fetchSpy); fetchSpy.mockReset(); vi.resetModules(); vi.spyOn(console, "warn").mockImplementation(() => {}); });
  afterEach(() => { vi.unstubAllGlobals(); vi.unstubAllEnvs(); vi.restoreAllMocks(); vi.useRealTimers(); });
  const ok = (body: unknown) => ({ ok: true, json: async () => body });
  const GE = { countryCode: "GE", isGeorgia: true, source: "header" };

  it("makes no request while the Georgia event flag is off (the only consumer's output is constant then)", async () => {
    vi.stubEnv("NEXT_PUBLIC_GEORGIA_WC_EVENT_ENABLED", "false");
    const { useGeoEligibility } = await import("../useGeoEligibility");
    const { result } = renderHook(() => useGeoEligibility());
    await new Promise((r) => setTimeout(r, 20));
    expect(fetchSpy).not.toHaveBeenCalled();
    expect(result.current).toEqual({ countryCode: null, isGeorgia: false, source: "unknown" });
  });

  it("with the flag on, all consumers share one request to /api/geo without the page's query string", async () => {
    vi.stubEnv("NEXT_PUBLIC_GEORGIA_WC_EVENT_ENABLED", "true");
    window.history.replaceState({}, "", "/play?signin=1");
    fetchSpy.mockResolvedValue(ok(GE));
    const { useGeoEligibility } = await import("../useGeoEligibility");
    const a = renderHook(() => useGeoEligibility());
    const b = renderHook(() => useGeoEligibility());
    await waitFor(() => expect(a.result.current.isGeorgia).toBe(true));
    await waitFor(() => expect(b.result.current.isGeorgia).toBe(true));
    expect(fetchSpy).toHaveBeenCalledTimes(1);
    expect(fetchSpy.mock.calls[0][0]).toBe("/api/geo");
    const c = renderHook(() => useGeoEligibility());
    await waitFor(() => expect(c.result.current.isGeorgia).toBe(true));
    expect(fetchSpy).toHaveBeenCalledTimes(1);
  });

  it("never caches a failed or malformed response, serves nothing stale during the cooldown, then retries and recovers earlier mounts", async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    vi.stubEnv("NEXT_PUBLIC_GEORGIA_WC_EVENT_ENABLED", "true");
    fetchSpy.mockResolvedValueOnce(ok({ nope: true }));
    const mod = await import("../useGeoEligibility");
    const a = renderHook(() => mod.useGeoEligibility());
    await new Promise((r) => setTimeout(r, 20));
    expect(a.result.current.source).toBe("unknown");
    expect(await mod.resolveGeoEligibility(Date.now())).toBeNull(); // cooldown: nothing cached, no retry
    expect(fetchSpy).toHaveBeenCalledTimes(1);
    vi.setSystemTime(Date.now() + 31_000);
    fetchSpy.mockResolvedValueOnce(ok(GE));
    const b = renderHook(() => mod.useGeoEligibility());
    await waitFor(() => expect(b.result.current.isGeorgia).toBe(true));
    expect(fetchSpy).toHaveBeenCalledTimes(2);
    await waitFor(() => expect(a.result.current.isGeorgia).toBe(true)); // the earlier mount hears the recovery
    // Expired entry + failed refresh: not resurrected.
    vi.setSystemTime(Date.now() + mod.GEO_TTL_MS + 1);
    fetchSpy.mockResolvedValueOnce({ ok: false, status: 500, json: async () => ({}) });
    expect(await mod.resolveGeoEligibility(Date.now())).toBeNull();
    expect(await mod.resolveGeoEligibility(Date.now())).toBeNull();
    expect(fetchSpy).toHaveBeenCalledTimes(3);
  });
});
