import { create } from "zustand";
import { bootstrapUser } from "@/lib/auth/session";
import { clearTokens } from "@/lib/auth/tokenStorage";
import { logout as logoutService, refresh } from "@/lib/auth/auth.service";
import type { User } from "@/lib/types";
import { logger } from "@/utils/logger";

type AuthStatus = "loading" | "anonymous" | "authenticated";

type AuthState = {
  status: AuthStatus;
  user: User | null;
  hasBootstrapped: boolean;
  bootstrap: (options?: { force?: boolean }) => Promise<void>;
  setAuthenticated: (user: User) => void;
  logout: () => Promise<void>;
};

export const useAuthStore = create<AuthState>((set, get) => ({
  status: "loading",
  user: null,
  hasBootstrapped: false,
  setAuthenticated: (user) =>
    set({ status: "authenticated", user, hasBootstrapped: true }),
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
    } catch {
      logger.warn("Auth bootstrap failed");
      const refreshed = await refresh();
      if (refreshed) {
        try {
          const user = await bootstrapUser();
          logger.info("Auth bootstrap after refresh success");
          set({ status: "authenticated", user, hasBootstrapped: true });
          return;
        } catch {
          logger.warn("Auth bootstrap after refresh failed");
        }
      }
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
