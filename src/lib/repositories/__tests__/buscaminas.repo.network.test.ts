import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/auth/supabase", () => ({ getSupabaseAccessToken: vi.fn().mockResolvedValue(null) }));

const fetchMock = vi.fn();
beforeEach(() => { vi.resetModules(); localStorage.clear(); fetchMock.mockReset(); vi.stubGlobal("fetch", fetchMock); });
afterEach(() => { vi.unstubAllGlobals(); });

describe("buscaminas API client", () => {
  it("treats a success whose body never arrives as a dropped connection, not as 'nothing happened'", async () => {
    fetchMock
      .mockResolvedValueOnce(new Response(JSON.stringify({ token: "a".repeat(64) }), { status: 201 }))
      .mockResolvedValueOnce({ ok: true, status: 200, json: () => Promise.reject(new TypeError("Load failed")) } as unknown as Response);
    const { buscaminasApi, isNetworkFailure } = await import("@/lib/repositories/buscaminas.repo");
    const outcome = await buscaminasApi.start("2026-09-28", 7, "es").then(() => "resolved", (error: unknown) => (isNetworkFailure(error) ? "network failure" : "other error"));
    expect(outcome).toBe("network failure");
  });
});
