'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';
import { motion, AnimatePresence } from 'motion/react';
import { AvatarPreview } from '@/components/AvatarPreview';
import { getTierFrameSrc } from '@/utils/tierVisuals';
import { poppins } from '../../constants/auction.constants';
import { ScreenBackdrop, SCREEN_GLOW } from '../shared/ScreenBackdrop';
import type { AuctionPlayer } from '../../types';

/**
 * Showdown countdown shown once all 3 bidders are in, before the formation
 * reveal. A short "GET READY" beat with the matched players + a counter that
 * ticks down to a SERVER-AUTHORITATIVE instant (`endsAtMs`, already converted
 * to this client's clock) so all 3 players hit zero together. Then
 * `onComplete` fires.
 */
interface MatchCountdownProps {
  players: AuctionPlayer[];
  /** Absolute client-clock time the countdown ends. Falls back to now+5s. */
  endsAtMs?: number | null;
  locale?: 'en' | 'ka';
  onComplete: () => void;
}

const COPY = {
  en: { ready: 'Get Ready', go: 'Go!' },
  ka: { ready: 'მოემზადე', go: 'წავიდა!' },
} as const;

export function MatchCountdown({ players, endsAtMs, locale = 'en', onComplete }: MatchCountdownProps) {
  const c = COPY[locale];
  // Resolve the target once (so prop jitter doesn't restart the countdown).
  const [targetMs] = useState(() => endsAtMs ?? Date.now() + 5_000);
  const [count, setCount] = useState(() => Math.max(0, Math.ceil((targetMs - Date.now()) / 1000)));

  useEffect(() => {
    if (count <= 0) {
      const done = setTimeout(onComplete, 600);
      return () => clearTimeout(done);
    }
    // Tick on the next whole-second boundary relative to the target, so the
    // displayed number stays aligned to real time even if a frame is dropped.
    const msToNextTick = Math.max(0, (targetMs - Date.now()) - (count - 1) * 1000);
    const tick = setTimeout(
      () => setCount(Math.max(0, Math.ceil((targetMs - Date.now()) / 1000))),
      msToNextTick,
    );
    return () => clearTimeout(tick);
  }, [count, targetMs, onComplete]);

  const shown = players.slice(0, 3);

  return (
    <div className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden bg-surface-page-alt">
      <ScreenBackdrop glow={SCREEN_GLOW.win} />

      <div className="relative z-10 flex w-full max-w-md flex-col items-center px-6">
        <div
          className="mb-6 font-poppins text-sm font-black uppercase tracking-[0.3em] text-brand-yellow"
          style={poppins}
        >
          {count > 0 ? c.ready : c.go}
        </div>

        {/* Matched players */}
        <div className="flex items-end justify-center gap-3">
          {shown.map((p, i) => {
            const w = i === 0 ? 92 : 76;
            const h = Math.round(w * 1.58);
            return (
              <motion.div
                key={p.id}
                initial={{ opacity: 0, y: 16, scale: 0.85 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                transition={{ delay: i * 0.12, type: 'spring', stiffness: 240, damping: 20 }}
                className="flex flex-col items-center"
              >
                <div className="relative" style={{ width: w, height: h }}>
                  <Image
                    src={getTierFrameSrc('Academy')}
                    alt=""
                    width={w}
                    height={h}
                    className="pointer-events-none absolute inset-0 z-0 h-full w-full object-contain"
                  />
                  <div className="absolute inset-x-0 bottom-[8%] top-[22%] z-10 flex items-center justify-center overflow-hidden">
                    <AvatarPreview customization={{ base: p.avatarSeed || 'avatar-1' }} width={Math.round(w * 0.64)} />
                  </div>
                </div>
                <span
                  className="mt-1.5 max-w-[84px] truncate font-poppins text-[11px] font-bold uppercase tracking-wide text-white/80"
                  style={poppins}
                >
                  {p.username}
                </span>
              </motion.div>
            );
          })}
        </div>

        {/* Countdown number */}
        <div className="mt-8 flex h-20 items-center justify-center">
          <AnimatePresence mode="wait">
            <motion.div
              key={count}
              initial={{ scale: 1.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.4, opacity: 0 }}
              transition={{ type: 'spring', stiffness: 320, damping: 18 }}
              className="font-poppins text-6xl font-black tabular-nums text-white"
              style={poppins}
            >
              {count > 0 ? count : '⚽'}
            </motion.div>
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
