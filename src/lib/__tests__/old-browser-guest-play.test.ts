import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// Guests on Safari 15 (iOS 15) and Chrome < 103: no AbortSignal.timeout.
vi.mock("@/lib/auth/supabase", () => ({ getSupabaseAccessToken: vi.fn().mockResolvedValue(null) }));

const native = AbortSignal.timeout;
const TOKEN = "a".repeat(64);
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });
const fetchMock = vi.fn();

beforeEach(() => {
  vi.resetModules();
  localStorage.clear();
  fetchMock.mockReset();
  vi.stubGlobal("fetch", fetchMock);
  // @ts-expect-error simulating a browser that predates AbortSignal.timeout
  delete AbortSignal.timeout;
});

afterEach(() => {
  AbortSignal.timeout = native;
  vi.unstubAllGlobals();
});

describe("guest play on browsers without AbortSignal.timeout", () => {
  it("mints a guest session", async () => {
    fetchMock.mockResolvedValueOnce(json({ token: TOKEN, guest_id: "g" }, 201));
    const { getGuestToken } = await import("@/lib/guest/guestSession");
    await expect(getGuestToken("es")).resolves.toBe(TOKEN);
  });

  it("starts a Buscaminas board as a guest", async () => {
    fetchMock
      .mockResolvedValueOnce(json({ token: TOKEN, guest_id: "g" }, 201))
      .mockResolvedValueOnce(json({ run: { id: "r", version: 0 }, state: { day: "2026-09-27" } }));
    const { buscaminasApi } = await import("@/lib/repositories/buscaminas.repo");
    await expect(buscaminasApi.start("2026-09-27", 7, "es")).resolves.toMatchObject({ run: { id: "r", version: 0 } });
    const [url, init] = fetchMock.mock.calls[1] as [string, RequestInit];
    expect(url).toContain("/api/v1/buscaminas/start");
    expect(new Headers(init.headers).get("x-guest-token")).toBe(TOKEN);
  });
});
