'use client';

import { useCallback, useEffect, useRef } from 'react';
import { getSocket } from '@/lib/realtime/socket-client';
import { logger } from '@/utils/logger';
import { isHalftimeBanRetryableErrorCode } from '../realtimePossession.helpers';

interface UseHalftimeBanControllerParams {
  matchId: string | null | undefined;
  halftimeActive: boolean;
  overlayIsHalftime: boolean;
  halftimeDeadlineAt: string | null | undefined;
  realtimeErrorCode: string | null | undefined;
}

interface HalftimeBanControllerResult {
  handleHalftimeBan: (categoryId: string) => void;
  handleHalftimeBanPhaseShown: () => void;
}

export function useHalftimeBanController({
  matchId,
  halftimeActive,
  overlayIsHalftime,
  halftimeDeadlineAt,
  realtimeErrorCode,
}: UseHalftimeBanControllerParams): HalftimeBanControllerResult {
  const halftimeBanSentRef = useRef(false);
  const halftimeUiReadySentRef = useRef<string | null>(null);

  useEffect(() => {
    if (!overlayIsHalftime) {
      halftimeBanSentRef.current = false;
      halftimeUiReadySentRef.current = null;
    }
  }, [overlayIsHalftime]);

  useEffect(() => {
    if (!overlayIsHalftime) return;
    if (!realtimeErrorCode) return;
    if (isHalftimeBanRetryableErrorCode(realtimeErrorCode)) {
      halftimeBanSentRef.current = false;
    }
  }, [overlayIsHalftime, realtimeErrorCode]);

  const handleHalftimeBan = useCallback((categoryId: string) => {
    if (!matchId) return;
    if (halftimeBanSentRef.current) return;
    halftimeBanSentRef.current = true;
    getSocket().emit('match:halftime_ban', {
      matchId,
      categoryId,
    });
  }, [matchId]);

  const handleHalftimeBanPhaseShown = useCallback(() => {
    if (!matchId || !halftimeActive) return;
    const halftimeKey = halftimeDeadlineAt ?? `${matchId}:halftime`;
    if (halftimeUiReadySentRef.current === halftimeKey) return;
    try {
      getSocket().emit('match:halftime_ui_ready', {
        matchId,
      });
      halftimeUiReadySentRef.current = halftimeKey;
    } catch (error) {
      logger.warn('Failed to emit match:halftime_ui_ready', { error });
    }
  }, [halftimeActive, halftimeDeadlineAt, matchId]);

  return {
    handleHalftimeBan,
    handleHalftimeBanPhaseShown,
  };
}
