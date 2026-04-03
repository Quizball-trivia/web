'use client';

import { useEffect, useRef, useState } from 'react';
import { motion } from 'motion/react';
import { cn } from '@/lib/utils';

interface AnimatedPointsCounterProps {
  value: number;
  align?: 'left' | 'right';
  accentClassName?: string;
  label?: string;
}

function easeOutCubic(t: number): number {
  return 1 - Math.pow(1 - t, 3);
}

export function AnimatedPointsCounter({
  value,
  align = 'left',
  accentClassName = 'text-[#58CC02]',
  label = 'PTS',
}: AnimatedPointsCounterProps) {
  const [displayValue, setDisplayValue] = useState(value);
  const [isAnimating, setIsAnimating] = useState(false);
  const frameRef = useRef<number | null>(null);
  const previousValueRef = useRef(value);

  useEffect(() => {
    if (frameRef.current !== null) {
      cancelAnimationFrame(frameRef.current);
      frameRef.current = null;
    }

    const from = previousValueRef.current;
    const to = value;
    previousValueRef.current = value;

    if (from === to) {
      setDisplayValue(to);
      setIsAnimating(false);
      return;
    }

    const durationMs = 450;
    const startAt = performance.now();
    setIsAnimating(true);

    const tick = (now: number) => {
      const progress = Math.min(1, (now - startAt) / durationMs);
      const eased = easeOutCubic(progress);
      setDisplayValue(Math.round(from + (to - from) * eased));
      if (progress < 1) {
        frameRef.current = requestAnimationFrame(tick);
        return;
      }
      setDisplayValue(to);
      setIsAnimating(false);
      frameRef.current = null;
    };

    frameRef.current = requestAnimationFrame(tick);

    return () => {
      if (frameRef.current !== null) {
        cancelAnimationFrame(frameRef.current);
        frameRef.current = null;
      }
    };
  }, [value]);

  return (
    <motion.div
      animate={isAnimating ? { scale: [1, 1.12, 1], opacity: [0.9, 1, 1] } : { scale: 1, opacity: 1 }}
      transition={{ duration: 0.4, ease: 'easeOut' }}
      className={cn(
        'flex items-baseline gap-1 text-[11px] font-black uppercase tracking-[0.16em]',
        align === 'right' ? 'justify-end' : 'justify-start'
      )}
    >
      <span className={cn('tabular-nums transition-colors duration-300', isAnimating ? accentClassName : 'text-white/60')}>
        {displayValue}
      </span>
      <span className="text-white/35">{label}</span>
    </motion.div>
  );
}
