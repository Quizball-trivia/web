import { render, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import AppAuthGate from "@/components/auth/AppAuthGate";
import PublicOnlyGate from "@/components/auth/PublicOnlyGate";
import { getAuthenticatedEntryRoute, isOnboardingComplete } from "@/lib/auth/onboarding";
import { useAuthStore } from "@/stores/auth.store";

const replaceMock = vi.fn();
const usePathnameMock = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace: replaceMock }),
  usePathname: () => usePathnameMock(),
}));

vi.mock("@/components/shared/LoadingScreen", () => ({
  LoadingScreen: () => <div>Loading...</div>,
}));

describe("auth onboarding routing", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useAuthStore.setState({
      status: "anonymous",
      user: null,
      hasBootstrapped: true,
      bootstrap: vi.fn().mockResolvedValue(undefined),
    });
    usePathnameMock.mockReturnValue("/play");
  });

  it("routes incomplete users to onboarding", () => {
    expect(getAuthenticatedEntryRoute({
      id: "u1",
      email: null,
      role: "user",
      nickname: null,
      country: null,
      avatar_url: null,
      favorite_club: null,
      preferred_language: null,
      onboarding_complete: false,
      progression: {
        level: 1,
        currentLevelXp: 0,
        xpForNextLevel: 100,
        totalXp: 0,
        progressPct: 0,
      },
      created_at: new Date().toISOString(),
    })).toBe("/onboarding");
  });

  it("marks onboarding as complete only from the server flag", () => {
    expect(isOnboardingComplete(null)).toBe(false);
    expect(isOnboardingComplete({
      id: "u1",
      email: null,
      role: "user",
      nickname: null,
      country: null,
      avatar_url: null,
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
      created_at: new Date().toISOString(),
    })).toBe(true);
  });

  it("redirects authenticated incomplete users away from app pages to onboarding", async () => {
    useAuthStore.setState({
      status: "authenticated",
      user: {
        id: "u1",
        email: null,
        role: "user",
        nickname: null,
        country: null,
        avatar_url: null,
        favorite_club: null,
        preferred_language: null,
        onboarding_complete: false,
        progression: {
          level: 1,
          currentLevelXp: 0,
          xpForNextLevel: 100,
          totalXp: 0,
          progressPct: 0,
        },
        created_at: new Date().toISOString(),
      },
    });

    render(
      <AppAuthGate>
        <div>App</div>
      </AppAuthGate>
    );

    await waitFor(() => {
      expect(replaceMock).toHaveBeenCalledWith("/onboarding");
    });
  });

  it("redirects authenticated completed users away from public auth pages to play", async () => {
    useAuthStore.setState({
      status: "authenticated",
      user: {
        id: "u1",
        email: null,
        role: "user",
        nickname: null,
        country: null,
        avatar_url: null,
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
        created_at: new Date().toISOString(),
      },
    });

    render(
      <PublicOnlyGate>
        <div>Auth</div>
      </PublicOnlyGate>
    );

    await waitFor(() => {
      expect(replaceMock).toHaveBeenCalledWith("/play");
    });
  });
});
