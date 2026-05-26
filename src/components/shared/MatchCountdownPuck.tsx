'use client';

import { motion } from 'motion/react';
import { cn } from '@/lib/utils';

interface MatchCountdownPuckProps {
  label: string;
  seconds: number;
  durationMs?: number;
  runKey?: string | number;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

const SIZE_TOKENS = {
  sm: { circle: 'size-24', text: 'text-5xl', bar: 'w-20' },
  md: { circle: 'size-28 sm:size-32', text: 'text-5xl sm:text-6xl', bar: 'w-24 sm:w-28' },
  lg: { circle: 'size-24 sm:size-36', text: 'text-5xl sm:text-7xl', bar: 'w-20 sm:w-28' },
};

export function MatchCountdownPuck({
  label,
  seconds,
  durationMs,
  runKey = 'countdown',
  size = 'md',
  className,
}: MatchCountdownPuckProps) {
  const tokens = SIZE_TOKENS[size];
  return (
    <div className={cn('flex flex-col items-center', className)}>
      <div className="font-poppins text-[10px] font-semibold uppercase tracking-[0.28em] text-brand-yellow sm:text-[11px]">
        {label}
      </div>
      <motion.div
        key={seconds}
        initial={{ y: -22, scale: 1.55, opacity: 0 }}
        animate={{ y: 0, scale: 1, opacity: 1 }}
        transition={{ type: 'spring', stiffness: 460, damping: 17 }}
        className={cn(
          'mt-2 flex items-center justify-center rounded-full border-4 border-brand-cyan bg-brand-blue shadow-[0_0_60px_rgba(28,176,246,0.45)]',
          tokens.circle,
        )}
      >
        <span className={cn('font-poppins font-semibold leading-none tabular-nums text-white', tokens.text)}>
          {seconds}
        </span>
      </motion.div>
      {durationMs ? (
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
