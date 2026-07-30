'use client';

import { useEffect, useState } from 'react';
import { useLocale } from '@/contexts/LocaleContext';
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
}: {
  targetMs: number;
  size?: 'sm' | 'md';
  accent?: string;
  /** Drop the boxed segments and render the digits straight on the surface. */
  plain?: boolean;
}) {
  const { t } = useLocale();
  const [remaining, setRemaining] = useState<number | null>(null);

  useEffect(() => {
    const tick = () => setRemaining(targetMs - Date.now());
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [targetMs]);

  const segs = segments(remaining ?? 0);
  const numClass = size === 'sm' ? 'text-2xl' : 'text-4xl sm:text-5xl';
  const boxClass = plain
    ? 'min-w-[2.5rem]'
    : size === 'sm'
      ? 'min-w-[3rem] px-2 py-1.5 rounded-2xl border-2 border-white/10 bg-surface-card-deep'
      : 'min-w-[4.25rem] px-3 py-2.5 rounded-2xl border-2 border-white/10 bg-surface-card-deep';

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
            <span className="mt-1.5 font-poppins text-[10px] font-bold uppercase tracking-widest text-white/40">
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
