'use client';

import { useEffect, useState } from 'react';
import { WifiOff } from 'lucide-react';
import { useLocale } from '@/contexts/LocaleContext';
import {
  useRealtimeConnectionHealth,
  type RealtimeConnectionPhase,
} from '@/lib/realtime/connection-health';

const DISCONNECT_NOTICE_DELAY_MS = 1_500;

function isOfflinePhase(phase: RealtimeConnectionPhase): boolean {
  return phase === 'reconnecting' || phase === 'disconnected' || phase === 'error';
}

export function useDelayedDisconnectNotice(
  phase: RealtimeConnectionPhase,
  delayMs = DISCONNECT_NOTICE_DELAY_MS,
): boolean {
  const offline = isOfflinePhase(phase);
  const [delayElapsed, setDelayElapsed] = useState(false);

  useEffect(() => {
    if (!offline) {
      const timeoutId = window.setTimeout(() => setDelayElapsed(false), 0);
      return () => window.clearTimeout(timeoutId);
    }

    const timeoutId = window.setTimeout(() => setDelayElapsed(true), delayMs);
    return () => window.clearTimeout(timeoutId);
  }, [delayMs, offline]);

  return offline && delayElapsed;
}

export function GameConnectionIndicator() {
  const { t } = useLocale();
  const { phase } = useRealtimeConnectionHealth();
  const visible = useDelayedDisconnectNotice(phase);

  if (!visible) return null;

  return (
    <div className="pointer-events-none fixed inset-x-0 top-[calc(env(safe-area-inset-top)+0.75rem)] z-[100] flex justify-center px-3">
      <div
        role="status"
        className="flex max-w-full items-center gap-2 rounded-full border border-brand-orange/45 bg-surface-deep/95 px-3.5 py-2 font-poppins text-xs font-semibold text-brand-orange-light backdrop-blur-sm sm:text-sm"
      >
        <WifiOff aria-hidden="true" className="size-4 shrink-0" />
        <span className="truncate">{t('common.offlineReconnecting')}</span>
      </div>
    </div>
  );
}
