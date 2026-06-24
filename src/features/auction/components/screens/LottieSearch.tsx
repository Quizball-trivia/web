'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';
import { motion, AnimatePresence } from 'motion/react';
import { DotLottieReact, setWasmUrl } from '@lottiefiles/dotlottie-react';
import { AvatarPreview } from '@/components/AvatarPreview';
import { getTierFrameSrc } from '@/utils/tierVisuals';
import { poppins } from '../../constants/auction.constants';
import { ScreenBackdrop, SCREEN_GLOW } from '../shared/ScreenBackdrop';

// Self-host the player WASM + the animations so the search screen never depends
// on an external CDN (works offline, no CORS, faster).
setWasmUrl('/assets/dotlottie-player.wasm');

// One animation per join state: alone → 2 in → all 3 in. Indexed by `joined`.
const SEARCH_LOTTIES = [
  '/assets/auction-search.lottie', // 1 bidder (you, searching)
  '/assets/auction-search-2.lottie', // 2 bidders
  '/assets/auction-search-3.lottie', // 3 bidders (full)
] as const;

function lottieForJoined(joined: number, total: number) {
  const idx = Math.min(Math.max(joined, 1), total) - 1;
  return SEARCH_LOTTIES[Math.min(idx, SEARCH_LOTTIES.length - 1)];
}

/**
 * Auction "searching for opponents" screen built around a Lottie loader.
 *
 * The Lottie animation loops as the hero. The join count (1→2→3) is layered on
 * top as bidder chips + rotating status copy — the `queued` phase gives us a
 * count only (no rival avatars), so seat 0 is "You" and the rest are chips.
 */
export interface LottieSearchProps {
  joined: number;
  total?: number;
  selfAvatarSeed?: string | null;
  onCancel?: () => void;
  locale?: 'en' | 'ka';
  /** Force a single Lottie (harness preview). Defaults to count-driven selection. */
  src?: string;
}

interface SearchCopy {
  label: string;
  status: string[];
  starting: string;
  cancel: string;
}

const COPY: Record<'en' | 'ka', SearchCopy> = {
  en: {
    label: 'Auction Mode',
    status: ['Preparing your bid desk…', 'Rival bidder detected…', 'Final bidder connected…'],
    starting: 'Auction starting…',
    cancel: 'Cancel',
  },
  ka: {
    label: 'აუქციონის რეჟიმი',
    status: ['შენი მაგიდა მზადდება…', 'მეტოქე შემოვიდა…', 'ბოლო მოთამაშე შემოვიდა…'],
    starting: 'აუქციონი იწყება…',
    cancel: 'გაუქმება',
  },
};

/** A player seat — your real framed avatar, or an empty/pending frame. */
function SeatFrame({
  width,
  filled,
  avatarSeed,
}: {
  width: number;
  filled: boolean;
  avatarSeed?: string | null;
}) {
  const frameH = Math.round(width * 1.58);
  if (!filled) {
    return (
      <div
        className="rounded-[10px] border border-dashed border-white/15 bg-white/[0.03]"
        style={{ width, height: frameH }}
      />
    );
  }
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.8, y: 10 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      transition={{ type: 'spring', stiffness: 260, damping: 20 }}
      className="relative"
      style={{ width, height: frameH }}
    >
      <Image
        src={getTierFrameSrc('Academy')}
        alt=""
        width={width}
        height={frameH}
        className="pointer-events-none absolute inset-0 z-0 h-full w-full object-contain"
      />
      <div className="absolute inset-x-0 bottom-[8%] top-[22%] z-10 flex items-center justify-center overflow-hidden">
        <AvatarPreview customization={{ base: avatarSeed || 'avatar-1' }} width={Math.round(width * 0.64)} />
      </div>
    </motion.div>
  );
}

function statusText(c: SearchCopy, joined: number, total: number) {
  if (joined >= total) return c.starting;
  return c.status[Math.min(Math.max(joined - 1, 0), c.status.length - 1)];
}

/** Seconds since the search screen mounted (for the elapsed timer). */
function useElapsedSeconds(): number {
  const [seconds, setSeconds] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setSeconds((s) => s + 1), 1000);
    return () => clearInterval(id);
  }, []);
  return seconds;
}

function formatElapsed(totalSeconds: number): string {
  const m = Math.floor(totalSeconds / 60);
  const s = totalSeconds % 60;
  return `${m}:${String(s).padStart(2, '0')}`;
}

export function LottieSearch({
  joined,
  total = 3,
  selfAvatarSeed,
  onCancel,
  locale = 'en',
  src,
}: LottieSearchProps) {
  const c = COPY[locale];
  const lottieSrc = src ?? lottieForJoined(joined, total);
  const elapsed = useElapsedSeconds();

  return (
    <div className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden bg-surface-page-alt">
      <ScreenBackdrop glow={SCREEN_GLOW.formation} />

      <div className="relative z-10 flex w-full max-w-md flex-col items-center px-6">
        <div
          className="mb-3 font-poppins text-xs font-bold uppercase tracking-[0.34em] text-brand-yellow/70"
          style={poppins}
        >
          {c.label}
        </div>

        {/* Lottie loader — the hero (swaps as bidders join) */}
        <div className="h-64 w-64">
          <DotLottieReact key={lottieSrc} src={lottieSrc} loop autoplay style={{ width: '100%', height: '100%' }} />
        </div>

        {/* Status copy */}
        <AnimatePresence mode="wait">
          <motion.p
            key={statusText(c, joined, total)}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            className="mt-1 text-center font-poppins text-lg font-black uppercase tracking-[0.12em] text-white"
            style={poppins}
          >
            {statusText(c, joined, total)}
          </motion.p>
        </AnimatePresence>

        {/* Elapsed search time (like ranked) */}
        <div
          className="mt-1.5 font-poppins text-xs font-bold tabular-nums tracking-[0.2em] text-white/40"
          style={poppins}
        >
          {formatElapsed(elapsed)}
        </div>

        {/* Seats — your framed avatar (large), rivals as frames that fill in */}
        <div className="mt-6 flex items-end justify-center gap-3">
          <SeatFrame width={88} filled avatarSeed={selfAvatarSeed} />
          <SeatFrame width={68} filled={joined > 1} />
          <SeatFrame width={68} filled={joined > 2} />
        </div>

        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            className="mt-8 rounded-full bg-brand-yellow px-8 py-2.5 font-poppins text-sm font-black uppercase tracking-wide text-surface-deep shadow-lg transition hover:bg-brand-yellow/90"
            style={poppins}
          >
            {c.cancel}
          </button>
        )}
      </div>
    </div>
  );
}

/** Harness helper: cycles joined 1 → 2 → 3 on a loop. */
export function LottieSearchDemo({ locale = 'en', src }: { locale?: 'en' | 'ka'; src?: string }) {
  const [joined, setJoined] = useState(1);
  useEffect(() => {
    const t1 = setTimeout(() => setJoined(2), 3000);
    const t2 = setTimeout(() => setJoined(3), 6000);
    const loop = setInterval(() => {
      setJoined(1);
      setTimeout(() => setJoined(2), 3000);
      setTimeout(() => setJoined(3), 6000);
    }, 9000);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      clearInterval(loop);
    };
  }, []);
  return (
    <LottieSearch joined={joined} total={3} selfAvatarSeed="avatar-1" onCancel={() => {}} locale={locale} src={src} />
  );
}
