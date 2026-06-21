'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useRealtimeConnection } from '@/lib/realtime/useRealtimeConnection';
import { reconnectSocket } from '@/lib/realtime/socket-client';
import { logger } from '@/utils/logger';
import type { AuctionActions, AuctionPendingTurnAction } from '../hooks/useAuctionGame';
import type { AuctionGameState } from '../types';
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
  AuctionWaitingForReadyPayload,
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
  selfUserId: string | null;
  locale: 'en' | 'ka';
  formation?: AuctionFormationName;
  humanAvatarSeed: string;
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

export function useRealtimeAuctionMatch({
  enabled,
  autoStart = true,
  selfUserId,
  locale,
  formation,
  humanAvatarSeed,
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
  const [error, setError] = useState<string | null>(null);
  const startRequestedRef = useRef(false);
  const autoStartTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const versionGapReconnectTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const recoveredVersionGapKeyRef = useRef<string | null>(null);
  const serverTimeOffsetMsRef = useRef<number | null>(null);
  const pendingTurnActionRef = useRef<AuctionPendingTurnAction | null>(null);

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
            serverTimeOffsetMs,
          })
        : null,
    [humanAvatarSeed, humanPlayerId, publicState, serverTimeOffsetMs],
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

  const requestStart = useCallback(() => {
    if (!enabled || !selfUserId || !socket.connected) return;
    if (autoStartTimerRef.current) {
      clearTimeout(autoStartTimerRef.current);
      autoStartTimerRef.current = null;
    }
    startRequestedRef.current = true;
    serverTimeOffsetMsRef.current = null;
    setServerTimeOffsetMs(null);
    setPendingTurnActionValue(null);
    setWaitingForReady(null);
    setError(null);
    setRealtimeState(EMPTY_AUCTION_REALTIME_STATE);
    socket.emit('auction:start_ai_match', { locale, formation });
  }, [enabled, formation, locale, selfUserId, setPendingTurnActionValue, socket]);

  useEffect(() => {
    const handleConnect = () => setIsConnected(true);
    const handleDisconnect = () => setIsConnected(false);

    socket.on('connect', handleConnect);
    socket.on('disconnect', handleDisconnect);
    queueMicrotask(() => setIsConnected(socket.connected));

    return () => {
      socket.off('connect', handleConnect);
      socket.off('disconnect', handleDisconnect);
    };
  }, [socket]);

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
  }, [autoStart, enabled, isConnected, publicState, requestStart, selfUserId, setPendingTurnActionValue]);

  useEffect(() => {
    if (!enabled || !selfUserId || !matchId || !socket.connected || !currentRoundId || publicStateVersion === null || !publicPhase) return;
    const phase = getUiReadyPhase(publicPhase);
    if (!phase) return;

    socket.emit('auction:ui_ready', {
      matchId,
      phase,
      roundId: currentRoundId,
      stateVersion: publicStateVersion,
    });
  }, [
    currentRoundId,
    enabled,
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

    const gapKey = `${publicState.matchId}:${publicState.version}`;
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
      reconnectSocket();
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [enabled, matchId, publicState?.phase]);

  useEffect(() => {
    const clearPendingForMatch = (eventMatchId: string | null | undefined) => {
      const pending = pendingTurnActionRef.current;
      if (pending && (!eventMatchId || pending.matchId === eventMatchId)) {
        setPendingTurnActionValue(null);
      }
    };

    const apply = <T extends Parameters<typeof applyAuctionRealtimeEvent>[1]>(event: T) => {
      const eventServerTimeOffsetMs = updateServerTimeOffset(getAuctionEventServerNow(event));
      setRealtimeState((prev) => {
        try {
          const next = applyAuctionRealtimeEvent(prev, event);
          if (next.publicState) {
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
      setError(null);
    };

    const onError = (payload: AuctionErrorPayload) => {
      clearPendingForMatch(null);
      setError(`${payload.message} (${payload.code})`);
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
    const onMatchFinished = (payload: AuctionMatchFinishedPayload) =>
      apply({ type: 'match_finished', payload });
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
      setError(null);
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

    socket.on('auction:error', onError);
    socket.on('auction:match_started', onMatchStarted);
    socket.on('auction:state', onState);
    socket.on('auction:round_started', onRoundStarted);
    socket.on('auction:clue_revealed', onClueRevealed);
    socket.on('auction:bidding_started', onBiddingStarted);
    socket.on('auction:turn_started', onTurnStarted);
    socket.on('auction:bid_accepted', onBidAccepted);
    socket.on('auction:fold_accepted', onFoldAccepted);
    socket.on('auction:turn_timeout', onTurnTimeout);
    socket.on('auction:opponent_disconnected', onOpponentDisconnected);
    socket.on('auction:paused', onPaused);
    socket.on('auction:resume', onResume);
    socket.on('auction:player_forfeited', onPlayerForfeited);
    socket.on('auction:round_revealed', onRoundRevealed);
    socket.on('auction:squad_updated', onSquadUpdated);
    socket.on('auction:solo_pick_started', onSoloPickStarted);
    socket.on('auction:solo_pick_selected', onSoloPickSelected);
    socket.on('auction:match_finished', onMatchFinished);
    socket.on('auction:waiting_for_ready', onWaitingForReady);

    return () => {
      socket.off('auction:error', onError);
      socket.off('auction:match_started', onMatchStarted);
      socket.off('auction:state', onState);
      socket.off('auction:round_started', onRoundStarted);
      socket.off('auction:clue_revealed', onClueRevealed);
      socket.off('auction:bidding_started', onBiddingStarted);
      socket.off('auction:turn_started', onTurnStarted);
      socket.off('auction:bid_accepted', onBidAccepted);
      socket.off('auction:fold_accepted', onFoldAccepted);
      socket.off('auction:turn_timeout', onTurnTimeout);
      socket.off('auction:opponent_disconnected', onOpponentDisconnected);
      socket.off('auction:paused', onPaused);
      socket.off('auction:resume', onResume);
      socket.off('auction:player_forfeited', onPlayerForfeited);
      socket.off('auction:round_revealed', onRoundRevealed);
      socket.off('auction:squad_updated', onSquadUpdated);
      socket.off('auction:solo_pick_started', onSoloPickStarted);
      socket.off('auction:solo_pick_selected', onSoloPickSelected);
      socket.off('auction:match_finished', onMatchFinished);
      socket.off('auction:waiting_for_ready', onWaitingForReady);
    };
  }, [humanAvatarSeed, selfUserId, setPendingTurnActionValue, socket, updateServerTimeOffset]);

  const actions = useMemo<AuctionActions>(() => ({
    startGame: () => {
      startRequestedRef.current = false;
      requestStart();
    },
    placeBid: (amount: number) => {
      if (!matchId) return;
      if (pendingTurnActionRef.current) return;
      setPendingTurnActionValue({
        kind: 'bid',
        amount,
        matchId,
        roundId: publicState?.currentRound?.roundId ?? null,
      });
      socket.emit('auction:bid', { matchId, amount });
    },
    fold: () => {
      if (!matchId) return;
      if (pendingTurnActionRef.current) return;
      setPendingTurnActionValue({
        kind: 'fold',
        matchId,
        roundId: publicState?.currentRound?.roundId ?? null,
      });
      socket.emit('auction:fold', { matchId });
    },
    confirmReveal: () => {},
    pickSoloOption: (option: 'A' | 'B') => {
      if (!matchId) return;
      socket.emit('auction:solo_pick_select', { matchId, option });
    },
    setPhase: () => {},
    pendingTurnAction,
  }), [matchId, pendingTurnAction, publicState?.currentRound?.roundId, requestStart, setPendingTurnActionValue, socket]);

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

function getUiReadyPhase(phase: NonNullable<AuctionRealtimeState['publicState']>['phase']): AuctionUiReadyPhase | null {
  if (phase === 'clue_reveal') return 'round';
  if (phase === 'bidding') return 'bidding';
  return null;
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
