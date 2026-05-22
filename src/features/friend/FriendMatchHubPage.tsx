"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { LobbyBrowsePanel } from "./components/LobbyBrowsePanel";
import { CreateJoinPanel } from "./components/CreateJoinPanel";
import { AlreadyInLobbyModal } from "./components/AlreadyInLobbyModal";
import { useRealtimeConnection } from "@/lib/realtime/useRealtimeConnection";
import { usePlayer } from "@/contexts/PlayerContext";
import { useAuthStore } from "@/stores/auth.store";
import { useRealtimeMatchStore } from "@/stores/realtimeMatch.store";
import { useQueryClient } from "@tanstack/react-query";
import { lobbiesKeys } from "@/lib/queries/lobbies.queries";
import { Users } from "lucide-react";
import { toast } from "sonner";
import { logger } from "@/utils/logger";
import { connectSocket, getSocket } from "@/lib/realtime/socket-client";

/** Delay (ms) between lobby:leave and lobby:join_by_code to let the server process the leave. */
const LOBBY_LEAVE_JOIN_DELAY_MS = 140;

export function FriendMatchHubPage() {
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
  const onlineUsers = useRealtimeMatchStore(state => state.onlineUsers);
  const error = useRealtimeMatchStore(state => state.error);
  const clearRealtimeError = useRealtimeMatchStore(state => state.clearError);
  
  const [activeTab, setActiveTab] = useState(initialTab);
  const [isJoiningCode, setIsJoiningCode] = useState<string | null>(null);
  const [isNavigatingToRoom, setIsNavigatingToRoom] = useState(false);
  const joinRetryCountRef = useRef(0);
  const joinTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const joinRetryTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearJoinTimeout = () => {
    if (!joinTimeoutRef.current) return;
    clearTimeout(joinTimeoutRef.current);
    joinTimeoutRef.current = null;
  };

  const clearJoinRetryTimer = () => {
    if (!joinRetryTimerRef.current) return;
    clearTimeout(joinRetryTimerRef.current);
    joinRetryTimerRef.current = null;
  };

  const resetJoiningCodeState = useCallback(() => {
    setIsJoiningCode(null);
    joinRetryCountRef.current = 0;
  }, []);

  const resetJoinNavigationState = useCallback(() => {
    resetJoiningCodeState();
    setIsNavigatingToRoom(false);
  }, [resetJoiningCodeState]);

  useEffect(() => {
    // Prevent stale realtime errors from previous routes from flashing lobby UI in this screen.
    clearRealtimeError();
  }, [clearRealtimeError]);

  useEffect(() => {
    return () => {
      clearJoinTimeout();
      clearJoinRetryTimer();
    };
  }, []);

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
      router.push(`/friend/room/${lobby.inviteCode}`);
      // Reset navigation state after push
      return; 
    }
    
    // Safety fallback: if we are verifying "Already In Lobby", we don't redirect.
  }, [lobby, router, isNavigatingToRoom]);

  const handleJoinPublic = (inviteCode: string) => {
    const currentCode = lobby?.inviteCode?.toUpperCase() ?? null;
    const targetCode = inviteCode.toUpperCase();
    if (currentCode === targetCode) {
      router.push(`/friend/room/${targetCode}`);
      return;
    }

    handleActionTriggered();
    setIsJoiningCode(targetCode);
    joinRetryCountRef.current = 0;
    clearJoinTimeout();
    joinTimeoutRef.current = setTimeout(() => {
      clearJoinRetryTimer();
      resetJoinNavigationState();
      toast.error("Join is taking too long. Please refresh and try again.");
    }, 8000);
    
    // Leave → join: ideally we'd wait for a server ack on lobby:leave, but the
    // backend event signature is fire-and-forget (`() => void`).  The 140 ms
    // delay is a pragmatic workaround; the TRANSITION_IN_PROGRESS retry below
    // covers the race if the leave hasn't completed in time.
    connectSocket();
    const socket = getSocket();
    if (lobby?.lobbyId) {
      socket.emit("lobby:leave");
    }
    setTimeout(() => {
      socket.emit("lobby:join_by_code", { inviteCode: targetCode });
      toast.info(`Joining ${targetCode}...`);
    }, lobby?.lobbyId ? LOBBY_LEAVE_JOIN_DELAY_MS : 0);
  };

  // Clear joining state if error occurs
  useEffect(() => {
    if (lobby?.inviteCode && isNavigatingToRoom) {
      clearJoinTimeout();
      clearJoinRetryTimer();
      queueMicrotask(resetJoiningCodeState);
    }
  }, [isNavigatingToRoom, lobby?.inviteCode, resetJoiningCodeState]);

  useEffect(() => {
    if (error) {
      const isTransientJoinLock =
        error.code === "TRANSITION_IN_PROGRESS" &&
        isNavigatingToRoom &&
        Boolean(isJoiningCode);

      if (isTransientJoinLock && isJoiningCode) {
        if (joinRetryCountRef.current >= 5) {
          clearJoinTimeout();
          clearJoinRetryTimer();
          queueMicrotask(resetJoinNavigationState);
          toast.error("Could not join lobby right now. Please try again.");
          return;
        }
        joinRetryCountRef.current += 1;
        const retryDelayMs = 220 + joinRetryCountRef.current * 100;
        logger.info("Retrying join after transient transition lock", {
          inviteCode: `${isJoiningCode.slice(0, 2)}***`,
          errorCode: error.code,
          retry: joinRetryCountRef.current,
          retryDelayMs,
          sessionState: sessionState?.state ?? "NO_SESSION",
        });
        clearJoinRetryTimer();
        joinRetryTimerRef.current = setTimeout(() => {
          connectSocket();
          getSocket().emit("lobby:join_by_code", { inviteCode: isJoiningCode });
          joinRetryTimerRef.current = null;
        }, retryDelayMs);
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
      if (error.code === "LOBBY_NOT_FOUND" && isJoiningCode) {
        void queryClient.invalidateQueries({ queryKey: lobbiesKeys.public() });
        toast.error("That lobby just closed. Lobby list refreshed.");
      }
      queueMicrotask(resetJoinNavigationState);
      clearJoinTimeout();
      clearJoinRetryTimer();
    }
  }, [
    error,
    isJoiningCode,
    isNavigatingToRoom,
    lobby?.inviteCode,
    queryClient,
    resetJoinNavigationState,
    sessionState?.state,
  ]);

  return (
    <div className="container mx-auto max-w-5xl px-4 py-6 animate-in fade-in space-y-6 sm:px-6 lg:px-0">
      {/* Header */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
         <div className="space-y-1">
            <h1
               className="uppercase text-white"
               style={{ fontFamily: "'Poppins', sans-serif", fontWeight: 600, fontSize: "clamp(22px, 4vw, 36px)", lineHeight: 1 }}
            >
               Friend Match
            </h1>
            <p
               className="uppercase text-white/50"
               style={{ fontFamily: "'Poppins', sans-serif", fontWeight: 500, fontSize: "clamp(10px, 1.1vw, 13px)" }}
            >
               Jump into an open room or start your own.
            </p>
         </div>

         {/* Gamified Stat/Decor (Optional) */}
         <div
            className="hidden lg:flex items-center gap-2 text-white uppercase"
            style={{ fontFamily: "'Poppins', sans-serif", fontWeight: 600, fontSize: 13, letterSpacing: '0.06em' }}
         >
            <Users className="size-4 text-brand-green" />
            <span>
              {onlineUsers === null ? "Players online..." : `${onlineUsers.toLocaleString()} players online`}
            </span>
         </div>
      </div>

      {(isSessionRecovering || isSessionTransitioning) && (
        <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-200">
          {isSessionRecovering
            ? "Cleaning up a previous session... this will only take a moment."
            : "Getting things ready... please wait a moment."}
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
                     {value === 'browse' ? 'Browse Rooms' : 'Create / Join'}
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
