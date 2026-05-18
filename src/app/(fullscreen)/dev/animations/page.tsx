'use client';

/**
 * Dev playground for iterating on the live ranked-possession match UI without
 * a backend. Mounts the real `RealtimePossessionMatchScreen` and seeds the
 * realtime match store directly (via the same setters that the socket
 * handlers normally call). Buttons fire mock server events so animations,
 * goal celebrations, halftime, penalties etc. behave exactly like production.
 *
 * Strategy:
 * - Install a no-op socket via `__setSocketOverride` so `getSocket().emit(...)`
 *   calls inside the controller don't blow up (no real server).
 * - Seed the store on mount: lobby skipped, `setMatchStart` → first question.
 * - Side panel exposes triggers to apply round results, advance questions,
 *   force halftime / penalty / fulltime.
 *
 * Guarded by NODE_ENV; production code paths unaffected.
 */

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { RealtimePossessionMatchScreen } from '@/features/possession/RealtimePossessionMatchScreen';
import { useRealtimeMatchStore } from '@/stores/realtimeMatch.store';
import { __setSocketOverride } from '@/lib/realtime/socket-client';
import type {
  MatchRoundResultPayload,
  MatchStartPayload,
  MatchStatePayload,
  ResolvedMatchQuestionPayload,
} from '@/lib/realtime/socket.types';

const MATCH_ID = 'dev-match';
const SELF_ID = 'dev-self';
const OPP_ID = 'dev-opp';
const TOTAL_QUESTIONS = 12;
const POINTS_PER_BAR = 10;
const MAX_BARS = 12;
const DEV_PUT_ORDER_OPPONENT_DELAY_MS = 900;
const DEV_PUT_ORDER_ROUND_RESULT_DELAY_MS = 2100;
const DEV_SPECIAL_ROUND_RESULT_DELAY_MS = 1600;
const DEV_COUNTDOWN_ROUND_RESULT_DELAY_MS = 3200;

function pointsToBars(points: number): number {
  if (points <= 0) return 0;
  return Math.min(Math.max(Math.round(points / POINTS_PER_BAR), 1), MAX_BARS);
}

const SAMPLE_QUESTIONS: Array<{
  prompt: string;
  options: [string, string, string, string];
  correctIndex: number;
  categoryName: string;
}> = [
  {
    prompt: 'Which country won the 2018 FIFA World Cup?',
    options: ['Croatia', 'France', 'Belgium', 'England'],
    correctIndex: 1,
    categoryName: 'World Cup History',
  },
  {
    prompt: 'Who scored the famous "Hand of God" goal in 1986?',
    options: ['Pelé', 'Maradona', 'Zidane', 'Cruyff'],
    correctIndex: 1,
    categoryName: 'Legends',
  },
  {
    prompt: 'Which club has won the most UEFA Champions League titles?',
    options: ['Barcelona', 'Bayern', 'Real Madrid', 'AC Milan'],
    correctIndex: 2,
    categoryName: 'Club Football',
  },
  {
    prompt: 'In which year was the first FIFA World Cup held?',
    options: ['1930', '1934', '1928', '1950'],
    correctIndex: 0,
    categoryName: 'World Cup History',
  },
  {
    prompt: 'Who holds the record for most goals in a single World Cup?',
    options: ['Miroslav Klose', 'Just Fontaine', 'Ronaldo', 'Gerd Müller'],
    correctIndex: 1,
    categoryName: 'Records',
  },
];

type QuestionKind = 'multipleChoice' | 'countdown' | 'putInOrder' | 'clues';

function makeQuestion(qIndex: number, kind: QuestionKind = 'multipleChoice'): ResolvedMatchQuestionPayload {
  const sample = SAMPLE_QUESTIONS[qIndex % SAMPLE_QUESTIONS.length];
  const now = Date.now();
  const base = {
    matchId: MATCH_ID,
    qIndex,
    total: TOTAL_QUESTIONS,
    // `playableAt` in the past makes the controller's reveal timer fire
    // immediately so dev iterations don't wait the production 3s reveal.
    playableAt: new Date(now - 1000).toISOString(),
    deadlineAt: new Date(now + 60_000).toISOString(),
    phaseKind: 'normal' as const,
    phaseRound: qIndex < 6 ? qIndex + 1 : qIndex - 5,
    attackerSeat: (qIndex % 2 === 0 ? 1 : 2) as 1 | 2,
  };

  if (kind === 'countdown') {
    return {
      ...base,
      question: {
        kind: 'countdown',
        id: `dev-q-${qIndex}`,
        prompt: 'Players to score 100 or more goals for Real Madrid in all competitions',
        answerSlotCount: 15,
        categoryName: 'Real Madrid',
        difficulty: 'medium',
      },
    } as ResolvedMatchQuestionPayload;
  }
  if (kind === 'putInOrder') {
    return {
      ...base,
      question: {
        kind: 'putInOrder',
        id: `dev-q-${qIndex}`,
        prompt: 'Order these football moments from oldest to newest',
        instruction: 'Drag to reorder oldest → newest',
        direction: 'asc',
        items: [
          { id: 'mbappe', label: 'Mbappe debut', emoji: '🇫🇷', details: '2015' },
          { id: 'pele', label: 'Pele debut', emoji: '🇧🇷', details: '1956' },
          { id: 'messi', label: 'Messi debut', emoji: '🇦🇷', details: '2004' },
          { id: 'ronaldo', label: 'Ronaldo debut', emoji: '🇧🇷', details: '1993' },
          { id: 'maradona', label: 'Maradona debut', emoji: '🇦🇷', details: '1976' },
        ],
        categoryName: 'Timeline',
        difficulty: 'medium',
      },
    } as ResolvedMatchQuestionPayload;
  }
  if (kind === 'clues') {
    return {
      ...base,
      question: {
        kind: 'clues',
        id: `dev-q-${qIndex}`,
        prompt: 'Guess the player',
        clues: [
          { type: 'text', content: 'Born in Funchal, Portugal' },
          { type: 'text', content: 'Won 5 Ballon d\'Or awards' },
          { type: 'text', content: 'Played for Manchester United twice' },
          { type: 'text', content: 'Wears number 7' },
        ],
        categoryName: 'Who Am I?',
        difficulty: 'medium',
      },
    } as ResolvedMatchQuestionPayload;
  }
  // Default: multipleChoice
  return {
    ...base,
    question: {
      kind: 'multipleChoice',
      id: `dev-q-${qIndex}`,
      prompt: sample.prompt,
      options: sample.options,
      categoryName: sample.categoryName,
      difficulty: 'medium',
    },
  } as ResolvedMatchQuestionPayload;
}

function makeStartPayload(): MatchStartPayload {
  return {
    matchId: MATCH_ID,
    mode: 'ranked',
    variant: 'ranked_sim',
    mySeat: 1,
    opponent: { id: OPP_ID, username: 'Mock Opponent', avatarUrl: null },
    participants: [
      { userId: SELF_ID, username: 'Me', avatarUrl: null, seat: 1 },
      { userId: OPP_ID, username: 'Mock Opponent', avatarUrl: null, seat: 2 },
    ],
  };
}

function makeMatchState(
  phase: MatchStatePayload['phase'],
  opts: {
    stateVersion: number;
    half?: 1 | 2;
    goals?: { seat1: number; seat2: number };
    penaltyGoals?: { seat1: number; seat2: number };
    shooterSeat?: 1 | 2 | null;
    phaseKind?: 'normal' | 'last_attack' | 'penalty';
    possessionDiff?: number;
  } = { stateVersion: 1 }
): MatchStatePayload {
  return {
    matchId: MATCH_ID,
    phase,
    half: opts.half ?? 1,
    possessionDiff: opts.possessionDiff ?? 0,
    normalQuestionsAnsweredInHalf: 0,
    attackerSeat: 1,
    kickOffSeat: 1,
    goals: opts.goals ?? { seat1: 0, seat2: 0 },
    penaltyGoals: opts.penaltyGoals ?? { seat1: 0, seat2: 0 },
    phaseKind: opts.phaseKind ?? 'normal',
    phaseRound: 1,
    shooterSeat: opts.shooterSeat ?? null,
    halftime: {
      deadlineAt: null,
      categoryOptions: [],
      firstBanSeat: null,
      bans: { seat1: null, seat2: null },
    },
    stateVersion: opts.stateVersion,
  };
}

type Outcome = 'me-correct' | 'opp-correct' | 'both-correct' | 'both-wrong' | 'goal-me' | 'goal-opp' | 'shot-saved';

interface DevSocketEmitDetail {
  event: string;
  args: unknown[];
}

function makeRoundResult(
  qIndex: number,
  outcome: Outcome,
  scores: { meTotal: number; oppTotal: number },
  customPoints: { me: number; opp: number }
): MatchRoundResultPayload {
  const sample = SAMPLE_QUESTIONS[qIndex % SAMPLE_QUESTIONS.length];

  const meCorrect = outcome === 'me-correct' || outcome === 'both-correct' || outcome === 'goal-me';
  const oppCorrect = outcome === 'opp-correct' || outcome === 'both-correct' || outcome === 'goal-opp';

  const goalScoredBySeat: 1 | 2 | null =
    outcome === 'goal-me' ? 1 : outcome === 'goal-opp' ? 2 : null;

  // Points earned only count when that side was correct. Custom sliders let
  // you preview big-vs-small bar battles (e.g. +80 vs +10 → 8 bars vs 1).
  const mePoints = meCorrect ? customPoints.me : 0;
  const oppPoints = oppCorrect ? customPoints.opp : 0;
  const possessionDelta = mePoints - oppPoints;

  return {
    matchId: MATCH_ID,
    qIndex,
    questionKind: 'multipleChoice',
    reveal: {
      kind: 'multipleChoice',
      correctIndex: sample.correctIndex,
    },
    players: {
      [SELF_ID]: {
        totalPoints: scores.meTotal + mePoints,
        pointsEarned: mePoints,
        isCorrect: meCorrect,
        timeMs: 3000,
        selectedIndex: meCorrect ? sample.correctIndex : (sample.correctIndex + 1) % 4,
        submittedOrderIds: [],
      },
      [OPP_ID]: {
        totalPoints: scores.oppTotal + oppPoints,
        pointsEarned: oppPoints,
        isCorrect: oppCorrect,
        timeMs: 4200,
        selectedIndex: oppCorrect ? sample.correctIndex : (sample.correctIndex + 2) % 4,
        submittedOrderIds: [],
      },
    },
    phaseKind: 'normal',
    phaseRound: qIndex < 6 ? qIndex + 1 : qIndex - 5,
    deltas: {
      possessionDelta,
      goalScoredBySeat,
      penaltyOutcome: null,
    },
  };
}

// qIndex range reserved for penalty kicks so it doesn't collide with the
// normal-play range. The dev sim cycles kicks under this base.
const PENALTY_QINDEX_BASE = 1000;

function makePenaltyQuestion(qIndex: number, shooterSeat: 1 | 2): ResolvedMatchQuestionPayload {
  const sample = SAMPLE_QUESTIONS[qIndex % SAMPLE_QUESTIONS.length];
  const now = Date.now();
  return {
    matchId: MATCH_ID,
    qIndex,
    total: TOTAL_QUESTIONS,
    playableAt: new Date(now - 1000).toISOString(),
    deadlineAt: new Date(now + 60_000).toISOString(),
    phaseKind: 'penalty',
    phaseRound: ((qIndex - PENALTY_QINDEX_BASE) % 10) + 1,
    attackerSeat: shooterSeat,
    shooterSeat,
    question: {
      kind: 'multipleChoice',
      id: `dev-pen-q-${qIndex}`,
      prompt: sample.prompt,
      options: sample.options,
      categoryName: sample.categoryName,
      difficulty: 'medium',
    },
  } as ResolvedMatchQuestionPayload;
}

function makePenaltyRoundResult(
  qIndex: number,
  shooterSeat: 1 | 2,
  outcome: 'goal' | 'saved',
  scores: { meTotal: number; oppTotal: number }
): MatchRoundResultPayload {
  const sample = SAMPLE_QUESTIONS[qIndex % SAMPLE_QUESTIONS.length];
  // Field-state derives penaltyOutcome straight from deltas.penaltyOutcome,
  // so per-player correctness is decorative here — pick a plausible combo:
  // goal = shooter correct, keeper wrong; saved = keeper correct.
  const shooterCorrect = outcome === 'goal';
  const keeperCorrect = outcome === 'saved';
  const shooterIsMe = shooterSeat === 1;
  const meCorrect = shooterIsMe ? shooterCorrect : keeperCorrect;
  const oppCorrect = shooterIsMe ? keeperCorrect : shooterCorrect;
  return {
    matchId: MATCH_ID,
    qIndex,
    questionKind: 'multipleChoice',
    reveal: { kind: 'multipleChoice', correctIndex: sample.correctIndex },
    players: {
      [SELF_ID]: {
        totalPoints: scores.meTotal,
        pointsEarned: 0,
        isCorrect: meCorrect,
        timeMs: meCorrect ? 2500 : 6000,
        selectedIndex: meCorrect ? sample.correctIndex : (sample.correctIndex + 1) % 4,
        submittedOrderIds: [],
      },
      [OPP_ID]: {
        totalPoints: scores.oppTotal,
        pointsEarned: 0,
        isCorrect: oppCorrect,
        timeMs: oppCorrect ? 3000 : 6000,
        selectedIndex: oppCorrect ? sample.correctIndex : (sample.correctIndex + 2) % 4,
        submittedOrderIds: [],
      },
    },
    phaseKind: 'penalty',
    phaseRound: null,
    shooterSeat,
    attackerSeat: shooterSeat,
    deltas: {
      possessionDelta: 0,
      goalScoredBySeat: null,
      penaltyOutcome: outcome,
    },
  };
}

const PUT_IN_ORDER_CORRECT = [
  { id: 'pele', label: { en: 'Pele debut' }, details: { en: '1956' }, emoji: '🇧🇷', sortValue: 1 },
  { id: 'maradona', label: { en: 'Maradona debut' }, details: { en: '1976' }, emoji: '🇦🇷', sortValue: 2 },
  { id: 'ronaldo', label: { en: 'Ronaldo debut' }, details: { en: '1993' }, emoji: '🇧🇷', sortValue: 3 },
  { id: 'messi', label: { en: 'Messi debut' }, details: { en: '2004' }, emoji: '🇦🇷', sortValue: 4 },
  { id: 'mbappe', label: { en: 'Mbappe debut' }, details: { en: '2015' }, emoji: '🇫🇷', sortValue: 5 },
] as const;

function makePutInOrderRoundResult(
  qIndex: number,
  orderedItemIds: string[],
  scores: { meTotal: number; oppTotal: number },
  options?: { opponentOrderedItemIds?: string[] }
): MatchRoundResultPayload {
  const correctIds = PUT_IN_ORDER_CORRECT.map((item) => item.id);
  const opponentOrderedItemIds = options?.opponentOrderedItemIds ?? [...correctIds].reverse();
  const meFoundCount = orderedItemIds.reduce((count, itemId, index) => (
    correctIds[index] === itemId ? count + 1 : count
  ), 0);
  const oppFoundCount = opponentOrderedItemIds.reduce((count, itemId, index) => (
    correctIds[index] === itemId ? count + 1 : count
  ), 0);
  const meCorrect = orderedItemIds.join('|') === correctIds.join('|');
  const oppCorrect = opponentOrderedItemIds.join('|') === correctIds.join('|');
  const mePoints = Math.min(meFoundCount, 5) * 20;
  const oppPoints = Math.min(oppFoundCount, 5) * 20;
  const possessionDelta = mePoints - oppPoints;

  return {
    matchId: MATCH_ID,
    qIndex,
    questionKind: 'putInOrder',
    reveal: {
      kind: 'putInOrder',
      correctOrder: PUT_IN_ORDER_CORRECT.map((item) => ({ ...item })),
    },
    players: {
      [SELF_ID]: {
        totalPoints: scores.meTotal + mePoints,
        pointsEarned: mePoints,
        isCorrect: meCorrect,
        timeMs: 2800,
        selectedIndex: null,
        foundCount: meFoundCount,
        submittedOrderIds: orderedItemIds,
      },
      [OPP_ID]: {
        totalPoints: scores.oppTotal + oppPoints,
        pointsEarned: oppPoints,
        isCorrect: oppCorrect,
        timeMs: 6000,
        selectedIndex: null,
        foundCount: oppFoundCount,
        submittedOrderIds: opponentOrderedItemIds,
      },
    },
    phaseKind: 'normal',
    phaseRound: qIndex < 6 ? qIndex + 1 : qIndex - 5,
    deltas: {
      possessionDelta,
      goalScoredBySeat: possessionDelta >= 100 ? 1 : possessionDelta <= -100 ? 2 : null,
      penaltyOutcome: null,
    },
  };
}

const COUNTDOWN_ANSWERS = [
  { id: 'ronaldo', display: { en: 'Cristiano Ronaldo' } },
  { id: 'benzema', display: { en: 'Karim Benzema' } },
  { id: 'raul', display: { en: 'Raul' } },
  { id: 'di-stefano', display: { en: 'Alfredo Di Stefano' } },
  { id: 'puskas', display: { en: 'Ferenc Puskas' } },
  { id: 'higuain', display: { en: 'Gonzalo Higuain' } },
  { id: 'santillana', display: { en: 'Santillana' } },
  { id: 'butragueno', display: { en: 'Emilio Butragueno' } },
  { id: 'pirri', display: { en: 'Pirri' } },
  { id: 'gento', display: { en: 'Paco Gento' } },
  { id: 'amancio', display: { en: 'Amancio Amaro' } },
  { id: 'sanchez', display: { en: 'Hugo Sanchez' } },
  { id: 'juanito', display: { en: 'Juanito' } },
  { id: 'molowny', display: { en: 'Luis Molowny' } },
  { id: 'morientes', display: { en: 'Fernando Morientes' } },
] as const;

function makeCountdownRoundResult(
  qIndex: number,
  scores: { meTotal: number; oppTotal: number },
  options: { meFoundCount?: number; oppFoundCount?: number } = {}
): MatchRoundResultPayload {
  const totalAnswers = COUNTDOWN_ANSWERS.length;
  const meFoundCount = options.meFoundCount ?? totalAnswers;
  const oppFoundCount = options.oppFoundCount ?? 0;
  const meFoundAnswerIds = COUNTDOWN_ANSWERS.slice(0, meFoundCount).map((answer) => answer.id);
  const oppFoundAnswerIds = COUNTDOWN_ANSWERS.slice(0, oppFoundCount).map((answer) => answer.id);
  const mePoints = Math.round((meFoundAnswerIds.length / totalAnswers) * 100);
  const oppPoints = Math.round((oppFoundAnswerIds.length / totalAnswers) * 100);
  const possessionDelta = mePoints - oppPoints;
  return {
    matchId: MATCH_ID,
    qIndex,
    questionKind: 'countdown',
    reveal: {
      kind: 'countdown',
      answerGroups: COUNTDOWN_ANSWERS.map((answer) => ({ ...answer })),
    },
    players: {
      [SELF_ID]: {
        totalPoints: scores.meTotal + mePoints,
        pointsEarned: mePoints,
        isCorrect: meFoundAnswerIds.length > oppFoundAnswerIds.length,
        timeMs: 2600,
        selectedIndex: null,
        foundCount: meFoundAnswerIds.length,
        foundAnswerIds: meFoundAnswerIds,
        submittedOrderIds: [],
      },
      [OPP_ID]: {
        totalPoints: scores.oppTotal + oppPoints,
        pointsEarned: oppPoints,
        isCorrect: oppFoundAnswerIds.length > meFoundAnswerIds.length,
        timeMs: 6000,
        selectedIndex: null,
        foundCount: oppFoundAnswerIds.length,
        foundAnswerIds: oppFoundAnswerIds,
        submittedOrderIds: [],
      },
    },
    phaseKind: 'normal',
    phaseRound: qIndex < 6 ? qIndex + 1 : qIndex - 5,
    deltas: {
      possessionDelta,
      goalScoredBySeat: possessionDelta >= 100 ? 1 : possessionDelta <= -100 ? 2 : null,
      penaltyOutcome: null,
    },
  };
}

function makeCluesRoundResult(
  qIndex: number,
  scores: { meTotal: number; oppTotal: number },
  options: {
    mePoints?: number;
    oppPoints?: number;
    meClueIndex?: number | null;
    oppClueIndex?: number | null;
  } = {}
): MatchRoundResultPayload {
  const mePoints = options.mePoints ?? 100;
  const oppPoints = options.oppPoints ?? 0;
  const possessionDelta = mePoints - oppPoints;
  return {
    matchId: MATCH_ID,
    qIndex,
    questionKind: 'clues',
    reveal: {
      kind: 'clues',
      displayAnswer: { en: 'Cristiano Ronaldo' },
    },
    players: {
      [SELF_ID]: {
        totalPoints: scores.meTotal + mePoints,
        pointsEarned: mePoints,
        isCorrect: mePoints > 0,
        timeMs: 2400,
        selectedIndex: null,
        clueIndex: options.meClueIndex ?? 2,
        submittedOrderIds: [],
      },
      [OPP_ID]: {
        totalPoints: scores.oppTotal + oppPoints,
        pointsEarned: oppPoints,
        isCorrect: oppPoints > 0,
        timeMs: 6000,
        selectedIndex: null,
        clueIndex: options.oppClueIndex ?? null,
        submittedOrderIds: [],
      },
    },
    phaseKind: 'normal',
    phaseRound: qIndex < 6 ? qIndex + 1 : qIndex - 5,
    deltas: {
      possessionDelta,
      goalScoredBySeat: possessionDelta >= 100 ? 1 : possessionDelta <= -100 ? 2 : null,
      penaltyOutcome: null,
    },
  };
}

// ─── Minimal stub socket — emits go nowhere, .on / .off no-op ──────────────

function createStubSocket() {
  // Only the methods the production code touches: emit/on/off/once/connected.
  // We type-cast to `any` because socket.io-client's exhaustive type union is
  // not worth replicating — emit() is fire-and-forget and we discard it.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const stub: any = {
    id: 'stub',
    connected: true,
    active: true,
    auth: {},
    emit: (...args: unknown[]) => {
      // eslint-disable-next-line no-console
      console.debug('[dev/animations] socket.emit ignored', args);
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent<DevSocketEmitDetail>('dev:socket-emit', {
          detail: {
            event: String(args[0] ?? ''),
            args: args.slice(1),
          },
        }));
      }
      return stub;
    },
    on: () => stub,
    once: () => stub,
    off: () => stub,
    removeListener: () => stub,
    removeAllListeners: () => stub,
    connect: () => stub,
    disconnect: () => stub,
    listenersAny: () => [],
    listeners: () => [],
  };
  return stub;
}

export default function DevAnimationsPage() {
  if (process.env.NODE_ENV !== 'development') {
    return (
      <div className="min-h-dvh bg-surface-deep flex items-center justify-center text-white font-fun">
        Dev only
      </div>
    );
  }
  return <DevAnimationsContent />;
}

function DevAnimationsContent() {
  const router = useRouter();

  const store = useRealtimeMatchStore.getState;
  const match = useRealtimeMatchStore((s) => s.match);
  const matchPhase = useRealtimeMatchStore((s) => s.match?.possessionState?.phase ?? null);
  const currentQIndex = useRealtimeMatchStore((s) => s.match?.currentQuestion?.qIndex ?? null);

  const stateVersion = useRef(0);
  const scoreRef = useRef({ meTotal: 0, oppTotal: 0 });
  const goalsRef = useRef({ seat1: 0, seat2: 0 });
  // Penalty shootout sim: tracks accumulated penalty goals and the running
  // qIndex offset for each kick so consecutive kicks don't collide.
  const penaltyGoalsRef = useRef({ seat1: 0, seat2: 0 });
  const penaltyKickIndexRef = useRef(0);
  // possessionDiff drives the avatar X position on the pitch. Production
  // updates it via match:state after each round result; we mirror that here
  // so the avatars actually push when bars survive.
  const possessionDiffRef = useRef(0);
  // Tracks all in-flight timers from `fireOutcome` so we can cancel them on
  // next-question / reset (otherwise a late opp-answered or roundResult can
  // arrive after the question already advanced and leave the screen wedged).
  const pendingTimers = useRef<number[]>([]);

  // Custom points the next outcome will award. 10 pts = 1 bar in the bar
  // battle (capped at 12 bars), so the splash text + bar count both follow.
  const [myPoints, setMyPoints] = useState(10);
  const [oppPoints, setOppPoints] = useState(10);

  // Question kind for the NEXT question fired (via start() or nextQuestion()).
  // Lets us preview the yellow badge drop-in animation on each special panel.
  const [nextQuestionKind, setNextQuestionKind] = useState<QuestionKind>('multipleChoice');

  // `remountKey` is used as React key on `RealtimePossessionMatchScreen`. We
  // bump it on each next-question so the controller's internal hook state
  // (roundResultHoldDone, showOptions, firstQuestionIntro etc.) re-initialises
  // cleanly — otherwise dev clicks can land between phases and wedge the UI.
  const [remountKey, setRemountKey] = useState(0);
  // Mobile-only: controls drawer toggle. Defaults open so the user lands
  // straight on the controls, can tap "✕" to dismiss and watch the
  // animation full-screen.
  const [mobilePanelOpen, setMobilePanelOpen] = useState(true);

  // Seed: self user id + start match + first question.
  function start() {
    pendingTimers.current.forEach((t) => window.clearTimeout(t));
    pendingTimers.current = [];
    stateVersion.current = 0;
    scoreRef.current = { meTotal: 0, oppTotal: 0 };
    goalsRef.current = { seat1: 0, seat2: 0 };
    penaltyGoalsRef.current = { seat1: 0, seat2: 0 };
    penaltyKickIndexRef.current = 0;
    possessionDiffRef.current = 0;

    const s = store();
    s.reset();
    s.setSelfUserId(SELF_ID);
    s.setMatchStart(makeStartPayload());
    // Clear the kickoff countdown — dev playground skips it so the first
    // question + round animations render instantly.
    useRealtimeMatchStore.setState((prev) =>
      prev.match ? { ...prev, match: { ...prev.match, countdownEndsAt: null } } : prev
    );
    // Bring the match into NORMAL_PLAY so the question UI is visible
    stateVersion.current += 1;
    s.setMatchState(makeMatchState('NORMAL_PLAY', { stateVersion: stateVersion.current }));
    s.setMatchQuestion(makeQuestion(0, nextQuestionKind));
  }

  // Wait for the DOM to be ready before firing scoring events. The ranked-sim
  // flight overlay reads `data-splash-anchor` + `data-pitch-avatar` positions
  // from screen; if we fire while the panel is still fading in, the flight can
  // miss its anchors.
  const waitForAnchors = (cb: () => void) => {
    const startTime = performance.now();
    const tick = () => {
      const player = document.querySelector('[data-splash-anchor="player"]');
      const oppEl = document.querySelector('[data-splash-anchor="opponent"]');
      const playerPitch = document.querySelector('[data-pitch-avatar="player"]');
      const oppPitch = document.querySelector('[data-pitch-avatar="opponent"]');
      const ready = [player, oppEl, playerPitch, oppPitch].every((el) => {
        if (!el) return false;
        const rect = el.getBoundingClientRect();
        if (rect.width <= 0 || rect.height <= 0) return false;
        const style = window.getComputedStyle(el);
        const opacity = Number.parseFloat(style.opacity);
        return (Number.isNaN(opacity) || opacity > 0.95) && style.visibility !== 'hidden';
      });
      if (ready || performance.now() - startTime > 1500) {
        cb();
        return;
      }
      window.setTimeout(tick, 50);
    };
    window.setTimeout(tick, 50);
  };

  function schedulePostRoundPossessionState(result: MatchRoundResultPayload, roundResultDelayMs = 1600) {
    const delta = result.deltas?.possessionDelta
      ?? ((result.players[SELF_ID]?.pointsEarned ?? 0) - (result.players[OPP_ID]?.pointsEarned ?? 0));
    if (delta === 0 || result.deltas?.goalScoredBySeat) return;

    const newDiff = Math.max(-99, Math.min(99, possessionDiffRef.current + delta));
    // Production sends the authoritative match:state right after round_result.
    // The field hook stores that target while locked, then releases after the
    // bar battle so the avatars move at the correct moment.
    const moveDelayMs = roundResultDelayMs + 120;
    possessionDiffRef.current = newDiff;
    pendingTimers.current.push(
      window.setTimeout(() => {
        stateVersion.current += 1;
        store().setMatchState(
          makeMatchState('NORMAL_PLAY', {
            stateVersion: stateVersion.current,
            half: 1,
            goals: goalsRef.current,
            possessionDiff: newDiff,
          })
        );
      }, moveDelayMs)
    );
  }

  useEffect(() => {
    // Install inside the effect so React Strict Mode's dev-only cleanup/replay
    // cannot leave the page with the override cleared.
    __setSocketOverride(createStubSocket());
    start();
    return () => {
      // Cleanup socket override + pending timers on unmount.
      pendingTimers.current.forEach((t) => window.clearTimeout(t));
      pendingTimers.current = [];
      __setSocketOverride(null);
      useRealtimeMatchStore.getState().reset();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const handleDevSocketEmit = (event: Event) => {
      const detail = (event as CustomEvent<DevSocketEmitDetail>).detail;
      if (!detail?.event) return;
      if (detail.event === 'match:put_in_order_answer') {
        handlePutInOrderSubmit(detail.args[0]);
        return;
      }
      if (detail.event === 'match:countdown_guess') {
        handleCountdownGuess(detail.args[0]);
        return;
      }
      if (detail.event === 'match:clues_answer') {
        handleCluesAnswer(detail.args[0]);
      }
    };

    window.addEventListener('dev:socket-emit', handleDevSocketEmit);
    return () => window.removeEventListener('dev:socket-emit', handleDevSocketEmit);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function loadPutInOrderScenario(mode: 'goal' | 'partial') {
    setMobilePanelOpen(false);
    pendingTimers.current.forEach((t) => window.clearTimeout(t));
    pendingTimers.current = [];

    const s = store();
    const activeQIndex = s.match?.currentQuestion?.qIndex ?? -1;
    const qIndex = Math.min(activeQIndex + 1, TOTAL_QUESTIONS - 1);
    const correctOrder = PUT_IN_ORDER_CORRECT.map((item) => item.id);
    const myOrder = mode === 'goal'
      ? correctOrder
      : ['pele', 'maradona', 'mbappe', 'ronaldo', 'messi'];
    const opponentOrder = mode === 'goal'
      ? ['maradona', 'pele', 'mbappe', 'ronaldo', 'messi']
      : ['maradona', 'pele', 'ronaldo', 'mbappe', 'messi'];

    stateVersion.current += 1;
    s.setMatchState(makeMatchState('NORMAL_PLAY', {
      stateVersion: stateVersion.current,
      goals: goalsRef.current,
      possessionDiff: possessionDiffRef.current,
    }));

    useRealtimeMatchStore.setState((prev) =>
      prev.match
        ? {
            ...prev,
            match: {
              ...prev.match,
              lastRoundResult: null,
              answerAck: null,
              countdownGuessAck: null,
              cluesGuessAck: null,
              opponentAnswered: false,
              opponentSelectedIndex: null,
              opponentRecentPoints: 0,
              opponentAnsweredCorrectly: null,
              currentQuestionPhase: 'reveal',
            },
          }
        : prev
    );

    s.setMatchQuestion(makeQuestion(qIndex, 'putInOrder'));
    setNextQuestionKind('putInOrder');
    setRemountKey((k) => k + 1);

    pendingTimers.current.push(
      window.setTimeout(() => {
        const result = makePutInOrderRoundResult(qIndex, myOrder, scoreRef.current, {
          opponentOrderedItemIds: opponentOrder,
        });
        playPrebuiltSpecialResult(result, mode === 'goal' ? 350 : 500);
      }, 900)
    );
  }

  function loadSpecialScenario(kind: Extract<QuestionKind, 'countdown' | 'clues'>, mode: 'goal' | 'goal-opp' | 'partial') {
    setMobilePanelOpen(false);
    pendingTimers.current.forEach((t) => window.clearTimeout(t));
    pendingTimers.current = [];

    const s = store();
    const activeQIndex = s.match?.currentQuestion?.qIndex ?? -1;
    const qIndex = Math.min(activeQIndex + 1, TOTAL_QUESTIONS - 1);

    stateVersion.current += 1;
    s.setMatchState(makeMatchState('NORMAL_PLAY', {
      stateVersion: stateVersion.current,
      goals: goalsRef.current,
      possessionDiff: possessionDiffRef.current,
    }));

    useRealtimeMatchStore.setState((prev) =>
      prev.match
        ? {
            ...prev,
            match: {
              ...prev.match,
              lastRoundResult: null,
              answerAck: null,
              countdownGuessAck: null,
              cluesGuessAck: null,
              opponentAnswered: false,
              opponentSelectedIndex: null,
              opponentRecentPoints: 0,
              opponentAnsweredCorrectly: null,
              currentQuestionPhase: 'reveal',
            },
          }
        : prev
    );

    s.setMatchQuestion(makeQuestion(qIndex, kind));
    setNextQuestionKind(kind);
    setRemountKey((k) => k + 1);

    pendingTimers.current.push(
      window.setTimeout(() => {
        waitForAnchors(() => {
          const result = kind === 'countdown'
            ? makeCountdownRoundResult(qIndex, scoreRef.current, mode === 'goal'
              ? { meFoundCount: 15, oppFoundCount: 0 }
              : mode === 'goal-opp'
                ? { meFoundCount: 0, oppFoundCount: 15 }
              : { meFoundCount: 7, oppFoundCount: 3 })
            : makeCluesRoundResult(qIndex, scoreRef.current, mode === 'goal'
              ? { mePoints: 100, oppPoints: 0, meClueIndex: 2, oppClueIndex: null }
              : mode === 'goal-opp'
                ? { mePoints: 0, oppPoints: 100, meClueIndex: null, oppClueIndex: 3 }
              : { mePoints: 50, oppPoints: 25, meClueIndex: 3, oppClueIndex: 4 });
          playPrebuiltSpecialResult(
            result,
            mode === 'goal' || mode === 'goal-opp' ? 350 : 500,
            { roundResultDelayMs: kind === 'countdown' ? DEV_COUNTDOWN_ROUND_RESULT_DELAY_MS : undefined }
          );
        });
      }, 900)
    );
  }

  function loadEdgeBarDemo(winner: 'green' | 'red') {
    setMobilePanelOpen(false);
    pendingTimers.current.forEach((t) => window.clearTimeout(t));
    pendingTimers.current = [];

    const s = store();
    const activeQIndex = s.match?.currentQuestion?.qIndex ?? -1;
    const qIndex = Math.min(activeQIndex + 1, TOTAL_QUESTIONS - 1);
    const edgeDiff = 80;
    possessionDiffRef.current = edgeDiff;

    stateVersion.current += 1;
    s.setMatchState(makeMatchState('NORMAL_PLAY', {
      stateVersion: stateVersion.current,
      goals: goalsRef.current,
      possessionDiff: edgeDiff,
    }));

    useRealtimeMatchStore.setState((prev) =>
      prev.match
        ? {
            ...prev,
            match: {
              ...prev.match,
              lastRoundResult: null,
              answerAck: null,
              countdownGuessAck: null,
              cluesGuessAck: null,
              opponentAnswered: false,
              opponentSelectedIndex: null,
              opponentRecentPoints: 0,
              opponentAnsweredCorrectly: null,
              currentQuestionPhase: 'reveal',
            },
          }
        : prev
    );

    s.setMatchQuestion(makeQuestion(qIndex, 'multipleChoice'));
    setNextQuestionKind('multipleChoice');
    setRemountKey((k) => k + 1);

    const greenPoints = winner === 'green' ? 100 : 40;
    const redPoints = winner === 'red' ? 100 : 40;

    pendingTimers.current.push(
      window.setTimeout(() => {
        setMyPoints(greenPoints);
        setOppPoints(redPoints);
        waitForAnchors(() => {
          const baseResult = makeRoundResult(qIndex, 'both-correct', scoreRef.current, {
            me: greenPoints,
            opp: redPoints,
          });
          const survivingDelta = pointsToBars(greenPoints) - pointsToBars(redPoints);
          const projectedDiff = edgeDiff + survivingDelta * 9;
          const edgeGoalScoredBySeat: 1 | 2 | null =
            projectedDiff >= 100 ? 1 : projectedDiff <= -100 ? 2 : null;
          const result: MatchRoundResultPayload = edgeGoalScoredBySeat
            ? {
                ...baseResult,
                deltas: {
                  possessionDelta: baseResult.deltas?.possessionDelta ?? greenPoints - redPoints,
                  penaltyOutcome: baseResult.deltas?.penaltyOutcome ?? null,
                  goalScoredBySeat: edgeGoalScoredBySeat,
                },
              }
            : baseResult;
          const me = result.players[SELF_ID];
          const opp = result.players[OPP_ID];
          if (!me || !opp) return;
          const sample = SAMPLE_QUESTIONS[qIndex % SAMPLE_QUESTIONS.length];

          s.setAnswerAck({
            matchId: MATCH_ID,
            qIndex,
            questionKind: 'multipleChoice',
            selectedIndex: me.selectedIndex,
            isCorrect: true,
            correctIndex: sample.correctIndex,
            myTotalPoints: me.totalPoints,
            oppAnswered: false,
            pointsEarned: me.pointsEarned,
            phaseKind: 'normal',
            phaseRound: result.phaseRound ?? null,
          });

          pendingTimers.current.push(
            window.setTimeout(() => {
              s.setOpponentAnswered({
                matchId: MATCH_ID,
                qIndex,
                opponentTotalPoints: opp.totalPoints,
                pointsEarned: opp.pointsEarned,
                isCorrect: true,
                selectedIndex: opp.selectedIndex,
              });
            }, 700)
          );

          pendingTimers.current.push(
            window.setTimeout(() => {
              s.setRoundResult(result);
            }, 1400)
          );
          schedulePostRoundPossessionState(result, 1400);

          scoreRef.current.meTotal = me.totalPoints;
          scoreRef.current.oppTotal = opp.totalPoints;
          if (result.deltas?.goalScoredBySeat === 1) goalsRef.current.seat1 += 1;
          if (result.deltas?.goalScoredBySeat === 2) goalsRef.current.seat2 += 1;
        });
      }, 900)
    );
  }

  function handlePutInOrderSubmit(payload: unknown) {
    if (!payload || typeof payload !== 'object') return;
    const data = payload as {
      matchId?: string;
      qIndex?: number;
      orderedItemIds?: unknown;
      timeMs?: number;
    };
    if (data.matchId !== MATCH_ID || typeof data.qIndex !== 'number' || !Array.isArray(data.orderedItemIds)) return;

    const orderedItemIds = data.orderedItemIds.filter((id): id is string => typeof id === 'string');
    const result = makePutInOrderRoundResult(data.qIndex, orderedItemIds, scoreRef.current);
    const me = result.players[SELF_ID];
    const opp = result.players[OPP_ID];
    if (!me || !opp) return;

    const s = store();
    s.setAnswerAck({
      matchId: MATCH_ID,
      qIndex: data.qIndex,
      questionKind: 'putInOrder',
      selectedIndex: null,
      isCorrect: me.isCorrect,
      myTotalPoints: me.totalPoints,
      oppAnswered: false,
      pointsEarned: me.pointsEarned,
      phaseKind: 'normal',
      phaseRound: result.phaseRound ?? null,
      foundCount: me.foundCount,
    });

    pendingTimers.current.push(
      window.setTimeout(() => {
        s.setOpponentAnswered({
          matchId: MATCH_ID,
          qIndex: data.qIndex,
          opponentTotalPoints: opp.totalPoints,
          pointsEarned: opp.pointsEarned,
          isCorrect: opp.isCorrect,
          selectedIndex: null,
        });
      }, DEV_PUT_ORDER_OPPONENT_DELAY_MS)
    );

    pendingTimers.current.push(
      window.setTimeout(() => {
        s.setRoundResult(result);
      }, DEV_PUT_ORDER_ROUND_RESULT_DELAY_MS)
    );

    schedulePostRoundPossessionState(result, DEV_PUT_ORDER_ROUND_RESULT_DELAY_MS);

    scoreRef.current.meTotal = me.totalPoints;
    scoreRef.current.oppTotal = opp.totalPoints;
    if (result.deltas?.goalScoredBySeat === 1) goalsRef.current.seat1 += 1;
    if (result.deltas?.goalScoredBySeat === 2) goalsRef.current.seat2 += 1;
  }

  function playPrebuiltSpecialResult(
    result: MatchRoundResultPayload,
    answerAckDelayMs = 250,
    opts: { roundResultDelayMs?: number } = {}
  ) {
    const me = result.players[SELF_ID];
    const opp = result.players[OPP_ID];
    if (!me || !opp) return;
    const roundResultDelayMs = opts.roundResultDelayMs ?? DEV_SPECIAL_ROUND_RESULT_DELAY_MS;

    const s = store();
    waitForAnchors(() => {
      pendingTimers.current.push(
        window.setTimeout(() => {
          s.setAnswerAck({
            matchId: MATCH_ID,
            qIndex: result.qIndex,
            questionKind: result.questionKind,
            selectedIndex: null,
            isCorrect: me.isCorrect,
            myTotalPoints: me.totalPoints,
            oppAnswered: false,
            pointsEarned: me.pointsEarned,
            phaseKind: 'normal',
            phaseRound: result.phaseRound ?? null,
            foundCount: me.foundCount,
            clueIndex: me.clueIndex,
          });
        }, answerAckDelayMs)
      );

      pendingTimers.current.push(
        window.setTimeout(() => {
          s.setOpponentAnswered({
            matchId: MATCH_ID,
            qIndex: result.qIndex,
            opponentTotalPoints: opp.totalPoints,
            pointsEarned: opp.pointsEarned,
            isCorrect: opp.isCorrect,
            selectedIndex: null,
          });
        }, answerAckDelayMs + 700)
      );

      pendingTimers.current.push(
        window.setTimeout(() => {
          s.setRoundResult(result);
        }, answerAckDelayMs + roundResultDelayMs)
      );
      schedulePostRoundPossessionState(result, answerAckDelayMs + roundResultDelayMs);
    });

    scoreRef.current.meTotal = me.totalPoints;
    scoreRef.current.oppTotal = opp.totalPoints;
    if (result.deltas?.goalScoredBySeat === 1) goalsRef.current.seat1 += 1;
    if (result.deltas?.goalScoredBySeat === 2) goalsRef.current.seat2 += 1;
  }

  function handleCountdownGuess(payload: unknown) {
    if (!payload || typeof payload !== 'object') return;
    const data = payload as {
      matchId?: string;
      qIndex?: number;
      guess?: string;
    };
    if (data.matchId !== MATCH_ID || typeof data.qIndex !== 'number') return;

    const s = store();
    const alreadyResolved = s.match?.answerAck?.qIndex === data.qIndex || s.match?.lastRoundResult?.qIndex === data.qIndex;
    if (alreadyResolved) return;

    const normalizedGuess = String(data.guess ?? '').trim().toLowerCase();
    const acceptedAnswer = COUNTDOWN_ANSWERS.find((answer) => (
      answer.display.en.toLowerCase().includes(normalizedGuess) || normalizedGuess.includes(answer.id)
    ));

    if (!acceptedAnswer || normalizedGuess.length < 3) {
      s.setCountdownGuessAck({
        matchId: MATCH_ID,
        qIndex: data.qIndex,
        accepted: false,
        duplicate: false,
        foundCount: 0,
      });
      return;
    }

    s.setCountdownGuessAck({
      matchId: MATCH_ID,
      qIndex: data.qIndex,
      accepted: true,
      duplicate: false,
      foundCount: 1,
      acceptedDisplay: acceptedAnswer.display,
    });

    playPrebuiltSpecialResult(
      makeCountdownRoundResult(data.qIndex, scoreRef.current),
      350,
      { roundResultDelayMs: DEV_COUNTDOWN_ROUND_RESULT_DELAY_MS }
    );
  }

  function handleCluesAnswer(payload: unknown) {
    if (!payload || typeof payload !== 'object') return;
    const data = payload as {
      kind?: string;
      matchId?: string;
      qIndex?: number;
      guess?: string;
      giveUp?: boolean;
    };
    if (data.matchId !== MATCH_ID || typeof data.qIndex !== 'number') return;

    const s = store();
    const alreadyResolved = s.match?.answerAck?.qIndex === data.qIndex || s.match?.lastRoundResult?.qIndex === data.qIndex;
    if (alreadyResolved) return;

    const normalizedGuess = String(data.guess ?? '').trim().toLowerCase();
    const isCorrectGuess = normalizedGuess.includes('ronaldo') || normalizedGuess.includes('cristiano');

    if (data.kind === 'giveUp' || data.giveUp || !isCorrectGuess) {
      s.setCluesGuessAck({
        matchId: MATCH_ID,
        qIndex: data.qIndex,
        clueIndex: 1,
        revealCount: 2,
      });
      return;
    }

    s.setCluesGuessAck({
      matchId: MATCH_ID,
      qIndex: data.qIndex,
      clueIndex: 2,
      revealCount: 3,
    });

    playPrebuiltSpecialResult(makeCluesRoundResult(data.qIndex, scoreRef.current), 250);
  }

  function fireOutcome(outcome: Outcome) {
    // Mobile: auto-dismiss the controls drawer so the animation has the
    // full viewport. Desktop is unaffected (panel is lg:translate-x-0).
    setMobilePanelOpen(false);
    pendingTimers.current.forEach((t) => window.clearTimeout(t));
    pendingTimers.current = [];
    const s = store();
    const q = s.match?.currentQuestion;
    if (!q) return;
    const result = makeRoundResult(q.qIndex, outcome, scoreRef.current, { me: myPoints, opp: oppPoints });
    const me = result.players[SELF_ID];
    const opp = result.players[OPP_ID];
    if (!me || !opp) return;
    const sample = SAMPLE_QUESTIONS[q.qIndex % SAMPLE_QUESTIONS.length];

    waitForAnchors(() => {
      // Step 1: fire the player's answer ack — triggers the player flight
      // overlay (HTML +N flying from card → pitch avatar) and the controller's
      // per-question answered state.
      s.setAnswerAck({
        matchId: MATCH_ID,
        qIndex: q.qIndex,
        questionKind: 'multipleChoice',
        selectedIndex: me.selectedIndex,
        isCorrect: me.isCorrect,
        correctIndex: sample.correctIndex,
        myTotalPoints: me.totalPoints,
        oppAnswered: false,
        pointsEarned: me.pointsEarned,
        phaseKind: 'normal',
        phaseRound: result.phaseRound ?? null,
      });

      // Step 2: opponent answers ~700ms later — long enough that the player
      // splash is clearly visible before the opp splash joins it.
      pendingTimers.current.push(
        window.setTimeout(() => {
          s.setOpponentAnswered({
            matchId: MATCH_ID,
            qIndex: q.qIndex,
            opponentTotalPoints: opp.totalPoints,
            pointsEarned: opp.pointsEarned,
            isCorrect: opp.isCorrect,
            selectedIndex: opp.selectedIndex,
          });
        }, 700)
      );

      // Step 3: deliver round_result ~700ms after opp answer to drive
      // convert → bars → battle → result.
      pendingTimers.current.push(
        window.setTimeout(() => {
          s.setRoundResult(result);
        }, 1400)
      );
    });

    schedulePostRoundPossessionState(result, 1400);

    // Update score & goals refs for the next round
    scoreRef.current.meTotal = me.totalPoints;
    scoreRef.current.oppTotal = opp.totalPoints;
    if (outcome === 'goal-me') goalsRef.current.seat1 += 1;
    if (outcome === 'goal-opp') goalsRef.current.seat2 += 1;
  }

  function previewShot(result: 'saved' | 'miss', attackerSeat: 1 | 2) {
    setMobilePanelOpen(false);
    pendingTimers.current.forEach((t) => window.clearTimeout(t));
    pendingTimers.current = [];
    store().triggerDevPossessionAnimation({ result, attackerSeat });
  }

  function nextQuestion(overrideKind?: QuestionKind) {
    // Mobile: auto-dismiss controls so the new question / badge drop is
    // immediately visible after advancing.
    setMobilePanelOpen(false);
    // Kill any in-flight fireOutcome timers — a late round_result or opp
    // answered event arriving after we've advanced will leave the screen
    // wedged on a stale phase.
    pendingTimers.current.forEach((t) => window.clearTimeout(t));
    pendingTimers.current = [];

    const s = store();
    const q = s.match?.currentQuestion;
    const nextIdx = (q?.qIndex ?? -1) + 1;
    if (nextIdx >= TOTAL_QUESTIONS) {
      // Trigger fulltime
      stateVersion.current += 1;
      s.setMatchState(
        makeMatchState('COMPLETED', {
          stateVersion: stateVersion.current,
          half: 2,
          goals: goalsRef.current,
        })
      );
      return;
    }
    // Clear stale per-round state so `setMatchQuestion` doesn't buffer the
    // new question as a pending one (in production that's drained by the
    // round-transition promote timer; in the playground we need to drain it
    // manually).
    useRealtimeMatchStore.setState((prev) =>
      prev.match
        ? {
            ...prev,
            match: {
              ...prev.match,
              lastRoundResult: null,
              answerAck: null,
              countdownGuessAck: null,
              cluesGuessAck: null,
              opponentAnswered: false,
              opponentSelectedIndex: null,
              opponentRecentPoints: 0,
              opponentAnsweredCorrectly: null,
              currentQuestionPhase: 'reveal',
            },
          }
        : prev
    );
    s.setMatchQuestion(makeQuestion(nextIdx, overrideKind ?? nextQuestionKind));
    // Bump the remount key — `RealtimePossessionMatchScreen` re-mounts so
    // the controller's internal React state (roundResultHoldDone, showOptions,
    // firstQuestionIntro, etc.) resets cleanly. Without this, dev clicks land
    // between phases and the round transition overlay sticks.
    setRemountKey((k) => k + 1);
  }

  function goHalftime() {
    setMobilePanelOpen(false);
    const s = store();
    stateVersion.current += 1;
    s.setMatchState(
      makeMatchState('HALFTIME', {
        stateVersion: stateVersion.current,
        half: 1,
        goals: goalsRef.current,
      })
    );
  }

  function loadPutInOrderPartialScenario() {
    pendingTimers.current.forEach((t) => window.clearTimeout(t));
    pendingTimers.current = [];

    const s = store();
    const activeQIndex = s.match?.currentQuestion?.qIndex ?? -1;
    const qIndex = Math.min(activeQIndex + 1, TOTAL_QUESTIONS - 1);
    const myOrder = ['pele', 'maradona', 'mbappe', 'messi', 'ronaldo'];
    const opponentOrder = ['pele', 'ronaldo', 'maradona', 'messi', 'mbappe'];

    stateVersion.current += 1;
    s.setMatchState(makeMatchState('NORMAL_PLAY', {
      stateVersion: stateVersion.current,
      goals: goalsRef.current,
      possessionDiff: possessionDiffRef.current,
    }));

    useRealtimeMatchStore.setState((prev) =>
      prev.match
        ? {
            ...prev,
            match: {
              ...prev.match,
              lastRoundResult: null,
              answerAck: null,
              countdownGuessAck: null,
              cluesGuessAck: null,
              opponentAnswered: false,
              opponentSelectedIndex: null,
              opponentRecentPoints: 0,
              opponentAnsweredCorrectly: null,
              currentQuestionPhase: 'reveal',
            },
          }
        : prev
    );

    s.setMatchQuestion(makeQuestion(qIndex, 'putInOrder'));
    setNextQuestionKind('putInOrder');
    setRemountKey((k) => k + 1);

    pendingTimers.current.push(
      window.setTimeout(() => {
        const result = makePutInOrderRoundResult(qIndex, myOrder, scoreRef.current, {
          opponentOrderedItemIds: opponentOrder,
        });
        const me = result.players[SELF_ID];
        const opp = result.players[OPP_ID];
        if (!me || !opp) return;

        s.setAnswerAck({
          matchId: MATCH_ID,
          qIndex,
          questionKind: 'putInOrder',
          selectedIndex: null,
          isCorrect: me.isCorrect,
          myTotalPoints: me.totalPoints,
          oppAnswered: false,
          pointsEarned: me.pointsEarned,
          phaseKind: 'normal',
          phaseRound: result.phaseRound ?? null,
          foundCount: me.foundCount,
        });

        pendingTimers.current.push(
          window.setTimeout(() => {
            s.setOpponentAnswered({
              matchId: MATCH_ID,
              qIndex,
              opponentTotalPoints: opp.totalPoints,
              pointsEarned: opp.pointsEarned,
              isCorrect: opp.isCorrect,
              selectedIndex: null,
            });
          }, DEV_PUT_ORDER_OPPONENT_DELAY_MS)
        );

        pendingTimers.current.push(
          window.setTimeout(() => {
            s.setRoundResult(result);
          }, DEV_PUT_ORDER_ROUND_RESULT_DELAY_MS)
        );
        schedulePostRoundPossessionState(result, DEV_PUT_ORDER_ROUND_RESULT_DELAY_MS);
      }, 900)
    );
  }

  function enterPenaltyShootout() {
    setMobilePanelOpen(false);
    pendingTimers.current.forEach((t) => window.clearTimeout(t));
    pendingTimers.current = [];
    penaltyGoalsRef.current = { seat1: 0, seat2: 0 };
    penaltyKickIndexRef.current = 0;
    const s = store();
    stateVersion.current += 1;
    s.setMatchState(
      makeMatchState('PENALTY_SHOOTOUT', {
        stateVersion: stateVersion.current,
        half: 2,
        goals: goalsRef.current,
        penaltyGoals: penaltyGoalsRef.current,
        phaseKind: 'penalty',
        shooterSeat: null,
      })
    );
    setRemountKey((k) => k + 1);
  }

  function takePenaltyKick(shooterSeat: 1 | 2, outcome: 'goal' | 'saved') {
    setMobilePanelOpen(false);
    pendingTimers.current.forEach((t) => window.clearTimeout(t));
    pendingTimers.current = [];

    const s = store();
    const qIndex = PENALTY_QINDEX_BASE + penaltyKickIndexRef.current;
    penaltyKickIndexRef.current += 1;

    stateVersion.current += 1;
    s.setMatchState(
      makeMatchState('PENALTY_SHOOTOUT', {
        stateVersion: stateVersion.current,
        half: 2,
        goals: goalsRef.current,
        penaltyGoals: penaltyGoalsRef.current,
        phaseKind: 'penalty',
        shooterSeat,
      })
    );

    useRealtimeMatchStore.setState((prev) =>
      prev.match
        ? {
            ...prev,
            match: {
              ...prev.match,
              lastRoundResult: null,
              answerAck: null,
              countdownGuessAck: null,
              cluesGuessAck: null,
              opponentAnswered: false,
              opponentSelectedIndex: null,
              opponentRecentPoints: 0,
              opponentAnsweredCorrectly: null,
              currentQuestionPhase: 'reveal',
            },
          }
        : prev
    );

    s.setMatchQuestion(makePenaltyQuestion(qIndex, shooterSeat));

    const result = makePenaltyRoundResult(qIndex, shooterSeat, outcome, scoreRef.current);
    const me = result.players[SELF_ID];
    const opp = result.players[OPP_ID];
    if (!me || !opp) return;

    waitForAnchors(() => {
      pendingTimers.current.push(
        window.setTimeout(() => {
          s.setAnswerAck({
            matchId: MATCH_ID,
            qIndex,
            questionKind: 'multipleChoice',
            selectedIndex: me.selectedIndex,
            isCorrect: me.isCorrect,
            myTotalPoints: me.totalPoints,
            oppAnswered: false,
            pointsEarned: 0,
            phaseKind: 'penalty',
            phaseRound: null,
            shooterSeat,
          });
        }, 800)
      );

      pendingTimers.current.push(
        window.setTimeout(() => {
          s.setOpponentAnswered({
            matchId: MATCH_ID,
            qIndex,
            opponentTotalPoints: opp.totalPoints,
            pointsEarned: 0,
            isCorrect: opp.isCorrect,
            selectedIndex: opp.selectedIndex,
          });
        }, 1400)
      );

      pendingTimers.current.push(
        window.setTimeout(() => {
          s.setRoundResult(result);
          if (outcome === 'goal') {
            if (shooterSeat === 1) penaltyGoalsRef.current.seat1 += 1;
            else penaltyGoalsRef.current.seat2 += 1;
          }
          stateVersion.current += 1;
          s.setMatchState(
            makeMatchState('PENALTY_SHOOTOUT', {
              stateVersion: stateVersion.current,
              half: 2,
              goals: goalsRef.current,
              penaltyGoals: penaltyGoalsRef.current,
              phaseKind: 'penalty',
              shooterSeat,
            })
          );
        }, 2200)
      );
    });
  }

  return (
    <div className="relative min-h-dvh bg-surface-page">
      {/* Stage — main area with the real match screen */}
      <div className="lg:pl-72">
        <RealtimePossessionMatchScreen
          key={remountKey}
          playerUsername="Me"
          playerAvatar="avatar-1"
          playerAvatarCustomization={null}
          opponentUsername="Mock Opponent"
          opponentAvatar="avatar-2"
          opponentAvatarCustomization={{ jersey: 'jersey_red' }}
          playerFavoriteClub="real-madrid"
          centerPossessionTrack
          simpleShotAnimation
          disableBgm
          onQuit={() => router.push('/play')}
          onForfeit={() => router.push('/play')}
        />
      </div>

      {/* Control panel. Always anchored to the left on desktop (lg+).
          On mobile it slides in/out via the `mobilePanelOpen` state so the
          user can preview animations full-screen, then re-open the panel
          to tweak. */}
      <aside
        className={`fixed left-4 top-4 bottom-4 z-[60] w-64 overflow-y-auto rounded-2xl border border-surface-card-light bg-surface-card/95 p-4 shadow-2xl backdrop-blur font-fun transition-transform duration-200 lg:translate-x-0 ${
          mobilePanelOpen ? 'translate-x-0' : '-translate-x-[110%]'
        }`}
      >
        <div className="mb-3 flex items-center justify-between gap-2">
          <h2 className="text-sm font-black uppercase tracking-wider text-yellow-400">
            Match Playground
          </h2>
          {/* Mobile-only: collapse the panel to inspect the screen. */}
          <button
            onClick={() => setMobilePanelOpen(false)}
            className="lg:hidden flex size-7 items-center justify-center rounded-md bg-surface-deep text-white/80 hover:text-white"
            aria-label="Hide controls"
          >
            ✕
          </button>
          <button
            onClick={() => router.push('/play')}
            className="text-[10px] font-bold uppercase tracking-wider text-brand-slate hover:text-white"
          >
            exit
          </button>
        </div>

        <div className="mb-3 rounded-xl bg-surface-deep px-3 py-2 text-[10px] text-white/70 font-mono">
          <div>match: {match?.matchId ?? '—'}</div>
          <div>phase: {matchPhase ?? '—'}</div>
          <div>qIndex: {currentQIndex ?? '—'} / {TOTAL_QUESTIONS}</div>
          <div>score: {scoreRef.current.meTotal} : {scoreRef.current.oppTotal}</div>
          <div>goals: {goalsRef.current.seat1} : {goalsRef.current.seat2}</div>
        </div>

        <Group label="Match flow">
          <Btn onClick={() => { start(); setRemountKey((k) => k + 1); }}>↻ reset & restart</Btn>
          <Btn onClick={nextQuestion}>next question</Btn>
        </Group>

        <Group label="Spawn question kind (drops badge)">
          <div className="grid grid-cols-2 gap-1.5">
            <KindBtn
              label="Multi"
              active={nextQuestionKind === 'multipleChoice'}
              onClick={() => { setNextQuestionKind('multipleChoice'); nextQuestion('multipleChoice'); }}
            />
            <KindBtn
              label="Countdown"
              active={nextQuestionKind === 'countdown'}
              onClick={() => { setNextQuestionKind('countdown'); nextQuestion('countdown'); }}
            />
            <KindBtn
              label="Order"
              active={nextQuestionKind === 'putInOrder'}
              onClick={() => { setNextQuestionKind('putInOrder'); nextQuestion('putInOrder'); }}
            />
            <KindBtn
              label="Who Am I?"
              active={nextQuestionKind === 'clues'}
              onClick={() => { setNextQuestionKind('clues'); nextQuestion('clues'); }}
            />
          </div>
          <p className="mt-1 text-[9px] text-brand-slate">
            Click any kind — advances to the next round with that kind and
            the yellow badge drops from above.
          </p>
        </Group>

        <Group label="Points awarded next round">
          <Slider
            min={0} max={120} step={5}
            value={myPoints} onChange={setMyPoints}
            label="You" suffix={`(${pointsToBars(myPoints)} bars)`}
          />
          <Slider
            min={0} max={120} step={5}
            value={oppPoints} onChange={setOppPoints}
            label="Opp" suffix={`(${pointsToBars(oppPoints)} bars)`}
          />
          <p className="mb-2 mt-1 text-[9px] text-brand-slate">
            10 pts = 1 bar (cap 12). Only counts if that side was correct.
          </p>
          <button
            onClick={() => {
              // Auto-pick the outcome from the slider values. Any side with
              // points = "correct"; 0 pts = "wrong".
              const outcome: Outcome =
                myPoints > 0 && oppPoints > 0
                  ? 'both-correct'
                  : myPoints > 0
                    ? 'me-correct'
                    : oppPoints > 0
                      ? 'opp-correct'
                      : 'both-wrong';
              fireOutcome(outcome);
            }}
            className="w-full rounded-xl bg-brand-green px-4 py-2.5 text-sm font-black uppercase tracking-wider text-white shadow-[0_4px_0_var(--color-brand-green-deep)] active:translate-y-[2px] active:shadow-[0_2px_0_var(--color-brand-green-deep)]"
          >
            ▶ Play bar battle
          </button>
        </Group>

        <Group label="Edge bar placement">
          <Btn variant="yellow" onClick={() => loadEdgeBarDemo('green')}>edge demo · green wins</Btn>
          <Btn variant="yellow" onClick={() => loadEdgeBarDemo('red')}>edge demo · red wins</Btn>
          <p className="mt-1 text-[9px] text-brand-slate">
            Starts both avatars near the goal edge. Bars prefer below the
            avatar on mobile, then flip only if that side would clip. A green
            win from the edge now resolves as a shot and goal.
          </p>
        </Group>

        <Group label="Apply round result">
          <Btn variant="green" onClick={() => fireOutcome('me-correct')}>me correct · opp wrong</Btn>
          <Btn variant="red" onClick={() => fireOutcome('opp-correct')}>opp correct · me wrong</Btn>
          <Btn onClick={() => fireOutcome('both-correct')}>both correct</Btn>
          <Btn onClick={() => fireOutcome('both-wrong')}>both wrong</Btn>
        </Group>

        <Group label="Score / shot">
          <Btn variant="yellow" onClick={() => loadPutInOrderScenario('goal')}>put-order goal sim</Btn>
          <Btn variant="yellow" onClick={() => loadPutInOrderScenario('partial')}>put-order partial sim</Btn>
          <Btn variant="yellow" onClick={() => loadSpecialScenario('countdown', 'goal')}>countdown goal sim</Btn>
          <Btn variant="yellow" onClick={() => loadSpecialScenario('countdown', 'partial')}>countdown partial sim</Btn>
          <Btn variant="yellow" onClick={() => loadSpecialScenario('clues', 'goal')}>who am i goal sim</Btn>
          <Btn variant="yellow" onClick={() => loadSpecialScenario('clues', 'goal-opp')}>who am i opp goal sim</Btn>
          <Btn variant="yellow" onClick={() => loadSpecialScenario('clues', 'partial')}>who am i partial sim</Btn>
          <Btn variant="yellow" onClick={() => fireOutcome('goal-me')}>⚽ goal · me</Btn>
          <Btn variant="yellow" onClick={() => fireOutcome('goal-opp')}>⚽ goal · opp</Btn>
          <Btn onClick={() => previewShot('miss', 1)}>miss left · me attacks</Btn>
          <Btn onClick={() => previewShot('miss', 2)}>miss left · opp attacks</Btn>
        </Group>

        <Group label="Phase transitions">
          <Btn onClick={goHalftime}>→ halftime</Btn>
          <Btn onClick={enterPenaltyShootout}>→ enter penalty shootout</Btn>
        </Group>

        <Group label="Penalty shootout sim">
          <Btn variant="yellow" onClick={() => takePenaltyKick(1, 'goal')}>kick · me scores ⚽</Btn>
          <Btn onClick={() => takePenaltyKick(1, 'saved')}>kick · me saved 🧤</Btn>
          <Btn variant="yellow" onClick={() => takePenaltyKick(2, 'goal')}>kick · opp scores ⚽</Btn>
          <Btn onClick={() => takePenaltyKick(2, 'saved')}>kick · opp saved 🧤</Btn>
          <p className="mt-1 text-[9px] text-brand-slate">
            Each click fires one penalty kick — sets state with the shooter,
            pushes the question, then answer ack → opp answered → round
            result. Penalty goals accumulate across kicks until you re-enter.
          </p>
        </Group>

        <p className="mt-3 text-[10px] leading-tight text-brand-slate">
          Dev-only. Mocks the realtime store events (no socket). Apply a round
          result, then &quot;next question&quot; to advance. Goal triggers the
          celebration overlay + bar battle conversion when you score.
        </p>
      </aside>

      {/* Mobile FAB to re-open the controls drawer once it's been dismissed.
          Anchored to the bottom-left so it sits below the MCQ answer grid —
          out of the way of the question content but always one tap away. */}
      {!mobilePanelOpen && (
        <button
          onClick={() => setMobilePanelOpen(true)}
          className="lg:hidden fixed left-3 bottom-4 z-[70] flex h-11 items-center gap-2 rounded-full bg-brand-yellow px-4 text-[11px] font-black uppercase tracking-wider text-surface-page shadow-lg"
          aria-label="Show controls"
        >
          <span>≡</span>
          <span>Controls</span>
        </button>
      )}
    </div>
  );
}

// ─── primitives ─────────────────────────────────────────────────────────────

function Group({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="mb-3">
      <div className="mb-1.5 text-[10px] font-black uppercase tracking-wider text-brand-slate-light">
        {label}
      </div>
      <div className="flex flex-col gap-1.5">{children}</div>
    </div>
  );
}

function Btn({
  children,
  onClick,
  variant = 'default',
}: {
  children: React.ReactNode;
  onClick: () => void;
  variant?: 'default' | 'green' | 'red' | 'yellow';
}) {
  const variantClass =
    variant === 'green'
      ? 'bg-brand-green/20 text-brand-green-light hover:bg-brand-green/30'
      : variant === 'red'
        ? 'bg-brand-red/20 text-brand-red-soft hover:bg-brand-red/30'
        : variant === 'yellow'
          ? 'bg-brand-yellow/20 text-brand-yellow hover:bg-brand-yellow/30'
          : 'bg-surface-deep text-white/80 hover:bg-surface-card-tint';
  return (
    <button
      onClick={onClick}
      className={`w-full rounded-md px-2.5 py-1.5 text-left text-[11px] font-bold uppercase tracking-wider transition-colors ${variantClass}`}
    >
      {children}
    </button>
  );
}

function KindBtn({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={`rounded-md px-2 py-1.5 text-[10px] font-black uppercase tracking-wider transition-colors ${
        active ? 'bg-brand-yellow text-surface-page' : 'bg-surface-deep text-white/70 hover:text-white'
      }`}
    >
      {label}
    </button>
  );
}

function Slider({
  min, max, step, value, onChange, label, suffix,
}: {
  min: number;
  max: number;
  step: number;
  value: number;
  onChange: (v: number) => void;
  label?: string;
  suffix?: string;
}) {
  return (
    <label className="block">
      <div className="flex items-baseline justify-between text-[10px] text-brand-slate">
        {label && <span>{label}</span>}
        <span className="ml-auto font-mono text-white">
          {value}
          {suffix ? ` ${suffix}` : ''}
        </span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="mt-1 w-full accent-brand-cyan"
      />
    </label>
  );
}
