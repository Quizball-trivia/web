import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ApiError } from "@/lib/api/api";
import type { User } from "@/lib/types";

const fetchCurrentUserMock = vi.fn();
const getSupabaseSessionMock = vi.fn();
const signOutLocalMock = vi.fn();
const clearTokensMock = vi.fn();
const storageRemoveMock = vi.fn();
const identifyUserMock = vi.fn();
const resetUserMock = vi.fn();
const setPersonPropertiesMock = vi.fn();
const logoutServiceMock = vi.fn();
const disconnectSocketMock = vi.fn();

vi.mock("@/lib/auth/session", () => ({
  fetchCurrentUser: (...args: unknown[]) => fetchCurrentUserMock(...args),
}));

vi.mock("@/lib/auth/auth.service", () => ({
  logout: (...args: unknown[]) => logoutServiceMock(...args),
}));

vi.mock("@/lib/auth/supabase", () => ({
  getSupabaseSession: (...args: unknown[]) => getSupabaseSessionMock(...args),
  signOutLocal: (...args: unknown[]) => signOutLocalMock(...args),
}));

vi.mock("@/lib/auth/tokenStorage", () => ({
  clearTokens: () => clearTokensMock(),
}));

vi.mock("@/lib/realtime/socket-client", () => ({
  disconnectSocket: () => disconnectSocketMock(),
}));

vi.mock("@/lib/posthog", () => ({
  identifyUser: (...args: unknown[]) => identifyUserMock(...args),
  resetUser: () => resetUserMock(),
  setPersonProperties: (...args: unknown[]) => setPersonPropertiesMock(...args),
}));

vi.mock("@/lib/analytics/game-events", () => ({
  trackLogout: vi.fn(),
}));

vi.mock("@/utils/storage", () => ({
  STORAGE_KEYS: {
    STORE_WALLET: "store_wallet",
  },
  storage: {
    remove: (...args: unknown[]) => storageRemoveMock(...args),
  },
}));

import { useAuthStore } from "@/stores/auth.store";

const USER: User = {
  id: "u1",
  email: "user@example.com",
  phone_number: null,
  phone_verified_at: null,
  role: "user",
  nickname: null,
  country: null,
  avatar_url: null,
  avatar_customization: null,
  favorite_club: null,
  preferred_language: null,
  onboarding_complete: true,
  progression: {
    level: 1,
    currentLevelXp: 0,
    xpForNextLevel: 100,
    totalXp: 0,
    progressPct: 0,
  },
  created_at: "2026-06-02T00:00:00.000Z",
};

async function runBootstrapWithRetry(): Promise<void> {
  const promise = useAuthStore.getState().bootstrap();
  await vi.advanceTimersByTimeAsync(300);
  await promise;
}

describe("auth store bootstrap", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.clearAllMocks();
    useAuthStore.setState({
      status: "loading",
      user: null,
      hasBootstrapped: false,
    });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("clears legacy tokens and sets anonymous when Supabase has no session", async () => {
    getSupabaseSessionMock.mockResolvedValueOnce(null);

    await useAuthStore.getState().bootstrap();

    expect(fetchCurrentUserMock).not.toHaveBeenCalled();
    expect(clearTokensMock).toHaveBeenCalledTimes(2);
    expect(storageRemoveMock).toHaveBeenCalledWith("store_wallet");
    expect(useAuthStore.getState()).toMatchObject({
      status: "anonymous",
      user: null,
      hasBootstrapped: true,
    });
  });

  it("signs out locally and sets anonymous when users/me rejects the Supabase token", async () => {
    getSupabaseSessionMock.mockResolvedValueOnce({ access_token: "token-a" });
    fetchCurrentUserMock.mockRejectedValueOnce(new ApiError("Request failed", 401, null));

    await useAuthStore.getState().bootstrap();

    expect(signOutLocalMock).toHaveBeenCalledTimes(1);
    expect(clearTokensMock).toHaveBeenCalledTimes(2);
    expect(storageRemoveMock).toHaveBeenCalledWith("store_wallet");
    expect(useAuthStore.getState()).toMatchObject({
      status: "anonymous",
      user: null,
      hasBootstrapped: true,
    });
  });

  it("stays loading when Supabase session reads keep failing transiently", async () => {
    getSupabaseSessionMock
      .mockRejectedValueOnce(new Error("network down"))
      .mockRejectedValueOnce(new Error("still down"));

    await runBootstrapWithRetry();

    expect(clearTokensMock).toHaveBeenCalledTimes(1);
    expect(storageRemoveMock).not.toHaveBeenCalled();
    expect(useAuthStore.getState()).toMatchObject({
      status: "loading",
      user: null,
    });
  });

  it("stays loading when users/me still fails transiently after a valid session", async () => {
    getSupabaseSessionMock
      .mockResolvedValueOnce({ access_token: "token-a" })
      .mockResolvedValueOnce({ access_token: "token-a" });
    fetchCurrentUserMock
      .mockRejectedValueOnce(new Error("profile timeout"))
      .mockRejectedValueOnce(new Error("profile still slow"));

    await runBootstrapWithRetry();

    expect(clearTokensMock).toHaveBeenCalledTimes(1);
    expect(useAuthStore.getState()).toMatchObject({
      status: "loading",
      user: null,
    });
  });

  it("authenticates when the single retry succeeds", async () => {
    getSupabaseSessionMock
      .mockResolvedValueOnce({ access_token: "token-a" })
      .mockResolvedValueOnce({ access_token: "token-a" });
    fetchCurrentUserMock
      .mockRejectedValueOnce(new Error("profile timeout"))
      .mockResolvedValueOnce(USER);

    await runBootstrapWithRetry();

    expect(clearTokensMock).toHaveBeenCalledTimes(1);
    expect(useAuthStore.getState()).toMatchObject({
      status: "authenticated",
      user: USER,
      hasBootstrapped: true,
    });
    expect(identifyUserMock).toHaveBeenCalledWith(
      "u1",
      expect.objectContaining({
        $email: "user@example.com",
        $name: "user@example.com",
        email: "user@example.com",
        name: "user@example.com",
      }),
    );
  });

  it("keeps authenticated UI visible during forced background bootstrap", async () => {
    let resolveSession: (session: { access_token: string }) => void = () => undefined;
    getSupabaseSessionMock.mockReturnValueOnce(
      new Promise((resolve) => {
        resolveSession = resolve;
      }),
    );
    useAuthStore.setState({
      status: "authenticated",
      user: USER,
      hasBootstrapped: true,
    });

    const promise = useAuthStore.getState().bootstrap({ force: true });

    expect(useAuthStore.getState()).toMatchObject({
      status: "authenticated",
      user: USER,
    });

    resolveSession({ access_token: "token-a" });
    fetchCurrentUserMock.mockResolvedValueOnce(USER);
    await promise;

    expect(useAuthStore.getState()).toMatchObject({
      status: "authenticated",
      user: USER,
      hasBootstrapped: true,
    });
  });

  it("keeps authenticated UI visible when forced background bootstrap has transient failures", async () => {
    getSupabaseSessionMock
      .mockRejectedValueOnce(new Error("session read failed"))
      .mockRejectedValueOnce(new Error("still failed"));
    useAuthStore.setState({
      status: "authenticated",
      user: USER,
      hasBootstrapped: true,
    });

    await runBootstrapWithRetry();

    expect(useAuthStore.getState()).toMatchObject({
      status: "authenticated",
      user: USER,
      hasBootstrapped: true,
    });
  });
});

describe("auth store logout", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useAuthStore.setState({
      status: "authenticated",
      user: USER,
      hasBootstrapped: true,
    });
  });

  it("disconnects realtime socket before clearing the auth session", async () => {
    const calls: string[] = [];
    disconnectSocketMock.mockImplementationOnce(() => calls.push("disconnectSocket"));
    logoutServiceMock.mockImplementationOnce(async () => {
      calls.push("logoutService");
    });

    await useAuthStore.getState().logout();

    expect(calls).toEqual(["disconnectSocket", "logoutService"]);
    expect(disconnectSocketMock).toHaveBeenCalledTimes(1);
    expect(useAuthStore.getState()).toMatchObject({
      status: "anonymous",
      user: null,
      hasBootstrapped: true,
    });
  });
});
