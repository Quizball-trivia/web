'use client';

import { motion } from 'motion/react';
import { CashBill } from './CashBill';

/** Branded cash celebration on a win — burst (explode from center) or fountain. */
export function MoneyFx({ active, variant }: { active: boolean; variant: 'burst' | 'fountain' }) {
  if (!active) return null;

  if (variant === 'fountain') {
    // Bills shoot up from the bottom, arc, and fall back.
    const parts = Array.from({ length: 18 }, (_, i) => ({
      id: i,
      x: 50 + ((i % 9) - 4) * 7,
      peak: 30 + (i % 5) * 10,
      dur: 1.7 + (i % 3) * 0.3,
      delay: (i % 6) * 0.05,
      rot: (i % 2 ? 1 : -1) * 180,
      size: 0.8 + (i % 3) * 0.2,
    }));
    return (
      <div className="fixed inset-0 z-[90] pointer-events-none overflow-hidden">
        {parts.map((p) => (
          <motion.div
            key={p.id}
            initial={{ left: `${p.x}%`, top: '105%', opacity: 0 }}
            animate={{ top: ['105%', `${p.peak}%`, '110%'], opacity: [0, 1, 1, 0], rotate: p.rot }}
            transition={{ duration: p.dur, delay: p.delay, ease: 'easeOut' }}
            className="absolute"
          >
            <CashBill size={p.size} />
          </motion.div>
        ))}
      </div>
    );
  }

  // burst — bills explode outward from the center, then fall.
  const parts = Array.from({ length: 20 }, (_, i) => {
    const a = (i / 20) * Math.PI * 2;
    return {
      id: i,
      dx: Math.cos(a) * (130 + (i % 4) * 30),
      dy: Math.sin(a) * (95 + (i % 4) * 25),
      rot: i * 30,
      dur: 1.3 + (i % 3) * 0.25,
      size: 0.85 + (i % 3) * 0.18,
    };
  });
  return (
    <div className="fixed inset-0 z-[90] flex items-center justify-center pointer-events-none overflow-hidden">
      {parts.map((p) => (
        <motion.div
          key={p.id}
          initial={{ x: 0, y: 0, opacity: 0, scale: 0.5 }}
          animate={{ x: p.dx, y: [0, p.dy, p.dy + 170], opacity: [0, 1, 1, 0], scale: 1, rotate: p.rot }}
          transition={{ duration: p.dur, ease: 'easeOut' }}
          className="absolute"
        >
          <CashBill size={p.size} />
        </motion.div>
      ))}
    </div>
  );
}
