'use client';

import { useMemo, useState } from 'react';
import { motion } from 'motion/react';
import { useMiniT } from '../lib/i18n';
import { EDITION_LABEL } from '../lib/guessCard';
import { FIFA_EDITIONS, type FifaEdition } from '../data/guessFifaCard';

/** The reel can also land on ICONS (a chance to draw a legend). */
export type SpinTarget = FifaEdition | 'ICONS';
const REEL: SpinTarget[] = [...FIFA_EDITIONS, 'ICONS'];

/** Horizontal reel of edition tiles that decelerates and lands on `target`.
 *  The strip's left edge is anchored at the viewport centre (left-1/2), so the
 *  landing offset is pure geometry — no width measurement, no layout effect. */
export function EditionSpinner({ target, onDone }: { target: SpinTarget; onDone: () => void }) {
  const t = useMiniT();
  const ITEM = 92; // tile width
  const CELL = ITEM + 12; // + gap-3
  const LOOPS = 7;
  const strip = useMemo(() => Array.from({ length: LOOPS }, () => REEL).flat(), []);
  const [landed, setLanded] = useState(false);

  const idx = Math.max(0, REEL.indexOf(target));
  const landingIndex = (LOOPS - 2) * REEL.length + idx;
  const centerCell = (k: number) => -(k * CELL + ITEM / 2); // x that centres cell k
  const finalX = centerCell(landingIndex);
  const initialX = centerCell(3); // start with a few cells already left of centre

  return (
    <div className="flex flex-col items-center py-4">
      <p className="mb-5 font-poppins text-sm font-black uppercase tracking-[0.22em]" style={{ color: landed ? '#38B60E' : '#FFD54A' }}>
        {landed ? t('Locked in!') : t('Spinning the edition…')}
      </p>
      <div className="relative h-[132px] w-full overflow-hidden">
        {/* edge fades */}
        <div aria-hidden className="pointer-events-none absolute inset-y-0 left-0 z-10 w-14 bg-gradient-to-r from-black/70 to-transparent" />
        <div aria-hidden className="pointer-events-none absolute inset-y-0 right-0 z-10 w-14 bg-gradient-to-l from-black/70 to-transparent" />
        {/* centre selector */}
        <motion.div
          aria-hidden
          className="pointer-events-none absolute left-1/2 top-1/2 z-20 h-[124px] w-[98px] -translate-x-1/2 -translate-y-1/2 rounded-2xl border-[3px]"
          animate={{
            borderColor: landed ? '#38B60E' : '#FFD54A',
            boxShadow: landed ? '0 0 30px rgba(56,182,14,0.7)' : '0 0 20px rgba(255,213,74,0.5)',
          }}
          transition={{ duration: 0.4 }}
        />
        <div aria-hidden className="pointer-events-none absolute left-1/2 top-[2px] z-20 -translate-x-1/2" style={{ borderLeft: '7px solid transparent', borderRight: '7px solid transparent', borderTop: '9px solid #FFD54A' }} />
        <motion.div
          className="absolute left-1/2 top-0 flex h-full items-center gap-3"
          initial={{ x: initialX }}
          animate={{ x: finalX }}
          transition={{ duration: 2.6, ease: [0.12, 0.85, 0.2, 1] }}
          onAnimationComplete={() => {
            setLanded(true);
            window.setTimeout(onDone, 560);
          }}
        >
          {strip.map((e, i) =>
            e === 'ICONS' ? <IconTile key={i} /> : <EditionTile key={i} label={EDITION_LABEL[e] ?? e} />,
          )}
        </motion.div>
      </div>
      <p className="mt-5 font-poppins text-xs font-semibold text-white/35">{t('Guess the player from the drawn edition')}</p>
    </div>
  );
}

/** The special ICONS tile — a chance to draw a legend. */
function IconTile() {
  return (
    <div
      className="flex h-[116px] w-[92px] shrink-0 flex-col items-center justify-center gap-1 rounded-2xl border border-[#caa94f]/60 shadow-[0_6px_16px_rgba(0,0,0,0.4)]"
      style={{ background: 'linear-gradient(160deg, #2b2b31 0%, #1b1b20 55%, #101014 100%)' }}
    >
      <span className="font-poppins text-[26px] font-black leading-none text-[#e9d8a6]" style={{ textShadow: '0 1px 6px rgba(233,216,166,0.5)' }}>
        ★
      </span>
      <span className="font-poppins text-[13px] font-black uppercase tracking-widest text-[#e9d8a6]">Icon</span>
      <span className="mt-1 h-1 w-6 rounded-full bg-[#e9d8a6]/40" />
    </div>
  );
}

/** A mini gold "pack" tile showing one edition (e.g. FIFA / 22). */
function EditionTile({ label }: { label: string }) {
  const [prefix, num] = label.split(' ');
  return (
    <div
      className="flex h-[116px] w-[92px] shrink-0 flex-col items-center justify-center gap-1 rounded-2xl border border-[#7c5e1e]/40 shadow-[0_6px_16px_rgba(0,0,0,0.35)]"
      style={{ background: 'linear-gradient(157deg, #f7e7a8 0%, #e6c56f 55%, #cba33c 100%)' }}
    >
      <span className="font-poppins text-[11px] font-black uppercase tracking-widest text-[#3a2c08]/75">{prefix}</span>
      <span className="font-poppins text-[30px] font-black leading-none text-[#2c2107]">{num}</span>
      <span className="mt-1 h-1 w-6 rounded-full bg-[#3a2c08]/25" />
    </div>
  );
}
