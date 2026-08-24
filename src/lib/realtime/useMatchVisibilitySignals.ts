'use client';

import { useEffect } from 'react';
import { getSocket } from './socket-client';
import type { MatchVisibilitySignal } from './socket.types';

interface UseMatchVisibilitySignalsOptions {
  matchId: string | null;
  enabled?: boolean;
}

/**
 * Shadow anti-cheat telemetry: reports tab/app visibility transitions to the
 * server while a realtime match is active. The server stamps its own time and
 * question context — nothing here affects gameplay, and no timestamps are
 * sent from the client.
 *
 * Distinct from useMatchStagePresence (a liveness heartbeat): this emits only
 * on TRANSITIONS, so absence windows can be reconstructed precisely.
 */
export function useMatchVisibilitySignals({
  matchId,
  enabled = true,
}: UseMatchVisibilitySignalsOptions): void {
  useEffect(() => {
    if (!enabled || !matchId) return;
    if (typeof document === 'undefined') return;

    const socket = getSocket();
    // Tracks the last signal that actually reached the wire — a transition
    // observed while disconnected must not advance it, or the paired closer
    // ('visible' after a dropped 'hidden') arrives orphaned after reconnect.
    let lastEmitted: MatchVisibilitySignal | null = null;
    const emit = (signal: MatchVisibilitySignal) => {
      if (signal === lastEmitted) return;
      if (!socket.connected) return;
      socket.emit('match:visibility_signal', { matchId, signal });
      lastEmitted = signal;
    };

    const handleVisibilityChange = () => {
      emit(document.visibilityState === 'hidden' ? 'hidden' : 'visible');
    };
    const handleBlur = () => emit('blur');
    const handleFocus = () => emit('focus');
    const handlePageHide = () => emit('pagehide');
    // Re-establish the current state after a reconnect so transitions missed
    // while offline don't leave the server with a dangling episode. Delayed:
    // the server rejoins the match room asynchronously after connect (50ms
    // hydration batch; longer for paused matches), and an instant emit would
    // be dropped by its room-membership gate. A lost baseline is one row —
    // real transitions always differ from it and still flow.
    let baselineTimer: number | null = null;
    const handleConnect = () => {
      if (baselineTimer !== null) window.clearTimeout(baselineTimer);
      baselineTimer = window.setTimeout(() => {
        baselineTimer = null;
        lastEmitted = null;
        handleVisibilityChange();
      }, 2_500);
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('blur', handleBlur);
    window.addEventListener('focus', handleFocus);
    window.addEventListener('pagehide', handlePageHide);
    socket.on('connect', handleConnect);

    return () => {
      if (baselineTimer !== null) window.clearTimeout(baselineTimer);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('blur', handleBlur);
      window.removeEventListener('focus', handleFocus);
      window.removeEventListener('pagehide', handlePageHide);
      socket.off('connect', handleConnect);
    };
  }, [enabled, matchId]);
}
