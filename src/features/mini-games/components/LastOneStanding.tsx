'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Check, X, Users } from 'lucide-react';
import { MiniGameShell, StatPill } from './MiniGameShell';
import { getTrivia, type TriviaQuestion } from '../data/trivia';
import { useMiniLocale, useMiniT } from '../lib/i18n';

const FIELD_START = 100;
const QUESTION_MS = 10_000;
/** Per round: how many survive the cut, and the question tier. */
const ROUNDS: { cap: number; diff: TriviaQuestion['difficulty'] }[] = [
  { cap: 60, diff: 'easy' },
  { cap: 36, diff: 'easy' },
  { cap: 22, diff: 'medium' },
  { cap: 13, diff: 'medium' },
  { cap: 8, diff: 'medium' },
  { cap: 5, diff: 'hard' },
  { cap: 3, diff: 'hard' },
  { cap: 2, diff: 'hard' },
  { cap: 1, diff: 'hard' },
];

type Phase = 'idle' | 'playing' | 'reveal' | 'cut' | 'out' | 'champion';

function shuffled<T>(arr: T[]): T[] {
  const out = [...arr];
  for (let i = out.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

function buildRun(bank: TriviaQuestion[]): TriviaQuestion[] {
  const pools: Record<string, TriviaQuestion[]> = {
    easy: shuffled(bank.filter((q) => q.difficulty === 'easy')),
    medium: shuffled(bank.filter((q) => q.difficulty === 'medium')),
    hard: shuffled(bank.filter((q) => q.difficulty === 'hard')),
  };
  const fallback = shuffled(bank);
  return ROUNDS.map((r) => pools[r.diff].pop() ?? fallback.pop()!);
}

export function LastOneStanding({ backHref }: { backHref?: string } = {}) {
  const t = useMiniT();
  const miniLocale = useMiniLocale();
  const bank = useMemo(() => getTrivia(miniLocale), [miniLocale]);
  const [run, setRun] = useState<TriviaQuestion[]>([]);
  const [phase, setPhase] = useState<Phase>('idle');
  const [round, setRound] = useState(0);
  const [field, setField] = useState(FIELD_START);
  const [selected, setSelected] = useState<number | null>(null);
  const [speedRank, setSpeedRank] = useState(0);
  const [placement, setPlacement] = useState(0);
  const [remaining, setRemaining] = useState(QUESTION_MS);
  const deadlineRef = useRef(0);
  const timers = useRef<number[]>([]);
  useEffect(() => () => timers.current.forEach((id) => window.clearTimeout(id)), []);
  const later = (fn: () => void, ms: number) => {
    const id = window.setTimeout(fn, ms);
    timers.current.push(id);
  };

  const question = run[round];
  const cap = ROUNDS[round]?.cap ?? 1;

  useEffect(() => {
    if (phase !== 'playing') return;
    const id = window.setInterval(() => {
      const left = deadlineRef.current - Date.now();
      setRemaining(Math.max(0, left));
      if (left <= 0) {
        window.clearInterval(id);
        setSelected(-1);
        setPlacement(field);
        setPhase('reveal');
        later(() => setPhase('out'), 1500);
      }
    }, 100);
    return () => window.clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, round]);

  const start = () => {
    setRun(buildRun(bank));
    setRound(0);
    setField(FIELD_START);
    setSelected(null);
    setPlacement(0);
    setPhase('playing');
    deadlineRef.current = Date.now() + QUESTION_MS;
    setRemaining(QUESTION_MS);
  };

  const answer = (i: number) => {
    if (phase !== 'playing' || selected !== null) return;
    const timeFrac = Math.max(0, deadlineRef.current - Date.now()) / QUESTION_MS;
    setSelected(i);
    setPhase('reveal');
    later(() => {
      if (i !== question.answer) {
        setPlacement(field);
        setPhase('out');
        return;
      }
      // Made the cut — your speed decides how comfortably.
      const rank = Math.max(1, Math.min(cap, Math.round((1 - timeFrac) * cap * (0.85 + Math.random() * 0.3))));
      setSpeedRank(rank);
      setField(cap);
      if (round + 1 >= ROUNDS.length || cap <= 1) {
        setPhase('champion');
        return;
      }
      setPhase('cut');
      later(() => {
        setRound((r) => r + 1);
        setSelected(null);
        deadlineRef.current = Date.now() + QUESTION_MS;
        setRemaining(QUESTION_MS);
        setPhase('playing');
      }, 1900);
    }, 1300);
  };

  const pctBar = remaining / QUESTION_MS;

  return (
    <MiniGameShell
      backHref={backHref}
      title={t('Last One Standing')}
      subtitle={t('{n} enter, one survives — make every cut', { n: FIELD_START })}
      accent="#FF9600"
      headerRight={<StatPill label={t('Alive')} value={<span className="flex items-center gap-1"><Users className="size-4" />{field}</span>} color="#FF9600" />}
    >
      <AnimatePresence mode="wait">
        {phase === 'idle' && (
          <motion.div key="idle" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="flex flex-1 flex-col items-center justify-center gap-4 text-center">
            <div className="text-5xl">🏟️</div>
            <div className="font-poppins text-xl font-black uppercase text-brand-orange">{t('Battle royale quiz')}</div>
            <p className="max-w-xs font-poppins text-sm font-semibold leading-snug text-white/60">
              {t('Every round the field is cut — answer right and fast to stay in it. Nine rounds from {n} players down to one.', { n: FIELD_START })}
            </p>
            <button type="button" onClick={start} className="h-14 w-full max-w-xs rounded-2xl bg-brand-orange font-poppins text-lg font-black uppercase tracking-wide text-black">
              {t('Kick off')}
            </button>
          </motion.div>
        )}

        {(phase === 'playing' || phase === 'reveal' || phase === 'cut') && question && (
          <motion.div key={`r-${round}`} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="mt-2 flex flex-1 flex-col">
            {/* Cut banner */}
            <div className="mb-3 flex items-center justify-between rounded-2xl border-2 border-brand-orange/30 bg-gradient-to-b from-brand-orange/[0.08] to-transparent px-4 py-2.5">
              <div>
                <div className="font-poppins text-[10px] font-black uppercase tracking-wider text-white/45">{t('Round {n} / {total}', { n: round + 1, total: ROUNDS.length })}</div>
                <div className="font-poppins text-sm font-black text-white">{t('Fastest {cap} survive', { cap })}</div>
              </div>
              <div className="text-right">
                <div className="font-poppins text-[10px] font-black uppercase tracking-wider text-white/45">{t('Field')}</div>
                <div className="font-poppins text-xl font-black tabular-nums text-brand-orange">
                  {field} <span className="text-sm text-white/40">→ {cap}</span>
                </div>
              </div>
            </div>

            {/* Round dots */}
            <div className="mb-3 flex justify-center gap-1">
              {ROUNDS.map((_, i) => (
                <div key={i} className={`h-1.5 w-6 rounded-full ${i < round ? 'bg-brand-orange' : i === round ? 'bg-brand-yellow' : 'bg-white/10'}`} />
              ))}
            </div>

            {phase === 'cut' ? (
              <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="flex flex-1 flex-col items-center justify-center gap-2 text-center">
                <div className="text-4xl">✂️</div>
                <div className="font-poppins text-lg font-black uppercase text-brand-green-light">{t('You made the cut!')}</div>
                <p className="font-poppins text-xs font-semibold text-white/55">
                  {t('#{rank} fastest — {cap} players remain.', { rank: speedRank, cap })}
                </p>
              </motion.div>
            ) : (
              <>
                <div className="mb-2 h-1 overflow-hidden rounded-full bg-white/10">
                  <div className={`h-full rounded-full transition-[width] duration-100 ${pctBar < 0.3 ? 'bg-brand-red' : 'bg-brand-orange'}`} style={{ width: `${pctBar * 100}%` }} />
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
              </>
            )}
          </motion.div>
        )}

        {phase === 'out' && (
          <motion.div key="out" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="flex flex-1 flex-col items-center justify-center gap-3 text-center">
            <div className="text-5xl">🪦</div>
            <div className="font-poppins text-2xl font-black uppercase text-brand-red">{t('Cut!')}</div>
            <p className="max-w-xs font-poppins text-sm font-bold text-white">
              {t('Finished #{place} of {n}', { place: placement, n: FIELD_START })}
            </p>
            <p className="max-w-xs font-poppins text-xs font-semibold text-white/50">
              {t('Round {r} was your last — the field marched on without you.', { r: round + 1 })}
            </p>
            <button type="button" onClick={start} className="mt-2 w-full max-w-xs rounded-2xl bg-brand-orange py-3.5 font-poppins text-base font-black uppercase text-black">
              {t('Re-enter')}
            </button>
          </motion.div>
        )}

        {phase === 'champion' && (
          <motion.div key="champion" initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="flex flex-1 flex-col items-center justify-center gap-3 text-center">
            <div className="text-5xl">👑</div>
            <div className="font-poppins text-2xl font-black uppercase text-brand-yellow">{t('CHAMPION!')}</div>
            <p className="max-w-xs font-poppins text-xs font-semibold text-white/55">
              {t('{n} started. You are the last one standing.', { n: FIELD_START })}
            </p>
            <button type="button" onClick={start} className="mt-2 w-full max-w-xs rounded-2xl bg-brand-yellow py-3.5 font-poppins text-base font-black uppercase text-black">
              {t('Defend the title')}
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </MiniGameShell>
  );
}
