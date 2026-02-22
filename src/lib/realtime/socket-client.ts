import { io, type Socket } from 'socket.io-client';
import { API_BASE_URL } from '@/lib/config';
import { getAccessToken } from '@/lib/auth/tokenStorage';
import { refresh } from '@/lib/auth/auth.service';
import { logger } from '@/utils/logger';
import type { ClientToServerEvents, ServerToClientEvents } from './socket.types';

let socketInstance: Socket<ServerToClientEvents, ClientToServerEvents> | null = null;
let socketOverride: Socket<ServerToClientEvents, ClientToServerEvents> | null = null;
let connectInFlight: Promise<void> | null = null;
let authRecoveryInFlight: Promise<void> | null = null;
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

  logger.info('Socket token missing/expired, attempting refresh before connect');
  const refreshed = await refresh();
  if (!refreshed) {
    logger.warn('Socket token refresh failed before connect');
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
  if (authRecoveryInFlight) {
    return authRecoveryInFlight;
  }

  authRecoveryInFlight = (async () => {
    const refreshed = await refresh();
    if (!refreshed) {
      logger.warn('Socket auth recovery refresh failed');
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
  });
  socket.on('disconnect', (reason) => {
    logger.warn('Socket disconnected', { reason });
  });
  socket.on('connect_error', (error) => {
    logger.warn('Socket connect error', { message: error.message });
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
  if (socketInstance?.connected) {
    logger.info('Socket disconnect requested');
    socketInstance.disconnect();
  }
}
