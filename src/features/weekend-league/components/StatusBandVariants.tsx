'use client';

import Image from 'next/image';
import Link from 'next/link';
import { ArrowRight, Clock, Ticket } from 'lucide-react';
import { poppins } from '../constants';
import { colors } from '@/lib/colors';

export const LEAGUE_TAB_HREF = '/events?tab=weekend-league';

const QP = 650;
const QP_TARGET = 1000;
const PCT = Math.round((QP / QP_TARGET) * 100);
const REMAINING = QP_TARGET - QP;

function Trophy({ className }: { className: string }) {
  return (
    <Image
      src="/assets/brand/world-cup-trophy.webp"
      alt=""
      width={420}
      height={420}
      className={className}
    />
  );
}

/**
 * A — Progress-first strip.
 * One line of identity, one big progress bar, one action. No step diagram.
 */
export function VariantProgressStrip() {
  return (
    <Link
      href={LEAGUE_TAB_HREF}
      className="group relative block overflow-hidden border-y border-white/8 bg-[#0A1428] transition-colors hover:bg-[#0C1830]"
    >
      <div
        className="pointer-events-none absolute inset-0"
        style={{ background: 'radial-gradient(90% 130% at 88% 50%, rgba(56,182,14,0.10) 0%, transparent 60%)' }}
      />
      <Trophy className="pointer-events-none absolute -right-4 top-1/2 hidden h-[150%] w-auto -translate-y-1/2 object-contain opacity-[0.10] lg:block" />

      <div className="relative z-10 mx-auto flex max-w-5xl flex-col gap-3 px-4 py-4 lg:flex-row lg:items-center lg:gap-8 lg:py-5">
        <div className="min-w-0 flex-1 space-y-2.5">
          <div className="flex items-baseline gap-3">
            <h2 className="text-xl uppercase italic leading-none text-white lg:text-[1.75rem]" style={poppins}>
              Weekend League
            </h2>
            <span className="text-[11px] uppercase tracking-wide text-brand-green-light" style={poppins}>
              Qualifying
            </span>
          </div>

          <div className="flex items-center gap-3">
            <div className="h-2 flex-1 overflow-hidden rounded-full bg-white/10">
              <div className="h-full rounded-full bg-brand-green-light" style={{ width: `${PCT}%` }} />
            </div>
            <div className="whitespace-nowrap text-sm uppercase text-white lg:text-base" style={poppins}>
              <span className="text-brand-green-light">{QP}</span>
              <span className="text-white/60"> / {QP_TARGET.toLocaleString()} QP</span>
            </div>
          </div>
        </div>

        <div className="flex shrink-0 items-center gap-4">
          <div className="flex items-center gap-1.5 text-white/70">
            <Clock className="size-4 text-brand-yellow" />
            <span className="text-sm uppercase" style={poppins}>Sat 14:00</span>
          </div>
          <span
            className="flex h-10 items-center gap-2 rounded-[8px] bg-brand-green-light px-4 text-[13px] uppercase tracking-wide text-black"
            style={poppins}
          >
            Enter
            <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5" />
          </span>
        </div>
      </div>
    </Link>
  );
}

/**
 * B — Ticket ledge.
 * Reads as a claimable ticket: perforated left edge, QP as the fill, minimal words.
 */
export function VariantTicketLedge() {
  return (
    <Link
      href={LEAGUE_TAB_HREF}
      className="group relative block overflow-hidden border-y border-white/8 bg-[#080F1F] transition-colors hover:bg-[#0A1428]"
    >
      <div className="absolute inset-y-0 left-0 w-1 bg-brand-green-light" />
      <Trophy className="pointer-events-none absolute right-8 top-1/2 hidden h-[170%] w-auto -translate-y-1/2 object-contain opacity-[0.07] lg:block" />

      <div className="relative z-10 mx-auto flex max-w-5xl items-center gap-5 px-5 py-5 lg:py-6">
        <div className="hidden size-14 shrink-0 items-center justify-center rounded-full border-2 border-brand-yellow text-brand-yellow lg:flex">
          <Ticket className="size-6" />
        </div>

        <div className="min-w-0 flex-1">
          <h2 className="text-lg uppercase italic leading-none text-white lg:text-2xl" style={poppins}>
            Weekend League
          </h2>
          <p className="mt-1.5 text-[13px] uppercase tracking-wide text-white/60" style={poppins}>
            <span className="text-brand-green-light">{REMAINING} QP</span> to your ticket
          </p>
          <div className="mt-2.5 h-1.5 max-w-sm overflow-hidden rounded-full bg-white/10">
            <div className="h-full rounded-full bg-brand-green-light" style={{ width: `${PCT}%` }} />
          </div>
        </div>

        <div className="shrink-0 text-right">
          <div className="text-sm uppercase text-brand-yellow lg:text-base" style={poppins}>
            Sat 14:00
          </div>
          <span
            className="mt-2 flex h-10 items-center justify-center gap-1.5 rounded-[8px] bg-brand-green-light px-4 text-[13px] uppercase tracking-wide text-black"
            style={poppins}
          >
            Play ranked
            <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5" />
          </span>
        </div>
      </div>
    </Link>
  );
}

/**
 * C — Big number.
 * The QP gap is the hero; everything else is a caption.
 */
export function VariantBigNumber() {
  return (
    <Link
      href={LEAGUE_TAB_HREF}
      className="group relative block overflow-hidden border-y border-white/8 bg-[#0A1428] transition-colors hover:bg-[#0C1830]"
    >
      <div
        className="pointer-events-none absolute inset-0"
        style={{ background: 'radial-gradient(70% 130% at 20% 50%, rgba(56,182,14,0.12) 0%, transparent 55%)' }}
      />
      <Trophy className="pointer-events-none absolute -right-8 top-1/2 hidden h-[160%] w-auto -translate-y-1/2 object-contain opacity-[0.12] lg:block" />

      <div className="relative z-10 mx-auto flex max-w-5xl items-center gap-6 px-4 py-5 lg:gap-10 lg:py-7">
        <div className="shrink-0">
          <div className="text-[2.75rem] leading-none text-brand-green-light lg:text-[4rem]" style={poppins}>
            {REMAINING}
          </div>
          <div className="mt-1 text-[11px] uppercase tracking-[0.2em] text-white/50" style={poppins}>
            QP to qualify
          </div>
        </div>

        <div className="h-14 w-px shrink-0 bg-white/10 lg:h-20" />

        <div className="min-w-0 flex-1">
          <h2 className="text-lg uppercase italic leading-none text-white lg:text-[1.9rem]" style={poppins}>
            Weekend League
          </h2>
          <p className="mt-1.5 text-[12px] uppercase tracking-wide text-white/55 lg:text-sm" style={poppins}>
            Sat 14:00 · Win ranked to earn QP
          </p>
          <div className="mt-3 h-1.5 max-w-md overflow-hidden rounded-full bg-white/10">
            <div className="h-full rounded-full bg-brand-green-light" style={{ width: `${PCT}%` }} />
          </div>
        </div>

        <span
          className="hidden h-11 shrink-0 items-center gap-2 rounded-[8px] bg-brand-green-light px-5 text-[13px] uppercase tracking-wide text-black lg:flex"
          style={poppins}
        >
          Enter
          <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5" />
        </span>
      </div>
    </Link>
  );
}

/**
 * D — Minimal rail, solid brand blue.
 * The rail itself is the brand blue surface; QP stays lime so it reads as
 * qualification progress, time stays yellow.
 */
export function VariantMinimalRail() {
  return (
    <Link
      href={LEAGUE_TAB_HREF}
      className="group relative block overflow-hidden rounded-[10px] transition-[filter] hover:brightness-110"
      style={{ backgroundColor: colors.blue.brand }}
    >
      <Trophy className="pointer-events-none absolute right-6 top-1/2 hidden h-[240%] w-auto -translate-y-1/2 object-contain opacity-[0.14] lg:block" />

      <div className="relative z-10 flex flex-wrap items-center gap-x-5 gap-y-2 px-4 py-3.5 md:px-6">
        <h2 className="text-base uppercase italic leading-none text-white lg:text-lg" style={poppins}>
          Weekend League
        </h2>

        <div className="flex min-w-[120px] flex-1 items-center gap-2.5">
          <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-black/25">
            <div className="h-full rounded-full bg-brand-green-light" style={{ width: `${PCT}%` }} />
          </div>
          <span className="whitespace-nowrap text-[13px] uppercase text-white/75" style={poppins}>
            <span className="text-brand-green-light">{QP}</span>/{QP_TARGET.toLocaleString()} QP
          </span>
        </div>

        <span className="whitespace-nowrap text-[13px] uppercase text-brand-yellow" style={poppins}>
          Sat 14:00
        </span>
        <ArrowRight className="size-4 shrink-0 text-white/70 transition-transform group-hover:translate-x-0.5" />
      </div>
    </Link>
  );
}

/**
 * D2 — Minimal rail, deep navy with a blue edge.
 * Same layout, quieter surface: brand blue appears as the left marker and glow
 * rather than the whole fill.
 */
export function VariantMinimalRailNavy() {
  return (
    <Link
      href={LEAGUE_TAB_HREF}
      className="group relative block overflow-hidden rounded-[10px] bg-[#0A1428] transition-colors hover:bg-[#0D1B36]"
    >
      <div
        className="pointer-events-none absolute inset-0"
        style={{ background: 'radial-gradient(80% 200% at 0% 50%, rgba(22,69,255,0.35) 0%, transparent 60%)' }}
      />
      <div className="absolute inset-y-0 left-0 w-[3px]" style={{ backgroundColor: colors.blue.brand }} />
      <Trophy className="pointer-events-none absolute right-6 top-1/2 hidden h-[240%] w-auto -translate-y-1/2 object-contain opacity-[0.10] lg:block" />

      <div className="relative z-10 flex flex-wrap items-center gap-x-5 gap-y-2 px-4 py-3.5 md:px-6">
        <h2 className="text-base uppercase italic leading-none text-white lg:text-lg" style={poppins}>
          Weekend League
        </h2>

        <div className="flex min-w-[120px] flex-1 items-center gap-2.5">
          <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-white/10">
            <div className="h-full rounded-full bg-brand-green-light" style={{ width: `${PCT}%` }} />
          </div>
          <span className="whitespace-nowrap text-[13px] uppercase text-white/70" style={poppins}>
            <span className="text-brand-green-light">{QP}</span>/{QP_TARGET.toLocaleString()} QP
          </span>
        </div>

        <span className="whitespace-nowrap text-[13px] uppercase text-brand-yellow" style={poppins}>
          Sat 14:00
        </span>
        <ArrowRight className="size-4 shrink-0 text-white/50 transition-transform group-hover:translate-x-0.5" />
      </div>
    </Link>
  );
}
