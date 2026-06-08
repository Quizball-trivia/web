import { io, type Socket } from 'socket.io-client';
import { API_BASE_URL } from '@/lib/config';
import { getSupabaseAccessToken, getSupabaseClient } from '@/lib/auth/supabase';
import { logger } from '@/utils/logger';
import { trackSocketConnectionFailed, trackSocketReconnected } from '@/lib/analytics/game-events';
import type { ClientToServerEvents, ServerToClientEvents } from './socket.types';

let lastDisconnectAtMs: number | null = null;

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
    logger.warn('Socket token refresh failed before connect', error);
    return currentToken;
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

    socket.auth = { token };
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
    socket.auth = { token: settledToken };
    logger.info('Socket connect requested');
    socket.connect();
  })().finally(() => {
    connectInFlight = null;
  });

  return connectInFlight;
}

function createSocket(): Socket<ServerToClientEvents, ClientToServerEvents> {
  const socket = io(API_BASE_URL, {
    autoConnect: false,
    auth: (cb) => {
      void getSupabaseAccessToken()
        .then((token) => cb({ token: token ?? undefined }))
        .catch(() => cb({ token: undefined }));
    },
    transports: ['websocket'],
    withCredentials: true,
  });
  socket.on('connect', () => {
    socketDebug('socket authenticated/connected', socketSnapshot(socket));
    logger.info('Socket connected', { socketId: socket.id });
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
    try { trackSocketConnectionFailed(error.message); } catch { /* best-effort */ }
  });
  socket.on('reconnect_attempt', (attempt) => {
    logger.info('Socket reconnect attempt', { attempt });
  });
  socket.on('reconnect_failed', () => {
    logger.warn('Socket reconnect failed');
  });
  return socket;
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
  if (socketInstance && (socketInstance.connected || socketInstance.active)) {
    logger.info('Socket disconnect requested');
    socketInstance.disconnect();
  }
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
