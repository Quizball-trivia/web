import { render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type React from "react";
import type { User } from "@/lib/types";

const replaceMock = vi.fn();
const fetchCurrentUserMock = vi.fn();
const getSessionMock = vi.fn();
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
  isPendingDeletionAuthError: vi.fn(() => false),
  restorePendingDeletionWithToken: vi.fn(),
  logout: vi.fn(),
  refreshSession: vi.fn(),
}));

vi.mock("@/lib/auth/supabase", () => ({
  getSupabaseClient: () => ({
    auth: {
      getSession: (...args: unknown[]) => getSessionMock(...args),
    },
  }),
  getSupabaseSession: () => getSessionMock().then((result: { data?: { session?: unknown } }) => result.data?.session ?? null),
}));

vi.mock("@/lib/auth/session", () => ({
  fetchCurrentUser: () => fetchCurrentUserMock(),
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
    window.history.replaceState({}, "", "/auth/callback?code=pkce-code");
    useAuthStore.setState({
      status: "loading",
      user: null,
      hasBootstrapped: false,
    });
    getSessionMock.mockResolvedValue({
      data: { session: { access_token: "access", refresh_token: "refresh" } },
      error: null,
    });
    consumeRedirectOAuthProviderMock.mockReturnValue("google");
  });

  it("tracks signup_completed for a successful callback when the user still needs onboarding", async () => {
    fetchCurrentUserMock.mockResolvedValue(makeUser(false));

    render(<OAuthCallbackScreen />);

    await waitFor(() => expect(replaceMock).toHaveBeenCalledWith("/onboarding"));
    expect(trackSignupCompletedMock).toHaveBeenCalledWith("google");
    expect(trackLoginCompletedMock).not.toHaveBeenCalled();
  });

  it("tracks login_completed for a successful callback when the user is onboarded", async () => {
    consumeRedirectOAuthProviderMock.mockReturnValue("facebook");
    fetchCurrentUserMock.mockResolvedValue(makeUser(true));

    render(<OAuthCallbackScreen />);

    await waitFor(() => expect(replaceMock).toHaveBeenCalledWith("/play"));
    expect(trackLoginCompletedMock).toHaveBeenCalledWith("facebook");
    expect(trackSignupCompletedMock).not.toHaveBeenCalled();
  });

  it("does not track completion when the callback fails", async () => {
    fetchCurrentUserMock.mockRejectedValue(new Error("provision failed"));

    render(<OAuthCallbackScreen />);

    await waitFor(() => {
      expect(screen.getByText("oauthCallback.authenticationFailed")).toBeInTheDocument();
    });
    expect(trackSignupCompletedMock).not.toHaveBeenCalled();
    expect(trackLoginCompletedMock).not.toHaveBeenCalled();
  });
});
