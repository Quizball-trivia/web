'use client';

// Weekend League promo card — Figma node 1722:253 (owner design, 2026-08-30).
// Blue gradient card: title, registered count, format line, three stage
// mini-cards, voucher artwork + prize note, countdown to game 1, start CTA.

import { useEffect, useState } from 'react';
import Image from 'next/image';
import { useQuery } from '@tanstack/react-query';
import { X } from 'lucide-react';
import { useLocale } from '@/contexts/LocaleContext';
import { getWeekendLeagueCurrent } from '@/lib/api/endpoints';
import { queryKeys } from '@/lib/queries/queryKeys';
import { useAuthStore } from '@/stores/auth.store';
import { wlNow } from '../wlClock';

const poppins = { fontFamily: "'Poppins', sans-serif", fontWeight: 600 } as const;

/** Figma-specific shades with no global token: stage-card fill and the
 *  gradient's bottom stop. */
const STAGE_CARD_BG = '#123CCD';
const CARD_GRADIENT = 'linear-gradient(180deg, #1645FF 0%, #1A35A1 100%)';
const CLOSE_RED = '#FB3101';

function pad(n: number): string {
  return String(Math.max(0, n)).padStart(2, '0');
}

function Countdown({ targetMs }: { targetMs: number | null }) {
  const { t } = useLocale();
  const [leftMs, setLeftMs] = useState<number | null>(null);
  useEffect(() => {
    if (targetMs == null) {
      setLeftMs(null);
      return;
    }
    // wlNow: the server-synced WL clock — device skew must not shift kickoff.
    const tick = () => setLeftMs(Math.max(0, targetMs - wlNow()));
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [targetMs]);

  const total = Math.floor((leftMs ?? 0) / 1000);
  const cells = [
    { v: Math.floor(total / 86_400), label: t('weekendLeague.promoDays') },
    { v: Math.floor((total % 86_400) / 3600), label: t('weekendLeague.promoHours') },
    { v: Math.floor((total % 3600) / 60), label: t('weekendLeague.promoMinutes') },
    { v: total % 60, label: t('weekendLeague.promoSeconds') },
  ];
  return (
    <div className="flex items-start justify-center gap-2">
      {cells.map((c, i) => (
        <div key={c.label} className="flex items-start gap-2">
          {i > 0 && (
            <span className="pt-1 text-[15px] text-white" style={poppins}>:</span>
          )}
          <div className="flex w-12 flex-col items-center">
            <span
              className="text-[30px] leading-none text-brand-yellow tabular-nums"
              style={poppins}
            >
              {leftMs == null ? '00' : pad(c.v)}
            </span>
            <span className="mt-1.5 text-[13px] text-white" style={poppins}>{c.label}</span>
          </div>
        </div>
      ))}
    </div>
  );
}

export function WeekendLeaguePromoCard({
  registeredCount,
  kickoffMs,
  finalists = 24,
  ctaLabel,
  qp = null,
  qpTarget = 200,
  onStart,
  onClose,
}: {
  registeredCount: number;
  /** Game-1 kickoff; null renders a 00:00:00:00 placeholder. */
  kickoffMs: number | null;
  finalists?: number;
  /** Overrides the CTA text — the grind path must not masquerade as entry. */
  ctaLabel?: string;
  /** Player's QP balance; renders the progress-to-entry bar when below target. */
  qp?: number | null;
  qpTarget?: number;
  onStart: () => void;
  onClose?: () => void;
}) {
  const { t } = useLocale();
  const stages = [
    { title: t('weekendLeague.promoStage1'), highlight: '1/3', prefix: t('weekendLeague.promoAdvancePrefix'), suffix: t('weekendLeague.promoAdvanceSuffix') },
    { title: t('weekendLeague.promoStage2'), highlight: '1/3', prefix: t('weekendLeague.promoAdvancePrefix'), suffix: t('weekendLeague.promoAdvanceSuffix') },
    { title: t('weekendLeague.promoStage3'), highlight: String(finalists), prefix: t('weekendLeague.promoFinalPrefix'), suffix: t('weekendLeague.promoFinalSuffix') },
  ];

  return (
    <div
      className="relative w-full max-w-md rounded-[20px] px-5 pb-6 pt-9 text-center sm:px-7"
      style={{ backgroundImage: CARD_GRADIENT }}
    >
      {onClose && (
        <button
          type="button"
          onClick={onClose}
          aria-label={t('common.close')}
          className="absolute right-4 top-4 flex size-9 items-center justify-center rounded-[8px] transition-opacity hover:opacity-85"
          style={{ backgroundColor: CLOSE_RED }}
        >
          <X className="size-5 text-white" strokeWidth={3} />
        </button>
      )}

      <h2 className="text-[28px] uppercase leading-tight text-white" style={poppins}>
        {t('weekendLeague.promoTitle')}
      </h2>
      <p className="mt-1 text-[13px] text-white/50" style={poppins}>
        {t('weekendLeague.promoRegistered', { n: registeredCount })}
      </p>

      <p className="mt-4 text-[13px] text-white" style={poppins}>
        {t('weekendLeague.promoFormat', { finalists })}
      </p>

      <div className="mt-3 grid grid-cols-3 gap-2">
        {stages.map((s) => (
          <div key={s.title} className="rounded-[12px] px-2 py-2.5" style={{ backgroundColor: STAGE_CARD_BG }}>
            <div className="text-[13px] text-white/50" style={poppins}>{s.title}</div>
            <div className="mt-1 text-[10.5px] leading-snug text-white" style={poppins}>
              {s.prefix}
              <span className="text-brand-yellow">{s.highlight}</span>
              {s.suffix}
            </div>
          </div>
        ))}
      </div>

      {/* Prize: voucher artwork overlapping the white note card, as designed. */}
      <div className="relative mt-5 flex items-center">
        <Image
          src="/assets/wl-promo-vouchers.png"
          alt=""
          width={640}
          height={640}
          priority
          sizes="(max-width: 640px) 46vw, 200px"
          className="relative z-10 -ml-3 w-[46%] shrink-0 -rotate-2 object-contain"
        />
        <div className="-ml-6 flex-1 rounded-[14px] bg-white py-4 pl-9 pr-3 text-center">
          <p className="text-[12px] leading-snug text-black" style={poppins}>
            {t('weekendLeague.promoWinnerGets')}
          </p>
          <p className="my-0.5 text-[19px] uppercase leading-tight" style={{ ...poppins, fontWeight: 800 }}>
            <span className="text-brand-green">200₾ </span>
            <span className="text-black">{t('weekendLeague.promoVoucher')}</span>
          </p>
          <p className="text-[12px] leading-snug text-black" style={poppins}>
            {t('weekendLeague.promoStores')}
          </p>
        </div>
      </div>

      <p className="mt-5 text-[14px] text-white" style={poppins}>
        {t('weekendLeague.promoStartsIn')}
      </p>
      <div className="mt-2">
        <Countdown targetMs={kickoffMs} />
      </div>

      {qp != null && qp < qpTarget && (
        <div className="mx-auto mt-5 w-full max-w-[320px]">
          <div className="text-[15px] text-white" style={poppins}>
            {qp.toLocaleString()}
            <span className="text-[12px] text-white/60"> / {qpTarget.toLocaleString()} QP</span>
          </div>
          <div className="mt-1.5 flex items-center gap-2">
            <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-black/25">
              <div
                className="h-full rounded-full bg-brand-green-light transition-[width] duration-500"
                style={{ width: `${Math.min(100, Math.round((qp / qpTarget) * 100))}%` }}
              />
            </div>
            <span className="text-[11px] text-brand-green-light" style={poppins}>
              {Math.min(100, Math.round((qp / qpTarget) * 100))}%
            </span>
          </div>
          <div className="mt-1 text-[11px] uppercase tracking-wide text-white/60" style={poppins}>
            {t('weekendLeague.qpNeeded', { count: qpTarget - qp })}
          </div>
        </div>
      )}

      <button
        type="button"
        onClick={onStart}
        className="mt-5 w-full rounded-[14px] bg-brand-green py-3.5 text-[17px] uppercase text-white transition-opacity hover:opacity-90 active:opacity-80"
        style={poppins}
      >
        {ctaLabel ?? t('weekendLeague.promoCta')}
      </button>
    </div>
  );
}

/** Live-data promo card: registered count + game-1 kickoff from /current.
 *  Renders nothing until a tournament row is available. */
export function WeekendLeaguePromoCardLive({
  onStart,
  onClose,
}: {
  onStart: () => void;
  onClose?: () => void;
}) {
  const userId = useAuthStore((state) => state.user?.id);
  const query = useQuery({
    queryKey: queryKeys.weekendLeague.current(),
    queryFn: getWeekendLeagueCurrent,
    staleTime: 30_000,
    enabled: userId != null,
  });
  const tournament = query.data?.tournament ?? null;
  if (!tournament) return null;
  const kickoff = tournament.qualifier_starts_at ? Date.parse(tournament.qualifier_starts_at) : NaN;
  return (
    <WeekendLeaguePromoCard
      registeredCount={tournament.registered_count ?? 0}
      kickoffMs={Number.isFinite(kickoff) ? kickoff : null}
      onStart={onStart}
      onClose={onClose}
    />
  );
}
