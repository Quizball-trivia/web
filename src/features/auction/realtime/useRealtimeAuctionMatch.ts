'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useRealtimeConnection } from '@/lib/realtime/useRealtimeConnection';
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
  humanAvatarSeed,
}: UseRealtimeAuctionMatchParams): UseRealtimeAuctionMatchResult {
  const socket = useRealtimeConnection({ enabled, selfUserId });
  const [isConnected, setIsConnected] = useState(() => socket.connected);
  const [realtimeState, setRealtimeState] = useState<AuctionRealtimeState>(
    EMPTY_AUCTION_REALTIME_STATE,
  );
  const [error, setError] = useState<string | null>(null);
  const startRequestedRef = useRef(false);

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
    startRequestedRef.current = true;
    setError(null);
    setRealtimeState(EMPTY_AUCTION_REALTIME_STATE);
    socket.emit('auction:start_ai_match', { locale });
  }, [enabled, locale, selfUserId, socket]);

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
      queueMicrotask(() => {
        setRealtimeState(EMPTY_AUCTION_REALTIME_STATE);
        setError(null);
      });
      return;
    }
    if (!isConnected || startRequestedRef.current || publicState) return;
    queueMicrotask(() => requestStart());
  }, [enabled, isConnected, publicState, requestStart, selfUserId]);

  useEffect(() => {
    const apply = <T extends Parameters<typeof applyAuctionRealtimeEvent>[1]>(event: T) => {
      setRealtimeState((prev) => applyAuctionRealtimeEvent(prev, event));
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
  }, [socket]);

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
