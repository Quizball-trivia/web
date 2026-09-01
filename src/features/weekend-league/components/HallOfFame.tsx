'use client';

// Past champions + the all-time medal table for the events page. Ranked by
// MEDALS, never by summed points: the 2026-08-25 ranked-parity rework roughly
// 2.4x'd per-game scores, so cross-edition point totals are meaningless.
// Per-edition points are still shown, where they do mean something.

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Trophy } from 'lucide-react';
import { useLocale } from '@/contexts/LocaleContext';
import { getWeekendLeagueHallOfFame, type WlHallOfFameResponse } from '@/lib/api/endpoints';
import { queryKeys } from '@/lib/queries/queryKeys';
import { poppins } from '../constants';

const MEDAL_TINT = ['text-brand-gold', 'text-white/70', 'text-[#CD7F32]'] as const;

/** "2026-08-29" (the event's Saturday) as a short Georgia-time date label. */
function editionLabel(weekKey: string, locale: string): string {
  const ms = Date.parse(`${weekKey}T00:00:00Z`);
  if (Number.isNaN(ms)) return weekKey;
  return new Intl.DateTimeFormat(locale === 'ka' ? 'ka-GE' : locale === 'es' ? 'es-ES' : 'en-GB', {
    day: 'numeric', month: 'short', timeZone: 'UTC',
  }).format(ms);
}

function Medals({ gold, silver, bronze }: { gold: number; silver: number; bronze: number }) {
  const cells: Array<[number, string]> = [[gold, '🥇'], [silver, '🥈'], [bronze, '🥉']];
  return (
    <span className="flex items-center gap-2 tabular-nums">
      {cells.map(([count, icon], i) => (
        <span
          key={icon}
          className={`flex items-center gap-0.5 text-[13px] ${count > 0 ? 'text-white' : 'text-white/25'}`}
          style={poppins}
        >
          <span className={count > 0 ? '' : 'grayscale opacity-50'} aria-hidden>{icon}</span>
          {count}
          <span className="sr-only">{['gold', 'silver', 'bronze'][i]}</span>
        </span>
      ))}
    </span>
  );
}

export function HallOfFame({ data }: { data?: WlHallOfFameResponse }) {
  const { t, locale } = useLocale();
  const [tab, setTab] = useState<'editions' | 'allTime'>('editions');
  const query = useQuery({
    queryKey: queryKeys.weekendLeague.hallOfFame(),
    queryFn: getWeekendLeagueHallOfFame,
    staleTime: 5 * 60_000,
    enabled: data == null,
  });
  const hof = data ?? query.data;
  if (!hof || hof.editions.length === 0) return null;

  const tabs: Array<{ key: 'editions' | 'allTime'; label: string }> = [
    { key: 'editions', label: t('weekendLeague.hofPastWinners') },
    { key: 'allTime', label: t('weekendLeague.hofAllTime') },
  ];

  return (
    <section>
      <div className="mb-3 flex items-center justify-center gap-2">
        <Trophy className="size-5 text-brand-gold" />
        <h2 className="text-lg uppercase tracking-wide text-white" style={poppins}>
          {t('weekendLeague.hofTitle')}
        </h2>
      </div>

      <div className="mb-3 flex justify-center gap-1.5">
        {tabs.map((tb) => (
          <button
            key={tb.key}
            type="button"
            onClick={() => setTab(tb.key)}
            className={`rounded-full px-3.5 py-1.5 text-[12px] uppercase tracking-wide transition-colors ${
              tab === tb.key ? 'bg-brand-green text-white' : 'bg-white/[0.06] text-white/50 hover:text-white'
            }`}
            style={poppins}
          >
            {tb.label}
          </button>
        ))}
      </div>

      {tab === 'editions' ? (
        <div className="space-y-2.5">
          {hof.editions.map((edition) => (
            <div key={edition.week_key} className="rounded-[16px] bg-white/[0.04] px-4 py-3">
              <div className="mb-2 flex items-baseline justify-between">
                <span className="text-[13px] uppercase text-white" style={poppins}>
                  {editionLabel(edition.week_key, locale)}
                </span>
                <span className="text-[11px] text-white/40" style={poppins}>
                  {t('weekendLeague.hofEntrants', { count: edition.entrants })}
                </span>
              </div>
              <ol className="space-y-1">
                {edition.podium.map((p) => (
                  <li key={p.rank} className="flex items-center gap-2.5">
                    <span className={`w-5 shrink-0 text-center text-[14px] ${MEDAL_TINT[p.rank - 1]}`}>
                      {p.rank === 1 ? '🥇' : p.rank === 2 ? '🥈' : '🥉'}
                    </span>
                    <span
                      className={`min-w-0 flex-1 truncate text-[14px] ${p.rank === 1 ? 'text-white' : 'text-white/70'}`}
                      style={poppins}
                    >
                      {p.nickname ?? '—'}
                    </span>
                    <span className="shrink-0 text-[13px] tabular-nums text-white/50" style={poppins}>
                      {p.points.toLocaleString()}
                    </span>
                  </li>
                ))}
              </ol>
            </div>
          ))}
        </div>
      ) : (
        <div className="overflow-hidden rounded-[16px] bg-white/[0.04]">
          {hof.all_time.map((row, i) => (
            <div
              key={`${row.nickname}-${i}`}
              className="flex items-center gap-3 px-4 py-2.5 [&+&]:border-t [&+&]:border-white/[0.06]"
            >
              <span className="w-5 shrink-0 text-center text-[13px] tabular-nums text-white/40" style={poppins}>
                {i + 1}
              </span>
              <span className="min-w-0 flex-1 truncate text-[14px] text-white" style={poppins}>
                {row.nickname ?? '—'}
              </span>
              <Medals gold={row.gold} silver={row.silver} bronze={row.bronze} />
            </div>
          ))}
          <p className="px-4 pb-3 pt-1 text-[11px] leading-snug text-white/35" style={poppins}>
            {t('weekendLeague.hofMedalNote')}
          </p>
        </div>
      )}
    </section>
  );
}
