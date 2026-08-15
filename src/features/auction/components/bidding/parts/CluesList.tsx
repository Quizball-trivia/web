'use client';

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

  return (
    <div className="space-y-2.5">
      {clues.map((clue, i) => {
        const revealed = i < visibleClues;
        return (
          <div
            key={i}
            className={cn(
              'flex items-start gap-3 rounded-xl px-3 py-2.5 transition-colors',
              isCard ? 'bg-black/[0.04]' : 'bg-white/[0.03]',
            )}
          >
            <span
              className="mt-px w-4 shrink-0 text-center font-poppins text-sm font-black tabular-nums"
              style={{ color: revealed ? accent : isCard ? 'rgba(0,0,0,0.2)' : 'rgba(255,255,255,0.2)' }}
            >
              {i + 1}
            </span>
            {revealed ? (
              <motion.p
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.45, ease: EASE.smooth }}
                className={cn('font-poppins font-semibold leading-snug', textSize, isCard ? 'text-black' : 'text-white')}
              >
                {clue}
              </motion.p>
            ) : (
              // Skeleton for a locked clue — keeps the row height stable.
              <span className="flex flex-1 flex-col gap-1.5 py-1" aria-hidden>
                <span className={cn('h-2 w-11/12 rounded-full', isCard ? 'bg-black/10' : 'bg-white/10')} />
                <span className={cn('h-2 w-2/3 rounded-full', isCard ? 'bg-black/10' : 'bg-white/10')} />
              </span>
            )}
          </div>
        );
      })}
    </div>
  );
}
