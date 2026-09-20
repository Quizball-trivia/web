'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Check, X, Flame, Skull } from 'lucide-react';
import { MiniGameShell, StatPill } from './MiniGameShell';
import { getTrivia, type TriviaQuestion } from '../data/trivia';
import { useMiniLocale, useMiniT } from '../lib/i18n';

const QUESTION_MS = 12_000;
const FIELD_START = 1_000;
/** Share of the simulated field that survives a question of each difficulty. */
const FIELD_SURVIVAL: Record<TriviaQuestion['difficulty'], number> = {
  easy: 0.82,
  medium: 0.65,
  hard: 0.45,
};

type Phase = 'idle' | 'playing' | 'reveal' | 'out' | 'champion';

function shuffled<T>(arr: T[]): T[] {
  const out = [...arr];
  for (let i = out.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

/** Easy first, then medium, then hard — sudden death gets harder as you last. */
function buildRun(bank: TriviaQuestion[]): TriviaQuestion[] {
  const tiers: TriviaQuestion['difficulty'][] = ['easy', 'medium', 'hard'];
  return tiers.flatMap((tier) => shuffled(bank.filter((q) => q.difficulty === tier)));
}

export function Survivor({ backHref }: { backHref?: string } = {}) {
  const t = useMiniT();
  const miniLocale = useMiniLocale();
  const bank = useMemo(() => getTrivia(miniLocale), [miniLocale]);
  const [run, setRun] = useState<TriviaQuestion[]>([]);
  const [phase, setPhase] = useState<Phase>('idle');
  const [index, setIndex] = useState(0);
  const [selected, setSelected] = useState<number | null>(null);
  const [field, setField] = useState(FIELD_START);
  const [best, setBest] = useState(0);
  const [remaining, setRemaining] = useState(QUESTION_MS);
  const deadlineRef = useRef(0);
  const timers = useRef<number[]>([]);
  useEffect(() => () => timers.current.forEach((id) => window.clearTimeout(id)), []);
  const later = (fn: () => void, ms: number) => {
    const id = window.setTimeout(fn, ms);
    timers.current.push(id);
  };

  const question = run[index];
  const streak = index;

  useEffect(() => {
    if (phase !== 'playing') return;
    const id = window.setInterval(() => {
      const left = deadlineRef.current - Date.now();
      setRemaining(Math.max(0, left));
      if (left <= 0) {
        window.clearInterval(id);
        setSelected(-1);
        setPhase('reveal');
        later(() => finishRun(), 1400);
      }
    }, 100);
    return () => window.clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, index]);

  const start = () => {
    setRun(buildRun(bank));
    setIndex(0);
    setSelected(null);
    setField(FIELD_START);
    setPhase('playing');
    deadlineRef.current = Date.now() + QUESTION_MS;
    setRemaining(QUESTION_MS);
  };

  const finishRun = () => {
    setBest((b) => Math.max(b, streak));
    setPhase('out');
  };

  const answer = (i: number) => {
    if (phase !== 'playing' || selected !== null) return;
    setSelected(i);
    setPhase('reveal');
    later(() => {
      if (i === question.answer) {
        const rate = FIELD_SURVIVAL[question.difficulty];
        setField((f) => Math.max(2, Math.round(f * (rate + (Math.random() - 0.5) * 0.08))));
        const next = index + 1;
        if (next >= run.length) {
          setBest((b) => Math.max(b, next));
          setPhase('champion');
          return;
        }
        setIndex(next);
        setSelected(null);
        deadlineRef.current = Date.now() + QUESTION_MS;
        setRemaining(QUESTION_MS);
        setPhase('playing');
      } else {
        finishRun();
      }
    }, 1200);
  };

  const outlasted = Math.round(((FIELD_START - field) / FIELD_START) * 100);
  const pctBar = remaining / QUESTION_MS;

  return (
    <MiniGameShell
      backHref={backHref}
      title={t('Survivor')}
      subtitle={t('One wrong answer and you are out — how long can you last?')}
      accent="#FB3101"
      headerRight={<StatPill label={t('Streak')} value={<span className="flex items-center gap-1"><Flame className="size-4" />{streak}</span>} color="#FB3101" />}
    >
      <AnimatePresence mode="wait">
        {phase === 'idle' && (
          <motion.div key="idle" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="flex flex-1 flex-col items-center justify-center gap-4 text-center">
            <div className="text-5xl">🔥</div>
            <div className="font-poppins text-xl font-black uppercase text-brand-red">{t('Sudden death')}</div>
            <p className="max-w-xs font-poppins text-sm font-semibold leading-snug text-white/60">
              {t('Questions get harder as you go. {n} virtual players start with you — outlast them all.', { n: FIELD_START.toLocaleString() })}
            </p>
            {best > 0 && (
              <div className="rounded-xl bg-white/[0.06] px-4 py-2 font-poppins text-xs font-black uppercase text-brand-yellow">
                {t('Best streak: {n}', { n: best })}
              </div>
            )}
            <button type="button" onClick={start} className="h-14 w-full max-w-xs rounded-2xl bg-brand-red font-poppins text-lg font-black uppercase tracking-wide text-white">
              {t('Enter the arena')}
            </button>
          </motion.div>
        )}

        {(phase === 'playing' || phase === 'reveal') && question && (
          <motion.div key={`q-${index}`} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="mt-2 flex flex-1 flex-col">
            {/* Field remaining */}
            <div className="mb-3 rounded-2xl border-2 border-white/10 bg-white/[0.03] p-3">
              <div className="mb-1.5 flex items-center justify-between">
                <span className="font-poppins text-[10px] font-black uppercase tracking-wider text-white/45">{t('Still standing')}</span>
                <span className="font-poppins text-sm font-black tabular-nums text-brand-yellow">{field.toLocaleString()}</span>
              </div>
              <div className="h-1.5 overflow-hidden rounded-full bg-white/10">
                <motion.div className="h-full rounded-full bg-gradient-to-r from-brand-red to-brand-yellow" animate={{ width: `${(field / FIELD_START) * 100}%` }} transition={{ duration: 0.6 }} />
              </div>
            </div>

            {/* Timer */}
            <div className="mb-2 h-1 overflow-hidden rounded-full bg-white/10">
              <div className={`h-full rounded-full transition-[width] duration-100 ${pctBar < 0.25 ? 'bg-brand-red' : 'bg-brand-yellow'}`} style={{ width: `${pctBar * 100}%` }} />
            </div>

            <div className="mb-1 flex items-center justify-between">
              <span className="font-poppins text-[10px] font-black uppercase tracking-wider text-white/40">{t('Question {n}', { n: index + 1 })}</span>
              <span className={`rounded-full px-2 py-0.5 font-poppins text-[9px] font-black uppercase ${question.difficulty === 'hard' ? 'bg-brand-red/20 text-brand-red' : question.difficulty === 'medium' ? 'bg-brand-orange/20 text-brand-orange' : 'bg-brand-green-light/20 text-brand-green-light'}`}>
                {t(question.difficulty)}
              </span>
            </div>
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
                        ? 'border-white/10 bg-white/[0.03] text-white hover:border-brand-red/50'
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

        {phase === 'out' && (
          <motion.div key="out" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="flex flex-1 flex-col items-center justify-center gap-3 text-center">
            <Skull className="size-10 text-brand-red" />
            <div className="font-poppins text-2xl font-black uppercase text-brand-red">{t('Eliminated')}</div>
            <div className="font-poppins text-sm font-bold text-white">
              {t('Streak of {n}', { n: streak })}
            </div>
            <p className="max-w-xs font-poppins text-xs font-semibold text-white/55">
              {t('You outlasted {pct}% of the field — {left} were still standing.', { pct: outlasted, left: field.toLocaleString() })}
            </p>
            {streak >= best && streak > 0 && (
              <div className="rounded-xl bg-brand-yellow/15 px-4 py-1.5 font-poppins text-xs font-black uppercase text-brand-yellow">{t('New best!')}</div>
            )}
            <button type="button" onClick={start} className="mt-2 w-full max-w-xs rounded-2xl bg-brand-red py-3.5 font-poppins text-base font-black uppercase text-white">
              {t('Run it back')}
            </button>
          </motion.div>
        )}

        {phase === 'champion' && (
          <motion.div key="champion" initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="flex flex-1 flex-col items-center justify-center gap-3 text-center">
            <div className="text-5xl">🏆</div>
            <div className="font-poppins text-2xl font-black uppercase text-brand-yellow">{t('Last one standing!')}</div>
            <p className="max-w-xs font-poppins text-xs font-semibold text-white/55">
              {t('You cleared every question in the bank — a perfect {n}-answer run.', { n: streak })}
            </p>
            <button type="button" onClick={start} className="mt-2 w-full max-w-xs rounded-2xl bg-brand-yellow py-3.5 font-poppins text-base font-black uppercase text-black">
              {t('Play again')}
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </MiniGameShell>
  );
}
