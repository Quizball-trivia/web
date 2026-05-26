'use client';

/**
 * Dev playground for the Party Quiz game mode. Mounts the production
 * `FriendLobbyScreen` (lobby preview) and `RealtimePartyQuizScreen` (live
 * match) with a stub socket and a seeded realtime-match store so the UI
 * can be exercised end-to-end without a backend.
 *
 * Tabs:
 *  - Lobby   → adjust player count (2–6), toggle ready states, watch how
 *              the lobby roster fills out and the "Start Party Quiz"
 *              button unlocks.
 *  - Match   → step through questions, pick a correct answer (so the
 *              standings reorder), trigger the final results podium.
 *
 * Production code paths are untouched — guarded by NODE_ENV.
 */

import { useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ChevronLeft, Minus, Plus, X } from 'lucide-react';

import { FriendLobbyScreen } from '@/features/friend/components/FriendLobbyScreen';
import { PartyQuizResultsScreen } from '@/features/party/PartyQuizResultsScreen';
import { RealtimePartyQuizScreen } from '@/features/party/RealtimePartyQuizScreen';
import { __setSocketOverride } from '@/lib/realtime/socket-client';
import { useRealtimeMatchStore } from '@/stores/realtimeMatch.store';
import { useAuthStore } from '@/stores/auth.store';
import type {
  LobbyMember,
  LobbyState,
  MatchFinalResultsPayload,
  MatchParticipant,
  MatchPartyPlayerState,
  MatchPartyStatePayload,
  MatchRoundResultPayload,
  MatchStartPayload,
  ResolvedMatchQuestionPayload,
} from '@/lib/realtime/socket.types';

// ─── Constants ─────────────────────────────────────────────────────────────

const MATCH_ID = 'dev-party-match';
const LOBBY_ID = 'dev-party-lobby';
const INVITE_CODE = 'PARTY1';
const SELF_ID = 'player-1';
const PLAYER_IDS = ['player-1', 'player-2', 'player-3', 'player-4', 'player-5', 'player-6'];
const PLAYER_NAMES = ['You', 'Alex', 'Sam', 'Jordan', 'Riley', 'Casey'];
const TOTAL_QUESTIONS = 10;
const QUESTION_DURATION_MS = 10_000;
const REVEAL_DELAY_MS = 2500;

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
    categoryName: 'World Cup',
  },
  {
    prompt: 'Who scored the famous "Hand of God" goal?',
    options: ['Pelé', 'Maradona', 'Zidane', 'Cruyff'],
    correctIndex: 1,
    categoryName: 'Legends',
  },
  {
    prompt: 'Which club has won the most Champions League titles?',
    options: ['Barcelona', 'Bayern', 'Real Madrid', 'Milan'],
    correctIndex: 2,
    categoryName: 'Club Football',
  },
  {
    prompt: 'In which year was the first FIFA World Cup held?',
    options: ['1930', '1934', '1928', '1950'],
    correctIndex: 0,
    categoryName: 'World Cup',
  },
  {
    prompt: 'Which Italian midfielder was known as "The Architect"?',
    options: ['Buffon', 'Pirlo', 'Maldini', 'Totti'],
    correctIndex: 1,
    categoryName: 'Legends',
  },
];

// ─── Mock data builders ────────────────────────────────────────────────────

function makeMember(idx: number, isHost: boolean, isReady: boolean): LobbyMember {
  return {
    userId: PLAYER_IDS[idx]!,
    username: PLAYER_NAMES[idx]!,
    avatarUrl: null,
    avatarCustomization: null,
    rankPoints: 100 + idx * 25,
    isHost,
    isReady,
  };
}

function makeLobby(memberCount: number, readyFlags: boolean[]): LobbyState {
  const members = Array.from({ length: memberCount }, (_, idx) =>
    makeMember(idx, idx === 0, readyFlags[idx] ?? false),
  );
  return {
    lobbyId: LOBBY_ID,
    mode: 'friendly',
    status: 'waiting',
    inviteCode: INVITE_CODE,
    displayName: 'Party Quiz Lobby',
    isPublic: false,
    hostUserId: SELF_ID,
    settings: {
      gameMode: 'friendly_party_quiz',
      friendlyRandom: true,
      friendlyCategoryAId: null,
      friendlyCategoryBId: null,
    },
    members,
  };
}

function makeParticipants(memberCount: number): MatchParticipant[] {
  return Array.from({ length: memberCount }, (_, idx) => ({
    userId: PLAYER_IDS[idx]!,
    username: PLAYER_NAMES[idx]!,
    avatarUrl: null,
    avatarCustomization: null,
    seat: idx + 1,
    rankPoints: 100 + idx * 25,
  }));
}

function makeStartPayload(memberCount: number): MatchStartPayload {
  return {
    matchId: MATCH_ID,
    mode: 'friendly',
    variant: 'friendly_party_quiz',
    mySeat: 1,
    opponent: {
      id: PLAYER_IDS[1]!,
      username: PLAYER_NAMES[1]!,
      avatarUrl: null,
    },
    participants: makeParticipants(memberCount),
  };
}

function makeQuestion(qIndex: number): ResolvedMatchQuestionPayload {
  const sample = SAMPLE_QUESTIONS[qIndex % SAMPLE_QUESTIONS.length]!;
  const now = Date.now();
  return {
    matchId: MATCH_ID,
    qIndex,
    total: TOTAL_QUESTIONS,
    playableAt: new Date(now + REVEAL_DELAY_MS).toISOString(),
    deadlineAt: new Date(now + REVEAL_DELAY_MS + QUESTION_DURATION_MS).toISOString(),
    phaseKind: 'normal',
    phaseRound: qIndex + 1,
    question: {
      kind: 'multipleChoice',
      id: `dev-q-${qIndex}`,
      prompt: sample.prompt,
      options: sample.options as unknown as string[],
      categoryName: sample.categoryName,
      difficulty: 'medium',
    },
  };
}

function makePartyState(
  memberCount: number,
  qIndex: number,
  playerScores: Record<string, MatchPartyPlayerState>,
  stateVersion: number,
): MatchPartyStatePayload {
  const ids = PLAYER_IDS.slice(0, memberCount);
  const sorted = [...ids].sort((a, b) => (playerScores[b]?.totalPoints ?? 0) - (playerScores[a]?.totalPoints ?? 0));
  const leaderUserId = sorted[0] ?? null;
  const players: MatchPartyPlayerState[] = ids.map((userId) => {
    const score = playerScores[userId];
    return {
      userId,
      totalPoints: score?.totalPoints ?? 0,
      correctAnswers: score?.correctAnswers ?? 0,
      answered: score?.answered ?? false,
      rank: sorted.indexOf(userId) + 1,
      avgTimeMs: score?.avgTimeMs ?? null,
    };
  });
  return {
    matchId: MATCH_ID,
    totalQuestions: TOTAL_QUESTIONS,
    currentQuestionIndex: qIndex,
    leaderUserId,
    rankingOrder: sorted,
    players,
    stateVersion,
  };
}

function makeRoundResult(
  qIndex: number,
  memberCount: number,
  correctIds: Set<string>,
  pointsByUser: Record<string, number>,
  totalsByUser: Record<string, number>,
): MatchRoundResultPayload {
  const sample = SAMPLE_QUESTIONS[qIndex % SAMPLE_QUESTIONS.length]!;
  const ids = PLAYER_IDS.slice(0, memberCount);
  const players: MatchRoundResultPayload['players'] = {};
  // Pre-compute the 3 wrong-option indices so we can spread wrong picks
  // across them for a more realistic chip distribution.
  const wrongOptions = [0, 1, 2, 3].filter((i) => i !== sample.correctIndex);
  let wrongRot = 0;
  for (const id of ids) {
    const isCorrect = correctIds.has(id);
    const selectedIndex = isCorrect
      ? sample.correctIndex
      : wrongOptions[wrongRot++ % wrongOptions.length]!;
    players[id] = {
      selectedIndex,
      isCorrect,
      timeMs: 4500,
      pointsEarned: pointsByUser[id] ?? 0,
      totalPoints: totalsByUser[id] ?? 0,
      submittedOrderIds: [],
    };
  }
  const sorted = [...ids].sort((a, b) => (totalsByUser[b] ?? 0) - (totalsByUser[a] ?? 0));
  return {
    matchId: MATCH_ID,
    qIndex,
    questionKind: 'multipleChoice',
    reveal: { kind: 'multipleChoice', correctIndex: sample.correctIndex },
    players,
    rankingOrder: sorted,
    phaseKind: 'normal',
    phaseRound: qIndex + 1,
  };
}

function makeFinalResults(memberCount: number, totalsByUser: Record<string, number>): MatchFinalResultsPayload {
  const ids = PLAYER_IDS.slice(0, memberCount);
  const sorted = [...ids].sort((a, b) => (totalsByUser[b] ?? 0) - (totalsByUser[a] ?? 0));
  const winnerId = sorted[0] ?? null;
  return {
    matchId: MATCH_ID,
    winnerId,
    players: Object.fromEntries(
      ids.map((id) => [
        id,
        {
          totalPoints: totalsByUser[id] ?? 0,
          correctAnswers: Math.floor((totalsByUser[id] ?? 0) / 80),
          avgTimeMs: 4500,
        },
      ]),
    ),
    participants: makeParticipants(memberCount),
    standings: sorted.map((id, idx) => ({
      userId: id,
      rank: idx + 1,
      totalPoints: totalsByUser[id] ?? 0,
      correctAnswers: Math.floor((totalsByUser[id] ?? 0) / 80),
      avgTimeMs: 4500,
    })),
    totalQuestions: TOTAL_QUESTIONS,
    durationMs: 60_000 * 5,
    resultVersion: 1,
  };
}

// ─── Stub socket ───────────────────────────────────────────────────────────

function createStubSocket(onMatchAnswer: (payload: { matchId: string; qIndex: number; selectedIndex: number | null; timeMs: number }) => void) {
  /* eslint-disable @typescript-eslint/no-explicit-any */
  const stub: any = {
    id: 'dev-party-stub',
    connected: true,
    active: true,
    auth: {},
    emit: (...args: unknown[]) => {
      const [event, payload] = args;
      if (event === 'match:answer' && payload && typeof payload === 'object') {
        onMatchAnswer(payload as { matchId: string; qIndex: number; selectedIndex: number | null; timeMs: number });
        return stub;
      }
      console.debug('[dev/party-quiz] socket.emit ignored', args);
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
  /* eslint-enable @typescript-eslint/no-explicit-any */
  return stub;
}

// ─── Component ─────────────────────────────────────────────────────────────

export default function DevPartyQuizPage() {
  if (process.env.NODE_ENV !== 'development') {
    return (
      <div className="min-h-dvh bg-surface-deep flex items-center justify-center text-white">
        Dev only
      </div>
    );
  }
  return <DevPartyQuizContent />;
}

function DevPartyQuizContent() {
  const router = useRouter();
  const [mode, setMode] = useState<'lobby' | 'match'>('lobby');
  const [playerCount, setPlayerCount] = useState(3);
  const [readyFlags, setReadyFlags] = useState<boolean[]>(() =>
    Array.from({ length: 6 }, () => false),
  );
  const [qIndex, setQIndex] = useState(0);
  const [revealed, setRevealed] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const [panelOpen, setPanelOpen] = useState(true);
  const [restartKey, setRestartKey] = useState(0);
  const [totals, setTotals] = useState<Record<string, number>>({});
  const totalsRef = useRef<Record<string, number>>({});
  const qIndexRef = useRef(0);
  const playerCountRef = useRef(3);
  const revealedRef = useRef(false);
  const simulationTimersRef = useRef<number[]>([]);
  const matchAnswerHandlerRef = useRef<(payload: { matchId: string; qIndex: number; selectedIndex: number | null; timeMs: number }) => void>(() => undefined);
  const stateVersionRef = useRef(0);

  useEffect(() => {
    qIndexRef.current = qIndex;
  }, [qIndex]);

  useEffect(() => {
    playerCountRef.current = playerCount;
  }, [playerCount]);

  useEffect(() => {
    revealedRef.current = revealed;
  }, [revealed]);

  function clearSimulationTimers() {
    for (const timerId of simulationTimersRef.current) {
      window.clearTimeout(timerId);
    }
    simulationTimersRef.current = [];
  }

  function scheduleSimulationStep(callback: () => void, delayMs: number) {
    const timerId = window.setTimeout(() => {
      simulationTimersRef.current = simulationTimersRef.current.filter((id) => id !== timerId);
      callback();
    }, delayMs);
    simulationTimersRef.current.push(timerId);
  }

  // Install stub socket + mock auth user on mount.
  useEffect(() => {
    const stub = createStubSocket((payload) => matchAnswerHandlerRef.current(payload));
    __setSocketOverride(stub);
    const prevAuth = useAuthStore.getState();
    useAuthStore.setState({
      status: 'authenticated',
      user: {
        id: SELF_ID,
        nickname: 'You',
        email: 'dev@quizball.io',
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
      } as any,
      hasBootstrapped: true,
    });
    useRealtimeMatchStore.getState().setSelfUserId(SELF_ID);

    return () => {
      clearSimulationTimers();
      __setSocketOverride(null);
      useAuthStore.setState({ ...prevAuth });
      useRealtimeMatchStore.getState().reset();
    };
  }, []);

  // ─── Seed lobby state ────────────────────────────────────────────────────
  useEffect(() => {
    if (mode !== 'lobby') return;
    const store = useRealtimeMatchStore.getState();
    store.setLobby(makeLobby(playerCount, readyFlags));
  }, [mode, playerCount, readyFlags]);

  // ─── Seed match state ────────────────────────────────────────────────────
  useEffect(() => {
    if (mode !== 'match') return;
    clearSimulationTimers();
    const store = useRealtimeMatchStore.getState();
    stateVersionRef.current = 0;
    // `restartKey` re-runs this effect after Play Again from the podium.
    void restartKey;
    const initTotals = Object.fromEntries(PLAYER_IDS.slice(0, playerCount).map((id) => [id, 0]));
    totalsRef.current = initTotals;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- dev playground reset; cascading render is acceptable here
    setTotals(initTotals);
    setQIndex(0);
    setRevealed(false);
    setShowResults(false);

    store.setMatchStart(makeStartPayload(playerCount));
    stateVersionRef.current += 1;
    store.setPartyState(makePartyState(playerCount, 0, {}, stateVersionRef.current));
    store.setMatchQuestion(makeQuestion(0));
    store.setQuestionPhase('reveal');
    const t = window.setTimeout(() => store.setQuestionPhase('playing'), REVEAL_DELAY_MS);
    return () => window.clearTimeout(t);
  }, [mode, playerCount, restartKey]);

  // ─── Match controls ──────────────────────────────────────────────────────
  function makeDevPlayerScoreState(
    memberIds: string[],
    answeredIds: Set<string>,
  ): Record<string, MatchPartyPlayerState> {
    return Object.fromEntries(
      memberIds.map((id) => [
        id,
        {
          userId: id,
          totalPoints: totalsRef.current[id] ?? 0,
          correctAnswers: 0,
          answered: answeredIds.has(id),
          rank: 0,
          avgTimeMs: 4500,
        },
      ]),
    );
  }

  function advanceToNextQuestion(fromQIndex: number = qIndexRef.current) {
    if (fromQIndex >= TOTAL_QUESTIONS - 1) {
      const store = useRealtimeMatchStore.getState();
      store.setFinalResults(makeFinalResults(playerCountRef.current, totalsRef.current));
      setShowResults(true);
      return;
    }

    const newIndex = fromQIndex + 1;
    const memberIds = PLAYER_IDS.slice(0, playerCountRef.current);
    const store = useRealtimeMatchStore.getState();
    stateVersionRef.current += 1;
    store.setPartyState(
      makePartyState(
        playerCountRef.current,
        newIndex,
        makeDevPlayerScoreState(memberIds, new Set()),
        stateVersionRef.current,
      ),
    );
    store.setMatchQuestion(makeQuestion(newIndex));
    store.setQuestionPhase('reveal');
    scheduleSimulationStep(() => useRealtimeMatchStore.getState().setQuestionPhase('playing'), REVEAL_DELAY_MS);
    setQIndex(newIndex);
    setRevealed(false);
  }

  function simulateRound(params: {
    everyoneCorrect: boolean;
    autoAdvance?: boolean;
    selectedIndex?: number | null;
  }) {
    if (revealedRef.current) return;
    clearSimulationTimers();

    const currentQIndex = qIndexRef.current;
    const currentPlayerCount = playerCountRef.current;
    const memberIds = PLAYER_IDS.slice(0, currentPlayerCount);
    const sample = SAMPLE_QUESTIONS[currentQIndex % SAMPLE_QUESTIONS.length]!;
    const selectedIndex = params.selectedIndex ?? sample.correctIndex;
    const selfCorrect = selectedIndex === sample.correctIndex;
    const correctIds = new Set<string>();
    const pointsByUser: Record<string, number> = {};

    for (const [idx, id] of memberIds.entries()) {
      const isCorrect = id === SELF_ID
        ? selfCorrect
        : params.everyoneCorrect || Math.random() > 0.4;
      if (isCorrect) {
        correctIds.add(id);
        const earned = Math.max(20, 100 - idx * 8);
        pointsByUser[id] = earned;
      }
    }

    const store = useRealtimeMatchStore.getState();
    if (selfCorrect) {
      totalsRef.current[SELF_ID] = (totalsRef.current[SELF_ID] ?? 0) + (pointsByUser[SELF_ID] ?? 0);
      setTotals({ ...totalsRef.current });
      store.setAnswerAck({
        matchId: MATCH_ID,
        qIndex: currentQIndex,
        questionKind: 'multipleChoice',
        selectedIndex,
        isCorrect: true,
        correctIndex: sample.correctIndex,
        myTotalPoints: totalsRef.current[SELF_ID] ?? 0,
        oppAnswered: false,
        pointsEarned: pointsByUser[SELF_ID] ?? 0,
        phaseKind: 'normal',
        phaseRound: currentQIndex + 1,
      });
      stateVersionRef.current += 1;
      store.setPartyState(
        makePartyState(
          currentPlayerCount,
          currentQIndex,
          makeDevPlayerScoreState(memberIds, new Set([SELF_ID])),
          stateVersionRef.current,
        ),
      );
    }

    scheduleSimulationStep(() => {
      for (const id of memberIds) {
        if (id === SELF_ID) continue;
        const points = pointsByUser[id] ?? 0;
        if (points > 0) {
          totalsRef.current[id] = (totalsRef.current[id] ?? 0) + points;
        }
      }

      if (!selfCorrect) {
        store.setAnswerAck({
          matchId: MATCH_ID,
          qIndex: currentQIndex,
          questionKind: 'multipleChoice',
          selectedIndex,
          isCorrect: false,
          correctIndex: sample.correctIndex,
          myTotalPoints: totalsRef.current[SELF_ID] ?? 0,
          oppAnswered: false,
          pointsEarned: 0,
          phaseKind: 'normal',
          phaseRound: currentQIndex + 1,
        });
      }

      setTotals({ ...totalsRef.current });
      stateVersionRef.current += 1;
      store.setRoundResult(makeRoundResult(currentQIndex, currentPlayerCount, correctIds, pointsByUser, totalsRef.current));
      store.setPartyState(
        makePartyState(
          currentPlayerCount,
          currentQIndex,
          makeDevPlayerScoreState(memberIds, new Set(memberIds)),
          stateVersionRef.current,
        ),
      );
      setRevealed(true);
      revealedRef.current = true;

      if (params.autoAdvance) {
        scheduleSimulationStep(() => advanceToNextQuestion(currentQIndex), 3200);
      }
    }, selfCorrect ? 700 : 150);
  }

  function revealRound(everyoneCorrect: boolean) {
    simulateRound({ everyoneCorrect });
  }

  function nextQuestion() {
    advanceToNextQuestion();
  }

  function simulateCorrectRoundAndAdvance() {
    const sample = SAMPLE_QUESTIONS[qIndexRef.current % SAMPLE_QUESTIONS.length]!;
    simulateRound({
      everyoneCorrect: true,
      autoAdvance: true,
      selectedIndex: sample.correctIndex,
    });
  }

  useEffect(() => {
    matchAnswerHandlerRef.current = (payload) => {
      if (payload.matchId !== MATCH_ID || payload.qIndex !== qIndexRef.current) return;
      simulateRound({
        everyoneCorrect: true,
        autoAdvance: true,
        selectedIndex: payload.selectedIndex,
      });
    };
  });

  function endNow() {
    // If nothing has been scored yet, sprinkle in some sample scores so the
    // podium has meaningful numbers to render against.
    const totals = { ...totalsRef.current };
    const allZero = PLAYER_IDS.slice(0, playerCount).every((id) => (totals[id] ?? 0) === 0);
    if (allZero) {
      PLAYER_IDS.slice(0, playerCount).forEach((id, idx) => {
        totals[id] = 200 - idx * 25 + Math.floor(Math.random() * 30);
      });
      totalsRef.current = totals;
      setTotals(totals);
    }
    const store = useRealtimeMatchStore.getState();
    store.setFinalResults(makeFinalResults(playerCount, totals));
    setShowResults(true);
  }

  /*
   * Functions below are render/control helpers.
   */

  function toggleReady(idx: number) {
    setReadyFlags((prev) => {
      const next = [...prev];
      next[idx] = !next[idx];
      return next;
    });
  }

  // ─── Render ──────────────────────────────────────────────────────────────

  const memberNames = useMemo(
    () => PLAYER_NAMES.slice(0, playerCount),
    [playerCount],
  );

  const finalResults = useRealtimeMatchStore((state) => state.match?.finalResults ?? null);

  const restartMatch = () => {
    clearSimulationTimers();
    const store = useRealtimeMatchStore.getState();
    store.reset();
    store.setSelfUserId(SELF_ID);
    setShowResults(false);
    stateVersionRef.current = 0;
    setQIndex(0);
    setRevealed(false);
    setRestartKey((k) => k + 1);
  };

  return (
    <div className="relative min-h-dvh bg-surface-page-alt">
      {/* Main feature area */}
      <div className="min-h-dvh">
        {mode === 'lobby' ? (
          <FriendLobbyScreen roomCode={INVITE_CODE} isHost={true} />
        ) : showResults && finalResults ? (
          <PartyQuizResultsScreen
            finalResults={finalResults}
            participants={makeParticipants(playerCount)}
            selfUserId={SELF_ID}
            onPlayAgain={restartMatch}
            onMainMenu={() => {
              clearSimulationTimers();
              useRealtimeMatchStore.getState().reset();
              setShowResults(false);
              setMode('lobby');
            }}
          />
        ) : (
          <RealtimePartyQuizScreen
            onQuit={() => setMode('lobby')}
            onForfeit={() => setMode('lobby')}
            mobileStandingsPlacement="below-options"
            disableBgm
          />
        )}
      </div>

      {/* Floating dev panel */}
      <div
        className={`fixed right-4 top-4 z-50 w-80 max-w-[calc(100vw-2rem)] rounded-2xl border border-white/15 bg-surface-deep/95 p-4 text-white shadow-2xl backdrop-blur transition-transform ${
          panelOpen ? 'translate-x-0' : 'translate-x-[110%]'
        }`}
      >
        <div className="flex items-center justify-between gap-2">
          <button
            type="button"
            onClick={() => router.push('/')}
            className="flex items-center gap-1 text-xs uppercase tracking-wider text-white/55 hover:text-white"
          >
            <ChevronLeft className="size-3" /> Exit
          </button>
          <div className="text-xs uppercase tracking-[0.2em] text-white/45">Party Quiz Dev</div>
          <button
            type="button"
            onClick={() => setPanelOpen(false)}
            className="rounded-full p-1 text-white/55 hover:bg-white/10 hover:text-white"
            aria-label="Hide panel"
          >
            <X className="size-4" />
          </button>
        </div>

        {/* Mode tabs */}
        <div className="mt-3 grid grid-cols-2 gap-1 rounded-xl bg-black/30 p-1">
          {(['lobby', 'match'] as const).map((m) => (
            <button
              key={m}
              type="button"
              onClick={() => setMode(m)}
              className={`rounded-lg py-2 text-xs font-bold uppercase tracking-wider transition-colors ${
                mode === m ? 'bg-brand-purple text-white' : 'text-white/55 hover:text-white'
              }`}
            >
              {m}
            </button>
          ))}
        </div>

        {/* Player count */}
        <div className="mt-4">
          <div className="flex items-center justify-between text-xs uppercase tracking-wider text-white/55">
            <span>Players</span>
            <span className="tabular-nums text-white">{playerCount}/6</span>
          </div>
          <div className="mt-2 flex items-center gap-2">
            <button
              type="button"
              onClick={() => setPlayerCount((c) => Math.max(2, c - 1))}
              disabled={playerCount <= 2}
              className="flex size-9 items-center justify-center rounded-lg border border-white/15 bg-white/5 text-white hover:bg-white/10 disabled:opacity-40"
            >
              <Minus className="size-4" />
            </button>
            <div className="flex-1 text-center text-sm text-white/75">
              {memberNames.join(', ')}
            </div>
            <button
              type="button"
              onClick={() => setPlayerCount((c) => Math.min(6, c + 1))}
              disabled={playerCount >= 6}
              className="flex size-9 items-center justify-center rounded-lg border border-white/15 bg-white/5 text-white hover:bg-white/10 disabled:opacity-40"
            >
              <Plus className="size-4" />
            </button>
          </div>
        </div>

        {/* Lobby controls */}
        {mode === 'lobby' && (
          <div className="mt-4 space-y-2">
            <div className="text-xs uppercase tracking-wider text-white/55">Ready toggles</div>
            {memberNames.map((name, idx) => (
              <label
                key={PLAYER_IDS[idx]}
                className="flex items-center justify-between rounded-lg bg-white/5 px-3 py-2 text-sm"
              >
                <span>{name}{idx === 0 && <span className="ml-1 text-[10px] text-brand-yellow">HOST</span>}</span>
                <input
                  type="checkbox"
                  checked={readyFlags[idx] ?? false}
                  onChange={() => toggleReady(idx)}
                  className="size-4 accent-brand-green"
                />
              </label>
            ))}
          </div>
        )}

        {/* Match controls */}
        {mode === 'match' && (
          <div className="mt-4 space-y-3">
            <div className="rounded-lg bg-white/5 p-3 text-xs">
              <div className="flex items-center justify-between text-white/55 uppercase tracking-wider">
                <span>Question</span>
                <span className="tabular-nums text-white">{qIndex + 1}/{TOTAL_QUESTIONS}</span>
              </div>
              <div className="mt-2 flex flex-col gap-2">
                <button
                  type="button"
                  onClick={simulateCorrectRoundAndAdvance}
                  disabled={revealed || showResults}
                  className="rounded-lg bg-brand-yellow py-2 text-xs font-black uppercase tracking-wider text-surface-page hover:bg-brand-yellow/90 disabled:opacity-40"
                >
                  Sim correct round → next
                </button>
                <button
                  type="button"
                  onClick={() => revealRound(false)}
                  disabled={revealed || showResults}
                  className="rounded-lg bg-brand-cyan py-2 text-xs font-bold uppercase tracking-wider text-white hover:bg-brand-cyan-deep disabled:opacity-40"
                >
                  Reveal Round (mixed)
                </button>
                <button
                  type="button"
                  onClick={() => revealRound(true)}
                  disabled={revealed || showResults}
                  className="rounded-lg bg-brand-green py-2 text-xs font-bold uppercase tracking-wider text-white hover:bg-brand-green-deep disabled:opacity-40"
                >
                  Reveal Round (all correct)
                </button>
                <button
                  type="button"
                  onClick={nextQuestion}
                  disabled={!revealed || showResults}
                  className="rounded-lg bg-brand-purple py-2 text-xs font-bold uppercase tracking-wider text-white hover:bg-brand-purple/80 disabled:opacity-40"
                >
                  Next Question
                </button>
                <button
                  type="button"
                  onClick={endNow}
                  disabled={showResults}
                  className="rounded-lg border-2 border-brand-red-soft py-2 text-xs font-bold uppercase tracking-wider text-brand-red-soft hover:bg-brand-red-soft/10 disabled:opacity-40"
                >
                  End → Show Podium
                </button>
              </div>
            </div>

            <div className="rounded-lg bg-white/5 p-3 text-xs space-y-1">
              <div className="text-white/55 uppercase tracking-wider">Live totals</div>
              {memberNames.map((name, idx) => (
                <div key={PLAYER_IDS[idx]} className="flex items-center justify-between">
                  <span className="text-white/80">{name}</span>
                  <span className="tabular-nums text-white">
                    {totals[PLAYER_IDS[idx]!] ?? 0}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {!panelOpen && (
        <button
          type="button"
          onClick={() => setPanelOpen(true)}
          className="fixed right-4 top-4 z-50 rounded-full bg-brand-purple px-4 py-2 text-xs font-bold uppercase tracking-wider text-white shadow-2xl"
        >
          Show Controls
        </button>
      )}
    </div>
  );
}
