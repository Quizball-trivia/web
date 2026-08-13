'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Check, X, Flame, Users, Clock } from 'lucide-react';
import { MiniGameShell } from './MiniGameShell';
import { getHardQuestions } from '../data/trivia';
import { useMiniLocale, useMiniT } from '../lib/i18n';

const BASE_POT = 12_450;
const FAILS_START = 1_284;

export function DailyJackpot({ backHref }: { backHref?: string } = {}) {
  const t = useMiniT();
  const miniLocale = useMiniLocale();
  const [pot, setPot] = useState(BASE_POT);
  const [fails, setFails] = useState(FAILS_START);
  const [phase, setPhase] = useState<'open' | 'won' | 'lost'>('open');
  const [selected, setSelected] = useState<number | null>(null);
  const [msToNext, setMsToNext] = useState<number | null>(null);
  const potRef = useRef<HTMLDivElement>(null);

  const HARD_QUESTIONS = useMemo(() => getHardQuestions(miniLocale), [miniLocale]);
  const question = HARD_QUESTIONS[0];

  // Climb the pot while the question is still open — as if others keep failing
  // and feeding it. (Client-only interval, so no SSR mismatch.)
  useEffect(() => {
    if (phase !== 'open') return;
    const id = window.setInterval(() => {
      setPot((p) => p + 10 + Math.floor(Math.random() * 40));
      if (Math.random() < 0.25) setFails((f) => f + 1);
    }, 1800);
    return () => window.clearInterval(id);
  }, [phase]);

  // Countdown to next local midnight (the "next question"). Set client-side.
  useEffect(() => {
    const tick = () => {
      const now = new Date();
      const midnight = new Date(now);
      midnight.setHours(24, 0, 0, 0);
      setMsToNext(midnight.getTime() - now.getTime());
    };
    tick();
    const id = window.setInterval(tick, 1000);
    return () => window.clearInterval(id);
  }, []);

  const answer = (i: number) => {
    if (selected !== null) return;
    setSelected(i);
    window.setTimeout(() => {
      if (i === question.answer) {
        setPhase('won');
      } else {
        setPhase('lost');
        setFails((f) => f + 1);
        setPot((p) => p + 500); // your failed entry rolls into the pot
      }
    }, 900);
  };

  const replay = () => {
    setPhase('open');
    setSelected(null);
    setPot(BASE_POT);
    setFails(FAILS_START);
  };

  return (
    <MiniGameShell backHref={backHref} title={t('Daily Jackpot')} subtitle={t('One hard question. Winner takes the pot.')} accent="#FFD700">
      {/* Pot */}
      <div className="mt-2 rounded-3xl border-2 border-brand-yellow bg-brand-yellow p-5 text-center">
        <div className="font-poppins text-[11px] font-black uppercase tracking-[0.2em] text-black/55">{t("Today's pot")}</div>
        <div ref={potRef} className="relative mt-1 flex items-center justify-center">
          <AnimatePresence mode="popLayout">
            <motion.div
              key={pot}
              initial={{ y: 10, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: -10, opacity: 0, position: 'absolute' }}
              transition={{ duration: 0.3 }}
              className="font-poppins text-5xl font-black tabular-nums text-black"
            >
              {pot.toLocaleString()}
            </motion.div>
          </AnimatePresence>
          <span className="ml-2 font-poppins text-lg font-black text-black/50">🪙</span>
        </div>
        {phase === 'open' && (
          <div className="mt-1 font-poppins text-[11px] font-semibold text-black/45">{t('climbing with every miss…')}</div>
        )}
      </div>

      {/* Stat row */}
      <div className="mt-3 grid grid-cols-2 gap-2">
        <div className="flex items-center gap-2 rounded-2xl border border-white/[0.06] bg-white/[0.03] px-3 py-2.5">
          <Users className="size-4 shrink-0 text-brand-red-soft" />
          <div>
            <div className="font-poppins text-base font-black tabular-nums leading-none text-white">{fails.toLocaleString()}</div>
            <div className="font-poppins text-[9px] font-black uppercase tracking-wider text-white/40">{t('failed today')}</div>
          </div>
        </div>
        <div className="flex items-center gap-2 rounded-2xl border border-white/[0.06] bg-white/[0.03] px-3 py-2.5">
          <Clock className="size-4 shrink-0 text-brand-cyan" />
          <div>
            <div className="font-poppins text-base font-black tabular-nums leading-none text-white">{formatHMS(msToNext)}</div>
            <div className="font-poppins text-[9px] font-black uppercase tracking-wider text-white/40">{t('next question')}</div>
          </div>
        </div>
      </div>

      {/* Body */}
      <div className="mt-4 flex-1">
        <AnimatePresence mode="wait">
          {phase === 'open' && (
            <motion.div key="q" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
              <div className="mb-2 flex items-center justify-center gap-1.5 font-poppins text-[11px] font-black uppercase tracking-wider text-brand-red">
                <Flame className="size-3.5" /> {t('Hard · one attempt')}
              </div>
              <p className="px-1 font-poppins text-lg font-bold leading-snug text-white">{question.q}</p>
              <div className="mt-3 grid grid-cols-1 gap-2.5">
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
                      className="relative flex min-h-[60px] appearance-none items-center justify-center overflow-hidden rounded-[16px] bg-transparent px-3.5 py-3 text-center font-poppins text-sm font-bold leading-tight sm:min-h-[72px]"
                      style={{
                        color: state === 'wrong' ? '#FB3101' : state === 'dim' ? 'rgba(255,255,255,0.35)' : '#FFFFFF',
                        backgroundColor: state === 'correct' ? '#38B60E' : 'transparent',
                        border:
                          state === 'correct'
                            ? 'none'
                            : state === 'wrong'
                              ? '2px solid #FB3101'
                              : state === 'dim'
                                ? '2px solid rgba(255,255,255,0.12)'
                                : '2px solid rgba(255,229,0,0.4)',
                        boxShadow:
                          state === 'correct'
                            ? '0 1.76px 6.334px 1.32px rgba(56,182,14,0.25)'
                            : state === 'wrong'
                              ? '0 1.76px 6.334px 1.32px rgba(251,49,1,0.25)'
                              : state === 'idle'
                                ? '0 0 6.334px 1.32px rgba(255,229,0,0.18)'
                                : undefined,
                      }}
                    >
                      <span className="flex items-center gap-2">
                        {opt}
                        {state === 'correct' && <Check className="size-4 shrink-0 text-white" />}
                        {state === 'wrong' && <X className="size-4 shrink-0 text-brand-red" />}
                      </span>
                    </button>
                  );
                })}
              </div>
            </motion.div>
          )}

          {phase === 'won' && <WinBurst key="won" pot={pot} onReplay={replay} />}

          {phase === 'lost' && (
            <motion.div key="lost" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="flex flex-col items-center gap-3 py-4 text-center">
              <div className="text-4xl">💸</div>
              <div className="font-poppins text-xl font-black uppercase text-brand-red">{t('Rolled over')}</div>
              <p className="max-w-xs font-poppins text-sm font-semibold text-white/55">
                {t('Not this time — your entry fed the pot. It now sits at {pot}. Come back for the next question in {time}.', { pot: pot.toLocaleString(), time: formatHMS(msToNext) })}
              </p>
              <button type="button" onClick={replay} className="mt-2 rounded-xl bg-brand-blue px-8 py-3 font-poppins text-sm font-black uppercase text-white hover:brightness-110">
                {t('Replay')}
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </MiniGameShell>
  );
}

function WinBurst({ pot, onReplay }: { pot: number; onReplay: () => void }) {
  const t = useMiniT();
  const coins = Array.from({ length: 14 }, (_, i) => i);
  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="relative flex flex-col items-center gap-3 py-4 text-center">
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        {coins.map((i) => {
          const a = (i / coins.length) * Math.PI * 2;
          return (
            <motion.span
              key={i}
              className="absolute left-1/2 top-8 text-2xl"
              initial={{ x: 0, y: 0, opacity: 0, scale: 0.5 }}
              animate={{ x: Math.cos(a) * 150, y: [0, Math.sin(a) * 120, 260], opacity: [0, 1, 1, 0], scale: 1, rotate: i * 40 }}
              transition={{ duration: 1.6, ease: 'easeOut' }}
            >
              🪙
            </motion.span>
          );
        })}
      </div>
      <div className="text-5xl">🏆</div>
      <div className="font-poppins text-2xl font-black uppercase text-brand-gold" style={{ textShadow: '0 2px 20px rgba(255,215,0,0.4)' }}>
        {t('Jackpot won!')}
      </div>
      <div className="font-poppins text-4xl font-black tabular-nums text-white">+{pot.toLocaleString()} 🪙</div>
      <p className="font-poppins text-xs font-semibold text-white/45">{t("The pot resets for tomorrow's question.")}</p>
      <button type="button" onClick={onReplay} className="mt-2 rounded-xl bg-brand-blue px-8 py-3 font-poppins text-sm font-black uppercase text-white hover:brightness-110">
        {t('Replay')}
      </button>
    </motion.div>
  );
}

function formatHMS(ms: number | null): string {
  if (ms === null) return '--:--:--';
  const s = Math.max(0, Math.floor(ms / 1000));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`;
}
