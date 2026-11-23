'use client';

/**
 * The ორშაბათობა lobby on /events (Weekend League promo card layout). Every lobby state lives here: sign-in, register /
 * registered, closed / watch-only, the host's Start panel and errors. StudioHero / NeonTitle are shared with NoLiveEvent.
 */

import { useEffect, useState, type ReactNode } from 'react';
import { Check, Loader2, Play, Users } from 'lucide-react';
import { cn } from '@/lib/utils';
import { wlNow } from '@/features/weekend-league/wlClock';
import { orshabatobaDisplay } from '@/features/orshabatoba/fonts';
import type { liveEventCopy } from './liveEvent.copy';

type Copy = ReturnType<typeof liveEventCopy>;

const ART = '/assets/orshabatoba/events';
/** The neon sign's glow, for the title. */
const NEON = '[text-shadow:0_0_6px_rgba(255,255,255,0.75),0_0_18px_rgba(255,255,255,0.4),0_0_36px_rgba(150,205,255,0.3)]';

const LIVE_STATUSES = new Set(['checkin', 'game_live', 'break']);

export function StudioHero({ dim, className, children }: { dim?: boolean; className?: string; children?: ReactNode }) {
  return (
    <div className={cn('relative w-full overflow-hidden', className)}>
      <picture>
        <source media="(max-width: 640px)" srcSet={`${ART}/studio-mobile.webp`} width={900} height={538} />
        <img
          src={`${ART}/studio-wide.webp`}
          width={1600}
          height={700}
          alt=""
          className={cn('block aspect-[900/538] w-full object-cover @lg:aspect-[16/7]', dim && 'opacity-45 saturate-[0.7]')}
        />
      </picture>
      <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(to_top,#1c120b_0%,rgba(28,18,11,0.85)_22%,rgba(28,18,11,0)_58%)]" />
      {children}
    </div>
  );
}

export function NeonTitle({ children, className }: { children: ReactNode; className?: string }) {
  return (
    // Sized by the card (the nearest @container), not the viewport: the word fits on one line from a 320px phone card to
    // a narrow side column to the full /events width.
    <h1 className={cn(orshabatobaDisplay.className, NEON, 'whitespace-nowrap text-[clamp(24px,11cqi,64px)] leading-none text-white', className)}>
      {children}
    </h1>
  );
}

/** Monday 22:00 Tbilisi (UTC+4, no DST) = Monday 18:00 UTC. Used when the server hasn't sent scheduled_at (signed out). */
function nextShowMs(nowMs: number): number {
  const d = new Date(nowMs);
  const daysSinceMonday = (d.getUTCDay() + 6) % 7;
  const monday = Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate() - daysSinceMonday, 18);
  // Keep tonight's show as the target for 3 hours after 22:00 (it starts when the hosts press Start).
  return nowMs < monday + 3 * 3_600_000 ? monday : monday + 7 * 86_400_000;
}

const pad = (n: number) => String(Math.max(0, n)).padStart(2, '0');

function Countdown({ copy, scheduledAt }: { copy: Copy; scheduledAt?: string | null }) {
  const [nowMs, setNowMs] = useState<number | null>(null);
  useEffect(() => {
    const tick = () => setNowMs(wlNow());
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, []);
  const parsed = scheduledAt ? Date.parse(scheduledAt) : NaN;
  const target = Number.isFinite(parsed) ? parsed : nowMs == null ? null : nextShowMs(nowMs);
  const leftMs = target == null || nowMs == null ? null : Math.max(0, target - nowMs);

  if (leftMs === 0) {
    return <p className="font-poppins text-[14px] font-semibold text-white">{copy.startsWhenHostsSay}</p>;
  }
  const total = Math.floor((leftMs ?? 0) / 1000);
  const values = [Math.floor(total / 86_400), Math.floor((total % 86_400) / 3600), Math.floor((total % 3600) / 60), total % 60];
  return (
    <div>
      <p className="font-poppins text-[14px] font-semibold text-white">{copy.startsIn}</p>
      <div className="mt-2 flex items-start justify-center gap-2" role="timer">
        {values.map((v, i) => (
          <div key={copy.countdownUnits[i]} className="flex items-start gap-2">
            {i > 0 && <span className="pt-1 font-poppins text-[15px] font-semibold text-white">:</span>}
            <div className="flex w-12 flex-col items-center">
              <span className="font-poppins text-[30px] font-semibold leading-none tabular-nums text-[#f2d34f]">
                {leftMs == null ? '00' : pad(v)}
              </span>
              <span className="mt-1.5 font-poppins text-[12px] font-semibold text-white/70">{copy.countdownUnits[i]}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function Hosts({ copy }: { copy: Copy }) {
  return (
    <div className="flex items-start justify-center gap-6 sm:gap-10">
      {(['tato', 'kala'] as const).map((id) => (
        <div key={id} className="flex flex-col items-center gap-2">
          {/* eslint-disable-next-line @next/next/no-img-element -- tiny static portrait */}
          <img
            src={`${ART}/host-${id}.webp`}
            width={120}
            height={120}
            alt=""
            className="size-24 rounded-full bg-black/40 object-cover ring-4 ring-[#f2d34f] shadow-[0_8px_24px_rgba(0,0,0,0.45)] sm:size-28"
          />
          <span className={cn(orshabatobaDisplay.className, 'text-[18px] text-white')}>{copy.hosts[id]}</span>
        </div>
      ))}
    </div>
  );
}

function CtaButton({ children, onClick, disabled, tone = 'green' }: {
  children: ReactNode; onClick?: () => void; disabled?: boolean; tone?: 'green' | 'yellow';
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={cn(
        'flex w-full items-center justify-center gap-2 rounded-[14px] py-3.5 font-poppins text-[17px] font-semibold uppercase transition-opacity hover:opacity-90 active:opacity-80 disabled:cursor-not-allowed disabled:opacity-60',
        tone === 'green' ? 'bg-brand-green text-white' : 'bg-[#f2d34f] text-black',
      )}
    >
      {children}
    </button>
  );
}

/**
 * The ორშაბათობა card on /events, laid out like the Weekend League promo card: title, registered count, format line,
 * three rule tiles, countdown to Monday 22:00, one CTA. Podcast touches are kept minimal: the show's title font, the
 * studio's walnut colour and the two hosts.
 */
export function EventLobby({
  copy, scheduledAt, registered, status, entered, registering, onRegister, signedOut, onSignIn, host, error, compact,
}: {
  copy: Copy;
  scheduledAt?: string | null;
  registered: number | null;
  status: string | null;
  entered: boolean;
  registering?: boolean;
  onRegister?: () => void;
  signedOut?: boolean;
  onSignIn?: () => void;
  host?: { busy: boolean; message: string | null; confirming?: boolean; onStart: () => void };
  error?: string | null;
  /** Beside the live 3D studio: fill the side column instead of the centred card width. */
  compact?: boolean;
}) {
  const open = status === 'entry_open';
  const notYet = status === 'scheduled' || status === 'content_pending' || status === 'ready';
  const live = status != null && LIVE_STATUSES.has(status);

  const action = signedOut ? (
    <CtaButton onClick={onSignIn}>{copy.signIn}</CtaButton>
  ) : entered ? (
    <div className="rounded-[14px] border-2 border-[#58b52f]/60 bg-[#58b52f]/15 px-4 py-3">
      <div className="flex items-center justify-center gap-2 font-poppins text-[17px] font-semibold uppercase text-[#8fe05f]">
        <Check className="size-5" aria-hidden /> {copy.registeredTitle}
      </div>
      <p className="mt-1 font-poppins text-[12px] font-semibold text-white/70">{copy.registeredBody}</p>
    </div>
  ) : open ? (
    <CtaButton onClick={onRegister} disabled={registering}>
      {registering ? copy.registering : copy.register}
    </CtaButton>
  ) : (
    <p className="font-poppins text-[13px] font-semibold text-white/65">{notYet ? copy.notOpenYet : copy.watchOnly}</p>
  );

  return (
    <div className={cn('mx-auto w-full space-y-3', compact ? '' : 'max-w-md px-4 py-5')}>
      <section
        className="@container relative w-full rounded-[20px] border border-[#5a3a22] px-5 pb-6 pt-6 text-center sm:px-7"
        style={{ backgroundImage: 'linear-gradient(180deg, #3a2414 0%, #1c120b 100%)' }}
      >
        <div className="flex justify-center">
          {live ? (
            <span className="inline-flex items-center gap-2 rounded-full bg-red-600 px-3 py-1 font-poppins text-[12px] font-black uppercase tracking-widest text-white">
              <span className="relative flex size-2">
                <span className="absolute inline-flex size-full animate-ping rounded-full bg-white opacity-75" />
                <span className="relative inline-flex size-2 rounded-full bg-white" />
              </span>
              {copy.live}
            </span>
          ) : (
            <span className="font-poppins text-[12px] font-semibold uppercase tracking-wider text-[#f2d34f]">{copy.everyMonday}</span>
          )}
        </div>

        <div className="mt-4"><Hosts copy={copy} /></div>

        <NeonTitle className="mt-4 text-[clamp(26px,9cqi,40px)]">{copy.title}</NeonTitle>
        {registered != null && (
          <p className="mt-1 inline-flex items-center gap-1.5 font-poppins text-[13px] font-semibold text-white/55">
            <Users className="size-4" aria-hidden /> {copy.registered(registered)}
          </p>
        )}

        <p className="mt-4 font-poppins text-[13px] font-semibold text-white">{copy.subtitle}</p>

        <div className="mt-3 grid grid-cols-3 gap-2">
          {copy.rules.map((rule) => (
            <div key={rule} className="rounded-[12px] bg-black/30 px-2 py-2.5 font-poppins text-[11px] font-semibold leading-snug text-white [overflow-wrap:anywhere]">
              {rule}
            </div>
          ))}
        </div>

        {!live && (status == null || notYet || open) && (
          <div className="mt-5"><Countdown copy={copy} scheduledAt={scheduledAt} /></div>
        )}

        <div className="mt-5">{action}</div>
        {error && !entered && (
          <p role="alert" className="mt-3 font-poppins text-[13px] font-bold text-[#f2d34f]">{error}</p>
        )}
      </section>

      {host && (
        <section className="rounded-[20px] border-2 border-[#f2d34f]/70 bg-[#1c120b] p-5 text-center">
          <div className="font-poppins text-[12px] font-black uppercase tracking-widest text-[#f2d34f]">{copy.hostTitle}</div>
          <p className="mt-2 font-poppins text-[13px] font-semibold text-white/75">{copy.hostBody}</p>
          <div className="mt-4">
            <CtaButton tone="yellow" onClick={host.onStart} disabled={host.busy || !open}>
              {host.busy ? <Loader2 className="size-5 animate-spin" aria-hidden /> : <Play className="size-5" aria-hidden />}
              {host.busy ? copy.starting : host.confirming ? copy.confirmTap : copy.start}
            </CtaButton>
          </div>
          {host.message && (
            <p role="alert" className="mt-3 font-poppins text-[13px] font-bold text-[#f2d34f]">{host.message}</p>
          )}
        </section>
      )}
    </div>
  );
}
