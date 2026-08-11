'use client';

import { useSyncExternalStore } from 'react';

/**
 * Client mirror of the backend read-only DB breaker (INC-2026-07-29). Fed by
 * the socket `system:status` event (primary) and the /api/v1/system/status
 * poll fallback (when the socket is down). A useSyncExternalStore singleton so
 * every banner/pill reads one source of truth.
 *
 * Cloned from connection-health.ts; the 6s green "Back online" pulse mirrors
 * that file's recoveredUntilMs pattern.
 */

export type SystemStatusReason = 'db_write_outage' | null;
export type SystemMatchmaking = 'available' | 'paused';

export interface SystemStatus {
  degraded: boolean;
  reason: SystemStatusReason;
  matchmaking: SystemMatchmaking;
  /** Server epoch ms the outage began, or null when healthy. */
  sinceMs: number | null;
  /**
   * While set (Date.now() < this), show the transient green recovery pulse.
   * Set when we transition degraded → healthy; null otherwise.
   */
  recoveredUntilMs: number | null;
  updatedAtMs: number;
}

/** How long the green "Back online" pulse stays visible after recovery. */
export const BACK_ONLINE_VISIBLE_MS = 6_000;

const listeners = new Set<() => void>();

let state: SystemStatus = {
  degraded: false,
  reason: null,
  matchmaking: 'available',
  sinceMs: null,
  recoveredUntilMs: null,
  updatedAtMs: Date.now(),
};

function emit(): void {
  listeners.forEach((listener) => listener());
}

export function getSystemStatus(): SystemStatus {
  return state;
}

export function subscribeSystemStatus(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function useSystemStatus(): SystemStatus {
  return useSyncExternalStore(subscribeSystemStatus, getSystemStatus, getSystemStatus);
}

/** Server-shaped payload from socket `system:status` and the HTTP fallback. */
export interface SystemStatusPayload {
  degraded: boolean;
  reason: SystemStatusReason;
  matchmaking: SystemMatchmaking;
  sinceMs: number | null;
  serverTimeMs?: number;
}

/**
 * Apply an authoritative status snapshot. The green recovery pulse is armed
 * only on a degraded → healthy EDGE, so a steady stream of healthy snapshots
 * (poll fallback, reconnect) does not keep re-triggering it.
 */
export function applySystemStatus(payload: SystemStatusPayload): void {
  const wasDegraded = state.degraded;
  const nowHealthy = !payload.degraded;
  const recoveredUntilMs = wasDegraded && nowHealthy
    ? Date.now() + BACK_ONLINE_VISIBLE_MS
    : payload.degraded
      ? null
      : state.recoveredUntilMs;

  state = {
    degraded: payload.degraded,
    reason: payload.reason,
    matchmaking: payload.matchmaking,
    sinceMs: payload.sinceMs,
    recoveredUntilMs,
    updatedAtMs: Date.now(),
  };
  emit();
}

export function __resetSystemStatusForTests(): void {
  state = {
    degraded: false,
    reason: null,
    matchmaking: 'available',
    sinceMs: null,
    recoveredUntilMs: null,
    updatedAtMs: Date.now(),
  };
  emit();
}
