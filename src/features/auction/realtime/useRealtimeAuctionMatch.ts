'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useRealtimeConnection } from '@/lib/realtime/useRealtimeConnection';
import { reconnectSocket } from '@/lib/realtime/socket-client';
import { logger } from '@/utils/logger';
import type { AuctionActions, AuctionPendingTurnAction } from '../hooks/useAuctionGame';
import type { AuctionGameState } from '../types';
import type { AvatarCustomization } from '@/types/game';
import type {
  AuctionBiddingStartedPayload,
  AuctionBidAcceptedPayload,
  AuctionClueRevealedPayload,
  AuctionErrorPayload,
  AuctionFoldAcceptedPayload,
  AuctionOpponentDisconnectedPayload,
  AuctionPausedPayload,
  AuctionPlayerForfeitedPayload,
  AuctionResumePayload,
  AuctionRejoinAvailablePayload,
  AuctionResumeCountdownPayload,
  AuctionSearchCancelledPayload,
  AuctionSearchStartedPayload,
  AuctionSearchStatusPayload,
  AuctionWaitingForReadyPayload,
  AuctionMatchFoundPayload,
  AuctionMatchFinishedPayload,
  AuctionMatchStartedPayload,
  AuctionRoundRevealedPayload,
  AuctionRoundStartedPayload,
  AuctionSoloPickSelectedPayload,
  AuctionSoloPickStartedPayload,
  AuctionSquadUpdatedPayload,
  AuctionStatePayload,
  AuctionTurnStartedPayload,
  AuctionTurnTimeoutPayload,
  AuctionFormationName,
  AuctionUiReadyPhase,
  ServerToClientEvents,
} from '@/lib/realtime/socket.types';
import {
  findMyAuctionSeatId,
  toClientAuctionState,
} from './auction-realtime.adapter';
import {
  applyAuctionRealtimeEvent,
  EMPTY_AUCTION_REALTIME_STATE,
  type AuctionRealtimeState,
} from './auction-realtime.reducer';

const POST_CONNECT_AUCTION_HYDRATION_GRACE_MS = 500;
const VERSION_GAP_RECONNECT_DELAY_MS = 250;
// If a match is found but no state arrives in this window, reconnect once to
// force the server's rejoin (which joins the match room and re-emits state).
const MATCH_FOUND_REJOIN_DELAY_MS = 1_500;

type AuctionConnectionStatus =
  | 'auth_required'
  | 'connecting'
  | 'searching'
  | 'playing'
  | 'finished'
  | 'error';

export interface UseRealtimeAuctionMatchParams {
  enabled: boolean;
  autoStart?: boolean;
  matchmakingMode?: 'ai' | 'search';
  selfUserId: string | null;
  locale: 'en' | 'ka';
  formation?: AuctionFormationName;
  humanAvatarSeed: string;
  /** Real logged-in user's layered avatar (rendered on the human seat). */
  humanAvatarCustomization?: AvatarCustomization | null;
}

export interface UseRealtimeAuctionMatchResult {
  state: AuctionGameState | null;
  actions: AuctionActions;
  humanPlayerId: string | null;
  matchId: string | null;
  status: AuctionConnectionStatus;
  error: string | null;
  isConnected: boolean;
  versionGapDetected: boolean;
  waitingForReady: AuctionWaitingForReadyState | null;
  pause: AuctionPauseState | null;
  /** Set when reloading into a paused match this client was disconnected from. */
  rejoinAvailable: AuctionRejoinAvailablePayload | null;
  /** Server resume "get ready" countdown end (this client's clock). */
  resumeCountdownEndsAtMs: number | null;
  search: AuctionSearchState | null;
  /** Coins this client earned for the finished match (500 win / 300 finish / 0). null until settled. */
  coinsAwarded: number | null;
}

export type AuctionWaitingForReadyState = AuctionWaitingForReadyPayload & {
  forceStartsAtMs: number;
};

export type AuctionPauseState = {
  matchId: string;
  seatId: string;
  userId: string;
  pauseUntil: string;
  pauseUntilMs: number;
  graceMs: number;
  remainingReconnects: number;
  reason: AuctionPausedPayload['reason'] | AuctionPlayerForfeitedPayload['reason'];
};

export type AuctionSearchState = {
  phase: 'starting' | 'queued' | 'match_found' | 'cancelled';
  searchId: string | null;
  locale: 'en' | 'ka';
  queuedUserCount: number;
  seatsNeeded: number;
  fallbackAt: string | null;
  fallbackAtMs: number | null;
  botCount?: number;
  humanUserIds?: string[];
  /** Server-authoritative pre-match countdown end, converted to client clock. */
  countdownEndsAtMs?: number | null;
};

export function useRealtimeAuctionMatch({
  enabled,
  autoStart = true,
  matchmakingMode = 'ai',
  selfUserId,
  locale,
  formation,
  humanAvatarSeed,
  humanAvatarCustomization,
}: UseRealtimeAuctionMatchParams): UseRealtimeAuctionMatchResult {
  const socket = useRealtimeConnection({ enabled, selfUserId });
  const [isConnected, setIsConnected] = useState(() => socket.connected);
  const [realtimeState, setRealtimeState] = useState<AuctionRealtimeState>(
    EMPTY_AUCTION_REALTIME_STATE,
  );
  const [serverTimeOffsetMs, setServerTimeOffsetMs] = useState<number | null>(null);
  const [pendingTurnAction, setPendingTurnAction] = useState<AuctionPendingTurnAction | null>(null);
  const [waitingForReady, setWaitingForReady] = useState<AuctionWaitingForReadyState | null>(null);
  const [pause, setPause] = useState<AuctionPauseState | null>(null);
  // Reload-into-paused-match: server prompts to rejoin; we show a prompt and the
  // user opts in (auction:rejoin). Mirrors ranked's rejoin handshake.
  const [rejoinAvailable, setRejoinAvailable] = useState<AuctionRejoinAvailablePayload | null>(null);
  // Server-authoritative resume "get ready" countdown end (this client's clock).
  const [resumeCountdownEndsAtMs, setResumeCountdownEndsAtMs] = useState<number | null>(null);
  // Coins this client earned for the finished match (win = 500, finish = 300,
  // forfeit = 0). Set from match_finished's per-user map; drives the reward
  // animation on the results screen. null until/unless the match settles.
  const [coinsAwarded, setCoinsAwarded] = useState<number | null>(null);
  const [search, setSearch] = useState<AuctionSearchState | null>(null);
  const [error, setError] = useState<string | null>(null);
  const startRequestedRef = useRef(false);
  const autoStartTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const versionGapReconnectTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const recoveredVersionGapKeyRef = useRef<string | null>(null);
  const matchFoundRejoinTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const matchFoundRejoinKeyRef = useRef<string | null>(null);
  const serverTimeOffsetMsRef = useRef<number | null>(null);
  const pendingTurnActionRef = useRef<AuctionPendingTurnAction | null>(null);
  const publicStateRef = useRef<AuctionRealtimeState['publicState']>(null);
  const searchRef = useRef<AuctionSearchState | null>(null);
  const searchCancelledRef = useRef(false);
  const ignoredMatchIdsRef = useRef(new Set<string>());
  const lastUiReadyAckKeyRef = useRef<string | null>(null);
  const revealReadyKeyRef = useRef<string | null>(null);

  const publicState = realtimeState.publicState;
  const matchId = publicState?.matchId ?? null;
  const publicPhase = publicState?.phase ?? null;
  const publicStateVersion = publicState?.version ?? null;
  const currentRoundId = publicState?.currentRound?.roundId ?? null;
  const humanPlayerId = useMemo(
    () => findMyAuctionSeatId(publicState, selfUserId),
    [publicState, selfUserId],
  );

  const state = useMemo(
    () =>
      publicState
        ? toClientAuctionState(publicState, {
            humanSeatId: humanPlayerId,
            humanAvatarSeed,
            humanAvatarCustomization,
            serverTimeOffsetMs,
          })
        : null,
    [humanAvatarSeed, humanAvatarCustomization, humanPlayerId, publicState, serverTimeOffsetMs],
  );

  const updateServerTimeOffset = useCallback((serverNow: string | undefined): number | null => {
    const offset = computeAuctionServerTimeOffsetMs(serverNow);
    if (offset === undefined) return serverTimeOffsetMsRef.current;
    serverTimeOffsetMsRef.current = offset;
    setServerTimeOffsetMs(offset);
    return offset;
  }, []);

  const setPendingTurnActionValue = useCallback((next: AuctionPendingTurnAction | null) => {
    pendingTurnActionRef.current = next;
    setPendingTurnAction(next);
  }, []);

  const setSearchValue = useCallback((next: AuctionSearchState | null) => {
    searchRef.current = next;
    setSearch(next);
  }, []);

  useEffect(() => {
    publicStateRef.current = publicState;
  }, [publicState]);

  const emitAuctionSearchStart = useCallback(() => {
    socket.emit('auction:search_start', { locale, formation });
  }, [formation, locale, socket]);

  const emitRevealReadyIfComplete = useCallback(() => {
    const activeState = publicStateRef.current;
    const roundId = activeState?.currentRound?.roundId ?? null;
    if (!activeState || activeState.phase !== 'reveal' || !roundId || !socket.connected) return;

    const ackKey = getAuctionUiReadyKey(activeState.matchId, 'reveal', roundId, activeState.version);
    if (revealReadyKeyRef.current !== ackKey || lastUiReadyAckKeyRef.current === ackKey) return;

    lastUiReadyAckKeyRef.current = ackKey;
    socket.emit('auction:ui_ready', {
      matchId: activeState.matchId,
      phase: 'reveal',
      roundId,
      stateVersion: activeState.version,
    });
  }, [socket]);

  const requestStart = useCallback((options: { force?: boolean } = {}) => {
    if (!enabled || !selfUserId || !socket.connected) return;
    if (!options.force && startRequestedRef.current) return;
    if (autoStartTimerRef.current) {
      clearTimeout(autoStartTimerRef.current);
      autoStartTimerRef.current = null;
    }
    startRequestedRef.current = true;
    serverTimeOffsetMsRef.current = null;
    setServerTimeOffsetMs(null);
    setPendingTurnActionValue(null);
    setWaitingForReady(null);
    setPause(null);
    setError(null);
    setRealtimeState(EMPTY_AUCTION_REALTIME_STATE);
    ignoredMatchIdsRef.current.clear();

    if (matchmakingMode === 'search') {
      searchCancelledRef.current = false;
      setSearchValue({
        phase: 'starting',
        searchId: null,
        locale,
        queuedUserCount: 1,
        seatsNeeded: 2,
        fallbackAt: null,
        fallbackAtMs: null,
      });
      emitAuctionSearchStart();
      return;
    }

    setSearchValue(null);
    socket.emit('auction:start_ai_match', { locale, formation });
  }, [
    emitAuctionSearchStart,
    enabled,
    formation,
    locale,
    matchmakingMode,
    selfUserId,
    setPendingTurnActionValue,
    setSearchValue,
    socket,
  ]);

  useEffect(() => {
    const handleConnect = () => {
      setIsConnected(true);
      const activeSearch = searchRef.current;
      if (
        enabled &&
        autoStart &&
        matchmakingMode === 'search' &&
        activeSearch &&
        activeSearch.phase !== 'cancelled' &&
        !publicStateRef.current &&
        !searchCancelledRef.current
      ) {
        emitAuctionSearchStart();
      }
      emitRevealReadyIfComplete();
    };
    const handleDisconnect = () => {
      lastUiReadyAckKeyRef.current = null;
      setIsConnected(false);
    };

    socket.on('connect', handleConnect);
    socket.on('disconnect', handleDisconnect);
    queueMicrotask(() => setIsConnected(socket.connected));

    return () => {
      socket.off('connect', handleConnect);
      socket.off('disconnect', handleDisconnect);
    };
  }, [autoStart, emitAuctionSearchStart, emitRevealReadyIfComplete, enabled, matchmakingMode, socket]);

  useEffect(() => {
    if (!enabled || !selfUserId) {
      startRequestedRef.current = false;
      if (autoStartTimerRef.current) {
        clearTimeout(autoStartTimerRef.current);
        autoStartTimerRef.current = null;
      }
      if (versionGapReconnectTimerRef.current) {
        clearTimeout(versionGapReconnectTimerRef.current);
        versionGapReconnectTimerRef.current = null;
      }
      recoveredVersionGapKeyRef.current = null;
      queueMicrotask(() => {
        setRealtimeState(EMPTY_AUCTION_REALTIME_STATE);
        serverTimeOffsetMsRef.current = null;
        setServerTimeOffsetMs(null);
        setPendingTurnActionValue(null);
        setWaitingForReady(null);
        setPause(null);
        setSearchValue(null);
        searchCancelledRef.current = false;
        ignoredMatchIdsRef.current.clear();
        lastUiReadyAckKeyRef.current = null;
        revealReadyKeyRef.current = null;
        setError(null);
      });
      return;
    }
    if (!autoStart || !isConnected || startRequestedRef.current || publicState) return;
    autoStartTimerRef.current = setTimeout(() => {
      autoStartTimerRef.current = null;
      requestStart();
    }, POST_CONNECT_AUCTION_HYDRATION_GRACE_MS);
    return () => {
      if (autoStartTimerRef.current) {
        clearTimeout(autoStartTimerRef.current);
        autoStartTimerRef.current = null;
      }
    };
  }, [autoStart, enabled, isConnected, publicState, requestStart, selfUserId, setPendingTurnActionValue, setSearchValue]);

  useEffect(() => () => {
    const activeSearch = searchRef.current;
    if (
      matchmakingMode !== 'search' ||
      !activeSearch ||
      activeSearch.phase === 'cancelled' ||
      publicStateRef.current ||
      searchCancelledRef.current
    ) {
      return;
    }
    searchCancelledRef.current = true;
    if (socket.connected) {
      socket.emit('auction:search_cancel');
    }
  }, [matchmakingMode, socket]);

  useEffect(() => {
    if (!enabled || !selfUserId || !matchId || !isConnected || !currentRoundId || publicStateVersion === null || !publicPhase) return;
    const phase = getUiReadyPhase(publicPhase);
    if (!phase) return;
    const ackKey = getAuctionUiReadyKey(matchId, phase, currentRoundId, publicStateVersion);
    if (phase === 'reveal' && revealReadyKeyRef.current !== ackKey) return;
    if (lastUiReadyAckKeyRef.current === ackKey) return;

    lastUiReadyAckKeyRef.current = ackKey;
    socket.emit('auction:ui_ready', {
      matchId,
      phase,
      roundId: currentRoundId,
      stateVersion: publicStateVersion,
    });
  }, [
    currentRoundId,
    enabled,
    isConnected,
    matchId,
    publicPhase,
    publicStateVersion,
    selfUserId,
    socket,
  ]);

  useEffect(() => {
    if (!enabled || !isConnected || !publicState || !realtimeState.versionGapDetected) {
      recoveredVersionGapKeyRef.current = null;
      return;
    }
    if (publicState.phase === 'finished') return;

    // Key the recovery by matchId ONLY (not version). Reconnecting drops the
    // shared socket and the match advances several versions while we're away,
    // so the next state always looks like a fresh gap — keying by version made
    // this reconnect every few seconds forever. One reconnect per match is the
    // most a genuine one-off gap should ever need; the rejoin-on-connect and
    // the next full state snapshot self-heal the rest.
    const gapKey = publicState.matchId;
    if (recoveredVersionGapKeyRef.current === gapKey) return;
    recoveredVersionGapKeyRef.current = gapKey;

    if (versionGapReconnectTimerRef.current) {
      clearTimeout(versionGapReconnectTimerRef.current);
    }
    versionGapReconnectTimerRef.current = setTimeout(() => {
      versionGapReconnectTimerRef.current = null;
      reconnectSocket();
    }, VERSION_GAP_RECONNECT_DELAY_MS);

    return () => {
      if (versionGapReconnectTimerRef.current) {
        clearTimeout(versionGapReconnectTimerRef.current);
        versionGapReconnectTimerRef.current = null;
      }
    };
  }, [enabled, isConnected, publicState, realtimeState.versionGapDetected]);

  useEffect(() => {
    if (!enabled || !matchId || publicState?.phase === 'finished') return;

    const handleVisibilityChange = () => {
      if (document.visibilityState !== 'visible') return;
      if (socket.connected) return;
      reconnectSocket();
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
    // `socket` (a stable singleton from useRealtimeConnection) is included so the
    // handler always reads the live `socket.connected`; `reconnectSocket` is a
    // module-level import and needs no dep.
  }, [enabled, matchId, publicState?.phase, socket]);

  useEffect(() => {
    const clearPendingForMatch = (eventMatchId: string | null | undefined) => {
      const pending = pendingTurnActionRef.current;
      if (pending && (!eventMatchId || pending.matchId === eventMatchId)) {
        setPendingTurnActionValue(null);
      }
    };

    const apply = <T extends Parameters<typeof applyAuctionRealtimeEvent>[1]>(event: T) => {
      if (ignoredMatchIdsRef.current.has(event.payload.matchId)) return;
      const eventServerTimeOffsetMs = updateServerTimeOffset(getAuctionEventServerNow(event));
      setRealtimeState((prev) => {
        try {
          const next = applyAuctionRealtimeEvent(prev, event);
          if (next.publicState) {
            // Probe call: result discarded — this only surfaces an adapter throw
            // early so we can reconnect for repair. Avatar inputs don't affect
            // whether it throws, so they're intentionally omitted here.
            toClientAuctionState(next.publicState, {
              humanSeatId: findMyAuctionSeatId(next.publicState, selfUserId),
              humanAvatarSeed,
              serverTimeOffsetMs: eventServerTimeOffsetMs,
            });
          }
          return next;
        } catch (applyError) {
          queueMicrotask(() => {
            logger.warn('Auction realtime event application failed; reconnecting for state repair', {
              eventType: event.type,
              message: applyError instanceof Error ? applyError.message : 'Unknown error',
            });
            setError('Auction state changed unexpectedly. Reconnecting.');
            reconnectSocket();
          });
          return prev;
        }
      });
      if (shouldClearPendingAfterEvent(event)) {
        clearPendingForMatch(event.payload.matchId);
      }
      if (shouldClearWaitingForReadyAfterEvent(event)) {
        setWaitingForReady(null);
      }
      if (shouldClearSearchAfterEvent(event)) {
        setSearchValue(null);
        searchCancelledRef.current = false;
      }
      if (event.type === 'round_revealed') {
        revealReadyKeyRef.current = null;
      }
      setError(null);
    };

    const onError = (payload: AuctionErrorPayload) => {
      clearPendingForMatch(null);
      setError(friendlyAuctionError(payload, locale));
    };
    const onMatchStarted = (payload: AuctionMatchStartedPayload) =>
      apply({ type: 'match_started', payload });
    const onState = (payload: AuctionStatePayload) =>
      apply({ type: 'state', payload });
    const onRoundStarted = (payload: AuctionRoundStartedPayload) =>
      apply({ type: 'round_started', payload });
    const onClueRevealed = (payload: AuctionClueRevealedPayload) =>
      apply({ type: 'clue_revealed', payload });
    const onBiddingStarted = (payload: AuctionBiddingStartedPayload) =>
      apply({ type: 'bidding_started', payload });
    const onTurnStarted = (payload: AuctionTurnStartedPayload) =>
      apply({ type: 'turn_started', payload });
    const onBidAccepted = (payload: AuctionBidAcceptedPayload) =>
      apply({ type: 'bid_accepted', payload });
    const onFoldAccepted = (payload: AuctionFoldAcceptedPayload) =>
      apply({ type: 'fold_accepted', payload });
    const onTurnTimeout = (payload: AuctionTurnTimeoutPayload) =>
      apply({ type: 'turn_timeout', payload });
    const onRoundRevealed = (payload: AuctionRoundRevealedPayload) =>
      apply({ type: 'round_revealed', payload });
    const onSquadUpdated = (payload: AuctionSquadUpdatedPayload) =>
      apply({ type: 'squad_updated', payload });
    const onSoloPickStarted = (payload: AuctionSoloPickStartedPayload) =>
      apply({ type: 'solo_pick_started', payload });
    const onSoloPickSelected = (payload: AuctionSoloPickSelectedPayload) =>
      apply({ type: 'solo_pick_selected', payload });
    const onMatchFinished = (payload: AuctionMatchFinishedPayload) => {
      if (selfUserId) {
        setCoinsAwarded(payload.coinsByUserId?.[selfUserId] ?? 0);
      }
      apply({ type: 'match_finished', payload });
    };
    const onWaitingForReady = (payload: AuctionWaitingForReadyPayload) => {
      const offset = updateServerTimeOffset(payload.serverNow);
      const forceStartsAtMs = Date.parse(payload.forceStartsAt);
      setWaitingForReady({
        ...payload,
        forceStartsAtMs: Number.isFinite(forceStartsAtMs)
          ? forceStartsAtMs
          : Date.now() + (offset ?? 0),
      });
    };
    const onSearchStarted = (payload: AuctionSearchStartedPayload) => {
      if (searchCancelledRef.current) return;
      setError(null);
      setSearchValue(toAuctionSearchState('queued', payload));
      startRequestedRef.current = true;
    };
    const onSearchStatus = (payload: AuctionSearchStatusPayload) => {
      if (searchCancelledRef.current) return;
      setSearchValue(toAuctionSearchState('queued', payload));
    };
    const onMatchFound = (payload: AuctionMatchFoundPayload) => {
      if (searchCancelledRef.current) {
        ignoredMatchIdsRef.current.add(payload.matchId);
        return;
      }
      // Convert the server's absolute countdown end to this client's clock
      // (server time - offset) so all 3 players count down to the same instant.
      const offset = serverTimeOffsetMsRef.current ?? 0;
      const countdownServerMs = payload.countdownEndsAt ? Date.parse(payload.countdownEndsAt) : NaN;
      const countdownEndsAtMs = Number.isFinite(countdownServerMs)
        ? countdownServerMs - offset
        : null;
      setSearchValue({
        phase: 'match_found',
        searchId: searchRef.current?.searchId ?? null,
        locale: payload.locale,
        queuedUserCount: payload.humanUserIds.length,
        seatsNeeded: payload.botCount,
        fallbackAt: null,
        fallbackAtMs: null,
        botCount: payload.botCount,
        humanUserIds: [...payload.humanUserIds],
        countdownEndsAtMs,
      });
      startRequestedRef.current = true;

      // The match's state/round events are broadcast to the match room. The
      // server joins our sockets to that room at match creation, but if this
      // socket wasn't the one joined (timing/multi-socket), the match state
      // never arrives and we'd hang on "connecting players". If no public
      // state shows up shortly after match_found, reconnect ONCE — that fires
      // the server's rejoin-on-connect, which joins the room and re-emits
      // state. Guarded so it can't loop.
      if (matchFoundRejoinTimerRef.current) {
        clearTimeout(matchFoundRejoinTimerRef.current);
      }
      matchFoundRejoinTimerRef.current = setTimeout(() => {
        matchFoundRejoinTimerRef.current = null;
        if (
          !publicStateRef.current &&
          !searchCancelledRef.current &&
          matchFoundRejoinKeyRef.current !== payload.matchId
        ) {
          matchFoundRejoinKeyRef.current = payload.matchId;
          reconnectSocket();
        }
      }, MATCH_FOUND_REJOIN_DELAY_MS);
    };
    const onSearchCancelled = (payload: AuctionSearchCancelledPayload) => {
      searchCancelledRef.current = true;
      startRequestedRef.current = false;
      setSearchValue({
        phase: 'cancelled',
        searchId: payload.searchId,
        locale,
        queuedUserCount: 0,
        seatsNeeded: 0,
        fallbackAt: null,
        fallbackAtMs: null,
      });
    };
    const onOpponentDisconnected = (payload: AuctionOpponentDisconnectedPayload) => {
      updateServerTimeOffset(payload.serverNow);
      setError(null);
    };
    const onPaused = (payload: AuctionPausedPayload) => {
      updateServerTimeOffset(payload.serverNow);
      apply({
        type: 'state',
        payload: {
          matchId: payload.matchId,
          state: payload.state,
          stateVersion: payload.stateVersion,
          serverNow: payload.serverNow,
        },
      });
      setPause(toAuctionPauseState(payload));
      setWaitingForReady(null);
      setPendingTurnActionValue(null);
    };
    const onResume = (payload: AuctionResumePayload) => {
      updateServerTimeOffset(payload.serverNow);
      apply({
        type: 'state',
        payload: {
          matchId: payload.matchId,
          state: payload.state,
          stateVersion: payload.stateVersion,
          serverNow: payload.serverNow,
        },
      });
      setPause(null);
      setResumeCountdownEndsAtMs(null);
      setRejoinAvailable(null);
      setError(null);
    };
    const onRejoinAvailable = (payload: AuctionRejoinAvailablePayload) => {
      updateServerTimeOffset(payload.serverNow);
      setRejoinAvailable(payload);
    };
    const onResumeCountdown = (payload: AuctionResumeCountdownPayload) => {
      const offset = updateServerTimeOffset(payload.serverNow);
      const endsAtMs = Date.parse(payload.countdownEndsAt);
      setRejoinAvailable(null);
      setResumeCountdownEndsAtMs(
        Number.isFinite(endsAtMs) ? endsAtMs - (offset ?? 0) : Date.now() + 5000,
      );
    };
    const onPlayerForfeited = (payload: AuctionPlayerForfeitedPayload) => {
      updateServerTimeOffset(payload.serverNow);
      apply({
        type: 'state',
        payload: {
          matchId: payload.matchId,
          state: payload.state,
          stateVersion: payload.stateVersion,
          serverNow: payload.serverNow,
        },
      });
      setPause(null);
      setPendingTurnActionValue(null);
    };

    // Single source of truth for listeners: `bind` registers each handler AND
    // records the [event, handler] pair, so cleanup replays exactly what was
    // registered — no hand-mirrored `off` list to drift out of sync. Each call
    // site stays fully type-checked (handler must match the event's payload);
    // the cast is only on the socket.io plumbing, whose generic listener type
    // (FallbackToUntypedListener) doesn't simplify under a generic event param.
    type Listener = (...args: never[]) => void;
    const bound: Array<[keyof ServerToClientEvents, Listener]> = [];
    // socket.on/off are typed per-event via overloads that don't resolve under a
    // generic event param; treat them as (event, listener) only inside bind. Call
    // sites below stay fully type-checked — `handler` must match the event payload.
    const rawOn = socket.on.bind(socket) as (event: string, handler: Listener) => void;
    const bind = <E extends keyof ServerToClientEvents>(
      event: E,
      handler: ServerToClientEvents[E],
    ) => {
      rawOn(event, handler as Listener);
      bound.push([event, handler as Listener]);
    };

    bind('auction:error', onError);
    bind('auction:search_start', onSearchStarted);
    bind('auction:search_status', onSearchStatus);
    bind('auction:search_cancelled', onSearchCancelled);
    bind('auction:match_found', onMatchFound);
    bind('auction:match_started', onMatchStarted);
    bind('auction:state', onState);
    bind('auction:round_started', onRoundStarted);
    bind('auction:clue_revealed', onClueRevealed);
    bind('auction:bidding_started', onBiddingStarted);
    bind('auction:turn_started', onTurnStarted);
    bind('auction:bid_accepted', onBidAccepted);
    bind('auction:fold_accepted', onFoldAccepted);
    bind('auction:turn_timeout', onTurnTimeout);
    bind('auction:opponent_disconnected', onOpponentDisconnected);
    bind('auction:paused', onPaused);
    bind('auction:resume', onResume);
    bind('auction:rejoin_available', onRejoinAvailable);
    bind('auction:resume_countdown', onResumeCountdown);
    bind('auction:player_forfeited', onPlayerForfeited);
    bind('auction:round_revealed', onRoundRevealed);
    bind('auction:squad_updated', onSquadUpdated);
    bind('auction:solo_pick_started', onSoloPickStarted);
    bind('auction:solo_pick_selected', onSoloPickSelected);
    bind('auction:match_finished', onMatchFinished);
    bind('auction:waiting_for_ready', onWaitingForReady);

    return () => {
      for (const [event, handler] of bound) {
        socket.off(event, handler);
      }
      if (matchFoundRejoinTimerRef.current) {
        clearTimeout(matchFoundRejoinTimerRef.current);
        matchFoundRejoinTimerRef.current = null;
      }
    };
  }, [humanAvatarSeed, locale, selfUserId, setPendingTurnActionValue, setSearchValue, socket, updateServerTimeOffset]);

  const actions = useMemo<AuctionActions>(() => ({
    startGame: () => {
      requestStart({ force: publicPhase === 'finished' });
    },
    placeBid: (amount: number) => {
      if (!matchId) return;
      if (pendingTurnActionRef.current) return;
      setPendingTurnActionValue({
        kind: 'bid',
        amount,
        matchId,
        roundId: currentRoundId,
      });
      socket.emit('auction:bid', { matchId, amount });
    },
    fold: () => {
      if (!matchId) return;
      if (pendingTurnActionRef.current) return;
      setPendingTurnActionValue({
        kind: 'fold',
        matchId,
        roundId: currentRoundId,
      });
      socket.emit('auction:fold', { matchId });
    },
    confirmReveal: () => {
      if (!matchId || publicPhase !== 'reveal' || !currentRoundId || publicStateVersion === null) return;
      const ackKey = getAuctionUiReadyKey(matchId, 'reveal', currentRoundId, publicStateVersion);
      revealReadyKeyRef.current = ackKey;
      if (!socket.connected || lastUiReadyAckKeyRef.current === ackKey) return;
      lastUiReadyAckKeyRef.current = ackKey;
      socket.emit('auction:ui_ready', {
        matchId,
        phase: 'reveal',
        roundId: currentRoundId,
        stateVersion: publicStateVersion,
      });
    },
    pickSoloOption: (option: 'A' | 'B') => {
      if (!matchId) return;
      socket.emit('auction:solo_pick_select', { matchId, option });
    },
    forfeit: () => {
      if (!matchId) return;
      // Permanently leave the match. The server removes this seat, keeps the
      // match running for the others, and sends this player their result.
      if (socket.connected) {
        socket.emit('auction:forfeit', { matchId });
      }
    },
    rejoin: (rejoinMatchId: string) => {
      // Opt in to rejoin a paused match after a reload. matchId comes from the
      // rejoin_available prompt (publicState's matchId isn't set yet here).
      if (socket.connected) {
        socket.emit('auction:rejoin', { matchId: rejoinMatchId });
      }
    },
    setPhase: () => {},
    cancelSearch: () => {
      searchCancelledRef.current = true;
      startRequestedRef.current = false;
      setSearchValue((searchRef.current && {
        ...searchRef.current,
        phase: 'cancelled',
      }) ?? {
        phase: 'cancelled',
        searchId: null,
        locale,
        queuedUserCount: 0,
        seatsNeeded: 0,
        fallbackAt: null,
        fallbackAtMs: null,
      });
      if (socket.connected) {
        socket.emit('auction:search_cancel');
      }
    },
    pendingTurnAction,
  }), [
    locale,
    currentRoundId,
    matchId,
    pendingTurnAction,
    publicPhase,
    publicStateVersion,
    requestStart,
    setPendingTurnActionValue,
    setSearchValue,
    socket,
  ]);

  const status = getStatus({
    enabled,
    error,
    isConnected,
    state,
  });

  return {
    state,
    actions,
    humanPlayerId,
    matchId,
    status,
    error,
    isConnected,
    versionGapDetected: realtimeState.versionGapDetected,
    waitingForReady,
    pause,
    rejoinAvailable,
    resumeCountdownEndsAtMs,
    search,
    coinsAwarded,
  };
}

function toAuctionSearchState(
  phase: AuctionSearchState['phase'],
  payload: AuctionSearchStartedPayload | AuctionSearchStatusPayload,
): AuctionSearchState {
  const fallbackAtMs = Date.parse(payload.fallbackAt);
  return {
    phase,
    searchId: payload.searchId,
    locale: payload.locale,
    queuedUserCount: payload.queuedUserCount,
    seatsNeeded: payload.seatsNeeded,
    fallbackAt: payload.fallbackAt,
    fallbackAtMs: Number.isFinite(fallbackAtMs) ? fallbackAtMs : null,
  };
}

function toAuctionPauseState(payload: AuctionPausedPayload | AuctionPlayerForfeitedPayload): AuctionPauseState {
  const pauseUntil = 'pauseUntil' in payload ? payload.pauseUntil : new Date().toISOString();
  const parsedPauseUntilMs = Date.parse(pauseUntil);
  return {
    matchId: payload.matchId,
    seatId: payload.seatId,
    userId: payload.userId,
    pauseUntil,
    pauseUntilMs: Number.isFinite(parsedPauseUntilMs) ? parsedPauseUntilMs : Date.now(),
    graceMs: 'graceMs' in payload ? payload.graceMs : 0,
    remainingReconnects: 'remainingReconnects' in payload ? payload.remainingReconnects : 0,
    reason: payload.reason,
  };
}

// Map server auction error codes to friendly, localized messages. The server
// sends raw English + a code (e.g. "auction_search_blocked"); we never show
// that verbatim. Unknown codes fall back to a generic translated message.
const AUCTION_ERROR_MESSAGES: Record<string, { en: string; ka: string }> = {
  auction_search_blocked: {
    en: "You're already in a match. Reconnecting…",
    ka: 'თქვენ უკვე მატჩში ხართ. ხელახლა დაკავშირება…',
  },
  auction_content_unavailable: {
    en: 'No auction content is available right now.',
    ka: 'ამჟამად აუქციონის კონტენტი მიუწვდომელია.',
  },
};

const AUCTION_ERROR_GENERIC = {
  en: 'Something went wrong. Please try again.',
  ka: 'რაღაც შეცდომა მოხდა. სცადეთ თავიდან.',
};

function friendlyAuctionError(payload: AuctionErrorPayload, locale: 'en' | 'ka'): string {
  const mapped = AUCTION_ERROR_MESSAGES[payload.code]?.[locale];
  return mapped ?? AUCTION_ERROR_GENERIC[locale];
}

function computeAuctionServerTimeOffsetMs(serverNow: string | undefined, receivedAtMs = Date.now()): number | undefined {
  if (!serverNow) return undefined;
  const serverNowMs = Date.parse(serverNow);
  return Number.isFinite(serverNowMs) ? serverNowMs - receivedAtMs : undefined;
}

function getAuctionEventServerNow(event: Parameters<typeof applyAuctionRealtimeEvent>[1]): string | undefined {
  return 'serverNow' in event.payload ? event.payload.serverNow : undefined;
}

function shouldClearPendingAfterEvent(event: Parameters<typeof applyAuctionRealtimeEvent>[1]): boolean {
  return (
    event.type === 'bid_accepted' ||
    event.type === 'fold_accepted' ||
    event.type === 'turn_started' ||
    event.type === 'turn_timeout' ||
    event.type === 'round_revealed' ||
    event.type === 'state' ||
    event.type === 'match_finished'
  );
}

function shouldClearWaitingForReadyAfterEvent(event: Parameters<typeof applyAuctionRealtimeEvent>[1]): boolean {
  return (
    event.type === 'clue_revealed' ||
    event.type === 'turn_started' ||
    event.type === 'round_revealed' ||
    event.type === 'solo_pick_started' ||
    event.type === 'match_finished' ||
    event.type === 'state'
  );
}

function shouldClearSearchAfterEvent(event: Parameters<typeof applyAuctionRealtimeEvent>[1]): boolean {
  return (
    event.type === 'match_started' ||
    event.type === 'state' ||
    event.type === 'match_finished'
  );
}

function getUiReadyPhase(phase: NonNullable<AuctionRealtimeState['publicState']>['phase']): AuctionUiReadyPhase | null {
  if (phase === 'clue_reveal') return 'round';
  if (phase === 'bidding') return 'bidding';
  if (phase === 'reveal') return 'reveal';
  return null;
}

function getAuctionUiReadyKey(
  matchId: string,
  phase: AuctionUiReadyPhase,
  roundId: string,
  stateVersion: number,
): string {
  return `${matchId}:${phase}:${roundId}:${stateVersion}`;
}

function getStatus({
  enabled,
  error,
  isConnected,
  state,
}: {
  enabled: boolean;
  error: string | null;
  isConnected: boolean;
  state: AuctionGameState | null;
}): AuctionConnectionStatus {
  if (!enabled) return 'auth_required';
  if (error && !state) return 'error';
  if (!isConnected) return 'connecting';
  if (!state) return 'searching';
  if (state.phase === 'results') return 'finished';
  return 'playing';
}
