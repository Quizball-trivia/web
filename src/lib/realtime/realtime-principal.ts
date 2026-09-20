"use client";

import { useEffect } from "react";
import { create } from "zustand";
import { API_BASE_URL, GUEST_LOBBIES_ENABLED } from "@/lib/config";
import { GUEST_TOKEN_HEADER, forgetGuestToken, getGuestToken } from "@/lib/guest/guestSession";
import { useAuthStore } from "@/stores/auth.store";
import type { AvatarCustomization } from "@/types/game";
import { logger } from "@/utils/logger";

/**
 * Who the realtime socket connects as. Members are the Supabase session; a
 * GUEST is an account-less visitor whose guest token has been resolved to a
 * server users row through POST /guest/principal — BEFORE the socket connects,
 * because every realtime consumer needs the user id up front. Exactly one
 * principal is active: signing in replaces the guest, signing out drops it.
 */
export interface GuestPrincipal {
  userId: string;
  token: string;
  nickname: string | null;
  avatarCustomization: AvatarCustomization | null;
}

export type RealtimePrincipal =
  | { kind: "member"; userId: string }
  | { kind: "guest"; userId: string; guest: GuestPrincipal }
  | { kind: "none"; userId: null };

type GuestStatus = "idle" | "resolving" | "ready" | "refused";

interface GuestPrincipalState {
  guest: GuestPrincipal | null;
  status: GuestStatus;
  setGuest: (guest: GuestPrincipal) => void;
  setStatus: (status: GuestStatus) => void;
  clear: () => void;
}

export const useGuestPrincipalStore = create<GuestPrincipalState>((set) => ({
  guest: null,
  status: "idle",
  setGuest: (guest) => set({ guest, status: "ready" }),
  setStatus: (status) => set({ status }),
  clear: () => set({ guest: null, status: "idle" }),
}));

let inflight: Promise<GuestPrincipal | null> | null = null;

async function resolveOnce(locale: string, token: string): Promise<GuestPrincipal | null> {
  const res = await fetch(`${API_BASE_URL}/api/v1/guest/principal`, {
    method: "POST",
    headers: { "Content-Type": "application/json", [GUEST_TOKEN_HEADER]: token },
    signal: AbortSignal.timeout(10_000),
  });
  if (res.status === 401) {
    forgetGuestToken(token);
    return null;
  }
  if (!res.ok) throw new Error(`guest principal failed (${res.status})`);
  const body = (await res.json()) as { user_id: string; nickname: string | null; avatar_customization: AvatarCustomization | null };
  return { userId: body.user_id, token, nickname: body.nickname, avatarCustomization: body.avatar_customization ?? null };
}

/** Resolves (once per tab) the guest principal; null when the feature is off or the server refuses. */
export async function ensureGuestPrincipal(locale: string): Promise<GuestPrincipal | null> {
  const store = useGuestPrincipalStore.getState();
  if (!GUEST_LOBBIES_ENABLED) return null;
  if (store.guest) return store.guest;
  // Only a POSITIVELY anonymous visitor becomes a guest; while auth is still
  // loading the caller waits (useEnsureGuestPrincipal re-runs on status change).
  if (useAuthStore.getState().status !== "anonymous") return null;
  if (inflight) return inflight;
  store.setStatus("resolving");
  inflight = (async () => {
    try {
      let token = await getGuestToken(locale);
      let guest = await resolveOnce(locale, token);
      if (!guest) {
        // The stored token was rejected (expired / retired): mint once more.
        token = await getGuestToken(locale);
        guest = await resolveOnce(locale, token);
      }
      // The visitor signed in while this was in flight: never publish a guest
      // over a member session (useRealtimePrincipal would drop it, but the
      // token must not reach the socket manager in between).
      if (useAuthStore.getState().status !== "anonymous") {
        useGuestPrincipalStore.getState().setStatus("idle");
        return null;
      }
      if (!guest) {
        useGuestPrincipalStore.getState().setStatus("refused");
        return null;
      }
      useGuestPrincipalStore.getState().setGuest(guest);
      return guest;
    } catch (error) {
      logger.warn("Guest principal resolution failed", { error: error instanceof Error ? error.message : String(error) });
      useGuestPrincipalStore.getState().setStatus("refused");
      return null;
    } finally {
      inflight = null;
    }
  })();
  return inflight;
}

/** The socket manager reads this synchronously when it needs a handshake token. */
export function getGuestPrincipalToken(): string | null {
  if (useAuthStore.getState().status === "authenticated") return null;
  return useGuestPrincipalStore.getState().guest?.token ?? null;
}

/** The server no longer accepts the guest (flag off, session retired): drop the principal so consumers disconnect. */
export function markGuestPrincipalRefused(): void {
  const store = useGuestPrincipalStore.getState();
  if (!store.guest) return;
  forgetGuestToken(store.guest.token);
  store.clear();
  store.setStatus("refused");
}

/** One connection owner: the member session when there is one, else a resolved guest, else nobody. */
export function useRealtimePrincipal(): RealtimePrincipal {
  const authStatus = useAuthStore((state) => state.status);
  const authUserId = useAuthStore((state) => state.user?.id ?? null);
  const guest = useGuestPrincipalStore((state) => state.guest);
  const clearGuest = useGuestPrincipalStore((state) => state.clear);
  // Signing in (or out) ends the guest identity: never two principals, and a
  // logged-out member does not silently continue as the previous guest.
  useEffect(() => {
    if (authStatus !== "anonymous" && guest) clearGuest();
  }, [authStatus, guest, clearGuest]);
  if (authStatus === "authenticated" && authUserId) return { kind: "member", userId: authUserId };
  if (authStatus === "anonymous" && guest) return { kind: "guest", userId: guest.userId, guest };
  return { kind: "none", userId: null };
}

/** Surfaces that host guest play (friend hub, room, the three game screens) resolve the guest principal on mount. */
export function useEnsureGuestPrincipal(locale: string): GuestStatus {
  const authStatus = useAuthStore((state) => state.status);
  const status = useGuestPrincipalStore((state) => state.status);
  useEffect(() => {
    if (!GUEST_LOBBIES_ENABLED || authStatus !== "anonymous") return;
    void ensureGuestPrincipal(locale);
  }, [authStatus, locale]);
  return status;
}
