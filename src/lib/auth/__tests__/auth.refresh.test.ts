import { beforeEach, describe, expect, it, vi } from "vitest";

const supabaseMocks = vi.hoisted(() => ({
  getSession: vi.fn(),
  refreshSession: vi.fn(),
  setSupabaseSession: vi.fn(),
}));

vi.mock("@/lib/api/api", async () => {
  const actual = await vi.importActual<typeof import("@/lib/api/api")>("@/lib/api/api");
  return {
    ...actual,
    api: {
      ...actual.api,
      POST: vi.fn(),
    },
  };
});

vi.mock("@/lib/auth/supabase", () => ({
  getSupabaseClient: () => ({
    auth: {
      getSession: (...args: unknown[]) => supabaseMocks.getSession(...args),
      refreshSession: (...args: unknown[]) => supabaseMocks.refreshSession(...args),
    },
  }),
  setSupabaseSession: (...args: unknown[]) => supabaseMocks.setSupabaseSession(...args),
  signOutLocal: vi.fn(),
}));

import { api } from "@/lib/api/api";
import { refresh, refreshSession, restorePendingDeletionWithToken } from "@/lib/auth/auth.service";
import { clearTokens, getAccessToken, getRefreshToken, setTokens } from "@/lib/auth/tokenStorage";

const mockedPost = api.POST as unknown as ReturnType<typeof vi.fn>;

beforeEach(() => {
  vi.clearAllMocks();
  clearTokens();
});

describe("restorePendingDeletionWithToken", () => {
  it("feeds restored backend tokens into the Supabase browser session", async () => {
    mockedPost.mockResolvedValueOnce({
      access_token: "a",
      refresh_token: "r",
      user: { provider_sub: "u1" },
    });

    const user = await restorePendingDeletionWithToken("restore-refresh");

    expect(mockedPost).toHaveBeenCalledWith("/api/v1/auth/restore-pending-deletion", {
      body: { refresh_token: "restore-refresh" },
      auth: false,
    });
    expect(supabaseMocks.setSupabaseSession).toHaveBeenCalledWith({
      accessToken: "a",
      refreshToken: "r",
    });
    expect(user).toEqual({ provider_sub: "u1" });
  });
});

describe("refreshSession", () => {
  it("returns ok when Supabase has a session", async () => {
    supabaseMocks.getSession.mockResolvedValueOnce({
      data: { session: { access_token: "a" } },
      error: null,
    });

    await expect(refreshSession()).resolves.toEqual({ ok: true });
    expect(mockedPost).not.toHaveBeenCalledWith("/api/v1/auth/refresh", expect.anything());
  });

  it("returns terminal false and clears legacy tokens when Supabase has no session", async () => {
    setTokens({ accessToken: "legacy-a", refreshToken: "legacy-r" });
    supabaseMocks.getSession.mockResolvedValueOnce({
      data: { session: null },
      error: null,
    });

    await expect(refreshSession()).resolves.toEqual({ ok: false, terminal: true });
    expect(getAccessToken()).toBeNull();
    expect(getRefreshToken()).toBeNull();
  });

  it("treats Supabase session read errors as transient", async () => {
    setTokens({ accessToken: "legacy-a", refreshToken: "legacy-r" });
    supabaseMocks.getSession.mockResolvedValueOnce({
      data: { session: null },
      error: new Error("offline"),
    });

    await expect(refreshSession()).resolves.toEqual({ ok: false, terminal: false });
    expect(getRefreshToken()).toBe("legacy-r");
  });

  it("boolean refresh wrapper reflects the Supabase session result", async () => {
    supabaseMocks.getSession.mockResolvedValueOnce({
      data: { session: null },
      error: null,
    });

    await expect(refresh()).resolves.toBe(false);
  });
});
