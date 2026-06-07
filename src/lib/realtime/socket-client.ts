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
let authRecoveryInFlight: Promise<void> | null = null;
const ACCESS_TOKEN_REFRESH_SKEW_MS = 30_000;
const RECENT_ACCESS_TOKEN_SETTLE_MS = 1_500;
const AUTH_RECOVERY_RETRY_MS = 1_000;

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
  if (authRecoveryInFlight) {
    return authRecoveryInFlight;
  }

  authRecoveryInFlight = (async () => {
    await wait(AUTH_RECOVERY_RETRY_MS);
    const token = await ensureValidAccessToken();
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
    authRecoveryInFlight = null;
  });

  return authRecoveryInFlight;
}

async function connectWithFreshAuth(
  socket: Socket<ServerToClientEvents, ClientToServerEvents>
): Promise<void> {
  if (socket.connected || socket.active) {
    return;
  }
  if (connectInFlight) {
    return connectInFlight;
  }

  connectInFlight = (async () => {
    const token = await ensureValidAccessToken();
    if (!token) {
      logger.warn('Socket connect skipped: no valid Supabase access token');
      return;
    }
    await waitForTokenToSettle(token);
    const settledToken = await ensureValidAccessToken();
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
    logger.info('Socket connected', { socketId: socket.id });
    if (lastDisconnectAtMs !== null) {
      const downtimeSec = Math.max(0, Math.round((Date.now() - lastDisconnectAtMs) / 1000));
      lastDisconnectAtMs = null;
      try { trackSocketReconnected(downtimeSec); } catch { /* best-effort */ }
    }
  });
  socket.on('disconnect', (reason) => {
    logger.warn('Socket disconnected', { reason });
    lastDisconnectAtMs = Date.now();
  });
  socket.on('connect_error', (error) => {
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
  void connectWithFreshAuth(socket);
  return socket;
}

export function disconnectSocket(): void {
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
