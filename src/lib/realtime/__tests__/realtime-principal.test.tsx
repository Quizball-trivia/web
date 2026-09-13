import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const flags = vi.hoisted(() => ({ enabled: true }));
vi.mock("@/lib/config", () => ({ API_BASE_URL: "http://api.test", get GUEST_LOBBIES_ENABLED() { return flags.enabled; } }));
const guestTokens = vi.hoisted(() => ({ next: ["tok-1", "tok-2"], forgotten: [] as string[] }));
vi.mock("@/lib/guest/guestSession", () => ({
  GUEST_TOKEN_HEADER: "x-guest-token",
  getGuestToken: async () => guestTokens.next[0],
  forgetGuestToken: (t: string) => { guestTokens.forgotten.push(t); guestTokens.next.shift(); },
}));

import { useAuthStore } from "@/stores/auth.store";
const mod = await import("../realtime-principal");

const fetchMock = vi.fn();
beforeEach(() => {
  vi.stubGlobal("fetch", fetchMock);
  fetchMock.mockReset();
  guestTokens.next = ["tok-1", "tok-2"]; guestTokens.forgotten = [];
  flags.enabled = true;
  mod.useGuestPrincipalStore.getState().clear();
  useAuthStore.setState({ status: "anonymous", user: null } as never);
});
afterEach(() => vi.unstubAllGlobals());

const ok = (userId: string) => ({ ok: true, status: 200, json: async () => ({ user_id: userId, nickname: "Mystery Keeper 4821", avatar_customization: { jersey: "jersey_green" } }) });

describe("guest principal", () => {
  it("resolves the users row through POST /guest/principal and becomes the realtime principal", async () => {
    fetchMock.mockResolvedValueOnce(ok("u-guest"));
    const guest = await mod.ensureGuestPrincipal("en");
    expect(guest).toMatchObject({ userId: "u-guest", token: "tok-1", nickname: "Mystery Keeper 4821" });
    expect(fetchMock.mock.calls[0][0]).toBe("http://api.test/api/v1/guest/principal");
    expect((fetchMock.mock.calls[0][1] as RequestInit).headers).toMatchObject({ "x-guest-token": "tok-1" });
    expect(mod.getGuestPrincipalToken()).toBe("tok-1");
    const { result } = renderHook(() => mod.useRealtimePrincipal());
    expect(result.current).toMatchObject({ kind: "guest", userId: "u-guest" });
  });

  it("re-mints once when the stored token is rejected, and refuses after a second rejection", async () => {
    fetchMock.mockResolvedValueOnce({ ok: false, status: 401, json: async () => ({}) }).mockResolvedValueOnce(ok("u-2"));
    expect((await mod.ensureGuestPrincipal("en"))?.userId).toBe("u-2");
    expect(guestTokens.forgotten).toEqual(["tok-1"]);
    mod.useGuestPrincipalStore.getState().clear();
    guestTokens.next = ["tok-3", "tok-4"];
    fetchMock.mockResolvedValue({ ok: false, status: 401, json: async () => ({}) });
    expect(await mod.ensureGuestPrincipal("en")).toBeNull();
    expect(mod.useGuestPrincipalStore.getState().status).toBe("refused");
  });

  it("does nothing while the feature is off or a member session exists, and signing in drops the guest", async () => {
    flags.enabled = false;
    expect(await mod.ensureGuestPrincipal("en")).toBeNull();
    expect(fetchMock).not.toHaveBeenCalled();
    flags.enabled = true;
    fetchMock.mockResolvedValueOnce(ok("u-guest"));
    await mod.ensureGuestPrincipal("en");
    const { result } = renderHook(() => mod.useRealtimePrincipal());
    expect(result.current.kind).toBe("guest");
    act(() => useAuthStore.setState({ status: "authenticated", user: { id: "member-1" } } as never));
    expect(result.current).toMatchObject({ kind: "member", userId: "member-1" });
    expect(mod.useGuestPrincipalStore.getState().guest).toBeNull();
    expect(mod.getGuestPrincipalToken()).toBeNull();
    expect(await mod.ensureGuestPrincipal("en")).toBeNull(); // members never resolve a guest
  });

  it("markGuestPrincipalRefused forgets the token so the owner disconnects", async () => {
    fetchMock.mockResolvedValueOnce(ok("u-guest"));
    await mod.ensureGuestPrincipal("en");
    mod.markGuestPrincipalRefused();
    expect(guestTokens.forgotten).toEqual(["tok-1"]);
    expect(mod.getGuestPrincipalToken()).toBeNull();
    const { result } = renderHook(() => mod.useRealtimePrincipal());
    expect(result.current.kind).toBe("none");
  });
});
