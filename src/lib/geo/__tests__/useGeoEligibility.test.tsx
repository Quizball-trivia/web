import { renderHook, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

describe("useGeoEligibility", () => {
  const fetchSpy = vi.fn();
  beforeEach(() => { vi.stubGlobal("fetch", fetchSpy); fetchSpy.mockReset(); vi.resetModules(); });
  afterEach(() => { vi.unstubAllGlobals(); vi.unstubAllEnvs(); });

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
    fetchSpy.mockResolvedValue({ ok: true, json: async () => ({ countryCode: "GE", isGeorgia: true, source: "header" }) });
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

  it("does not cache a failed or malformed response", async () => {
    vi.stubEnv("NEXT_PUBLIC_GEORGIA_WC_EVENT_ENABLED", "true");
    vi.spyOn(console, "warn").mockImplementation(() => {});
    fetchSpy.mockResolvedValueOnce({ ok: true, json: async () => ({ nope: true }) });
    const mod = await import("../useGeoEligibility");
    const a = renderHook(() => mod.useGeoEligibility());
    await new Promise((r) => setTimeout(r, 20));
    expect(a.result.current.source).toBe("unknown");
    expect(await mod.resolveGeoEligibility(Date.now())).toBeNull(); // in the failure cooldown: nothing cached, no retry yet
    expect(fetchSpy).toHaveBeenCalledTimes(1);
  });
});
