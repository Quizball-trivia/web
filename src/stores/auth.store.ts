import { create } from "zustand";
import { fetchCurrentUser } from "@/lib/auth/session";
import { clearTokens } from "@/lib/auth/tokenStorage";
import { logout as logoutService } from "@/lib/auth/auth.service";
import { ApiError } from "@/lib/api/api";
import type { User } from "@/lib/types";
import { logger } from "@/utils/logger";
import { identifyUser, resetUser } from "@/lib/posthog";
import { trackLogout } from "@/lib/analytics/game-events";
import { storage, STORAGE_KEYS } from "@/utils/storage";
import { getSupabaseSession, signOutLocal } from "@/lib/auth/supabase";
import { disconnectSocket } from "@/lib/realtime/socket-client";

type AuthStatus = "loading" | "anonymous" | "authenticated";
const BOOTSTRAP_TRANSIENT_RETRY_MS = 300;

type AuthState = {
  status: AuthStatus;
  user: User | null;
  hasBootstrapped: boolean;
  bootstrap: (options?: { force?: boolean }) => Promise<void>;
  setAuthenticated: (user: User) => void;
  setAnonymous: () => void;
  patchProgression: (progression: User["progression"]) => void;
  logout: () => Promise<void>;
};

function syncAnalyticsUser(user: User): void {
  if (!user.id) {
    return;
  }

  const displayName = user.nickname ?? user.email ?? user.id;

  // All person properties ride on the $identify call (free) — no separate $set
  // event, which was ~21k billable events/day for what identify already does.
  identifyUser(
    user.id,
    {
      $email: user.email,
      $name: displayName,
      email: user.email,
      name: displayName,
      nickname: user.nickname,
      created_at: user.created_at,
      country: user.country,
      favorite_club: user.favorite_club,
      preferred_language: user.preferred_language,
      level: user.progression?.level,
    },
    {
      signup_date: user.created_at,
      first_email: user.email,
    },
  );
}

function wait(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function isAuthFailure(error: unknown): boolean {
  return error instanceof ApiError && error.status === 401;
}

function clearLocalSession(): void {
  clearTokens();
  storage.remove(STORAGE_KEYS.STORE_WALLET);
}

export const useAuthStore = create<AuthState>((set, get) => ({
  status: "loading",
  user: null,
  hasBootstrapped: false,
  setAuthenticated: (user) => {
    set({ status: "authenticated", user, hasBootstrapped: true });
    syncAnalyticsUser(user);
  },
  setAnonymous: () => {
    clearLocalSession();
    resetUser();
    set({ status: "anonymous", user: null, hasBootstrapped: true });
  },
  patchProgression: (progression) => {
    const { user } = get();
    if (!user) return;
    set({ user: { ...user, progression } });
  },
  bootstrap: async (options) => {
    const force = options?.force ?? false;
    const { status, hasBootstrapped } = get();
    const hasAuthenticatedUser = status === "authenticated" && Boolean(get().user);
    if (!force && status === "authenticated") {
      if (!hasBootstrapped) {
        set({ hasBootstrapped: true });
      }
      return;
    }

    if (!force && status === "anonymous") {
      if (!hasBootstrapped) {
        set({ hasBootstrapped: true });
      }
      return;
    }

    if (!force && hasBootstrapped && status !== "loading") {
      return;
    }

    if (status !== "loading" && !hasAuthenticatedUser) {
      set({ status: "loading" });
    }

    try {
      clearTokens();
      const session = await getSupabaseSession();
      if (!session?.access_token) {
        logger.info("Auth bootstrap anonymous: no Supabase session");
        clearLocalSession();
        resetUser();
        set({ status: "anonymous", user: null, hasBootstrapped: true });
        return;
      }

      const user = await fetchCurrentUser();
      logger.info("Auth bootstrap success");
      set({ status: "authenticated", user, hasBootstrapped: true });
      syncAnalyticsUser(user);
    } catch (error) {
      logger.warn("Auth bootstrap failed", error);
      if (isAuthFailure(error)) {
        try {
          await signOutLocal();
        } catch {
          // Best-effort; local app state still becomes anonymous.
        }
        clearLocalSession();
        resetUser();
        set({ status: "anonymous", user: null, hasBootstrapped: true });
        return;
      }

      await wait(BOOTSTRAP_TRANSIENT_RETRY_MS);
      try {
        const session = await getSupabaseSession();
        if (!session?.access_token) {
          clearLocalSession();
          resetUser();
          set({ status: "anonymous", user: null, hasBootstrapped: true });
          return;
        }
        const user = await fetchCurrentUser();
        logger.info("Auth bootstrap transient retry success");
        set({ status: "authenticated", user, hasBootstrapped: true });
        syncAnalyticsUser(user);
      } catch (retryError) {
        if (isAuthFailure(retryError)) {
          logger.warn("Auth bootstrap transient retry failed terminally");
          clearLocalSession();
          resetUser();
          set({ status: "anonymous", user: null, hasBootstrapped: true });
          return;
        }
        if (hasAuthenticatedUser) {
          logger.warn("Auth bootstrap transient retry failed; keeping authenticated session", retryError);
          return;
        }
        logger.warn("Auth bootstrap transient retry failed; keeping session", retryError);
        set({ status: "loading" });
      }
    }
  },
  logout: async () => {
    try {
      trackLogout();
    } catch (error) {
      logger.error('Analytics trackLogout failed', error);
    }
    disconnectSocket();
    try {
      await logoutService();
    } catch {
      // Best-effort; store state still resets.
    }
    clearLocalSession();
    resetUser(); // Reset PostHog user
    set({ status: "anonymous", user: null, hasBootstrapped: true });
  },
}));
