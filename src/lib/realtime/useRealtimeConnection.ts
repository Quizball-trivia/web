import { useEffect } from 'react';
import { connectSocket, getSocket } from './socket-client';
import { registerSocketHandlers } from './socket-handlers';
import { useRealtimeMatchStore } from '@/stores/realtimeMatch.store';
import { useQueryClient } from '@tanstack/react-query';
import { logger } from '@/utils/logger';

interface RealtimeConnectionOptions {
  enabled: boolean;
  selfUserId: string | null;
}

export function useRealtimeConnection({ enabled, selfUserId }: RealtimeConnectionOptions) {
  const queryClient = useQueryClient();
  useEffect(() => {
    if (!enabled) return;

    registerSocketHandlers(queryClient);
    if (selfUserId) {
      logger.info('Realtime connection set self user id', { selfUserId });
      useRealtimeMatchStore.getState().setSelfUserId(selfUserId);
    }
    connectSocket();

  }, [enabled, selfUserId, queryClient]);

  return getSocket();
}
