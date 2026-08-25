import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { useLocale } from "@/contexts/LocaleContext";
import type { MessageKey } from "@/lib/i18n/messages";
import { useRealtimeConnection } from "@/lib/realtime/useRealtimeConnection";
import { getSocket } from "@/lib/realtime/socket-client";
import { useRealtimeMatchStore } from "@/stores/realtimeMatch.store";
import { useAuctionActiveMatchStore } from "@/stores/auctionActiveMatch.store";
import { useFootballGridStore } from "@/stores/footballGrid.store";
import { useRankedMatchmakingStore } from "@/stores/rankedMatchmaking.store";
import { usePlayer } from "@/contexts/PlayerContext";
import { useAuthStore } from "@/stores/auth.store";
import { useGameSessionStore } from "@/stores/gameSession.store";
import { logger } from "@/utils/logger";
import type { LobbySettings as LobbySettingsState } from "@/lib/realtime/socket.types";
import { useCategoriesList } from "@/lib/queries/categories.queries";
import { copyToClipboard } from "@/utils/clipboard";
import {
  trackFriendInviteJoinAttempted,
  trackFriendInviteJoinFailed,
  trackFriendInviteJoinSucceeded,
  trackFriendInviteLinkOpened,
  trackFriendInviteSent,
  trackLobbyCreated,
  trackLobbyJoined,
} from "@/lib/analytics/game-events";
import { useHeadToHead } from "@/lib/queries/stats.queries";
import { normalizeFriendInviteCode } from "@/lib/friend/inviteCode";
import { useLobbyCommandMachine } from "./useLobbyCommandMachine";

interface UseFriendLobbyLogicProps {
  roomCode: string;
  isHost: boolean;
  inviteSource?: FriendLobbyInviteSource;
}

export type FriendLobbyInviteSource =
  | "shared_link"
  | "manual_code"
  | "public_lobby"
  | "challenge"
  | "rematch"
  | "create"
  | "current_lobby";

export function parseFriendLobbyInviteSource(value: string | null): FriendLobbyInviteSource {
  if (
    value === "manual_code" ||
    value === "public_lobby" ||
    value === "challenge" ||
    value === "rematch" ||
    value === "create" ||
    value === "current_lobby"
  ) {
    return value;
  }
  return "shared_link";
}

/**
 * Lobby error codes we render our own localized copy for. Everything else falls
 * through to the server's (English) message.
 */
const LOBBY_ERROR_COPY_KEYS: Record<string, MessageKey> = {
  LOBBY_MODE_CAPACITY: "friend.errorModeCapacity",
  MEMBER_BUSY: "friend.errorMemberBusy",
};

const INVITE_STATE_CONFIRMATION_TIMEOUT_MS = 4_000;
const INVITE_STATE_CONFIRMATION_MAX_RETRIES = 2;

// Friendly lobbies have a fixed length — the backend LobbySettings has no
// questionCount field, so this is the single source of truth client-side.
const FRIENDLY_QUESTION_COUNT = 10;

interface InviteJoinFailure {
  inviteCode: string;
  reasonCode: string;
  message: string;
  retryable: boolean;
}

interface AwaitingInviteLobbyState {
  inviteCode: string;
  correlationId: string;
  retryCount: number;
}

export function useFriendLobbyLogic({
  roomCode,
  isHost,
  inviteSource = "shared_link",
}: UseFriendLobbyLogicProps) {
  const router = useRouter();
  const { t } = useLocale();
  const { player } = usePlayer();
  const authUser = useAuthStore((state) => state.user);
  const selfUserId = authUser?.id ?? player.id;
  const realtimeSelfUserId = authUser?.id ?? null;

  // Stores
  const lobby = useRealtimeMatchStore((state) => state.lobby);
  const draft = useRealtimeMatchStore((state) => state.draft);
  const hasActiveMatch = useRealtimeMatchStore((s) => s.match != null);
  const sessionState = useRealtimeMatchStore((state) => state.sessionState);
  const error = useRealtimeMatchStore((state) => state.error);
  const clearError = useRealtimeMatchStore((state) => state.clearError);
  const pendingLobbyHandoffCode = useRealtimeMatchStore((state) => state.pendingLobbyHandoffCode);
  const clearLobbyHandoff = useRealtimeMatchStore((state) => state.clearLobbyHandoff);
  // Auction lobbies hand off to `/auction`, not `/game`. The app-wide socket
  // handlers write the server's `auction:state` snapshot into this store, so it
  // flips as soon as the host's `lobby:start` creates the auction match.
  const activeAuctionMatchId = useAuctionActiveMatchStore(
    (state) => state.activeAuctionMatch?.matchId ?? null
  );
  const activeFootballGridMatchId = useFootballGridStore(
    (state) => state.state && state.state.phase !== 'terminal' ? state.state.matchId : null
  );
  const startSession = useGameSessionStore((state) => state.startSession);

  // Queries
  const { data: categoriesData } = useCategoriesList({
    limit: 100,
    is_active: "true",
    min_questions: 5,
  });
  const allCategories = categoriesData?.items ?? [];

  // Connection
  useRealtimeConnection({ enabled: Boolean(realtimeSelfUserId), selfUserId: realtimeSelfUserId });
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
  const inviteOpenedTrackedRef = useRef<string | null>(null);
  const inviteJoinAttemptRef = useRef(0);
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
  const [inviteJoinFailureState, setInviteJoinFailure] = useState<InviteJoinFailure | null>(null);
  const [awaitingInviteLobby, setAwaitingInviteLobby] = useState<AwaitingInviteLobbyState | null>(null);

  const clearStartMatchTimeout = useCallback(() => {
    if (!startMatchTimeoutRef.current) return;
    clearTimeout(startMatchTimeoutRef.current);
    startMatchTimeoutRef.current = null;
  }, []);

  const isNewRoomRoute = roomCode.trim().toLowerCase() === "new";
  const shouldCreateLobby = isHost && isNewRoomRoute;
  const normalizedRoomCode = roomCode && !isNewRoomRoute ? normalizeFriendInviteCode(roomCode) : null;
  const inviteJoinFailure =
    inviteJoinFailureState?.inviteCode === normalizedRoomCode ? inviteJoinFailureState : null;
  const expectsInviteLobby = Boolean(normalizedRoomCode);
  const shouldTrackSharedInvite = expectsInviteLobby && inviteSource === "shared_link";
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
    createdRef.current = false;
    leavingRef.current = false;
    initActionRef.current = null;
    analyticsTrackedRef.current = false;
    inviteJoinCancelledRef.current = false;
    terminalInviteJoinFailureRef.current = false;
    inviteJoinAttemptRef.current = 0;
  }, [normalizedRoomCode]);

  useEffect(() => {
    if (
      !shouldTrackSharedInvite ||
      !normalizedRoomCode ||
      inviteOpenedTrackedRef.current === normalizedRoomCode
    ) return;
    inviteOpenedTrackedRef.current = normalizedRoomCode;
    trackFriendInviteLinkOpened();
  }, [normalizedRoomCode, shouldTrackSharedInvite]);

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
    inviteJoinAttemptRef.current += 1;
    if (shouldTrackSharedInvite) {
      trackFriendInviteJoinAttempted({
        attemptNumber: inviteJoinAttemptRef.current,
      });
    }
    void joinByCode(roomCode).then((result) => {
      if (leavingRef.current || inviteJoinCancelledRef.current) return;
      if (!result) return;
      if (result.ok) {
        setAwaitingInviteLobby((current) => ({
          inviteCode: targetCode ?? result.inviteCode,
          correlationId: result.correlationId,
          retryCount: current?.inviteCode === targetCode ? current.retryCount : 0,
        }));
        return;
      }
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
      setAwaitingInviteLobby(null);
      if (shouldTrackSharedInvite) {
        trackFriendInviteJoinFailed({
          failureCode: result.code,
          retryable: result.retryable,
          correlationId: result.correlationId,
          attemptNumber: inviteJoinAttemptRef.current,
        });
      }
      const message =
        result.code === "LOBBY_NOT_FOUND"
          ? t("friend.inviteExpiredReason")
          : result.message;
      setInviteJoinFailure({
        inviteCode: targetCode ?? roomCode.toUpperCase(),
        reasonCode: result.code,
        message,
        retryable: result.retryable,
      });
      toast.error(message);
    });
    logger.info("Socket emit lobby:join_by_code via command machine", {
      inviteCode: `${roomCode.slice(0, 2)}***`,
    });
  }, [
    awaitingInviteLobby?.retryCount,
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
    shouldTrackSharedInvite,
    t,
    draft,
  ]);

  useEffect(() => {
    if (
      !awaitingInviteLobby ||
      awaitingInviteLobby.inviteCode !== normalizedRoomCode ||
      activeLobby ||
      isPreparingMatch
    ) return;

    const timer = setTimeout(() => {
      const latestState = useRealtimeMatchStore.getState();
      const confirmedCode = latestState.lobby?.inviteCode?.toUpperCase() ?? null;
      if (confirmedCode === awaitingInviteLobby.inviteCode) return;
      if (latestState.match || latestState.draft) return;

      const nextRetryCount = awaitingInviteLobby.retryCount + 1;
      if (nextRetryCount <= INVITE_STATE_CONFIRMATION_MAX_RETRIES) {
        logger.warn("Invite join ack was not followed by lobby state; retrying", {
          correlationId: awaitingInviteLobby.correlationId,
          retryCount: nextRetryCount,
        });
        setAwaitingInviteLobby({ ...awaitingInviteLobby, retryCount: nextRetryCount });
        createdRef.current = false;
        initActionRef.current = null;
        resetLobbyCommand();
        return;
      }

      terminalInviteJoinFailureRef.current = true;
      inviteJoinCancelledRef.current = true;
      const message = t("friend.inviteStateTimeoutReason");
      if (shouldTrackSharedInvite) {
        trackFriendInviteJoinFailed({
          failureCode: "LOBBY_STATE_TIMEOUT",
          retryable: true,
          correlationId: awaitingInviteLobby.correlationId,
          attemptNumber: inviteJoinAttemptRef.current,
          stateConfirmationTimedOut: true,
        });
      }
      setInviteJoinFailure({
        inviteCode: awaitingInviteLobby.inviteCode,
        reasonCode: "LOBBY_STATE_TIMEOUT",
        message,
        retryable: true,
      });
      setAwaitingInviteLobby(null);
      toast.error(message);
    }, INVITE_STATE_CONFIRMATION_TIMEOUT_MS);

    return () => clearTimeout(timer);
  }, [activeLobby, awaitingInviteLobby, isPreparingMatch, normalizedRoomCode, resetLobbyCommand, shouldTrackSharedInvite, t]);

  useEffect(() => {
    if (!activeLobby || shouldCreateLobby) return;
    terminalInviteJoinFailureRef.current = false;
    inviteJoinCancelledRef.current = false;
    queueMicrotask(() => {
      setInviteJoinFailure(null);
      setAwaitingInviteLobby(null);
    });
  }, [activeLobby, shouldCreateLobby]);

  // 2.5. Track lobby creation/join success when lobby is confirmed
  useEffect(() => {
    if (!activeLobby || analyticsTrackedRef.current) return;
    analyticsTrackedRef.current = true;

    if (shouldCreateLobby) {
      trackLobbyCreated("friendly");
    } else {
      trackLobbyJoined(activeLobby.lobbyId, activeLobby.inviteCode ?? roomCode);
      if (shouldTrackSharedInvite && inviteJoinAttemptRef.current > 0) {
        trackFriendInviteJoinSucceeded({
          lobbyId: activeLobby.lobbyId,
          attemptNumber: inviteJoinAttemptRef.current,
        });
      }
    }
  }, [activeLobby, roomCode, shouldCreateLobby, shouldTrackSharedInvite]);

  // 3. Navigation & Session Logic
  useEffect(() => {
    if (!activeLobby || startedRef.current) return;
    startedRef.current = true;
    startSession({ mode: "quizball", matchType: "friendly", questionCount: FRIENDLY_QUESTION_COUNT });
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

  // Auction hand-off. Only an auction-mode lobby routes here, and only once the
  // host has actually started it — otherwise a leftover auction banner from an
  // earlier match would yank a waiting lobby onto `/auction`. `/auction` picks
  // the match up through its own rejoin-on-connect handshake.
  const isAuctionLobby = activeLobby?.settings.gameMode === "auction";
  const isFootballGridLobby = activeLobby?.settings.gameMode === "football_grid";
  // Hand-off bookkeeping, all read/written inside effects (never during render):
  // - wasAuctionLobby: the snapshot can be cleared out from under us
  //   (session:state IN_ACTIVE_MATCH empties it once the match starts, esp. for
  //   non-hosts), so remember the lobby's auction-ness.
  // - staleAuctionMatchId: any descriptor observed while the lobby is still
  //   WAITING belongs to some earlier match. Only a DIFFERENT id (or the server
  //   flipping the lobby active while it's present) proves the started match.
  const wasAuctionLobbyRef = useRef(false);
  const staleAuctionMatchIdRef = useRef<string | null>(null);
  useEffect(() => {
    // Fresh room → fresh baselines.
    wasAuctionLobbyRef.current = false;
    staleAuctionMatchIdRef.current = null;
  }, [roomCode]);
  useEffect(() => {
    if (!activeLobby) return;
    wasAuctionLobbyRef.current = activeLobby.settings.gameMode === "auction";
    if (activeLobby.status === "waiting" && !isStartingMatch) {
      staleAuctionMatchIdRef.current = activeAuctionMatchId;
    }
  }, [activeAuctionMatchId, activeLobby, isStartingMatch]);

  useEffect(() => {
    if (!activeAuctionMatchId) return;
    const isFreshMatch = activeAuctionMatchId !== staleAuctionMatchIdRef.current;
    const ready = activeLobby
      ? activeLobby.settings.gameMode === "auction" &&
        (activeLobby.status === "active" || (isStartingMatch && isFreshMatch))
      : wasAuctionLobbyRef.current && isFreshMatch;
    if (!ready) return;
    clearStartMatchTimeout();
    logger.info("Auction lobby match started, navigating to /auction", {
      lobbyId: activeLobby?.lobbyId ?? null,
      matchId: activeAuctionMatchId,
    });
    router.push("/auction");
  }, [activeAuctionMatchId, activeLobby, clearStartMatchTimeout, isStartingMatch, router]);

  const footballGridHandoffReady =
    isFootballGridLobby &&
    Boolean(activeFootballGridMatchId) &&
    (isStartingMatch || activeLobby?.status === "active");

  useEffect(() => {
    if (!footballGridHandoffReady) return;
    clearStartMatchTimeout();
    logger.info("Football Grid lobby match started, navigating to live grid", {
      lobbyId: activeLobby?.lobbyId ?? null,
      matchId: activeFootballGridMatchId,
    });
    router.push("/tic-tac-toe?source=friend_lobby");
  }, [activeFootballGridMatchId, activeLobby?.lobbyId, clearStartMatchTimeout, footballGridHandoffReady, router]);

  useEffect(() => {
    if (!draft && !hasActiveMatch) return;
    // An auction lobby never hands off through the possession `/game` route.
    if (isAuctionLobby || isFootballGridLobby) return;
    clearStartMatchTimeout();
    router.push("/game");
  }, [clearStartMatchTimeout, draft, hasActiveMatch, isAuctionLobby, isFootballGridLobby, router]);

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
      error.code === "TRANSITION_IN_PROGRESS" ||
      // Rejected mode switch (too many members for the target mode) — rolls the
      // optimistic tab back to whatever the server still holds.
      error.code === "LOBBY_MODE_CAPACITY";
    const isTransientSettingsBusy = error.code === "LOBBY_SETTINGS_LOCKED";
    const isInviteTransitionBusy = isResolvingInvite && error.code === "TRANSITION_IN_PROGRESS";
    const isInviteNotFound =
      error.code === "LOBBY_NOT_FOUND" &&
      (isResolvingInvite || inviteJoinFailure?.reasonCode === "LOBBY_NOT_FOUND");
    const isMatchHandoffJoinError =
      isPreparingMatch &&
      (error.code === "ALREADY_IN_LOBBY" || error.code === "ACTIVE_MATCH");

    if (isMatchHandoffJoinError) {
      clearError();
      return;
    }
    if (isLobbySettingsError && !isInviteTransitionBusy && !isInviteNotFound) {
      timer = setTimeout(() => {
        setSettingsErrorVersion((current) => current + 1);
      }, 0);
    }
    clearStartMatchTimeout();
    const stopStartingTimer = setTimeout(() => {
      setIsStartingMatch(false);
    }, 0);
    if (!isTransientSettingsBusy && !isInviteTransitionBusy && !isInviteNotFound) {
      // Server messages are raw English. Codes we have localized copy for get it;
      // anything else still surfaces the server's own message rather than nothing.
      const localizedKey = LOBBY_ERROR_COPY_KEYS[error.code];
      toast.error(localizedKey ? t(localizedKey) : error.message);
    }
    clearError();

    return () => {
      if (timer) {
        clearTimeout(timer);
      }
      clearTimeout(stopStartingTimer);
    };
  }, [clearError, clearStartMatchTimeout, error, inviteJoinFailure, isPreparingMatch, isResolvingInvite, t]);

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
      emit.friendlyCategoryAId === activeLobby.settings.friendlyCategoryAId &&
      emit.friendlyCategoryBId === (activeLobby.settings.friendlyCategoryBId ?? null);

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
    useFootballGridStore.getState().clear();
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
    setAwaitingInviteLobby(null);
    resetLobbyCommand();
  };

  const handleInviteBack = () => {
    inviteJoinCancelledRef.current = true;
    terminalInviteJoinFailureRef.current = true;
    createdRef.current = true;
    initActionRef.current = null;
    setInviteJoinFailure(null);
    setAwaitingInviteLobby(null);
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
    isAuctionLobby,
    isFootballGridLobby,
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
