'use client';

import { useCallback, useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Check, X } from 'lucide-react';
import { MiniGameShell, StatPill } from './MiniGameShell';
import { getTrivia, type TriviaQuestion } from '../data/trivia';
import { useMiniLocale, useMiniT } from '../lib/i18n';

const ROUNDS = 5;

interface Zone {
  id: string;
  x: number; // % across the goal
  y: number; // % down
}
const ZONES: Zone[] = [
  { id: 'TL', x: 20, y: 34 },
  { id: 'TC', x: 50, y: 26 },
  { id: 'TR', x: 80, y: 34 },
  { id: 'BL', x: 20, y: 66 },
  { id: 'BC', x: 50, y: 72 },
  { id: 'BR', x: 80, y: 66 },
];
const randZone = () => ZONES[Math.floor(Math.random() * ZONES.length)];

type Beat =
  | 'your-question'
  | 'your-shot'
  | 'your-result'
  | 'ai-question'
  | 'ai-keep'
  | 'ai-result'
  | 'game-over';

export function PenaltyShootout({ backHref }: { backHref?: string } = {}) {
  const t = useMiniT();
  const miniLocale = useMiniLocale();
  const [round, setRound] = useState(1);
  const [you, setYou] = useState(0);
  const [ai, setAi] = useState(0);
  const [beat, setBeat] = useState<Beat>('your-question');
  const [qIndex, setQIndex] = useState(3); // offset from other games' pool
  const [selected, setSelected] = useState<number | null>(null);
  const [shooterZone, setShooterZone] = useState<Zone | null>(null);
  const [keeperZone, setKeeperZone] = useState<Zone | null>(null);
  const [scored, setScored] = useState<boolean | null>(null);
  const [aiOnTarget, setAiOnTarget] = useState(false);

  const trivia = useMemo(() => getTrivia(miniLocale), [miniLocale]);
  const question = trivia[qIndex % trivia.length];

  const answerYours = (i: number) => {
    if (selected !== null) return;
    setSelected(i);
    window.setTimeout(() => {
      if (i === question.answer) {
        setBeat('your-shot');
      } else {
        // No shot earned — counts as a miss.
        setScored(false);
        setShooterZone(null);
        setKeeperZone(null);
        setBeat('your-result');
      }
      setSelected(null);
    }, 850);
  };

  // You shoot: pick a corner; keeper dives randomly.
  const takeShot = (zone: Zone) => {
    if (shooterZone) return;
    const keeper = randZone();
    setShooterZone(zone);
    setKeeperZone(keeper);
    const goal = keeper.id !== zone.id;
    window.setTimeout(() => {
      if (goal) setYou((v) => v + 1);
      setScored(goal);
      setBeat('your-result');
    }, 900);
  };

  const startAiTurn = useCallback(() => {
    setSelected(null);
    setShooterZone(null);
    setKeeperZone(null);
    setScored(null);
    setQIndex((q) => q + 1);
    // AI answers its own question (simulated ~70% correct → earns a shot).
    const onTarget = Math.random() < 0.7;
    setAiOnTarget(onTarget);
    setBeat('ai-question');
    window.setTimeout(() => {
      if (onTarget) {
        setBeat('ai-keep');
      } else {
        setScored(false);
        setBeat('ai-result');
      }
    }, 1100);
  }, []);

  // AI shoots (random corner), YOU pick the dive.
  const dive = (zone: Zone) => {
    if (keeperZone) return;
    const shot = randZone();
    setKeeperZone(zone);
    setShooterZone(shot);
    const aiGoal = shot.id !== zone.id;
    window.setTimeout(() => {
      if (aiGoal) setAi((v) => v + 1);
      setScored(aiGoal);
      setBeat('ai-result');
    }, 900);
  };

  const nextRound = () => {
    setSelected(null);
    setShooterZone(null);
    setKeeperZone(null);
    setScored(null);
    if (round >= ROUNDS) {
      setBeat('game-over');
      return;
    }
    setRound((r) => r + 1);
    setQIndex((q) => q + 1);
    setBeat('your-question');
  };

  const restart = () => {
    setRound(1);
    setYou(0);
    setAi(0);
    setSelected(null);
    setShooterZone(null);
    setKeeperZone(null);
    setScored(null);
    setQIndex(3);
    setBeat('your-question');
  };

  const isShooting = beat === 'your-shot';
  const isKeeping = beat === 'ai-keep';
  const resolving = (beat === 'your-shot' || beat === 'ai-keep') && !!shooterZone && !!keeperZone;

  return (
    <MiniGameShell
      backHref={backHref}
      title={t('Penalty Shootout')}
      subtitle={t('Round {n} / {total}', { n: Math.min(round, ROUNDS), total: ROUNDS })}
      accent="#58CC02"
      headerRight={
        <StatPill label={t('You · AI')} value={`${you} – ${ai}`} color="#58CC02" />
      }
    >
      {/* Round dots */}
      <div className="mt-1 flex justify-center gap-1.5">
        {Array.from({ length: ROUNDS }).map((_, i) => (
          <div
            key={i}
            className={`h-1.5 w-6 rounded-full ${i + 1 < round ? 'bg-brand-green' : i + 1 === round && beat !== 'game-over' ? 'bg-brand-yellow' : 'bg-white/10'}`}
          />
        ))}
      </div>

      {/* Goal / pitch */}
      <div className="mt-4">
        <Goal
          mode={isShooting ? 'shoot' : isKeeping ? 'keep' : 'idle'}
          shooterZone={shooterZone}
          keeperZone={keeperZone}
          resolving={resolving}
          onPick={isShooting ? takeShot : isKeeping ? dive : undefined}
        />
      </div>

      {/* Banner + interaction */}
      <div className="mt-4 flex-1">
        <AnimatePresence mode="wait">
          {(beat === 'your-question' || beat === 'ai-question') && (
            <motion.div key={`q-${beat}-${qIndex}`} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
              <Banner tone={beat === 'your-question' ? 'you' : 'ai'}>
                {beat === 'your-question' ? t('Answer to earn your shot') : t('Opponent is stepping up…')}
              </Banner>
              {beat === 'your-question' ? (
                <QuestionCard question={question} selected={selected} onAnswer={answerYours} />
              ) : (
                <div className="mt-3 flex items-center justify-center gap-2 py-4 font-poppins text-sm font-black uppercase text-white/50">
                  <span className="size-3 animate-spin rounded-full border-2 border-white/20 border-t-brand-red-soft" />
                  {aiOnTarget ? t('AI is on target — get ready to dive!') : t('AI answering…')}
                </div>
              )}
            </motion.div>
          )}

          {beat === 'your-shot' && !shooterZone && (
            <motion.div key="shoot" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              <Banner tone="you">{t('Pick your corner — beat the keeper')}</Banner>
            </motion.div>
          )}

          {beat === 'ai-keep' && !keeperZone && (
            <motion.div key="keep" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              <Banner tone="ai">{t("You're in goal — pick your dive!")}</Banner>
            </motion.div>
          )}

          {(beat === 'your-result' || beat === 'ai-result') && (
            <ResultBeat
              key={`res-${beat}-${round}`}
              beat={beat}
              scored={scored}
              onContinue={beat === 'your-result' ? startAiTurn : nextRound}
              lastRound={beat === 'ai-result' && round >= ROUNDS}
            />
          )}

          {beat === 'game-over' && (
            <GameOver key="over" you={you} ai={ai} onRestart={restart} />
          )}
        </AnimatePresence>
      </div>
    </MiniGameShell>
  );
}

function Goal({
  mode,
  shooterZone,
  keeperZone,
  resolving,
  onPick,
}: {
  mode: 'shoot' | 'keep' | 'idle';
  shooterZone: Zone | null;
  keeperZone: Zone | null;
  resolving: boolean;
  onPick?: (z: Zone) => void;
}) {
  return (
    <div className="relative mx-auto aspect-[16/9] w-full overflow-hidden rounded-2xl border-2 border-white/10 bg-gradient-to-b from-[#0e2f14] to-[#0a1f0d]">
      {/* Goal frame */}
      <div className="absolute left-1/2 top-2 h-[62%] w-[86%] -translate-x-1/2 rounded-t-md border-[3px] border-white/70 border-b-0">
        {/* net hint */}
        <div
          className="absolute inset-0 opacity-15"
          style={{ backgroundImage: 'linear-gradient(#fff 1px, transparent 1px), linear-gradient(90deg, #fff 1px, transparent 1px)', backgroundSize: '14px 14px' }}
        />
      </div>

      {/* Zones (pickable) */}
      {mode !== 'idle' &&
        !shooterZone &&
        !keeperZone &&
        ZONES.map((z) => (
          <button
            key={z.id}
            type="button"
            onClick={() => onPick?.(z)}
            aria-label={`Zone ${z.id}`}
            className="absolute size-11 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white/40 bg-white/10 transition-colors hover:border-brand-yellow hover:bg-brand-yellow/25"
            style={{ left: `${z.x}%`, top: `${z.y}%` }}
          />
        ))}

      {/* Ball */}
      <motion.div
        className="absolute z-10 -translate-x-1/2 -translate-y-1/2 text-2xl"
        initial={false}
        animate={
          resolving && shooterZone
            ? { left: `${shooterZone.x}%`, top: `${shooterZone.y}%`, scale: 0.8 }
            : { left: '50%', top: '92%', scale: 1 }
        }
        transition={{ duration: 0.8, ease: [0.5, 0, 0.75, 0] }}
      >
        ⚽
      </motion.div>

      {/* Keeper */}
      <motion.div
        className="absolute z-10 -translate-x-1/2 -translate-y-1/2 text-3xl"
        initial={false}
        animate={
          resolving && keeperZone
            ? { left: `${keeperZone.x}%`, top: `${keeperZone.y}%`, rotate: keeperZone.x < 40 ? -35 : keeperZone.x > 60 ? 35 : 0 }
            : { left: '50%', top: '52%', rotate: 0 }
        }
        transition={{ duration: 0.7, ease: [0.34, 1.4, 0.64, 1] }}
      >
        🧤
      </motion.div>
    </div>
  );
}

function QuestionCard({
  question,
  selected,
  onAnswer,
}: {
  question: TriviaQuestion;
  selected: number | null;
  onAnswer: (i: number) => void;
}) {
  const answered = selected !== null;
  return (
    <div className="mt-3 rounded-2xl border border-white/[0.08] bg-surface-card/60 p-4">
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
              onClick={() => onAnswer(i)}
              className={`flex items-center justify-between rounded-xl border-2 px-3.5 py-3 text-left font-poppins text-sm font-bold transition-colors ${
                state === 'idle'
                  ? 'border-white/10 bg-white/[0.03] text-white hover:border-brand-green/50'
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

function Banner({ tone, children }: { tone: 'you' | 'ai'; children: React.ReactNode }) {
  return (
    <div
      className="rounded-xl px-4 py-2.5 text-center font-poppins text-sm font-black uppercase tracking-wide"
      style={{
        background: tone === 'you' ? 'rgba(88,204,2,0.12)' : 'rgba(255,75,75,0.12)',
        color: tone === 'you' ? '#58CC02' : '#FF4B4B',
      }}
    >
      {children}
    </div>
  );
}

function ResultBeat({
  beat,
  scored,
  onContinue,
  lastRound,
}: {
  beat: Beat;
  scored: boolean | null;
  onContinue: () => void;
  lastRound: boolean;
}) {
  const t = useMiniT();
  const mine = beat === 'your-result';
  const good = mine ? scored : !scored; // a save on AI's shot is good for you
  const headline = mine
    ? scored
      ? t('GOAL!')
      : t('MISSED')
    : scored
      ? t('AI SCORES')
      : t('SAVED!');
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0 }}
      transition={{ type: 'spring', stiffness: 320, damping: 20 }}
      className="flex flex-col items-center gap-3 py-2"
    >
      <div
        className="font-poppins text-4xl font-black uppercase"
        style={{ color: good ? '#58CC02' : '#FB3101', textShadow: '0 4px 20px rgba(0,0,0,0.4)' }}
      >
        {headline}
      </div>
      <button
        type="button"
        onClick={onContinue}
        className="h-13 rounded-2xl bg-white/10 px-8 py-3 font-poppins text-base font-black uppercase text-white transition-colors hover:bg-white/15"
      >
        {mine ? t("Opponent's turn") : lastRound ? t('See result') : t('Next round')}
      </button>
    </motion.div>
  );
}

function GameOver({ you, ai, onRestart }: { you: number; ai: number; onRestart: () => void }) {
  const t = useMiniT();
  const win = you > ai;
  const draw = you === ai;
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex flex-col items-center gap-4 py-4 text-center"
    >
      <div className="text-5xl">{win ? '🏆' : draw ? '🤝' : '😞'}</div>
      <div className="font-poppins text-2xl font-black uppercase" style={{ color: win ? '#FFD700' : draw ? '#FFE500' : '#FF4B4B' }}>
        {win ? t('You win!') : draw ? t('Draw') : t('You lose')}
      </div>
      <div className="font-poppins text-4xl font-black tabular-nums text-white">
        {you} <span className="text-white/30">–</span> {ai}
      </div>
      <button
        type="button"
        onClick={onRestart}
        className="mt-2 h-14 w-full rounded-2xl bg-brand-green font-poppins text-lg font-black uppercase tracking-wide text-white"
      >
        {t('Play again')}
      </button>
    </motion.div>
  );
}
