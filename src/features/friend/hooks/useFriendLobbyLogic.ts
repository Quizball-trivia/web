import { useGuestPrincipalStore, useRealtimePrincipal } from '@/lib/realtime/realtime-principal';
import { useAuthPromptStore } from '@/stores/authPrompt.store';
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { useLocale } from "@/contexts/LocaleContext";
import type { MessageKey } from "@/lib/i18n/messages";
import { useRealtimeConnection } from "@/lib/realtime/useRealtimeConnection";
import { getSocket } from "@/lib/realtime/socket-client";
import { useRealtimeMatchStore } from "@/stores/realtimeMatch.store";
import { useAuctionActiveMatchStore } from "@/stores/auctionActiveMatch.store";
import { useFootballGridStore } from "@/stores/footballGrid.store";
import { useFriendDuelHandoffStore } from "@/stores/friendDuelHandoff.store";
import { roomReceiptMark, useFriendRoomHandoffStore } from "@/stores/friendRoomHandoff.store";
import { ROOM_GAMES_ENABLED } from "@/lib/config";
import { useRankedMatchmakingStore } from "@/stores/rankedMatchmaking.store";
import { usePlayer } from "@/contexts/PlayerContext";
import { useAuthStore } from "@/stores/auth.store";
import { useGameSessionStore } from "@/stores/gameSession.store";
import { logger } from "@/utils/logger";
import type { DuelGameId, LobbyJoinRoomInfo, LobbySettings as LobbySettingsState, RoomGameId } from "@/lib/realtime/socket.types";
import { buildFriendInvitePath, rememberPostAuthRedirect } from "@/lib/auth/postAuthRedirect";
import { useCategoriesList } from "@/lib/queries/categories.queries";
import { copyToClipboard } from "@/utils/clipboard";
import {
  trackFriendInviteJoinAttempted,
  trackFriendInviteJoinFailed,
  trackFriendInviteJoinSucceeded,
  trackFriendInviteLinkOpened,
  trackFriendInviteRecovery,
  trackFriendInviteSent,
  trackLobbyCreated,
  trackLobbyJoined,
} from "@/lib/analytics/game-events";
import { useHeadToHead } from "@/lib/queries/stats.queries";
import { normalizeFriendInviteCode } from "@/lib/friend/inviteCode";
import { useLobbyCommandMachine } from "./useLobbyCommandMachine";
import { inviteFailureKind } from "../components/InviteFailureScreen";

interface UseFriendLobbyLogicProps {
  roomCode: string;
  isHost: boolean;
  inviteSource?: FriendLobbyInviteSource;
  /** `/friend/room/new?duel=<game>`: the new room opens as a duel of that game. */
  newRoomDuelGame?: DuelGameId | null;
  /** `/friend/room/new?room=<game>`: the new room opens as that 2–6 player room game. */
  newRoomRoomGame?: RoomGameId | null;
  /** `/friend/room/new?game=auction|football_grid`: the new room opens in that game. */
  newRoomGameMode?: "auction" | "football_grid" | null;
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
  LOBBY_GUEST_LIMIT: "friend.errorGuestLimit",
  LOBBY_FULL: "friend.inviteFullTitle",
  LOBBY_MODE_REQUIRES_ACCOUNT: "friend.errorModeRequiresAccount",
  RATE_LIMITED: "friend.errorRateLimited",
  CAPABILITY_REQUIRED: "friend.errorCapabilityRequired",
  DUEL_UNAVAILABLE: "friend.errorDuelUnavailable",
  ROOM_GAME_UNAVAILABLE: "friend.errorRoomGameUnavailable",
};

/**
 * A duel:found this recent may still be the one the room is about to show as active (the
 * found can beat the room's lobby:state). Older ones for a waiting room are finished duels.
 */
const DUEL_HANDOFF_FRESH_MS = 5_000;
/** The room screen asks the server again this often while its "where do I stand" question has no answer. */
const ROOM_POINTER_RETRY_MS = 3_000;
const ROOM_POINTER_TRIES = 5;
/** How long a "not found" invite join waits for the player's own (active) room behind that code before failing. */
const OWN_ROOM_WAIT_MS = 2_500;

/**
 * The server's own echoes of a failed invite join (it also answers the join itself, which this screen reports): its
 * refusal errors name the invite code, and "blocked" with INVALID_INVITE / LOBBY_NOT_FOUND only comes from joins.
 * Other room errors (settings, start on a vanished room) carry neither and keep their toast and rollback.
 */
function isJoinEcho(error: { code: string; meta?: unknown }, inviteCode: string | null): boolean {
  const meta = (error.meta ?? {}) as { inviteCode?: string; source?: string; reason?: string };
  // Join refusals (not found, full, account-only, guest limit) name the invite code; other room errors never do.
  if (typeof meta.inviteCode === "string") return meta.inviteCode.toUpperCase() === inviteCode;
  return meta.source === "session:blocked" && (meta.reason === "INVALID_INVITE" || meta.reason === "LOBBY_NOT_FOUND");
}

const INVITE_STATE_CONFIRMATION_TIMEOUT_MS = 4_000;
const INVITE_STATE_CONFIRMATION_MAX_RETRIES = 2;

// Friendly lobbies have a fixed length — the backend LobbySettings has no
// questionCount field, so this is the single source of truth client-side.
const FRIENDLY_QUESTION_COUNT = 10;

/** Copy for a failed invite join, by code: our own text for every code, never the server's English. */
function inviteFailureKey(code: string): MessageKey {
  if (code === "LOBBY_NOT_FOUND") return "friend.inviteExpiredReason";
  if (code === "LOBBY_STATE_TIMEOUT") return "friend.inviteStateTimeoutReason";
  return LOBBY_ERROR_COPY_KEYS[code] ?? "friend.toastJoinFailed";
}

interface InviteJoinFailure {
  inviteCode: string;
  reasonCode: string;
  /** Translated when shown (the language can change while the screen is up). */
  messageKey: MessageKey;
  retryable: boolean;
  /** What the server says about the room behind the code (absent on older servers). */
  room: LobbyJoinRoomInfo | null;
}

/** "Start a new room" after a refused invite: a new room in the same game where that game can be opened directly. */
export function newRoomPathFor(room: LobbyJoinRoomInfo | null): string {
  if (room?.gameMode === "auction" || room?.gameMode === "football_grid") return `/friend/room/new?game=${room.gameMode}`;
  if (room?.gameMode === "duel" && room.duelGame) return `/friend/room/new?duel=${room.duelGame}`;
  if (room?.gameMode === "room_game") return "/friend/room/new?room=aproximado";
  return "/friend/room/new";
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
  newRoomDuelGame = null,
  newRoomRoomGame = null,
  newRoomGameMode = null,
}: UseFriendLobbyLogicProps) {
  const router = useRouter();
  const { t } = useLocale();
  // Socket replies land in callbacks created earlier: they read the current translator through this.
  const tRef = useRef(t);
  // The invite join's "is it my own room?" wait; replies and waits do nothing once this screen is gone.
  const ownRoomWaitRef = useRef<number | null>(null);
  const mountedRef = useRef(false);
  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);
  useLayoutEffect(() => {
    tRef.current = t;
  }, [t]);
  const { player } = usePlayer();
  const principal = useRealtimePrincipal();
  const selfUserId = principal.userId ?? player.id;
  const realtimeSelfUserId = principal.userId;

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
  useRealtimeConnection({ enabled: principal.kind !== 'none', selfUserId: realtimeSelfUserId });
  // Who this screen joins as. A guest who signs up on this page becomes a member: earlier replies (and a failure shown
  // to the guest, e.g. "needs an account") are dropped and the join runs again as the member.
  const principalKey = `${principal.kind}:${principal.userId ?? ''}`;
  const principalKeyRef = useRef(principalKey);
  // Layout effect: runs before the join effect in the same commit, so a join is always sent as the current identity.
  useLayoutEffect(() => {
    principalKeyRef.current = principalKey;
  }, [principalKey]);
  const switchSeenRef = useRef(principalKey);
  const autoRetriedRef = useRef<string | null>(null);
  const inviteRetryRef = useRef<() => void>(() => {});
  // Bumped by a retry: re-runs the join even when nothing else it depends on changed (no failure was shown yet).
  const [joinRetryNonce, setJoinRetryNonce] = useState(0);
  // An anonymous visitor whose guest principal was refused (feature off,
  // session retired, rate-limited) cannot use the room: offer sign-up once.
  const authStatus = useAuthStore((state) => state.status);
  const guestStatus = useGuestPrincipalStore((state) => state.status);
  const openAuthPrompt = useAuthPromptStore((state) => state.open);
  const refusalPromptedRef = useRef(false);
  useEffect(() => {
    if (authStatus !== 'anonymous' || guestStatus !== 'refused' || refusalPromptedRef.current) return;
    refusalPromptedRef.current = true;
    // After sign-up, come back to this invite (not the default /play).
    if (roomCode.trim().toLowerCase() !== 'new') rememberPostAuthRedirect(buildFriendInvitePath(roomCode));
    openAuthPrompt();
  }, [authStatus, guestStatus, openAuthPrompt, roomCode]);
  const lobbyCommands = useLobbyCommandMachine();
  const {
    createLobby,
    joinByCode,
    leaveLobby,
    reset: resetLobbyCommand,
  } = lobbyCommands;

  const startedRef = useRef(false);
  const createdRef = useRef(false);
  const createInFlightRef = useRef(false);
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
  // Bridges the lobby:ready round trip only; tagged with the room so it never
  // leaks into another lobby. Cleared (during render, per React's derived-state
  // pattern) once the server agrees or the room changes.
  const [optimisticReadyState, setOptimisticReadyState] = useState<{ value: boolean; lobbyId: string } | null>(null);
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
  const activeInviteCodeRef = useRef(normalizedRoomCode);
  useLayoutEffect(() => {
    activeInviteCodeRef.current = normalizedRoomCode;
  }, [normalizedRoomCode]);
  // A pending own-room wait never outlives this screen or its invite code.
  useEffect(() => () => {
    if (ownRoomWaitRef.current !== null) window.clearTimeout(ownRoomWaitRef.current);
    ownRoomWaitRef.current = null;
  }, [normalizedRoomCode]);
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
  // Back in the room while its room game runs without this player (left it, or left out at the gate): the room
  // shows (and can be left), never the "preparing match" hand-off.
  const roomSittingOut = useFriendRoomHandoffStore((state) => state.sittingOut);
  // The server's latest answer to this screen's "where do I stand" said: no live seat. A room still shown as active is
  // then either sat out or a match whose end was missed — either way the room (and its Leave) shows, not a spinner;
  // the room's next state corrects it.
  const roomAnswers = useFriendRoomHandoffStore((state) => state.answers);
  const roomAnswerLive = useFriendRoomHandoffStore((state) => state.lastAnswerLive);
  const [roomAskMark, setRoomAskMark] = useState<{ key: string; answers: number } | null>(null);
  const roomNoSeat = Boolean(
    activeLobby && roomAskMark?.key === `${activeLobby.lobbyId}:${activeLobby.status}` && roomAnswers > roomAskMark.answers && !roomAnswerLive,
  );
  const isSittingOutRoomGame = Boolean(
    activeLobby?.status === "active" && activeLobby.settings.gameMode === "room_game"
      && (roomSittingOut?.lobbyId === activeLobby.lobbyId || roomNoSeat),
  );
  const isPreparingMatch = Boolean(isStartingMatch || (activeLobby?.status === "active" && !isSittingOutRoomGame) || isActiveMatchHandoff);
  const isResolvingInvite = expectsInviteLobby && !activeLobby && !inviteJoinFailure && !isPreparingMatch;
  const lobbyCode = activeLobby?.inviteCode ?? (roomCode === "new" ? "" : normalizedRoomCode ?? roomCode);
  const members = activeLobby?.members ?? [];
  const me = members.find((member) => member.userId === selfUserId);
  const optimisticReady =
    optimisticReadyState !== null && optimisticReadyState.lobbyId === activeLobby?.lobbyId ? optimisticReadyState.value : null;
  if (optimisticReadyState !== null && (optimisticReady === null || me?.isReady === optimisticReady)) {
    // Server agreed (or the room changed): a later server-side reset (failed
    // start, party transition) must show instead of a stale "ready".
    setOptimisticReadyState(null);
  }
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
    // A room being created has no lobby yet: resetting now (a re-run of this effect, StrictMode) would create a second.
    if (createInFlightRef.current) return;
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
    // No lobby command before the identity exists: the ACK timeout must not start while the guest principal is still resolving.
    if (principal.kind === 'none') return;
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
      createInFlightRef.current = true;
      void createLobby(
        newRoomDuelGame
          ? { mode: "friendly", isPublic: false, gameMode: "duel", duelGame: newRoomDuelGame }
          : newRoomRoomGame
            ? { mode: "friendly", isPublic: false, gameMode: "room_game", roomGame: newRoomRoomGame }
            : newRoomGameMode
              ? { mode: "friendly", isPublic: false, gameMode: newRoomGameMode }
              : { mode: "friendly" },
      ).then((result) => {
        // null = skipped as a duplicate of the create still in flight: that one clears the flag when it answers.
        if (result) createInFlightRef.current = false;
        // Left the page before the answer (e.g. its 10 s deadline): no toast on another screen.
        if (!mountedRef.current) return;
        if (!result || result.ok || leavingRef.current || inviteJoinCancelledRef.current) return;
        createdRef.current = false;
        initActionRef.current = null;
        toast.error(tRef.current(LOBBY_ERROR_COPY_KEYS[result.code] ?? "friend.toastCreateFailed"));
      });
      logger.info("Socket emit lobby:create via command machine", { mode: "friendly", duelGame: newRoomDuelGame, roomGame: newRoomRoomGame });
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
    const attempt = inviteJoinAttemptRef.current;
    const identity = principalKeyRef.current;
    void joinByCode(roomCode).then((result) => {
      if (!mountedRef.current) return;
      // Sent as the previous identity (the guest who then signed up): the new account joins on its own.
      if (identity !== principalKeyRef.current) return;
      if (activeInviteCodeRef.current !== targetCode) return;
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
      const room = ("room" in result ? result.room : undefined) ?? null;
      // The room became open between the server's two lookups (its game just returned to it): try once more.
      if (result.code === "LOBBY_NOT_FOUND" && room?.roomState === "open" && autoRetriedRef.current !== targetCode) {
        autoRetriedRef.current = targetCode;
        inviteRetryRef.current();
        return;
      }
      const fail = () => {
        terminalInviteJoinFailureRef.current = true;
        inviteJoinCancelledRef.current = true;
        setAwaitingInviteLobby(null);
        if (shouldTrackSharedInvite) {
          trackFriendInviteJoinFailed({
            failureCode: result.code,
            retryable: result.retryable,
            correlationId: result.correlationId,
            attemptNumber: inviteJoinAttemptRef.current,
            roomState: room?.roomState ?? null,
            principalKind: principal.kind,
          });
        }
        const messageKey = inviteFailureKey(result.code);
        setInviteJoinFailure({
          inviteCode: targetCode ?? roomCode.toUpperCase(),
          reasonCode: result.code,
          messageKey,
          retryable: result.retryable,
          room,
        });
        // The full-page screen explains the known reasons; only an unexplained failure also toasts. The reply can
        // arrive after a language switch: translate with the current language, not the one at send time.
        if (inviteFailureKind({ reasonCode: result.code, room }) === "failed") toast.error(tRef.current(messageKey));
      };
      // Reopening the invite of your own room while its match runs: the join only finds waiting rooms, so it says
      // "not found" — but the player still has that room (the server's snapshot lists it as open). Wait briefly for
      // its state: when it is this code's room, the room screen hands off to the match and no failure is shown.
      const isOwnRoom = () => useRealtimeMatchStore.getState().lobby?.inviteCode?.toUpperCase() === targetCode;
      if (result.code === "LOBBY_NOT_FOUND" && (isOwnRoom() || ("stateSnapshot" in result && (result.stateSnapshot?.openLobbyIds.length ?? 0) > 0))) {
        const startedAt = Date.now();
        const check = () => {
          ownRoomWaitRef.current = null;
          // A newer attempt, another code, leaving, or this screen gone: this wait no longer speaks for anything.
          if (!mountedRef.current || attempt !== inviteJoinAttemptRef.current || activeInviteCodeRef.current !== targetCode) return;
          if (leavingRef.current || inviteJoinCancelledRef.current) return;
          if (isOwnRoom()) return;
          if (Date.now() - startedAt >= OWN_ROOM_WAIT_MS) fail();
          else ownRoomWaitRef.current = window.setTimeout(check, 250);
        };
        check();
        return;
      }
      fail();
    });
    logger.info("Socket emit lobby:join_by_code via command machine", {
      inviteCode: `${roomCode.slice(0, 2)}***`,
    });
  }, [
    principal.kind,
    joinRetryNonce,
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
    newRoomDuelGame,
    newRoomRoomGame,
    newRoomGameMode,
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
        messageKey: inviteFailureKey("LOBBY_STATE_TIMEOUT"),
        retryable: true,
        room: null,
      });
      setAwaitingInviteLobby(null);
      toast.error(tRef.current(inviteFailureKey("LOBBY_STATE_TIMEOUT")));
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
  const isDuelLobby = activeLobby?.settings.gameMode === "duel";
  const isRoomGameLobby = activeLobby?.settings.gameMode === "room_game";
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

  // Duel hand-off: the server announces the duel of THIS room with duel:found (at start, and
  // again on reconnect while it is live). A found left over from a finished duel is dropped.
  const duelHandoff = useFriendDuelHandoffStore((state) => state.found);
  const consumeDuelHandoff = useFriendDuelHandoffStore((state) => state.consume);
  useEffect(() => {
    if (!duelHandoff || !activeLobby || duelHandoff.lobbyId !== activeLobby.lobbyId) return;
    consumeDuelHandoff(duelHandoff.matchId);
    const fresh = Date.now() - duelHandoff.receivedAt < DUEL_HANDOFF_FRESH_MS;
    if (activeLobby.status !== "active" && !isStartingMatch && !fresh) return;
    clearStartMatchTimeout();
    logger.info("Duel room match started, navigating to the duel", {
      lobbyId: activeLobby.lobbyId,
      matchId: duelHandoff.matchId,
    });
    router.push(`/duelo/${duelHandoff.matchId}`);
  }, [activeLobby, clearStartMatchTimeout, consumeDuelHandoff, duelHandoff, isStartingMatch, router]);

  // Room-game hand-off, to /sala/<matchId>. Only a pointer the server sent AFTER this screen last asked is followed
  // (the start's room:found, or the answer to room:pointer): one kept from earlier (a missed end, a reconnect) is never
  // trusted by its age. The screen asks whenever it shows a room-game room or that room's status changes, and asks
  // again while no answer comes.
  const roomHandoff = useFriendRoomHandoffStore((state) => state.found);
  const consumeRoomHandoff = useFriendRoomHandoffStore((state) => state.consume);
  const roomPointerAsked = useRef<{ key: string; answers: number; mark: number } | null>(null);
  // Keyed by the values that matter (an identical lobby:state must not cancel a pending retry).
  const roomPointerKey = activeLobby?.settings.gameMode === "room_game" ? `${activeLobby.lobbyId}:${activeLobby.status}` : null;
  // Every question unanswered (the start broadcast and each answer lost): Retry / Leave instead of an endless spinner.
  // Recorded only when the last retry runs out (never set from an effect); a retry, a reconnect or any later answer
  // makes it stale by itself, since it names the round and the answer count it stalled at.
  const [roomPointerRound, setRoomPointerRound] = useState(0);
  const [roomPointerStall, setRoomPointerStall] = useState<{ key: string; round: number; answers: number } | null>(null);
  useEffect(() => {
    if (!roomPointerKey) return;
    const key = roomPointerKey;
    const round = roomPointerRound;
    const ask = (tries: number) => {
      const answers = useFriendRoomHandoffStore.getState().answers;
      roomPointerAsked.current = { key, answers, mark: roomReceiptMark() };
      if (tries === 0) setRoomAskMark({ key, answers });
      getSocket().emit("room:pointer");
      return window.setTimeout(() => {
        if (roomPointerAsked.current?.key !== key) return;
        const now = useFriendRoomHandoffStore.getState().answers;
        if (now > roomPointerAsked.current.answers) return;
        if (tries >= ROOM_POINTER_TRIES - 1) setRoomPointerStall({ key, round, answers: now });
        else timer = ask(tries + 1);
      }, ROOM_POINTER_RETRY_MS);
    };
    let timer = ask(0);
    return () => window.clearTimeout(timer);
  }, [roomPointerKey, roomPointerRound]);
  const roomHandoffStalled = Boolean(
    roomPointerKey && roomPointerStall?.key === roomPointerKey && roomPointerStall.round === roomPointerRound && roomPointerStall.answers === roomAnswers,
  );
  // A reconnect while stalled asks again by itself.
  useEffect(() => {
    if (!roomHandoffStalled) return;
    const socket = getSocket();
    const again = () => setRoomPointerRound((n) => n + 1);
    socket.on("connect", again);
    return () => { socket.off("connect", again); };
  }, [roomHandoffStalled]);
  const handleRoomHandoffRetry = () => setRoomPointerRound((n) => n + 1);
  // Not lobby:leave: the server refuses it while this player still holds a live seat (the match they never reached).
  // Back to the menu; that unused seat is withdrawn by the match's own absence rules.
  const handleRoomHandoffExit = () => router.push("/play");
  useEffect(() => {
    if (!roomHandoff || !activeLobby || roomHandoff.lobbyId !== activeLobby.lobbyId) return;
    // Only a room-game room follows it. A room showing another mode keeps the pointer for now (its next state may
    // be the room game); a finished match never comes back (the store drops ended ids).
    if (activeLobby.settings.gameMode !== "room_game") return;
    // A late pointer to the match this player sits out never sends them back into it.
    if (roomSittingOut?.matchId === roomHandoff.matchId) {
      consumeRoomHandoff(roomHandoff.matchId);
      return;
    }
    // Not consumed when followed: it stays the player's live match until it ends (the store drops it on the terminal
    // state or a "no live seat" answer), so coming back to the room while it runs (browser Back) re-asks and returns.
    const asked = roomPointerAsked.current;
    if (!asked || asked.key !== `${activeLobby.lobbyId}:${activeLobby.status}` || roomHandoff.seq <= asked.mark) return;
    clearStartMatchTimeout();
    logger.info("Room game started, navigating to the room match", { lobbyId: activeLobby.lobbyId, matchId: roomHandoff.matchId });
    router.push(`/sala/${roomHandoff.matchId}`);
  }, [activeLobby, clearStartMatchTimeout, consumeRoomHandoff, roomHandoff, roomSittingOut, isStartingMatch, router]);

  useEffect(() => {
    if (!draft && !hasActiveMatch) return;
    // Auction, grid and duel rooms never hand off through the possession `/game` route.
    if (isAuctionLobby || isFootballGridLobby || isDuelLobby || isRoomGameLobby) return;
    clearStartMatchTimeout();
    router.push("/game");
  }, [clearStartMatchTimeout, draft, hasActiveMatch, isAuctionLobby, isDuelLobby, isFootballGridLobby, isRoomGameLobby, router]);

  useEffect(() => {
    if (!error) return;

    const isLobbySettingsError =
      error.code === "LOBBY_READY_LOCKED" ||
      error.code === "INVALID_SETTINGS" ||
      error.code === "LOBBY_NOT_WAITING" ||
      error.code === "NOT_HOST" ||
      error.code === "LOBBY_NOT_FOUND" ||
      error.code === "NOT_IN_LOBBY" ||
      error.code === "TRANSITION_IN_PROGRESS" ||
      // Rejected mode switch (too many members for the target mode, or a duel
      // game switched off) — rolls the optimistic tab back to what the server holds.
      error.code === "LOBBY_MODE_CAPACITY" ||
      error.code === "DUEL_UNAVAILABLE" ||
      error.code === "ROOM_GAME_UNAVAILABLE";
    const isTransientSettingsBusy = error.code === "LOBBY_SETTINGS_LOCKED";
    const isInviteTransitionBusy = isResolvingInvite && error.code === "TRANSITION_IN_PROGRESS";
    // On an invite route the join's own reply reports a missing room (or finds the player's own active room behind the
    // code), so the server's duplicate "not found" event never toasts on its own.
    const isInviteNotFound =
      (error.code === "LOBBY_NOT_FOUND" && (isResolvingInvite || inviteJoinFailure?.reasonCode === "LOBBY_NOT_FOUND"))
      || (expectsInviteLobby && isJoinEcho(error, normalizedRoomCode));
    const isMatchHandoffJoinError =
      isPreparingMatch &&
      (error.code === "ALREADY_IN_LOBBY" || error.code === "ACTIVE_MATCH");

    if (isMatchHandoffJoinError) {
      clearError();
      return;
    }
    if (isLobbySettingsError && !isInviteTransitionBusy && !isInviteNotFound) {
      // Out of the cleanup path (clearError() below re-runs this effect at once), so the rollback always lands.
      queueMicrotask(() => setSettingsErrorVersion((current) => current + 1));
    }
    clearStartMatchTimeout();
    // clearError() changes this effect's dependencies immediately. Keep the
    // recovery update out of the effect cleanup path so it cannot be cancelled
    // while the host is returning from a failed server-side start.
    queueMicrotask(() => setIsStartingMatch(false));
    if (!isTransientSettingsBusy && !isInviteTransitionBusy && !isInviteNotFound) {
      // Server messages are raw English: every code gets our own copy (a join failure, or a generic room error).
      toast.error(t(error.code === "LOBBY_JOIN_ERROR" ? inviteFailureKey(error.code) : LOBBY_ERROR_COPY_KEYS[error.code] ?? "friend.toastLobbyError"));
    }
    clearError();
  }, [clearError, clearStartMatchTimeout, error, expectsInviteLobby, inviteJoinFailure, isPreparingMatch, isResolvingInvite, normalizedRoomCode, t]);

  // 3. Actions
  const copyCode = async () => {
    if (!lobbyCode) return;
    const success = await copyToClipboard(lobbyCode);
    if (success) {
      try {
        trackFriendInviteSent('code_copy', activeLobby?.lobbyId);
      } catch (error) {
        logger.error('Analytics trackFriendInviteSent failed', error);
      }
      toast.success(t('friend.toastRoomCodeCopied'));
    }
  };

  const handleReadyToggle = () => {
    if (!me || !activeLobby) return;
    const nextReady = !(optimisticReady ?? me.isReady);
    setOptimisticReadyState({ value: nextReady, lobbyId: activeLobby.lobbyId });
    getSocket().emit("lobby:ready", { ready: nextReady });
    logger.info("Socket emit lobby:ready", { ready: nextReady });
  };

  const handleRoomOptions = useCallback((options: Record<string, unknown> | null) => {
    if (!activeLobby || activeLobby.settings.gameMode !== "room_game") return;
    getSocket().emit("lobby:room_options", { lobbyId: activeLobby.lobbyId, options });
    logger.info("Socket emit lobby:room_options", { lobbyId: activeLobby.lobbyId });
  }, [activeLobby]);

  const handleUpdateSettings = useCallback((updates: Partial<LobbySettingsState> & { isPublic?: boolean }) => {
    if (!activeLobby) return;

    const nextSettings = {
      ...activeLobby.settings,
      ...updates,
    };
    // Only a duel carries its game; leaving a duel drops it. Same for a room game.
    const duelGame = nextSettings.gameMode === "duel" ? nextSettings.duelGame ?? null : null;
    const roomGame = nextSettings.gameMode === "room_game" ? nextSettings.roomGame ?? ROOM_GAMES_ENABLED[0] ?? "aproximado" : null;
    const emit = {
      lobbyId: activeLobby.lobbyId,
      gameMode: nextSettings.gameMode,
      ...(duelGame && { duelGame }),
      ...(roomGame && { roomGame }),
      friendlyRandom: nextSettings.friendlyRandom,
      friendlyCategoryAId: nextSettings.friendlyCategoryAId,
      friendlyCategoryBId: nextSettings.friendlyCategoryBId ?? null,
      ...(updates.isPublic !== undefined && { isPublic: updates.isPublic }),
    };

    const settingsUnchanged =
      emit.gameMode === activeLobby.settings.gameMode &&
      duelGame === (activeLobby.settings.duelGame ?? null) &&
      roomGame === (activeLobby.settings.roomGame ?? null) &&
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
        toast.error(tRef.current(LOBBY_ERROR_COPY_KEYS[result.code] ?? "friend.toastLeaveFailed"));
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
    setJoinRetryNonce((n) => n + 1);
    inviteJoinCancelledRef.current = false;
    terminalInviteJoinFailureRef.current = false;
    createdRef.current = false;
    initActionRef.current = null;
    setInviteJoinFailure(null);
    setAwaitingInviteLobby(null);
    resetLobbyCommand();
  };

  /** A guest refused by an account-only mode: sign up, then land back on this invite and join. */
  const handleInviteSignUp = () => {
    if (inviteJoinFailure) trackFriendInviteRecovery({ action: "sign_up", failureCode: inviteJoinFailure.reasonCode, roomState: inviteJoinFailure.room?.roomState ?? null });
    rememberPostAuthRedirect(buildFriendInvitePath(roomCode));
    openAuthPrompt("signup");
  };

  /** A refused invite (ended, full, mid-game): open a new room, in the same game when it can be opened directly. */
  const handleInviteNewRoom = () => {
    if (inviteJoinFailure) trackFriendInviteRecovery({ action: "new_room", failureCode: inviteJoinFailure.reasonCode, roomState: inviteJoinFailure.room?.roomState ?? null });
    // The room screen is keyed by its code, so /friend/room/new mounts fresh and creates the room.
    router.push(newRoomPathFor(inviteJoinFailure?.room ?? null));
  };

  /** The room is mid-game: try the same code again (it opens again once the game returns to the room). */
  const handleInviteTryAgain = () => {
    if (inviteJoinFailure) trackFriendInviteRecovery({ action: "try_again", failureCode: inviteJoinFailure.reasonCode, roomState: inviteJoinFailure.room?.roomState ?? null });
    handleInviteRetry();
  };

  useLayoutEffect(() => {
    inviteRetryRef.current = handleInviteRetry;
  });
  useEffect(() => {
    // Signing in goes guest → (no identity while loading) → member: remember the last real identity across the gap.
    if (principalKey.startsWith('none:')) return;
    const previous = switchSeenRef.current;
    switchSeenRef.current = principalKey;
    // The first real identity, or the same one again, is not a switch to rejoin for.
    if (previous === principalKey || previous.startsWith('none:')) return;
    if (normalizedRoomCode) inviteRetryRef.current();
  }, [principalKey, normalizedRoomCode]);

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
    isDuelLobby,
    isSittingOutRoomGame,
    members,
    lobbyCode,
    isResolvingInvite,
    isPreparingMatch,
    roomHandoffStalled: isPreparingMatch && roomHandoffStalled,
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
      handleRoomOptions,
      handleStartMatch,
      handleLeaveLobby,
      handleInviteRetry,
      handleInviteBack,
      handleInviteSignUp,
      handleInviteNewRoom,
      handleInviteTryAgain,
      handleRoomHandoffRetry,
      handleRoomHandoffExit,
    },
  };
}
