'use client';

import { useEffect, useState } from 'react';
import { CheckCircle2, WifiOff } from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import { useLocale } from '@/contexts/LocaleContext';
import { useRealtimeConnectionHealth } from '@/lib/realtime/connection-health';
import { cn } from '@/lib/utils';

interface RealtimeConnectionBannerProps {
  className?: string;
}

export function RealtimeConnectionBanner({ className }: RealtimeConnectionBannerProps) {
  const { t } = useLocale();
  const health = useRealtimeConnectionHealth();
  const [nowMs, setNowMs] = useState(() => Date.now());

  useEffect(() => {
    if (!health.recoveredUntilMs) return;
    const remainingMs = health.recoveredUntilMs - Date.now();
    const id = window.setTimeout(() => setNowMs(Date.now()), Math.max(0, remainingMs));
    return () => window.clearTimeout(id);
  }, [health.recoveredUntilMs]);

  const showReconnecting = health.phase === 'reconnecting' || health.phase === 'disconnected' || health.phase === 'error';
  const showRecovered = !showReconnecting && health.recoveredUntilMs !== null && health.recoveredUntilMs > nowMs;
  const visible = showReconnecting || showRecovered;

  const label = showReconnecting
    ? t('common.reconnecting')
    : t('common.backOnline');

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          key="realtime-connection-banner"
          initial={{ y: -14, opacity: 0, scale: 0.98 }}
          animate={{ y: 0, opacity: 1, scale: 1 }}
          exit={{ y: -14, opacity: 0, scale: 0.98 }}
          transition={{ duration: 0.18 }}
          className={cn(
            'pointer-events-none fixed left-1/2 top-[calc(env(safe-area-inset-top)+0.75rem)] z-[85] w-[min(calc(100vw-7rem),24rem)] -translate-x-1/2',
            className,
          )}
        >
          <div
            className={cn(
              'mx-auto flex min-h-9 items-center justify-center gap-2 rounded-full border px-3 py-2 text-center font-poppins text-[11px] font-semibold uppercase leading-tight shadow-2xl backdrop-blur-md sm:min-h-10 sm:px-4 sm:text-xs',
              showReconnecting
                ? 'border-red-300/60 bg-red-500/90 text-white'
                : 'border-emerald-200/60 bg-emerald-500/90 text-white',
            )}
          >
            {showReconnecting ? (
              <WifiOff className="size-4 shrink-0" />
            ) : (
              <CheckCircle2 className="size-4 shrink-0" />
            )}
            <span className="min-w-0 text-balance">{label}</span>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
