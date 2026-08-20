'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import dynamic from 'next/dynamic';
import Image from 'next/image';
import { AnimatePresence, motion } from 'motion/react';
import { Check, Flag, LockKeyhole, Play, RotateCcw, Shield, Timer, Trophy, X } from 'lucide-react';
import { MiniGameShell, StatPill } from './MiniGameShell';
import { getTrivia, type TriviaQuestion } from '../data/trivia';
import { useMiniLocale } from '../lib/i18n';
import { useStoreWallet } from '@/lib/queries/store.queries';
import {
  acquireRoadToGoalMutation,
  didRoadToGoalMutationAdvance,
  type PendingRoadToGoalMutation,
  type RoadToGoalMutationIntent,
} from '@/lib/features/roadToGoalMutations';
import {
  RoadToGoalApiError,
  roadToGoalApi,
  type RoadToGoalCommitment,
  type RoadToGoalProof,
  type RoadToGoalQuestion,
  type RoadToGoalState,
} from '@/lib/repositories/roadToGoal.repo';
import {
  verifyRoadToGoalCommitmentEnvelope,
  verifyRoadToGoalProof,
} from '@/lib/features/roadToGoalProof';
import {
  trackRoadToGoalEngagementEnded,
  trackRoadToGoalError,
  trackRoadToGoalProofVerified,
  trackRoadToGoalQuestionResolved,
  trackRoadToGoalResumeChecked,
  trackRoadToGoalRunSettled,
  trackRoadToGoalRunStarted,
  trackRoadToGoalStartRequested,
  trackRoadToGoalViewed,
  type RoadToGoalAnalyticsMode,
} from '../analytics/roadToGoal.analytics';

const RoadToGoalPitch = dynamic(
  () => import('./RoadToGoalPitch').then((module) => module.RoadToGoalPitch),
  {
    ssr: false,
    loading: () => <div className="aspect-[16/9] w-full animate-pulse rounded-[26px] border border-white/10 bg-[#061712]" />,
  },
);

const ZONES = 11;
const QUESTION_MS = 9_000;
const DRIBBLE_MS = 1_150;
const STAKES = [10, 25, 50];
const MULTIPLIERS = [1.03, 1.08, 1.15, 1.24, 1.36, 1.52, 1.72, 1.98, 2.35, 2.9, 4] as const;
const DIFFICULTIES: TriviaQuestion['difficulty'][] = [
  'easy',
  'easy',
  'easy',
  'easy',
  'medium',
  'medium',
  'medium',
  'medium',
  'hard',
  'hard',
  'hard',
];
const ZONE_COLORS = ['#58CC02', '#1CB0F6', '#FFE500', '#FF9600'] as const;
const LANE = 104;
const FIRST_ZONE_X = 126;
const LAST_ROUND_STORAGE_KEY = 'quizball:road-to-goal:last-round';
const COMMITMENT_STORAGE_PREFIX = 'quizball:road-to-goal:commitment:';

type Phase = 'idle' | 'question' | 'correct' | 'decision' | 'tackle' | 'tackled' | 'cashed' | 'complete';

const COPY = {
  en: {
    title: 'Road to Goal',
    subtitle: 'Beat 11 defenders. One football question per zone.',
    balance: 'Balance',
    zone: 'Zone',
    stake: 'Stake',
    introEyebrow: 'The eleven-zone gauntlet',
    introTitle: 'Know it. Dribble it. Bank it.',
    introBody: 'Every answer triggers a survival roll. Correct answers give you better odds. After each safe zone, bank the return or attack the next defender.',
    kickOff: 'Kick off for {stake}',
    noFunds: 'Not enough points for this stake',
    nextReturn: 'Next return',
    currentReturn: 'Current return',
    question: 'Question',
    answerFast: 'Answer before the defender closes you down',
    clean: 'Defender beaten',
    cleanBody: 'You are through zone {zone}. The next defender is already stepping up.',
    continue: 'Attack zone {zone}',
    cashOut: 'Bank {amount}',
    tackled: 'Tackled!',
    tackledBody: 'The defender stopped your run in zone {zone}. Your stake is gone.',
    correctWas: 'Correct answer: {answer}',
    newRun: 'New run',
    cashed: 'Run banked',
    cashedBody: '{zones} zones cleared at {mult}×.',
    finalTitle: 'Goal!',
    finalBody: 'All 11 defenders beaten. A perfect run at 4.00×.',
    won: 'You banked {amount}',
    startAgain: 'Play again',
    liveRoute: 'Live route',
    safe: 'cleared',
    target: 'target',
    finish: 'Goal',
  },
  ka: {
    title: 'გზა გოლისკენ',
    subtitle: 'აჯობე 11 მცველს — თითო ზონაში ერთი საფეხბურთო კითხვა.',
    balance: 'ბალანსი',
    zone: 'ზონა',
    stake: 'ფსონი',
    introEyebrow: 'თერთმეტზონიანი გამოწვევა',
    introTitle: 'იცოდე. მოატყუე. აიღე.',
    introBody: 'ყოველი პასუხის შემდეგ გადარჩენის გათამაშებაა. სწორი პასუხი უკეთეს შანსს გაძლევს. უსაფრთხო ზონის შემდეგ აიღე მოგება ან შეუტიე შემდეგ მცველს.',
    kickOff: 'დაიწყე — {stake}',
    noFunds: 'ამ ფსონისთვის ქულები არ გყოფნის',
    nextReturn: 'შემდეგი მოგება',
    currentReturn: 'მიმდინარე მოგება',
    question: 'კითხვა',
    answerFast: 'უპასუხე, სანამ მცველი დაგეწევა',
    clean: 'მცველი მოტყუებულია',
    cleanBody: 'შენ გაიარე ზონა {zone}. შემდეგი მცველი უკვე გელოდება.',
    continue: 'შეუტიე ზონას {zone}',
    cashOut: 'აიღე {amount}',
    tackled: 'ჩაგჭრეს!',
    tackledBody: 'მცველმა გაგაჩერა ზონაში {zone}. ფსონი დაიკარგა.',
    correctWas: 'სწორი პასუხი: {answer}',
    newRun: 'ახალი გარბენი',
    cashed: 'მოგება აღებულია',
    cashedBody: 'გაიარე {zones} ზონა — {mult}×.',
    finalTitle: 'გოლი!',
    finalBody: 'თერთმეტივე მცველი მოტყუებულია. იდეალური გარბენი — 4.00×.',
    won: 'აიღე {amount}',
    startAgain: 'კიდევ თამაში',
    liveRoute: 'ცოცხალი მარშრუტი',
    safe: 'გავლილია',
    target: 'მიზანი',
    finish: 'გოლი',
  },
} as const;

function fill(template: string, values: Record<string, string | number>) {
  return template.replace(/\{(\w+)\}/g, (_, key: string) => String(values[key] ?? `{${key}}`));
}

function shuffled<T>(items: T[]): T[] {
  const out = [...items];
  for (let i = out.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

function buildRun(bank: TriviaQuestion[]): TriviaQuestion[] {
  const pools: Record<TriviaQuestion['difficulty'], TriviaQuestion[]> = {
    easy: shuffled(bank.filter((question) => question.difficulty === 'easy')),
    medium: shuffled(bank.filter((question) => question.difficulty === 'medium')),
    hard: shuffled(bank.filter((question) => question.difficulty === 'hard')),
  };
  const fallback = shuffled(bank);
  return DIFFICULTIES.map((difficulty) => pools[difficulty].pop() ?? fallback.pop()!);
}

function points(value: number) {
  return value.toLocaleString(undefined, {
    minimumFractionDigits: Number.isInteger(value) ? 0 : 2,
    maximumFractionDigits: 2,
  });
}

function randomClientValue() {
  return globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

function isDefinitiveMutationError(error: unknown): error is RoadToGoalApiError {
  return error instanceof RoadToGoalApiError
    && error.status >= 400
    && error.status < 500
    && error.status !== 409;
}

function persistRoadToGoalCommitment(commitment: RoadToGoalCommitment) {
  try {
    window.localStorage.setItem(
      `${COMMITMENT_STORAGE_PREFIX}${commitment.commitment_id}`,
      JSON.stringify(commitment),
    );
    window.localStorage.setItem(LAST_ROUND_STORAGE_KEY, commitment.commitment_id);
  } catch {
    // The in-memory envelope still verifies this tab when storage is blocked.
  }
}

function readRoadToGoalCommitment(roundId: string): RoadToGoalCommitment | null {
  try {
    const raw = window.localStorage.getItem(`${COMMITMENT_STORAGE_PREFIX}${roundId}`);
    return raw ? JSON.parse(raw) as RoadToGoalCommitment : null;
  } catch {
    return null;
  }
}

function rememberRoadToGoalRound(roundId: string) {
  try {
    window.localStorage.setItem(LAST_ROUND_STORAGE_KEY, roundId);
  } catch {
    // Storage may be unavailable in strict private-browsing environments.
  }
}

function readLastRoadToGoalRound(): string | null {
  try {
    return window.localStorage.getItem(LAST_ROUND_STORAGE_KEY);
  } catch {
    return null;
  }
}

function forgetRoadToGoalRound(roundId?: string) {
  try {
    const storedRoundId = roundId ?? window.localStorage.getItem(LAST_ROUND_STORAGE_KEY);
    if (storedRoundId) {
      window.localStorage.removeItem(`${COMMITMENT_STORAGE_PREFIX}${storedRoundId}`);
    }
    window.localStorage.removeItem(LAST_ROUND_STORAGE_KEY);
  } catch {
    // Nothing else is required to reset the in-memory game state.
  }
}

function localized(value: Record<string, string>, locale: 'en' | 'ka') {
  return value[locale] ?? value.en ?? Object.values(value)[0] ?? '';
}

function toTriviaQuestion(question: RoadToGoalQuestion, locale: 'en' | 'ka'): TriviaQuestion {
  return {
    id: question.question_id,
    q: localized(question.prompt, locale),
    options: question.options.map((option) => localized(option.text, locale)),
    answer: -1,
    difficulty: question.difficulty,
    image: question.image ?? undefined,
  };
}

function Runner({ tackled }: { tackled: boolean }) {
  return (
    <motion.svg
      viewBox="0 0 72 96"
      aria-hidden="true"
      className="h-[82px] w-[62px] overflow-visible drop-shadow-[0_12px_10px_rgba(0,0,0,0.45)]"
      animate={tackled ? { rotate: 72, x: 13, y: 23 } : { rotate: [-2, 3, -2], y: [0, -3, 0] }}
      transition={tackled ? { duration: 0.42, ease: [0.2, 0.8, 0.2, 1] } : { duration: 0.72, repeat: Infinity }}
    >
      <path d="M30 33 20 49l-8 12" fill="none" stroke="#B9784F" strokeWidth="7" strokeLinecap="round" />
      <path d="m43 34 13 13 7 13" fill="none" stroke="#B9784F" strokeWidth="7" strokeLinecap="round" />
      <path d="m29 66-8 15-8 6M43 66l9 13 9 2" fill="none" stroke="#B9784F" strokeWidth="8" strokeLinecap="round" />
      <path d="M25 30h23l3 31-15 8-15-8Z" fill="#58CC02" stroke="#102A43" strokeWidth="3" />
      <path d="M24 56h26l-3 14H27Z" fill="#153E75" stroke="#102A43" strokeWidth="3" />
      <path d="M28 35h17" stroke="#FFE500" strokeWidth="4" strokeLinecap="round" />
      <circle cx="36" cy="19" r="13" fill="#B9784F" stroke="#102A43" strokeWidth="3" />
      <path d="M25 18c2-12 20-15 24-2-7-4-15-3-24 2Z" fill="#17202E" />
      <path d="m9 86 12-5M51 79l13 4" stroke="#FF9600" strokeWidth="7" strokeLinecap="round" />
      <circle cx="22" cy="89" r="8" fill="#F7FBFF" stroke="#102A43" strokeWidth="2" />
      <path d="m19 86 4-1 3 3-2 4h-4l-2-3Z" fill="#153E75" />
    </motion.svg>
  );
}

function Defender({ active, tackling, cleared }: { active: boolean; tackling: boolean; cleared: boolean }) {
  return (
    <motion.svg
      viewBox="0 0 60 78"
      aria-hidden="true"
      className="h-[62px] w-12 overflow-visible drop-shadow-[0_9px_8px_rgba(0,0,0,0.4)]"
      animate={
        tackling
          ? { x: -66, y: 13, rotate: -30, scale: 1.08 }
          : active
            ? { x: [0, -3, 0], y: [0, -2, 0] }
            : { opacity: cleared ? 0.22 : 0.72 }
      }
      transition={tackling ? { duration: 0.36, ease: [0.2, 0.8, 0.2, 1] } : { duration: 0.8, repeat: active ? Infinity : 0 }}
    >
      <path d="m24 56-7 14M37 56l8 14M21 37 9 13M40 37l-8 14" fill="none" stroke="#D59B73" strokeWidth="7" strokeLinecap="round" />
      <path d="M20 25h21l5 31H16Z" fill="#1CB0F6" stroke="#102A43" strokeWidth="3" />
      <path d="M17 49h28l-3 12H20Z" fill="#FF9600" stroke="#102A43" strokeWidth="3" />
      <path d="m20 31 22 15M40 30 18 45" stroke="#FFE500" strokeWidth="3" opacity=".9" />
      <circle cx="30" cy="15" r="11" fill="#D59B73" stroke="#102A43" strokeWidth="3" />
      <path d="M20 14c2-10 17-12 21-1-7-3-14-3-21 1Z" fill="#382318" />
      <path d="m13 72 8-3M41 69l8 4" stroke="#111A28" strokeWidth="6" strokeLinecap="round" />
    </motion.svg>
  );
}

function GoalFrame({ x }: { x: number }) {
  return (
    <div className="absolute top-[112px] h-[142px] w-[110px]" style={{ left: x }}>
      <div className="absolute inset-x-2 bottom-0 top-3 border-x-[5px] border-t-[5px] border-white/90 shadow-[0_0_18px_rgba(255,255,255,0.3)]" />
      <div className="absolute inset-x-3 bottom-1 top-4 opacity-30 [background-image:linear-gradient(rgba(255,255,255,.7)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,.7)_1px,transparent_1px)] [background-size:12px_12px]" />
      <div className="absolute inset-x-0 top-[-20px] text-center font-poppins text-[10px] font-black uppercase tracking-[0.18em] text-brand-yellow">GOAL</div>
    </div>
  );
}

interface RoadSceneProps {
  progress: number;
  phase: Phase;
  labels: { liveRoute: string; safe: string; target: string };
}

function RoadSceneFallback({ progress, phase, labels }: RoadSceneProps) {
  const activeZone = Math.min(progress, ZONES - 1);
  const focusX = progress >= ZONES ? FIRST_ZONE_X + ZONES * LANE : FIRST_ZONE_X + activeZone * LANE;
  const playerX = progress === 0 ? FIRST_ZONE_X - 58 : FIRST_ZONE_X + (progress - 1) * LANE;
  const tackling = phase === 'tackle' || phase === 'tackled';
  const stageWidth = FIRST_ZONE_X + ZONES * LANE + 170;

  return (
    <div className="relative min-h-[330px] overflow-hidden rounded-[26px] border border-white/10 bg-[#0A1730] shadow-[inset_0_1px_0_rgba(255,255,255,0.08),0_24px_60px_rgba(0,0,0,0.28)] lg:min-h-[520px]">
      <div className="absolute inset-x-0 top-0 h-[43%] bg-[linear-gradient(180deg,#111A38_0%,#173C72_72%,#1CB0F6_73%,#0A1730_76%)]" />
      <div className="absolute inset-x-0 top-[12%] h-[20%] opacity-45 [background-image:radial-gradient(circle,#FFE500_1.2px,transparent_1.5px),radial-gradient(circle,#58CC02_1.2px,transparent_1.5px),radial-gradient(circle,#FF9600_1.2px,transparent_1.5px)] [background-position:0_0,11px_7px,23px_2px] [background-size:31px_17px]" />
      <div className="absolute inset-x-0 bottom-0 top-[42%] bg-[linear-gradient(180deg,#159447_0%,#086336_100%)]" />
      <div className="absolute inset-x-0 bottom-0 top-[42%] opacity-35 [background-image:linear-gradient(90deg,rgba(255,255,255,.08)_50%,transparent_50%)] [background-size:208px_100%]" />
      <div className="absolute inset-x-0 top-[42%] h-1 bg-brand-yellow shadow-[0_0_14px_rgba(255,229,0,.65)]" />
      <div className="absolute left-4 top-4 z-20 flex items-center gap-2 rounded-full border border-white/10 bg-[#07111D]/80 px-3 py-1.5 backdrop-blur">
        <span className="size-2 rounded-full bg-brand-green shadow-[0_0_10px_#58CC02]" />
        <span className="font-poppins text-[9px] font-black uppercase tracking-[0.18em] text-white/65">{labels.liveRoute}</span>
      </div>

      <motion.div
        className="absolute bottom-0 top-0"
        style={{ left: '50%', width: stageWidth }}
        animate={{ x: -focusX }}
        transition={{ type: 'spring', stiffness: 105, damping: 22, mass: 0.8 }}
      >
        <div className="absolute bottom-[66px] left-1 h-[170px] w-[74px] rounded-t-full border-[5px] border-b-0 border-[#29385F] bg-[#050B19] shadow-[0_0_28px_rgba(0,0,0,.65)]" />
        <div className="absolute bottom-[62px] left-[14px] font-poppins text-[9px] font-black uppercase tracking-widest text-white/30">START</div>

        {MULTIPLIERS.map((multiplier, index) => {
          const x = FIRST_ZONE_X + index * LANE;
          const cleared = index < progress;
          const active = index === progress && progress < ZONES;
          const color = ZONE_COLORS[index % ZONE_COLORS.length];
          return (
            <div key={multiplier} className="absolute inset-y-0 w-[104px]" style={{ left: x - LANE / 2 }}>
              <div className="absolute inset-y-[43%] right-0 border-r-2 border-dashed border-white/35" />
              <motion.div
                className="absolute left-1/2 top-[50px] flex size-[72px] -translate-x-1/2 items-center justify-center rounded-full border-[5px] font-poppins text-base font-black tabular-nums"
                style={{
                  borderColor: cleared || active ? color : '#43517D',
                  background: cleared ? color : active ? `${color}33` : '#25345F',
                  color: cleared ? '#07111D' : active ? color : '#8B9AC7',
                  boxShadow: active ? `0 0 0 6px ${color}22, 0 0 28px ${color}55` : '0 8px 0 #111A38',
                }}
                animate={active ? { scale: [1, 1.06, 1] } : { scale: 1 }}
                transition={{ duration: 1.15, repeat: active ? Infinity : 0 }}
              >
                {multiplier.toFixed(2)}×
              </motion.div>
              <div className="absolute left-1/2 top-[132px] -translate-x-1/2 whitespace-nowrap font-poppins text-[8px] font-black uppercase tracking-[0.14em] text-white/38">
                {cleared ? labels.safe : active ? labels.target : `0${index + 1}`.slice(-2)}
              </div>
              <div className="absolute left-1/2 top-[188px] -translate-x-1/2">
                <Defender active={active} tackling={active && tackling} cleared={cleared} />
              </div>
            </div>
          );
        })}

        <GoalFrame x={FIRST_ZONE_X + ZONES * LANE - 30} />

        <motion.div
          className="absolute top-[206px] z-30 -translate-x-1/2"
          animate={{ left: playerX }}
          transition={{ type: 'spring', stiffness: 125, damping: 17 }}
        >
          <Runner tackled={tackling} />
        </motion.div>

        {tackling && (
          <motion.div
            initial={{ scale: 0, rotate: -20, opacity: 0 }}
            animate={{ scale: [0, 1.25, 0.92], rotate: 10, opacity: [0, 1, 1] }}
            className="absolute top-[230px] z-40 flex size-14 items-center justify-center rounded-full bg-brand-orange font-poppins text-xl font-black text-black shadow-[0_0_35px_rgba(255,150,0,.8)]"
            style={{ left: playerX + 30 }}
          >
            <Shield className="size-7" />
          </motion.div>
        )}
      </motion.div>

      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-[#07111D]/85 to-transparent" />
    </div>
  );
}

function RoadScene(props: RoadSceneProps) {
  const [fallback, setFallback] = useState(false);
  const showFallback = useCallback(() => setFallback(true), []);
  if (fallback) return <RoadSceneFallback {...props} />;
  return <RoadToGoalPitch {...props} onFailure={showFallback} />;
}

export function RoadToGoal({
  backHref,
  live = false,
  newRunsEnabled = true,
}: {
  backHref?: string;
  live?: boolean;
  newRunsEnabled?: boolean;
} = {}) {
  const locale = useMiniLocale();
  const copy = COPY[locale];
  const bank = useMemo(() => getTrivia(locale), [locale]);
  const { data: wallet, isError: walletError, refetch: refetchWallet } = useStoreWallet({ enabled: live });
  const [balance, setBalance] = useState(1_000);
  const [stake, setStake] = useState(25);
  const [run, setRun] = useState<TriviaQuestion[]>([]);
  const [phase, setPhase] = useState<Phase>('idle');
  const [progress, setProgress] = useState(0);
  const [selected, setSelected] = useState<number | null>(null);
  const [remaining, setRemaining] = useState(QUESTION_MS);
  const [payout, setPayout] = useState(0);
  const [liveState, setLiveState] = useState<RoadToGoalState | null>(null);
  const [liveQuestion, setLiveQuestion] = useState<TriviaQuestion | undefined>();
  const [liveOptionIds, setLiveOptionIds] = useState<string[]>([]);
  const [resumed, setResumed] = useState(!live);
  const [busy, setBusy] = useState(false);
  const [liveError, setLiveError] = useState<string | null>(null);
  const [clientSeed, setClientSeed] = useState(randomClientValue);
  const [autoCashoutZone, setAutoCashoutZone] = useState<number | null>(null);
  const [proof, setProof] = useState<RoadToGoalProof | null>(null);
  const [proofVerified, setProofVerified] = useState<boolean | null>(null);
  const timers = useRef<number[]>([]);
  const liveStateRef = useRef<RoadToGoalState | null>(null);
  const pendingMutationRef = useRef<PendingRoadToGoalMutation | null>(null);
  const committedBeforeSeedRef = useRef<RoadToGoalCommitment | null>(null);
  const serverClockOffsetRef = useRef(0);
  const demoRoundIdRef = useRef<string | null>(null);
  const runStartedAtRef = useRef<number | null>(null);
  const lastReconcileFailedRef = useRef(false);
  const analyticsStateRef = useRef({
    phase: 'idle' as Phase,
    maxZoneReached: 0,
    runStarted: false,
    roundId: null as string | null,
  });
  const analyticsMode: RoadToGoalAnalyticsMode = live ? 'live' : 'demo';

  useEffect(() => () => timers.current.forEach((id) => window.clearTimeout(id)), []);

  useEffect(() => {
    analyticsStateRef.current.phase = phase;
    analyticsStateRef.current.maxZoneReached = Math.max(
      analyticsStateRef.current.maxZoneReached,
      progress,
    );
    analyticsStateRef.current.roundId = liveState?.round_id ?? demoRoundIdRef.current;
  }, [liveState?.round_id, phase, progress]);

  useEffect(() => {
    const mountedAt = Date.now();
    let activeStartedAt = document.visibilityState === 'hidden' ? null : mountedAt;
    let activeDurationMs = 0;
    let ended = false;

    trackRoadToGoalViewed({
      mode: analyticsMode,
      locale,
      newRunsEnabled,
    });

    const stopActiveClock = () => {
      if (activeStartedAt == null) return;
      activeDurationMs += Date.now() - activeStartedAt;
      activeStartedAt = null;
    };
    const finish = (reason: 'pagehide' | 'unmount') => {
      if (ended) return;
      ended = true;
      stopActiveClock();
      const state = analyticsStateRef.current;
      trackRoadToGoalEngagementEnded({
        mode: analyticsMode,
        reason,
        durationMs: Date.now() - mountedAt,
        activeDurationMs,
        runStarted: state.runStarted,
        maxZoneReached: state.maxZoneReached,
        phase: state.phase,
        roundId: state.roundId,
      });
    };
    const onVisibilityChange = () => {
      if (document.visibilityState === 'hidden') {
        stopActiveClock();
      } else if (activeStartedAt == null) {
        activeStartedAt = Date.now();
      }
    };
    const onPageHide = () => finish('pagehide');

    document.addEventListener('visibilitychange', onVisibilityChange);
    window.addEventListener('pagehide', onPageHide);
    return () => {
      document.removeEventListener('visibilitychange', onVisibilityChange);
      window.removeEventListener('pagehide', onPageHide);
      finish('unmount');
    };
  }, [analyticsMode, locale, newRunsEnabled]);

  const later = (fn: () => void, delay: number) => {
    const id = window.setTimeout(fn, delay);
    timers.current.push(id);
  };

  const applyLiveState = useCallback((state: RoadToGoalState) => {
    const previous = liveStateRef.current;
    if (
      previous
      && previous.round_id === state.round_id
      && state.state_version < previous.state_version
    ) return;
    liveStateRef.current = state;
    analyticsStateRef.current.runStarted = true;
    analyticsStateRef.current.roundId = state.round_id;
    analyticsStateRef.current.maxZoneReached = Math.max(
      analyticsStateRef.current.maxZoneReached,
      state.cleared_zones,
    );
    rememberRoadToGoalRound(state.round_id);
    const serverNow = new Date(state.server_now).getTime();
    if (Number.isFinite(serverNow)) serverClockOffsetRef.current = serverNow - Date.now();
    setLiveState(state);
    setStake(state.stake_coins);
    setProgress(state.cleared_zones);
    setPayout(state.payout_coins ?? 0);
    setAutoCashoutZone(state.auto_cashout_zone);
    if (state.question) {
      setLiveQuestion(toTriviaQuestion(state.question, locale));
      setLiveOptionIds(state.question.options.map((option) => option.id));
      setRemaining(Math.max(
        0,
        new Date(state.question.deadline_at).getTime()
          - (Date.now() + serverClockOffsetRef.current),
      ));
    } else {
      setLiveQuestion(undefined);
      setLiveOptionIds([]);
    }
    if (state.status === 'lost') setPhase('tackled');
    else if (state.status === 'cashed') setPhase('cashed');
    else if (state.status === 'completed') setPhase('complete');
    else if (state.phase === 'decision') setPhase('decision');
    else setPhase('question');
  }, [locale]);

  const loadProof = useCallback(async (roundId: string) => {
    const nextProof = await roadToGoalApi.proof(roundId);
    const committedBeforeSeed = committedBeforeSeedRef.current?.commitment_id === roundId
      ? committedBeforeSeedRef.current
      : readRoadToGoalCommitment(roundId);
    const verified = committedBeforeSeed
      ? await verifyRoadToGoalProof(nextProof, committedBeforeSeed)
      : false;
    setProof(nextProof);
    setProofVerified(verified);
    trackRoadToGoalProofVerified({
      roundId,
      verified,
      verifiedZones: nextProof.zones.length,
    });
  }, []);

  const reconcileLive = useCallback(async (roundId?: string) => {
    lastReconcileFailedRef.current = false;
    try {
      let state = roundId ? await roadToGoalApi.get(roundId) : await roadToGoalApi.current();
      if (!state && !roundId) {
        const storedRoundId = readLastRoadToGoalRound();
        if (storedRoundId) {
          try {
            state = await roadToGoalApi.get(storedRoundId);
          } catch (error) {
            if (!(error instanceof RoadToGoalApiError && error.status === 404)) throw error;
            forgetRoadToGoalRound(storedRoundId);
          }
        }
      }
      let proofLoadFailed = false;
      if (state) {
        committedBeforeSeedRef.current = readRoadToGoalCommitment(state.round_id);
        const pending = pendingMutationRef.current;
        if (
          pending
          && didRoadToGoalMutationAdvance(pending, {
            roundId: state.round_id,
            stateVersion: state.state_version,
            status: state.status,
          })
        ) {
          pendingMutationRef.current = null;
        }
        applyLiveState(state);
        if (state.status !== 'active') {
          try {
            await loadProof(state.round_id);
          } catch {
            proofLoadFailed = true;
            trackRoadToGoalError({ action: 'proof', errorName: 'proof_load_failed' });
          }
          void refetchWallet();
        }
      }
      else {
        liveStateRef.current = null;
        setLiveState(null);
        setPhase('idle');
      }
      setLiveError(proofLoadFailed
        ? locale === 'ka'
          ? 'სამართლიანობის მტკიცებულება ვერ ჩაიტვირთა — სცადე ხელახლა'
          : 'Fairness proof could not be loaded — try again'
        : null);
      return state;
    } catch {
      lastReconcileFailedRef.current = true;
      trackRoadToGoalError({ action: 'resume', errorName: 'reconcile_failed' });
      setLiveError(locale === 'ka' ? 'კავშირი შეფერხდა — სცადე ხელახლა' : 'Connection interrupted — try again');
      return null;
    }
  }, [applyLiveState, loadProof, locale, refetchWallet]);

  useEffect(() => {
    if (!live) return;
    void reconcileLive()
      .then((state) => {
        trackRoadToGoalResumeChecked({
          result: lastReconcileFailedRef.current
            ? 'error'
            : !state
              ? 'none'
              : state.status === 'active'
                ? 'active'
                : 'terminal',
          status: state?.status,
        });
      })
      .finally(() => setResumed(true));
  }, [live, reconcileLive]);

  const liveQuestionDeadline = liveState?.question?.deadline_at;

  useEffect(() => {
    if (phase !== 'question') return;
    const deadline = live && liveQuestionDeadline
      ? new Date(liveQuestionDeadline).getTime()
      : Date.now() + QUESTION_MS;
    const serverNow = () => Date.now() + (live ? serverClockOffsetRef.current : 0);
    const interval = window.setInterval(
      () => setRemaining(Math.max(0, deadline - serverNow())),
      80,
    );
    let recoveryTimeout: number | undefined;
    let cancelled = false;
    const recoverExpiredQuestion = async () => {
      const current = liveStateRef.current;
      if (!current || cancelled) return;
      const recovered = await reconcileLive(current.round_id);
      if (
        !cancelled
        && recovered?.status === 'active'
        && recovered.phase === 'question'
        && recovered.question?.question_id === current.question?.question_id
      ) {
        recoveryTimeout = window.setTimeout(recoverExpiredQuestion, 750);
      }
    };
    const timeout = window.setTimeout(() => {
      if (live) {
        void recoverExpiredQuestion();
        return;
      }
      const timedOutQuestion = run[progress];
      const demoRoundId = demoRoundIdRef.current;
      if (timedOutQuestion && demoRoundId) {
        trackRoadToGoalQuestionResolved({
          mode: 'demo',
          roundId: demoRoundId,
          zone: progress + 1,
          questionId: timedOutQuestion.id,
          difficulty: timedOutQuestion.difficulty,
          outcome: 'late',
          survived: false,
          answerDurationMs: QUESTION_MS,
          stakeCoins: stake,
          terminalStatus: 'lost',
        });
        trackRoadToGoalRunSettled({
          mode: 'demo',
          roundId: demoRoundId,
          result: 'lost',
          settlementReason: 'demo_timeout_tackle',
          stakeCoins: stake,
          payoutCoins: 0,
          clearedZones: progress,
          runDurationMs: Date.now() - (runStartedAtRef.current ?? Date.now()),
        });
      }
      setSelected(-1);
      setPhase('tackle');
      later(() => setPhase('tackled'), 1_050);
    }, Math.max(0, deadline - serverNow()));
    return () => {
      cancelled = true;
      window.clearInterval(interval);
      window.clearTimeout(timeout);
      if (recoveryTimeout !== undefined) window.clearTimeout(recoveryTimeout);
    };
  }, [live, liveQuestionDeadline, phase, progress, reconcileLive, run, stake]);

  const question = live ? liveQuestion : run[progress];
  const currentMultiplier = live
    ? (liveState?.current_multiplier_bp ?? 10_000) / 10_000
    : progress > 0 ? MULTIPLIERS[progress - 1] : 1;
  const nextMultiplier = live
    ? (liveState?.next_multiplier_bp ?? 10_000) / 10_000
    : MULTIPLIERS[Math.min(progress, ZONES - 1)];
  const currentReturn = live
    ? liveState?.current_return_coins ?? stake
    : Math.round(stake * currentMultiplier);
  const nextReturn = live
    ? liveState?.next_return_coins ?? stake
    : Math.round(stake * nextMultiplier);
  const questionDuration = liveState?.question?.duration_ms ?? QUESTION_MS;
  const timePercent = Math.min(100, (remaining / questionDuration) * 100);
  const effectiveBalance = live ? wallet?.coins ?? 0 : balance;
  const correctAnswer = question && question.answer >= 0
    ? question.options[question.answer]
    : undefined;

  const acquireLiveMutation = (
    intent: RoadToGoalMutationIntent,
  ): PendingRoadToGoalMutation | null => {
    const acquired = acquireRoadToGoalMutation(
      pendingMutationRef.current,
      intent,
      randomClientValue,
    );
    pendingMutationRef.current = acquired.pending;
    if (acquired.blocked) {
      setLiveError(
        locale === 'ka'
          ? 'წინა მოქმედება ჯერ მოწმდება — გაიმეორე იგივე მოქმედება'
          : 'Your previous action is still resolving — retry the same action',
      );
      return null;
    }
    return acquired.pending;
  };

  const finishLiveMutation = async (state: RoadToGoalState) => {
    applyLiveState(state);
    pendingMutationRef.current = null;
    if (state.status !== 'active') {
      try {
        await loadProof(state.round_id);
      } catch {
        trackRoadToGoalError({ action: 'proof', errorName: 'proof_load_failed' });
        setLiveError(
          locale === 'ka'
            ? 'სამართლიანობის მტკიცებულება ვერ ჩაიტვირთა — სცადე ხელახლა'
            : 'Fairness proof could not be loaded — try again',
        );
      }
      await refetchWallet();
    }
  };

  const trackDemoSettlement = (
    result: 'cashed' | 'lost' | 'completed',
    settlementReason: string,
    payoutCoins: number,
    clearedZones: number,
  ) => {
    const roundId = demoRoundIdRef.current;
    if (!roundId) return;
    trackRoadToGoalRunSettled({
      mode: 'demo',
      roundId,
      result,
      settlementReason,
      stakeCoins: stake,
      payoutCoins,
      clearedZones,
      runDurationMs: Date.now() - (runStartedAtRef.current ?? Date.now()),
    });
  };

  const start = async () => {
    if (effectiveBalance < stake || busy) return;
    trackRoadToGoalStartRequested({
      mode: analyticsMode,
      stakeCoins: stake,
      autoCashoutZone: live ? autoCashoutZone : null,
    });
    if (live) {
      if (!newRunsEnabled || !wallet || !resumed) return;
      const startIntent = {
        kind: 'start',
        stake: stake as 10 | 25 | 50,
        clientSeed,
        autoCashoutZone,
      } satisfies RoadToGoalMutationIntent;
      const pending = acquireLiveMutation(startIntent);
      if (!pending?.finalizeNonce) return;
      setBusy(true);
      setLiveError(null);
      try {
        const commitment: RoadToGoalCommitment = await roadToGoalApi.prepare({
          stake: stake as 10 | 25 | 50,
          requestNonce: pending.nonce,
          autoCashoutZone,
        });
        if (!(await verifyRoadToGoalCommitmentEnvelope(commitment))) {
          throw new RoadToGoalApiError(
            'The server commitment did not match the published rules',
            422,
          );
        }
        committedBeforeSeedRef.current = commitment;
        persistRoadToGoalCommitment(commitment);
        const state = await roadToGoalApi.start({
          commitmentId: commitment.commitment_id,
          clientNonce: pending.finalizeNonce,
          clientSeed,
        });
        pendingMutationRef.current = null;
        setProof(null);
        setProofVerified(null);
        setSelected(null);
        runStartedAtRef.current = Date.now();
        applyLiveState(state);
        await refetchWallet();
      } catch (error) {
        trackRoadToGoalError({
          action: 'start',
          status: error instanceof RoadToGoalApiError ? error.status : null,
          errorName: error instanceof Error ? error.name : 'unknown',
        });
        if (isDefinitiveMutationError(error)) {
          pendingMutationRef.current = null;
          setLiveError(error.message);
        } else {
          const reconciled = await reconcileLive();
          if (!reconciled && pendingMutationRef.current) {
            setLiveError(error instanceof Error ? error.message : 'Request failed');
          }
        }
      } finally {
        setBusy(false);
      }
      return;
    }
    const demoRoundId = `demo-${randomClientValue()}`;
    demoRoundIdRef.current = demoRoundId;
    runStartedAtRef.current = Date.now();
    analyticsStateRef.current.runStarted = true;
    analyticsStateRef.current.roundId = demoRoundId;
    trackRoadToGoalRunStarted({
      mode: 'demo',
      roundId: demoRoundId,
      stakeCoins: stake,
      autoCashoutZone: null,
    });
    setBalance((value) => value - stake);
    setRun(buildRun(bank));
    setProgress(0);
    setSelected(null);
    setRemaining(QUESTION_MS);
    setPayout(0);
    setPhase('question');
  };

  const answer = async (index: number) => {
    if (phase !== 'question' || selected !== null || !question || busy) return;
    if (live) {
      const state = liveStateRef.current;
      const optionId = liveOptionIds[index];
      if (!state?.question || !optionId) return;
      const pending = acquireLiveMutation({
        kind: 'answer',
        roundId: state.round_id,
        questionId: state.question.question_id,
        optionId,
        expectedVersion: state.state_version,
      });
      if (!pending) return;
      setSelected(index);
      setBusy(true);
      setLiveError(null);
      try {
        const result = await roadToGoalApi.answer({
          roundId: state.round_id,
          questionId: state.question.question_id,
          optionId,
          expectedVersion: state.state_version,
          requestNonce: pending.nonce,
        });
        pendingMutationRef.current = null;
        liveStateRef.current = result.state;
        setLiveState(result.state);
        const correctIndex = liveOptionIds.indexOf(result.correct_option_id);
        setLiveQuestion((current) => current ? { ...current, answer: correctIndex } : current);
        setPhase(result.survived ? 'correct' : 'tackle');
        later(() => {
          void finishLiveMutation(result.state);
        }, result.survived ? DRIBBLE_MS : 1_050);
      } catch (error) {
        trackRoadToGoalError({
          action: 'answer',
          status: error instanceof RoadToGoalApiError ? error.status : null,
          errorName: error instanceof Error ? error.name : 'unknown',
        });
        if (isDefinitiveMutationError(error)) {
          pendingMutationRef.current = null;
          setLiveError(error.message);
        } else {
          await reconcileLive(state.round_id);
          if (pendingMutationRef.current) {
            setLiveError(error instanceof Error ? error.message : 'Request failed');
          }
        }
        setSelected(null);
      } finally {
        setBusy(false);
      }
      return;
    }
    setSelected(index);
    const answeredCorrectly = index === question.answer;
    const demoRoundId = demoRoundIdRef.current;
    if (demoRoundId) {
      trackRoadToGoalQuestionResolved({
        mode: 'demo',
        roundId: demoRoundId,
        zone: progress + 1,
        questionId: question.id,
        difficulty: question.difficulty,
        outcome: answeredCorrectly ? 'correct' : 'wrong',
        survived: answeredCorrectly,
        answerDurationMs: QUESTION_MS - remaining,
        stakeCoins: stake,
        terminalStatus: answeredCorrectly ? null : 'lost',
      });
    }
    if (!answeredCorrectly) {
      setPhase('tackle');
      trackDemoSettlement('lost', 'demo_tackle', 0, progress);
      later(() => setPhase('tackled'), 1_050);
      return;
    }

    setPhase('correct');
    later(() => {
      const nextProgress = progress + 1;
      setProgress(nextProgress);
      setSelected(null);
      if (nextProgress >= ZONES) {
        const finalPayout = Math.round(stake * MULTIPLIERS[ZONES - 1]);
        setPayout(finalPayout);
        setBalance((value) => value + finalPayout);
        trackDemoSettlement('completed', 'demo_complete', finalPayout, ZONES);
        setPhase('complete');
      } else {
        setPhase('decision');
      }
    }, DRIBBLE_MS);
  };

  const continueRun = async () => {
    if (live) {
      const state = liveStateRef.current;
      if (!state || busy) return;
      const pending = acquireLiveMutation({
        kind: 'continue',
        roundId: state.round_id,
        expectedVersion: state.state_version,
      });
      if (!pending) return;
      setBusy(true);
      try {
        const next = await roadToGoalApi.continue({
          roundId: state.round_id,
          expectedVersion: state.state_version,
          requestNonce: pending.nonce,
        });
        pendingMutationRef.current = null;
        setSelected(null);
        applyLiveState(next);
        if (next.status !== 'active') await finishLiveMutation(next);
      } catch (error) {
        trackRoadToGoalError({
          action: 'continue',
          status: error instanceof RoadToGoalApiError ? error.status : null,
          errorName: error instanceof Error ? error.name : 'unknown',
        });
        if (isDefinitiveMutationError(error)) {
          pendingMutationRef.current = null;
          setLiveError(error.message);
        } else {
          await reconcileLive(state.round_id);
          if (pendingMutationRef.current) {
            setLiveError(error instanceof Error ? error.message : 'Request failed');
          }
        }
      } finally {
        setBusy(false);
      }
      return;
    }
    setSelected(null);
    setRemaining(QUESTION_MS);
    setPhase('question');
  };

  const cashOut = async () => {
    if (progress <= 0) return;
    if (live) {
      const state = liveStateRef.current;
      if (!state || busy) return;
      const pending = acquireLiveMutation({
        kind: 'cashout',
        roundId: state.round_id,
        expectedVersion: state.state_version,
      });
      if (!pending) return;
      setBusy(true);
      try {
        const next = await roadToGoalApi.cashout({
          roundId: state.round_id,
          expectedVersion: state.state_version,
          requestNonce: pending.nonce,
        });
        await finishLiveMutation(next);
      } catch (error) {
        trackRoadToGoalError({
          action: 'cashout',
          status: error instanceof RoadToGoalApiError ? error.status : null,
          errorName: error instanceof Error ? error.name : 'unknown',
        });
        if (isDefinitiveMutationError(error)) {
          pendingMutationRef.current = null;
          setLiveError(error.message);
        } else {
          await reconcileLive(state.round_id);
          if (pendingMutationRef.current) {
            setLiveError(error instanceof Error ? error.message : 'Request failed');
          }
        }
      } finally {
        setBusy(false);
      }
      return;
    }
    setPayout(currentReturn);
    setBalance((value) => value + currentReturn);
    trackDemoSettlement('cashed', 'demo_cashout', currentReturn, progress);
    setPhase('cashed');
  };

  const reset = () => {
    if (live) {
      forgetRoadToGoalRound(liveStateRef.current?.round_id);
      liveStateRef.current = null;
      committedBeforeSeedRef.current = null;
      setLiveState(null);
      setLiveQuestion(undefined);
      setLiveOptionIds([]);
      setProof(null);
      setProofVerified(null);
      setClientSeed(randomClientValue());
      pendingMutationRef.current = null;
      void refetchWallet();
    }
    setPhase('idle');
    setProgress(0);
    setSelected(null);
    setRemaining(QUESTION_MS);
  };

  const answerState = (index: number) => {
    if (selected === null || !question) return 'idle';
    if (index === question.answer) return 'correct';
    if (index === selected) return 'wrong';
    return 'dim';
  };

  return (
    <MiniGameShell
      backHref={backHref}
      title={copy.title}
      subtitle={copy.subtitle}
      accent="#58CC02"
      wide
      headerRight={<StatPill label={copy.balance} value={points(effectiveBalance)} color="#FFE500" />}
    >
      <div className="mt-1.5 grid items-start gap-2.5 sm:mt-2 sm:gap-3 lg:grid-cols-[minmax(0,1fr)_300px] xl:grid-cols-[minmax(0,1fr)_320px]">
        <div className="min-w-0 self-start">
          <RoadScene
            progress={progress}
            phase={phase}
            labels={{ liveRoute: copy.liveRoute, safe: copy.safe, target: copy.target }}
          />
        </div>

        <div className="relative flex min-h-[238px] flex-col overflow-hidden rounded-[16px] border border-white/20 bg-brand-blue p-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.2),0_14px_30px_rgba(22,69,255,0.24)] sm:min-h-[260px] sm:rounded-[20px] sm:p-3.5 sm:shadow-[inset_0_1px_0_rgba(255,255,255,0.2),0_18px_42px_rgba(22,69,255,0.28)]">
          <div className="pointer-events-none absolute -right-16 -top-28 size-72 rounded-full border-[42px] border-white/[0.055]" />
          <div className="pointer-events-none absolute bottom-0 left-[42%] h-full w-px rotate-[24deg] bg-white/10" />
          <AnimatePresence mode="wait">
            {phase === 'idle' && (
              <motion.div key="idle" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="relative z-10 flex flex-1 flex-col justify-center gap-3 sm:gap-4">
                <div>
                  <div className="mb-2 flex items-center gap-2 font-poppins text-[9px] font-black uppercase tracking-[0.18em] text-brand-yellow">
                    <Flag className="size-3.5" /> {copy.introEyebrow}
                  </div>
                  <h2 className="font-poppins text-lg font-black uppercase leading-[0.98] text-white sm:text-xl">
                    {copy.introTitle}
                  </h2>
                  <p className="mt-2 font-poppins text-[10px] font-semibold leading-relaxed text-white/70">{copy.introBody}</p>
                </div>

                <div className="rounded-xl border border-white/20 bg-[#071D5B]/45 p-2 sm:p-2.5 backdrop-blur-sm">
                  <div className="mb-2 font-poppins text-[9px] font-black uppercase tracking-[0.18em] text-white/65">{copy.stake}</div>
                  <div className="grid grid-cols-3 gap-2">
                    {STAKES.map((value, index) => {
                      const colors = ['#D8F4FF', '#FFE500', '#FF9600'];
                      const selectedStake = stake === value;
                      return (
                        <button
                          key={value}
                          type="button"
                          onClick={() => setStake(value)}
                          className="rounded-lg border py-1.5 font-poppins text-xs font-black tabular-nums transition-all"
                          style={{
                            borderColor: selectedStake ? colors[index] : 'rgba(255,255,255,.2)',
                            color: selectedStake ? colors[index] : 'rgba(255,255,255,.62)',
                            background: selectedStake ? `${colors[index]}20` : 'rgba(3,28,51,.24)',
                          }}
                        >
                          {value}
                        </button>
                      );
                    })}
                  </div>

                  {live && (
                    <div className="mt-2 grid gap-2 border-t border-white/10 pt-2">
                      <label className="grid gap-1 font-poppins text-[8px] font-black uppercase tracking-wider text-white/55">
                        {locale === 'ka' ? 'კლიენტის seed' : 'Client seed'}
                        <input
                          value={clientSeed}
                          onChange={(event) => setClientSeed(event.target.value.slice(0, 128))}
                          disabled={busy || !newRunsEnabled}
                          className="h-8 rounded-lg border border-white/15 bg-[#06142E]/65 px-2 text-[9px] normal-case tracking-normal text-white outline-none focus:border-brand-cyan"
                        />
                      </label>
                      <label className="grid gap-1 font-poppins text-[8px] font-black uppercase tracking-wider text-white/55">
                        {locale === 'ka' ? 'ავტომატურად აიღე' : 'Auto-bank'}
                        <select
                          value={autoCashoutZone ?? 0}
                          onChange={(event) => setAutoCashoutZone(Number(event.target.value) || null)}
                          disabled={busy || !newRunsEnabled}
                          className="h-8 rounded-lg border border-white/15 bg-[#06142E]/65 px-2 text-[9px] text-white outline-none focus:border-brand-cyan"
                        >
                          <option value={0}>{locale === 'ka' ? 'გამორთულია' : 'Off'}</option>
                          {MULTIPLIERS.slice(0, 10).map((multiplier, index) => (
                            <option key={multiplier} value={index + 1}>
                              {locale === 'ka' ? 'ზონა' : 'Zone'} {index + 1} · {multiplier.toFixed(2)}×
                            </option>
                          ))}
                        </select>
                      </label>
                    </div>
                  )}

                  <button
                    type="button"
                    onClick={start}
                    disabled={
                      effectiveBalance < stake
                      || busy
                      || (live && (!newRunsEnabled || !wallet || !resumed))
                    }
                    className="mt-2.5 flex h-10 w-full items-center justify-center gap-2 rounded-xl bg-brand-green px-4 font-poppins text-xs font-black uppercase tracking-wide text-[#07111D] transition-[filter,transform] hover:brightness-105 active:scale-[0.99] disabled:cursor-not-allowed disabled:bg-white/10 disabled:text-white/35"
                  >
                    <Play className="size-4 fill-current" /> {fill(copy.kickOff, { stake: points(stake) })}
                  </button>
                  {effectiveBalance < stake && <p className="mt-2 text-center font-poppins text-[10px] font-bold text-brand-yellow">{copy.noFunds}</p>}
                  {live && !newRunsEnabled && (
                    <p className="mt-2 text-center font-poppins text-[10px] font-bold text-brand-yellow">
                      {locale === 'ka'
                        ? 'ახალი თამაშები დროებით გამორთულია — მიმდინარე გარბენი კვლავ დაცულია'
                        : 'New runs are paused — any active run remains available'}
                    </p>
                  )}
                  {live && walletError && <p className="mt-2 text-center font-poppins text-[10px] font-bold text-brand-orange">{locale === 'ka' ? 'ბალანსი ვერ ჩაიტვირთა' : 'Wallet unavailable'}</p>}
                </div>
              </motion.div>
            )}

            {(phase === 'question' || phase === 'correct' || phase === 'tackle') && question && (
              <motion.div key={`question-${progress}`} initial={{ opacity: 0, x: 12 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -10 }} className="relative z-10 flex flex-1 flex-col">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="font-poppins text-[9px] font-black uppercase tracking-[0.18em] text-brand-yellow">
                      {copy.zone} {progress + 1} / {ZONES} · {copy.question}
                    </div>
                    <div className="mt-1 flex items-center gap-1.5 font-poppins text-[10px] font-semibold text-white/70">
                      <Timer className="size-3.5" /> {copy.answerFast}
                    </div>
                  </div>
                  <div className="rounded-xl bg-brand-yellow px-2.5 py-1.5 text-right text-[#07111D]">
                    <div className="font-poppins text-[8px] font-black uppercase tracking-wider opacity-55">{copy.nextReturn}</div>
                    <div className="font-poppins text-sm font-black tabular-nums">{points(nextReturn)} · {nextMultiplier.toFixed(2)}×</div>
                  </div>
                </div>

                <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-white/10">
                  <motion.div
                    className={`h-full rounded-full ${timePercent < 28 ? 'bg-brand-orange' : 'bg-brand-green'}`}
                    animate={{ width: `${timePercent}%` }}
                    transition={{ duration: 0.08, ease: 'linear' }}
                  />
                </div>

                {question.image && (
                  <div className="relative mt-3 aspect-[16/7] max-h-36 overflow-hidden rounded-xl border border-white/10 bg-[#06142E]">
                    <Image
                      src={question.image.url}
                      alt=""
                      width={question.image.width}
                      height={question.image.height}
                      unoptimized
                      className="size-full object-contain"
                    />
                  </div>
                )}
                <p className="mt-3 font-poppins text-xs font-black leading-snug text-white">{question.q}</p>
                {live && liveState?.question && (
                  <div className="mt-2 grid grid-cols-2 gap-2">
                    <div className="rounded-lg border border-brand-green/35 bg-brand-green/10 px-2 py-1.5 text-center">
                      <div className="font-poppins text-[7px] font-black uppercase tracking-wide text-white/45">{locale === 'ka' ? 'სწორი პასუხი' : 'Correct answer'}</div>
                      <div className="font-poppins text-xs font-black text-brand-green">{(liveState.question.correct_survival_bp / 100).toFixed(2)}%</div>
                    </div>
                    <div className="rounded-lg border border-brand-orange/35 bg-brand-orange/10 px-2 py-1.5 text-center">
                      <div className="font-poppins text-[7px] font-black uppercase tracking-wide text-white/45">{locale === 'ka' ? 'არასწორი პასუხი' : 'Wrong answer'}</div>
                      <div className="font-poppins text-xs font-black text-brand-orange">{(liveState.question.wrong_survival_bp / 100).toFixed(2)}%</div>
                    </div>
                  </div>
                )}
                <div className="mt-2.5 grid gap-2">
                  {question.options.map((option, index) => {
                    const state = answerState(index);
                    return (
                      <button
                        key={option}
                        type="button"
                        disabled={phase !== 'question' || selected !== null}
                        onClick={() => answer(index)}
                        className={`flex min-h-10 items-center justify-between rounded-xl border-2 px-3 py-2 text-left font-poppins text-[11px] font-bold transition-all ${
                          state === 'correct'
                            ? 'border-brand-green bg-brand-green/20 text-white'
                            : state === 'wrong'
                              ? 'border-brand-orange bg-brand-orange/20 text-white'
                              : state === 'dim'
                                ? 'border-white/5 bg-white/[0.02] text-white/25'
                                : 'border-white/10 bg-white/[0.035] text-white hover:border-brand-cyan hover:bg-brand-cyan/10'
                        }`}
                      >
                        <span>{option}</span>
                        {state === 'correct' && <Check className="size-4 shrink-0 text-brand-green" />}
                        {state === 'wrong' && <X className="size-4 shrink-0 text-brand-orange" />}
                      </button>
                    );
                  })}
                </div>
              </motion.div>
            )}

            {phase === 'decision' && (
              <motion.div key="decision" initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }} className="relative z-10 flex flex-1 flex-col justify-center text-center">
                <motion.div initial={{ scale: 0.5, rotate: -12 }} animate={{ scale: 1, rotate: 0 }} className="mx-auto flex size-12 items-center justify-center rounded-full bg-brand-green text-[#07111D] shadow-[0_0_35px_rgba(88,204,2,.4)]">
                  <Check className="size-7" strokeWidth={3.5} />
                </motion.div>
                <h2 className="mt-3 font-poppins text-xl font-black uppercase text-brand-green">{copy.clean}</h2>
                <p className="mx-auto mt-1 max-w-xs font-poppins text-xs font-semibold leading-relaxed text-white/75">
                  {fill(copy.cleanBody, { zone: progress })}
                </p>
                <div className="mx-auto mt-4 rounded-2xl border border-brand-yellow/25 bg-brand-yellow/10 px-5 py-2.5">
                  <div className="font-poppins text-[9px] font-black uppercase tracking-wider text-brand-yellow/70">{copy.currentReturn}</div>
                  <div className="font-poppins text-2xl font-black tabular-nums text-brand-yellow">{points(currentReturn)} <span className="text-sm">· {currentMultiplier.toFixed(2)}×</span></div>
                </div>
                <div className="mt-3 grid gap-2">
                  <button type="button" onClick={continueRun} disabled={busy} className="h-11 rounded-xl bg-brand-orange px-3 font-poppins text-sm font-black uppercase text-[#07111D] transition-[filter,transform] hover:brightness-105 active:scale-[0.99] disabled:opacity-50">
                    {fill(copy.continue, { zone: progress + 1 })}
                  </button>
                  <button type="button" onClick={cashOut} disabled={busy} className="flex h-11 items-center justify-center gap-2 rounded-xl bg-brand-green px-3 font-poppins text-sm font-black uppercase text-[#07111D] transition-[filter,transform] hover:brightness-105 active:scale-[0.99] disabled:opacity-50">
                    <LockKeyhole className="size-4" /> {fill(copy.cashOut, { amount: points(currentReturn) })}
                  </button>
                </div>
              </motion.div>
            )}

            {phase === 'tackled' && (
              <motion.div key="tackled" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="relative z-10 flex flex-1 flex-col items-center justify-center text-center">
                <div className="flex size-12 items-center justify-center rounded-full bg-brand-orange text-[#07111D] shadow-[0_0_35px_rgba(255,150,0,.45)]">
                  <Shield className="size-7" />
                </div>
                <h2 className="mt-2 font-poppins text-xl font-black uppercase text-brand-orange">{copy.tackled}</h2>
                <p className="mt-1 max-w-xs font-poppins text-xs font-semibold leading-relaxed text-white/75">
                  {fill(copy.tackledBody, { zone: progress + 1 })}
                </p>
                {correctAnswer && (
                  <p className="mt-3 rounded-xl bg-white/[0.04] px-3 py-2 font-poppins text-[10px] font-bold text-white/55">
                    {fill(copy.correctWas, { answer: correctAnswer })}
                  </p>
                )}
                <button type="button" onClick={reset} className="mt-4 flex h-10 w-full items-center justify-center gap-2 rounded-xl bg-brand-green font-poppins text-xs font-black uppercase text-[#07111D] transition-[filter,transform] hover:brightness-105 active:scale-[0.99]">
                  <RotateCcw className="size-4" /> {copy.newRun}
                </button>
              </motion.div>
            )}

            {phase === 'cashed' && (
              <motion.div key="cashed" initial={{ opacity: 0, scale: 0.94 }} animate={{ opacity: 1, scale: 1 }} className="relative z-10 flex flex-1 flex-col items-center justify-center text-center">
                <div className="flex size-16 items-center justify-center rounded-full bg-brand-yellow text-[#07111D] shadow-[0_0_38px_rgba(255,229,0,.42)]">
                  <LockKeyhole className="size-8" />
                </div>
                <h2 className="mt-3 font-poppins text-xl font-black uppercase text-brand-yellow">{copy.cashed}</h2>
                <p className="mt-1 font-poppins text-xs font-semibold text-white/75">
                  {fill(copy.cashedBody, { zones: progress, mult: currentMultiplier.toFixed(2) })}
                </p>
                <div className="mt-3 font-poppins text-3xl font-black tabular-nums text-brand-green">+{points(payout)}</div>
                <button type="button" onClick={reset} className="mt-5 flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-brand-green font-poppins text-sm font-black uppercase text-[#07111D] transition-[filter,transform] hover:brightness-105 active:scale-[0.99]">
                  <RotateCcw className="size-4" /> {copy.startAgain}
                </button>
              </motion.div>
            )}

            {phase === 'complete' && (
              <motion.div key="complete" initial={{ opacity: 0, scale: 0.88 }} animate={{ opacity: 1, scale: 1 }} className="relative z-10 flex flex-1 flex-col items-center justify-center text-center">
                <motion.div animate={{ rotate: [0, -8, 8, 0], y: [0, -5, 0] }} transition={{ duration: 1.2, repeat: Infinity, repeatDelay: 0.8 }} className="flex size-20 items-center justify-center rounded-full bg-brand-yellow text-[#07111D] shadow-[0_0_48px_rgba(255,229,0,.55)]">
                  <Trophy className="size-10" />
                </motion.div>
                <h2 className="mt-4 font-poppins text-3xl font-black uppercase text-brand-yellow">{copy.finalTitle}</h2>
                <p className="mt-1 max-w-xs font-poppins text-xs font-semibold leading-relaxed text-white/75">{copy.finalBody}</p>
                <div className="mt-4 rounded-2xl bg-brand-green px-6 py-3 font-poppins text-xl font-black text-[#07111D]">
                  {fill(copy.won, { amount: points(payout) })}
                </div>
                <button type="button" onClick={reset} className="mt-5 flex h-11 w-full items-center justify-center gap-2 rounded-xl border border-white/35 bg-white/10 font-poppins text-sm font-black uppercase text-white transition-[background,transform] hover:bg-white/15 active:scale-[0.99]">
                  <RotateCcw className="size-4" /> {copy.startAgain}
                </button>
              </motion.div>
            )}
          </AnimatePresence>

          {liveError && (
            <p className="relative z-10 mt-2 rounded-lg border border-brand-orange/30 bg-brand-orange/10 px-2 py-1.5 text-center font-poppins text-[9px] font-bold text-brand-orange">
              {liveError}
            </p>
          )}

          {live && proof && (phase === 'cashed' || phase === 'complete' || phase === 'tackled') && (
            <details className="relative z-10 mt-2 rounded-lg border border-white/10 bg-[#06142E]/55 px-2.5 py-2 font-poppins text-[8px] text-white/55">
              <summary className="cursor-pointer font-black uppercase tracking-wider text-brand-cyan">
                {locale === 'ka' ? 'სამართლიანი თამაშის მტკიცებულება' : 'Fair-play proof'}
              </summary>
              <div className="mt-2 break-all leading-relaxed">
                <div className={proofVerified === true ? 'text-brand-green' : proofVerified === false ? 'text-brand-orange' : 'text-white/55'}>
                  {proofVerified === null
                    ? (locale === 'ka' ? 'მტკიცებულება მოწმდება…' : 'Verifying proof…')
                    : proofVerified
                      ? (locale === 'ka' ? '✓ მტკიცებულება გადამოწმებულია' : '✓ Proof independently verified')
                      : (locale === 'ka' ? '⚠ მტკიცებულება ვერ დადასტურდა' : '⚠ Proof verification failed')}
                </div>
                <div>commit: {proof.commit_hash}</div>
                <div>seed: {proof.server_seed}</div>
                <div>{proof.zones.length} {locale === 'ka' ? 'დადასტურებული გათამაშება' : 'verified rolls'}</div>
              </div>
            </details>
          )}

          {phase !== 'idle' && (
            <div className="relative z-10 mt-3 flex items-center gap-1.5 border-t border-white/15 pt-3">
              {MULTIPLIERS.map((multiplier, index) => (
                <div
                  key={multiplier}
                  className="h-1.5 flex-1 rounded-full transition-colors"
                  style={{ background: index < progress ? ZONE_COLORS[index % ZONE_COLORS.length] : index === progress ? '#FFE500' : 'rgba(255,255,255,.09)' }}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </MiniGameShell>
  );
}
