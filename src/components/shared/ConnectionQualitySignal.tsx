'use client';

import { Wifi, WifiOff } from 'lucide-react';
import { useLocale } from '@/contexts/LocaleContext';
import { useUserPreferences } from '@/lib/preferences/userPreferences';
import { useRealtimeConnectionHealth } from '@/lib/realtime/connection-health';
import { cn } from '@/lib/utils';

interface ConnectionQualitySignalProps {
  className?: string;
}

export function ConnectionQualitySignal({ className }: ConnectionQualitySignalProps) {
  const { t } = useLocale();
  const { pingIndicatorEnabled } = useUserPreferences();
  const health = useRealtimeConnectionHealth();
  if (!pingIndicatorEnabled) return null;

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
  const pingText = health.rttMs !== null
    ? t('common.connectionPingMs', { ms: health.rttMs })
    : '...';

  return (
    <div
      role="status"
      aria-label={label}
      title={title}
      className={cn(
        'flex h-8 shrink-0 items-center justify-center gap-1.5 rounded-full border px-2.5 font-poppins text-[11px] font-semibold tabular-nums text-white shadow-[0_8px_26px_rgba(0,0,0,0.22)] backdrop-blur-md sm:h-10 sm:px-3 sm:text-xs',
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
      <span>{pingText}</span>
      <span className="sr-only">{label}</span>
    </div>
  );
}
