import { getSocket } from '@/lib/realtime/socket-client';
import { logger } from '@/utils/logger';
import type { ErrorPayload, SessionStatePayload } from '@/lib/realtime/socket.types';

const MATCH_LEAVE_CONFIRM_TIMEOUT_MS = 4_000;

function hasLeftMatch(snapshot: SessionStatePayload, matchId: string): boolean {
  return snapshot.activeMatchId !== matchId;
}

export async function waitForMatchLeaveConfirmation(matchId: string): Promise<void> {
  const socket = getSocket();

  return new Promise((resolve, reject) => {
    let settled = false;

    const cleanup = () => {
      socket.off('session:state', handleSessionState);
      socket.off('error', handleError);
      window.clearTimeout(timeoutId);
    };

    const finish = (outcome: 'resolve' | 'reject', error?: Error) => {
      if (settled) return;
      settled = true;
      cleanup();
      if (outcome === 'resolve') {
        resolve();
        return;
      }
      reject(error ?? new Error('Leave confirmation failed'));
    };

    const handleSessionState = (snapshot: SessionStatePayload) => {
      if (!hasLeftMatch(snapshot, matchId)) {
        return;
      }
      finish('resolve');
    };

    const handleError = (payload: ErrorPayload) => {
      if (payload.code === 'MATCH_NOT_ACTIVE') {
        finish('resolve');
        return;
      }

      if (payload.code === 'MATCH_LEAVE_ERROR' || payload.code === 'TRANSITION_IN_PROGRESS') {
        finish('reject', new Error(payload.message));
      }
    };

    const timeoutId = window.setTimeout(() => {
      finish('reject', new Error('Timed out waiting for match leave confirmation'));
    }, MATCH_LEAVE_CONFIRM_TIMEOUT_MS);

    socket.on('session:state', handleSessionState);
    socket.on('error', handleError);
    socket.emit('match:leave', { matchId });
    logger.info('Socket emit match:leave (awaiting session confirmation)', { matchId });
  });
}
