'use client';

import { useEffect, useRef } from 'react';
import { API_BASE_URL } from '@/lib/config';
import { logger } from '@/utils/logger';
import { useRealtimeConnectionHealth } from '@/lib/realtime/connection-health';
import { applySystemStatus, type SystemStatusPayload } from '@/lib/realtime/system-status';

const SOCKET_DOWN_GRACE_MS = 10_000;
const POLL_INTERVAL_MS = 30_000;

/**
 * Poll fallback for the outage signal. The socket `system:status` event is the
 * primary source; this only kicks in when the socket itself has been DOWN for
 * >10s (so the client would otherwise be blind to a server-side outage/recovery
 * that it can't hear about). Polls the unauthenticated, DB-free
 * /api/v1/system/status every 30s while down; stops the moment the socket is
 * healthy again.
 */
export function useSystemStatusPoll(): void {
  const { connected, updatedAtMs } = useRealtimeConnectionHealth();
  const downSinceRef = useRef<number | null>(null);

  useEffect(() => {
    if (connected) {
      downSinceRef.current = null;
      return;
    }
    if (downSinceRef.current === null) {
      downSinceRef.current = updatedAtMs || Date.now();
    }

    let cancelled = false;
    const controller = new AbortController();

    async function poll(): Promise<void> {
      const downFor = Date.now() - (downSinceRef.current ?? Date.now());
      if (downFor < SOCKET_DOWN_GRACE_MS) return;
      try {
        const res = await fetch(`${API_BASE_URL}/api/v1/system/status`, {
          signal: controller.signal,
          cache: 'no-store',
        });
        if (!res.ok || cancelled) return;
        const payload = (await res.json()) as SystemStatusPayload;
        applySystemStatus(payload);
      } catch (error) {
        if (!cancelled) logger.warn('system:status poll failed', { error });
      }
    }

    // First poll fires once the grace window has elapsed, then every 30s.
    const pollIntervalRef = { current: null as number | null };
    const graceRemaining = Math.max(
      0,
      SOCKET_DOWN_GRACE_MS - (Date.now() - (downSinceRef.current ?? Date.now())),
    );
    const startTimer = window.setTimeout(() => {
      void poll();
      pollIntervalRef.current = window.setInterval(() => void poll(), POLL_INTERVAL_MS);
    }, graceRemaining);

    return () => {
      cancelled = true;
      controller.abort();
      window.clearTimeout(startTimer);
      if (pollIntervalRef.current !== null) window.clearInterval(pollIntervalRef.current);
    };
  }, [connected, updatedAtMs]);
}
