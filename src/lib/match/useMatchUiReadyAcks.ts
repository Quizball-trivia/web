'use client';

import { useEffect, useRef } from 'react';
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

export function useMatchUiReadyAcks({
  matchId,
  currentQuestionIndex,
  waitingForReady,
}: UseMatchUiReadyAcksParams): void {
  const kickoffAckedMatchRef = useRef<string | null>(null);
  const resumeAckedKeyRef = useRef<string | null>(null);

  useEffect(() => {
    if (!matchId || currentQuestionIndex !== null) return;
    if (kickoffAckedMatchRef.current === matchId) return;

    return afterPaint(() => {
      if (kickoffAckedMatchRef.current === matchId) return;
      getSocket().emit('match:kickoff_ui_ready', { matchId });
      kickoffAckedMatchRef.current = matchId;
      logger.info('Socket emit match:kickoff_ui_ready', { matchId });
    });
  }, [currentQuestionIndex, matchId]);

  useEffect(() => {
    if (!matchId || waitingForReady?.phase !== 'resume') return;
    const resumeKey = `${matchId}:${waitingForReady.forceStartsAt}`;
    if (resumeAckedKeyRef.current === resumeKey) return;

    return afterPaint(() => {
      if (resumeAckedKeyRef.current === resumeKey) return;
      getSocket().emit('match:resume_ui_ready', { matchId });
      resumeAckedKeyRef.current = resumeKey;
      logger.info('Socket emit match:resume_ui_ready', { matchId, forceStartsAt: waitingForReady.forceStartsAt });
    });
  }, [matchId, waitingForReady?.forceStartsAt, waitingForReady?.phase]);
}
