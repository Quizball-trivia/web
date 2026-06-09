import { render } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { User } from "@/lib/types";

const supabaseMocks = vi.hoisted(() => ({
  callback: null as null | ((event: string) => void),
  unsubscribe: vi.fn(),
}));

vi.mock("@/lib/auth/supabase", () => ({
  getSupabaseClient: () => ({
    auth: {
      onAuthStateChange: (callback: (event: string) => void) => {
        supabaseMocks.callback = callback;
        return {
          data: {
            subscription: {
              unsubscribe: supabaseMocks.unsubscribe,
            },
          },
        };
      },
    },
  }),
}));

import { AuthSessionBridge } from "@/components/auth/AuthSessionBridge";
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

describe("AuthSessionBridge", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.clearAllMocks();
    supabaseMocks.callback = null;
    useAuthStore.setState({
      status: "loading",
      user: null,
      hasBootstrapped: false,
      bootstrap: vi.fn().mockResolvedValue(undefined),
      setAnonymous: vi.fn(),
    });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("does not force bootstrap on token refresh when the current user is already authenticated", async () => {
    const bootstrap = vi.fn().mockResolvedValue(undefined);
    useAuthStore.setState({
      status: "authenticated",
      user: USER,
      hasBootstrapped: true,
      bootstrap,
    });

    render(<AuthSessionBridge />);
    supabaseMocks.callback?.("TOKEN_REFRESHED");
    await vi.runAllTimersAsync();

    expect(bootstrap).not.toHaveBeenCalled();
  });

  it("still bootstraps auth on a real sign-in event", async () => {
    const bootstrap = vi.fn().mockResolvedValue(undefined);
    useAuthStore.setState({ bootstrap });

    render(<AuthSessionBridge />);
    supabaseMocks.callback?.("SIGNED_IN");
    await vi.runAllTimersAsync();

    expect(bootstrap).toHaveBeenCalledWith({ force: true });
  });
});
