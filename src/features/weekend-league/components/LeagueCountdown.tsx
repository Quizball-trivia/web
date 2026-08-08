'use client';

import { useEffect, useState } from 'react';
import { useLocale } from '@/contexts/LocaleContext';
import { wlNow } from '../wlClock';
import { poppins } from '../constants';

interface Segment {
  value: number;
  /** Stable key — the visible label is translated at render. */
  unit: 'days' | 'hrs' | 'min' | 'sec';
}

function segments(remainingMs: number): Segment[] {
  const clamped = Math.max(0, remainingMs);
  const totalSec = Math.floor(clamped / 1000);
  return [
    { value: Math.floor(totalSec / 86400), unit: 'days' },
    { value: Math.floor((totalSec % 86400) / 3600), unit: 'hrs' },
    { value: Math.floor((totalSec % 3600) / 60), unit: 'min' },
    { value: totalSec % 60, unit: 'sec' },
  ];
}

/**
 * Big segmented countdown to an absolute epoch-ms target. Ticks every second,
 * client-only (renders a stable placeholder until mounted so SSR matches).
 */
export function LeagueCountdown({
  targetMs,
  size = 'md',
  accent = 'text-brand-yellow',
  plain = false,
  labelClass = 'text-white/40',
}: {
  targetMs: number;
  size?: 'sm' | 'md';
  accent?: string;
  /** Drop the boxed segments and render the digits straight on the surface. */
  plain?: boolean;
  /** Colour for the unit labels — override on light surfaces. */
  labelClass?: string;
}) {
  const { t } = useLocale();
  const [remaining, setRemaining] = useState<number | null>(null);

  useEffect(() => {
    // Server-corrected clock: device skew must never change when the event
    // actually starts (wlNow == Date.now until the first /current poll syncs).
    const tick = () => setRemaining(targetMs - wlNow());
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [targetMs]);

  // Zero is a moment, not a state: the next phase lands within one fast poll,
  // and a frozen 00:00 read as "broken" in playtests. Pulse "starting" instead.
  if (remaining != null && remaining <= 0) {
    return (
      <div className={`animate-pulse font-poppins text-xl font-black uppercase tracking-widest ${accent}`} style={poppins} role="timer">
        {t('weekendLeague.startingNow')}
      </div>
    );
  }

  const segs = segments(remaining ?? 0);
  const numClass = size === 'sm' ? 'text-2xl' : 'text-4xl sm:text-5xl';
  // Digits sit straight on the surface — no boxes or borders around segments.
  const boxClass = plain
    ? 'min-w-[2.5rem]'
    : size === 'sm'
      ? 'min-w-[3rem] px-1 py-1'
      : 'min-w-[4.25rem] px-1.5 py-1.5';

  return (
    <div className="flex items-stretch gap-2" role="timer" aria-live="off">
      {segs.map((seg, i) => (
        <div key={seg.unit} className="flex items-stretch gap-2">
          <div className={`flex flex-col items-center ${boxClass}`}>
            <span
              className={`${numClass} ${accent} tabular-nums leading-none`}
              style={poppins}
              suppressHydrationWarning
            >
              {remaining == null ? '—' : String(seg.value).padStart(2, '0')}
            </span>
            <span className={`mt-1.5 font-poppins text-[11px] font-black uppercase tracking-widest ${labelClass}`}>
              {t(`weekendLeague.${seg.unit}`)}
            </span>
          </div>
          {i < segs.length - 1 && (
            <span className={`self-center ${accent} ${size === 'sm' ? 'text-xl' : 'text-3xl'} font-black leading-none`}>:</span>
          )}
        </div>
      ))}
    </div>
  );
}
