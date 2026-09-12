import { useEffect } from 'react';
import {
  connectSocket,
  disconnectSocket,
  getSocket,
  reconnectSocket,
  startConnectionQualityMonitor,
  stopConnectionQualityMonitor,
} from './socket-client';
import { registerSocketHandlers } from './socket-handlers';
import { useRealtimeMatchStore } from '@/stores/realtimeMatch.store';
import { useRankedMatchmakingStore } from '@/stores/rankedMatchmaking.store';
import { useFootballGridStore } from '@/stores/footballGrid.store';
import { LAST_AUCTION_MATCH_KEY, useAuctionActiveMatchStore } from '@/stores/auctionActiveMatch.store';
import { useGameSessionStore } from '@/stores/gameSession.store';
import { useQueryClient } from '@tanstack/react-query';
import { logger } from '@/utils/logger';

interface RealtimeConnectionOptions {
  enabled: boolean;
  selfUserId: string | null;
}

let connectedRealtimeUserId: string | null = null;

/**
 * Everything scoped to the connected identity. A principal change (guest →
 * member sign-in, sign-out, account switch) must not carry the previous
 * player's room, match, auction rejoin key or game config onto the new one.
 */
function clearIdentityScopedState(): void {
  const realtimeStore = useRealtimeMatchStore.getState();
  realtimeStore.reset();
  useRankedMatchmakingStore.getState().clearRankedMatchmaking();
  useFootballGridStore.getState().clear();
  useAuctionActiveMatchStore.getState().clear();
  useGameSessionStore.getState().reset();
  try {
    window.sessionStorage.removeItem(LAST_AUCTION_MATCH_KEY);
  } catch {
    // storage unavailable (private mode): nothing to clear
  }
}

export function useRealtimeConnection({ enabled, selfUserId }: RealtimeConnectionOptions) {
  const queryClient = useQueryClient();
  useEffect(() => {
    const realtimeStore = useRealtimeMatchStore.getState();

    if (!enabled || !selfUserId) {
      if (connectedRealtimeUserId !== null || realtimeStore.selfUserId !== null) {
        logger.info('Realtime connection cleared user context', {
          previousUserId: connectedRealtimeUserId ?? realtimeStore.selfUserId,
        });
        connectedRealtimeUserId = null;
        clearIdentityScopedState();
        realtimeStore.setSelfUserId(null);
        disconnectSocket();
        stopConnectionQualityMonitor();
      }
      return;
    }

    registerSocketHandlers(queryClient);
    const storeSelfUserId = realtimeStore.selfUserId;
    const userChanged =
      (connectedRealtimeUserId !== null && connectedRealtimeUserId !== selfUserId) ||
      (storeSelfUserId !== null && storeSelfUserId !== selfUserId);

    if (userChanged) {
      logger.info('Realtime connection switched user context', {
        previousUserId: connectedRealtimeUserId ?? storeSelfUserId,
        nextUserId: selfUserId,
      });
      clearIdentityScopedState();
      queryClient.clear();
      realtimeStore.setSelfUserId(selfUserId);
      connectedRealtimeUserId = selfUserId;
      reconnectSocket();
      return;
    }

    logger.info('Realtime connection set self user id', { selfUserId });
    realtimeStore.setSelfUserId(selfUserId);
    connectedRealtimeUserId = selfUserId;
    const socket = getSocket();
    if (socket.connected || socket.active) {
      startConnectionQualityMonitor();
      return;
    }
    connectSocket();
    startConnectionQualityMonitor();

  }, [enabled, selfUserId, queryClient]);

  // Guests (and the shell before the session resolves) never construct the socket manager.
  return enabled && selfUserId ? getSocket() : null;
}

/**
 * For the match hooks, which only mount on session-gated game routes and read
 * the socket unconditionally: same connection ownership, non-null return.
 */
export function useRealtimeMatchSocket(options: RealtimeConnectionOptions) {
  return useRealtimeConnection(options) ?? getSocket();
}
