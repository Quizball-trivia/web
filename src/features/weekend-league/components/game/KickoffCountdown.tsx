'use client';

import { useEffect, useState } from 'react';
import { motion } from 'motion/react';
import { poppins, KICKOFF_SECONDS } from '../../constants';

/**
 * Pre-match "everyone starts together" countdown. Counts down from
 * KICKOFF_SECONDS and fires onStart at zero. Full-screen.
 */
export function KickoffCountdown({
  title,
  subtitle,
  onStart,
}: {
  title: string;
  subtitle?: string;
  onStart: () => void;
}) {
  const [seconds, setSeconds] = useState(KICKOFF_SECONDS);

  useEffect(() => {
    if (seconds <= 0) {
      onStart();
      return;
    }
    const id = setTimeout(() => setSeconds((s) => s - 1), 1000);
    return () => clearTimeout(id);
  }, [seconds, onStart]);

  const urgent = seconds <= 3;

  return (
    <div className="flex min-h-[70vh] flex-col items-center justify-center px-6 text-center">
      <div className="font-poppins text-[11px] font-black uppercase tracking-[0.28em] text-brand-cyan">{title}</div>
      <div className="mt-2 font-poppins text-xl font-black uppercase text-white" style={poppins}>Get ready</div>
      {subtitle && <p className="mt-1 max-w-xs font-poppins text-[13px] font-semibold text-white/60">{subtitle}</p>}

      <motion.div
        key={seconds}
        initial={{ scale: 1.4, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: 'spring', stiffness: 320, damping: 16 }}
        className={`mt-8 flex size-40 items-center justify-center rounded-full border-4 ${
          urgent ? 'border-brand-red-soft bg-brand-red-soft/15' : 'border-brand-cyan bg-brand-cyan/10'
        }`}
      >
        <span className={`font-poppins text-7xl font-black tabular-nums ${urgent ? 'text-brand-red-soft' : 'text-white'}`} style={poppins}>
          {seconds}
        </span>
      </motion.div>

      <p className="mt-8 font-poppins text-[12px] font-semibold uppercase tracking-wide text-white/40">
        Everyone starts at the same time
      </p>
    </div>
  );
}
