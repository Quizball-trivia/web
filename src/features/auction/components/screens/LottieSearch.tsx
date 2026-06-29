'use client';

import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { DotLottieReact, setWasmUrl } from '@lottiefiles/dotlottie-react';
import { useLocale } from '@/contexts/LocaleContext';
import type { MessageKey } from '@/lib/i18n/messages';
import type { AvatarCustomization } from '@/types/game';
import { poppins } from '../../constants/auction.constants';
import { ScreenBackdrop, SCREEN_GLOW } from '../shared/ScreenBackdrop';
import { FramedAvatar } from '../shared/FramedAvatar';

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
  /** The real user's layered avatar — rendered on the "You" seat. */
  selfAvatarCustomization?: AvatarCustomization | null;
  onCancel?: () => void;
  /** Force a single Lottie (harness preview). Defaults to count-driven selection. */
  src?: string;
}

/** A player seat — a framed avatar that springs in once the seat fills. */
function SeatFrame({
  width,
  filled,
  customization,
  avatarSeed,
}: {
  width: number;
  filled: boolean;
  customization?: AvatarCustomization | null;
  avatarSeed?: string | null;
}) {
  if (!filled) {
    return <FramedAvatar width={width} filled={false} />;
  }
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.8, y: 10 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      transition={{ type: 'spring', stiffness: 260, damping: 20 }}
    >
      <FramedAvatar width={width} customization={customization} avatarSeed={avatarSeed} />
    </motion.div>
  );
}

const SEARCH_STATUS_KEYS = [
  'auctionGame.searchStatusStep1',
  'auctionGame.searchStatusStep2',
  'auctionGame.searchStatusStep3',
] as const satisfies readonly MessageKey[];

function statusKey(joined: number, total: number): MessageKey {
  if (joined >= total) return 'auctionGame.auctionStarting';
  const idx = Math.min(Math.max(joined - 1, 0), SEARCH_STATUS_KEYS.length - 1);
  return SEARCH_STATUS_KEYS[idx];
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
  selfAvatarCustomization,
  onCancel,
  src,
}: LottieSearchProps) {
  const { t } = useLocale();
  const lottieSrc = src ?? lottieForJoined(joined, total);
  const elapsed = useElapsedSeconds();
  const status = t(statusKey(joined, total));

  return (
    <div className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden bg-surface-page-alt">
      <ScreenBackdrop glow={SCREEN_GLOW.formation} />

      <div className="relative z-10 flex w-full max-w-md flex-col items-center px-6">
        <div
          className="mb-3 font-poppins text-xs font-bold uppercase tracking-[0.34em] text-brand-yellow/70"
          style={poppins}
        >
          {t('auctionGame.searchMode')}
        </div>

        {/* Lottie loader — the hero (swaps as bidders join) */}
        <div className="h-64 w-64">
          <DotLottieReact key={lottieSrc} src={lottieSrc} loop autoplay style={{ width: '100%', height: '100%' }} />
        </div>

        {/* Status copy */}
        <AnimatePresence mode="wait">
          <motion.p
            key={status}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            className="mt-1 text-center font-poppins text-lg font-black uppercase tracking-[0.12em] text-white"
            style={poppins}
          >
            {status}
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
          <SeatFrame width={88} filled customization={selfAvatarCustomization} avatarSeed={selfAvatarSeed} />
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
            {t('common.cancel')}
          </button>
        )}
      </div>
    </div>
  );
}

/** Harness helper: cycles joined 1 → 2 → 3 on a loop. */
export function LottieSearchDemo({ src }: { src?: string }) {
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
    <LottieSearch joined={joined} total={3} selfAvatarSeed="avatar-1" onCancel={() => {}} src={src} />
  );
}
