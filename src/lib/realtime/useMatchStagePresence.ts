'use client';

import { useEffect } from 'react';
import { getSocket } from './socket-client';

const HEARTBEAT_INTERVAL_MS = 2_500;

interface UseMatchStagePresenceOptions {
  matchId: string | null;
  stageKey: string | null;
  enabled?: boolean;
}

function shouldEmit(): boolean {
  return typeof document === 'undefined' || document.visibilityState === 'visible';
}

export function useMatchStagePresence({
  matchId,
  stageKey,
  enabled = true,
}: UseMatchStagePresenceOptions): void {
  useEffect(() => {
    if (!enabled || !matchId || !stageKey) return;

    let stopped = false;
    const socket = getSocket();
    const payload = { matchId, stageKey };
    const emitHeartbeat = () => {
      if (stopped || !shouldEmit()) return;
      if (!socket.connected) return;
      socket.emit('match:presence_heartbeat', payload);
    };
    const emitReady = () => {
      if (stopped || !shouldEmit()) return;
      if (!socket.connected) return;
      socket.emit('match:stage_ready', payload);
    };

    const readyTimer = window.setTimeout(emitReady, 0);
    emitHeartbeat();
    const heartbeatTimer = window.setInterval(emitHeartbeat, HEARTBEAT_INTERVAL_MS);
    const handleConnect = () => {
      emitHeartbeat();
      emitReady();
    };
    socket.on('connect', handleConnect);

    const handleVisibilityChange = () => {
      if (shouldEmit()) {
        emitHeartbeat();
        emitReady();
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      stopped = true;
      window.clearTimeout(readyTimer);
      window.clearInterval(heartbeatTimer);
      socket.off('connect', handleConnect);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [enabled, matchId, stageKey]);
}
