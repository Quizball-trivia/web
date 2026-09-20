'use client';

import { useMemo } from 'react';
import { motion } from 'motion/react';
import { CoinIcon } from '@/features/store/components/CoinIcon';

/** Deterministic PRNG so a burst looks the same for the same pot. */
export function seeded(seed: number): () => number {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

export interface MoneyFlightSpec { seed: number; ox: number; oy: number; tx: number; ty: number }

/** Coins arc from a cash-out control to the player's bank (an element tagged `data-money-stack`). Shared by Free Kicks, Road to Goal and Trivia Mines. */
export function MoneyFlight({ flight }: { flight: MoneyFlightSpec | null }) {
  const bits = useMemo(() => {
    if (!flight) return [];
    const rnd = seeded(Math.floor(Math.abs(flight.seed)) || 1);
    return Array.from({ length: 10 }, (_, i) => ({
      i,
      delay: i * 0.04,
      jx: (rnd() - 0.5) * 72,
      jy: (rnd() - 0.5) * 36,
      rot: (rnd() - 0.5) * 90,
      size: 0.62 + rnd() * 0.28,
    }));
  }, [flight]);

  if (!flight) return null;

  return (
    <div className="pointer-events-none fixed inset-0 z-[80] overflow-hidden" aria-hidden>
      {bits.map((bit) => (
        <motion.div
          key={`${flight.seed}-${bit.i}`}
          className="absolute"
          initial={{
            left: flight.ox,
            top: flight.oy,
            x: '-50%',
            y: '-50%',
            opacity: 0,
            scale: 0.45,
            rotate: 0,
          }}
          animate={{
            left: flight.tx,
            top: flight.ty,
            x: ['-50%', `calc(-50% + ${bit.jx}px)`, '-50%'],
            y: ['-50%', `calc(-50% + ${bit.jy - 48}px)`, '-50%'],
            opacity: [0, 1, 1, 0],
            scale: [0.45, 1.05, 0.55],
            rotate: [0, bit.rot, bit.rot * 0.2],
          }}
          transition={{ duration: 0.72, delay: bit.delay, ease: [0.2, 0.75, 0.15, 1] }}
        >
          <CoinIcon size={Math.round(30 * bit.size)} />
        </motion.div>
      ))}
    </div>
  );
}

/** Build a flight from the pressed control to the `[data-money-stack]` element (falls back to the top of the screen). */
export function flightFrom(el: HTMLElement, seed: number): MoneyFlightSpec {
  const rect = el.getBoundingClientRect();
  const stack = document.querySelector('[data-money-stack]')?.getBoundingClientRect();
  return {
    seed,
    ox: rect.left + rect.width / 2,
    oy: rect.top + rect.height / 2,
    tx: stack ? stack.left + stack.width / 2 : rect.left + rect.width / 2,
    ty: stack ? stack.top + stack.height / 2 : 36,
  };
}
