'use client';

import { useEffect, useMemo, useState } from 'react';
import { motion, useReducedMotion } from 'motion/react';
import { useMiniT } from '@/features/mini-games/lib/i18n';

const ITEM = 92;
const CELL = ITEM + 12;
const BACKS = 22;

/**
 * The Card Detective "deal": a strip of face-down gold cards races past the
 * centre and stops on the one you get. Same geometry as the FIFA Cards edition
 * reel (strip anchored at the viewport centre), but it deals a card back rather
 * than picking an edition — the flip into the locked board happens next.
 */
export function CardDealReel({ onDone, cardNumber }: { onDone: () => void; cardNumber: number }) {
  const t = useMiniT();
  const reduceMotion = useReducedMotion();
  const [landed, setLanded] = useState(false);
  // Reduced motion: no racing strip — show the dealt card and move on.
  useEffect(() => {
    if (!reduceMotion) return;
    const id = window.setTimeout(onDone, 400);
    return () => window.clearTimeout(id);
  }, [reduceMotion, onDone]);
  // Land on a different back each card so the strip visibly moves a new distance.
  const landingIndex = useMemo(() => BACKS - 6 + (cardNumber % 4), [cardNumber]);
  const centerCell = (k: number) => -(k * CELL + ITEM / 2);

  return (
    <div className="flex flex-col items-center py-4">
      <p className="mb-5 font-poppins text-sm font-black uppercase tracking-[0.22em]" style={{ color: landed ? '#38B60E' : '#FFD54A' }}>
        {landed ? t('Your card') : t('Dealing…')}
      </p>
      <div className="relative h-[148px] w-full overflow-hidden">
        <div aria-hidden className="pointer-events-none absolute inset-y-0 left-0 z-10 w-14 bg-gradient-to-r from-black/70 to-transparent" />
        <div aria-hidden className="pointer-events-none absolute inset-y-0 right-0 z-10 w-14 bg-gradient-to-l from-black/70 to-transparent" />
        <motion.div
          aria-hidden
          className="pointer-events-none absolute left-1/2 top-1/2 z-20 h-[140px] w-[100px] -translate-x-1/2 -translate-y-1/2 rounded-2xl border-[3px]"
          animate={{ borderColor: landed ? '#38B60E' : '#FFD54A', boxShadow: landed ? '0 0 30px rgba(56,182,14,0.7)' : '0 0 20px rgba(255,213,74,0.5)' }}
          transition={{ duration: 0.4 }}
        />
        <motion.div
          className="absolute left-1/2 top-0 flex h-full items-center gap-3"
          initial={{ x: reduceMotion ? centerCell(landingIndex) : centerCell(2) }}
          animate={{ x: centerCell(landingIndex) }}
          transition={reduceMotion ? { duration: 0 } : { duration: 2.2, ease: [0.12, 0.85, 0.2, 1] }}
          onAnimationComplete={() => {
            if (reduceMotion) return;
            setLanded(true);
            window.setTimeout(onDone, 520);
          }}
        >
          {Array.from({ length: BACKS }, (_, i) => (
            <CardBack key={i} lit={landed && i === landingIndex} />
          ))}
        </motion.div>
      </div>
      <p className="mt-5 font-poppins text-xs font-semibold text-white/35">{t('Buy clues on the card, name the player, keep your coins')}</p>
    </div>
  );
}

/** A face-down gold card: dark plate, gold rim, a "?" crest. */
export function CardBack({ lit = false, className = '' }: { lit?: boolean; className?: string }) {
  return (
    <motion.div
      animate={lit ? { scale: 1.06 } : { scale: 1 }}
      className={`relative flex h-[128px] w-[92px] shrink-0 items-center justify-center overflow-hidden rounded-2xl border-2 ${className}`}
      style={{ borderColor: '#cba33c', background: 'linear-gradient(160deg, #2a2008 0%, #0f1420 55%, #1a1408 100%)', boxShadow: '0 8px 18px rgba(0,0,0,0.45)' }}
    >
      <div aria-hidden className="pointer-events-none absolute inset-[6px] rounded-xl border border-[#cba33c]/40" />
      <div aria-hidden className="pointer-events-none absolute inset-0" style={{ background: 'linear-gradient(116deg, rgba(255,255,255,0.18) 0%, rgba(255,255,255,0) 30%, rgba(255,255,255,0) 65%, rgba(255,255,255,0.12) 82%, rgba(255,255,255,0) 100%)' }} />
      <span className="font-poppins text-[34px] font-black" style={{ color: '#e5c164', textShadow: '0 2px 6px rgba(0,0,0,0.6)' }}>?</span>
    </motion.div>
  );
}
