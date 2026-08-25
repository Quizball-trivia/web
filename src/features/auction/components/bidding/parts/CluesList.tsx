'use client';

import { useEffect, useRef } from 'react';
import { motion } from 'motion/react';
import { cn } from '@/lib/utils';
import { EASE } from '../../../constants/motion';

/**
 * Clean clue display. All three clue slots are reserved up front so the panel
 * never resizes as clues arrive (the old staggered blur-in made it jump).
 * Revealed clues fade up calmly; not-yet-revealed slots show a muted skeleton.
 * `variant` swaps the colour scheme: `card` (dark text on the yellow mystery
 * card) vs `panel` (light text on the dark stadium overlay); `accent` tints the
 * clue index to the position colour.
 */
export function CluesList({
  clues,
  visibleClues,
  variant,
  accent = '#FFE500',
}: {
  clues: string[];
  visibleClues: number;
  allCluesRevealed?: boolean;
  isCluePhase?: boolean;
  variant: 'card' | 'panel';
  accent?: string;
}) {
  const isCard = variant === 'card';
  const chars = clues.reduce((s, c) => s + c.length, 0);
  const textSize = chars > 320 ? 'text-sm' : 'text-[15px] sm:text-base';

  // Each newly revealed clue scrolls itself into view — on small screens the
  // text hints sit below the fold of the scrollable card, and a reveal nobody
  // sees is no reveal. `nearest` keeps it gentle when already visible.
  const lastRevealedRef = useRef<HTMLDivElement | null>(null);
  const prevVisibleRef = useRef(visibleClues);
  useEffect(() => {
    if (visibleClues > prevVisibleRef.current) {
      lastRevealedRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
    prevVisibleRef.current = visibleClues;
  }, [visibleClues]);

  return (
    <div className="space-y-2.5">
      {clues.map((clue, i) => {
        const revealed = i < visibleClues;
        return (
          <div
            key={i}
            ref={revealed && i === visibleClues - 1 ? lastRevealedRef : undefined}
            className={cn(
              'flex items-start gap-3 rounded-xl px-3 py-2.5 transition-colors',
              'bg-black/25',
            )}
          >
            <span
              className="mt-px w-4 shrink-0 text-center font-poppins text-sm font-black tabular-nums"
              style={{ color: revealed ? accent : 'rgba(255,255,255,0.35)' }}
            >
              {i + 1}
            </span>
            {revealed ? (
              <motion.p
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.45, ease: EASE.smooth }}
                className={cn('font-poppins font-semibold leading-snug', textSize, 'text-white')}
              >
                {clue}
              </motion.p>
            ) : (
              // Skeleton for a locked clue — keeps the row height stable.
              <span className="flex flex-1 flex-col gap-1.5 py-1" aria-hidden>
                <span className={cn('h-2 w-11/12 rounded-full', 'bg-white/25')} />
                <span className={cn('h-2 w-2/3 rounded-full', 'bg-white/25')} />
              </span>
            )}
          </div>
        );
      })}
    </div>
  );
}
