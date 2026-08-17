'use client';

import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useLocale } from '@/contexts/LocaleContext';
import { poppins } from '../../constants/auction.constants';
import { ScreenBackdrop, SCREEN_GLOW } from '../shared/ScreenBackdrop';
import { FramedAvatar, framedAvatarHeight } from '../shared/FramedAvatar';
import type { AuctionPlayer } from '../../types';

// Shared with the search screen so every matched player renders the same size —
// no larger "self" card, no per-arrival size jitter. The slot box is reserved at
// this width so late-arriving avatars fill in place without shifting the row.
export const LINEUP_CARD_WIDTH = 80;

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
  onComplete: () => void;
}

export function MatchCountdown({ players, endsAtMs, onComplete }: MatchCountdownProps) {
  const { t } = useLocale();
  // Resolve the target once (so prop jitter doesn't restart the countdown).
  const [targetMs] = useState(() => endsAtMs ?? Date.now() + 5_000);
  const [count, setCount] = useState(() => Math.max(0, Math.ceil((targetMs - Date.now()) / 1000)));

  useEffect(() => {
    if (count <= 0) {
      const done = setTimeout(onComplete, 300);
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

  // Always three stable slots at a fixed size: filled seats render the avatar,
  // any not-yet-hydrated seat holds an empty frame of the same size so the row
  // never resizes or shifts as the last player arrives.
  const cardHeight = framedAvatarHeight(LINEUP_CARD_WIDTH);
  const slots: (AuctionPlayer | null)[] = [0, 1, 2].map((i) => players[i] ?? null);

  return (
    <div className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden bg-surface-page-alt">
      <ScreenBackdrop glow={SCREEN_GLOW.win} />

      <div className="relative z-10 flex w-full max-w-md flex-col items-center px-6">
        <div
          className="mb-6 font-poppins text-sm font-black uppercase tracking-[0.3em] text-brand-yellow"
          style={poppins}
        >
          {count > 0 ? t('auctionGame.countdownReady') : t('auctionGame.countdownGo')}
        </div>

        {/* Matched players — three equal, reserved slots */}
        <div className="flex items-start justify-center gap-3">
          {slots.map((p, i) => (
            <div key={p?.id ?? `slot-${i}`} className="flex flex-col items-center">
              <div style={{ width: LINEUP_CARD_WIDTH, height: cardHeight }}>
                {p ? (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.85 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: i * 0.08, type: 'spring', stiffness: 240, damping: 20 }}
                  >
                    <FramedAvatar
                      width={LINEUP_CARD_WIDTH}
                      customization={p.avatarCustomization}
                      avatarSeed={p.avatarSeed}
                      tier={p.tier}
                      rp={p.rp}
                    />
                  </motion.div>
                ) : (
                  <FramedAvatar width={LINEUP_CARD_WIDTH} filled={false} />
                )}
              </div>
              <span
                className="mt-1.5 h-4 max-w-[84px] truncate font-poppins text-[11px] font-bold uppercase tracking-wide text-white/80"
                style={poppins}
              >
                {p?.username ?? ''}
              </span>
            </div>
          ))}
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
