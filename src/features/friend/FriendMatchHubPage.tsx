"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
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
      joinRetryCountRef.current = 0;
      setIsJoiningCode(null);
      setIsNavigatingToRoom(false);
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
      setIsJoiningCode(null);
      joinRetryCountRef.current = 0;
    }
  }, [lobby?.inviteCode, isNavigatingToRoom]);

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
          joinRetryCountRef.current = 0;
          setIsJoiningCode(null);
          setIsNavigatingToRoom(false);
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
      setIsJoiningCode(null);
      setIsNavigatingToRoom(false);
      joinRetryCountRef.current = 0;
      clearJoinTimeout();
      clearJoinRetryTimer();
    }
  }, [error, isJoiningCode, isNavigatingToRoom, lobby?.inviteCode, queryClient, sessionState?.state]);

  return (
    <div className="container mx-auto max-w-5xl py-6 animate-in fade-in space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
         <div className="space-y-1">
            <h1 className="text-3xl font-black tracking-tight">Friend Match</h1>
            <p className="text-muted-foreground">Jump into an open room or start your own.</p>
         </div>

         {/* Gamified Stat/Decor (Optional) */}
         <div className="hidden md:flex items-center gap-3 px-4 py-2 bg-card border border-border rounded-full shadow-sm text-sm font-medium">
            <Users className="size-4 text-green-500" />
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
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
         <TabsList className="grid w-full grid-cols-2 max-w-sm">
            <TabsTrigger value="browse">Browse Rooms</TabsTrigger>
            <TabsTrigger value="create">Create / Join</TabsTrigger>
         </TabsList>

         <TabsContent value="browse" className="min-h-[400px]">
            <LobbyBrowsePanel 
               onJoin={handleJoinPublic}
               isJoiningCode={isJoiningCode}
               onActionTriggered={handleActionTriggered}
            />
         </TabsContent>

         <TabsContent value="create">
            <CreateJoinPanel onActionTriggered={handleActionTriggered} />
         </TabsContent>
      </Tabs>

      {/* Error Modal */}
      <AlreadyInLobbyModal 
         currentLobbyCode={lobby?.inviteCode ?? null}
      />
    </div>
  );
}
