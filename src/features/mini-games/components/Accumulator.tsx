'use client';

import { useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Check, X, TrendingUp } from 'lucide-react';
import { MiniGameShell, StatPill } from './MiniGameShell';
import { TRIVIA, type TriviaQuestion } from '../data/trivia';
import { formatOdds, money } from '../lib/odds';

const POOL = TRIVIA.slice(0, 8);
const STAKES = [50, 100, 250];
const oddsFor = (q: TriviaQuestion) => (q.difficulty === 'hard' ? 2.6 : q.difficulty === 'medium' ? 1.9 : 1.35);

type Phase = 'select' | 'stake' | 'play' | 'cashout' | 'result';

export function Accumulator({ backHref }: { backHref?: string } = {}) {
  const [points, setPoints] = useState(500);
  const [phase, setPhase] = useState<Phase>('select');
  const [picked, setPicked] = useState<string[]>([]);
  const [stake, setStake] = useState(100);
  const [leg, setLeg] = useState(0); // legs resolved (correct)
  const [selected, setSelected] = useState<number | null>(null);
  const [result, setResult] = useState<{ won: boolean; payout: number; bustLeg?: number } | null>(null);

  const legs = useMemo(() => picked.map((id) => POOL.find((q) => q.id === id)!), [picked]);
  const combinedOdds = legs.reduce((acc, q) => acc * oddsFor(q), 1);
  const securedOdds = legs.slice(0, leg).reduce((acc, q) => acc * oddsFor(q), 1);
  const potentialReturn = stake * combinedOdds;
  const securedReturn = stake * securedOdds;

  const toggle = (id: string) => {
    setPicked((p) => (p.includes(id) ? p.filter((x) => x !== id) : p.length < 5 ? [...p, id] : p));
  };

  const placeBet = () => {
    setPoints((p) => p - stake);
    setLeg(0);
    setSelected(null);
    setPhase('play');
  };

  const answer = (i: number) => {
    if (selected !== null) return;
    const q = legs[leg];
    setSelected(i);
    window.setTimeout(() => {
      if (i === q.answer) {
        const newLeg = leg + 1;
        setLeg(newLeg);
        setSelected(null);
        if (newLeg === legs.length) {
          const payout = Math.round(stake * combinedOdds);
          setPoints((p) => p + payout);
          setResult({ won: true, payout });
          setPhase('result');
        } else if (newLeg === 4) {
          setPhase('cashout');
        }
      } else {
        setResult({ won: false, payout: 0, bustLeg: leg + 1 });
        setPhase('result');
      }
    }, 850);
  };

  const cashOut = () => {
    const payout = Math.round(securedReturn);
    setPoints((p) => p + payout);
    setResult({ won: true, payout });
    setPhase('result');
  };

  const reset = () => {
    setPhase('select');
    setPicked([]);
    setStake(100);
    setLeg(0);
    setSelected(null);
    setResult(null);
  };

  return (
    <MiniGameShell
      backHref={backHref}
      title="Accumulator"
      subtitle="Five legs. One stake. All must land."
      accent="#58CC02"
      headerRight={<StatPill label="Points" value={points.toLocaleString()} color="#58CC02" />}
    >
      <AnimatePresence mode="wait">
        {/* ── SELECT ── */}
        {phase === 'select' && (
          <motion.div key="select" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="mt-2 flex flex-1 flex-col">
            <div className="mb-2 flex items-center justify-between">
              <span className="font-poppins text-xs font-black uppercase tracking-wide text-white/50">Pick 5 legs · {picked.length}/5</span>
              <span className="font-poppins text-sm font-black text-brand-green">{formatOdds(combinedOdds)}x</span>
            </div>
            <div className="space-y-2">
              {POOL.map((q) => {
                const sel = picked.includes(q.id);
                return (
                  <button
                    key={q.id}
                    type="button"
                    onClick={() => toggle(q.id)}
                    disabled={!sel && picked.length >= 5}
                    className={`flex w-full items-center gap-3 rounded-xl border-2 px-3 py-2.5 text-left transition-colors disabled:opacity-40 ${
                      sel ? 'border-brand-green bg-brand-green/10' : 'border-white/10 bg-white/[0.03]'
                    }`}
                  >
                    <span className={`flex size-5 shrink-0 items-center justify-center rounded-md border-2 ${sel ? 'border-brand-green bg-brand-green text-black' : 'border-white/25'}`}>
                      {sel && <Check className="size-3" />}
                    </span>
                    <span className="min-w-0 flex-1 truncate font-poppins text-sm font-bold text-white">{q.q}</span>
                    <span className="shrink-0 rounded-md bg-white/[0.06] px-2 py-1 font-poppins text-xs font-black tabular-nums text-brand-green">{formatOdds(oddsFor(q))}</span>
                  </button>
                );
              })}
            </div>
            <div className="mt-auto pt-4">
              <button
                type="button"
                onClick={() => setPhase('stake')}
                disabled={picked.length !== 5}
                className="h-14 w-full rounded-2xl bg-brand-green font-poppins text-lg font-black uppercase tracking-wide text-white transition-opacity disabled:opacity-35"
              >
                Continue · {formatOdds(combinedOdds)}x
              </button>
            </div>
          </motion.div>
        )}

        {/* ── STAKE ── */}
        {phase === 'stake' && (
          <motion.div key="stake" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="mt-4 space-y-4">
            <ReturnPanel stake={stake} secured={stake} potential={potentialReturn} label="Potential return" leg={0} total={5} />
            <div>
              <div className="mb-2 font-poppins text-xs font-black uppercase tracking-wide text-white/50">Your stake</div>
              <div className="grid grid-cols-3 gap-2">
                {STAKES.map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => setStake(s)}
                    disabled={s > points}
                    className={`rounded-2xl border-2 py-3 font-poppins text-lg font-black tabular-nums transition-colors disabled:opacity-30 ${
                      stake === s ? 'border-brand-green bg-brand-green/10 text-brand-green' : 'border-white/10 bg-white/[0.03] text-white'
                    }`}
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>
            <button type="button" onClick={placeBet} className="h-14 w-full rounded-2xl bg-brand-green font-poppins text-lg font-black uppercase tracking-wide text-white">
              Place bet · {money(stake)}
            </button>
            <button type="button" onClick={() => setPhase('select')} className="w-full font-poppins text-xs font-black uppercase text-white/40 hover:text-white/70">
              Back to legs
            </button>
          </motion.div>
        )}

        {/* ── PLAY ── */}
        {phase === 'play' && legs[leg] && (
          <motion.div key={`play-${leg}`} initial={{ opacity: 0, x: 12 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -12 }} className="mt-4 space-y-4">
            <ReturnPanel stake={stake} secured={securedReturn} potential={potentialReturn} label="Return so far" leg={leg} total={legs.length} />
            <LegDots total={legs.length} done={leg} />
            <QuestionBlock q={legs[leg]} selected={selected} onAnswer={answer} odds={oddsFor(legs[leg])} legNo={leg + 1} accent="#58CC02" />
          </motion.div>
        )}

        {/* ── CASH OUT ── */}
        {phase === 'cashout' && (
          <motion.div key="cashout" initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }} className="mt-4 space-y-4">
            <ReturnPanel stake={stake} secured={securedReturn} potential={potentialReturn} label="4 of 5 landed!" leg={leg} total={legs.length} />
            <div className="rounded-2xl border-2 border-brand-yellow/40 bg-brand-yellow/[0.06] p-4 text-center">
              <div className="font-poppins text-sm font-black uppercase text-brand-yellow">Take the money or go for it?</div>
              <p className="mt-1 font-poppins text-xs font-semibold text-white/55">One leg left. Cash out now, or risk it for the full {money(potentialReturn)}.</p>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <button type="button" onClick={cashOut} className="h-16 rounded-2xl bg-brand-yellow font-poppins text-base font-black uppercase text-black">
                Cash out
                <div className="font-poppins text-sm tabular-nums">{money(securedReturn)}</div>
              </button>
              <button type="button" onClick={() => setPhase('play')} className="h-16 rounded-2xl border-2 border-brand-green bg-brand-green/10 font-poppins text-base font-black uppercase text-brand-green">
                Final leg
                <div className="font-poppins text-sm tabular-nums">{money(potentialReturn)}</div>
              </button>
            </div>
          </motion.div>
        )}

        {/* ── RESULT ── */}
        {phase === 'result' && result && (
          <motion.div key="result" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="mt-6 flex flex-col items-center gap-4 text-center">
            <div className="text-5xl">{result.won ? '🎉' : '💥'}</div>
            <div className="font-poppins text-2xl font-black uppercase" style={{ color: result.won ? '#58CC02' : '#FB3101' }}>
              {result.won ? 'Bet won!' : `Busted on leg ${result.bustLeg}`}
            </div>
            {result.won ? (
              <div className="font-poppins text-4xl font-black tabular-nums text-brand-green">+{money(result.payout)}</div>
            ) : (
              <div className="font-poppins text-sm font-semibold text-white/50">Lost your {money(stake)} stake — one leg let it down.</div>
            )}
            <button type="button" onClick={reset} className="mt-2 h-14 w-full rounded-2xl bg-brand-green font-poppins text-lg font-black uppercase tracking-wide text-white">
              New accumulator
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </MiniGameShell>
  );
}

function ReturnPanel({ stake, secured, potential, label, leg, total }: { stake: number; secured: number; potential: number; label: string; leg: number; total: number }) {
  return (
    <div className="rounded-2xl border-2 border-brand-green/30 bg-gradient-to-b from-brand-green/[0.1] to-transparent p-4 text-center">
      <div className="font-poppins text-[11px] font-black uppercase tracking-[0.15em] text-brand-green/80">{label}</div>
      <AnimatePresence mode="popLayout">
        <motion.div
          key={secured}
          initial={{ y: 8, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ opacity: 0, position: 'absolute' }}
          className="mt-1 font-poppins text-4xl font-black tabular-nums text-brand-green"
        >
          {money(secured)}
        </motion.div>
      </AnimatePresence>
      <div className="mt-1 flex items-center justify-center gap-1.5 font-poppins text-[11px] font-bold text-white/45">
        <TrendingUp className="size-3" /> if it lands: <span className="text-white">{money(potential)}</span>
        <span className="text-white/25">·</span> {leg}/{total} legs
      </div>
    </div>
  );
}

function LegDots({ total, done }: { total: number; done: number }) {
  return (
    <div className="flex justify-center gap-1.5">
      {Array.from({ length: total }).map((_, i) => (
        <div key={i} className={`h-1.5 flex-1 rounded-full ${i < done ? 'bg-brand-green' : i === done ? 'bg-brand-yellow' : 'bg-white/10'}`} />
      ))}
    </div>
  );
}

function QuestionBlock({
  q,
  selected,
  onAnswer,
  odds,
  legNo,
  accent,
}: {
  q: TriviaQuestion;
  selected: number | null;
  onAnswer: (i: number) => void;
  odds: number;
  legNo: number;
  accent: string;
}) {
  const answered = selected !== null;
  return (
    <div className="rounded-2xl border border-white/[0.08] bg-surface-card/60 p-4">
      <div className="mb-2 flex items-center justify-between">
        <span className="font-poppins text-[10px] font-black uppercase tracking-wider" style={{ color: accent }}>Leg {legNo}</span>
        <span className="rounded-md bg-white/[0.06] px-2 py-0.5 font-poppins text-xs font-black tabular-nums" style={{ color: accent }}>{formatOdds(odds)}x</span>
      </div>
      <p className="mb-3 font-poppins text-base font-bold leading-snug text-white">{q.q}</p>
      <div className="grid grid-cols-1 gap-2">
        {q.options.map((opt, i) => {
          const isAnswer = i === q.answer;
          const isPicked = selected === i;
          const state = !answered ? 'idle' : isAnswer ? 'correct' : isPicked ? 'wrong' : 'dim';
          return (
            <button
              key={i}
              type="button"
              disabled={answered}
              onClick={() => onAnswer(i)}
              className={`flex items-center justify-between rounded-xl border-2 px-3.5 py-3 text-left font-poppins text-sm font-bold transition-colors ${
                state === 'idle'
                  ? 'border-white/10 bg-white/[0.03] text-white hover:border-white/30'
                  : state === 'correct'
                    ? 'border-brand-green bg-brand-green/15 text-white'
                    : state === 'wrong'
                      ? 'border-brand-red bg-brand-red/15 text-white'
                      : 'border-white/5 bg-white/[0.02] text-white/35'
              }`}
            >
              {opt}
              {state === 'correct' && <Check className="size-4 text-brand-green" />}
              {state === 'wrong' && <X className="size-4 text-brand-red" />}
            </button>
          );
        })}
      </div>
    </div>
  );
}
