import { io, type Socket } from 'socket.io-client';
import { API_BASE_URL } from '@/lib/config';
import { getAccessToken } from '@/lib/auth/tokenStorage';
import { refreshSession } from '@/lib/auth/auth.service';
import { logger } from '@/utils/logger';
import { trackSocketConnectionFailed, trackSocketReconnected } from '@/lib/analytics/game-events';
import type { ClientToServerEvents, ServerToClientEvents } from './socket.types';

// Socket-uptime accounting for analytics: timestamp of the most recent
// disconnect (if any) so we can compute downtime on the next connect.
let lastDisconnectAtMs: number | null = null;

let socketInstance: Socket<ServerToClientEvents, ClientToServerEvents> | null = null;
let socketOverride: Socket<ServerToClientEvents, ClientToServerEvents> | null = null;
let connectInFlight: Promise<void> | null = null;
let authRecoveryInFlight: Promise<void> | null = null;
// After a terminal refresh failure there's no valid session — stop trying to
// recover the socket until the user logs in again. Otherwise a dead session
// loops: connect_error → refresh(fail) → reconnect → connect_error …
let authRecoveryDisabled = false;
const ACCESS_TOKEN_REFRESH_SKEW_MS = 30_000;

function parseJwtExpMs(token: string): number | null {
  const parts = token.split('.');
  if (parts.length !== 3) return null;
  try {
    let b64 = parts[1].replace(/-/g, '+').replace(/_/g, '/');
    while (b64.length % 4 !== 0) b64 += '=';
    const payload = JSON.parse(atob(b64)) as { exp?: number };
    return typeof payload.exp === 'number' ? payload.exp * 1000 : null;
  } catch {
    return null;
  }
}

function isTokenExpiredOrExpiringSoon(token: string): boolean {
  const expMs = parseJwtExpMs(token);
  if (!expMs) return false;
  return expMs - Date.now() <= ACCESS_TOKEN_REFRESH_SKEW_MS;
}

async function ensureValidAccessToken(): Promise<string | null> {
  const currentToken = getAccessToken();
  if (currentToken && !isTokenExpiredOrExpiringSoon(currentToken)) {
    return currentToken;
  }

  // Don't keep trying to recover a session that has already failed terminally.
  if (authRecoveryDisabled) {
    return null;
  }

  logger.info('Socket token missing/expired, attempting refresh before connect');
  const result = await refreshSession();
  if (!result.ok) {
    if (result.terminal) {
      authRecoveryDisabled = true;
      logger.warn('Socket token refresh failed terminally — staying disconnected until login');
    } else {
      logger.warn('Socket token refresh failed (transient) before connect');
    }
    return null;
  }

  const nextToken = getAccessToken();
  if (!nextToken) {
    logger.warn('Socket token refresh succeeded but access token missing');
    return null;
  }

  return nextToken;
}

function isAuthConnectError(message: string): boolean {
  const normalized = message.toLowerCase();
  return normalized.includes('invalid token') || normalized.includes('authentication required');
}

async function recoverSocketAuthAndReconnect(
  socket: Socket<ServerToClientEvents, ClientToServerEvents>
): Promise<void> {
  // Terminal failure already happened: there's no valid session to recover.
  // Stay disconnected until the user logs in rather than looping reconnects.
  if (authRecoveryDisabled) {
    socket.disconnect();
    return;
  }
  if (authRecoveryInFlight) {
    return authRecoveryInFlight;
  }

  authRecoveryInFlight = (async () => {
    const result = await refreshSession();
    if (!result.ok) {
      if (result.terminal) {
        authRecoveryDisabled = true;
        logger.warn('Socket auth recovery failed terminally — staying disconnected');
        socket.disconnect();
      } else {
        logger.warn('Socket auth recovery refresh failed (transient)');
      }
      return;
    }

    const token = getAccessToken();
    if (!token) {
      logger.warn('Socket auth recovery missing token after refresh');
      return;
    }

    socket.auth = { token };
    if (!socket.connected) {
      logger.info('Socket reconnect requested after auth refresh');
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
      logger.warn('Socket connect skipped: no valid access token');
      return;
    }
    socket.auth = { token };
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
      cb({ token: getAccessToken() ?? undefined });
    },
    transports: ['websocket'],
    withCredentials: true,
  });
  socket.on('connect', () => {
    logger.info('Socket connected', { socketId: socket.id });
    // A successful connect means we have a valid session again — re-arm auth
    // recovery so a future expiry can be refreshed.
    authRecoveryDisabled = false;
    // Analytics: only count as a reconnect when we had a prior disconnect.
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
    logger.warn('Socket connect error', { message: error.message });
    try { trackSocketConnectionFailed(error.message); } catch { /* best-effort */ }
    if (isAuthConnectError(error.message)) {
      void recoverSocketAuthAndReconnect(socket);
    }
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
