'use client';

import { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { RAISE_TURN_MS } from '../../data';

// Countdown timer styled like the ranked match puck (cyan ring + blue fill +
// white number) but sized for the card corner, with a BLUE progress bar so it
// stays visible on the yellow card. `endsAt` resets the bar when the clock
// re-arms (a new bid pushes `endsAt` forward).
export function CountdownTimer({
  endsAt,
  totalMs = RAISE_TURN_MS,
}: {
  endsAt: number;
  totalMs?: number;
}) {
  const [secondsLeft, setSecondsLeft] = useState(() =>
    Math.max(0, Math.ceil((endsAt - Date.now()) / 1000)),
  );

  useEffect(() => {
    const update = () => {
      setSecondsLeft(Math.max(0, Math.ceil((endsAt - Date.now()) / 1000)));
    };
    update();
    const interval = setInterval(update, 200);
    return () => clearInterval(interval);
  }, [endsAt]);

  return (
    <div className="flex w-12 flex-col items-center gap-1.5">
      <motion.div
        key={secondsLeft}
        initial={{ y: -10, scale: 1.25, opacity: 0 }}
        animate={{ y: 0, scale: 1, opacity: 1 }}
        transition={{ type: 'spring', stiffness: 460, damping: 17 }}
        className="flex size-11 items-center justify-center rounded-full border-4 border-brand-cyan bg-brand-blue shadow-[0_0_18px_rgba(28,176,246,0.5)]"
      >
        <span className="font-poppins text-xl font-semibold leading-none tabular-nums text-white">
          {secondsLeft}
        </span>
      </motion.div>
      <div className="h-1 w-full overflow-hidden rounded-full bg-black/15">
        <motion.div
          key={`bar-${endsAt}`}
          initial={{ width: '100%' }}
          animate={{ width: '0%' }}
          transition={{ duration: totalMs / 1000, ease: 'linear' }}
          className="h-full rounded-full bg-brand-blue"
        />
      </div>
    </div>
  );
}
