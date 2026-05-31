import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useRealtimeMatchStore } from '@/stores/realtimeMatch.store';
import { ROUND_RESULT_HOLD_MS, useRealtimeGameLogic } from '../useRealtimeGameLogic';
import { PENALTY_RESULT_SEQUENCE_HOLD_MS } from '@/features/possession/realtimePossession.helpers';
import { trackAnswerSubmitted } from '@/lib/analytics/game-events';
import type {
  MatchRoundResultPayload,
  MatchStatePayload,
  ResolvedMatchQuestionPayload,
} from '@/lib/realtime/socket.types';

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

vi.mock('@/lib/realtime/socket-client', () => ({
  getSocket: () => ({ emit: vi.fn() }),
}));

vi.mock('@/lib/analytics/game-events', () => ({
  trackAnswerSubmitted: vi.fn(),
}));

// ---------------------------------------------------------------------------
// Constants (mirroring the hook)
// ---------------------------------------------------------------------------

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const MATCH_ID = 'match-1';
const USER_A = 'user-a';
const USER_B = 'user-b';

function seedMatch() {
  const store = useRealtimeMatchStore.getState();
  store.setMatchStart({
    matchId: MATCH_ID,
    mode: 'ranked',
    variant: 'ranked_sim',
    mySeat: 1,
    opponent: { id: USER_B, username: 'opponent', avatarUrl: null },
    participants: [
      { userId: USER_A, username: 'me', avatarUrl: null, seat: 1 },
      { userId: USER_B, username: 'opponent', avatarUrl: null, seat: 2 },
    ],
  });
  // Set selfUserId so the hook can identify "me"
  store.setSelfUserId(USER_A);
  // Clear the countdown so startCountdownActive won't block
  store.setMatchCountdown({
    matchId: MATCH_ID,
    seconds: 0,
    startsAt: new Date(Date.now() - 10_000).toISOString(),
  });
}

function makeQuestion(
  qIndex: number,
  phaseKind: 'normal' | 'last_attack' | 'penalty' = 'normal',
  shooterSeat: 1 | 2 | null = null
): ResolvedMatchQuestionPayload {
  const question: ResolvedMatchQuestionPayload['question'] = {
    kind: 'multipleChoice',
    id: `q-${qIndex}`,
    prompt: `Question ${qIndex}`,
    options: ['A', 'B', 'C', 'D'],
    categoryName: 'General',
  };

  return {
    matchId: MATCH_ID,
    qIndex,
    total: 12,
    question,
    deadlineAt: new Date(Date.now() + 10_000).toISOString(),
    phaseKind,
    shooterSeat,
  };
}

function makeRoundResult(
  qIndex: number,
  opts: {
    phaseKind?: 'normal' | 'last_attack' | 'penalty';
    goalScoredBySeat?: 1 | 2 | null;
    penaltyOutcome?: 'goal' | 'saved' | null;
    shooterSeat?: 1 | 2 | null;
  } = {}
): MatchRoundResultPayload {
  return {
    matchId: MATCH_ID,
    qIndex,
    questionKind: 'multipleChoice',
    reveal: {
      kind: 'multipleChoice',
      correctIndex: 0,
    },
    players: {
      [USER_A]: { totalPoints: 100, pointsEarned: 10, isCorrect: true, timeMs: 3000, selectedIndex: 0, submittedOrderIds: [] },
      [USER_B]: { totalPoints: 80, pointsEarned: 0, isCorrect: false, timeMs: 5000, selectedIndex: 1, submittedOrderIds: [] },
    },
    phaseKind: opts.phaseKind ?? 'normal',
    phaseRound: 6,
    shooterSeat: opts.shooterSeat ?? null,
    deltas: {
      possessionDelta: 10,
      goalScoredBySeat: opts.goalScoredBySeat ?? null,
      penaltyOutcome: opts.penaltyOutcome ?? null,
    },
  };
}

function makeMatchState(
  phase: MatchStatePayload['phase'],
  version = 1
): MatchStatePayload {
  return {
    matchId: MATCH_ID,
    phase,
    half: 2,
    possessionDiff: 55,
    normalQuestionsAnsweredInHalf: 6,
    attackerSeat: 1,
    kickOffSeat: 1,
    goals: { seat1: 1, seat2: 0 },
    penaltyGoals: { seat1: 0, seat2: 0 },
    phaseKind: 'normal',
    phaseRound: 6,
    shooterSeat: null,
    halftime: {
      deadlineAt: null,
      categoryOptions: [],
      firstBanSeat: null,
      bans: { seat1: null, seat2: null },
    },
    stateVersion: version,
  };
}

/**
 * Advance the question through reveal → playing phase so showOptions=true.
 * The hook waits for the reveal delay (playableAt or QUESTION_REVEAL_MS) before
 * setting showOptions. We set playableAt in the past so the timer fires at ~0ms.
 */
function makeQuestionWithImmediatePlay(
  qIndex: number,
  phaseKind: 'normal' | 'last_attack' | 'penalty' = 'normal',
  shooterSeat: 1 | 2 | null = null
): ResolvedMatchQuestionPayload {
  return {
    ...makeQuestion(qIndex, phaseKind, shooterSeat),
    playableAt: new Date(Date.now() - 1000).toISOString(), // already playable
  };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('useRealtimeGameLogic — roundResultHoldDone for goals', () => {
  beforeEach(() => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    vi.clearAllMocks();
    useRealtimeMatchStore.getState().reset();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('sets roundResultHoldDone=true for normal goal round (baseline)', async () => {
    seedMatch();
    const store = useRealtimeMatchStore.getState();

    const { result } = renderHook(() =>
      useRealtimeGameLogic({ transitionDelayMs: 1600 })
    );

    // 1. Question arrives → reveal phase
    act(() => store.setMatchQuestion(makeQuestionWithImmediatePlay(5)));

    // 2. Wait for reveal → playing phase transition (playableAt is in the past, so ~0ms)
    await act(async () => { vi.advanceTimersByTime(50); });

    expect(result.current.state.showOptions).toBe(true);

    // 3. Round result arrives (normal goal)
    act(() => {
      store.setRoundResult(makeRoundResult(5, { phaseKind: 'normal', goalScoredBySeat: 1 }));
    });

    expect(result.current.state.roundResolved).toBe(true);
    expect(result.current.state.roundResultHoldDone).toBe(false);

    // 4. Advance past ROUND_RESULT_HOLD_MS → options hidden, roundResultHoldDone=true
    await act(async () => { vi.advanceTimersByTime(ROUND_RESULT_HOLD_MS + 50); });

    expect(result.current.state.showOptions).toBe(false);
    expect(result.current.state.roundResultHoldDone).toBe(true);
  });

  it('sets roundResultHoldDone=true for last_attack goal round (the fix)', async () => {
    seedMatch();
    const store = useRealtimeMatchStore.getState();

    const { result } = renderHook(() =>
      useRealtimeGameLogic({ transitionDelayMs: 1600 })
    );

    // 1. Last attack question arrives
    act(() => store.setMatchQuestion(makeQuestionWithImmediatePlay(6, 'last_attack')));

    // 2. Wait for reveal → playing
    await act(async () => { vi.advanceTimersByTime(50); });
    expect(result.current.state.showOptions).toBe(true);

    // 3. Round result: last_attack goal + match:state COMPLETED
    act(() => {
      store.setRoundResult(makeRoundResult(6, { phaseKind: 'last_attack', goalScoredBySeat: 1 }));
      store.setMatchState(makeMatchState('COMPLETED', 2));
    });

    expect(result.current.state.roundResolved).toBe(true);
    expect(result.current.state.roundResultHoldDone).toBe(false);

    // 4. Advance past ROUND_RESULT_HOLD_MS
    await act(async () => { vi.advanceTimersByTime(ROUND_RESULT_HOLD_MS + 50); });

    // Must be true — this is the core fix
    expect(result.current.state.roundResultHoldDone).toBe(true);
    expect(result.current.state.showOptions).toBe(false);
  });

  it('sets roundResultHoldDone for last_attack non-goal round so penalties/halftime can wait for the extra-question animation', async () => {
    seedMatch();
    const store = useRealtimeMatchStore.getState();

    const { result } = renderHook(() =>
      useRealtimeGameLogic({ transitionDelayMs: 1600 })
    );

    // 1. Last attack question
    act(() => store.setMatchQuestion(makeQuestionWithImmediatePlay(6, 'last_attack')));
    await act(async () => { vi.advanceTimersByTime(50); });
    expect(result.current.state.showOptions).toBe(true);

    // 2. Round result: last_attack, no goal (attacker answered wrong)
    act(() => {
      store.setRoundResult(makeRoundResult(6, { phaseKind: 'last_attack', goalScoredBySeat: null }));
    });

    expect(result.current.state.roundResolved).toBe(true);

    // 3. Advance past hold
    await act(async () => { vi.advanceTimersByTime(ROUND_RESULT_HOLD_MS + 50); });

    expect(result.current.state.roundResultHoldDone).toBe(true);
    expect(result.current.state.showOptions).toBe(false);
  });

  it('keeps penalty results mounted long enough for the kick and result splash before advancing', async () => {
    seedMatch();
    const store = useRealtimeMatchStore.getState();

    const { result } = renderHook(() =>
      useRealtimeGameLogic({ transitionDelayMs: 1600 })
    );

    act(() => store.setMatchQuestion(makeQuestionWithImmediatePlay(13, 'penalty', 2)));
    await act(async () => { vi.advanceTimersByTime(50); });
    expect(result.current.state.showOptions).toBe(true);

    act(() => {
      store.setRoundResult(makeRoundResult(13, {
        phaseKind: 'penalty',
        goalScoredBySeat: null,
        penaltyOutcome: 'saved',
        shooterSeat: 2,
      }));
    });

    await act(async () => { vi.advanceTimersByTime(ROUND_RESULT_HOLD_MS + 50); });
    expect(result.current.state.roundResultHoldDone).toBe(false);
    expect(result.current.state.showOptions).toBe(true);

    await act(async () => {
      vi.advanceTimersByTime(PENALTY_RESULT_SEQUENCE_HOLD_MS - ROUND_RESULT_HOLD_MS + 50);
    });

    expect(result.current.state.roundResultHoldDone).toBe(true);
    expect(result.current.state.showOptions).toBe(false);
  });

  it('preserves roundResult data when COMPLETED state arrives with lastRoundResult', async () => {
    seedMatch();
    const store = useRealtimeMatchStore.getState();

    const { result } = renderHook(() =>
      useRealtimeGameLogic({ transitionDelayMs: 1600 })
    );

    // 1. Question → playing
    act(() => store.setMatchQuestion(makeQuestionWithImmediatePlay(11)));
    await act(async () => { vi.advanceTimersByTime(50); });

    // 2. Round result + COMPLETED arrive together (simulating real socket sequence)
    act(() => {
      store.setRoundResult(makeRoundResult(11, { phaseKind: 'normal', goalScoredBySeat: 2 }));
      store.setMatchState(makeMatchState('COMPLETED', 3));
    });

    // roundResult should still be available (store preserves it now)
    expect(result.current.state.roundResolved).toBe(true);
    expect(result.current.state.roundResult).not.toBeNull();
    expect(result.current.state.roundResult?.deltas?.goalScoredBySeat).toBe(2);
  });

  it('halftime: roundResult preserved and roundResultHoldDone fires for normal goal', async () => {
    seedMatch();
    const store = useRealtimeMatchStore.getState();

    const { result } = renderHook(() =>
      useRealtimeGameLogic({ transitionDelayMs: 1600 })
    );

    // 1. Question → playing
    act(() => store.setMatchQuestion(makeQuestionWithImmediatePlay(5)));
    await act(async () => { vi.advanceTimersByTime(50); });

    // 2. Normal goal + HALFTIME
    act(() => {
      store.setRoundResult(makeRoundResult(5, { phaseKind: 'normal', goalScoredBySeat: 1 }));
      store.setMatchState(makeMatchState('HALFTIME', 2));
    });

    expect(result.current.state.roundResolved).toBe(true);

    // 3. Wait for hold
    await act(async () => { vi.advanceTimersByTime(ROUND_RESULT_HOLD_MS + 50); });

    expect(result.current.state.roundResultHoldDone).toBe(true);
    expect(result.current.state.showOptions).toBe(false);
  });

  it('uses server time offset when deciding when answer options become playable', async () => {
    vi.setSystemTime(new Date('2026-05-29T12:00:00.000Z'));
    seedMatch();
    const store = useRealtimeMatchStore.getState();
    const localNow = Date.now();
    const serverTimeOffsetMs = 5_000;
    const serverNow = localNow + serverTimeOffsetMs;

    const { result } = renderHook(() =>
      useRealtimeGameLogic({ transitionDelayMs: 1600 })
    );

    act(() => store.setMatchQuestion({
      ...makeQuestion(7),
      playableAt: new Date(serverNow + 1_000).toISOString(),
      deadlineAt: new Date(serverNow + 11_000).toISOString(),
      serverTimeOffsetMs,
    }));

    expect(result.current.state.showOptions).toBe(false);

    await act(async () => { vi.advanceTimersByTime(500); });
    expect(result.current.state.showOptions).toBe(false);

    await act(async () => { vi.advanceTimersByTime(500); });
    expect(result.current.state.showOptions).toBe(true);
  });

  it('tracks MCQ answer submissions once when the answer ack arrives', async () => {
    vi.setSystemTime(new Date('2026-05-29T13:00:00.000Z'));
    seedMatch();
    const store = useRealtimeMatchStore.getState();

    const { result } = renderHook(() =>
      useRealtimeGameLogic({ transitionDelayMs: 1600 })
    );

    act(() => store.setMatchQuestion(makeQuestionWithImmediatePlay(9)));
    await act(async () => { vi.advanceTimersByTime(50); });

    act(() => result.current.actions.submitAnswer(0));
    act(() => store.setAnswerAck({
      matchId: MATCH_ID,
      qIndex: 9,
      questionKind: 'multipleChoice',
      selectedIndex: 0,
      isCorrect: true,
      correctIndex: 0,
      myTotalPoints: 100,
      oppAnswered: false,
      pointsEarned: 100,
      phaseKind: 'normal',
      phaseRound: 9,
      shooterSeat: null,
    }));
    await act(async () => {});

    expect(trackAnswerSubmitted).toHaveBeenCalledTimes(1);
  });

  it('does not expose opponent answered UI before the local question is playable', async () => {
    vi.setSystemTime(new Date('2026-05-29T12:30:00.000Z'));
    seedMatch();
    const store = useRealtimeMatchStore.getState();
    const localNow = Date.now();
    const serverTimeOffsetMs = 5_000;
    const serverNow = localNow + serverTimeOffsetMs;

    const { result } = renderHook(() =>
      useRealtimeGameLogic({ transitionDelayMs: 1600 })
    );

    act(() => store.setMatchQuestion({
      ...makeQuestion(8),
      playableAt: new Date(serverNow + 1_000).toISOString(),
      deadlineAt: new Date(serverNow + 11_000).toISOString(),
      serverTimeOffsetMs,
    }));

    act(() => store.setOpponentAnswered({
      matchId: MATCH_ID,
      qIndex: 8,
      opponentTotalPoints: 80,
      pointsEarned: 80,
      isCorrect: true,
      selectedIndex: 0,
    }));

    expect(result.current.state.showOptions).toBe(false);
    expect(result.current.state.opponentAnswered).toBe(false);
    expect(result.current.state.opponentScore).toBe(0);

    await act(async () => { vi.advanceTimersByTime(1_000); });

    expect(result.current.state.showOptions).toBe(true);
    expect(result.current.state.opponentAnswered).toBe(true);
    expect(result.current.state.opponentScore).toBe(80);
  });
});
