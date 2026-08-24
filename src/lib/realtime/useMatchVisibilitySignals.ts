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

    let lastSignal: MatchVisibilitySignal | null = null;
    const emit = (signal: MatchVisibilitySignal) => {
      if (signal === lastSignal) return;
      lastSignal = signal;
      const socket = getSocket();
      if (!socket.connected) return;
      socket.emit('match:visibility_signal', { matchId, signal });
    };

    const handleVisibilityChange = () => {
      emit(document.visibilityState === 'hidden' ? 'hidden' : 'visible');
    };
    const handleBlur = () => emit('blur');
    const handleFocus = () => emit('focus');
    const handlePageHide = () => emit('pagehide');

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('blur', handleBlur);
    window.addEventListener('focus', handleFocus);
    window.addEventListener('pagehide', handlePageHide);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('blur', handleBlur);
      window.removeEventListener('focus', handleFocus);
      window.removeEventListener('pagehide', handlePageHide);
    };
  }, [enabled, matchId]);
}
