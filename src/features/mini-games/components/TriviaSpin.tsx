'use client';

import { useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Check, X, Coins, Ticket } from 'lucide-react';
import { MiniGameShell, StatPill } from './MiniGameShell';
import { RewardWheel, pickWeightedIndex, rotationForIndex, type WheelSegment } from './RewardWheel';
import { getTrivia } from '../data/trivia';
import { useMiniLocale, useMiniT } from '../lib/i18n';

const SEGMENTS: WheelSegment[] = [
  { label: '25', value: 25, color: '#1CB0F6' },
  { label: '50', value: 50, color: '#58CC02' },
  { label: '10', value: 10, color: '#1645FF', text: '#ffffff' },
  { label: '100', value: 100, color: '#FF9600' },
  { label: '25', value: 25, color: '#FF4B4B', text: '#ffffff' },
  { label: '250', value: 250, color: '#CE82FF' },
  { label: '50', value: 50, color: '#58CC02' },
  { label: 'JACKPOT', value: 1000, color: '#FFD700' },
];
// Bigger weight = more likely. Jackpot is deliberately rare.
const WEIGHTS = [22, 18, 20, 12, 22, 6, 18, 1];

export function TriviaSpin({ backHref }: { backHref?: string } = {}) {
  const t = useMiniT();
  const miniLocale = useMiniLocale();
  const [coins, setCoins] = useState(0);
  const [spins, setSpins] = useState(0);
  const [qIndex, setQIndex] = useState(0);
  const [selected, setSelected] = useState<number | null>(null);
  const [rotation, setRotation] = useState(0);
  const [pendingIndex, setPendingIndex] = useState<number | null>(null);
  const [wheelSpinning, setWheelSpinning] = useState(false);
  const [lastPayout, setLastPayout] = useState<number | null>(null);

  const trivia = useMemo(() => getTrivia(miniLocale), [miniLocale]);
  const question = trivia[qIndex % trivia.length];
  const answered = selected !== null;

  const answer = (i: number) => {
    if (answered) return;
    setSelected(i);
    if (i === question.answer) setSpins((s) => s + 1);
  };

  const nextQuestion = () => {
    setSelected(null);
    setQIndex((q) => q + 1);
  };

  const spinWheel = () => {
    if (spins <= 0 || wheelSpinning) return;
    const idx = pickWeightedIndex(WEIGHTS);
    setSpins((s) => s - 1);
    setLastPayout(null);
    setPendingIndex(idx);
    setWheelSpinning(true);
    setRotation((prev) => rotationForIndex(idx, SEGMENTS.length, prev));
  };

  const onSettled = () => {
    if (pendingIndex === null) return;
    setCoins((c) => c + SEGMENTS[pendingIndex].value);
    setLastPayout(SEGMENTS[pendingIndex].value);
    setWheelSpinning(false);
  };

  return (
    <MiniGameShell
      backHref={backHref}
      title={t('Trivia Spin')}
      subtitle={t('Answer to earn spins — the wheel pays out')}
      accent="#1CB0F6"
      headerRight={<StatPill label={t('Coins')} value={coins.toLocaleString()} color="#FFD700" />}
    >
      {/* Trivia block */}
      <div className="mt-2 rounded-2xl border border-white/15 bg-brand-blue p-4">
        <div className="mb-3 flex items-center justify-between">
          <span className="font-poppins text-[10px] font-black uppercase tracking-wider text-white/80">
            {t('Question {n}', { n: qIndex + 1 })}
          </span>
          <span
            className={`rounded-full px-2 py-0.5 font-poppins text-[9px] font-black uppercase ${
              question.difficulty === 'hard'
                ? 'bg-brand-red/25 text-white'
                : question.difficulty === 'medium'
                  ? 'bg-brand-orange/25 text-white'
                  : 'bg-brand-green/25 text-white'
            }`}
          >
            {t(question.difficulty)}
          </span>
        </div>
        <p className="mb-3 font-poppins text-base font-bold leading-snug text-white">{question.q}</p>
        <div className="grid grid-cols-1 gap-2">
          {question.options.map((opt, i) => {
            const isAnswer = i === question.answer;
            const isPicked = selected === i;
            const state = !answered ? 'idle' : isAnswer ? 'correct' : isPicked ? 'wrong' : 'dim';
            return (
              <button
                key={i}
                type="button"
                disabled={answered}
                onClick={() => answer(i)}
                className={`flex items-center justify-between rounded-xl border-2 px-3.5 py-3 text-left font-poppins text-sm font-bold transition-colors ${
                  state === 'idle'
                    ? 'border-white/25 bg-transparent text-white hover:border-white/60'
                    : state === 'correct'
                      ? 'border-brand-green bg-brand-green/20 text-white'
                      : state === 'wrong'
                        ? 'border-brand-red bg-brand-red/20 text-white'
                        : 'border-white/10 bg-transparent text-white/40'
                }`}
              >
                {opt}
                {state === 'correct' && <Check className="size-4 text-brand-green" />}
                {state === 'wrong' && <X className="size-4 text-brand-red" />}
              </button>
            );
          })}
        </div>

        <AnimatePresence>
          {answered && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="overflow-hidden"
            >
              <div className="mt-3 flex items-center justify-between gap-2">
                <span
                  className={`flex items-center gap-1.5 font-poppins text-sm font-black uppercase ${
                    selected === question.answer ? 'text-brand-green' : 'text-brand-red'
                  }`}
                >
                  {selected === question.answer ? (
                    <>
                      <Ticket className="size-4" /> {t('+1 spin earned')}
                    </>
                  ) : (
                    t('No spin — try the next one')
                  )}
                </span>
                <button
                  type="button"
                  onClick={nextQuestion}
                  className="rounded-xl bg-brand-cyan px-4 py-2 font-poppins text-sm font-black uppercase text-white"
                >
                  {t('Next')}
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Wheel block — the reward moment */}
      <div className="mt-5 flex flex-col items-center">
        <div className="mb-3 flex items-center gap-2 rounded-full bg-white/[0.06] px-4 py-2">
          <Ticket className="size-4 text-brand-yellow" />
          <span className="font-poppins text-sm font-black uppercase text-white">
            {t('{n} spins available', { n: spins })}
          </span>
        </div>

        <RewardWheel segments={SEGMENTS} rotation={rotation} onSettled={onSettled} spinning={wheelSpinning} size={280} />

        <div className="relative mt-4 h-8">
          <AnimatePresence>
            {lastPayout !== null && !wheelSpinning && (
              <motion.div
                key={lastPayout}
                initial={{ opacity: 0, scale: 0.6, y: 6 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0 }}
                transition={{ type: 'spring', stiffness: 320, damping: 18 }}
                className="flex items-center gap-1.5 font-poppins text-xl font-black text-brand-gold"
              >
                <Coins className="size-5" /> +{lastPayout}
                {lastPayout >= 1000 && <span className="text-brand-yellow"> {t('JACKPOT!')}</span>}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <button
          type="button"
          onClick={spinWheel}
          disabled={spins <= 0 || wheelSpinning}
          className="mt-2 h-14 w-full rounded-2xl bg-brand-yellow font-poppins text-lg font-black uppercase tracking-wide text-black shadow-[0_8px_24px_rgba(255,229,0,0.25)] transition-transform enabled:active:scale-[0.98] disabled:opacity-35"
        >
          {wheelSpinning ? t('Spinning…') : spins > 0 ? t('Spin the wheel') : t('Answer to earn a spin')}
        </button>
      </div>
    </MiniGameShell>
  );
}
