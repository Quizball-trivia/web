import { create } from "zustand";
import { bootstrapUser } from "@/lib/auth/session";
import { clearTokens } from "@/lib/auth/tokenStorage";
import { logout as logoutService, refreshSession } from "@/lib/auth/auth.service";
import { ApiError } from "@/lib/api/api";
import type { User } from "@/lib/types";
import { logger } from "@/utils/logger";
import { identifyUser, resetUser, setPersonProperties } from "@/lib/posthog";
import { trackLogout } from "@/lib/analytics/game-events";
import { setNewRelicUser } from "@/lib/newrelic-browser";
import { storage, STORAGE_KEYS } from "@/utils/storage";

type AuthStatus = "loading" | "anonymous" | "authenticated";
const BOOTSTRAP_TRANSIENT_RETRY_MS = 300;

type AuthState = {
  status: AuthStatus;
  user: User | null;
  hasBootstrapped: boolean;
  bootstrap: (options?: { force?: boolean }) => Promise<void>;
  setAuthenticated: (user: User) => void;
  patchProgression: (progression: User["progression"]) => void;
  logout: () => Promise<void>;
};

function syncAnalyticsUser(user: User): void {
  if (!user.id) {
    return;
  }

  identifyUser(user.id, {
    email: user.email,
    nickname: user.nickname,
    created_at: user.created_at,
  });

  try {
    setPersonProperties(
      {
        nickname: user.nickname,
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
  } catch (error) {
    logger.error('Analytics setPersonProperties failed', error);
  }

  setNewRelicUser(user.id, {
    email: user.email,
    nickname: user.nickname,
  });
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
  patchProgression: (progression) => {
    const { user } = get();
    if (!user) return;
    set({ user: { ...user, progression } });
  },
  bootstrap: async (options) => {
    const force = options?.force ?? false;
    const { status, hasBootstrapped } = get();
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

    if (status !== "loading") {
      set({ status: "loading" });
    }

    try {
      const user = await bootstrapUser();
      logger.info("Auth bootstrap success");
      set({ status: "authenticated", user, hasBootstrapped: true });
      syncAnalyticsUser(user);
    } catch (error) {
      logger.warn("Auth bootstrap failed", error);
      const refreshed = await refreshSession();
      if (refreshed.ok) {
        await wait(BOOTSTRAP_TRANSIENT_RETRY_MS);
        try {
          const user = await bootstrapUser();
          logger.info("Auth bootstrap after refresh success");
          set({ status: "authenticated", user, hasBootstrapped: true });
          syncAnalyticsUser(user);
          return;
        } catch (retryError) {
          if (isAuthFailure(retryError)) {
            logger.warn("Auth bootstrap after refresh failed terminally");
            clearLocalSession();
            set({ status: "anonymous", user: null, hasBootstrapped: true });
            return;
          }
          logger.warn("Auth bootstrap after refresh failed transiently; keeping session", retryError);
          set({ status: "loading" });
          return;
        }
      }
      if (refreshed.terminal) {
        clearLocalSession();
        set({ status: "anonymous", user: null, hasBootstrapped: true });
        return;
      }

      await wait(BOOTSTRAP_TRANSIENT_RETRY_MS);
      try {
        const user = await bootstrapUser();
        logger.info("Auth bootstrap after transient refresh retry success");
        set({ status: "authenticated", user, hasBootstrapped: true });
        syncAnalyticsUser(user);
      } catch (retryError) {
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
