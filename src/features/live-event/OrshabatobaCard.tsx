'use client';

/**
 * The ორშაბათობა card on /events: the podcast's own studio is the card (a still from the 3D set), with the neon-sign
 * title, the two hosts and the set's materials — walnut slats, the desk's grass, the jersey-frame yellow. Every lobby
 * state lives here: sign-in, register / registered, closed / watch-only, the host's Start panel and errors.
 */

import type { ReactNode } from 'react';
import { Check, Loader2, Play, Users } from 'lucide-react';
import { cn } from '@/lib/utils';
import { orshabatobaDisplay } from '@/features/orshabatoba/fonts';
import type { liveEventCopy } from './liveEvent.copy';

type Copy = ReturnType<typeof liveEventCopy>;

const ART = '/assets/orshabatoba/events';
/** The set's materials. */
const WOOD = 'bg-[#1c120b] bg-[repeating-linear-gradient(90deg,rgba(255,255,255,0.035)_0_18px,rgba(0,0,0,0.28)_18px_20px)]';
const GRASS = 'h-1.5 bg-[linear-gradient(90deg,#2b6e1b,#58b52f_50%,#2b6e1b)]';
const FRAME_YELLOW = 'bg-[#f2d34f] text-black hover:bg-[#f6dc6a]';
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

function Kicker({ copy, live }: { copy: Copy; live: boolean }) {
  return live ? (
    <span className="inline-flex items-center gap-2 rounded-full bg-red-600 px-3 py-1 font-poppins text-[12px] font-black uppercase tracking-widest text-white shadow-[0_0_18px_rgba(220,38,38,0.6)]">
      <span className="relative flex size-2.5">
        <span className="absolute inline-flex size-full animate-ping rounded-full bg-white opacity-75" />
        <span className="relative inline-flex size-2.5 rounded-full bg-white" />
      </span>
      {copy.live}
    </span>
  ) : (
    <span className="inline-flex items-center rounded-full border border-white/20 bg-black/50 px-3 py-1 font-poppins text-[12px] font-black uppercase tracking-wider text-white backdrop-blur-sm">
      {copy.everyMonday}
    </span>
  );
}

function Hosts({ copy }: { copy: Copy }) {
  return (
    <div className="flex items-center gap-3">
      {(['tato', 'kala'] as const).map((id) => (
        <div key={id} className="flex items-center gap-2">
          {/* eslint-disable-next-line @next/next/no-img-element -- tiny static portrait */}
          <img
            src={`${ART}/host-${id}.webp`}
            width={44}
            height={44}
            alt=""
            className="size-11 rounded-full bg-black/40 object-cover ring-2 ring-[#f2d34f]/80"
          />
          <span className={cn(orshabatobaDisplay.className, 'text-[17px] text-white')}>{copy.hosts[id]}</span>
        </div>
      ))}
    </div>
  );
}

function CtaButton({ children, onClick, disabled }: { children: ReactNode; onClick?: () => void; disabled?: boolean }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={cn(
        orshabatobaDisplay.className,
        FRAME_YELLOW,
        'flex min-h-14 w-full items-center justify-center gap-2 rounded-2xl px-4 py-2 text-center text-[clamp(15px,4.6cqi,20px)] leading-tight shadow-[0_6px_0_#a8891d] transition-transform active:translate-y-0.5 active:shadow-[0_3px_0_#a8891d] disabled:cursor-not-allowed disabled:opacity-60',
      )}
    >
      {children}
    </button>
  );
}

export function EventLobby({
  copy, registered, status, entered, registering, onRegister, signedOut, onSignIn, host, error, compact,
}: {
  copy: Copy;
  /** Kept for callers; the weekly show always airs Monday 22:00. */
  scheduledAt?: string | null;
  registered: number | null;
  status: string | null;
  entered: boolean;
  registering?: boolean;
  onRegister?: () => void;
  signedOut?: boolean;
  onSignIn?: () => void;
  host?: { busy: boolean; message: string | null; onStart: () => void };
  error?: string | null;
  /** Beside the live 3D studio: no studio still, just the panel. */
  compact?: boolean;
}) {
  const open = status === 'entry_open';
  const notYet = status === 'scheduled' || status === 'content_pending' || status === 'ready';
  const live = status != null && LIVE_STATUSES.has(status);

  const action = (
    <div>
      {signedOut ? (
        <CtaButton onClick={onSignIn}>{copy.signIn}</CtaButton>
      ) : entered ? (
        <div className="rounded-2xl border-2 border-[#58b52f]/60 bg-[#58b52f]/15 p-4">
          <div className={cn(orshabatobaDisplay.className, 'flex items-center gap-2 text-[20px] text-[#8fe05f]')}>
            <Check className="size-5" aria-hidden /> {copy.registeredTitle}
          </div>
          <p className="mt-1 font-poppins text-[13px] font-semibold text-white/75">{copy.registeredBody}</p>
        </div>
      ) : open ? (
        <CtaButton onClick={onRegister} disabled={registering}>
          {registering ? copy.registering : copy.register}
        </CtaButton>
      ) : notYet ? (
        <p className="font-poppins text-[13px] font-semibold text-white/65">{copy.notOpenYet}</p>
      ) : (
        <p className="font-poppins text-[13px] font-semibold text-white/65">{copy.watchOnly}</p>
      )}
      {error && !entered && (
        <p role="alert" className="mt-3 font-poppins text-[13px] font-bold text-[#f2d34f]">{error}</p>
      )}
    </div>
  );

  const info = (
    <div className={cn(WOOD, 'relative px-5 pb-5 pt-4 sm:px-7 sm:pb-6')}>
      <p className="max-w-lg font-poppins text-[14px] font-semibold leading-snug text-white/80">{copy.subtitle}</p>
      <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
        <Hosts copy={copy} />
        {registered != null && (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-black/45 px-3 py-1.5 font-poppins text-[12px] font-bold text-white">
            <Users className="size-4 text-[#f2d34f]" aria-hidden /> {copy.registered(registered)}
          </span>
        )}
      </div>
      <div className="mt-5">{action}</div>
    </div>
  );

  return (
    <div className={cn('mx-auto w-full space-y-3', compact ? '' : 'max-w-3xl px-4 py-5')}>
      <section className="@container overflow-hidden rounded-[24px] border-2 border-[#5a3a22] bg-[#1c120b] shadow-[0_18px_50px_rgba(0,0,0,0.45)]">
        {compact ? (
          <div className={cn(WOOD, 'px-5 pt-5 sm:px-7')}>
            <Kicker copy={copy} live={live} />
            <NeonTitle className="mt-3">{copy.title}</NeonTitle>
          </div>
        ) : (
          <StudioHero>
            <div className="absolute inset-x-0 bottom-0 px-5 pb-4 sm:px-7 sm:pb-5">
              <Kicker copy={copy} live={live} />
              <NeonTitle className="mt-2">{copy.title}</NeonTitle>
            </div>
          </StudioHero>
        )}
        <div className={GRASS} aria-hidden />
        {info}
      </section>

      {host && (
        <section className={cn(WOOD, '@container overflow-hidden rounded-[24px] border-2 border-[#f2d34f]/70 p-5 sm:p-6')}>
          <div className="font-poppins text-[12px] font-black uppercase tracking-widest text-[#f2d34f]">{copy.hostTitle}</div>
          <p className="mt-2 font-poppins text-[13px] font-semibold text-white/75">{copy.hostBody}</p>
          <div className="mt-4">
            <CtaButton onClick={host.onStart} disabled={host.busy || !open}>
              {host.busy ? <Loader2 className="size-5 animate-spin" aria-hidden /> : <Play className="size-5" aria-hidden />}
              {host.busy ? copy.starting : copy.start}
            </CtaButton>
          </div>
          {host.message && (
            <p role="alert" className="mt-3 font-poppins text-[13px] font-bold text-[#f2d34f]">{host.message}</p>
          )}
        </section>
      )}

      <ul className="flex flex-col gap-1.5 rounded-[20px] border border-white/10 bg-black/30 px-4 py-3 sm:flex-row sm:flex-wrap sm:gap-x-5">
        {copy.rules.map((rule) => (
          <li key={rule} className="flex items-start gap-2 font-poppins text-[12px] font-semibold text-white/65">
            <span className="mt-1.5 size-1.5 shrink-0 rounded-full bg-[#58b52f]" aria-hidden /> {rule}
          </li>
        ))}
      </ul>
    </div>
  );
}
