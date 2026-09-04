'use client';

import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { motion } from 'motion/react';
import { useMiniT } from '../lib/i18n';

/**
 * Full-screen shell for a mini-game prototype: a dark page, a header with a back
 * link to the hub + title + optional right-side stat (points/score), and the
 * game body. Kept self-contained (plain strings, no i18n) since these are
 * test prototypes — placement in the real app is TBD.
 */
export function MiniGameShell({
  title,
  subtitle,
  accent = 'var(--tw-brand-yellow, #FFE500)',
  headerRight,
  children,
  backHref = '/dev/mini-games',
  wide = false,
  scrollable = false,
  disclaimer = true,
  onBack,
  hideBack = false,
  hideHeader = false,
  headerClassName = '',
  backgroundImageUrl = '/assets/bg-pattern.webp',
}: {
  title: string;
  subtitle?: string;
  accent?: string;
  headerRight?: React.ReactNode;
  children: React.ReactNode;
  backHref?: string;
  /** Desktop: widen the play area (e.g. for a side-by-side layout). */
  wide?: boolean;
  /** Allow tall game boards to extend and use the page scroll area. */
  scrollable?: boolean;
  /** Live modes grant real rewards — they suppress the prototype footer. */
  disclaimer?: boolean;
  /** Live matches can intercept back navigation to show a forfeit warning. */
  onBack?: () => void;
  /** Screens that pin their own leave control (like Ranked/Auction) drop the shell arrow. */
  hideBack?: boolean;
  /** Match screens with their own HUD render no shell header at all. */
  hideHeader?: boolean;
  headerClassName?: string;
  /** Allows live modes to use an owned CDN copy of the shared pitch texture. */
  backgroundImageUrl?: string;
}) {
  const t = useMiniT();
  return (
    <div
      className={`relative flex min-h-[100dvh] flex-col bg-surface-page-alt bg-cover bg-center bg-no-repeat text-white ${
        scrollable ? 'overflow-x-hidden' : 'overflow-hidden'
      }`}
      style={{ backgroundImage: `url(${backgroundImageUrl})` }}
    >
      {/* Ambient glow */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 h-64 opacity-40 blur-3xl"
        style={{ background: `radial-gradient(60% 100% at 50% 0%, ${accent}22, transparent 70%)` }}
      />

      {/* Header */}
      {hideHeader ? null : (
      <header
        className={`relative z-[90] flex items-start gap-2 px-4 pt-4 pb-2 sm:items-center sm:gap-3 sm:px-6 ${
          wide ? 'mx-auto w-full lg:max-w-6xl' : ''
        } ${headerClassName}`}
      >
        {hideBack ? null : onBack ? (
          <button
            type="button"
            onClick={onBack}
            aria-label={t('Back')}
            className="mt-0.5 flex size-10 shrink-0 items-center justify-center rounded-full bg-white/[0.06] text-white/70 transition-colors hover:bg-white/10 hover:text-white sm:mt-0"
          >
            <ArrowLeft className="size-5" />
          </button>
        ) : (
          <Link
            href={backHref}
            aria-label={t('Back')}
            className="mt-0.5 flex size-10 shrink-0 items-center justify-center rounded-full bg-white/[0.06] text-white/70 transition-colors hover:bg-white/10 hover:text-white sm:mt-0"
          >
            <ArrowLeft className="size-5" />
          </Link>
        )}
        <div className="min-w-0 flex-1">
          <h1
            className="font-poppins text-[15px] font-black uppercase leading-tight tracking-tight sm:text-xl sm:tracking-wide"
            style={{ color: accent }}
          >
            {title}
          </h1>
          {subtitle && (
            <p className="mt-0.5 font-poppins text-[11px] font-semibold leading-snug text-white/45 sm:text-xs">
              {subtitle}
            </p>
          )}
        </div>
        {headerRight ? <div className="shrink-0">{headerRight}</div> : null}
      </header>
      )}

      {/* Body */}
      <motion.main
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
        className={`relative z-10 mx-auto flex w-full flex-1 flex-col px-4 pb-2 sm:px-6 ${
          wide ? 'max-w-md sm:max-w-lg lg:max-w-6xl' : 'max-w-md sm:max-w-lg'
        }`}
      >
        {children}
      </motion.main>
      {disclaimer && (
        <p className="relative z-10 pb-3 pt-1 text-center font-poppins text-[10px] font-semibold uppercase tracking-wider text-white/30">
          {t('Prototype — virtual points only, no real money or rewards')}
        </p>
      )}
    </div>
  );
}

/** A rounded stat pill for the header (e.g. points / round). */
export function StatPill({ label, value, color = '#FFE500' }: { label: string; value: React.ReactNode; color?: string }) {
  return (
    <div className="flex flex-col items-end rounded-2xl bg-white/[0.06] px-3 py-1.5 text-right">
      <span className="font-poppins text-[9px] font-black uppercase tracking-wider text-white/45">{label}</span>
      <span className="font-poppins text-base font-black tabular-nums leading-none" style={{ color }}>
        {value}
      </span>
    </div>
  );
}
