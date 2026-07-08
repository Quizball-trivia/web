'use client';

import { useEffect, useRef, useState } from 'react';
import { getSocket } from '@/lib/realtime/socket-client';
import type { MatchWaitingForReadyPayload } from '@/lib/realtime/socket.types';
import { logger } from '@/utils/logger';

interface UseMatchUiReadyAcksParams {
  matchId: string | null;
  currentQuestionIndex: number | null;
  waitingForReady: (MatchWaitingForReadyPayload & { forceStartsAtMs: number }) | null;
}

function afterPaint(callback: () => void): () => void {
  if (typeof window === 'undefined' || typeof window.requestAnimationFrame !== 'function') {
    const timeoutId = setTimeout(callback, 0);
    return () => clearTimeout(timeoutId);
  }

  let secondFrameId: number | null = null;
  const firstFrameId = window.requestAnimationFrame(() => {
    secondFrameId = window.requestAnimationFrame(callback);
  });

  return () => {
    window.cancelAnimationFrame(firstFrameId);
    if (secondFrameId !== null) {
      window.cancelAnimationFrame(secondFrameId);
    }
  };
}

function getSocketConnectionKey(): string | null {
  const socket = getSocket();
  if (!socket.connected) return null;
  return socket.id ?? 'connected';
}

export function useMatchUiReadyAcks({
  matchId,
  currentQuestionIndex,
  waitingForReady,
}: UseMatchUiReadyAcksParams): void {
  const [socketConnectionKey, setSocketConnectionKey] = useState(getSocketConnectionKey);
  const kickoffAckedKeyRef = useRef<string | null>(null);
  const resumeAckedKeyRef = useRef<string | null>(null);

  useEffect(() => {
    const socket = getSocket();
    const updateConnectionKey = () => setSocketConnectionKey(getSocketConnectionKey());
    socket.on('connect', updateConnectionKey);
    socket.on('disconnect', updateConnectionKey);
    queueMicrotask(updateConnectionKey);
    return () => {
      socket.off('connect', updateConnectionKey);
      socket.off('disconnect', updateConnectionKey);
    };
  }, []);

  useEffect(() => {
    if (!matchId || currentQuestionIndex !== null || !socketConnectionKey) return;
    const ackKey = `${matchId}:${socketConnectionKey}`;
    if (kickoffAckedKeyRef.current === ackKey) return;

    return afterPaint(() => {
      const socket = getSocket();
      const liveConnectionKey = socket.connected ? socket.id ?? 'connected' : null;
      if (!liveConnectionKey) return;
      const liveAckKey = `${matchId}:${liveConnectionKey}`;
      if (kickoffAckedKeyRef.current === liveAckKey) return;
      socket.emit('match:kickoff_ui_ready', { matchId });
      kickoffAckedKeyRef.current = liveAckKey;
      logger.info('Socket emit match:kickoff_ui_ready', { matchId, socketId: socket.id ?? null });
    });
  }, [
    currentQuestionIndex,
    matchId,
    socketConnectionKey,
    waitingForReady?.forceStartsAt,
    waitingForReady?.phase,
  ]);

  useEffect(() => {
    if (!matchId || waitingForReady?.phase !== 'resume' || !socketConnectionKey) return;
    const resumeKey = `${matchId}:${waitingForReady.forceStartsAt}:${socketConnectionKey}`;
    if (resumeAckedKeyRef.current === resumeKey) return;

    return afterPaint(() => {
      const socket = getSocket();
      const liveConnectionKey = socket.connected ? socket.id ?? 'connected' : null;
      if (!liveConnectionKey) return;
      const liveResumeKey = `${matchId}:${waitingForReady.forceStartsAt}:${liveConnectionKey}`;
      if (resumeAckedKeyRef.current === liveResumeKey) return;
      socket.emit('match:resume_ui_ready', { matchId });
      resumeAckedKeyRef.current = liveResumeKey;
      logger.info('Socket emit match:resume_ui_ready', {
        matchId,
        forceStartsAt: waitingForReady.forceStartsAt,
        socketId: socket.id ?? null,
      });
    });
  }, [matchId, socketConnectionKey, waitingForReady?.forceStartsAt, waitingForReady?.phase]);
}
