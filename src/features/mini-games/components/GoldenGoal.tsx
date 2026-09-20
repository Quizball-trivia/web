'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Check, X, Zap } from 'lucide-react';
import { MiniGameShell, StatPill } from './MiniGameShell';
import { getTrivia, type TriviaQuestion } from '../data/trivia';
import { useMiniLocale, useMiniT } from '../lib/i18n';

const QUESTION_MS = 10_000;
const GOAL_AT = 100;
const AI_CORRECT: Record<TriviaQuestion['difficulty'], number> = { easy: 0.75, medium: 0.6, hard: 0.45 };

type Phase = 'idle' | 'question' | 'reveal' | 'goal';

function shuffled<T>(arr: T[]): T[] {
  const out = [...arr];
  for (let i = out.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

export function GoldenGoal({ backHref }: { backHref?: string } = {}) {
  const t = useMiniT();
  const miniLocale = useMiniLocale();
  const deck = useMemo(() => shuffled(getTrivia(miniLocale)), [miniLocale]);
  const [phase, setPhase] = useState<Phase>('idle');
  const [qIndex, setQIndex] = useState(0);
  const [bar, setBar] = useState(0); // -100 (AI goal) .. +100 (your goal)
  const [selected, setSelected] = useState<number | null>(null);
  const [lastYou, setLastYou] = useState(0);
  const [lastAi, setLastAi] = useState(0);
  const [round, setRound] = useState(0);
  const [winner, setWinner] = useState<'you' | 'ai' | null>(null);
  const [remaining, setRemaining] = useState(QUESTION_MS);
  const deadlineRef = useRef(0);
  const barRef = useRef(0);
  useEffect(() => {
    barRef.current = bar;
  }, [bar]);
  const timers = useRef<number[]>([]);
  useEffect(() => () => timers.current.forEach((id) => window.clearTimeout(id)), []);
  const later = (fn: () => void, ms: number) => {
    const id = window.setTimeout(fn, ms);
    timers.current.push(id);
  };

  const question = deck[qIndex % deck.length];

  useEffect(() => {
    if (phase !== 'question') return;
    const id = window.setInterval(() => {
      const left = deadlineRef.current - Date.now();
      setRemaining(Math.max(0, left));
      if (left <= 0) {
        window.clearInterval(id);
        setSelected(-1);
        resolveRound(false, 0);
      }
    }, 100);
    return () => window.clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, qIndex]);

  const start = () => {
    setBar(0);
    setRound(0);
    setQIndex((i) => i + 1);
    setSelected(null);
    setWinner(null);
    beginQuestion();
  };

  const beginQuestion = () => {
    deadlineRef.current = Date.now() + QUESTION_MS;
    setRemaining(QUESTION_MS);
    setPhase('question');
  };

  const resolveRound = (correct: boolean, timeFrac: number) => {
    // Your points: speed curve in 10-point buckets, like the real possession engine.
    const you = correct ? Math.max(10, Math.min(100, Math.ceil(timeFrac * 10) * 10)) : 0;
    const aiCorrect = Math.random() < AI_CORRECT[question.difficulty];
    const ai = aiCorrect ? (4 + Math.floor(Math.random() * 6)) * 10 : 0;
    setLastYou(you);
    setLastAi(ai);
    setPhase('reveal');
    later(() => {
      const next = Math.max(-GOAL_AT, Math.min(GOAL_AT, barRef.current + you - ai));
      setBar(next);
      later(() => {
        if (next >= GOAL_AT) {
          setWinner('you');
          setPhase('goal');
        } else if (next <= -GOAL_AT) {
          setWinner('ai');
          setPhase('goal');
        } else {
          setRound((r) => r + 1);
          setQIndex((i) => i + 1);
          setSelected(null);
          beginQuestion();
        }
      }, 1400);
    }, 900);
  };

  const answer = (i: number) => {
    if (phase !== 'question' || selected !== null) return;
    const timeFrac = Math.max(0, deadlineRef.current - Date.now()) / QUESTION_MS;
    setSelected(i);
    resolveRound(i === question.answer, timeFrac);
  };

  const pctBar = remaining / QUESTION_MS;
  // Bar position: 0% = full AI side, 100% = full your side.
  const ballPct = ((bar + GOAL_AT) / (2 * GOAL_AT)) * 100;

  return (
    <MiniGameShell
      backHref={backHref}
      title={t('Golden Goal')}
      subtitle={t('Sudden death — push the ball into their net')}
      accent="#FFE500"
      headerRight={<StatPill label={t('Round')} value={round + 1} color="#FFE500" />}
    >
      <AnimatePresence mode="wait">
        {phase === 'idle' && (
          <motion.div key="idle" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="flex flex-1 flex-col items-center justify-center gap-4 text-center">
            <div className="text-5xl">⚡</div>
            <div className="font-poppins text-xl font-black uppercase text-brand-yellow">{t('Golden Goal')}</div>
            <p className="max-w-xs font-poppins text-sm font-semibold leading-snug text-white/60">
              {t('Both of you answer the same question — faster and righter pushes the ball. Reach ±{n} and it is a goal. First goal wins.', { n: GOAL_AT })}
            </p>
            <button type="button" onClick={start} className="h-14 w-full max-w-xs rounded-2xl bg-brand-yellow font-poppins text-lg font-black uppercase tracking-wide text-black">
              {t('Kick off')}
            </button>
          </motion.div>
        )}

        {(phase === 'question' || phase === 'reveal' || phase === 'goal') && question && (
          <motion.div key="game" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="mt-2 flex flex-1 flex-col">
            {/* Possession bar */}
            <div className="mb-3 rounded-2xl border-2 border-white/10 bg-white/[0.03] p-3">
              <div className="mb-1.5 flex items-center justify-between font-poppins text-[10px] font-black uppercase tracking-wider">
                <span className="text-brand-red-soft">{t('AI net')}</span>
                <span className="text-white/40">{bar > 0 ? `+${bar}` : bar}</span>
                <span className="text-brand-cyan">{t('Your attack')}</span>
              </div>
              <div className="relative h-4 overflow-hidden rounded-full bg-gradient-to-r from-brand-red-soft/25 via-white/5 to-brand-cyan/25">
                <div className="absolute inset-y-0 left-1/2 w-px bg-white/25" />
                <motion.div
                  className="absolute top-1/2 -translate-y-1/2"
                  animate={{ left: `calc(${ballPct}% - 8px)` }}
                  transition={{ type: 'spring', stiffness: 120, damping: 16 }}
                >
                  <span className="block text-base leading-none">⚽</span>
                </motion.div>
              </div>
            </div>

            {phase === 'goal' ? (
              <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="flex flex-1 flex-col items-center justify-center gap-3 text-center">
                <div className="text-5xl">{winner === 'you' ? '🥅' : '😖'}</div>
                <div className={`font-poppins text-3xl font-black uppercase ${winner === 'you' ? 'text-brand-yellow' : 'text-brand-red'}`}>
                  {winner === 'you' ? t('GOLDEN GOAL!') : t('AI scores')}
                </div>
                <p className="font-poppins text-xs font-semibold text-white/55">
                  {t('Decided in {n} rounds.', { n: round + 1 })}
                </p>
                <button type="button" onClick={start} className="mt-2 w-full max-w-xs rounded-2xl bg-brand-yellow py-3.5 font-poppins text-base font-black uppercase text-black">
                  {t('Rematch')}
                </button>
              </motion.div>
            ) : (
              <>
                {phase === 'reveal' && (
                  <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="mb-2 flex items-center justify-center gap-3 rounded-xl bg-white/[0.04] px-3 py-2">
                    <span className="flex items-center gap-1 font-poppins text-sm font-black tabular-nums text-brand-cyan">
                      <Zap className="size-3.5" /> +{lastYou}
                    </span>
                    <span className="font-poppins text-xs font-bold text-white/35">{t('vs')}</span>
                    <span className="font-poppins text-sm font-black tabular-nums text-brand-red-soft">+{lastAi}</span>
                    <span className={`font-poppins text-xs font-black tabular-nums ${lastYou - lastAi >= 0 ? 'text-brand-green-light' : 'text-brand-red'}`}>
                      ({lastYou - lastAi >= 0 ? '+' : ''}{lastYou - lastAi})
                    </span>
                  </motion.div>
                )}
                <div className="mb-2 h-1 overflow-hidden rounded-full bg-white/10">
                  <div className={`h-full rounded-full transition-[width] duration-100 ${pctBar < 0.3 ? 'bg-brand-red' : 'bg-brand-yellow'}`} style={{ width: `${phase === 'question' ? pctBar * 100 : 0}%` }} />
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
                            ? 'border-white/10 bg-white/[0.03] text-white hover:border-brand-yellow/50'
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
      </AnimatePresence>
    </MiniGameShell>
  );
}
