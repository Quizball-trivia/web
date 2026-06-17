'use client';

import { Wifi, WifiOff } from 'lucide-react';
import { useLocale } from '@/contexts/LocaleContext';
import { useUserPreferences } from '@/lib/preferences/userPreferences';
import { useRealtimeConnectionHealth, type RealtimeConnectionHealth } from '@/lib/realtime/connection-health';
import { cn } from '@/lib/utils';

interface ConnectionQualitySignalProps {
  className?: string;
  /** Pill size. `sm` (default) matches the coins pill (h-8); `xs` is a touch
   *  smaller for the mobile header where it sits next to the currency pills. */
  size?: 'xs' | 'sm';
  /** Preview/dev only: force a connection-health state instead of reading the
   *  live socket, and bypass the pingIndicatorEnabled gate. Used by
   *  /dev/animations to iterate on every tier without a real connection. */
  healthOverride?: Pick<RealtimeConnectionHealth, 'phase' | 'tier' | 'rttMs'>;
}

const SIZE = {
  xs: { box: 'h-7 px-2 text-[10px] gap-1', icon: 'size-3' },
  sm: { box: 'h-8 px-2.5 text-[11px] gap-1', icon: 'size-3.5' },
} as const;

export function ConnectionQualitySignal({ className, size = 'sm', healthOverride }: ConnectionQualitySignalProps) {
  const { t } = useLocale();
  const { pingIndicatorEnabled } = useUserPreferences();
  const liveHealth = useRealtimeConnectionHealth();
  const health = healthOverride ?? liveHealth;
  const s = SIZE[size];
  if (!healthOverride && !pingIndicatorEnabled) return null;

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
        // Compact pill — `sm` matches the coins/tickets pills (h-8); `xs` is
        // slightly smaller for the mobile header.
        'flex shrink-0 items-center justify-center rounded-full border font-poppins font-semibold tabular-nums text-white shadow-[0_8px_26px_rgba(0,0,0,0.22)] backdrop-blur-md',
        s.box,
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
      {disconnected ? <WifiOff className={s.icon} /> : <Wifi className={s.icon} />}
      <span>{pingText}</span>
      <span className="sr-only">{label}</span>
    </div>
  );
}
