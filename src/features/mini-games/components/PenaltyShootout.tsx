'use client';

import { useCallback, useId, useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Check, X } from 'lucide-react';
import { MiniGameShell, StatPill } from './MiniGameShell';
import { getTrivia, type TriviaQuestion } from '../data/trivia';
import { useMiniLocale, useMiniT } from '../lib/i18n';

const ROUNDS = 5;
const BALL_URL = '/assets/brand/goal-ball-small.webp';

interface Zone {
  id: string;
  x: number; // % across the goal
  y: number; // % down
}
/** Percent positions inset inside the goal mouth (posts ~11–89%, bar ~8%, line ~68%). */
const ZONES: Zone[] = [
  { id: 'TL', x: 22, y: 24 },
  { id: 'TC', x: 50, y: 22 },
  { id: 'TR', x: 78, y: 24 },
  { id: 'BL', x: 22, y: 52 },
  { id: 'BC', x: 50, y: 54 },
  { id: 'BR', x: 78, y: 52 },
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
  const settled = beat === 'your-result' || beat === 'ai-result';

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
          settled={settled}
          scored={scored}
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
  settled,
  scored,
  onPick,
}: {
  mode: 'shoot' | 'keep' | 'idle';
  shooterZone: Zone | null;
  keeperZone: Zone | null;
  resolving: boolean;
  settled: boolean;
  scored: boolean | null;
  onPick?: (z: Zone) => void;
}) {
  const uid = useId().replace(/:/g, '');
  const picking = mode !== 'idle' && !shooterZone && !keeperZone;
  const inFlight = resolving || (settled && !!shooterZone && !!keeperZone);
  const isSave = inFlight && !!shooterZone && !!keeperZone && shooterZone.id === keeperZone.id;
  const showGoalFx = settled && scored === true;
  const showSaveFx = settled && scored === false && !!shooterZone;
  const dest = shooterZone;
  const peakX = dest ? 50 + (dest.x - 50) * 0.45 : 50;
  const peakY = dest ? Math.min(dest.y, 70) - 16 : 50;
  const restTop = dest ? (isSave && settled ? dest.y + 10 : dest.y) : 88;
  const restLeft = dest ? dest.x : 50;
  const diveAngle = !keeperZone ? 0 : keeperZone.x < 40 ? -58 : keeperZone.x > 60 ? 58 : keeperZone.y < 40 ? -16 : 22;

  return (
    <div className="relative mx-auto aspect-[16/9] w-full overflow-hidden rounded-[24px] border border-white/10 bg-white/5 shadow-[inset_0_1px_0_rgba(255,255,255,0.1)] backdrop-blur-md">
      {/* Pitch wash — tinted glass, not a solid green box */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{
          backgroundImage: [
            'radial-gradient(110% 70% at 50% 8%, rgba(88,204,2,0.16), transparent 62%)',
            'linear-gradient(180deg, rgba(56,182,14,0.06), rgba(8,24,14,0.16))',
            'repeating-linear-gradient(90deg, rgba(56,182,14,0.08) 0 28px, rgba(56,182,14,0.02) 28px 56px)',
          ].join(', '),
        }}
      />

      {/* Goal frame + net + box markings */}
      <svg className="pointer-events-none absolute inset-0 h-full w-full" viewBox="0 0 400 225" preserveAspectRatio="none" aria-hidden>
        <defs>
          <pattern id={`${uid}-net`} width="14" height="14" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
            <path d="M0 0h14M0 0v14" stroke="rgba(255,255,255,0.28)" strokeWidth="0.7" />
          </pattern>
          <linearGradient id={`${uid}-post`} x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="#d6d6d6" />
            <stop offset="45%" stopColor="#ffffff" />
            <stop offset="100%" stopColor="#b8b8b8" />
          </linearGradient>
        </defs>
        {/* 6-yard box */}
        <path d="M78 210 V168 H322 V210" fill="none" stroke="rgba(255,255,255,0.28)" strokeWidth="1.6" />
        {/* penalty spot */}
        <circle cx="200" cy="204" r="3.2" fill="rgba(255,255,255,0.55)" />
        {/* net */}
        <path d="M42 18 H358 V148 H42 Z" fill={`url(#${uid}-net)`} opacity="0.9" />
        {/* posts + crossbar */}
        <rect x="36" y="12" width="10" height="140" rx="2" fill={`url(#${uid}-post)`} />
        <rect x="354" y="12" width="10" height="140" rx="2" fill={`url(#${uid}-post)`} />
        <rect x="36" y="8" width="328" height="10" rx="2" fill={`url(#${uid}-post)`} />
        {/* goal-line */}
        <path d="M46 152 H354" stroke="rgba(255,255,255,0.45)" strokeWidth="1.4" />
      </svg>

      {/* Net bulge on a goal */}
      <AnimatePresence>
        {showGoalFx && (
          <motion.div
            key="net-ripple"
            className="pointer-events-none absolute left-[9%] top-[6%] h-[56%] w-[82%] rounded-t-md"
            initial={{ opacity: 0, scale: 1 }}
            animate={{ opacity: [0, 0.55, 0], scale: [1, 1.045, 1.02] }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.55, ease: 'easeOut' }}
            style={{
              background:
                'radial-gradient(ellipse at 50% 40%, rgba(255,255,255,0.28), transparent 62%)',
            }}
          />
        )}
      </AnimatePresence>

      {/* Outcome wash */}
      <AnimatePresence>
        {(showGoalFx || showSaveFx) && (
          <motion.div
            key="fx"
            className="pointer-events-none absolute inset-0"
            initial={{ opacity: 0 }}
            animate={{ opacity: [0, 0.55, 0.18] }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.7 }}
            style={{
              background: showGoalFx
                ? 'radial-gradient(circle at 50% 42%, rgba(88,204,2,0.45), transparent 62%)'
                : 'radial-gradient(circle at 50% 42%, rgba(255,75,75,0.4), transparent 62%)',
            }}
          />
        )}
      </AnimatePresence>

      {/* Zones (pickable) */}
      {picking &&
        ZONES.map((z) => (
          <motion.button
            key={z.id}
            type="button"
            onClick={() => onPick?.(z)}
            aria-label={`Zone ${z.id}`}
            initial={{ opacity: 0, scale: 0.7 }}
            animate={{ opacity: 1, scale: [1, 1.08, 1] }}
            transition={{ scale: { duration: 1.6, repeat: Infinity, ease: 'easeInOut' } }}
            className="group absolute z-20 size-10 -translate-x-1/2 -translate-y-1/2 rounded-full border border-white/40 bg-white/10 transition-colors hover:border-brand-yellow hover:bg-brand-yellow/25 sm:size-11"
            style={{ left: `${z.x}%`, top: `${z.y}%` }}
          >
            <span className="pointer-events-none absolute inset-[6px] rounded-full border border-white/45 group-hover:border-brand-yellow" />
            <span className="pointer-events-none absolute left-1/2 top-2 bottom-2 w-px -translate-x-1/2 bg-white/50 group-hover:bg-brand-yellow" />
            <span className="pointer-events-none absolute top-1/2 left-2 right-2 h-px -translate-y-1/2 bg-white/50 group-hover:bg-brand-yellow" />
          </motion.button>
        ))}

      {/* Keeper */}
      <motion.div
        className="pointer-events-none absolute z-10 -translate-x-1/2 -translate-y-1/2"
        initial={false}
        animate={
          keeperZone && inFlight
            ? { left: `${keeperZone.x}%`, top: `${keeperZone.y}%`, rotate: diveAngle, scale: 1.16 }
            : { left: '50%', top: '40%', rotate: 0, scale: 1 }
        }
        transition={
          keeperZone && inFlight
            ? { type: 'spring', stiffness: 380, damping: 14, mass: 0.7 }
            : { duration: 0.45, ease: [0.22, 1, 0.36, 1] }
        }
      >
        <motion.div
          animate={inFlight ? { y: 0 } : { y: [0, -3, 0] }}
          transition={inFlight ? { duration: 0.2 } : { duration: 1.8, repeat: Infinity, ease: 'easeInOut' }}
        >
          <KeeperGlove />
        </motion.div>
      </motion.div>

      {/* Ball */}
      <motion.div
        className="pointer-events-none absolute z-20 -translate-x-1/2 -translate-y-1/2"
        initial={false}
        animate={
          dest && inFlight
            ? resolving
              ? {
                  left: ['50%', `${peakX}%`, `${dest.x}%`],
                  top: ['88%', `${peakY}%`, `${dest.y}%`],
                  scale: [1, 0.88, 0.7],
                  rotate: [0, 220, 420],
                }
              : {
                  left: `${restLeft}%`,
                  top: `${restTop}%`,
                  scale: isSave ? 0.82 : 0.62,
                  rotate: isSave ? 480 : 520,
                }
            : { left: '50%', top: '88%', scale: 1, rotate: 0 }
        }
        transition={
          dest && resolving
            ? { duration: 0.72, ease: [0.18, 0.7, 0.28, 1], times: [0, 0.45, 1] }
            : dest && settled
              ? { type: 'spring', stiffness: 380, damping: 16 }
              : { duration: 0.35 }
        }
      >
        <motion.img
          src={BALL_URL}
          alt=""
          width={40}
          height={40}
          className="size-9 drop-shadow-[0_6px_10px_rgba(0,0,0,0.45)] sm:size-10"
          animate={!inFlight ? { y: [0, -4, 0] } : { y: 0 }}
          transition={!inFlight ? { duration: 1.6, repeat: Infinity, ease: 'easeInOut' } : { duration: 0.2 }}
          draggable={false}
        />
      </motion.div>
    </div>
  );
}

function KeeperGlove() {
  return (
    <svg
      viewBox="0 0 64 72"
      className="h-12 w-11 drop-shadow-[0_8px_12px_rgba(0,0,0,0.5)] sm:h-14 sm:w-12"
      aria-hidden
    >
      <g fill="#58CC02" stroke="#16380a" strokeWidth="1.7" strokeLinejoin="round">
        <rect x="12" y="6" width="8" height="26" rx="4" />
        <rect x="22" y="2" width="9" height="30" rx="4.5" />
        <rect x="33" y="4" width="8.5" height="28" rx="4.2" />
        <rect x="43" y="8" width="8" height="24" rx="4" />
        <path d="M14 28h32c5 0 9 4 9 9v16H8V36c0-5 3-8 6-8Z" />
        <ellipse cx="11" cy="38" rx="8" ry="12" transform="rotate(-28 11 38)" />
      </g>
      <rect x="16" y="54" width="32" height="15" rx="5" fill="#f3f3f3" stroke="#16380a" strokeWidth="1.7" />
      <rect x="16" y="54" width="32" height="5" fill="#58CC02" stroke="#16380a" strokeWidth="1.2" />
      <path d="M22 40h20M22 46h16" stroke="#d4ff9a" strokeWidth="1.4" strokeLinecap="round" opacity=".85" />
    </svg>
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
    <div className="mt-3">
      <p className="px-1 font-poppins text-base font-bold leading-snug text-white sm:text-lg">{question.q}</p>
      <div className="mt-3 grid grid-cols-2 gap-2.5">
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
              className="relative flex h-[60px] appearance-none items-center justify-center overflow-hidden rounded-[16px] bg-transparent px-3 font-poppins text-sm font-bold leading-tight sm:h-[78px] sm:text-base"
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
              <span className="flex items-center gap-2 text-center">
                {opt}
                {state === 'correct' && <Check className="size-4 shrink-0 text-white" />}
                {state === 'wrong' && <X className="size-4 shrink-0 text-brand-red" />}
              </span>
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
      className="px-1 py-1 text-center font-poppins text-sm font-black uppercase tracking-wide"
      style={{ color: tone === 'you' ? '#58CC02' : '#FF4B4B' }}
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
        className="h-13 rounded-2xl border border-white/20 bg-transparent px-8 py-3 font-poppins text-base font-black uppercase text-white transition-colors hover:border-white/40"
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
