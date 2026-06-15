'use client';

import { Wifi, WifiOff } from 'lucide-react';
import { useLocale } from '@/contexts/LocaleContext';
import { useRealtimeConnectionHealth } from '@/lib/realtime/connection-health';
import { cn } from '@/lib/utils';

interface ConnectionQualitySignalProps {
  className?: string;
}

export function ConnectionQualitySignal({ className }: ConnectionQualitySignalProps) {
  const { t } = useLocale();
  const health = useRealtimeConnectionHealth();
  const disconnected = health.phase === 'reconnecting' || health.phase === 'disconnected' || health.phase === 'error';
  const label = disconnected
    ? t('common.reconnecting')
    : health.tier === 'bad'
      ? t('common.connectionBad')
      : health.tier === 'unstable'
        ? t('common.connectionUnstable')
        : health.tier === 'good'
          ? t('common.connectionStable')
          : t('common.connectionChecking');
  const title = health.rttMs !== null
    ? `${label} · ${t('common.connectionPingMs', { ms: health.rttMs })}`
    : label;

  return (
    <div
      role="status"
      aria-label={label}
      title={title}
      className={cn(
        'flex size-8 shrink-0 items-center justify-center rounded-full border text-white shadow-[0_8px_26px_rgba(0,0,0,0.22)] backdrop-blur-md sm:size-10',
        disconnected || health.tier === 'bad'
          ? 'border-red-300/70 bg-red-500/80'
          : health.tier === 'unstable'
            ? 'border-brand-yellow/80 bg-brand-yellow/85 text-brand-blue'
            : health.tier === 'good'
              ? 'border-emerald-200/70 bg-emerald-500/75'
              : 'border-white/25 bg-black/25 text-white/80',
        className,
      )}
    >
      {disconnected ? <WifiOff className="size-4 sm:size-5" /> : <Wifi className="size-4 sm:size-5" />}
      <span className="sr-only">{label}</span>
    </div>
  );
}
