'use client';

import { motion } from 'motion/react';
import { cn } from '@/lib/utils';

interface MatchCountdownPuckProps {
  label: string;
  seconds: number;
  waiting?: boolean;
  detailLabel?: string;
  durationMs?: number;
  runKey?: string | number;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

const SIZE_TOKENS = {
  sm: {
    circle: 'size-[clamp(3.5rem,12cqw,4.75rem)]',
    text: 'text-[clamp(1.6rem,7cqw,2.25rem)]',
    bar: 'w-[clamp(3.5rem,12cqw,4.75rem)]',
  },
  md: {
    circle: 'size-[clamp(6.5rem,28cqw,8rem)]',
    text: 'text-[clamp(2.75rem,13cqw,3.75rem)]',
    bar: 'w-[clamp(5rem,24cqw,7rem)]',
  },
  lg: {
    circle: 'size-[clamp(5.25rem,22cqw,9rem)]',
    text: 'text-[clamp(2.6rem,11cqw,4.5rem)]',
    bar: 'w-[clamp(4.5rem,20cqw,7rem)]',
  },
};

export function MatchCountdownPuck({
  label,
  seconds,
  waiting = false,
  detailLabel,
  durationMs,
  runKey = 'countdown',
  size = 'md',
  className,
}: MatchCountdownPuckProps) {
  const tokens = SIZE_TOKENS[size];
  return (
    <div className={cn('flex flex-col items-center', className)}>
      <div className="w-full min-w-0 text-balance text-center font-poppins text-[clamp(0.55rem,1.8cqw,0.7rem)] font-semibold uppercase leading-tight tracking-[0.16em] text-brand-yellow">
        {label}
      </div>
      <motion.div
        key={waiting ? 'waiting' : seconds}
        initial={{ y: -22, scale: 1.55, opacity: 0 }}
        animate={{ y: 0, scale: 1, opacity: 1 }}
        transition={{ type: 'spring', stiffness: 460, damping: 17 }}
        className={cn(
          'mt-2 flex items-center justify-center rounded-full border-4',
          waiting
            ? 'border-white/18 bg-white/8 shadow-[0_0_28px_rgba(28,176,246,0.22)] backdrop-blur-sm'
            : 'border-brand-cyan bg-brand-blue shadow-[0_0_60px_rgba(28,176,246,0.45)]',
          tokens.circle,
        )}
      >
        {waiting ? (
          <span className="font-poppins text-[clamp(1rem,5cqw,1.75rem)] font-black uppercase tracking-[0.08em] text-white">
            VS
          </span>
        ) : (
          <span className={cn('font-poppins font-semibold leading-none tabular-nums text-white', tokens.text)}>
            {seconds}
          </span>
        )}
      </motion.div>
      {waiting && detailLabel ? (
        <div className={cn('mt-3 text-balance text-center font-poppins text-[clamp(0.55rem,1.8cqw,0.75rem)] font-semibold uppercase leading-tight text-white/55', tokens.bar)}>
          {detailLabel}
        </div>
      ) : durationMs ? (
        <div className={cn('mt-3 h-1 overflow-hidden rounded-full bg-white/15', tokens.bar)}>
          <motion.div
            key={`bar-${runKey}`}
            initial={{ width: '0%' }}
            animate={{ width: '100%' }}
            transition={{ duration: durationMs / 1000, ease: 'linear' }}
            className="h-full rounded-full bg-brand-yellow"
          />
        </div>
      ) : null}
    </div>
  );
}
