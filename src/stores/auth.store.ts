import { create } from "zustand";
import { bootstrapUser } from "@/lib/auth/session";
import {
  clearTokens,
  getAccessToken,
  getRefreshToken,
} from "@/lib/auth/tokenStorage";
import { logout as logoutService, refresh } from "@/lib/auth/auth.service";
import type { User } from "@/lib/types";
import { logger } from "@/utils/logger";

type AuthStatus = "loading" | "anonymous" | "authenticated";

type AuthState = {
  status: AuthStatus;
  user: User | null;
  hasBootstrapped: boolean;
  bootstrap: () => Promise<void>;
  setAuthenticated: (user: User) => void;
  logout: () => Promise<void>;
};

export const useAuthStore = create<AuthState>((set, get) => ({
  status: "loading",
  user: null,
  hasBootstrapped: false,
  setAuthenticated: (user) =>
    set({ status: "authenticated", user, hasBootstrapped: true }),
  bootstrap: async () => {
    const { status, hasBootstrapped } = get();
    if (status === "authenticated" || status === "anonymous") {
      if (!hasBootstrapped) {
        set({ hasBootstrapped: true });
      }
      return;
    }
    if (hasBootstrapped && status !== "loading") {
      return;
    }
    if (status !== "loading") {
      set({ status: "loading" });
    }

    const accessToken = getAccessToken();
    const refreshToken = getRefreshToken();

    if (!accessToken && !refreshToken) {
      logger.info("Auth bootstrap no tokens");
      clearTokens();
      set({ status: "anonymous", user: null, hasBootstrapped: true });
      return;
    }

    if (!accessToken && refreshToken) {
      logger.info("Auth bootstrap refresh needed");
      const refreshed = await refresh();
      if (!refreshed) {
        logger.warn("Auth bootstrap refresh failed");
        clearTokens();
        set({ status: "anonymous", user: null, hasBootstrapped: true });
        return;
      }
    }

    try {
      const user = await bootstrapUser();
      logger.info("Auth bootstrap success");
      set({ status: "authenticated", user, hasBootstrapped: true });
    } catch {
      logger.warn("Auth bootstrap failed");
      clearTokens();
      set({ status: "anonymous", user: null, hasBootstrapped: true });
    }
  },
  logout: async () => {
    try {
      await logoutService();
    } catch {
      // Best-effort; store state still resets.
    }
    clearTokens();
    set({ status: "anonymous", user: null, hasBootstrapped: true });
  },
}));
