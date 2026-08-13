'use client';

import { useState } from 'react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'motion/react';
import { ArrowLeft, Check, X, Clock, Gift, Radio } from 'lucide-react';
import { ClubCrest } from './Badges';
import { useCountdown } from '../lib/useCountdown';
import { HT_FIXTURE } from '../data/fixtures';
import { TRIVIA } from '../data/trivia';
import { formatOdds } from '../lib/odds';

const QUIZ = TRIVIA.slice(0, 4);
const QUIZ_MS = 60_000;
const WIN_THRESHOLD = 3;

export function HalfTimeTrivia({ backHref }: { backHref?: string } = {}) {
  const f = HT_FIXTURE;
  const [phase, setPhase] = useState<'playing' | 'done'>('playing');
  const [qi, setQi] = useState(0);
  const [selected, setSelected] = useState<number | null>(null);
  const [correct, setCorrect] = useState(0);

  const finish = () => setPhase('done');
  const timer = useCountdown(QUIZ_MS, { autoStart: true, onExpire: finish });

  const answer = (i: number) => {
    if (selected !== null || phase !== 'playing') return;
    const isRight = i === QUIZ[qi].answer;
    setSelected(i);
    if (isRight) setCorrect((c) => c + 1);
    window.setTimeout(() => {
      setSelected(null);
      if (qi < QUIZ.length - 1) setQi((q) => q + 1);
      else {
        timer.stop();
        setPhase('done');
      }
    }, 700);
  };

  const restart = () => {
    setPhase('playing');
    setQi(0);
    setSelected(null);
    setCorrect(0);
    timer.start(QUIZ_MS);
  };

  const secs = timer.secondsLeft;
  const won = correct >= WIN_THRESHOLD;

  return (
    <div className="relative min-h-[100dvh] bg-surface-page text-white">
      {/* Top bar */}
      <header className="sticky top-0 z-20 flex items-center gap-3 border-b border-white/[0.06] bg-surface-page/95 px-4 py-3 backdrop-blur">
        <Link href={backHref ?? "/dev/mini-games"} aria-label="Back" className="flex size-9 items-center justify-center rounded-full bg-white/[0.06] text-white/70 hover:text-white">
          <ArrowLeft className="size-5" />
        </Link>
        <div className="flex items-center gap-1.5 font-poppins text-xs font-black uppercase tracking-wide text-brand-red-soft">
          <Radio className="size-3.5" /> Live
        </div>
        <span className="ml-auto font-poppins text-[9px] font-semibold uppercase tracking-wider text-white/30">
          Prototype — virtual only
        </span>
        <span className="truncate font-poppins text-xs font-semibold text-white/45">{f.competition}</span>
      </header>

      <main className="mx-auto w-full max-w-lg px-4 pb-10">
        {/* Match scoreboard */}
        <div className="mt-4 rounded-2xl border border-white/[0.08] bg-surface-card/50 p-4">
          <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-2">
            <TeamCol club={f.home.club} name={f.home.name} />
            <div className="flex flex-col items-center">
              <div className="font-poppins text-3xl font-black tabular-nums text-white">
                {f.home.score}<span className="mx-1.5 text-white/30">-</span>{f.away.score}
              </div>
              <span className="mt-1 rounded-full bg-brand-red-soft/15 px-2.5 py-0.5 font-poppins text-[10px] font-black uppercase text-brand-red-soft">{f.minute}</span>
            </div>
            <TeamCol club={f.away.club} name={f.away.name} />
          </div>
        </div>

        {/* ── Inline Half-Time Trivia widget ── */}
        <div className="mt-3 overflow-hidden rounded-2xl border-2 border-brand-yellow/40 bg-gradient-to-b from-brand-yellow/[0.08] to-transparent">
          <div className="flex items-center justify-between border-b border-brand-yellow/20 px-4 py-2.5">
            <div className="flex items-center gap-1.5 font-poppins text-xs font-black uppercase tracking-wide text-brand-yellow">
              <Gift className="size-4" /> Half-Time Quiz
            </div>
            <div className={`flex items-center gap-1.5 font-poppins text-sm font-black tabular-nums ${secs <= 10 && phase === 'playing' ? 'text-brand-red' : 'text-white/70'}`}>
              <Clock className="size-3.5" /> 0:{String(Math.max(0, secs)).padStart(2, '0')}
            </div>
          </div>

          {/* countdown bar */}
          <div className="h-1 bg-white/[0.06]">
            <div className="h-full bg-brand-yellow transition-[width] duration-200" style={{ width: `${(1 - timer.progress) * 100}%` }} />
          </div>

          <div className="p-4">
            <AnimatePresence mode="wait">
              {phase === 'playing' ? (
                <motion.div key={`q-${qi}`} initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -10 }}>
                  <div className="mb-2 flex items-center justify-between font-poppins text-[10px] font-black uppercase tracking-wider text-white/40">
                    <span>Question {qi + 1} / {QUIZ.length}</span>
                    <span>Get {WIN_THRESHOLD}+ for a free bet · {correct} right</span>
                  </div>
                  <p className="mb-3 font-poppins text-base font-bold leading-snug text-white">{QUIZ[qi].q}</p>
                  <div className="grid grid-cols-2 gap-2">
                    {QUIZ[qi].options.map((opt, i) => {
                      const q = QUIZ[qi];
                      const state = selected === null ? 'idle' : i === q.answer ? 'correct' : selected === i ? 'wrong' : 'dim';
                      return (
                        <button
                          key={i}
                          type="button"
                          disabled={selected !== null}
                          onClick={() => answer(i)}
                          className={`flex items-center justify-between gap-1 rounded-xl border-2 px-3 py-2.5 text-left font-poppins text-[13px] font-bold transition-colors ${
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
                          {state === 'correct' && <Check className="size-3.5 shrink-0 text-brand-green" />}
                          {state === 'wrong' && <X className="size-3.5 shrink-0 text-brand-red" />}
                        </button>
                      );
                    })}
                  </div>
                </motion.div>
              ) : (
                <motion.div key="done" initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }} className="flex flex-col items-center gap-2 py-2 text-center">
                  <div className="text-3xl">{won ? '🎟️' : '⏱️'}</div>
                  <div className="font-poppins text-lg font-black uppercase" style={{ color: won ? '#58CC02' : '#FF4B4B' }}>
                    {won ? 'Free bet won!' : `${correct}/${QUIZ.length} — so close`}
                  </div>
                  <p className="font-poppins text-xs font-semibold text-white/55">
                    {won ? 'You earned a virtual second-half free bet (demo — no real rewards).' : `Get ${WIN_THRESHOLD}+ right before kickoff to earn a free bet.`}
                  </p>
                  <button type="button" onClick={restart} className="mt-2 rounded-xl bg-brand-yellow px-5 py-2.5 font-poppins text-sm font-black uppercase text-black">
                    Play again
                  </button>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>

        {/* ── Markets (the point: the quiz sits inline above these) ── */}
        <div className="mt-5">
          <h2 className="mb-2 font-poppins text-sm font-black uppercase tracking-wide text-white/70">Markets</h2>
          <div className="space-y-3">
            {f.markets.map((m) => (
              <div key={m.name} className="rounded-2xl border border-white/[0.07] bg-surface-card/40 p-3">
                <div className="mb-2 font-poppins text-xs font-black uppercase tracking-wide text-white/50">{m.name}</div>
                <div className={`grid gap-2 ${m.options.length === 2 ? 'grid-cols-2' : 'grid-cols-3'}`}>
                  {m.options.map((o) => (
                    <button
                      key={o.label}
                      type="button"
                      className="flex flex-col items-center gap-0.5 rounded-xl border-2 border-white/10 bg-white/[0.03] px-2 py-2.5 transition-colors hover:border-brand-cyan/50"
                    >
                      <span className="max-w-full truncate font-poppins text-[11px] font-bold text-white/70">{o.label}</span>
                      <span className="font-poppins text-sm font-black tabular-nums text-brand-cyan">{formatOdds(o.odds)}</span>
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
          <p className="mt-3 text-center font-poppins text-[10px] font-semibold text-white/25">Odds are illustrative · prototype</p>
        </div>
      </main>
    </div>
  );
}

function TeamCol({ club, name }: { club: string; name: string }) {
  return (
    <div className="flex flex-col items-center gap-1.5">
      <ClubCrest club={club} size={44} />
      <span className="text-center font-poppins text-xs font-black uppercase leading-tight text-white">{name}</span>
    </div>
  );
}
