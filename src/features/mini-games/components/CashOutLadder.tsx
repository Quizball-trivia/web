'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Check, X, Lock } from 'lucide-react';
import { MiniGameShell, StatPill } from './MiniGameShell';
import { TRIVIA } from '../data/trivia';
import { money } from '../lib/odds';

const MULTS = [1, 2, 4, 8, 16, 32];
const TOP = MULTS.length - 1;
const STAKE = 100;
// Ghost survival probability of surviving the climb TO each level (index = level).
const SURVIVAL = [1, 0.82, 0.68, 0.52, 0.38, 0.24];

type Phase = 'idle' | 'playing' | 'decision' | 'cashed' | 'busted';

export function CashOutLadder({ backHref }: { backHref?: string } = {}) {
  const [points, setPoints] = useState(1000);
  const [phase, setPhase] = useState<Phase>('idle');
  const [level, setLevel] = useState(0);
  const [qIndex, setQIndex] = useState(0);
  const [selected, setSelected] = useState<number | null>(null);
  const [banked, setBanked] = useState(0);
  const [ghostBust, setGhostBust] = useState<number | null>(null); // level ghost fails (or TOP+1 = reached top)
  const [ghostReveal, setGhostReveal] = useState(0); // highest level revealed so far during the ghost climb
  const timers = useRef<number[]>([]);
  useEffect(() => () => timers.current.forEach((t) => window.clearTimeout(t)), []);

  const question = TRIVIA[qIndex % TRIVIA.length];

  const start = () => {
    setPoints((p) => p - STAKE);
    setLevel(0);
    setQIndex(0);
    setSelected(null);
    setBanked(0);
    setGhostBust(null);
    setGhostReveal(0);
    setPhase('playing');
  };

  // Roll the ghost's continuation from `fromLevel` and animate the reveal.
  const revealGhost = useCallback((fromLevel: number) => {
    let bust = TOP + 1;
    for (let i = fromLevel + 1; i <= TOP; i += 1) {
      if (Math.random() >= SURVIVAL[i]) {
        bust = i;
        break;
      }
    }
    setGhostBust(bust);
    setGhostReveal(fromLevel);
    const reachTo = Math.min(bust, TOP);
    for (let i = fromLevel + 1; i <= reachTo; i += 1) {
      const t = window.setTimeout(() => setGhostReveal(i), (i - fromLevel) * 450);
      timers.current.push(t);
    }
  }, []);

  const answer = (i: number) => {
    if (selected !== null) return;
    setSelected(i);
    window.setTimeout(() => {
      if (i === question.answer) {
        const next = level + 1;
        setLevel(next);
        setSelected(null);
        setQIndex((q) => q + 1);
        if (next === TOP) {
          setBanked(STAKE * MULTS[TOP]);
          setPoints((p) => p + STAKE * MULTS[TOP]);
          setGhostBust(TOP + 1);
          setGhostReveal(TOP);
          setPhase('cashed');
        } else {
          setPhase('decision');
        }
      } else {
        setPhase('busted');
      }
    }, 750);
  };

  const bank = () => {
    const amount = STAKE * MULTS[level];
    setBanked(amount);
    setPoints((p) => p + amount);
    setPhase('cashed');
    revealGhost(level);
  };

  const cont = () => {
    setSelected(null);
    setPhase('playing');
  };

  const potNow = STAKE * MULTS[level];

  return (
    <MiniGameShell
      backHref={backHref}
      title="Cash Out Ladder"
      subtitle="Bank it or climb — one wrong answer wipes it all"
      accent="#FF9600"
      headerRight={<StatPill label="Points" value={points.toLocaleString()} color="#FF9600" />}
    >
      <div className="mt-2 flex gap-4">
        {/* Ladder */}
        <div className="flex w-[92px] shrink-0 flex-col-reverse gap-1.5">
          {MULTS.map((m, i) => {
            const climbed = i <= level && phase !== 'idle';
            const isCurrent = i === level && (phase === 'playing' || phase === 'decision');
            const ghostLit = phase === 'cashed' && i > level && i <= ghostReveal;
            const ghostBusted = phase === 'cashed' && ghostBust !== null && i === ghostBust && ghostBust <= TOP;
            return (
              <div
                key={m}
                className={`flex h-11 items-center justify-center rounded-lg border-2 font-poppins text-base font-black tabular-nums transition-colors ${
                  ghostBusted
                    ? 'border-brand-red bg-brand-red/20 text-brand-red'
                    : ghostLit
                      ? 'border-white/20 bg-white/[0.06] text-white/50'
                      : isCurrent
                        ? 'border-brand-orange bg-brand-orange/20 text-brand-orange'
                        : climbed
                          ? 'border-brand-green bg-brand-green/15 text-brand-green'
                          : 'border-white/10 bg-white/[0.02] text-white/25'
                }`}
              >
                {ghostBusted ? <X className="size-4" /> : `${m}x`}
              </div>
            );
          })}
        </div>

        {/* Right column */}
        <div className="flex min-w-0 flex-1 flex-col">
          <div className="rounded-2xl border-2 border-brand-orange/30 bg-gradient-to-b from-brand-orange/[0.1] to-transparent p-3 text-center">
            <div className="font-poppins text-[10px] font-black uppercase tracking-[0.15em] text-brand-orange/80">
              {phase === 'idle' ? 'Stake' : phase === 'busted' ? 'Wiped' : phase === 'cashed' ? 'Banked' : 'Pot at risk'}
            </div>
            <AnimatePresence mode="popLayout">
              <motion.div
                key={`${phase}-${phase === 'cashed' ? banked : phase === 'busted' ? 0 : potNow}`}
                initial={{ y: 8, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                exit={{ opacity: 0, position: 'absolute' }}
                className="font-poppins text-3xl font-black tabular-nums"
                style={{ color: phase === 'busted' ? '#FB3101' : phase === 'cashed' ? '#58CC02' : '#FF9600' }}
              >
                {money(phase === 'idle' ? STAKE : phase === 'busted' ? 0 : phase === 'cashed' ? banked : potNow)}
              </motion.div>
            </AnimatePresence>
            <div className="font-poppins text-[10px] font-semibold text-white/40">{MULTS[level]}x on {money(STAKE)}</div>
          </div>

          <div className="mt-3 flex-1">
            <AnimatePresence mode="wait">
              {phase === 'idle' && (
                <motion.button key="idle" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={start} className="flex h-full min-h-[120px] w-full items-center justify-center rounded-2xl bg-brand-orange font-poppins text-lg font-black uppercase tracking-wide text-black">
                  Stake {money(STAKE)} & climb
                </motion.button>
              )}

              {(phase === 'playing') && (
                <motion.div key={`play-${qIndex}`} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
                  <p className="mb-2.5 font-poppins text-sm font-bold leading-snug text-white">{question.q}</p>
                  <div className="grid grid-cols-1 gap-1.5">
                    {question.options.map((opt, i) => {
                      const isAnswer = i === question.answer;
                      const isPicked = selected === i;
                      const state = selected === null ? 'idle' : isAnswer ? 'correct' : isPicked ? 'wrong' : 'dim';
                      return (
                        <button
                          key={i}
                          type="button"
                          disabled={selected !== null}
                          onClick={() => answer(i)}
                          className={`flex items-center justify-between rounded-lg border-2 px-3 py-2.5 text-left font-poppins text-[13px] font-bold transition-colors ${
                            state === 'idle'
                              ? 'border-white/10 bg-white/[0.03] text-white hover:border-brand-orange/50'
                              : state === 'correct'
                                ? 'border-brand-green bg-brand-green/15 text-white'
                                : state === 'wrong'
                                  ? 'border-brand-red bg-brand-red/15 text-white'
                                  : 'border-white/5 bg-white/[0.02] text-white/35'
                          }`}
                        >
                          <span className="min-w-0 truncate">{opt}</span>
                          {state === 'correct' && <Check className="size-4 shrink-0 text-brand-green" />}
                          {state === 'wrong' && <X className="size-4 shrink-0 text-brand-red" />}
                        </button>
                      );
                    })}
                  </div>
                </motion.div>
              )}

              {phase === 'decision' && (
                <motion.div key="decision" initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }} className="flex h-full flex-col justify-center gap-2">
                  <div className="text-center font-poppins text-xs font-bold text-white/55">
                    Bank <span className="text-brand-green">{money(potNow)}</span> now, or risk it for <span className="text-brand-orange">{money(STAKE * MULTS[Math.min(level + 1, TOP)])}</span>?
                  </div>
                  <button type="button" onClick={bank} className="flex h-14 items-center justify-center gap-2 rounded-2xl bg-brand-green font-poppins text-base font-black uppercase text-white">
                    <Lock className="size-4" /> Bank {money(potNow)}
                  </button>
                  <button type="button" onClick={cont} className="h-14 rounded-2xl border-2 border-brand-orange bg-brand-orange/10 font-poppins text-base font-black uppercase text-brand-orange">
                    Climb to {MULTS[Math.min(level + 1, TOP)]}x
                  </button>
                </motion.div>
              )}

              {phase === 'cashed' && (
                <GhostReveal key="cashed" banked={banked} level={level} ghostBust={ghostBust} ghostReveal={ghostReveal} onRestart={() => setPhase('idle')} />
              )}

              {phase === 'busted' && (
                <motion.div key="busted" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="flex h-full flex-col items-center justify-center gap-3 text-center">
                  <div className="text-4xl">💥</div>
                  <div className="font-poppins text-xl font-black uppercase text-brand-red">Wiped!</div>
                  <p className="font-poppins text-xs font-semibold text-white/50">Wrong answer at {MULTS[level]}x — the whole pot is gone.</p>
                  <button type="button" onClick={() => setPhase('idle')} className="h-12 w-full rounded-2xl bg-brand-orange font-poppins text-base font-black uppercase text-black">
                    Try again
                  </button>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>
    </MiniGameShell>
  );
}

function GhostReveal({ banked, level, ghostBust, ghostReveal, onRestart }: { banked: number; level: number; ghostBust: number | null; ghostReveal: number; onRestart: () => void }) {
  const reachedTop = ghostBust === TOP + 1;
  const done = reachedTop ? ghostReveal >= TOP : ghostBust !== null && ghostReveal >= ghostBust - 1;
  const wouldHave = ghostBust === null ? level : reachedTop ? TOP : ghostBust - 1;
  const dodged = !reachedTop && ghostBust === level + 1;
  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="flex h-full flex-col items-center justify-center gap-2 text-center">
      <div className="flex items-center gap-2 font-poppins text-lg font-black uppercase text-brand-green">
        <Lock className="size-4" /> Banked {money(banked)}
      </div>
      <AnimatePresence>
        {done && (
          <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="mt-1">
            {reachedTop ? (
              <p className="font-poppins text-sm font-black text-brand-red">😱 It would have hit 32x!</p>
            ) : dodged ? (
              <p className="font-poppins text-sm font-black text-brand-green">Smart! You&apos;d have busted at {MULTS[ghostBust!]}x.</p>
            ) : (
              <p className="font-poppins text-sm font-bold text-white/70">
                It would&apos;ve climbed to <span className="font-black text-brand-orange">{MULTS[wouldHave]}x</span> then busted at {MULTS[ghostBust!]}x.
              </p>
            )}
          </motion.div>
        )}
      </AnimatePresence>
      {done && (
        <button type="button" onClick={onRestart} className="mt-3 h-12 w-full rounded-2xl bg-brand-orange font-poppins text-base font-black uppercase text-black">
          Go again
        </button>
      )}
    </motion.div>
  );
}
