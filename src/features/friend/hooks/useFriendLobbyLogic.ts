import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { useRealtimeConnection } from "@/lib/realtime/useRealtimeConnection";
import { getSocket } from "@/lib/realtime/socket-client";
import { useRealtimeMatchStore } from "@/stores/realtimeMatch.store";
import { usePlayer } from "@/contexts/PlayerContext";
import { useAuthStore } from "@/stores/auth.store";
import { useGameSessionStore } from "@/stores/gameSession.store";
import { logger } from "@/utils/logger";
import type { LobbySettings as LobbySettingsState } from "@/lib/realtime/socket.types";
import { useCategoriesList } from "@/lib/queries/categories.queries";
import { copyToClipboard } from "@/utils/clipboard";
import { useHeadToHead } from "@/lib/queries/stats.queries";
import { trackLobbyCreated, trackLobbyJoined } from "@/lib/analytics/game-events";

interface UseFriendLobbyLogicProps {
  roomCode: string;
  isHost: boolean;
}

export function useFriendLobbyLogic({ roomCode, isHost }: UseFriendLobbyLogicProps) {
  const router = useRouter();
  const { player } = usePlayer();
  const authUser = useAuthStore((state) => state.user);
  const selfUserId = authUser?.id ?? player.id;

  // Stores
  const lobby = useRealtimeMatchStore((state) => state.lobby);
  const draft = useRealtimeMatchStore((state) => state.draft);
  const match = useRealtimeMatchStore((state) => state.match);
  const error = useRealtimeMatchStore((state) => state.error);
  const clearError = useRealtimeMatchStore((state) => state.clearError);
  const startSession = useGameSessionStore((state) => state.startSession);

  // Queries
  const { data: categoriesData } = useCategoriesList({
    limit: 100,
    is_active: "true",
    min_questions: 5,
  });
  const allCategories = categoriesData?.items ?? [];

  // Connection
  useRealtimeConnection({ enabled: true, selfUserId });

  const startedRef = useRef(false);
  const createdRef = useRef(false);
  const leavingRef = useRef(false);
  const prevOpponentIdRef = useRef<string | null>(null);
  const prevLobbyIdRef = useRef<string | null>(null);
  const initActionRef = useRef<string | null>(null);
  const startMatchTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  // visibilityRetryRef and related state removed — coalesced debounce in LobbySettings handles this
  const [settingsErrorVersion, setSettingsErrorVersion] = useState(0);
  const [isStartingMatch, setIsStartingMatch] = useState(false);

  const clearStartMatchTimeout = useCallback(() => {
    if (!startMatchTimeoutRef.current) return;
    clearTimeout(startMatchTimeoutRef.current);
    startMatchTimeoutRef.current = null;
  }, []);

  const lobbyCode = lobby?.inviteCode ?? (roomCode === "new" ? "" : roomCode);
  const members = lobby?.members ?? [];
  const me = members.find((member) => member.userId === selfUserId);
  const otherMembers = members.filter((member) => member.userId !== selfUserId);
  const opponent = otherMembers[0];

  const { data: h2hSummary } = useHeadToHead(
    me?.userId ?? selfUserId,
    otherMembers.length === 1 ? opponent?.userId : undefined
  );

  // 1. Reset local guards after leaving a lobby/match
  useEffect(() => {
    if (lobby || draft || match) return;
    if (leavingRef.current) return;
    startedRef.current = false;
    createdRef.current = false;
    initActionRef.current = null;
    clearStartMatchTimeout();
    const stopTimer = setTimeout(() => {
      setIsStartingMatch(false);
    }, 0);
    return () => clearTimeout(stopTimer);
  }, [clearStartMatchTimeout, lobby, draft, match]);

  // 2. Socket Initialization
  useEffect(() => {
    if (leavingRef.current) return;
    if (createdRef.current) return;
    const socket = getSocket();
    const targetCode = roomCode === "new" ? null : roomCode.toUpperCase();
    const currentCode = lobby?.inviteCode?.toUpperCase() ?? null;

    if (isHost) {
      if (initActionRef.current === "create") return;
      initActionRef.current = "create";
      createdRef.current = true;
      socket.emit("lobby:create", { mode: "friendly" });
      logger.info("Socket emit lobby:create", { mode: "friendly" });
      trackLobbyCreated("friendly");
      return;
    }

    if (!roomCode || roomCode === "new") return;
    if (currentCode && currentCode === targetCode) return;

    const joinKey = `join:${targetCode ?? roomCode.toUpperCase()}`;
    if (initActionRef.current === joinKey) return;
    initActionRef.current = joinKey;
    createdRef.current = true;
    socket.emit("lobby:join_by_code", { inviteCode: roomCode });
    logger.info("Socket emit lobby:join_by_code", {
      inviteCode: `${roomCode.slice(0, 2)}***`,
    });
    trackLobbyJoined("", roomCode);
  }, [isHost, roomCode, lobby?.inviteCode, lobby]);

  // 3. Navigation & Session Logic
  useEffect(() => {
    if (!lobby || startedRef.current) return;
    startedRef.current = true;
    // Derive questionCount from lobby settings, fallback to 10 if missing or invalid
    const settingsCount = (lobby.settings as unknown as Record<string, unknown>)?.questionCount;
    const derivedCount =
      typeof settingsCount === "number" && settingsCount > 0 ? settingsCount : 10;
    startSession({ mode: "quizball", matchType: "friendly", questionCount: derivedCount });
  }, [lobby, startSession]);

  // Explicitly notify the remaining player when an opponent leaves a waiting lobby.
  useEffect(() => {
    if (!lobby || leavingRef.current) {
      prevOpponentIdRef.current = null;
      prevLobbyIdRef.current = null;
      return;
    }

    // Reset opponent tracking when lobby identity changes
    const currentLobbyId = lobby.lobbyId;
    if (prevLobbyIdRef.current !== currentLobbyId) {
      prevOpponentIdRef.current = null;
      prevLobbyIdRef.current = currentLobbyId;
    }

    const prevOpponentId = prevOpponentIdRef.current;
    const currentOpponentId = opponent?.userId ?? null;

    if (
      lobby.status === "waiting" &&
      prevOpponentId &&
      !currentOpponentId
    ) {
      toast.info("Opponent left the lobby.");
    }

    prevOpponentIdRef.current = currentOpponentId;
  }, [lobby, opponent?.userId, lobby?.lobbyId]);

  useEffect(() => {
    if (!lobby) return;
    logger.info("Lobby state in UI", {
      lobbyId: lobby.lobbyId,
      inviteCode: lobby.inviteCode ?? null,
      selfUserId,
      isHost,
    });
  }, [lobby?.lobbyId, lobby?.inviteCode, selfUserId, isHost, lobby]);

  useEffect(() => {
    if (!draft && !match) return;
    clearStartMatchTimeout();
    router.push("/game");
  }, [clearStartMatchTimeout, draft, match, router]);

  useEffect(() => {
    if (!error) return;
    let timer: ReturnType<typeof setTimeout> | null = null;

    const isLobbySettingsError =
      error.code === "LOBBY_READY_LOCKED" ||
      error.code === "INVALID_SETTINGS" ||
      error.code === "LOBBY_NOT_WAITING" ||
      error.code === "NOT_HOST" ||
      error.code === "LOBBY_NOT_FOUND" ||
      error.code === "NOT_IN_LOBBY" ||
      error.code === "TRANSITION_IN_PROGRESS";
    const isTransientSettingsBusy = error.code === "LOBBY_SETTINGS_LOCKED";

    if (isLobbySettingsError) {
      timer = setTimeout(() => {
        setSettingsErrorVersion((current) => current + 1);
      }, 0);
    }
    clearStartMatchTimeout();
    const stopStartingTimer = setTimeout(() => {
      setIsStartingMatch(false);
    }, 0);
    if (!isTransientSettingsBusy) {
      toast.error(error.message);
    }
    clearError();

    return () => {
      if (timer) {
        clearTimeout(timer);
      }
      clearTimeout(stopStartingTimer);
    };
  }, [clearError, clearStartMatchTimeout, error]);

  // 3. Actions
  const copyCode = async () => {
    if (!lobbyCode) return;
    const success = await copyToClipboard(lobbyCode);
    if (success) toast.success("Room Code copied!");
  };

  const handleReadyToggle = () => {
    if (!me) return;
    getSocket().emit("lobby:ready", { ready: !me.isReady });
    logger.info("Socket emit lobby:ready", { ready: !me.isReady });
  };

  const handleUpdateSettings = useCallback((updates: Partial<LobbySettingsState> & { isPublic?: boolean }) => {
    if (!lobby) return;

    const nextSettings = {
      ...lobby.settings,
      ...updates,
    };
    const emit = {
      lobbyId: lobby.lobbyId,
      gameMode: nextSettings.gameMode,
      friendlyRandom: nextSettings.friendlyRandom,
      friendlyCategoryAId: nextSettings.friendlyCategoryAId,
      friendlyCategoryBId: nextSettings.friendlyCategoryBId ?? null,
      ...(updates.isPublic !== undefined && { isPublic: updates.isPublic }),
    };

    const settingsUnchanged =
      emit.gameMode === lobby.settings.gameMode &&
      emit.friendlyRandom === lobby.settings.friendlyRandom &&
      emit.friendlyCategoryAId === lobby.settings.friendlyCategoryAId;

    const visibilityUnchanged =
      updates.isPublic === undefined || updates.isPublic === lobby.isPublic;

    if (settingsUnchanged && visibilityUnchanged) {
      return;
    }

    getSocket().emit("lobby:update_settings", emit);
    logger.info("Socket emit lobby:update_settings", emit);
  }, [lobby]);

  const handleStartMatch = () => {
    if (isStartingMatch) return;
    setIsStartingMatch(true);
    clearStartMatchTimeout();
    startMatchTimeoutRef.current = setTimeout(() => {
      setIsStartingMatch(false);
      toast.error("Match start is taking too long. Please try again.");
    }, 12000);

    getSocket().emit("lobby:start");
    logger.info("Socket emit lobby:start", {
      lobbyId: lobby?.lobbyId ?? null,
    });
  };

  const handleLeaveLobby = () => {
    leavingRef.current = true;
    createdRef.current = true;
    startedRef.current = true;
    initActionRef.current = null;
    clearStartMatchTimeout();
    setIsStartingMatch(false);
    getSocket().emit("lobby:leave");
    logger.info("Socket emit lobby:leave");
    // Leave room route immediately to avoid URL-driven auto-rejoin.
    router.replace("/play");
    window.setTimeout(() => {
      useRealtimeMatchStore.getState().reset();
      leavingRef.current = false;
    }, 150);
  };

  useEffect(() => {
    return () => {
      clearStartMatchTimeout();
    };
  }, [clearStartMatchTimeout]);

  return {
    lobby,
    members,
    lobbyCode,
    me,
    opponent,
    h2hSummary: opponent ? h2hSummary ?? null : null,
    allCategories,
    settingsErrorVersion,
    isStartingMatch,
    actions: {
      copyCode,
      handleReadyToggle,
      handleUpdateSettings,
      handleStartMatch,
      handleLeaveLobby,
    },
  };
}
