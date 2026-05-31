'use client';

/**
 * Animated number that ticks from `from` → `to` after a delay, with a
 * pop + glow.
 *
 * The wrapper + inner pair is intentional: the outer `<AnimatedCounter>`
 * gives `AnimatedCounterInner` a `key` derived from `${from}-${to}-${delay}`
 * so any change to those props forces a remount, which resets the
 * inner's `useState(from)` initialiser back to the new starting value.
 * Without the wrapper the inner's value would lag a frame behind because
 * `useState` only honours its initialiser on the first render.
 *
 * Both pieces MUST be exported together — never split the wrapper from
 * the inner, or the remount semantics break and counters stop
 * re-animating when their target changes.
 */

import { useEffect, useState } from 'react';
import { motion } from 'motion/react';

export function AnimatedCounter({
  from,
  to,
  delay = 1.5,
  className,
}: {
  from: number;
  to: number;
  delay?: number;
  className?: string;
}) {
  return (
    <AnimatedCounterInner
      key={`${from}-${to}-${delay}`}
      from={from}
      to={to}
      delay={delay}
      className={className}
    />
  );
}

function AnimatedCounterInner({
  from,
  to,
  delay = 1.5,
  className,
}: {
  from: number;
  to: number;
  delay?: number;
  className?: string;
}) {
  const [value, setValue] = useState(() => from);
  const [popped, setPopped] = useState(false);

  useEffect(() => {
    if (from === to) return;

    const timer = setTimeout(() => {
      setValue(to);
      setPopped(true);
    }, delay * 1000);
    return () => clearTimeout(timer);
  }, [from, to, delay]);

  return (
    <motion.span
      className={className}
      animate={popped ? {
        scale: [1, 1.4, 1],
        textShadow: [
          '0 0 0px transparent',
          '0 0 24px currentColor',
          '0 0 0px transparent',
        ],
      } : {}}
      transition={{ duration: 0.5, ease: 'easeOut' }}
    >
      {value}
    </motion.span>
  );
}
