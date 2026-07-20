'use client';

import { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { RAISE_TURN_MS } from '../../data';

/** At or below this many seconds the clock turns red and pulses. */
const URGENT_AT_SECONDS = 5;

// Countdown timer styled like the ranked match puck (cyan ring + blue fill +
// white number) but sized for the card corner, with a progress bar that stays
// visible on the yellow card. `endsAt` resets the bar when the clock re-arms (a
// new bid pushes `endsAt` forward).
export function CountdownTimer({
  endsAt,
  totalMs = RAISE_TURN_MS,
  urgentLabel,
}: {
  endsAt: number;
  totalMs?: number;
  /** Announced to screen readers and shown under the puck when time is short. */
  urgentLabel?: string;
}) {
  const remainingMs = () => Math.max(0, endsAt - Date.now());
  const [secondsLeft, setSecondsLeft] = useState(() => Math.ceil(remainingMs() / 1000));
  // Captured once per `endsAt` so the bar animates from wherever the clock
  // ACTUALLY is. Starting at 100% made a mid-turn mount (reload, rejoin,
  // reconnect) show a full bar draining over the whole turn while the number
  // beside it counted down from 4.
  const [startFraction] = useState(() => Math.min(1, remainingMs() / totalMs));

  useEffect(() => {
    const update = () => setSecondsLeft(Math.ceil(remainingMs() / 1000));
    update();
    const interval = setInterval(update, 200);
    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- remainingMs reads endsAt
  }, [endsAt]);

  const isUrgent = secondsLeft <= URGENT_AT_SECONDS;

  return (
    <div className="flex w-12 flex-col items-center gap-1.5">
      <motion.div
        key={secondsLeft}
        initial={{ y: -10, scale: 1.25, opacity: 0 }}
        animate={{ y: 0, scale: 1, opacity: 1 }}
        transition={{ type: 'spring', stiffness: 460, damping: 17 }}
        role="timer"
        aria-live={isUrgent ? 'assertive' : 'off'}
        aria-label={urgentLabel ?? String(secondsLeft)}
        className={`flex size-11 items-center justify-center rounded-full border-4 ${
          isUrgent
            ? 'border-brand-red bg-brand-red/90 shadow-[0_0_20px_rgba(233,60,60,0.65)]'
            : 'border-brand-cyan bg-brand-blue shadow-[0_0_18px_rgba(28,176,246,0.5)]'
        }`}
      >
        <span className="font-poppins text-xl font-semibold leading-none tabular-nums text-white">
          {secondsLeft}
        </span>
      </motion.div>
      <div className="h-1 w-full overflow-hidden rounded-full bg-black/15">
        <motion.div
          key={`bar-${endsAt}`}
          initial={{ width: `${startFraction * 100}%` }}
          animate={{ width: '0%' }}
          transition={{ duration: (startFraction * totalMs) / 1000, ease: 'linear' }}
          className={`h-full rounded-full ${isUrgent ? 'bg-brand-red' : 'bg-brand-blue'}`}
        />
      </div>
    </div>
  );
}
