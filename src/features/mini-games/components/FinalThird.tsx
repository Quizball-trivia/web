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
import { Check, Radio, Trophy, Volume2, VolumeX, X } from 'lucide-react';
import { MiniGameShell } from './MiniGameShell';
import { KeeperGlove } from './PenaltyShootout';
import { getTrivia, type TriviaQuestion } from '../data/trivia';
import { useMiniLocale, useMiniT } from '../lib/i18n';
import { getSoundLevels, playCash, playKick, setCrowdLevel, setCrowdMood, setSfxLevel, startCrowd, stopCrowd } from '../lib/crowdAudio';
import { CoinIcon } from '@/features/store/components/CoinIcon';
import { ResultSplash } from '@/features/daily/components/ResultSplash';
import { useResultSplash } from '@/features/daily/components/useResultSplash';
import { useQueryClient } from '@tanstack/react-query';
import { useStoreWallet } from '@/lib/queries/store.queries';
import { queryKeys } from '@/lib/queries/queryKeys';
import {
  freeKicksApi,
  FreeKicksApiError,
  type FreeKicksState,
  type FreeKicksZone,
} from '@/lib/repositories/freeKicks.repo';

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
/** Live mode mirrors the server's basis-point math exactly: floor(pot·bp/10000). */
const STATE_MULT_BP: Record<number, number> = { 2: 18600, 3: 14200, 4: 12800, 5: 12100, 6: 11800 };
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

export function FinalThird({ backHref, live = false }: { backHref?: string; live?: boolean } = {}) {
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

  // ── Live (real-coins) mode ──
  const queryClient = useQueryClient();
  const { data: wallet, isError: walletError, refetch: refetchWallet } = useStoreWallet();
  const liveStateRef = useRef<FreeKicksState | null>(null);
  const [liveQuestion, setLiveQuestion] = useState<{
    id: string;
    q: string;
    options: string[];
    optionIds: string[];
    answer: number;
    deadlineLocalMs: number;
    windowS: number;
  } | null>(null);
  const liveBusyRef = useRef(false);
  // Bumped by every applied mutation; an in-flight GET current whose sequence
  // is stale must not overwrite the newer state it lost the race to.
  const liveSeqRef = useRef(0);
  // Idempotency nonces survive retries — a re-click after an indeterminate
  // response must dedupe server-side, not double-debit.
  const startNonceRef = useRef<string | null>(null);
  const nextNonceRef = useRef<string | null>(null);
  const [liveZones, setLiveZones] = useState<FreeKicksZone[] | null>(null);
  // Block staking until the mount-time resume has resolved: starting while the
  // resume GET is in flight can hide a freshly debited round behind a stale null.
  const [resumed, setResumed] = useState(!live);
  const [liveError, setLiveError] = useState<string | null>(null);
  const [liveStats, setLiveStats] = useState<{
    topRuns: Array<{ name: string; mult: number }>;
  } | null>(null);

  const applyLiveState = (state: FreeKicksState) => {
    const prev = liveStateRef.current;
    // Reject regressions: a late response for the same round must never roll
    // the version (and with it pot/zones) backwards.
    if (prev && prev.round_id === state.round_id && state.state_version < prev.state_version) return;
    liveSeqRef.current += 1;
    liveStateRef.current = state;
    setPot(state.pot_coins);
    setRoundStake(state.stake_coins);
    setAttack(state.attack);
    setOpenCount(state.open_count);
    setLiveZones(state.open_zones);
    setAnswerLocked(state.answer_locked);
  };

  const syncLiveQuestion = (state: FreeKicksState) => {
    if (!state.question) {
      setLiveQuestion(null);
      return;
    }
    // Skew from server_now ignores response transit time, so pad conservatively:
    // the UI must expire before the server does, never after.
    const skewMs = Date.parse(state.server_now) - Date.now();
    const deadlineLocalMs = Date.parse(state.question.deadline_at) - skewMs - 300;
    const windowS = Math.max(0.5, (deadlineLocalMs - Date.now()) / 1000);
    setLiveQuestion({
      id: state.question.question_id,
      q: state.question.prompt[miniLocale] ?? state.question.prompt.en,
      options: state.question.options.map((option) => option.text[miniLocale] ?? option.text.en),
      optionIds: state.question.options.map((option) => option.id),
      answer: -1,
      deadlineLocalMs,
      windowS,
    });
    setQLeft(windowS);
  };

  const settleLocalRound = (state: FreeKicksState | null) => {
    liveStateRef.current = null;
    setLiveQuestion(null);
    if (state?.status === 'cashed' && state.payout_coins != null) setLastTake(state.payout_coins);
    void queryClient.invalidateQueries({ queryKey: queryKeys.store.wallet() });
    setBeat('bet');
  };

  const resyncLive = async () => {
    const seq = liveSeqRef.current;
    let state: FreeKicksState | null;
    try {
      state = await freeKicksApi.current();
    } catch {
      // Transport/auth failure is NOT "no round" — keep the current screen and
      // let the next action or heartbeat retry, instead of hiding a live pot.
      if (seq === liveSeqRef.current) setLiveError('Connection error — retrying');
      setResumed(true);
      return;
    }
    // A mutation applied while this GET was in flight: its result is newer.
    if (seq !== liveSeqRef.current) {
      setResumed(true);
      return;
    }
    setLiveError(null);
    setResumed(true);
    if (!state || state.status !== 'active') {
      settleLocalRound(state);
      return;
    }
    applyLiveState(state);
    if (state.phase === 'question' && state.question) {
      syncLiveQuestion(state);
      selectedRef.current = null;
      setSelected(null);
      setBeat('question');
    } else if (state.phase === 'post_goal') {
      setScored(true);
      setBeat('goal');
    } else {
      setBeat('decide');
    }
  };

  // A nonce identifies one intent; keep it only for failures where the server
  // may have committed (network/timeout/5xx) so the retry dedupes. A definite
  // rejection (4xx) means nothing committed — the next attempt is a new intent.
  const dropNonceUnlessRetryable = (ref: { current: string | null }, error: unknown) => {
    if (error instanceof FreeKicksApiError && error.status < 500) ref.current = null;
  };

  const handleLiveError = (error: unknown) => {
    if (error instanceof FreeKicksApiError) {
      setLiveError(error.message);
    } else {
      setLiveError('Connection error — retrying');
    }
    // Always reconcile with the server: a transport error can hide a mutation
    // that committed (debit, cashout, shot), and 409 means we are stale.
    void resyncLive();
  };

  // ── Fake stadium: live-wins ticker + drifting player count. Demo only —
  // live mode polls /free-kicks/stats instead.
  useEffect(() => {
    if (live) return;
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
  }, [live]);

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

  // Live: resume an in-flight round on mount (server is the source of truth).
  useEffect(() => {
    if (!live) return;
    void resyncLive();
    // resyncLive is stable per-mount; run once when live mode mounts.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Live: heartbeat while a round is active so the sweeper knows we're here.
  // The interval is mounted once (beat transitions must not keep resetting it
  // below its own period); the active check happens inside the tick. A 404
  // means the sweeper already settled the round — resync instead of showing a
  // pot that no longer exists.
  useEffect(() => {
    if (!live) return;
    const id = window.setInterval(() => {
      if (liveStateRef.current?.status !== 'active') return;
      void freeKicksApi.heartbeat().catch((error) => {
        if (error instanceof FreeKicksApiError && error.status === 404) void resyncLive();
      });
    }, 10_000);
    return () => window.clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [live]);

  // Live: the social strip and leaderboard poll REAL numbers.
  useEffect(() => {
    if (!live) return;
    let cancelled = false;
    const poll = async () => {
      const stats = await freeKicksApi.stats().catch(() => null);
      if (!stats || cancelled) return;
      setPlayingNow(stats.playing_now);
      setTicker(
        stats.recent_wins.slice(0, 4).map((win, index) => ({
          id: (tickerId.current += 1) + index,
          name: win.nickname,
          amount: win.amount,
          mult: win.run_mult,
          minutesAgo: Math.max(0, Math.round((Date.now() - Date.parse(win.settled_at)) / 60_000)),
        }))
      );
      setLiveStats({
        topRuns: stats.top_runs.map((run) => ({ name: run.nickname, mult: run.run_mult })),
      });
    };
    void poll();
    const id = window.setInterval(() => void poll(), 10_000);
    return () => {
      cancelled = true;
      window.clearInterval(id);
    };
  }, [live]);

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
    const deadlineMs = live && liveQuestion ? liveQuestion.deadlineLocalMs : started + QUESTION_S * 1000;
    const windowS = live && liveQuestion ? liveQuestion.windowS : QUESTION_S;
    const tick = window.setInterval(() => {
      setQLeft(Math.min(windowS, Math.max(0, (deadlineMs - Date.now()) / 1000)));
    }, 100);
    const to = window.setTimeout(() => {
      if (selectedRef.current !== null) return;
      selectedRef.current = -1;
      setSelected(-1);
      fire('wrong', 'right');
      if (live) {
        // Never submit a fake pick on timeout: the request could land before
        // the server deadline and be scored as a real answer. Just wait out
        // the reveal, then resync — the server resolves the expired question
        // itself (zones slam to 2, answering locks) on the next read.
        later(() => {
          setLastAnswer('reset');
          setLiveQuestion(null);
          void resyncLive();
        }, ANSWER_HOLD_MS);
        return;
      }
      later(() => {
        setLastAnswer('reset');
        setOpenCount(MIN_OPEN);
        setAnswerLocked(true);
        setBeat('decide');
      }, ANSWER_HOLD_MS);
    }, Math.max(0, deadlineMs - started));
    return () => {
      window.clearInterval(tick);
      window.clearTimeout(to);
    };
    // Restart only when a new question is dealt.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [beat, qIndex, liveQuestion?.id]);

  const demoQuestion: TriviaQuestion = trivia[qIndex % trivia.length];
  const effectiveBalance = live ? (wallet?.coins ?? 0) : balance;
  const question: TriviaQuestion = live && liveQuestion
    ? { id: liveQuestion.id, q: liveQuestion.q, options: liveQuestion.options, answer: liveQuestion.answer, difficulty: 'medium' }
    : demoQuestion;
  const mult = STATE_MULTS[openCount];
  const goalPct = Math.round(((openCount - 1) / openCount) * 100);
  // Live: the server's open_zones are authoritative (zone order may change
  // server-side); the demo derives them from the fixed unlock order.
  const openIds = useMemo(
    () => (live && liveZones ? (liveZones as readonly string[]) : (OPEN_ORDER.slice(0, openCount) as readonly string[])),
    [live, liveZones, openCount],
  );
  // Live payouts are integer coins floored in basis points — mirror that math
  // exactly so the quoted "pot → next" equals what the server will credit.
  const potential = useMemo(
    () => (live ? Math.floor((pot * STATE_MULT_BP[openCount]) / 10_000) : Math.round(pot * mult * 100) / 100),
    [live, pot, openCount, mult],
  );
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
    if (live) {
      const state = liveStateRef.current;
      if (!state || liveBusyRef.current) return;
      liveBusyRef.current = true;
      setLiveError(null);
      freeKicksApi
        .deal(state.state_version)
        .then((next) => {
          applyLiveState(next);
          syncLiveQuestion(next);
          selectedRef.current = null;
          setSelected(null);
          setBeat('question');
        })
        .catch(handleLiveError)
        .finally(() => {
          liveBusyRef.current = false;
        });
      return;
    }
    selectedRef.current = null;
    setSelected(null);
    setQIndex((q) => q + 1);
    setQLeft(QUESTION_S);
    setBeat('question');
  };

  const startRound = () => {
    if (live) {
      if (liveBusyRef.current || !resumed || !wallet) return;
      liveBusyRef.current = true;
      setLiveError(null);
      startCrowd();
      // Reuse the nonce across retries: if the first attempt debited but the
      // response was lost, the retry must dedupe, not stake twice.
      const nonce = startNonceRef.current ?? (startNonceRef.current = crypto.randomUUID());
      freeKicksApi
        .start(stake, nonce)
        .then((state) => {
          startNonceRef.current = null;
          applyLiveState(state);
          setLastTake(null);
          selectedRef.current = null;
          setSelected(null);
          setShotZone(null);
          setScored(null);
          setKeeperZone(null);
          setLastAnswer(null);
          void queryClient.invalidateQueries({ queryKey: queryKeys.store.wallet() });
          setBeat('decide');
        })
        .catch((error) => {
          dropNonceUnlessRetryable(startNonceRef, error);
          handleLiveError(error);
        })
        .finally(() => {
          liveBusyRef.current = false;
        });
      return;
    }
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

  // A pending start nonce is bound to the stake it was created for.
  useEffect(() => {
    startNonceRef.current = null;
  }, [stake]);

  const answer = (i: number) => {
    if (selectedRef.current !== null) return;
    if (live) {
      const state = liveStateRef.current;
      if (!state || !liveQuestion) return;
      selectedRef.current = i;
      setSelected(i);
      freeKicksApi
        .answer(liveQuestion.id, liveQuestion.optionIds[i], state.state_version)
        .then((result) => {
          const correct = result.outcome === 'correct';
          // Reveal: mark the server's correct option in the rendered question.
          const correctIndex = liveQuestion.optionIds.indexOf(result.correct_option_id);
          setLiveQuestion((current) => (current ? { ...current, answer: correctIndex } : current));
          if (result.outcome === 'late') {
            // The server rejected the answer as late — even a correct pick must
            // not light up green, only the reveal.
            selectedRef.current = -1;
            setSelected(-1);
          }
          applyLiveState(result.state);
          fire(correct ? 'correct' : 'wrong', i % 2 === 0 ? 'left' : 'right');
          later(() => {
            setLiveQuestion(null);
            if (correct) {
              setLastAnswer('up');
              setBeat(result.state.open_count >= MAX_OPEN ? 'shoot' : 'decide');
            } else {
              setLastAnswer('reset');
              setBeat('decide');
            }
          }, ANSWER_HOLD_MS);
        })
        .catch((error) => {
          // Keep the selection locked: the request may have committed
          // server-side, and resync (via handleLiveError) will settle which.
          handleLiveError(error);
        });
      return;
    }
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

  const resolveShot = (zone: Zone, keeper: string, isSave: boolean, potAfter: number, onSettle?: () => void) => {
    setKeeperZone(keeper);
    setShotZone(zone);
    setBeat('resolving');
    later(() => playKick(), USE_3D_PITCH ? 430 : 90);
    // Give a saved shot enough time to read as contact, gather, and landing.
    later(() => {
      if (isSave) {
        setScored(false);
        setBeat('saved');
      } else {
        setScored(true);
        setPot(potAfter);
        setBestRun((b) => Math.max(b ?? 0, Math.round((potAfter / roundStake) * 100) / 100));
        setBeat('goal');
      }
      onSettle?.();
    }, USE_3D_PITCH ? (isSave ? 1850 : 1450) : 880);
  };

  const shoot = (zone: Zone) => {
    if (beat !== 'shoot' || shotZone) return;
    if (!openIds.includes(zone.id)) return;
    if (live) {
      const state = liveStateRef.current;
      if (!state || liveBusyRef.current) return;
      liveBusyRef.current = true;
      setLiveError(null);
      freeKicksApi
        .shoot(zone.id as FreeKicksZone, state.state_version)
        .then((result) => {
          // Track the authoritative state immediately (version, settlement) but
          // hold the visible HUD fields back until the animation lands — the
          // pot dropping to 0 mid-flight would spoil the save.
          const next = result.state;
          liveSeqRef.current += 1;
          liveStateRef.current = next;
          resolveShot(zone, result.keeper_zone, !result.scored, next.pot_coins, () => {
            setPot(next.pot_coins);
            setRoundStake(next.stake_coins);
            setAttack(next.attack);
            setOpenCount(next.open_count);
            setLiveZones(next.open_zones);
            setAnswerLocked(next.answer_locked);
          });
        })
        .catch(handleLiveError)
        .finally(() => {
          liveBusyRef.current = false;
        });
      return;
    }
    // Demo: the keeper commits to one of the open zones the moment the ball is
    // struck — exactly 1/k save chance, independent of the player's pick.
    const keeper = openIds[Math.floor(Math.random() * openIds.length)];
    resolveShot(zone, keeper, zone.id === keeper, potential);
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
    // Live: nothing (flight, "Cashed out X") may be shown before the server
    // confirms — and the amount is the server's payout, not the local pot.
    if (live && (!liveStateRef.current || liveBusyRef.current)) return;
    const rect = event.currentTarget.getBoundingClientRect();
    const stack = document.querySelector('[data-money-stack]')?.getBoundingClientRect();
    const launchFlight = () => {
      setFlight({
        seed: pot * 17 + attack + 3,
        ox: rect.left + rect.width / 2,
        oy: rect.top + rect.height / 2,
        tx: stack ? stack.left + stack.width / 2 : rect.left + rect.width / 2,
        ty: stack ? stack.top + stack.height / 2 : 36,
      });
    };
    if (live) {
      const state = liveStateRef.current!;
      liveBusyRef.current = true;
      setLiveError(null);
      freeKicksApi
        .cashout(state.state_version)
        .then((next) => {
          liveSeqRef.current += 1;
          liveStateRef.current = next;
          setLastTake(next.payout_coins ?? pot);
          // Refresh the shared wallet cache NOW — the delayed timers below are
          // purely visual and die with the component on navigation.
          void queryClient.invalidateQueries({ queryKey: queryKeys.store.wallet() });
          launchFlight();
          setBeat('cashed');
          later(() => setStackBump(true), 520);
          later(() => setStackBump(false), 980);
          later(() => setFlight(null), 1200);
        })
        .catch((error) => {
          setFlight(null);
          handleLiveError(error);
        })
        .finally(() => {
          liveBusyRef.current = false;
        });
      return;
    }
    launchFlight();
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
    if (live) {
      const state = liveStateRef.current;
      if (!state || liveBusyRef.current) return;
      liveBusyRef.current = true;
      setLiveError(null);
      const nonce = nextNonceRef.current ?? (nextNonceRef.current = crypto.randomUUID());
      freeKicksApi
        .nextAttack(state.state_version, nonce)
        .then((next) => {
          nextNonceRef.current = null;
          applyLiveState(next);
          selectedRef.current = null;
          setSelected(null);
          setShotZone(null);
          setScored(null);
          setKeeperZone(null);
          setLastAnswer(null);
          setBeat('decide');
        })
        .catch((error) => {
          dropNonceUnlessRetryable(nextNonceRef, error);
          handleLiveError(error);
        })
        .finally(() => {
          liveBusyRef.current = false;
        });
      return;
    }
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
              <AnimatedNumber value={effectiveBalance} decimals={Number.isInteger(effectiveBalance) ? 0 : 2} />
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

      {live && liveError && (
        <p className="mt-2 text-center font-poppins text-[11px] font-bold text-brand-red">{liveError}</p>
      )}

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
              {live && !wallet && walletError ? (
                <button
                  type="button"
                  onClick={() => void refetchWallet()}
                  className="mx-auto block rounded-xl border-2 border-white/20 px-4 py-2 text-center font-poppins text-sm font-bold text-white/70 hover:border-white/40"
                >
                  {t('Could not load balance — tap to retry')}
                </button>
              ) : live && (!wallet || !resumed) ? (
                <p className="text-center font-poppins text-sm font-bold text-white/60">{t('Loading…')}</p>
              ) : effectiveBalance >= MIN_STAKE ? (
                <>
                  {/* Stake picker: presets + free entry, min 5 */}
                  <div className="flex items-center justify-center gap-1.5">
                    {STAKE_PRESETS.map((p) => (
                      <button
                        key={p}
                        type="button"
                        onClick={() => applyStake(p)}
                        disabled={p > effectiveBalance}
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
                    disabled={stake < MIN_STAKE || stake > effectiveBalance}
                    className="h-14 w-full rounded-2xl bg-brand-green font-poppins text-lg font-black uppercase tracking-wide text-white shadow-[0_8px_24px_rgba(88,204,2,0.25)] active:scale-[0.98] disabled:opacity-40"
                  >
                    {t('Stake {n} & attack', { n: stake })}
                  </button>
                </>
              ) : (
                live ? (
                  <p className="text-center font-poppins text-sm font-bold text-white/60">
                    {t('Not enough coins — top up in the store')}
                  </p>
                ) : (
                <button
                  type="button"
                  onClick={() => setBalance(START_BALANCE)}
                  className="h-14 w-full rounded-2xl bg-brand-yellow font-poppins text-lg font-black uppercase tracking-wide text-black active:scale-[0.98]"
                >
                  {t('Top up (demo)')}
                </button>
                )
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
            <motion.div key={`q-${live && liveQuestion ? liveQuestion.id : qIndex}`} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="rounded-2xl border border-white/15 bg-brand-blue p-3">
              <div className="mb-1.5 flex items-center justify-between font-poppins text-[10px] font-black uppercase tracking-wider text-white/80">
                <span>{t('Attack {n}', { n: attack + 1 })}</span>
                <span className={qLeft <= 1.5 && selected === null ? 'text-brand-red' : 'text-brand-yellow'}>
                  {selected === null ? t('{n}s', { n: Math.max(0, Math.ceil(qLeft)) }) : t('Opening the goal…')}
                </span>
              </div>
              <div className="mb-2 h-1 overflow-hidden rounded-full bg-white/15">
                <div
                  key={live && liveQuestion ? liveQuestion.id : qIndex}
                  className={`h-full origin-left rounded-full ${qLeft <= 1.5 && selected === null ? 'bg-brand-red' : 'bg-brand-yellow'}`}
                  style={{
                    transform: 'scaleX(1)',
                    animation: `ft-q-timer ${live && liveQuestion ? liveQuestion.windowS : QUESTION_S}s linear forwards`,
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

          {beat === 'shoot' && <motion.div key="shoot" className="h-10" />}

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
          <StadiumBoard t={t} bestRun={bestRun} liveRows={live ? liveStats?.topRuns ?? [] : null} />
          <div className="mt-4 hidden lg:block">{renderHud(true)}</div>
        </div>
      </div>
      <ResultSplash {...splashProps} />
      <MoneyFlight flight={flight} />
    </MiniGameShell>
  );
}

/** Longest-runs leaderboard in the app's own leaderboard style (green border,
 *  green #1 row — see LeaderboardTable non-event mode). Flavour rows + the
 *  player's own best run. */
function StadiumBoard({
  t,
  bestRun,
  liveRows = null,
}: {
  t: (k: string, v?: Record<string, string | number>) => string;
  bestRun: number | null;
  /** Real top runs from /free-kicks/stats; null = demo flavour rows. */
  liveRows?: Array<{ name: string; mult: number }> | null;
}) {
  const rows: Array<{ name: string; mult: number; you?: boolean }> = liveRows
    ? liveRows.map((row) => ({ ...row }))
    : [
    { name: 'თაზო10', mult: 18.31 },
    { name: 'გიორგი7', mult: 14.66 },
    { name: 'ნიკა77', mult: 9.16 },
    { name: 'საბა_fc', mult: 5.72 },
  ];
  if (bestRun != null && bestRun > 1) rows.push({ name: t('You'), mult: bestRun, you: true });
  rows.sort((a, b) => b.mult - a.mult);

  return (
    <div className="relative mt-2">
      <div className="mb-2 flex items-center gap-1.5 px-1 font-poppins text-[10px] font-black uppercase tracking-wider text-white/60">
        <Trophy className="size-3.5 text-brand-yellow" /> {t('Longest runs today')}
      </div>
      <div className="overflow-hidden rounded-[10px] border-2 border-brand-green">
        <div className="divide-y divide-brand-green/25">
          {rows.slice(0, 5).map((r, i) => (
            <div
              key={`${r.name}-${i}`}
              className={`flex items-center justify-between px-3 py-2.5 font-poppins text-sm font-bold ${
                i === 0
                  ? 'bg-brand-green text-white'
                  : r.you
                    ? 'bg-brand-blue text-white'
                    : 'text-white/70 hover:bg-white/[0.03]'
              }`}
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
