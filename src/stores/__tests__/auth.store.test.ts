import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ApiError } from "@/lib/api/api";
import type { User } from "@/lib/types";

const bootstrapUserMock = vi.fn();
const refreshSessionMock = vi.fn();
const clearTokensMock = vi.fn();
const storageRemoveMock = vi.fn();
const identifyUserMock = vi.fn();
const resetUserMock = vi.fn();
const setPersonPropertiesMock = vi.fn();
const setNewRelicUserMock = vi.fn();

vi.mock("@/lib/auth/session", () => ({
  bootstrapUser: (...args: unknown[]) => bootstrapUserMock(...args),
}));

vi.mock("@/lib/auth/auth.service", () => ({
  logout: vi.fn(),
  refreshSession: (...args: unknown[]) => refreshSessionMock(...args),
}));

vi.mock("@/lib/auth/tokenStorage", () => ({
  clearTokens: () => clearTokensMock(),
}));

vi.mock("@/lib/posthog", () => ({
  identifyUser: (...args: unknown[]) => identifyUserMock(...args),
  resetUser: () => resetUserMock(),
  setPersonProperties: (...args: unknown[]) => setPersonPropertiesMock(...args),
}));

vi.mock("@/lib/newrelic-browser", () => ({
  setNewRelicUser: (...args: unknown[]) => setNewRelicUserMock(...args),
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

  it("clears tokens and sets anonymous on a terminal refresh failure", async () => {
    bootstrapUserMock.mockRejectedValueOnce(new ApiError("Request failed", 401, null));
    refreshSessionMock.mockResolvedValueOnce({ ok: false, terminal: true });

    await useAuthStore.getState().bootstrap();

    expect(clearTokensMock).toHaveBeenCalledTimes(1);
    expect(storageRemoveMock).toHaveBeenCalledWith("store_wallet");
    expect(useAuthStore.getState()).toMatchObject({
      status: "anonymous",
      user: null,
      hasBootstrapped: true,
    });
  });

  it("keeps tokens and stays loading on a transient refresh failure", async () => {
    bootstrapUserMock
      .mockRejectedValueOnce(new Error("network down"))
      .mockRejectedValueOnce(new Error("still down"));
    refreshSessionMock.mockResolvedValueOnce({ ok: false, terminal: false });

    await runBootstrapWithRetry();

    expect(clearTokensMock).not.toHaveBeenCalled();
    expect(storageRemoveMock).not.toHaveBeenCalled();
    expect(useAuthStore.getState()).toMatchObject({
      status: "loading",
      user: null,
    });
  });

  it("keeps tokens when users/me still fails transiently after a successful refresh", async () => {
    bootstrapUserMock
      .mockRejectedValueOnce(new Error("profile timeout"))
      .mockRejectedValueOnce(new Error("profile still slow"));
    refreshSessionMock.mockResolvedValueOnce({ ok: true });

    await runBootstrapWithRetry();

    expect(clearTokensMock).not.toHaveBeenCalled();
    expect(useAuthStore.getState()).toMatchObject({
      status: "loading",
      user: null,
    });
  });

  it("authenticates when the single retry succeeds", async () => {
    bootstrapUserMock
      .mockRejectedValueOnce(new Error("profile timeout"))
      .mockResolvedValueOnce(USER);
    refreshSessionMock.mockResolvedValueOnce({ ok: true });

    await runBootstrapWithRetry();

    expect(clearTokensMock).not.toHaveBeenCalled();
    expect(useAuthStore.getState()).toMatchObject({
      status: "authenticated",
      user: USER,
      hasBootstrapped: true,
    });
    expect(identifyUserMock).toHaveBeenCalledWith("u1", expect.any(Object));
  });
});
