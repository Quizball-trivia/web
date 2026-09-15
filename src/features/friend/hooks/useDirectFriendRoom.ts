"use client";

import { useCallback } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { useLocale } from "@/contexts/LocaleContext";
import { useIsGuest } from "@/lib/auth/useIsGuest";
import { ensureGuestPrincipal } from "@/lib/realtime/realtime-principal";
import { useAuthPromptStore } from "@/stores/authPrompt.store";
import { useRealtimeMatchStore } from "@/stores/realtimeMatch.store";
import { useLobbyCommandMachine } from "./useLobbyCommandMachine";

export type DirectFriendGameMode = "auction" | "football_grid";

/**
 * "Play with friend" from a game's modal: create a private room already in that
 * game mode and go straight to it — no browse/create hub, no mode picker.
 * Guests get their principal first (or the sign-in prompt). When the room cannot
 * be created (already in a room, capacity, outage) the caller's fallback opens
 * the regular friend hub so the player can recover there.
 */
export function useDirectFriendRoom({ onFallback }: { onFallback: () => void }) {
  const router = useRouter();
  const { t, locale } = useLocale();
  const isGuest = useIsGuest();
  const openAuthPrompt = useAuthPromptStore((state) => state.open);
  const beginLobbyHandoff = useRealtimeMatchStore((state) => state.beginLobbyHandoff);
  const lobbyCommands = useLobbyCommandMachine();
  const { createLobby, isBusy } = lobbyCommands;

  const startFriendRoom = useCallback(async (gameMode: DirectFriendGameMode) => {
    if (isBusy) return;
    if (isGuest) {
      const guest = await ensureGuestPrincipal(locale);
      if (!guest) { openAuthPrompt(); return; }
    }
    const creating = toast.info(t("friend.creatingRoom"));
    const result = await createLobby({ mode: "friendly", isPublic: false, gameMode });
    toast.dismiss(creating);
    if (result?.ok && result.inviteCode) {
      // The room's state arrives by server push: mark the handoff so the room page waits for it instead of joining by code.
      beginLobbyHandoff(result.inviteCode);
      router.push(`/friend/room/${result.inviteCode}?source=create`);
      return;
    }
    if (result && !result.ok) toast.error(result.message);
    onFallback();
  }, [beginLobbyHandoff, createLobby, isBusy, isGuest, locale, onFallback, openAuthPrompt, router, t]);

  return { startFriendRoom, isStarting: isBusy };
}
