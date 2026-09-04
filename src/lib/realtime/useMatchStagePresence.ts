'use client';

import { useEffect } from 'react';
import { getSocket, setConnectionQualityInMatch } from './socket-client';

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

    // A match screen is mounted, so RTT is on screen (own indicator + the
    // opponent's, which is fed by our connection:rtt report). Sample fast here
    // and let the monitor fall back to its idle cadence everywhere else.
    setConnectionQualityInMatch(true);

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
      setConnectionQualityInMatch(false);
      window.clearTimeout(readyTimer);
      window.clearInterval(heartbeatTimer);
      socket.off('connect', handleConnect);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [enabled, matchId, stageKey]);
}
