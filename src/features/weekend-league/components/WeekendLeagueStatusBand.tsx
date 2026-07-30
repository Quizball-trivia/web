'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Clock, Gamepad2, ChevronRight } from 'lucide-react';
import { poppins } from '../constants';

export type QualificationStatus = 'qualifying' | 'ready' | 'registered' | 'live';

const QP_TARGET = 1000;

const STATUS_LABEL: Record<QualificationStatus, string> = {
  qualifying: 'QUALIFYING',
  ready: 'READY',
  registered: 'REGISTERED',
  live: 'LIVE',
};

const CTA_LABEL: Record<QualificationStatus, string> = {
  qualifying: 'PLAY RANKED',
  ready: 'REDEEM TICKET',
  registered: 'TICKET SECURED',
  live: 'JOIN WEEKEND LEAGUE',
};

function StepIcon({ children, accent }: { children: React.ReactNode; accent: 'green' | 'yellow' }) {
  return (
    <div
      className={`flex size-11 shrink-0 items-center justify-center rounded-full border-2 ${
        accent === 'green'
          ? 'border-brand-green-light text-brand-green-light'
          : 'border-brand-yellow text-brand-yellow'
      }`}
    >
      {children}
    </div>
  );
}

function QpTicketGlyph({ className = 'size-5' }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden>
      <path
        d="M3 8.5V6.5a1 1 0 0 1 1-1h16a1 1 0 0 1 1 1v2a2.5 2.5 0 0 0 0 5v2a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1v-2a2.5 2.5 0 0 0 0-5Z"
        stroke="currentColor"
        strokeWidth="1.8"
      />
      <text
        x="12"
        y="14.6"
        textAnchor="middle"
        fontSize="7.5"
        fontWeight="700"
        fill="currentColor"
        fontFamily="Poppins, sans-serif"
      >
        QP
      </text>
    </svg>
  );
}

function StepArrow() {
  return (
    <div className="hidden h-px flex-1 items-center lg:flex" aria-hidden>
      <div className="h-px w-full bg-white/20" />
      <ChevronRight className="-ml-2 size-4 shrink-0 text-white/30" />
    </div>
  );
}

interface WeekendLeagueStatusBandProps {
  qp?: number;
  status?: QualificationStatus;
  kickoffLabel?: string;
  leagueHref?: string;
  onPlayRanked?: () => void;
}

/**
 * The weekly objective band: PLAY RANKED → EARN QP → GET YOUR TICKET.
 * Sits full-bleed under the nav, separated by hairlines rather than a card
 * outline, so it reads as part of the page rather than another mode tile.
 */
export function WeekendLeagueStatusBand({
  qp = 650,
  status = 'qualifying',
  kickoffLabel = 'SAT 14:00',
  leagueHref = '/events?tab=weekend-league',
  onPlayRanked,
}: WeekendLeagueStatusBandProps) {
  const router = useRouter();
  const clamped = Math.max(0, Math.min(qp, QP_TARGET));
  const pct = Math.round((clamped / QP_TARGET) * 100);
  const remaining = Math.max(0, QP_TARGET - clamped);
  const ctaDisabled = status === 'registered';

  const handleCta = () => {
    if (ctaDisabled) return;
    if (status === 'qualifying' && onPlayRanked) {
      onPlayRanked();
      return;
    }
    router.push(leagueHref);
  };

  const steps = [
    { key: 'play', label: 'PLAY RANKED', accent: 'green' as const, icon: <Gamepad2 className="size-5" /> },
    { key: 'earn', label: 'EARN QP', accent: 'green' as const, icon: <QpTicketGlyph /> },
    { key: 'ticket', label: 'GET YOUR TICKET', accent: 'yellow' as const, icon: <QpTicketGlyph /> },
  ];

  return (
    <section className="relative overflow-hidden border-y border-white/8 bg-[#0A1428]">
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            'radial-gradient(120% 140% at 12% 0%, rgba(56,182,14,0.10) 0%, transparent 55%), radial-gradient(90% 120% at 92% 100%, rgba(22,69,255,0.16) 0%, transparent 60%)',
        }}
      />

      <Image
        src="/assets/brand/world-cup-trophy.webp"
        alt=""
        width={420}
        height={420}
        className="pointer-events-none absolute -right-6 top-1/2 hidden h-[130%] w-auto -translate-y-1/2 object-contain opacity-[0.13] lg:block"
      />

      <div className="relative z-10 mx-auto flex max-w-5xl flex-col gap-4 px-4 py-5 lg:min-h-[200px] lg:flex-row lg:items-center lg:gap-8 lg:py-6">
        <div className="min-w-0 flex-1 space-y-4">
          <div className="flex flex-wrap items-center gap-3">
            <h2
              className="text-[1.6rem] uppercase italic leading-none text-white lg:text-[2.5rem]"
              style={poppins}
            >
              Weekend League
            </h2>
            <span
              className="rounded-full border border-brand-green-light px-3 py-1 text-[10px] uppercase leading-none tracking-wider text-brand-green-light lg:text-xs"
              style={poppins}
            >
              {STATUS_LABEL[status]}
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-x-3 gap-y-2.5 lg:flex-nowrap lg:gap-4">
            {steps.map((step, i) => (
              <div key={step.key} className="flex min-w-0 flex-1 items-center gap-3">
                <StepIcon accent={step.accent}>{step.icon}</StepIcon>
                <span
                  className="whitespace-nowrap text-[11px] uppercase tracking-wide text-white lg:text-sm"
                  style={poppins}
                >
                  {step.label}
                </span>
                {i < steps.length - 1 && <StepArrow />}
              </div>
            ))}
          </div>

          <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
            <div className="whitespace-nowrap text-lg uppercase text-white lg:text-2xl" style={poppins}>
              <span className="text-brand-green-light">{clamped}</span>
              <span className="text-white/70"> / {QP_TARGET.toLocaleString()} QP</span>
            </div>
            <div className="h-2.5 min-w-[140px] flex-1 overflow-hidden rounded-full bg-white/10">
              <div
                className="h-full rounded-full bg-brand-green-light transition-all duration-500"
                style={{ width: `${pct}%` }}
              />
            </div>
            <div className="whitespace-nowrap text-[11px] uppercase tracking-wide text-white/70 lg:text-sm" style={poppins}>
              {remaining} QP to qualify
            </div>
          </div>
        </div>

        <div className="flex shrink-0 items-center justify-between gap-4 border-t border-white/8 pt-4 lg:w-[230px] lg:flex-col lg:items-start lg:justify-center lg:gap-3 lg:border-l lg:border-t-0 lg:pl-8 lg:pt-0">
          <div className="flex items-center gap-2">
            <Clock className="size-5 shrink-0 text-brand-yellow" />
            <span className="text-base uppercase text-white lg:text-xl" style={poppins}>
              {kickoffLabel}
            </span>
          </div>

          <div className="flex flex-col items-end gap-2 lg:w-full lg:items-stretch">
            <button
              type="button"
              onClick={handleCta}
              disabled={ctaDisabled}
              className="flex h-11 items-center justify-center rounded-[8px] bg-brand-green-light px-5 text-[13px] uppercase tracking-wide text-black transition-colors hover:bg-brand-green-bright disabled:cursor-default disabled:opacity-60 lg:w-full"
              style={poppins}
            >
              {CTA_LABEL[status]}
            </button>
            <Link
              href={leagueHref}
              className="flex items-center gap-1 text-[10px] uppercase tracking-wide text-white/60 transition-colors hover:text-white lg:text-[11px]"
              style={poppins}
            >
              View Weekend League
              <ChevronRight className="size-3.5" />
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
