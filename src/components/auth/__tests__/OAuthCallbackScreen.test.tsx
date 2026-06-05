import { render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type React from "react";
import type { User } from "@/lib/types";

const replaceMock = vi.fn();
const bootstrapMock = vi.fn();
const refreshWithTokenDetailedMock = vi.fn();
const consumeRedirectOAuthProviderMock = vi.fn();
const trackSignupCompletedMock = vi.fn();
const trackLoginCompletedMock = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace: replaceMock }),
}));

vi.mock("motion/react", () => ({
  motion: {
    div: ({ children, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
      <div {...props}>{children}</div>
    ),
  },
}));

vi.mock("@/contexts/LocaleContext", () => ({
  useLocale: () => ({
    t: (key: string) => key,
  }),
}));

vi.mock("@/components/shared/LoadingScreen", () => ({
  LoadingScreen: ({ text }: { text: string }) => <div>{text}</div>,
}));

vi.mock("@/lib/auth/auth.service", () => ({
  consumeRedirectOAuthProvider: () => consumeRedirectOAuthProviderMock(),
  parseOAuthHash: (hash: string) => {
    const params = new URLSearchParams(hash.replace(/^#/, ""));
    const accessToken = params.get("access_token");
    const refreshToken = params.get("refresh_token");
    return accessToken && refreshToken ? { accessToken, refreshToken } : null;
  },
  refreshWithTokenDetailed: (...args: unknown[]) => refreshWithTokenDetailedMock(...args),
  restorePendingDeletionWithToken: vi.fn(),
  logout: vi.fn(),
  refreshSession: vi.fn(),
}));

vi.mock("@/lib/analytics/game-events", () => ({
  trackSignupCompleted: (method: string) => trackSignupCompletedMock(method),
  trackLoginCompleted: (method: string) => trackLoginCompletedMock(method),
  trackLogout: vi.fn(),
}));

import { OAuthCallbackScreen } from "@/components/auth/OAuthCallbackScreen";
import { useAuthStore } from "@/stores/auth.store";

function makeUser(onboardingComplete: boolean): User {
  return {
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
    onboarding_complete: onboardingComplete,
    progression: {
      level: 1,
      currentLevelXp: 0,
      xpForNextLevel: 100,
      totalXp: 0,
      progressPct: 0,
    },
    created_at: "2026-06-02T00:00:00.000Z",
  };
}

describe("OAuthCallbackScreen analytics", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    window.history.replaceState({}, "", "/auth/callback#access_token=access&refresh_token=refresh");
    useAuthStore.setState({
      status: "loading",
      user: null,
      hasBootstrapped: false,
      bootstrap: bootstrapMock,
    });
    refreshWithTokenDetailedMock.mockResolvedValue({ ok: true });
    consumeRedirectOAuthProviderMock.mockReturnValue("google");
  });

  it("tracks signup_completed for a successful callback when the user still needs onboarding", async () => {
    bootstrapMock.mockImplementation(async () => {
      useAuthStore.setState({ user: makeUser(false), status: "authenticated" });
    });

    render(<OAuthCallbackScreen />);

    await waitFor(() => expect(replaceMock).toHaveBeenCalledWith("/onboarding"));
    expect(trackSignupCompletedMock).toHaveBeenCalledWith("google");
    expect(trackLoginCompletedMock).not.toHaveBeenCalled();
  });

  it("tracks login_completed for a successful callback when the user is onboarded", async () => {
    consumeRedirectOAuthProviderMock.mockReturnValue("facebook");
    bootstrapMock.mockImplementation(async () => {
      useAuthStore.setState({ user: makeUser(true), status: "authenticated" });
    });

    render(<OAuthCallbackScreen />);

    await waitFor(() => expect(replaceMock).toHaveBeenCalledWith("/play"));
    expect(trackLoginCompletedMock).toHaveBeenCalledWith("facebook");
    expect(trackSignupCompletedMock).not.toHaveBeenCalled();
  });

  it("does not track completion when the callback fails", async () => {
    refreshWithTokenDetailedMock.mockResolvedValue({ ok: false, pendingDeletion: false });

    render(<OAuthCallbackScreen />);

    await waitFor(() => {
      expect(screen.getByText("oauthCallback.authenticationFailed")).toBeInTheDocument();
    });
    expect(trackSignupCompletedMock).not.toHaveBeenCalled();
    expect(trackLoginCompletedMock).not.toHaveBeenCalled();
  });
});
