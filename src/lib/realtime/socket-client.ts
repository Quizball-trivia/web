import { io, type Socket } from 'socket.io-client';
import { API_BASE_URL } from '@/lib/config';
import { getAccessToken } from '@/lib/auth/tokenStorage';
import { logger } from '@/utils/logger';
import type { ClientToServerEvents, ServerToClientEvents } from './socket.types';

let socketInstance: Socket<ServerToClientEvents, ClientToServerEvents> | null = null;

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
  });
  socket.on('reconnect_attempt', (attempt) => {
    logger.info('Socket reconnect attempt', { attempt });
  });
  socket.on('reconnect_failed', () => {
    logger.warn('Socket reconnect failed');
  });
  return socket;
}

export function getSocket(): Socket<ServerToClientEvents, ClientToServerEvents> {
  if (!socketInstance) {
    socketInstance = createSocket();
  }
  return socketInstance;
}

export function connectSocket(): Socket<ServerToClientEvents, ClientToServerEvents> {
  const socket = getSocket();
  if (!socket.connected) {
    socket.auth = { token: getAccessToken() ?? undefined };
    logger.info('Socket connect requested');
    socket.connect();
  }
  return socket;
}

export function disconnectSocket(): void {
  if (socketInstance?.connected) {
    logger.info('Socket disconnect requested');
    socketInstance.disconnect();
  }
}
