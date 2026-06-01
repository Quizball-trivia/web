import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { useLocale } from "@/contexts/LocaleContext";
import { useRealtimeConnection } from "@/lib/realtime/useRealtimeConnection";
import { getSocket } from "@/lib/realtime/socket-client";
import { useRealtimeMatchStore } from "@/stores/realtimeMatch.store";
import { useRankedMatchmakingStore } from "@/stores/rankedMatchmaking.store";
import { usePlayer } from "@/contexts/PlayerContext";
import { useAuthStore } from "@/stores/auth.store";
import { useGameSessionStore } from "@/stores/gameSession.store";
import { logger } from "@/utils/logger";
import type { LobbySettings as LobbySettingsState } from "@/lib/realtime/socket.types";
import { useCategoriesList } from "@/lib/queries/categories.queries";
import { copyToClipboard } from "@/utils/clipboard";
import { trackFriendInviteSent } from "@/lib/analytics/game-events";
import { useHeadToHead } from "@/lib/queries/stats.queries";
import { trackLobbyCreated, trackLobbyJoined } from "@/lib/analytics/game-events";
import { normalizeFriendInviteCode } from "@/lib/friend/inviteCode";
import { useLobbyCommandMachine } from "./useLobbyCommandMachine";

interface UseFriendLobbyLogicProps {
  roomCode: string;
  isHost: boolean;
}

export function useFriendLobbyLogic({ roomCode, isHost }: UseFriendLobbyLogicProps) {
  const router = useRouter();
  const { t } = useLocale();
  const { player } = usePlayer();
  const authUser = useAuthStore((state) => state.user);
  const selfUserId = authUser?.id ?? player.id;

  // Stores
  const lobby = useRealtimeMatchStore((state) => state.lobby);
  const draft = useRealtimeMatchStore((state) => state.draft);
  const hasActiveMatch = useRealtimeMatchStore((s) => s.match != null);
  const sessionState = useRealtimeMatchStore((state) => state.sessionState);
  const error = useRealtimeMatchStore((state) => state.error);
  const clearError = useRealtimeMatchStore((state) => state.clearError);
  const pendingLobbyHandoffCode = useRealtimeMatchStore((state) => state.pendingLobbyHandoffCode);
  const clearLobbyHandoff = useRealtimeMatchStore((state) => state.clearLobbyHandoff);
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
  const lobbyCommands = useLobbyCommandMachine();
  const {
    createLobby,
    joinByCode,
    leaveLobby,
    reset: resetLobbyCommand,
  } = lobbyCommands;

  const startedRef = useRef(false);
  const createdRef = useRef(false);
  const leavingRef = useRef(false);
  const inviteJoinCancelledRef = useRef(false);
  const terminalInviteJoinFailureRef = useRef(false);
  const prevOpponentIdRef = useRef<string | null>(null);
  const prevLobbyIdRef = useRef<string | null>(null);
  const initActionRef = useRef<string | null>(null);
  const startMatchTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  // visibilityRetryRef and related state removed — coalesced debounce in LobbySettings handles this
  const analyticsTrackedRef = useRef(false);
  const [settingsErrorVersion, setSettingsErrorVersion] = useState(0);
  const [isStartingMatch, setIsStartingMatch] = useState(false);
  const [handoffTimedOutCode, setHandoffTimedOutCode] = useState<string | null>(null);
  const [optimisticReady, setOptimisticReady] = useState<boolean | null>(null);
  const [inviteJoinFailureState, setInviteJoinFailure] = useState<{
    code: string;
    message: string;
  } | null>(null);

  const clearStartMatchTimeout = useCallback(() => {
    if (!startMatchTimeoutRef.current) return;
    clearTimeout(startMatchTimeoutRef.current);
    startMatchTimeoutRef.current = null;
  }, []);

  const isNewRoomRoute = roomCode.trim().toLowerCase() === "new";
  const shouldCreateLobby = isHost && isNewRoomRoute;
  const normalizedRoomCode = roomCode && !isNewRoomRoute ? normalizeFriendInviteCode(roomCode) : null;
  const inviteJoinFailure =
    inviteJoinFailureState?.code === normalizedRoomCode ? inviteJoinFailureState : null;
  const expectsInviteLobby = Boolean(normalizedRoomCode);
  const lobbyMatchesInvite = !expectsInviteLobby || lobby?.inviteCode?.toUpperCase() === normalizedRoomCode;
  const activeLobby = lobbyMatchesInvite ? lobby : null;
  const isActiveMatchHandoff =
    expectsInviteLobby &&
    (hasActiveMatch ||
      Boolean(draft) ||
      (sessionState?.state === "IN_ACTIVE_MATCH" && Boolean(sessionState.activeMatchId)));
  const isPreparingMatch = Boolean(isStartingMatch || activeLobby?.status === "active" || isActiveMatchHandoff);
  const isResolvingInvite = expectsInviteLobby && !activeLobby && !inviteJoinFailure && !isPreparingMatch;
  const lobbyCode = activeLobby?.inviteCode ?? (roomCode === "new" ? "" : normalizedRoomCode ?? roomCode);
  const members = activeLobby?.members ?? [];
  const me = members.find((member) => member.userId === selfUserId);
  const otherMembers = members.filter((member) => member.userId !== selfUserId);
  const opponent = otherMembers[0];

  const { data: h2hSummary } = useHeadToHead(
    me?.userId ?? selfUserId,
    otherMembers.length === 1 ? opponent?.userId : undefined
  );

  useEffect(() => {
    inviteJoinCancelledRef.current = false;
    terminalInviteJoinFailureRef.current = false;
  }, [normalizedRoomCode]);

  // 1. Reset local guards after leaving a lobby/match
  useEffect(() => {
    if (isResolvingInvite) return;
    if (isPreparingMatch) return;
    if (activeLobby || draft || hasActiveMatch) return;
    if (leavingRef.current) return;
    startedRef.current = false;
    createdRef.current = false;
    analyticsTrackedRef.current = false;
    initActionRef.current = null;
    resetLobbyCommand();
    clearStartMatchTimeout();
    const stopTimer = setTimeout(() => {
      setIsStartingMatch(false);
    }, 0);
    return () => clearTimeout(stopTimer);
  }, [clearStartMatchTimeout, activeLobby, draft, hasActiveMatch, isPreparingMatch, isResolvingInvite, resetLobbyCommand]);

  useEffect(() => {
    if (!normalizedRoomCode || pendingLobbyHandoffCode !== normalizedRoomCode) return;

    if (lobby?.inviteCode?.toUpperCase() === normalizedRoomCode) {
      clearLobbyHandoff();
      queueMicrotask(() => setHandoffTimedOutCode(null));
      return;
    }

    const timer = setTimeout(() => {
      setHandoffTimedOutCode(normalizedRoomCode);
    }, 2500);
    return () => clearTimeout(timer);
  }, [clearLobbyHandoff, lobby?.inviteCode, normalizedRoomCode, pendingLobbyHandoffCode]);

  // 2. Socket Initialization
  useEffect(() => {
    if (leavingRef.current) return;
    if (inviteJoinCancelledRef.current) return;
    if (terminalInviteJoinFailureRef.current) return;
    if (inviteJoinFailure) return;
    if (isPreparingMatch || isActiveMatchHandoff || hasActiveMatch || draft) return;
    if (createdRef.current) return;
    const targetCode = normalizedRoomCode;
    const currentCode = lobby?.inviteCode?.toUpperCase() ?? null;

    if (shouldCreateLobby) {
      if (initActionRef.current === "create") return;
      initActionRef.current = "create";
      createdRef.current = true;
      void createLobby({ mode: "friendly" }).then((result) => {
        if (!result || result.ok || leavingRef.current || inviteJoinCancelledRef.current) return;
        createdRef.current = false;
        initActionRef.current = null;
        toast.error(result.message);
      });
      logger.info("Socket emit lobby:create via command machine", { mode: "friendly" });
      return;
    }

    if (!roomCode || isNewRoomRoute) return;
    if (currentCode && currentCode === targetCode) return;
    if (
      targetCode &&
      pendingLobbyHandoffCode === targetCode &&
      handoffTimedOutCode !== targetCode
    ) {
      logger.info("Waiting for lobby handoff state before joining by code", {
        inviteCode: `${targetCode.slice(0, 2)}***`,
      });
      return;
    }

    const joinKey = `join:${targetCode ?? roomCode.toUpperCase()}`;
    if (initActionRef.current === joinKey) return;
    initActionRef.current = joinKey;
    createdRef.current = true;
    void joinByCode(roomCode).then((result) => {
      if (leavingRef.current || inviteJoinCancelledRef.current) return;
      if (!result || result.ok) return;
      const latestState = useRealtimeMatchStore.getState();
      const latestHasMatchHandoff =
        latestState.match !== null ||
        latestState.draft !== null ||
        (latestState.sessionState?.state === "IN_ACTIVE_MATCH" && Boolean(latestState.sessionState.activeMatchId));
      if (latestHasMatchHandoff) {
        logger.info("Ignoring invite join failure during match handoff", {
          inviteCode: targetCode ? `${targetCode.slice(0, 2)}***` : null,
          code: result.code,
          sessionState: latestState.sessionState?.state ?? null,
          activeMatchId: latestState.sessionState?.activeMatchId ?? null,
        });
        return;
      }
      terminalInviteJoinFailureRef.current = true;
      inviteJoinCancelledRef.current = true;
      setInviteJoinFailure({
        code: targetCode ?? roomCode.toUpperCase(),
        message: result.message,
      });
      toast.error(result.message);
    });
    logger.info("Socket emit lobby:join_by_code via command machine", {
      inviteCode: `${roomCode.slice(0, 2)}***`,
    });
  }, [
    createLobby,
    handoffTimedOutCode,
    hasActiveMatch,
    isActiveMatchHandoff,
    isNewRoomRoute,
    isPreparingMatch,
    inviteJoinFailure,
    joinByCode,
    lobby?.inviteCode,
    lobby,
    normalizedRoomCode,
    pendingLobbyHandoffCode,
    roomCode,
    shouldCreateLobby,
    draft,
  ]);

  // 2.5. Track lobby creation/join success when lobby is confirmed
  useEffect(() => {
    if (!activeLobby || analyticsTrackedRef.current) return;
    analyticsTrackedRef.current = true;

    if (shouldCreateLobby) {
      trackLobbyCreated("friendly");
    } else {
      trackLobbyJoined(activeLobby.lobbyId, activeLobby.inviteCode ?? roomCode);
    }
  }, [activeLobby, roomCode, shouldCreateLobby]);

  // 3. Navigation & Session Logic
  useEffect(() => {
    if (!activeLobby || startedRef.current) return;
    startedRef.current = true;
    // Derive questionCount from lobby settings, fallback to 10 if missing or invalid
    const settingsCount = (activeLobby.settings as unknown as Record<string, unknown>)?.questionCount;
    const derivedCount =
      typeof settingsCount === "number" && settingsCount > 0 ? settingsCount : 10;
    startSession({ mode: "quizball", matchType: "friendly", questionCount: derivedCount });
  }, [activeLobby, startSession]);

  // Explicitly notify the remaining player when an opponent leaves a waiting lobby.
  useEffect(() => {
    if (!activeLobby || leavingRef.current) {
      prevOpponentIdRef.current = null;
      prevLobbyIdRef.current = null;
      return;
    }

    // Reset opponent tracking when lobby identity changes
    const currentLobbyId = activeLobby.lobbyId;
    if (prevLobbyIdRef.current !== currentLobbyId) {
      prevOpponentIdRef.current = null;
      prevLobbyIdRef.current = currentLobbyId;
    }

    const prevOpponentId = prevOpponentIdRef.current;
    const currentOpponentId = opponent?.userId ?? null;

    if (
      activeLobby.status === "waiting" &&
      prevOpponentId &&
      !currentOpponentId
    ) {
      toast.info(t('friend.toastOpponentLeft'));
    }

    prevOpponentIdRef.current = currentOpponentId;
  }, [activeLobby, opponent?.userId, t]);

  useEffect(() => {
    if (!activeLobby) return;
    logger.info("Lobby state in UI", {
      lobbyId: activeLobby.lobbyId,
      inviteCode: activeLobby.inviteCode ?? null,
      selfUserId,
      isHost,
    });
  }, [activeLobby, selfUserId, isHost]);

  useEffect(() => {
    if (!draft && !hasActiveMatch) return;
    clearStartMatchTimeout();
    router.push("/game");
  }, [clearStartMatchTimeout, draft, hasActiveMatch, router]);

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
    const isInviteTransitionBusy = isResolvingInvite && error.code === "TRANSITION_IN_PROGRESS";
    const isMatchHandoffJoinError =
      isPreparingMatch &&
      (error.code === "ALREADY_IN_LOBBY" || error.code === "ACTIVE_MATCH");

    if (isMatchHandoffJoinError) {
      clearError();
      return;
    }
    if (isLobbySettingsError && !isInviteTransitionBusy) {
      timer = setTimeout(() => {
        setSettingsErrorVersion((current) => current + 1);
      }, 0);
    }
    clearStartMatchTimeout();
    const stopStartingTimer = setTimeout(() => {
      setIsStartingMatch(false);
    }, 0);
    if (!isTransientSettingsBusy && !isInviteTransitionBusy) {
      toast.error(error.message);
    }
    clearError();

    return () => {
      if (timer) {
        clearTimeout(timer);
      }
      clearTimeout(stopStartingTimer);
    };
  }, [clearError, clearStartMatchTimeout, error, isPreparingMatch, isResolvingInvite]);

  // 3. Actions
  const copyCode = async () => {
    if (!lobbyCode) return;
    const success = await copyToClipboard(lobbyCode);
    if (success) {
      try {
        trackFriendInviteSent('link_copy', activeLobby?.lobbyId);
      } catch (error) {
        logger.error('Analytics trackFriendInviteSent failed', error);
      }
      toast.success(t('friend.toastRoomCodeCopied'));
    }
  };

  const handleReadyToggle = () => {
    if (!me) return;
    const nextReady = !(optimisticReady ?? me.isReady);
    setOptimisticReady(nextReady);
    getSocket().emit("lobby:ready", { ready: nextReady });
    logger.info("Socket emit lobby:ready", { ready: nextReady });
  };

  const handleUpdateSettings = useCallback((updates: Partial<LobbySettingsState> & { isPublic?: boolean }) => {
    if (!activeLobby) return;

    const nextSettings = {
      ...activeLobby.settings,
      ...updates,
    };
    const emit = {
      lobbyId: activeLobby.lobbyId,
      gameMode: nextSettings.gameMode,
      friendlyRandom: nextSettings.friendlyRandom,
      friendlyCategoryAId: nextSettings.friendlyCategoryAId,
      friendlyCategoryBId: nextSettings.friendlyCategoryBId ?? null,
      ...(updates.isPublic !== undefined && { isPublic: updates.isPublic }),
    };

    const settingsUnchanged =
      emit.gameMode === activeLobby.settings.gameMode &&
      emit.friendlyRandom === activeLobby.settings.friendlyRandom &&
      emit.friendlyCategoryAId === activeLobby.settings.friendlyCategoryAId;

    const visibilityUnchanged =
      updates.isPublic === undefined || updates.isPublic === activeLobby.isPublic;

    if (settingsUnchanged && visibilityUnchanged) {
      return;
    }

    getSocket().emit("lobby:update_settings", emit);
    logger.info("Socket emit lobby:update_settings", emit);
  }, [activeLobby]);

  const handleStartMatch = () => {
    if (isStartingMatch) return;
    inviteJoinCancelledRef.current = true;
    terminalInviteJoinFailureRef.current = true;
    setIsStartingMatch(true);
    clearStartMatchTimeout();
    startMatchTimeoutRef.current = setTimeout(() => {
      setIsStartingMatch(false);
      toast.error(t('friend.toastMatchStartTooLong'));
    }, 12000);

    getSocket().emit("lobby:start");
    logger.info("Socket emit lobby:start", {
      lobbyId: activeLobby?.lobbyId ?? null,
    });
  };

  const handleLeaveLobby = () => {
    leavingRef.current = true;
    inviteJoinCancelledRef.current = true;
    createdRef.current = true;
    startedRef.current = true;
    initActionRef.current = null;
    clearStartMatchTimeout();
    setIsStartingMatch(false);
    void leaveLobby().then((result) => {
      if (!result) return;
      if (!result.ok) {
        leavingRef.current = false;
        toast.error(result.message);
        return;
      }
      logger.info("Socket ack lobby:leave", {
        lobbyId: result.lobbyId,
        closed: result.closed,
        correlationId: result.correlationId,
      });
      // Leave room route after server ack so URL-driven rejoin cannot race the backend removal.
      router.replace("/play");
      useRankedMatchmakingStore.getState().clearRankedMatchmaking();
      useRealtimeMatchStore.getState().reset();
      resetLobbyCommand();
      leavingRef.current = false;
    });
    logger.info("Socket emit lobby:leave via command machine");
  };

  const handleInviteRetry = () => {
    if (!normalizedRoomCode) return;
    inviteJoinCancelledRef.current = false;
    terminalInviteJoinFailureRef.current = false;
    createdRef.current = false;
    initActionRef.current = null;
    setInviteJoinFailure(null);
    resetLobbyCommand();
  };

  const handleInviteBack = () => {
    inviteJoinCancelledRef.current = true;
    terminalInviteJoinFailureRef.current = true;
    createdRef.current = true;
    initActionRef.current = null;
    setInviteJoinFailure(null);
    resetLobbyCommand();
    router.replace("/play/friend?tab=create");
  };

  useEffect(() => {
    return () => {
      clearStartMatchTimeout();
    };
  }, [clearStartMatchTimeout]);

  const derivedOptimisticReady = optimisticReady !== null && me?.isReady !== optimisticReady
    ? optimisticReady
    : null;

  return {
    lobby: activeLobby,
    members,
    lobbyCode,
    isResolvingInvite,
    isPreparingMatch,
    inviteJoinFailure,
    targetInviteCode: normalizedRoomCode,
    me,
    opponent,
    h2hSummary: opponent ? h2hSummary ?? null : null,
    allCategories,
    settingsErrorVersion,
    isStartingMatch,
    isLeaving: lobbyCommands.isLeaving,
    optimisticReady: derivedOptimisticReady,
    actions: {
      copyCode,
      handleReadyToggle,
      handleUpdateSettings,
      handleStartMatch,
      handleLeaveLobby,
      handleInviteRetry,
      handleInviteBack,
    },
  };
}
