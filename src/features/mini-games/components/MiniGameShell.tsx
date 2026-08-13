'use client';

import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { motion } from 'motion/react';

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
}: {
  title: string;
  subtitle?: string;
  accent?: string;
  headerRight?: React.ReactNode;
  children: React.ReactNode;
  backHref?: string;
}) {
  return (
    <div className="relative flex min-h-[100dvh] flex-col overflow-hidden bg-surface-page text-white">
      {/* Ambient glow */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 h-64 opacity-40 blur-3xl"
        style={{ background: `radial-gradient(60% 100% at 50% 0%, ${accent}22, transparent 70%)` }}
      />

      {/* Header */}
      <header className="relative z-10 flex items-center gap-3 px-4 pt-4 pb-2 sm:px-6">
        <Link
          href={backHref}
          aria-label="Back to mini-games"
          className="flex size-10 shrink-0 items-center justify-center rounded-full bg-white/[0.06] text-white/70 transition-colors hover:bg-white/10 hover:text-white"
        >
          <ArrowLeft className="size-5" />
        </Link>
        <div className="min-w-0 flex-1">
          <h1 className="truncate font-poppins text-lg font-black uppercase tracking-wide sm:text-xl" style={{ color: accent }}>
            {title}
          </h1>
          {subtitle && <p className="truncate font-poppins text-xs font-semibold text-white/45">{subtitle}</p>}
        </div>
        {headerRight}
      </header>

      {/* Body */}
      <motion.main
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
        className="relative z-10 mx-auto flex w-full max-w-md flex-1 flex-col px-4 pb-6 sm:max-w-lg sm:px-6"
      >
        {children}
      </motion.main>
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
