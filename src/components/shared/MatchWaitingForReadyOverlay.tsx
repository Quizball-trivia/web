'use client';

import { useEffect, useState } from 'react';
import { motion } from 'motion/react';
import { cn } from '@/lib/utils';
import { MatchCountdownPuck } from './MatchCountdownPuck';

interface MatchWaitingForReadyOverlayProps {
  title: string;
  readyLabel: string;
  startingLabel: string;
  forceStartsAtMs: number;
  serverTimeOffsetMs?: number | null;
  className?: string;
}

export function MatchWaitingForReadyOverlay({
  title,
  readyLabel,
  startingLabel,
  forceStartsAtMs,
  serverTimeOffsetMs = null,
  className,
}: MatchWaitingForReadyOverlayProps) {
  const [nowMs, setNowMs] = useState(() => Date.now());

  useEffect(() => {
    const intervalId = window.setInterval(() => setNowMs(Date.now()), 250);
    return () => window.clearInterval(intervalId);
  }, []);

  const serverNowMs = nowMs + (serverTimeOffsetMs ?? 0);
  const seconds = Math.max(1, Math.ceil((forceStartsAtMs - serverNowMs) / 1000));

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.2 }}
      className={cn(
        'flex min-h-dvh w-full items-center justify-center bg-surface-page-alt bg-[url("/assets/bg-pattern.webp")] bg-cover bg-center bg-no-repeat px-4 text-white',
        className,
      )}
    >
      <div className="absolute inset-0 bg-surface-page-alt/55 backdrop-blur-[1.5px]" />
      <motion.div
        initial={{ y: 12, scale: 0.98, opacity: 0 }}
        animate={{ y: 0, scale: 1, opacity: 1 }}
        exit={{ y: 12, scale: 0.98, opacity: 0 }}
        transition={{ type: 'spring', stiffness: 280, damping: 25 }}
        className="relative flex w-full max-w-sm flex-col items-center rounded-[20px] bg-brand-blue px-6 py-7 text-center shadow-2xl"
      >
        <div className="font-poppins text-[11px] font-semibold uppercase leading-tight tracking-[0.2em] text-brand-yellow">
          {readyLabel}
        </div>
        <div className="mt-2 text-balance font-poppins text-2xl font-semibold uppercase leading-tight text-white">
          {title}
        </div>
        <div className="mt-5">
          <MatchCountdownPuck
            label={startingLabel}
            seconds={seconds}
            size="sm"
          />
        </div>
      </motion.div>
    </motion.div>
  );
}
