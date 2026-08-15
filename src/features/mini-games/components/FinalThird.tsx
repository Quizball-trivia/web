'use client';

/**
 * FREE KICKS — house-banked football risk game (open-zones + run multiplier).
 *
 * Loop: stake → the goal opens with 2 zones (1 hidden keeper → 50% goal).
 * Each attack you choose: ANSWER a question to open one more zone (up to 6,
 * 83.3% goal), or SHOOT now. A wrong answer slams the goal back to 2 zones.
 * Per-shot payouts are priced per state, always below fair odds k/(k-1):
 *   k=2 → 1.86x (fair 2.00, RTP 93%) · k=3 → 1.42x (95%) · k=4 → 1.28x (96%)
 *   k=5 → 1.21x (97%) · k=6 → 1.18x (98%)
 * The GROWING number the player rides is the RUN multiplier: the pot compounds
 * across attacks (×1.86 → ×2.6 → ×3.3 → …) until they cash out or the keeper
 * ends it. Every state's EV < 1, so the house edge is provable for every
 * strategy — knowledge narrows it from 7% to 2% but can never flip it.
 * After every goal: TAKE the pot or NEXT ATTACK (goal resets to 2 zones).
 *
 * The social layer (live-wins ticker, crowd pulse, longest runs) is purely
 * cosmetic client-side flavour — it never influences the RNG or payouts.
 * Virtual points only.
 */

import { useEffect, useMemo, useRef, useState } from 'react';
import dynamic from 'next/dynamic';
import { animate, motion, AnimatePresence } from 'motion/react';
import { Check, Eye, Radio, Trophy, Volume2, VolumeX, X } from 'lucide-react';
import { MiniGameShell } from './MiniGameShell';
import { KeeperGlove } from './PenaltyShootout';
import { getTrivia, type TriviaQuestion } from '../data/trivia';
import { useMiniLocale, useMiniT } from '../lib/i18n';
import { getSoundLevels, playCash, playKick, setCrowdLevel, setCrowdMood, setSfxLevel, startCrowd, stopCrowd } from '../lib/crowdAudio';
import { CoinIcon } from '@/features/store/components/CoinIcon';
import { ResultSplash } from '@/features/daily/components/ResultSplash';
import { useResultSplash } from '@/features/daily/components/useResultSplash';

const BALL_URL = '/assets/brand/goal-ball-small.webp';
const MIN_STAKE = 5;
const STAKE_PRESETS = [5, 10, 20, 50, 100];

/** Flip to false to fall back to the 2D goal (tag: final-third-2d-stable). */
const USE_3D_PITCH = true;

const FinalThirdPitch3D = dynamic(
  () => import('./FinalThirdPitch3D').then((m) => m.FinalThirdPitch3D),
  {
    ssr: false,
    loading: () => (
      <div className="relative mx-auto aspect-[16/10] w-full animate-pulse rounded-[24px] border border-white/10 bg-surface-page" />
    ),
  },
);
const START_BALANCE = 100;
const QUESTION_S = 5;
const ANSWER_HOLD_MS = 2000;
const MIN_OPEN = 2;
const MAX_OPEN = 6;
/** Per-state payouts — below fair odds k/(k-1) at every k (see header). */
const STATE_MULTS: Record<number, number> = { 2: 1.86, 3: 1.42, 4: 1.28, 5: 1.21, 6: 1.18 };
/** Zones unlock in this order — starts as a pure left/right coin flip. */
const OPEN_ORDER = ['BL', 'BR', 'TL', 'TR', 'BC', 'TC'] as const;

interface Zone {
  id: string;
  x: number;
  y: number;
}
const ZONES: Zone[] = [
  { id: 'TL', x: 22, y: 24 },
  { id: 'TC', x: 50, y: 22 },
  { id: 'TR', x: 78, y: 24 },
  { id: 'BL', x: 22, y: 52 },
  { id: 'BC', x: 50, y: 54 },
  { id: 'BR', x: 78, y: 52 },
];


/** Tiny deterministic PRNG so the fake crowd numbers are stable per attack. */
function seeded(seed: number): () => number {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

const CROWD_NAMES = [
  'გიორგი7', 'ნიკა77', 'ლუკა99', 'თაზო10', 'საბა_fc', 'დათო21',
  'ბექა_მ', 'სანდრო9', 'ვატო_ზ', 'რეზი_კ', 'ილია21', 'ანზორი',
] as const;

type Beat = 'bet' | 'decide' | 'question' | 'shoot' | 'resolving' | 'goal' | 'saved' | 'cashed';

const fmt = (v: number) => (Number.isInteger(v) ? String(v) : v.toFixed(2));

/** Rolls a number from its previous value to the new one (win "fill up"). */
function AnimatedNumber({ value, decimals = 0, className }: { value: number; decimals?: number; className?: string }) {
  const [display, setDisplay] = useState(value);
  const prevRef = useRef(value);
  useEffect(() => {
    const from = prevRef.current;
    prevRef.current = value;
    if (from === value) return;
    const controls = animate(from, value, {
      duration: 0.7,
      ease: [0.22, 1, 0.36, 1],
      onUpdate: (v) => setDisplay(v),
    });
    return () => controls.stop();
  }, [value]);
  const shown = decimals > 0 ? display.toFixed(decimals) : String(Math.round(display));
  return <span className={className}>{shown}</span>;
}

/** Speaker button + popover: crowd and effects volume sliders (persisted). */
function SoundSettings() {
  const t = useMiniT();
  const [open, setOpen] = useState(false);
  const [levels, setLevelsState] = useState(() =>
    typeof window === 'undefined' ? { crowd: 1, sfx: 1 } : getSoundLevels(),
  );
  const apply = (key: 'crowd' | 'sfx', value: number) => {
    setLevelsState((cur) => ({ ...cur, [key]: value }));
    if (key === 'crowd') setCrowdLevel(value);
    else setSfxLevel(value);
  };
  const allOff = levels.crowd === 0 && levels.sfx === 0;
  return (
    <div className="relative">
      <button
        type="button"
        aria-label={t('Sound settings')}
        onClick={() => setOpen((o) => !o)}
        className={`flex size-8 items-center justify-center rounded-full bg-white/[0.08] transition-colors hover:text-white ${open ? 'text-white' : 'text-white/70'}`}
      >
        {allOff ? <VolumeX className="size-4" /> : <Volume2 className="size-4" />}
      </button>
      {open && (
        <div className="absolute right-0 top-10 z-[80] w-60 rounded-2xl bg-brand-blue p-3 shadow-[0_12px_32px_rgba(0,0,0,0.55)]">
          {([
            ['crowd', t('Crowd')],
            ['sfx', t('Effects')],
          ] as const).map(([key, label]) => (
            <div key={key} className="mb-2.5 last:mb-0">
              <div className="mb-1 flex items-center justify-between font-poppins text-[10px] font-black uppercase tracking-wider text-white/70">
                <span>{label}</span>
                <span className="tabular-nums text-white">{levels[key] === 0 ? t('Off') : `${Math.round(levels[key] * 100)}%`}</span>
              </div>
              <input
                type="range"
                min={0}
                max={100}
                value={Math.round(levels[key] * 100)}
                onChange={(e) => apply(key, Number(e.target.value) / 100)}
                className="h-1.5 w-full cursor-pointer appearance-none rounded-full bg-white/25 accent-[#FFE500]"
              />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/** Small stack of the store coin icon (replaces the old auction bill stack). */
function MoneyStack({ count = 3 }: { count?: number }) {
  const bills = Math.min(4, Math.max(2, count));
  return (
    <span className="relative inline-block h-6 w-8 shrink-0" aria-hidden>
      {Array.from({ length: bills }, (_, i) => (
        <span
          key={i}
          className="absolute left-1/2 top-1/2"
          style={{
            transform: `translate(-50%, -50%) translate(${(i - 1) * 3}px, ${(1 - i) * 2}px) rotate(${(i - 1) * 11}deg)`,
            zIndex: i + 1,
          }}
        >
          <CoinIcon size={16} />
        </span>
      ))}
    </span>
  );
}

function MoneyFlight({
  flight,
}: {
  flight: { seed: number; ox: number; oy: number; tx: number; ty: number } | null;
}) {
  const bits = useMemo(() => {
    if (!flight) return [];
    const rnd = seeded(Math.floor(Math.abs(flight.seed)) || 1);
    return Array.from({ length: 10 }, (_, i) => ({
      i,
      delay: i * 0.04,
      jx: (rnd() - 0.5) * 72,
      jy: (rnd() - 0.5) * 36,
      rot: (rnd() - 0.5) * 90,
      size: 0.62 + rnd() * 0.28,
    }));
  }, [flight]);

  if (!flight) return null;

  return (
    <div className="pointer-events-none fixed inset-0 z-[80] overflow-hidden" aria-hidden>
      {bits.map((bit) => (
        <motion.div
          key={`${flight.seed}-${bit.i}`}
          className="absolute"
          initial={{
            left: flight.ox,
            top: flight.oy,
            x: '-50%',
            y: '-50%',
            opacity: 0,
            scale: 0.45,
            rotate: 0,
          }}
          animate={{
            left: flight.tx,
            top: flight.ty,
            x: ['-50%', `calc(-50% + ${bit.jx}px)`, '-50%'],
            y: ['-50%', `calc(-50% + ${bit.jy - 48}px)`, '-50%'],
            opacity: [0, 1, 1, 0],
            scale: [0.45, 1.05, 0.55],
            rotate: [0, bit.rot, bit.rot * 0.2],
          }}
          transition={{ duration: 0.72, delay: bit.delay, ease: [0.2, 0.75, 0.15, 1] }}
        >
          <CoinIcon size={Math.round(30 * bit.size)} />
        </motion.div>
      ))}
    </div>
  );
}

interface TickerEntry {
  id: number;
  name: string;
  amount: number;
  mult: number;
  minutesAgo: number;
}

export function FinalThird({ backHref }: { backHref?: string } = {}) {
  const t = useMiniT();
  const miniLocale = useMiniLocale();
  const trivia = useMemo(() => getTrivia(miniLocale), [miniLocale]);
  const { splashProps, fire } = useResultSplash();

  const [balance, setBalance] = useState(START_BALANCE);
  const [beat, setBeat] = useState<Beat>('bet');
  const [attack, setAttack] = useState(0);
  const [pot, setPot] = useState(0);
  const [stake, setStake] = useState(10);
  const [stakeText, setStakeText] = useState('10');
  const [roundStake, setRoundStake] = useState(10);
  const [qIndex, setQIndex] = useState(() => Math.floor(Math.random() * 1000));
  const [selected, setSelected] = useState<number | null>(null);
  const [openCount, setOpenCount] = useState(MIN_OPEN);
  const [answerLocked, setAnswerLocked] = useState(false);
  const [keeperZone, setKeeperZone] = useState<string | null>(null);
  const [lastAnswer, setLastAnswer] = useState<'up' | 'reset' | null>(null);
  const [shotZone, setShotZone] = useState<Zone | null>(null);
  const [scored, setScored] = useState<boolean | null>(null);
  const [lastTake, setLastTake] = useState<number | null>(null);
  const [bestRun, setBestRun] = useState<number | null>(null);
  const [ticker, setTicker] = useState<TickerEntry[]>([]);
  const [playingNow, setPlayingNow] = useState(1284);
  const [flight, setFlight] = useState<{ seed: number; ox: number; oy: number; tx: number; ty: number } | null>(null);
  const [stackBump, setStackBump] = useState(false);
  const tickerId = useRef(0);
  const timersRef = useRef<number[]>([]);
  const selectedRef = useRef<number | null>(null);
  const [qLeft, setQLeft] = useState(QUESTION_S);

  // ── Fake stadium: live-wins ticker + drifting player count. Cosmetic only.
  useEffect(() => {
    const push = () => {
      const rnd = seeded(Date.now() % 1_000_000);
      const mult = [1.2, 1.5, 1.5, 1.875, 1.875, 2.34, 2.93, 4.58][Math.floor(rnd() * 8)];
      setTicker((cur) => [
        {
          id: (tickerId.current += 1),
          name: CROWD_NAMES[Math.floor(rnd() * CROWD_NAMES.length)],
          amount: Math.round(10 * mult * 100) / 100,
          mult,
          minutesAgo: 0,
        },
        ...cur.slice(0, 3).map((e) => ({ ...e, minutesAgo: e.minutesAgo + (rnd() > 0.5 ? 1 : 0) })),
      ]);
      setPlayingNow((n) => Math.max(900, n + Math.floor(rnd() * 21) - 10));
    };
    push();
    const id = window.setInterval(push, 4200);
    return () => window.clearInterval(id);
  }, []);

  useEffect(() => {
    const timers = timersRef.current;
    return () => timers.forEach((id) => window.clearTimeout(id));
  }, []);

  useEffect(() => {
    startCrowd();
    return () => stopCrowd();
  }, []);

  useEffect(() => {
    if (beat === 'goal') setCrowdMood('cheer');
    else if (beat === 'saved') setCrowdMood('miss');
    else if (beat === 'cashed') {
      playCash();
      setCrowdMood('cheer');
    } else if (beat === 'decide' || beat === 'question' || beat === 'shoot' || beat === 'resolving') setCrowdMood('build');
    else setCrowdMood('idle');
  }, [beat]);
  const later = (fn: () => void, ms: number) => {
    timersRef.current.push(window.setTimeout(fn, ms));
  };

  // Leaving a round (cash-out or back to betting) resets the scene: ball on
  // the spot, taker and keeper back to their idle poses.
  useEffect(() => {
    if (beat === 'bet' || beat === 'cashed') {
      setShotZone(null);
      setScored(null);
      setKeeperZone(null);
    }
  }, [beat]);

  useEffect(() => {
    if (beat !== 'question') return;
    const started = Date.now();
    const tick = window.setInterval(() => {
      setQLeft(Math.max(0, QUESTION_S - (Date.now() - started) / 1000));
    }, 100);
    const to = window.setTimeout(() => {
      if (selectedRef.current !== null) return;
      selectedRef.current = -1;
      setSelected(-1);
      fire('wrong', 'right');
      later(() => {
        setLastAnswer('reset');
        setOpenCount(MIN_OPEN);
        setAnswerLocked(true);
        setBeat('decide');
      }, ANSWER_HOLD_MS);
    }, QUESTION_S * 1000);
    return () => {
      window.clearInterval(tick);
      window.clearTimeout(to);
    };
    // Restart only when a new question is dealt.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [beat, qIndex]);

  const question: TriviaQuestion = trivia[qIndex % trivia.length];
  const mult = STATE_MULTS[openCount];
  const goalPct = Math.round(((openCount - 1) / openCount) * 100);
  const openIds = useMemo(() => OPEN_ORDER.slice(0, openCount) as readonly string[], [openCount]);
  const potential = useMemo(() => Math.round(pot * mult * 100) / 100, [pot, mult]);
  const runMult = pot > 0 ? Math.round((pot / roundStake) * 100) / 100 : 0;

  // Deterministic crowd-pulse numbers per attack (stable across re-renders).
  const pulse = useMemo(() => {
    const rnd = seeded(qIndex * 7919 + attack * 104729);
    return {
      answered: 55 + Math.floor(rnd() * 30),
      scored: 55 + Math.floor(rnd() * 25),
      cashed: 20 + Math.floor(rnd() * 25),
      going: 900 + Math.floor(rnd() * 700),
    };
  }, [qIndex, attack]);

  const beginAttack = () => {
    selectedRef.current = null;
    setSelected(null);
    setShotZone(null);
    setScored(null);
    setOpenCount(MIN_OPEN);
    setAnswerLocked(false);
    setKeeperZone(null);
    setLastAnswer(null);
    setBeat('decide');
  };

  const askQuestion = () => {
    if (openCount >= MAX_OPEN || answerLocked) return;
    selectedRef.current = null;
    setSelected(null);
    setQIndex((q) => q + 1);
    setQLeft(QUESTION_S);
    setBeat('question');
  };

  const startRound = () => {
    if (balance < stake || stake < MIN_STAKE) return;
    startCrowd();
    setBalance((b) => Math.round((b - stake) * 100) / 100);
    setPot(stake);
    setRoundStake(stake);
    setAttack(0);
    setLastTake(null);
    beginAttack();
  };

  const applyStake = (v: number) => {
    const clamped = Math.max(MIN_STAKE, Math.min(Math.floor(v), 1000));
    setStake(clamped);
    setStakeText(String(clamped));
  };

  const answer = (i: number) => {
    if (selectedRef.current !== null) return;
    selectedRef.current = i;
    setSelected(i);
    const correct = i === question.answer;
    fire(correct ? 'correct' : 'wrong', i % 2 === 0 ? 'left' : 'right');
    later(() => {
      if (correct) {
        const next = Math.min(MAX_OPEN, openCount + 1);
        setOpenCount(next);
        setLastAnswer('up');
        setBeat(next >= MAX_OPEN ? 'shoot' : 'decide');
      } else {
        setLastAnswer('reset');
        setOpenCount(MIN_OPEN);
        setAnswerLocked(true);
        setBeat('decide');
      }
    }, ANSWER_HOLD_MS);
  };

  const shoot = (zone: Zone) => {
    if (beat !== 'shoot' || shotZone) return;
    if (!openIds.includes(zone.id)) return;
    // The keeper commits to one of the open zones the moment the ball is
    // struck — exactly 1/k save chance, independent of the player's pick.
    const keeper = openIds[Math.floor(Math.random() * openIds.length)];
    setKeeperZone(keeper);
    setShotZone(zone);
    setBeat('resolving');
    const isSave = zone.id === keeper;
    later(() => playKick(), USE_3D_PITCH ? 430 : 90);
    // Give a saved shot enough time to read as contact, gather, and landing.
    later(() => {
      if (isSave) {
        setScored(false);
        setBeat('saved');
      } else {
        setScored(true);
        const next = potential;
        setPot(next);
        setBestRun((b) => Math.max(b ?? 0, Math.round((next / roundStake) * 100) / 100));
        setBeat('goal');
      }
    }, USE_3D_PITCH ? (isSave ? 1850 : 1450) : 880);
  };

  // Playwright reuses this hook; rebind every commit so `shoot` is current.
  useEffect(() => {
    const w = window as Window & { __finalThirdPick?: (id: string) => void };
    w.__finalThirdPick = (id: string) => {
      const zone = ZONES.find((z) => z.id === id);
      if (zone) shoot(zone);
    };
    return () => {
      delete w.__finalThirdPick;
    };
  });

  const cashOut = (event: { currentTarget: HTMLElement }) => {
    const rect = event.currentTarget.getBoundingClientRect();
    const stack = document.querySelector('[data-money-stack]')?.getBoundingClientRect();
    setFlight({
      seed: pot * 17 + attack + 3,
      ox: rect.left + rect.width / 2,
      oy: rect.top + rect.height / 2,
      tx: stack ? stack.left + stack.width / 2 : rect.left + rect.width / 2,
      ty: stack ? stack.top + stack.height / 2 : 36,
    });
    setLastTake(pot);
    setBeat('cashed');
    later(() => {
      setBalance((b) => Math.round((b + pot) * 100) / 100);
      setStackBump(true);
    }, 520);
    later(() => setStackBump(false), 980);
    later(() => setFlight(null), 1200);
  };

  const nextAttack = () => {
    setAttack((a) => a + 1);
    beginAttack();
  };

  // Stake · pot · run card. Compact 3-column strip on mobile; big stacked
  // rows in the desktop rail under the leaderboard.
  const renderHud = (big: boolean) => (
    <div
      className={
        big
          ? 'grid grid-cols-1 divide-y divide-white/15 rounded-2xl bg-brand-blue'
          : 'mt-2 grid grid-cols-3 divide-x divide-white/15 rounded-2xl bg-brand-blue py-2'
      }
    >
      <div className={big ? 'flex items-center justify-between px-4 py-3' : 'flex flex-col items-center gap-0.5 px-2'}>
        <span className={`font-poppins font-black uppercase tracking-wider text-white/60 ${big ? 'text-[11px]' : 'text-[9px]'}`}>{t('Stake')}</span>
        <span className={`inline-flex items-center gap-1 font-poppins font-black tabular-nums leading-none text-white ${big ? 'text-2xl' : 'text-base'}`}>
          {beat === 'bet' ? stake : roundStake} <CoinIcon size={big ? 20 : 14} />
        </span>
      </div>
      <div className={big ? 'flex items-center justify-between px-4 py-3' : 'flex flex-col items-center gap-0.5 px-2'}>
        <span className={`font-poppins font-black uppercase tracking-wider text-white/60 ${big ? 'text-[11px]' : 'text-[9px]'}`}>{t('Your pot')}</span>
        <motion.span
          key={`pot-${attack}-${beat === 'goal' ? 'g' : 'x'}`}
          initial={{ scale: 1.2 }}
          animate={{ scale: 1 }}
          transition={{ type: 'spring', stiffness: 400, damping: 15 }}
          className={`inline-flex items-center gap-1 font-poppins font-black tabular-nums leading-none text-brand-yellow ${big ? 'text-2xl' : 'text-base'}`}
        >
          {pot > 0 && beat !== 'cashed' ? (
            <>
              <AnimatedNumber value={pot} decimals={Number.isInteger(pot) ? 0 : 2} /> <CoinIcon size={big ? 20 : 14} />
            </>
          ) : (
            <span className="text-white/40">—</span>
          )}
        </motion.span>
      </div>
      <div className={big ? 'flex items-center justify-between px-4 py-3' : 'flex flex-col items-center gap-0.5 px-2'}>
        <span className={`font-poppins font-black uppercase tracking-wider text-white/60 ${big ? 'text-[11px]' : 'text-[9px]'}`}>{t('Run')}</span>
        {beat === 'goal' && runMult > 1 ? (
          <motion.span
            key={`run-${runMult}`}
            initial={{ scale: 1.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ type: 'spring', stiffness: 320, damping: 13 }}
            className={`font-poppins font-black tabular-nums leading-none text-brand-green drop-shadow-[0_0_10px_rgba(88,204,2,0.6)] ${big ? 'text-2xl' : 'text-base'}`}
          >
            ×<AnimatedNumber value={runMult} decimals={2} />
          </motion.span>
        ) : beat === 'decide' || beat === 'question' || beat === 'shoot' ? (
          <motion.span
            key={`run-next-${openCount}-${attack}`}
            initial={{ scale: 1.15 }}
            animate={{ scale: 1 }}
            transition={{ type: 'spring', stiffness: 400, damping: 15 }}
            className={`font-poppins font-black tabular-nums leading-none text-brand-green ${big ? 'text-2xl' : 'text-base'}`}
          >
            ×{fmt(Math.max(1, runMult))} <span className="text-white/35">→</span> ×{fmt(Math.round(Math.max(1, runMult) * mult * 100) / 100)}
          </motion.span>
        ) : (
          <span className={`font-poppins font-black leading-none text-white/40 ${big ? 'text-2xl' : 'text-base'}`}>—</span>
        )}
      </div>
    </div>
  );

  return (
    <MiniGameShell
      backHref={backHref}
      title={t('Free Kicks')}
      subtitle={t('Know football. Read the goal. Take the shot.')}
      accent="#58CC02"
      wide
      headerRight={
        <div className="flex items-center gap-2">
          <SoundSettings />
          <motion.div
            data-money-stack
            animate={stackBump ? { scale: [1, 1.22, 1] } : { scale: 1 }}
            transition={{ duration: 0.38, ease: [0.22, 1, 0.36, 1] }}
            className="flex items-center gap-1 rounded-full bg-brand-yellow py-1 pl-1 pr-2.5"
          >
            <MoneyStack />
            <span className="font-poppins text-sm font-black tabular-nums leading-none text-black">
              <AnimatedNumber value={balance} decimals={Number.isInteger(balance) ? 0 : 2} />
            </span>
          </motion.div>
        </div>
      }
    >
      {/* Desktop: game on the left, leaderboard rail on the right. */}
      <div className="lg:grid lg:grid-cols-[minmax(0,1fr)_320px] lg:items-start lg:gap-6">
        <div className="min-w-0">
      {/* Live stadium strip: player count + rotating last win. Cosmetic. */}
      <div className="mt-1 flex items-center justify-between gap-2 px-1 py-1">
        <span className="flex items-center gap-1.5 font-poppins text-[10px] font-black uppercase tracking-wide text-brand-red-soft">
          <Radio className="size-3.5 animate-pulse" /> {t('{n} playing now', { n: playingNow.toLocaleString() })}
        </span>
        <div className="relative h-4 min-w-0 flex-1 overflow-hidden text-right">
          <AnimatePresence mode="popLayout">
            {ticker[0] && (
              <motion.span
                key={ticker[0].id}
                initial={{ y: 12, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                exit={{ y: -12, opacity: 0 }}
                transition={{ duration: 0.35 }}
                className="absolute right-0 top-0 truncate font-poppins text-[10px] font-bold text-white/60"
              >
                {ticker[0].name} <span className="text-brand-gold">+{fmt(ticker[0].amount)}</span>{' '}
                <span className="text-white/40">×{ticker[0].mult}</span>
              </motion.span>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* HUD stat card — inline on mobile, larger copy in the desktop rail. */}
      <div className="lg:hidden">{renderHud(false)}</div>

      {/* Zone ladder: a joined segmented bar — chance climbs 50% → 83%. */}
      <div className="mt-1.5 flex overflow-hidden rounded-full border border-white/10">
        {Array.from({ length: MAX_OPEN - MIN_OPEN + 1 }, (_, i) => MIN_OPEN + i).map((k) => {
          const inRound = beat !== 'bet' && beat !== 'cashed';
          const active = k === openCount && inRound;
          const passed = k < openCount && inRound;
          return (
            <div
              key={k}
              className={`flex-1 py-1 text-center font-poppins text-[9px] font-black tabular-nums transition-colors ${
                active
                  ? 'bg-brand-yellow text-black'
                  : passed
                    ? 'bg-brand-green/25 text-brand-green'
                    : 'bg-white/[0.03] text-white/35'
              }`}
            >
              {k} · {Math.round(((k - 1) / k) * 100)}%
            </div>
          );
        })}
      </div>

      {/* Goal — shakes on a save, bursts on a goal */}
      <motion.div
        className="relative mt-3"
        animate={
          beat === 'saved'
            ? { x: [0, -7, 7, -5, 5, 0] }
            : beat === 'goal'
              ? { scale: [1, 1.015, 1] }
              : { x: 0, scale: 1 }
        }
        transition={{ duration: 0.45 }}
      >
        {USE_3D_PITCH ? (
          <FinalThirdPitch3D
            picking={beat === 'shoot'}
            showZones={beat === 'bet' || beat === 'decide' || beat === 'question' || beat === 'shoot'}
            revealedSave={null}
            scouting={false}
            openZones={[...openIds]}
            shotZone={shotZone}
            willSave={shotZone ? shotZone.id === keeperZone : null}
            resolving={beat === 'resolving'}
            settled={beat === 'goal' || beat === 'saved'}
            scored={scored}
            kickSeed={qIndex}
            onPick={shoot}
          />
        ) : (
          <FinalThirdGoal
            picking={beat === 'shoot'}
            revealedSave={null}
            scouting={false}
            shotZone={shotZone}
            resolving={beat === 'resolving'}
            settled={beat === 'goal' || beat === 'saved'}
            scored={scored}
            onPick={shoot}
          />
        )}
      </motion.div>

      {/* Beat area */}
      <div className="mt-3 flex-1">
        <AnimatePresence mode="wait">
          {beat === 'bet' && (
            <motion.div key="bet" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="space-y-3">
              {lastTake != null && (
                <div className="inline-flex items-center justify-center gap-1.5 text-center font-poppins text-lg font-black text-brand-gold">
                  <MoneyStack /> {t('Cashed out {amount}!', { amount: fmt(lastTake) })}
                </div>
              )}
              <p className="text-center font-poppins text-xs font-semibold text-white/55">
                {t('The goal opens with 2 zones and one hidden keeper. Answer questions to open up to 6 — a wrong answer slams it back to 2.')}
              </p>
              {balance >= MIN_STAKE ? (
                <>
                  {/* Stake picker: presets + free entry, min 5 */}
                  <div className="flex items-center justify-center gap-1.5">
                    {STAKE_PRESETS.map((p) => (
                      <button
                        key={p}
                        type="button"
                        onClick={() => applyStake(p)}
                        disabled={p > balance}
                        className={`rounded-xl border-2 px-3 py-2 font-poppins text-sm font-black tabular-nums transition-colors disabled:opacity-30 ${
                          stake === p
                            ? 'border-brand-yellow bg-brand-yellow/15 text-brand-yellow'
                            : 'border-white/15 bg-transparent text-white/70 hover:border-white/40'
                        }`}
                      >
                        {p}
                      </button>
                    ))}
                    <input
                      inputMode="numeric"
                      pattern="[0-9]*"
                      value={stakeText}
                      onChange={(e) => {
                        const raw = e.target.value.replace(/[^0-9]/g, '');
                        setStakeText(raw);
                        const v = Number(raw);
                        if (Number.isFinite(v) && v >= MIN_STAKE) setStake(Math.min(Math.floor(v), 1000));
                      }}
                      onBlur={() => applyStake(Number(stakeText) || MIN_STAKE)}
                      aria-label={t('Stake')}
                      className="h-[42px] w-16 rounded-xl border-2 border-white/15 bg-transparent text-center font-poppins text-sm font-black tabular-nums text-white outline-none placeholder:text-white/30 focus:border-brand-yellow/70"
                    />
                  </div>
                  <p className="text-center font-poppins text-[10px] font-bold uppercase tracking-wide text-white/35">
                    {t('Min {n}', { n: MIN_STAKE })}
                  </p>
                  <button
                    type="button"
                    onClick={startRound}
                    disabled={stake < MIN_STAKE || stake > balance}
                    className="h-14 w-full rounded-2xl bg-brand-green font-poppins text-lg font-black uppercase tracking-wide text-white shadow-[0_8px_24px_rgba(88,204,2,0.25)] active:scale-[0.98] disabled:opacity-40"
                  >
                    {t('Stake {n} & attack', { n: stake })}
                  </button>
                </>
              ) : (
                <button
                  type="button"
                  onClick={() => setBalance(START_BALANCE)}
                  className="h-14 w-full rounded-2xl bg-brand-yellow font-poppins text-lg font-black uppercase tracking-wide text-black active:scale-[0.98]"
                >
                  {t('Top up (demo)')}
                </button>
              )}
            </motion.div>
          )}

          {beat === 'decide' && (
            <motion.div key={`decide-${openCount}-${lastAnswer}`} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="space-y-2 text-center">
              {lastAnswer === 'up' && (
                <motion.div
                  initial={{ scale: 0.7, opacity: 0, rotate: -3 }}
                  animate={{ scale: 1, opacity: 1, rotate: 0 }}
                  transition={{ type: 'spring', stiffness: 320, damping: 16 }}
                  className="mx-auto inline-flex items-center gap-2 rounded-full bg-brand-green/15 px-4 py-2 font-poppins text-sm font-black uppercase text-brand-green"
                >
                  <Check className="size-4" /> {t('Zone opened! {k} of {max} in play', { k: openCount, max: MAX_OPEN })}
                </motion.div>
              )}
              {lastAnswer === 'reset' && (
                <motion.div
                  initial={{ scale: 0.7, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ type: 'spring', stiffness: 320, damping: 16 }}
                  className="mx-auto inline-flex items-center gap-2 rounded-full bg-brand-red/15 px-4 py-2 font-poppins text-sm font-black uppercase text-brand-red"
                >
                  <X className="size-4" /> {t('Wrong — goal slams back to {n} zones', { n: MIN_OPEN })}
                </motion.div>
              )}
              <p className="font-poppins text-xs font-bold uppercase tracking-wide text-white/60">
                {t('{k} zones open · 1 keeper hidden · {pct}% goal', { k: openCount, pct: goalPct })}
              </p>
              <div className="flex gap-2">
                {!answerLocked && openCount < MAX_OPEN && (
                  <button
                    type="button"
                    onClick={askQuestion}
                    className="inline-flex h-14 flex-1 items-center justify-center gap-1.5 rounded-2xl bg-brand-blue font-poppins text-sm font-black uppercase tracking-wide text-white active:scale-[0.98]"
                  >
                    {t('Answer · open zone {n}', { n: openCount + 1 })}
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => setBeat('shoot')}
                  className="inline-flex h-14 flex-1 items-center justify-center gap-1.5 rounded-2xl bg-brand-green font-poppins text-sm font-black uppercase tracking-wide text-white active:scale-[0.98]"
                >
                  {t('Shoot · {pot} → {next}', { pot: fmt(pot), next: fmt(potential) })}
                </button>
              </div>
              <p className="font-poppins text-[11px] font-semibold text-white/45">
                {answerLocked
                  ? t('Answering is locked this attack — take the shot.')
                  : t('More open zones = better odds of keeping the run alive.')}
              </p>
            </motion.div>
          )}

          {beat === 'question' && (
            <motion.div key={`q-${qIndex}`} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="rounded-2xl border border-white/15 bg-brand-blue p-3">
              <div className="mb-1.5 flex items-center justify-between font-poppins text-[10px] font-black uppercase tracking-wider text-white/80">
                <span>{t('Attack {n}', { n: attack + 1 })}</span>
                <span className={qLeft <= 1.5 && selected === null ? 'text-brand-red' : 'text-brand-yellow'}>
                  {selected === null ? t('{n}s', { n: Math.max(0, Math.ceil(qLeft)) }) : t('Opening the goal…')}
                </span>
              </div>
              <div className="mb-2 h-1 overflow-hidden rounded-full bg-white/15">
                <div
                  key={qIndex}
                  className={`h-full origin-left rounded-full ${qLeft <= 1.5 && selected === null ? 'bg-brand-red' : 'bg-brand-yellow'}`}
                  style={{
                    transform: 'scaleX(1)',
                    animation: `ft-q-timer ${QUESTION_S}s linear forwards`,
                    animationPlayState: selected === null ? 'running' : 'paused',
                  }}
                />
              </div>
              <p className="mb-2 font-poppins text-sm font-bold leading-snug text-white">{question.q}</p>
              <div className="grid grid-cols-1 gap-1.5">
                {question.options.map((opt, i) => {
                  const locked = selected !== null;
                  const isCorrect = i === question.answer;
                  const isPickedWrong = locked && selected === i && !isCorrect;
                  const isFiller = locked && !isCorrect && !isPickedWrong;
                  return (
                    <button
                      key={i}
                      type="button"
                      disabled={locked}
                      onClick={() => answer(i)}
                      className={`flex items-center justify-between rounded-xl border-2 px-3.5 py-2 text-left font-poppins text-sm font-bold transition-[filter,opacity,transform] duration-300 ${
                        !locked
                          ? 'border-brand-yellow/70 bg-transparent text-white shadow-[0_0_6px_1px_rgba(255,229,0,0.12)] hover:border-brand-yellow'
                          : isCorrect
                            ? 'border-brand-green bg-brand-green text-black shadow-[0_0_22px_rgba(88,204,2,0.45)]'
                            : isPickedWrong
                              ? 'border-brand-red bg-brand-red/25 text-white'
                              : 'border-white/10 bg-black/20 text-white/35'
                      }`}
                      style={isFiller ? { filter: 'blur(2px)', opacity: 0.45 } : undefined}
                    >
                      <span>{opt}</span>
                      {locked && isCorrect && <Check className="size-5 shrink-0 text-black" />}
                      {isPickedWrong && <X className="size-5 shrink-0 text-brand-red" />}
                    </button>
                  );
                })}
              </div>
              {selected !== null && (
                <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="mt-2 text-center font-poppins text-[10px] font-bold uppercase tracking-wide text-white/50">
                  {selected === -1
                    ? t("Time's up — the goal slams back to {n} zones", { n: MIN_OPEN })
                    : selected === question.answer
                      ? t('{pct}% answered correctly', { pct: pulse.answered })
                      : t('Wrong — the goal slams back to {n} zones', { n: MIN_OPEN })}
                </motion.p>
              )}
              <style>{`@keyframes ft-q-timer { from { transform: scaleX(1); } to { transform: scaleX(0); } }`}</style>
            </motion.div>
          )}

          {beat === 'shoot' && (
            <motion.div key="shoot" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="space-y-2 text-center">
              <motion.div
                initial={{ scale: 0.7, opacity: 0, rotate: -3 }}
                animate={{ scale: 1, opacity: 1, rotate: 0 }}
                transition={{ type: 'spring', stiffness: 320, damping: 16 }}
                className="mx-auto inline-flex items-center gap-2 rounded-full bg-brand-green/15 px-4 py-2 font-poppins text-sm font-black uppercase text-brand-green"
              >
                <Eye className="size-4" /> {t('{k} zones open — one hides the keeper', { k: openCount })}
              </motion.div>
              <p className="font-poppins text-xs font-bold uppercase tracking-wide text-white/60">
                {t('Pick your shot zone')} · {t('{pct}% goal', { pct: goalPct })} · {fmt(pot)} → {fmt(potential)} <CoinIcon size={14} />
              </p>
            </motion.div>
          )}

          {beat === 'goal' && (
            <motion.div key="goal" initial={{ opacity: 0, scale: 0.94 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }} className="space-y-3 text-center">
              <motion.div
                initial={{ scale: 2.2, opacity: 0, rotate: -6 }}
                animate={{ scale: 1, opacity: 1, rotate: 0 }}
                transition={{ type: 'spring', stiffness: 300, damping: 14 }}
                className="font-poppins text-3xl font-black uppercase text-brand-green drop-shadow-[0_0_18px_rgba(88,204,2,0.5)]"
              >
                {t('GOAL!')}
              </motion.div>
              <div className="flex flex-wrap items-center justify-center gap-2 font-poppins text-[10px] font-bold uppercase tracking-wide text-white/50">
                <span>{t('{pct}% scored', { pct: pulse.scored })}</span>
                <span>·</span>
                <span>{t('{pct}% cashed out', { pct: pulse.cashed })}</span>
                <span>·</span>
                <span className="text-brand-orange">🔥 {t('{n} going NEXT ATTACK', { n: pulse.going.toLocaleString() })}</span>
              </div>
              <div className="flex gap-2">
                <motion.button
                  type="button"
                  onClick={cashOut}
                  animate={{ scale: [1, 1.03, 1] }}
                  transition={{ duration: 1.4, repeat: Infinity, ease: 'easeInOut' }}
                  className="inline-flex h-14 flex-1 items-center justify-center gap-1.5 rounded-2xl bg-brand-yellow font-poppins text-base font-black uppercase tracking-wide text-black active:scale-[0.98]"
                >
                  <span>{t('TAKE {amount}', { amount: fmt(pot) })}</span>
                  <span className="inline-flex shrink-0 items-center">
                    <CoinIcon size={16} />
                  </span>
                </motion.button>
                <button
                  type="button"
                  onClick={nextAttack}
                  className="h-14 flex-1 rounded-2xl bg-brand-green font-poppins text-base font-black uppercase tracking-wide text-white active:scale-[0.98]"
                >
                  {t('NEXT ATTACK')} ⚽
                </button>
              </div>
              <p className="font-poppins text-[11px] font-semibold text-white/45">
                {t('Next attack risks the whole pot — the goal resets to {n} zones.', { n: MIN_OPEN })}
              </p>
            </motion.div>
          )}

          {beat === 'saved' && (
            <motion.div key="saved" initial={{ opacity: 0, scale: 0.94 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }} className="space-y-3 text-center">
              <motion.div
                initial={{ scale: 1.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ type: 'spring', stiffness: 300, damping: 15 }}
                className="font-poppins text-3xl font-black uppercase text-brand-red drop-shadow-[0_0_18px_rgba(255,75,75,0.45)]"
              >
                {t('SAVED!')}
              </motion.div>
              <p className="font-poppins text-xs font-semibold text-white/55">{t('The keeper read it — pot lost.')}</p>
              <button
                type="button"
                onClick={() => setBeat('bet')}
                className="h-14 w-full rounded-2xl bg-brand-green font-poppins text-lg font-black uppercase tracking-wide text-white active:scale-[0.98]"
              >
                {t('New round')}
              </button>
            </motion.div>
          )}

          {beat === 'cashed' && (
            <motion.div key="cashed" initial={{ opacity: 0, scale: 0.94 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }} className="relative space-y-3 text-center">
              <motion.div
                initial={{ scale: 0.6, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ type: 'spring', stiffness: 320, damping: 15 }}
                className="inline-flex items-center gap-1.5 font-poppins text-3xl font-black text-brand-gold drop-shadow-[0_0_18px_rgba(255,215,0,0.4)]"
              >
                <MoneyStack count={4} /> +{fmt(lastTake ?? 0)}
              </motion.div>
              <button
                type="button"
                onClick={() => setBeat('bet')}
                className="h-14 w-full rounded-2xl bg-brand-green font-poppins text-lg font-black uppercase tracking-wide text-white active:scale-[0.98]"
              >
                {t('New round')}
              </button>
            </motion.div>
          )}

          {beat === 'resolving' && <motion.div key="resolving" className="h-14" />}
        </AnimatePresence>
      </div>
        </div>

        <div className="mt-4 lg:sticky lg:top-4 lg:mt-1">
          <StadiumBoard t={t} bestRun={bestRun} />
          <div className="mt-4 hidden lg:block">{renderHud(true)}</div>
        </div>
      </div>
      <ResultSplash {...splashProps} />
      <MoneyFlight flight={flight} />
    </MiniGameShell>
  );
}

/** Longest-runs leaderboard styled like the Betsson event leaderboard:
 *  orange border, orange #1 row, tilted "Powered by" badge. Flavour rows +
 *  the player's own best run. */
function StadiumBoard({ t, bestRun }: { t: (k: string, v?: Record<string, string | number>) => string; bestRun: number | null }) {
  const rows: Array<{ name: string; mult: number; you?: boolean }> = [
    { name: 'თაზო10', mult: 18.31 },
    { name: 'გიორგი7', mult: 14.66 },
    { name: 'ნიკა77', mult: 9.16 },
    { name: 'საბა_fc', mult: 5.72 },
  ];
  if (bestRun != null && bestRun > 1) rows.push({ name: t('You'), mult: bestRun, you: true });
  rows.sort((a, b) => b.mult - a.mult);

  return (
    <div className="relative mt-2">
      {/* Betsson badge — same treatment as the event leaderboard. */}
      <div
        className="absolute -top-1 -right-2 z-20 flex flex-col items-start rounded-md px-2 py-1"
        style={{ backgroundColor: '#FF6C0A', width: 120, height: 34, rotate: '-5.8deg', border: '2px solid #000', boxShadow: '0 4px 12px rgba(0,0,0,0.4)' }}
      >
        <span className="text-[6px] font-bold uppercase tracking-wider text-white/80 leading-none">Powered by</span>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/assets/betsson/3.png" alt="Betsson Sport" width={96} height={18} className="mt-0.5 h-4 w-auto object-contain" />
      </div>

      <div className="mb-2 flex items-center gap-1.5 px-1 font-poppins text-[10px] font-black uppercase tracking-wider text-white/60">
        <Trophy className="size-3.5 text-brand-orange-event" /> {t('Longest runs today')}
      </div>
      <div className="overflow-hidden rounded-[10px] border-2" style={{ borderColor: '#FF6C0A' }}>
        <div className="divide-y divide-white/5">
          {rows.slice(0, 5).map((r, i) => (
            <div
              key={r.name}
              className={`flex items-center justify-between px-3 py-2.5 font-poppins text-sm font-bold ${
                i === 0 ? 'text-white' : r.you ? 'bg-brand-green text-white' : 'text-white/70 hover:bg-white/[0.03]'
              }`}
              style={i === 0 ? { backgroundColor: '#FF6C0A' } : undefined}
            >
              <span className="flex items-center gap-2.5">
                <span className="text-lg font-black tabular-nums">#{i + 1}</span>
                {r.name}
              </span>
              <span className="text-base font-black tabular-nums">{r.mult.toFixed(2)}x</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

const CONFETTI = ['#58CC02', '#FFE500', '#1CB0F6', '#FF9600', '#CE82FF', '#FFD700'];

function FinalThirdGoal({
  picking,
  revealedSave,
  scouting,
  shotZone,
  resolving,
  settled,
  scored,
  onPick,
}: {
  picking: boolean;
  revealedSave: string | null;
  scouting: boolean;
  shotZone: Zone | null;
  resolving: boolean;
  settled: boolean;
  scored: boolean | null;
  onPick: (z: Zone) => void;
}) {
  const inFlight = resolving || (settled && !!shotZone);
  const isSave = settled && scored === false;
  const showGoalFx = settled && scored === true;
  const dest = shotZone;
  const peakX = dest ? 50 + (dest.x - 50) * 0.45 : 50;
  const peakY = dest ? Math.min(dest.y, 70) - 16 : 50;

  return (
    <div className="relative mx-auto aspect-[16/9] w-full overflow-hidden rounded-[24px] border border-white/10 bg-white/5 shadow-[inset_0_1px_0_rgba(255,255,255,0.1)] backdrop-blur-md">
      {/* Stadium atmosphere: floodlight beams + crowd band + pitch wash */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{
          backgroundImage: [
            'radial-gradient(60% 42% at 18% 0%, rgba(255,255,255,0.10), transparent 70%)',
            'radial-gradient(60% 42% at 82% 0%, rgba(255,255,255,0.10), transparent 70%)',
            'linear-gradient(180deg, rgba(6,10,22,0.55) 0%, rgba(6,10,22,0.15) 22%, transparent 34%)',
            'radial-gradient(110% 70% at 50% 8%, rgba(88,204,2,0.16), transparent 62%)',
            'linear-gradient(180deg, rgba(56,182,14,0.06), rgba(8,24,14,0.16))',
            'repeating-linear-gradient(90deg, rgba(56,182,14,0.08) 0 28px, rgba(56,182,14,0.02) 28px 56px)',
          ].join(', '),
        }}
      />
      {/* Crowd dots band */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 h-[12%] opacity-40"
        style={{
          backgroundImage:
            'radial-gradient(circle at 4px 4px, rgba(255,255,255,0.35) 1.1px, transparent 1.4px)',
          backgroundSize: '11px 8px',
        }}
      />

      <svg className="pointer-events-none absolute inset-0 h-full w-full" viewBox="0 0 400 225" preserveAspectRatio="none" aria-hidden>
        <defs>
          <pattern id="ft-net" width="14" height="14" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
            <path d="M0 0h14M0 0v14" stroke="rgba(255,255,255,0.28)" strokeWidth="0.7" />
          </pattern>
          <linearGradient id="ft-post" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="#d6d6d6" />
            <stop offset="45%" stopColor="#ffffff" />
            <stop offset="100%" stopColor="#b8b8b8" />
          </linearGradient>
        </defs>
        <path d="M78 210 V168 H322 V210" fill="none" stroke="rgba(255,255,255,0.28)" strokeWidth="1.6" />
        <circle cx="200" cy="204" r="3.2" fill="rgba(255,255,255,0.55)" />
        {/* side netting depth */}
        <path d="M42 18 L58 30 V140 L42 148 Z" fill="url(#ft-net)" opacity="0.45" />
        <path d="M358 18 L342 30 V140 L358 148 Z" fill="url(#ft-net)" opacity="0.45" />
        <path d="M42 18 H358 V148 H42 Z" fill="url(#ft-net)" opacity="0.9" />
        <rect x="36" y="12" width="10" height="140" rx="2" fill="url(#ft-post)" />
        <rect x="354" y="12" width="10" height="140" rx="2" fill="url(#ft-post)" />
        <rect x="36" y="8" width="328" height="10" rx="2" fill="url(#ft-post)" />
        <path d="M46 152 H354" stroke="rgba(255,255,255,0.45)" strokeWidth="1.4" />
      </svg>

      {/* VAR sweep on scout */}
      <AnimatePresence>
        {scouting && (
          <motion.div
            key="var-sweep"
            className="pointer-events-none absolute inset-y-[4%] z-30 w-10"
            initial={{ left: '-12%', opacity: 0 }}
            animate={{ left: ['-12%', '104%'], opacity: [0, 0.9, 0] }}
            transition={{ duration: 0.9, ease: 'easeInOut' }}
            style={{
              background:
                'linear-gradient(90deg, transparent, rgba(88,204,2,0.5), rgba(255,255,255,0.65), rgba(88,204,2,0.5), transparent)',
            }}
          />
        )}
      </AnimatePresence>

      {/* Outcome washes */}
      <AnimatePresence>
        {showGoalFx && (
          <motion.div
            key="fx-goal"
            className="pointer-events-none absolute inset-0"
            initial={{ opacity: 0 }}
            animate={{ opacity: [0, 0.55, 0.18] }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.7 }}
            style={{ background: 'radial-gradient(circle at 50% 42%, rgba(88,204,2,0.45), transparent 62%)' }}
          />
        )}
        {isSave && (
          <motion.div
            key="fx-save"
            className="pointer-events-none absolute inset-0"
            initial={{ opacity: 0 }}
            animate={{ opacity: [0, 0.55, 0.18] }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.7 }}
            style={{ background: 'radial-gradient(circle at 50% 42%, rgba(255,75,75,0.4), transparent 62%)' }}
          />
        )}
      </AnimatePresence>

      {/* Confetti burst on goal */}
      <AnimatePresence>
        {showGoalFx && dest && (
          <motion.div key="confetti" className="pointer-events-none absolute inset-0 z-30" initial={false} exit={{ opacity: 0 }}>
            {CONFETTI.map((c, i) => {
              const angle = (i / CONFETTI.length) * Math.PI * 2;
              return (
                <motion.span
                  key={c + i}
                  className="absolute size-2 rounded-[2px]"
                  style={{ left: `${dest.x}%`, top: `${dest.y}%`, backgroundColor: c }}
                  initial={{ x: 0, y: 0, opacity: 1, rotate: 0, scale: 1 }}
                  animate={{
                    x: Math.cos(angle) * (46 + (i % 3) * 18),
                    y: Math.sin(angle) * (34 + (i % 3) * 14) + 30,
                    opacity: 0,
                    rotate: 200 + i * 40,
                    scale: 0.6,
                  }}
                  transition={{ duration: 0.9, ease: 'easeOut' }}
                />
              );
            })}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Zones */}
      {(picking || revealedSave) &&
        ZONES.map((z) => {
          const locked = z.id === revealedSave;
          if (!picking && !locked) return null;
          return (
            <motion.button
              key={z.id}
              type="button"
              disabled={locked || !picking}
              onClick={() => onPick(z)}
              aria-label={locked ? 'Locked save zone' : `Zone ${z.id}`}
              initial={{ opacity: 0, scale: 0.7 }}
              animate={locked ? { opacity: 1, scale: [1.3, 1] } : { opacity: 1, scale: [1, 1.08, 1] }}
              transition={locked ? { duration: 0.35, ease: 'easeOut' } : { scale: { duration: 1.6, repeat: Infinity, ease: 'easeInOut' } }}
              className={`group absolute z-20 size-10 -translate-x-1/2 -translate-y-1/2 rounded-full border sm:size-11 ${
                locked
                  ? 'cursor-not-allowed border-brand-red/70 bg-brand-red/25 shadow-[0_0_14px_2px_rgba(255,75,75,0.35)]'
                  : 'border-white/40 bg-white/10 transition-colors hover:border-brand-yellow hover:bg-brand-yellow/25 hover:shadow-[0_0_14px_2px_rgba(255,229,0,0.3)]'
              }`}
              style={{ left: `${z.x}%`, top: `${z.y}%` }}
            >
              {locked ? (
                <span className="pointer-events-none absolute inset-0 flex items-center justify-center">
                  <span className="scale-[0.55]"><KeeperGlove /></span>
                </span>
              ) : (
                <>
                  <span className="pointer-events-none absolute inset-[6px] rounded-full border border-white/45 group-hover:border-brand-yellow" />
                  <span className="pointer-events-none absolute left-1/2 top-2 bottom-2 w-px -translate-x-1/2 bg-white/50 group-hover:bg-brand-yellow" />
                  <span className="pointer-events-none absolute top-1/2 left-2 right-2 h-px -translate-y-1/2 bg-white/50 group-hover:bg-brand-yellow" />
                </>
              )}
            </motion.button>
          );
        })}

      {/* Keeper — dives to the shot on a save, wrong way on a goal */}
      <motion.div
        className="pointer-events-none absolute z-10 -translate-x-1/2 -translate-y-1/2"
        initial={false}
        animate={
          dest && inFlight && isSave
            ? { left: `${dest.x}%`, top: `${dest.y}%`, rotate: dest.x < 40 ? -58 : dest.x > 60 ? 58 : 22, scale: 1.16 }
            : dest && inFlight
              ? { left: `${100 - dest.x}%`, top: '42%', rotate: dest.x < 50 ? 45 : -45, scale: 1.05 }
              : { left: '50%', top: '40%', rotate: 0, scale: 1 }
        }
        transition={inFlight ? { type: 'spring', stiffness: 380, damping: 14, mass: 0.7 } : { duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
      >
        <motion.div
          animate={inFlight ? { y: 0 } : { y: [0, -3, 0] }}
          transition={inFlight ? { duration: 0.2 } : { duration: 1.8, repeat: Infinity, ease: 'easeInOut' }}
        >
          <KeeperGlove />
        </motion.div>
      </motion.div>

      {/* Ball with flight trail */}
      {dest && resolving && (
        <motion.div
          className="pointer-events-none absolute z-[15] -translate-x-1/2 -translate-y-1/2"
          initial={{ left: '50%', top: '88%', opacity: 0.5 }}
          animate={{ left: [`50%`, `${peakX}%`, `${dest.x}%`], top: ['88%', `${peakY}%`, `${dest.y}%`], opacity: [0.4, 0.25, 0] }}
          transition={{ duration: 0.72, ease: [0.18, 0.7, 0.28, 1], times: [0, 0.45, 1], delay: 0.06 }}
        >
          <span className="block size-7 rounded-full bg-white/40 blur-[6px]" />
        </motion.div>
      )}
      <motion.div
        className="pointer-events-none absolute z-20 -translate-x-1/2 -translate-y-1/2"
        initial={false}
        animate={
          dest && inFlight
            ? resolving
              ? { left: ['50%', `${peakX}%`, `${dest.x}%`], top: ['88%', `${peakY}%`, `${dest.y}%`], scale: [1, 0.88, 0.7], rotate: [0, 220, 420] }
              : { left: `${dest.x}%`, top: `${isSave ? dest.y + 10 : dest.y}%`, scale: isSave ? 0.82 : 0.62, rotate: isSave ? 480 : 520 }
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
