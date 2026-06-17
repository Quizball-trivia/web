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
import { useQueryClient } from '@tanstack/react-query';
import { logger } from '@/utils/logger';

interface RealtimeConnectionOptions {
  enabled: boolean;
  selfUserId: string | null;
}

let connectedRealtimeUserId: string | null = null;

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
        realtimeStore.reset();
        realtimeStore.setSelfUserId(null);
        useRankedMatchmakingStore.getState().clearRankedMatchmaking();
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
      realtimeStore.reset();
      useRankedMatchmakingStore.getState().clearRankedMatchmaking();
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

  return getSocket();
}
