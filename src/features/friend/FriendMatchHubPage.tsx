"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { LobbyBrowsePanel } from "./components/LobbyBrowsePanel";
import { CreateJoinPanel } from "./components/CreateJoinPanel";
import { AlreadyInLobbyModal } from "./components/AlreadyInLobbyModal";
import { useRealtimeConnection } from "@/lib/realtime/useRealtimeConnection";
import { usePlayer } from "@/contexts/PlayerContext";
import { useAuthStore } from "@/stores/auth.store";
import { useRealtimeMatchStore } from "@/stores/realtimeMatch.store";
import { useSiteOnlineStore } from "@/hooks/usePresencePing";
import { useQueryClient } from "@tanstack/react-query";
import { lobbiesKeys } from "@/lib/queries/lobbies.queries";
import { Users } from "lucide-react";
import { toast } from "sonner";
import { logger } from "@/utils/logger";
import { useLocale } from "@/contexts/LocaleContext";
import { useLobbyCommandMachine } from "./hooks/useLobbyCommandMachine";

export function FriendMatchHubPage() {
  const { t } = useLocale();
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialTab = searchParams.get('tab') === 'create' ? 'create' : 'browse';
  
  const { player } = usePlayer();
  const authUser = useAuthStore((state) => state.user);
  const selfUserId = authUser?.id ?? player.id;
  const queryClient = useQueryClient();
  
  // Realtime connection
  useRealtimeConnection({ enabled: true, selfUserId });
  
  const lobby = useRealtimeMatchStore(state => state.lobby);
  const sessionState = useRealtimeMatchStore(state => state.sessionState);
  const siteOnline = useSiteOnlineStore(state => state.siteOnline);
  const error = useRealtimeMatchStore(state => state.error);
  const clearRealtimeError = useRealtimeMatchStore(state => state.clearError);
  
  const [activeTab, setActiveTab] = useState(initialTab);
  const [isNavigatingToRoom, setIsNavigatingToRoom] = useState(false);
  const lobbyCommands = useLobbyCommandMachine();
  const { joinByCode, reset: resetLobbyCommand } = lobbyCommands;
  const isJoiningCode = lobbyCommands.isJoining ? lobbyCommands.state.targetInviteCode : null;

  const resetJoiningCodeState = useCallback(() => {
    resetLobbyCommand();
  }, [resetLobbyCommand]);

  const resetJoinNavigationState = useCallback(() => {
    resetJoiningCodeState();
    setIsNavigatingToRoom(false);
  }, [resetJoiningCodeState]);

  useEffect(() => {
    // Prevent stale realtime errors from previous routes from flashing lobby UI in this screen.
    clearRealtimeError();
  }, [clearRealtimeError]);

  // Only treat CORRUPT_MULTI_STATE as a recovery scenario.
  // sessionState === null just means the first session:state event hasn't arrived yet — normal loading, not an error.
  const isSessionRecovering =
    sessionState?.state === "CORRUPT_MULTI_STATE";
  const isSessionTransitioning = Boolean(
    error?.code === "TRANSITION_IN_PROGRESS" ||
    sessionState?.state === "IN_QUEUE"
  );

  const handleActionTriggered = () => {
    clearRealtimeError();
    setIsNavigatingToRoom(true);
  };

  // Navigate to lobby when lobby state is received (successful join/create), 
  // BUT only if we explicitly initiated navigation.
  useEffect(() => {
    if (lobby?.inviteCode && isNavigatingToRoom) {
      resetLobbyCommand();
      router.push(`/friend/room/${lobby.inviteCode}`);
      // Reset navigation state after push so a re-run doesn't strand the flag.
      // Deferred out of the synchronous effect body to avoid a cascading render.
      queueMicrotask(() => setIsNavigatingToRoom(false));
      return;
    }
    
    // Safety fallback: if we are verifying "Already In Lobby", we don't redirect.
  }, [lobby, resetLobbyCommand, router, isNavigatingToRoom]);

  const handleJoinPublic = (inviteCode: string) => {
    const currentCode = lobby?.inviteCode?.toUpperCase() ?? null;
    const targetCode = inviteCode.toUpperCase();
    if (currentCode === targetCode) {
      router.push(`/friend/room/${targetCode}`);
      return;
    }

    handleActionTriggered();
    toast.info(t('friend.toastJoiningCode', { code: targetCode }));
    void joinByCode(targetCode).then((result) => {
      if (!result) {
        resetJoinNavigationState();
        return;
      }
      if (result.ok) {
        // Route straight from the ack — the join result carries the invite
        // code, so we don't have to wait on the lobby:state store update
        // (which won't re-fire the navigation effect if the store was already
        // populated, leaving the button doing nothing).
        resetLobbyCommand();
        router.push(`/friend/room/${result.inviteCode}`);
        return;
      }
      if (result.code === "LOBBY_NOT_FOUND") {
        void queryClient.invalidateQueries({ queryKey: lobbiesKeys.public() });
        toast.error(t('friend.toastLobbyClosed'));
      } else {
        toast.error(result.message);
      }
      resetJoinNavigationState();
    });
  };

  // Clear joining state if error occurs
  useEffect(() => {
    if (lobby?.inviteCode && isNavigatingToRoom) {
      queueMicrotask(resetJoiningCodeState);
    }
  }, [isNavigatingToRoom, lobby?.inviteCode, resetJoiningCodeState]);

  useEffect(() => {
    if (error) {
      if (isNavigatingToRoom || isJoiningCode) {
        clearRealtimeError();
        return;
      }

      logger.warn("Friend hub observed realtime error", {
        code: error.code,
        message: error.message,
        meta: error.meta ?? null,
        isNavigatingToRoom,
        isJoiningCode,
        lobbyCode: lobby?.inviteCode ?? null,
      });
      queueMicrotask(resetJoinNavigationState);
      clearRealtimeError();
    }
  }, [
    clearRealtimeError,
    error,
    isJoiningCode,
    isNavigatingToRoom,
    lobby?.inviteCode,
    resetJoinNavigationState,
  ]);

  return (
    <div className="container mx-auto max-w-5xl px-4 py-6 animate-in fade-in space-y-6 sm:px-6 lg:px-0">
      {/* Header */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
         {/* Centered on mobile to match the centered empty-state below; left-aligned on desktop. */}
         <div className="space-y-1 text-center md:text-left">
            <h1
               className="uppercase text-white"
               style={{ fontFamily: "'Poppins', sans-serif", fontWeight: 600, fontSize: "clamp(22px, 4vw, 36px)", lineHeight: 1 }}
            >
               {t("friendHub.title")}
            </h1>
            <p
               className="uppercase text-white/50"
               style={{ fontFamily: "'Poppins', sans-serif", fontWeight: 500, fontSize: "clamp(10px, 1.1vw, 13px)" }}
            >
               {t("friendHub.subtitle")}
            </p>
         </div>

         {/* Gamified Stat/Decor (Optional) */}
         <div
            className="hidden lg:flex items-center gap-2 text-white uppercase"
            style={{ fontFamily: "'Poppins', sans-serif", fontWeight: 600, fontSize: 13, letterSpacing: '0.06em' }}
         >
            <Users className="size-4 text-brand-green" />
            <span>
              {siteOnline === null
                ? t("presence.onlineLoading")
                : t("presence.online", { count: siteOnline.toLocaleString() })}
            </span>
         </div>
      </div>

      {(isSessionRecovering || isSessionTransitioning) && (
        <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-200">
          {isSessionRecovering
            ? t("friendHub.sessionRecovering")
            : t("friendHub.sessionTransitioning")}
        </div>
      )}

      {/* Tabs */}
      <div className="space-y-6">
         <div className="flex w-full max-w-sm items-center gap-1.5 rounded-[20px] border-2 border-brand-blue p-1">
            {(['browse', 'create'] as const).map((value) => {
               const isActive = activeTab === value;
               return (
                  <button
                     key={value}
                     type="button"
                     onClick={() => setActiveTab(value)}
                     className={
                        isActive
                           ? "flex-1 rounded-[14px] bg-brand-blue py-2.5 uppercase text-white outline-none transition-colors focus:outline-none"
                           : "flex-1 rounded-[14px] py-2.5 uppercase text-white/70 outline-none transition-colors hover:bg-brand-blue/10 focus:outline-none"
                     }
                     style={{ fontFamily: "'Poppins', sans-serif", fontWeight: 600, fontSize: 14, letterSpacing: '0.06em' }}
                  >
                     {value === 'browse' ? t("friendHub.browseRooms") : t("friendHub.createJoin")}
                  </button>
               );
            })}
         </div>

         {activeTab === 'browse' ? (
            <div className="min-h-[400px]">
               <LobbyBrowsePanel
                  onJoin={handleJoinPublic}
                  isJoiningCode={isJoiningCode}
                  onActionTriggered={handleActionTriggered}
               />
            </div>
         ) : (
            <CreateJoinPanel onActionTriggered={handleActionTriggered} />
         )}
      </div>

      {/* Error Modal */}
      <AlreadyInLobbyModal 
         currentLobbyCode={lobby?.inviteCode ?? null}
      />
    </div>
  );
}
