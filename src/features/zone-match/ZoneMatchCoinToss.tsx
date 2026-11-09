'use client';

/* eslint-disable @next/next/no-img-element -- small static coin and button art. */

/**
 * The kick-off coin toss. You call it — heads (the ball) or tails (the cup) — and your opponent takes the other side;
 * if you don't call in time it's called for you. The coin is flipped: a 3D coin spins up, turns over and over, lands
 * and settles on its face, and whoever called that face kicks off. Then the countdown to kick-off.
 *
 * Who kicks off is the match's (`kickoff`); the face the coin lands on is derived from it and your call, so the toss
 * always agrees with the match.
 */

import { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { cn } from '@/lib/utils';
import type { DuelSide } from '@/features/numeric-question/numericDuel';
import type { RevealSeat } from './ZoneMatchCards';
import { fill } from './zoneMatch.copy';
import { useZoneCopy } from './useZoneCopy';

type Face = 'heads' | 'tails';

/** Time to call before it's called for you. */
const CALL_MS = 4000;
/** The flip, from leaving the thumb to settling on the ground. */
const FLIP_MS = 2400;
const COIN = 168;
const EDGE = 12;
const other = (face: Face): Face => (face === 'heads' ? 'tails' : 'heads');
const poppins = { fontFamily: "'Poppins', sans-serif", fontWeight: 600 } as const;

function CoinFace({ face, back = false }: { face: Face; back?: boolean }) {
  return (
    <div
      className="absolute inset-0 grid place-items-center rounded-full"
      style={{
        transform: `${back ? 'rotateX(180deg) ' : ''}translateZ(${EDGE / 2}px)`,
        backfaceVisibility: 'hidden',
        background: 'radial-gradient(circle at 35% 30%, #FFF3B0, #FFD23F 38%, #E2A500 72%, #B37F00)',
        boxShadow: 'inset 0 0 0 7px #C99300, inset 0 0 0 10px #FFE58A',
      }}
    >
      <img src={face === 'heads' ? '/assets/brand/ball.webp' : '/assets/brand/ucl-trophy.webp'} alt="" className="size-[52%] object-contain drop-shadow-[0_2px_2px_rgba(120,80,0,0.45)]" draggable={false} />
    </div>
  );
}

/** A gold coin with thickness: two faces and a ribbed edge built from stacked rings. */
function Coin3D() {
  return (
    <div className="relative" style={{ width: COIN, height: COIN, transformStyle: 'preserve-3d' }}>
      {Array.from({ length: EDGE }, (_, i) => (
        <div key={i} className="absolute inset-0 rounded-full" style={{ transform: `translateZ(${i - EDGE / 2 + 0.5}px)`, background: i % 2 ? '#B98400' : '#D49A00' }} />
      ))}
      <CoinFace face="heads" />
      <CoinFace face="tails" back />
    </div>
  );
}

export function CoinToss({ kickoff, seats, timeLeft }: { kickoff: DuelSide; seats: Record<DuelSide, RevealSeat>; timeLeft: number | null }) {
  const { c } = useZoneCopy();
  const [call, setCall] = useState<Face | null>(null);
  const [auto, setAuto] = useState(false);
  useEffect(() => {
    if (call) return;
    const id = window.setTimeout(() => {
      setAuto(true);
      setCall(Math.random() < 0.5 ? 'heads' : 'tails');
    }, CALL_MS);
    return () => window.clearTimeout(id);
  }, [call]);

  // You win the toss when the coin lands on your call.
  const landed: Face | null = call ? (kickoff === 'player' ? call : other(call)) : null;
  const [settled, setSettled] = useState(false);
  useEffect(() => {
    if (!landed) return;
    const id = window.setTimeout(() => setSettled(true), FLIP_MS);
    return () => window.clearTimeout(id);
  }, [landed]);

  // Whole turns, then the half-turn that leaves the landed face up (tails is the coin's back).
  const turns = 6 * 360 + (landed === 'tails' ? 180 : 0);
  const youStart = kickoff === 'player';

  return (
    <div className="flex min-h-[calc(100dvh-3rem)] flex-col items-center justify-center gap-6 py-6 text-center text-white" data-zm-coin-toss>
      <div>
        <div className="text-xs font-black uppercase tracking-[0.25em] text-brand-yellow">{c.coin.title}</div>
        <h1 className="mt-1 text-3xl uppercase sm:text-4xl" style={poppins}>
          {!call ? c.coin.callIt : !settled ? c.coin.flipping : youStart ? c.coin.youKickOff : fill(c.coin.themKickOff, { name: seats.opponent.name })}
        </h1>
        <p className="mt-1 text-sm text-white/60">
          {!call
            ? c.coin.callHint
            : fill(auto ? c.coin.calledForYou : c.coin.youCalled, { face: c.coin[call], name: seats.opponent.name, other: c.coin[other(call)] })}
        </p>
      </div>

      {/* The coin: on the ground until called, then up, over and over, down, a bounce, and still. */}
      <div className="relative grid h-[340px] w-full place-items-end justify-center" style={{ perspective: 900 }}>
        <motion.div
          className="absolute bottom-3 h-5 rounded-[50%] bg-black/45 blur-[6px]"
          style={{ width: COIN * 0.9 }}
          animate={landed ? { scale: [1, 0.35, 0.35, 1, 1], opacity: [0.8, 0.25, 0.25, 0.8, 0.8] } : { scale: 1, opacity: 0.8 }}
          transition={{ duration: FLIP_MS / 1000, times: [0, 0.45, 0.6, 0.86, 1] }}
        />
        <motion.div
          className="mb-6"
          style={{ transformStyle: 'preserve-3d' }}
          initial={{ y: 0, rotateX: 72 }}
          animate={
            landed
              ? { y: [0, -150, -150, 0, -22, 0], rotateX: [72, 72 + turns * 0.45, 72 + turns * 0.62, turns, turns, turns], scale: [1, 1.06, 1.06, 1, 1, 1] }
              : { y: [0, -6, 0], rotateX: 72 }
          }
          transition={landed ? { duration: FLIP_MS / 1000, times: [0, 0.42, 0.58, 0.84, 0.92, 1], ease: 'easeInOut' } : { duration: 1.6, repeat: Infinity }}
        >
          <Coin3D />
        </motion.div>
      </div>

      <AnimatePresence mode="wait">
        {!call ? (
          <motion.div key="call" exit={{ opacity: 0, y: 8 }} className="flex gap-3">
            {(['heads', 'tails'] as const).map((face) => (
              <button
                key={face}
                type="button"
                onClick={() => setCall(face)}
                className="flex items-center gap-2 rounded-[14px] bg-brand-green px-6 py-3 text-base uppercase text-white transition-colors hover:bg-brand-green-deep"
                style={poppins}
              >
                <img src={face === 'heads' ? '/assets/brand/ball.webp' : '/assets/brand/ucl-trophy.webp'} alt="" className="size-6 object-contain" draggable={false} />
                {c.coin[face]}
              </button>
            ))}
          </motion.div>
        ) : settled ? (
          <motion.div key="result" initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="flex flex-col items-center gap-2">
            <div className={cn('rounded-full px-4 py-1.5 text-sm font-black uppercase', youStart ? 'bg-brand-blue text-white' : 'bg-brand-red-soft text-white')}>
              {youStart ? fill(c.coin.youFirst, { face: c.coin[landed!] }) : fill(c.coin.themFirst, { face: c.coin[landed!], name: seats.opponent.name })}
            </div>
            {timeLeft !== null && timeLeft <= 3 && (
              <motion.div key={timeLeft} initial={{ scale: 1.6, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="text-5xl text-brand-yellow" style={poppins}>
                {Math.max(1, timeLeft)}
              </motion.div>
            )}
          </motion.div>
        ) : (
          <motion.div key="wait" className="h-12" />
        )}
      </AnimatePresence>
    </div>
  );
}
