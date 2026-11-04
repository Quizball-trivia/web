'use client';

/**
 * Searching direction "Scout reel": your FUT card with your three playstyles on the left; on the right a slot-machine
 * reel of rival cards spinning past while the scouts look. When someone is found the reel brakes and lands on them,
 * then the two cards meet in the middle for the VS.
 */

import { useEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { FutCard } from '../ZoneMatchFutCard';
import { CancelButton, VersusReveal, clockText, randomSeat, useSearchSeconds, type SearchScreenProps } from './searchShared';

const CARD_W = 190;
const CARD_H = Math.round((CARD_W * 321) / 200);
const GAP = 18;
const STEP = CARD_H + GAP;
const REEL = 14;

export function SearchScoutReel({ self, deck, startedAt, opponent, opponentDeck, onCancel }: SearchScreenProps) {
  const seconds = useSearchSeconds(startedAt);
  const seats = useMemo(() => Array.from({ length: REEL }, (_, i) => randomSeat(i * 31 + 7)), []);
  const strip = useRef<HTMLDivElement>(null);
  const [landed, setLanded] = useState(false);
  const [versus, setVersus] = useState(false);

  useEffect(() => {
    let raf = 0;
    let offset = 0;
    let last = performance.now();
    // Spinning: a steady scroll; found: brake onto the last slot (the opponent) over ~1.8 s.
    let brake: { from: number; to: number; start: number } | null = null;
    const loop = (now: number) => {
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      if (!opponent) {
        offset = (offset + dt * 1500) % (STEP * REEL);
      } else {
        if (!brake) {
          const to = STEP * (REEL + Math.ceil(offset / STEP) + 4);
          brake = { from: offset, to, start: now };
        }
        const k = Math.min(1, (now - brake.start) / 1800);
        offset = brake.from + (brake.to - brake.from) * (1 - (1 - k) ** 4);
        if (k >= 1) {
          setLanded(true);
          return;
        }
      }
      if (strip.current) strip.current.style.transform = `translateY(${-(offset % (STEP * REEL * 2))}px)`;
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [opponent]);

  useEffect(() => {
    if (!landed) return;
    const id = window.setTimeout(() => setVersus(true), 900);
    return () => window.clearTimeout(id);
  }, [landed]);

  // Two copies of the reel (so it wraps), then the opponent waiting at the brake point.
  const reelCards = opponent ? [...seats, ...seats, ...seats, opponent] : [...seats, ...seats];

  return (
    <div className="relative flex min-h-dvh flex-col items-center justify-center overflow-hidden bg-[#0b1220] px-4 font-poppins text-white">
      <div className="pointer-events-none absolute inset-0 opacity-30" style={{ background: 'repeating-linear-gradient(115deg, #13203a 0 60px, #0b1220 60px 120px)' }} />
      <AnimatePresence mode="wait">
        {!versus ? (
          <motion.div key="search" exit={{ opacity: 0, scale: 0.96 }} className="relative flex flex-col items-center gap-6">
            <div className="text-center">
              <p className="text-xs font-bold uppercase tracking-[0.3em] text-brand-yellow">Ranked · Zone match</p>
              <h1 className="mt-1 text-3xl font-black uppercase">{landed ? 'Opponent found!' : 'Scouting opponents'}</h1>
              <p className="mt-1 font-mono text-lg text-white/70">{clockText(seconds)}</p>
            </div>
            <div className="flex items-center gap-6 sm:gap-12">
              <div className="flex flex-col items-center gap-2">
                <FutCard seat={self} width={CARD_W} slots={[deck[0] ?? null, deck[1] ?? null, deck[2] ?? null]} shineKey={seconds % 4 === 0 ? seconds : 0} />
                <span className="text-xs font-bold uppercase text-white/60">You</span>
              </div>
              <span className="text-4xl font-black italic text-white/30">VS</span>
              <div className="flex flex-col items-center gap-2">
                <div className="relative overflow-hidden rounded-2xl" style={{ width: CARD_W + 24, height: CARD_H + 12, maskImage: 'linear-gradient(180deg, transparent, #000 14%, #000 86%, transparent)' }}>
                  <div ref={strip} className="absolute left-3 top-1.5 flex flex-col" style={{ gap: GAP, filter: landed ? 'none' : 'blur(1.5px)' }}>
                    {reelCards.map((seat, i) => (
                      <FutCard key={i} seat={seat} width={CARD_W} slots={[null, null, null]} mirror />
                    ))}
                  </div>
                  {landed && <motion.div initial={{ opacity: 0.9 }} animate={{ opacity: 0 }} transition={{ duration: 0.6 }} className="absolute inset-0 bg-white" />}
                </div>
                <span className="text-xs font-bold uppercase text-white/60">{landed && opponent ? opponent.name : '???'}</span>
              </div>
            </div>
            {!landed && <CancelButton onCancel={onCancel} />}
          </motion.div>
        ) : (
          opponent && (
            <motion.div key="vs" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="relative">
              <VersusReveal self={self} deck={deck} opponent={opponent} opponentDeck={opponentDeck} width={210} />
            </motion.div>
          )
        )}
      </AnimatePresence>
    </div>
  );
}
