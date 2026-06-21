'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useRealtimeConnection } from '@/lib/realtime/useRealtimeConnection';
import { reconnectSocket } from '@/lib/realtime/socket-client';
import { logger } from '@/utils/logger';
import type { AuctionActions } from '../hooks/useAuctionGame';
import type { AuctionGameState } from '../types';
import type {
  AuctionBiddingStartedPayload,
  AuctionBidAcceptedPayload,
  AuctionClueRevealedPayload,
  AuctionErrorPayload,
  AuctionFoldAcceptedPayload,
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
}

export function useRealtimeAuctionMatch({
  enabled,
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
  const [error, setError] = useState<string | null>(null);
  const startRequestedRef = useRef(false);
  const autoStartTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const versionGapReconnectTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const recoveredVersionGapKeyRef = useRef<string | null>(null);

  const publicState = realtimeState.publicState;
  const matchId = publicState?.matchId ?? null;
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
          })
        : null,
    [humanAvatarSeed, humanPlayerId, publicState],
  );

  const requestStart = useCallback(() => {
    if (!enabled || !selfUserId || !socket.connected) return;
    if (autoStartTimerRef.current) {
      clearTimeout(autoStartTimerRef.current);
      autoStartTimerRef.current = null;
    }
    startRequestedRef.current = true;
    setError(null);
    setRealtimeState(EMPTY_AUCTION_REALTIME_STATE);
    socket.emit('auction:start_ai_match', { locale, formation });
  }, [enabled, formation, locale, selfUserId, socket]);

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
        setError(null);
      });
      return;
    }
    if (!isConnected || startRequestedRef.current || publicState) return;
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
  }, [enabled, isConnected, publicState, requestStart, selfUserId]);

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
    const apply = <T extends Parameters<typeof applyAuctionRealtimeEvent>[1]>(event: T) => {
      setRealtimeState((prev) => {
        try {
          const next = applyAuctionRealtimeEvent(prev, event);
          if (next.publicState) {
            toClientAuctionState(next.publicState, {
              humanSeatId: findMyAuctionSeatId(next.publicState, selfUserId),
              humanAvatarSeed,
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
      setError(null);
    };

    const onError = (payload: AuctionErrorPayload) => {
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
    socket.on('auction:round_revealed', onRoundRevealed);
    socket.on('auction:squad_updated', onSquadUpdated);
    socket.on('auction:solo_pick_started', onSoloPickStarted);
    socket.on('auction:solo_pick_selected', onSoloPickSelected);
    socket.on('auction:match_finished', onMatchFinished);

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
      socket.off('auction:round_revealed', onRoundRevealed);
      socket.off('auction:squad_updated', onSquadUpdated);
      socket.off('auction:solo_pick_started', onSoloPickStarted);
      socket.off('auction:solo_pick_selected', onSoloPickSelected);
      socket.off('auction:match_finished', onMatchFinished);
    };
  }, [humanAvatarSeed, selfUserId, socket]);

  const actions = useMemo<AuctionActions>(() => ({
    startGame: () => {
      startRequestedRef.current = false;
      requestStart();
    },
    placeBid: (amount: number) => {
      if (!matchId) return;
      socket.emit('auction:bid', { matchId, amount });
    },
    fold: () => {
      if (!matchId) return;
      socket.emit('auction:fold', { matchId });
    },
    confirmReveal: () => {},
    pickSoloOption: (option: 'A' | 'B') => {
      if (!matchId) return;
      socket.emit('auction:solo_pick_select', { matchId, option });
    },
    setPhase: () => {},
  }), [matchId, requestStart, socket]);

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
  };
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
