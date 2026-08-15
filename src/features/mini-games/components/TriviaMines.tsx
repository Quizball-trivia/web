'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Check, X, Eye, Lock } from 'lucide-react';
import { MiniGameShell, StatPill } from './MiniGameShell';
import { getTrivia } from '../data/trivia';
import { formatOdds, money } from '../lib/odds';
import { useMiniLocale, useMiniT } from '../lib/i18n';

const SIZE = 25;
const DEFENDERS = 4;
const STAKES = [50, 100, 250];
const SCOUTS_MAX = 3;
const MARGIN = 0.97;

type Phase = 'idle' | 'playing' | 'question' | 'busted' | 'cashed';

/** Fair inverse-survival multiplier after k safe picks, with house margin. */
function multAfter(k: number): number {
  let m = 1;
  for (let i = 0; i < k; i += 1) m *= (SIZE - i) / (SIZE - DEFENDERS - i);
  return Math.round(m * MARGIN * 100) / 100;
}

function randomDefenders(): Set<number> {
  const mines = new Set<number>();
  while (mines.size < DEFENDERS) mines.add(Math.floor(Math.random() * SIZE));
  return mines;
}

function shuffled<T>(arr: T[]): T[] {
  const out = [...arr];
  for (let i = out.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

export function TriviaMines({ backHref }: { backHref?: string } = {}) {
  const t = useMiniT();
  const miniLocale = useMiniLocale();
  const bank = useMemo(() => shuffled(getTrivia(miniLocale)), [miniLocale]);
  const [points, setPoints] = useState(1000);
  const [stake, setStake] = useState(100);
  const [phase, setPhase] = useState<Phase>('idle');
  const [defenders, setDefenders] = useState<Set<number>>(new Set());
  const [opened, setOpened] = useState<Set<number>>(new Set());
  const [flagged, setFlagged] = useState<Set<number>>(new Set());
  const [bustTile, setBustTile] = useState<number | null>(null);
  const [scoutsLeft, setScoutsLeft] = useState(SCOUTS_MAX);
  const [qIndex, setQIndex] = useState(0);
  const [selected, setSelected] = useState<number | null>(null);
  const [scoutMsg, setScoutMsg] = useState<'hit' | 'miss' | null>(null);
  const [payout, setPayout] = useState(0);
  const timers = useRef<number[]>([]);
  useEffect(() => () => timers.current.forEach((id) => window.clearTimeout(id)), []);
  const later = (fn: () => void, ms: number) => {
    const id = window.setTimeout(fn, ms);
    timers.current.push(id);
  };

  const safePicks = opened.size;
  const mult = multAfter(safePicks);
  const nextMult = multAfter(safePicks + 1);
  const pot = Math.round(stake * mult);
  const question = bank[qIndex % bank.length];

  const start = () => {
    setPoints((p) => p - stake);
    setDefenders(randomDefenders());
    setOpened(new Set());
    setFlagged(new Set());
    setBustTile(null);
    setScoutsLeft(SCOUTS_MAX);
    setSelected(null);
    setScoutMsg(null);
    setPayout(0);
    setPhase('playing');
  };

  const pickTile = (i: number) => {
    if (phase !== 'playing' || opened.has(i) || flagged.has(i)) return;
    if (defenders.has(i)) {
      setBustTile(i);
      setPhase('busted');
      return;
    }
    setOpened((prev) => new Set(prev).add(i));
  };

  const openScout = () => {
    if (phase !== 'playing' || scoutsLeft <= 0) return;
    setSelected(null);
    setScoutMsg(null);
    setPhase('question');
  };

  const answerScout = (i: number) => {
    if (selected !== null) return;
    setSelected(i);
    setScoutsLeft((s) => s - 1);
    later(() => {
      if (i === question.answer) {
        const hidden = [...defenders].filter((d) => !flagged.has(d));
        if (hidden.length) {
          const reveal = hidden[Math.floor(Math.random() * hidden.length)];
          setFlagged((prev) => new Set(prev).add(reveal));
        }
        setScoutMsg('hit');
      } else {
        setScoutMsg('miss');
      }
      setQIndex((q) => q + 1);
      later(() => {
        setScoutMsg(null);
        setPhase('playing');
      }, 1300);
    }, 900);
  };

  const cashOut = () => {
    if (phase !== 'playing' || safePicks === 0) return;
    setPayout(pot);
    setPoints((p) => p + pot);
    setPhase('cashed');
  };

  const boardLocked = phase === 'busted' || phase === 'cashed';

  return (
    <MiniGameShell
      backHref={backHref}
      title={t('Trivia Mines')}
      subtitle={t('Dribble past hidden defenders — scout them with your knowledge')}
      accent="#85E000"
      headerRight={<StatPill label={t('Points')} value={points.toLocaleString()} color="#85E000" />}
    >
      {phase === 'idle' ? (
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="flex flex-1 flex-col items-center justify-center gap-4">
          <div className="text-5xl">🛡️</div>
          <p className="max-w-xs text-center font-poppins text-sm font-semibold leading-snug text-white/60">
            {t('{d} defenders hide in {n} tiles. Every clean dribble grows the pot — hit a defender and lose it all. Answer questions to scout defenders out.', { d: DEFENDERS, n: SIZE })}
          </p>
          <div className="flex gap-2">
            {STAKES.map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => setStake(s)}
                className={`rounded-xl border-2 px-5 py-2.5 font-poppins text-sm font-black tabular-nums transition-colors ${
                  stake === s ? 'border-brand-green-bright bg-brand-green-bright/15 text-brand-green-bright' : 'border-white/10 bg-white/[0.03] text-white/60'
                }`}
              >
                {s}
              </button>
            ))}
          </div>
          <button type="button" onClick={start} className="h-14 w-full max-w-xs rounded-2xl bg-brand-green-bright font-poppins text-lg font-black uppercase tracking-wide text-black">
            {t('Stake {stake} & dribble', { stake: money(stake) })}
          </button>
        </motion.div>
      ) : (
        <div className="mt-2 flex flex-1 flex-col">
          {/* Pot strip */}
          <div className="mb-3 flex items-center justify-between rounded-2xl border-2 border-brand-green-bright/30 bg-gradient-to-b from-brand-green-bright/[0.08] to-transparent px-4 py-2.5">
            <div>
              <div className="font-poppins text-[10px] font-black uppercase tracking-wider text-white/45">
                {phase === 'busted' ? t('Tackled') : phase === 'cashed' ? t('Banked') : t('Pot')}
              </div>
              <div className={`font-poppins text-xl font-black tabular-nums ${phase === 'busted' ? 'text-brand-red' : phase === 'cashed' ? 'text-brand-green' : 'text-brand-green-bright'}`}>
                {money(phase === 'busted' ? 0 : phase === 'cashed' ? payout : pot)}
              </div>
            </div>
            <div className="text-right">
              <div className="font-poppins text-[10px] font-black uppercase tracking-wider text-white/45">{t('Now · next tile')}</div>
              <div className="font-poppins text-sm font-black tabular-nums text-white/80">
                {formatOdds(mult)}x <span className="text-brand-yellow">→ {formatOdds(nextMult)}x</span>
              </div>
            </div>
          </div>

          {/* Board */}
          <div className="grid grid-cols-5 gap-1.5">
            {Array.from({ length: SIZE }, (_, i) => {
              const isOpen = opened.has(i);
              const isFlagged = flagged.has(i);
              const isDefender = defenders.has(i);
              const showDefender = (boardLocked && isDefender) || isFlagged;
              const isBust = bustTile === i;
              return (
                <motion.button
                  key={i}
                  type="button"
                  disabled={phase !== 'playing' || isOpen || isFlagged}
                  onClick={() => pickTile(i)}
                  whileTap={phase === 'playing' && !isOpen ? { scale: 0.92 } : {}}
                  className={`flex aspect-square items-center justify-center rounded-lg border-2 text-lg transition-colors ${
                    isBust
                      ? 'border-brand-red bg-brand-red/30'
                      : showDefender
                        ? 'border-brand-red-soft/60 bg-brand-red-soft/10'
                        : isOpen
                          ? 'border-brand-green-bright/60 bg-brand-green-bright/15'
                          : phase === 'playing'
                            ? 'border-white/10 bg-white/[0.04] hover:border-brand-green-bright/50'
                            : 'border-white/10 bg-white/[0.02] opacity-70'
                  }`}
                >
                  {isBust ? '🟥' : showDefender ? '🛡️' : isOpen ? '⚽' : ''}
                </motion.button>
              );
            })}
          </div>

          {/* Controls */}
          <div className="mt-3 flex-1">
            <AnimatePresence mode="wait">
              {phase === 'playing' && (
                <motion.div key="controls" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex flex-col gap-2">
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={openScout}
                      disabled={scoutsLeft <= 0}
                      className={`flex h-12 flex-1 items-center justify-center gap-2 rounded-2xl border-2 font-poppins text-sm font-black uppercase transition-colors ${
                        scoutsLeft > 0 ? 'border-brand-cyan bg-brand-cyan/10 text-brand-cyan' : 'border-white/10 bg-white/[0.02] text-white/25'
                      }`}
                    >
                      <Eye className="size-4" /> {t('Scout ({n} left)', { n: scoutsLeft })}
                    </button>
                    <button
                      type="button"
                      onClick={cashOut}
                      disabled={safePicks === 0}
                      className={`flex h-12 flex-1 items-center justify-center gap-2 rounded-2xl font-poppins text-sm font-black uppercase transition-colors ${
                        safePicks > 0 ? 'bg-brand-green text-white' : 'bg-white/[0.04] text-white/25'
                      }`}
                    >
                      <Lock className="size-4" /> {t('Cash out {pot}', { pot: money(pot) })}
                    </button>
                  </div>
                  <p className="text-center font-poppins text-[10px] font-semibold text-white/35">
                    {t('{n} safe tiles opened · {d} defenders in play', { n: safePicks, d: DEFENDERS - flagged.size })}
                  </p>
                </motion.div>
              )}

              {phase === 'question' && (
                <motion.div key={`scout-${qIndex}`} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="rounded-2xl border-2 border-brand-cyan/40 bg-white/[0.04] p-3">
                  {scoutMsg ? (
                    <div className={`py-3 text-center font-poppins text-sm font-black uppercase ${scoutMsg === 'hit' ? 'text-brand-cyan' : 'text-brand-red'}`}>
                      {scoutMsg === 'hit' ? t('Scout report — a defender is marked!') : t('Scout failed — no intel')}
                    </div>
                  ) : (
                    <>
                      <div className="mb-1.5 flex items-center gap-1.5 font-poppins text-[10px] font-black uppercase tracking-wider text-brand-cyan">
                        <Eye className="size-3.5" /> {t('Answer to scout a defender')}
                      </div>
                      <p className="mb-2 font-poppins text-[13px] font-bold leading-snug text-white">{question.q}</p>
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
                              onClick={() => answerScout(i)}
                              className={`flex items-center justify-between rounded-lg border-2 px-3 py-2 text-left font-poppins text-xs font-bold transition-colors ${
                                state === 'idle'
                                  ? 'border-white/10 bg-white/[0.03] text-white hover:border-brand-cyan/50'
                                  : state === 'correct'
                                    ? 'border-brand-green bg-brand-green/15 text-white'
                                    : state === 'wrong'
                                      ? 'border-brand-red bg-brand-red/15 text-white'
                                      : 'border-white/5 bg-white/[0.02] text-white/35'
                              }`}
                            >
                              <span className="min-w-0 truncate">{opt}</span>
                              {state === 'correct' && <Check className="size-3.5 shrink-0 text-brand-green" />}
                              {state === 'wrong' && <X className="size-3.5 shrink-0 text-brand-red" />}
                            </button>
                          );
                        })}
                      </div>
                    </>
                  )}
                </motion.div>
              )}

              {phase === 'busted' && (
                <motion.div key="busted" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="flex flex-col items-center gap-2 text-center">
                  <div className="font-poppins text-lg font-black uppercase text-brand-red">{t('Tackled!')}</div>
                  <p className="font-poppins text-xs font-semibold text-white/50">
                    {t('A defender got you after {n} clean tiles — the pot is gone.', { n: safePicks })}
                  </p>
                  <button type="button" onClick={() => setPhase('idle')} className="mt-1 w-full rounded-2xl bg-brand-green-bright py-3.5 font-poppins text-base font-black uppercase text-black">
                    {t('New run')}
                  </button>
                </motion.div>
              )}

              {phase === 'cashed' && (
                <motion.div key="cashed" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="flex flex-col items-center gap-2 text-center">
                  <div className="font-poppins text-lg font-black uppercase text-brand-green-light">{t('Cashed {amount}!', { amount: money(payout) })}</div>
                  <p className="font-poppins text-xs font-semibold text-white/50">
                    {t('{n} clean dribbles at {mult}x.', { n: safePicks, mult: formatOdds(mult) })}
                  </p>
                  <button type="button" onClick={() => setPhase('idle')} className="mt-1 w-full rounded-2xl bg-brand-green-bright py-3.5 font-poppins text-base font-black uppercase text-black">
                    {t('New run')}
                  </button>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      )}
    </MiniGameShell>
  );
}
