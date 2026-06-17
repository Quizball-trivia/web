import { io, type Socket } from 'socket.io-client';
import { API_BASE_URL } from '@/lib/config';
import { getSupabaseAccessToken, getSupabaseClient } from '@/lib/auth/supabase';
import { logger } from '@/utils/logger';
import { trackSocketConnectionFailed, trackSocketReconnected } from '@/lib/analytics/game-events';
import {
  markRealtimeConnected,
  markRealtimeConnecting,
  markRealtimeConnectionError,
  markRealtimeDisconnected,
  markRealtimePingMissed,
  markRealtimeReconnectAttempt,
  recordRealtimeRtt,
} from './connection-health';
import type { ClientToServerEvents, ServerToClientEvents } from './socket.types';

let lastDisconnectAtMs: number | null = null;
let connectionPingIntervalId: ReturnType<typeof setInterval> | null = null;
let connectionPingMonitorRunId = 0;
const pendingPingTimeoutIds = new Set<ReturnType<typeof setTimeout>>();

let socketInstance: Socket<ServerToClientEvents, ClientToServerEvents> | null = null;
let socketOverride: Socket<ServerToClientEvents, ClientToServerEvents> | null = null;
let connectInFlight: Promise<void> | null = null;
let connectAttemptId = 0;
type AuthRecoveryState = {
  id: number;
  cancelled: boolean;
  promise: Promise<void>;
};
let authRecoveryState: AuthRecoveryState | null = null;
let authRecoveryAttemptId = 0;
const ACCESS_TOKEN_REFRESH_SKEW_MS = 30_000;
const RECENT_ACCESS_TOKEN_SETTLE_MS = 1_500;
const AUTH_RECOVERY_RETRY_MS = 1_000;
const SOCKET_DEBUG_ENABLED = process.env.NEXT_PUBLIC_DEBUG_SOCKET === 'true';
const CONNECTION_PING_INTERVAL_MS = 4_000;
const CONNECTION_PING_TIMEOUT_MS = 2_500;

function socketDebug(event: string, meta?: Record<string, unknown>): void {
  if (!SOCKET_DEBUG_ENABLED) return;
  console.info(`[socket-debug] ${event}`, {
    ...meta,
    at: new Date().toISOString(),
  });
}

function socketSnapshot(socket: Socket<ServerToClientEvents, ClientToServerEvents>): Record<string, unknown> {
  return {
    socketId: socket.id ?? null,
    connected: socket.connected,
    active: socket.active,
  };
}

export function logSocketDebug(event: string, meta?: Record<string, unknown>): void {
  socketDebug(event, meta);
}

export function getSocketDebugSnapshot(
  socket: Socket<ServerToClientEvents, ClientToServerEvents> = getSocket()
): Record<string, unknown> {
  return socketSnapshot(socket);
}

function getConnectErrorCode(error: Error): unknown {
  const candidate = error as Error & {
    code?: unknown;
    data?: { code?: unknown };
    description?: unknown;
    type?: unknown;
  };
  return candidate.code ?? candidate.data?.code ?? candidate.description ?? candidate.type ?? null;
}

function parseJwtTimestampMs(token: string, claim: 'exp' | 'iat'): number | null {
  const parts = token.split('.');
  if (parts.length !== 3) return null;
  try {
    let b64 = parts[1].replace(/-/g, '+').replace(/_/g, '/');
    while (b64.length % 4 !== 0) b64 += '=';
    const payload = JSON.parse(atob(b64)) as Partial<Record<'exp' | 'iat', number>>;
    const timestamp = payload[claim];
    return typeof timestamp === 'number' ? timestamp * 1000 : null;
  } catch {
    return null;
  }
}

function isTokenExpiredOrExpiringSoon(token: string): boolean {
  const expMs = parseJwtTimestampMs(token, 'exp');
  if (!expMs) return false;
  return expMs - Date.now() <= ACCESS_TOKEN_REFRESH_SKEW_MS;
}

function recentTokenSettleDelayMs(token: string): number {
  const iatMs = parseJwtTimestampMs(token, 'iat');
  if (!iatMs) return 0;
  const ageMs = Date.now() - iatMs;
  if (ageMs < 0) return RECENT_ACCESS_TOKEN_SETTLE_MS;
  return Math.max(0, RECENT_ACCESS_TOKEN_SETTLE_MS - ageMs);
}

function wait(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function ensureValidAccessToken(): Promise<string | null> {
  const currentToken = await getSupabaseAccessToken();
  if (!currentToken) return null;
  if (!isTokenExpiredOrExpiringSoon(currentToken)) {
    return currentToken;
  }

  const expMs = parseJwtTimestampMs(currentToken, 'exp');
  socketDebug('token refresh before connect', {
    expiresInMs: expMs ? expMs - Date.now() : null,
  });
  logger.info('Socket token expiring soon, asking Supabase to refresh before connect');
  const { data, error } = await getSupabaseClient().auth.refreshSession();
  if (error) {
    // The current token is already expired/expiring; returning it would connect
    // with a known-bad token, triggering an immediate connect_error + recovery
    // loop. Return null so callers skip the attempt and let auth recovery run.
    logger.error('Socket token refresh failed before connect', {
      error,
      expiresInMs: expMs ? expMs - Date.now() : null,
    });
    return null;
  }
  return data.session?.access_token ?? currentToken;
}

function isAuthConnectError(message: string): boolean {
  const normalized = message.toLowerCase();
  return normalized.includes('invalid token') || normalized.includes('authentication required');
}

async function waitForTokenToSettle(token: string): Promise<void> {
  const delayMs = recentTokenSettleDelayMs(token);
  if (delayMs <= 0) return;
  logger.info('Socket connect waiting for newly issued Supabase token to settle', { delayMs });
  await wait(delayMs);
}

async function recoverSocketAuthAndReconnect(
  socket: Socket<ServerToClientEvents, ClientToServerEvents>
): Promise<void> {
  if (authRecoveryState && !authRecoveryState.cancelled) {
    return authRecoveryState.promise;
  }

  const recovery: AuthRecoveryState = {
    id: ++authRecoveryAttemptId,
    cancelled: false,
    promise: Promise.resolve(),
  };
  socketDebug('auth recovery retry scheduled', {
    attemptId: recovery.id,
    delayMs: AUTH_RECOVERY_RETRY_MS,
    ...socketSnapshot(socket),
  });

  recovery.promise = (async () => {
    await wait(AUTH_RECOVERY_RETRY_MS);
    if (recovery.cancelled) {
      return;
    }
    const token = await ensureValidAccessToken();
    if (recovery.cancelled) {
      return;
    }
    if (!token) {
      logger.warn('Socket auth recovery failed: no Supabase session');
      socket.disconnect();
      return;
    }

    // NOTE: deliberately no `socket.auth = { token }` here. Assigning a static
    // auth object would permanently REPLACE the dynamic auth callback passed to
    // io(), freezing this token into every future reconnect attempt — once it
    // expired, automatic reconnects would fail forever. The dynamic callback
    // fetches a fresh token on each attempt; ensureValidAccessToken() above
    // already refreshed the Supabase session it reads from.
    if (!socket.connected) {
      logger.info('Socket reconnect requested after Supabase auth recovery');
      socket.connect();
    }
  })().finally(() => {
    if (authRecoveryState?.id === recovery.id) {
      authRecoveryState = null;
    }
  });

  authRecoveryState = recovery;
  return recovery.promise;
}

function cancelAuthRecovery(reason: string): void {
  if (!authRecoveryState || authRecoveryState.cancelled) return;
  authRecoveryState.cancelled = true;
  socketDebug('auth recovery retry cancelled', {
    attemptId: authRecoveryState.id,
    reason,
  });
}

async function connectWithFreshAuth(
  socket: Socket<ServerToClientEvents, ClientToServerEvents>
): Promise<void> {
  if (socket.connected) {
    socketDebug('skipped because already connected', socketSnapshot(socket));
    return;
  }
  if (socket.active) {
    socketDebug('skipped because already connected', socketSnapshot(socket));
    return;
  }
  if (connectInFlight) {
    socketDebug('skipped because connect is already in progress', socketSnapshot(socket));
    return connectInFlight;
  }

  const attemptId = ++connectAttemptId;
  connectInFlight = (async () => {
    const token = await ensureValidAccessToken();
    if (attemptId !== connectAttemptId) {
      return;
    }
    if (!token) {
      logger.warn('Socket connect skipped: no valid Supabase access token');
      return;
    }
    await waitForTokenToSettle(token);
    if (attemptId !== connectAttemptId) {
      return;
    }
    const settledToken = await ensureValidAccessToken();
    if (attemptId !== connectAttemptId) {
      return;
    }
    if (!settledToken) {
      logger.warn('Socket connect skipped after token settle: no valid Supabase access token');
      return;
    }
    // The dynamic auth callback (see createSocket) supplies the token at
    // handshake time — never overwrite socket.auth with a static object, or
    // future automatic reconnects would reuse this token after it expires.
    logger.info('Socket connect requested');
    markRealtimeConnecting();
    socket.connect();
  })().finally(() => {
    connectInFlight = null;
  });

  return connectInFlight;
}

function createSocket(): Socket<ServerToClientEvents, ClientToServerEvents> {
  const socket = io(API_BASE_URL, {
    autoConnect: false,
    // Runs on EVERY connection attempt, including automatic manager
    // reconnects. ensureValidAccessToken proactively refreshes the Supabase
    // session when the token is expired/expiring (<=30s), so reconnects after
    // an hourly token-expiry socket drop carry a fresh token instead of
    // replaying the stale one (prod pattern: 'Token introspection failed'
    // storms at token-expiry boundaries → players stuck frozen mid-match).
    auth: (cb) => {
      void ensureValidAccessToken()
        .then((token) => cb({ token: token ?? undefined }))
        .catch(() => cb({ token: undefined }));
    },
    transports: ['websocket'],
    withCredentials: true,
  });
  socket.on('connect', () => {
    socketDebug('socket authenticated/connected', socketSnapshot(socket));
    logger.info('Socket connected', { socketId: socket.id });
    markRealtimeConnected();
    if (lastDisconnectAtMs !== null) {
      const downtimeSec = Math.max(0, Math.round((Date.now() - lastDisconnectAtMs) / 1000));
      lastDisconnectAtMs = null;
      try { trackSocketReconnected(downtimeSec); } catch { /* best-effort */ }
    }
  });
  socket.on('disconnect', (reason) => {
    socketDebug('socket disconnected', {
      reason,
      ...socketSnapshot(socket),
    });
    logger.warn('Socket disconnected', { reason });
    markRealtimeDisconnected(reason);
    lastDisconnectAtMs = Date.now();
  });
  socket.on('connect_error', (error) => {
    socketDebug('connect_error', {
      code: getConnectErrorCode(error),
      message: error.message,
      ...socketSnapshot(socket),
    });
    if (isAuthConnectError(error.message)) {
      logger.info('Socket auth connect error; retrying after Supabase session settles', { message: error.message });
      void recoverSocketAuthAndReconnect(socket);
      return;
    }
    logger.warn('Socket connect error', { message: error.message });
    markRealtimeConnectionError(error.message);
    try { trackSocketConnectionFailed(error.message); } catch { /* best-effort */ }
  });
  // Reconnect lifecycle events fire on the MANAGER (socket.io), not the
  // Socket — the previous socket.on('reconnect_attempt') listeners never
  // fired at all in socket.io-client v4.
  socket.io.on('reconnect_attempt', (attempt) => {
    socketDebug('reconnect attempt', { attempt, ...socketSnapshot(socket) });
    logger.info('Socket reconnect attempt', { attempt });
    markRealtimeReconnectAttempt();
  });
  socket.io.on('reconnect_failed', () => {
    logger.warn('Socket reconnect failed');
    markRealtimeConnectionError('reconnect_failed');
    try { trackSocketConnectionFailed('reconnect_failed'); } catch { /* best-effort */ }
  });
  return socket;
}

export function startConnectionQualityMonitor(): void {
  if (connectionPingIntervalId !== null) return;
  const runId = ++connectionPingMonitorRunId;

  const sample = () => {
    const socket = getSocket();
    if (!socket.connected) return;

    const sentAt = Date.now();
    const socketIdAtSend = socket.id ?? null;
    let settled = false;
    const timeoutId = setTimeout(() => {
      if (settled) return;
      settled = true;
      pendingPingTimeoutIds.delete(timeoutId);
      if (runId !== connectionPingMonitorRunId) return;
      if (!socket.connected || (socket.id ?? null) !== socketIdAtSend) return;
      markRealtimePingMissed();
    }, CONNECTION_PING_TIMEOUT_MS);
    pendingPingTimeoutIds.add(timeoutId);

    socket.emit('connection:ping', { sentAt }, () => {
      if (settled) return;
      settled = true;
      clearTimeout(timeoutId);
      pendingPingTimeoutIds.delete(timeoutId);
      if (runId !== connectionPingMonitorRunId) return;
      if (!socket.connected || (socket.id ?? null) !== socketIdAtSend) return;
      const rttMs = Date.now() - sentAt;
      recordRealtimeRtt(rttMs);
      // Report our RTT so the opponent can be shown this player's ping (the
      // server only knows each client's RTT if the client tells it). Best-effort.
      socket.emit('connection:rtt', { rttMs });
    });
  };

  sample();
  connectionPingIntervalId = setInterval(sample, CONNECTION_PING_INTERVAL_MS);
}

export function stopConnectionQualityMonitor(): void {
  if (connectionPingIntervalId === null) return;
  clearInterval(connectionPingIntervalId);
  connectionPingIntervalId = null;
  connectionPingMonitorRunId += 1;
  pendingPingTimeoutIds.forEach((timeoutId) => clearTimeout(timeoutId));
  pendingPingTimeoutIds.clear();
}

/** Override the socket singleton (used by test/mock pages to inject a fake socket). */
export function __setSocketOverride(socket: Socket<ServerToClientEvents, ClientToServerEvents> | null): void {
  socketOverride = socket;
}

export function getSocket(): Socket<ServerToClientEvents, ClientToServerEvents> {
  if (socketOverride) return socketOverride;
  if (!socketInstance) {
    socketInstance = createSocket();
  }
  return socketInstance;
}

export function connectSocket(): Socket<ServerToClientEvents, ClientToServerEvents> {
  const socket = getSocket();
  socketDebug('connectSocket called', socketSnapshot(socket));
  void connectWithFreshAuth(socket);
  return socket;
}

export function disconnectSocket(): void {
  socketDebug('logout/manual disconnect cleanup', {
    hasSocket: Boolean(socketInstance),
    ...(socketInstance ? socketSnapshot(socketInstance) : {}),
  });
  connectAttemptId += 1;
  cancelAuthRecovery('manual-disconnect-cleanup');
  stopConnectionQualityMonitor();
  if (socketInstance && (socketInstance.connected || socketInstance.active)) {
    logger.info('Socket disconnect requested');
    socketInstance.disconnect();
  }
}

/**
 * Nudge a disconnected socket back to life after a Supabase token refresh.
 * A refresh that lands while the socket happens to be down (e.g. mid
 * token-expiry reconnect storm) previously did nothing socket-side — the
 * manager could sit in backoff with no fresh trigger. No-ops when no socket
 * was ever created, or when it is connected / already reconnecting.
 */
export function nudgeSocketReconnectAfterTokenRefresh(): void {
  const socket = socketOverride ?? socketInstance;
  if (!socket) return;
  if (socket.connected || socket.active) return;
  socketDebug('reconnect nudge after token refresh', socketSnapshot(socket));
  logger.info('Socket reconnect nudged after Supabase token refresh');
  void connectWithFreshAuth(socket);
}

export function reconnectSocket(): Socket<ServerToClientEvents, ClientToServerEvents> {
  const socket = getSocket();
  if (socket.connected || socket.active) {
    logger.info('Socket reconnect requested');
    socket.disconnect();
  }
  void connectWithFreshAuth(socket);
  return socket;
}
