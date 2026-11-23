'use client';

/**
 * The ორშაბათობა lobby on /events (Weekend League promo card layout). Every lobby state lives here: sign-in, register /
 * registered, closed / watch-only, the host's Start panel and errors. StudioHero / NeonTitle are shared with NoLiveEvent.
 */

import type { ReactNode } from 'react';
import Link from 'next/link';
import { Check, Loader2, Play, Tv, Users } from 'lucide-react';
import { cn } from '@/lib/utils';
import { orshabatobaDisplay } from '@/features/orshabatoba/fonts';
import type { liveEventCopy } from './liveEvent.copy';

type Copy = ReturnType<typeof liveEventCopy>;

const ART = '/assets/orshabatoba/events';
/** The neon sign's glow, for the title. */
const NEON = '[text-shadow:0_0_6px_rgba(255,255,255,0.75),0_0_18px_rgba(255,255,255,0.4),0_0_36px_rgba(150,205,255,0.3)]';

const LIVE_STATUSES = new Set(['checkin', 'game_live', 'break']);
/** Kala's is a front-on render of his 3D model (the studio still only has him in profile). */
const HOST_AVATAR = { tato: 'host-tato.webp', kala: 'host-kala-front.webp' } as const;

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

function Hosts({ copy }: { copy: Copy }) {
  return (
    <div className="flex items-start justify-center gap-6 sm:gap-10">
      {(['tato', 'kala'] as const).map((id) => (
        <div key={id} className="flex flex-col items-center gap-2">
          {/* eslint-disable-next-line @next/next/no-img-element -- tiny static portrait */}
          <img
            src={`${ART}/${HOST_AVATAR[id]}`}
            width={120}
            height={120}
            alt=""
            className="size-24 rounded-full bg-black/40 object-cover ring-4 ring-brand-yellow shadow-[0_8px_24px_rgba(0,0,0,0.45)] sm:size-28"
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
        tone === 'green' ? 'bg-brand-green text-white' : 'bg-brand-yellow text-black',
      )}
    >
      {children}
    </button>
  );
}

/**
 * The ორშაბათობა card on /events (Georgian only), laid out like the Weekend League promo card: the hosts, the title,
 * the registered count and one CTA. No countdown here: the 1-minute countdown appears only after the host's Start.
 */
export function EventLobby({
  copy, registered, status, entered, registering, onRegister, signedOut, onSignIn, host, error, compact,
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
        className="@container relative w-full rounded-[20px] px-5 pb-6 pt-6 text-center sm:px-7"
        style={{ backgroundImage: 'linear-gradient(180deg, #1645FF 0%, #1A35A1 100%)' }}
      >
        {live && (
          <div className="mb-4 flex justify-center">
            <span className="inline-flex items-center gap-2 rounded-full bg-red-600 px-3 py-1 font-poppins text-[12px] font-black uppercase tracking-widest text-white">
              <span className="relative flex size-2">
                <span className="absolute inline-flex size-full animate-ping rounded-full bg-white opacity-75" />
                <span className="relative inline-flex size-2 rounded-full bg-white" />
              </span>
              {copy.live}
            </span>
          </div>
        )}

        {!compact && <Hosts copy={copy} />}

        <NeonTitle className="mt-5 first:mt-0 whitespace-normal text-[clamp(24px,8cqi,36px)] leading-tight">{copy.cardTitle}</NeonTitle>
        {registered != null && (
          <p className="mt-2 inline-flex items-center gap-1.5 font-poppins text-[13px] font-semibold text-white/55">
            <Users className="size-4" aria-hidden /> {copy.registered(registered)}
          </p>
        )}

        <div className="mt-5">{action}</div>
        {error && !entered && (
          <p role="alert" className="mt-3 font-poppins text-[13px] font-bold text-brand-yellow">{error}</p>
        )}
      </section>

      {host && (
        <section className="rounded-[20px] border-2 border-brand-yellow/70 bg-[#1A35A1] p-5 text-center">
          <div className="font-poppins text-[12px] font-black uppercase tracking-widest text-brand-yellow">{copy.hostTitle}</div>
          <p className="mt-2 font-poppins text-[13px] font-semibold text-white/75">{copy.hostBody}</p>
          <div className="mt-4">
            <CtaButton tone="yellow" onClick={host.onStart} disabled={host.busy || !open}>
              {host.busy ? <Loader2 className="size-5 animate-spin" aria-hidden /> : <Play className="size-5" aria-hidden />}
              {host.busy ? copy.starting : host.confirming ? copy.confirmTap : copy.start}
            </CtaButton>
          </div>
          {host.message && (
            <p role="alert" className="mt-3 font-poppins text-[13px] font-bold text-brand-yellow">{host.message}</p>
          )}
        </section>
      )}
    </div>
  );
}

/**
 * The /events tab entry: what the event is, when, and one button into the studio page (/orshabatoba), where
 * registration, the host's Start, the countdown and the game all happen.
 */
export function OrshabatobaEntryCard({ live }: { live: boolean }) {
  return (
    <div className="mx-auto w-full max-w-md px-4 py-5">
      <section
        className="@container relative w-full rounded-[20px] px-5 pb-6 pt-6 text-center sm:px-7"
        style={{ backgroundImage: 'linear-gradient(180deg, #1645FF 0%, #1A35A1 100%)' }}
      >
        {live && (
          <div className="mb-4 flex justify-center">
            <span className="inline-flex items-center gap-2 rounded-full bg-red-600 px-3 py-1 font-poppins text-[12px] font-black uppercase tracking-widest text-white">
              <span className="relative flex size-2">
                <span className="absolute inline-flex size-full animate-ping rounded-full bg-white opacity-75" />
                <span className="relative inline-flex size-2 rounded-full bg-white" />
              </span>
              ლაივ
            </span>
          </div>
        )}
        <Hosts copy={{ hosts: { tato: 'ტატო', kala: 'კალა' } } as Copy} />
        <NeonTitle className="mt-5 whitespace-normal text-[clamp(24px,8cqi,36px)] leading-tight">ლაივ ტურნირი ორშაბათობასთან ერთად</NeonTitle>
        <p className="mt-3 inline-flex rounded-full bg-black/25 px-4 py-1.5 font-poppins text-[14px] font-semibold text-brand-yellow">ყოველ ორშაბათს</p>
        <Link
          href="/orshabatoba"
          className="mt-5 flex w-full items-center justify-center gap-2 rounded-[14px] bg-brand-green py-3.5 font-poppins text-[17px] font-semibold uppercase text-white transition-opacity hover:opacity-90 active:opacity-80"
        >
          <Tv className="size-5" aria-hidden /> სტუდიაში შესვლა
        </Link>
      </section>
    </div>
  );
}
