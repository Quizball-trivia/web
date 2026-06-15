'use client';

import { useSyncExternalStore } from 'react';

export type RealtimeConnectionPhase =
  | 'idle'
  | 'connecting'
  | 'connected'
  | 'reconnecting'
  | 'disconnected'
  | 'error';

export type RealtimeConnectionTier = 'unknown' | 'good' | 'unstable' | 'bad';

export interface RealtimeConnectionHealth {
  phase: RealtimeConnectionPhase;
  tier: RealtimeConnectionTier;
  connected: boolean;
  rttMs: number | null;
  sampleCount: number;
  missedPongs: number;
  lastDisconnectReason: string | null;
  lastError: string | null;
  recoveredUntilMs: number | null;
  updatedAtMs: number;
}

const MIN_STABLE_SAMPLES = 3;
const EWMA_ALPHA = 0.35;
const BACK_ONLINE_VISIBLE_MS = 2500;

const listeners = new Set<() => void>();

let state: RealtimeConnectionHealth = {
  phase: 'idle',
  tier: 'unknown',
  connected: false,
  rttMs: null,
  sampleCount: 0,
  missedPongs: 0,
  lastDisconnectReason: null,
  lastError: null,
  recoveredUntilMs: null,
  updatedAtMs: Date.now(),
};

function emit(): void {
  listeners.forEach((listener) => listener());
}

function computeTier(next: RealtimeConnectionHealth): RealtimeConnectionTier {
  if (next.phase === 'reconnecting' || next.phase === 'disconnected' || next.phase === 'error') return 'bad';
  if (next.missedPongs >= 2) return 'bad';
  if (next.missedPongs >= 1) return 'unstable';
  if (next.sampleCount < MIN_STABLE_SAMPLES || next.rttMs == null) return 'unknown';
  if (next.rttMs > 250) return 'bad';
  if (next.rttMs >= 150) return 'unstable';
  return 'good';
}

function setState(update: Partial<RealtimeConnectionHealth>): void {
  const next = {
    ...state,
    ...update,
    updatedAtMs: Date.now(),
  };
  state = {
    ...next,
    tier: computeTier(next),
  };
  emit();
}

export function getRealtimeConnectionHealth(): RealtimeConnectionHealth {
  return state;
}

export function subscribeRealtimeConnectionHealth(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function useRealtimeConnectionHealth(): RealtimeConnectionHealth {
  return useSyncExternalStore(
    subscribeRealtimeConnectionHealth,
    getRealtimeConnectionHealth,
    getRealtimeConnectionHealth,
  );
}

export function markRealtimeConnecting(): void {
  setState({ phase: 'connecting', connected: false, lastError: null });
}

export function markRealtimeConnected(): void {
  const wasUnhealthy = state.phase === 'reconnecting' || state.phase === 'disconnected' || state.phase === 'error';
  setState({
    phase: 'connected',
    connected: true,
    missedPongs: 0,
    lastDisconnectReason: null,
    lastError: null,
    recoveredUntilMs: wasUnhealthy ? Date.now() + BACK_ONLINE_VISIBLE_MS : state.recoveredUntilMs,
  });
}

export function markRealtimeDisconnected(reason: string): void {
  setState({
    phase: 'disconnected',
    connected: false,
    lastDisconnectReason: reason,
    missedPongs: Math.max(state.missedPongs, 1),
    recoveredUntilMs: null,
  });
}

export function markRealtimeReconnectAttempt(): void {
  setState({
    phase: 'reconnecting',
    connected: false,
    missedPongs: Math.max(state.missedPongs, 1),
    recoveredUntilMs: null,
  });
}

export function markRealtimeConnectionError(message: string): void {
  setState({
    phase: 'error',
    connected: false,
    lastError: message,
    missedPongs: Math.max(state.missedPongs, 1),
    recoveredUntilMs: null,
  });
}

export function recordRealtimeRtt(sampleMs: number): void {
  const roundedSample = Math.max(0, Math.round(sampleMs));
  const smoothed = state.rttMs == null
    ? roundedSample
    : Math.round((state.rttMs * (1 - EWMA_ALPHA)) + (roundedSample * EWMA_ALPHA));
  setState({
    phase: 'connected',
    connected: true,
    rttMs: smoothed,
    sampleCount: state.sampleCount + 1,
    missedPongs: 0,
    lastError: null,
  });
}

export function markRealtimePingMissed(): void {
  if (!state.connected) return;
  setState({
    phase: state.missedPongs >= 1 ? 'error' : 'connected',
    missedPongs: state.missedPongs + 1,
  });
}

export function __resetRealtimeConnectionHealthForTests(): void {
  state = {
    phase: 'idle',
    tier: 'unknown',
    connected: false,
    rttMs: null,
    sampleCount: 0,
    missedPongs: 0,
    lastDisconnectReason: null,
    lastError: null,
    recoveredUntilMs: null,
    updatedAtMs: Date.now(),
  };
  emit();
}
