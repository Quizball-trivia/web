import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useRealtimeMatchStore } from '@/stores/realtimeMatch.store';
import { ROUND_RESULT_HOLD_MS, useRealtimeGameLogic } from '../useRealtimeGameLogic';
import { QUESTION_REVEAL_MS } from '@/features/possession/types/possession.types';
import {
  PENALTY_RESULT_DISPLAY_DELAY_MS,
  PENALTY_RESULT_SEQUENCE_HOLD_MS,
  PENALTY_RESULT_SPLASH_MS,
  PENALTY_SCORE_FLIGHT_HANDOFF_MS,
} from '@/features/possession/realtimePossession.helpers';
import { getBarBattleGoalAttackDelayMs } from '@/features/possession/hooks/useBarBattle';
import type {
  MatchRoundResultPayload,
  MatchStatePayload,
  ResolvedMatchQuestionPayload,
} from '@/lib/realtime/socket.types';

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

const socketEmitMock = vi.hoisted(() => vi.fn());

vi.mock('@/lib/realtime/socket-client', () => ({
  getSocket: () => ({ emit: socketEmitMock }),
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

function seedMatch(options: { clearCountdown?: boolean } = {}) {
  const { clearCountdown = true } = options;
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
  if (clearCountdown) {
    // Clear the countdown so startCountdownActive won't block
    store.setMatchCountdown({
      matchId: MATCH_ID,
      seconds: 0,
      startsAt: new Date(Date.now() - 10_000).toISOString(),
    });
  }
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

function getSocketEmitCalls(eventName: string) {
  return socketEmitMock.mock.calls.filter((call) => call[0] === eventName);
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

describe('useRealtimeGameLogic', () => {
  beforeEach(() => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    vi.clearAllMocks();
    useRealtimeMatchStore.getState().reset();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('does not keep q0 hidden behind a stale kickoff countdown once the server sends the first question', async () => {
    vi.setSystemTime(new Date('2026-06-13T12:00:00.000Z'));
    seedMatch({ clearCountdown: false });
    const store = useRealtimeMatchStore.getState();

    const { result } = renderHook(() =>
      useRealtimeGameLogic({ transitionDelayMs: 1600 })
    );

    expect(result.current.state.startCountdownActive).toBe(true);

    act(() => store.setMatchQuestion(makeQuestionWithImmediatePlay(0)));

    expect(useRealtimeMatchStore.getState().match?.countdownEndsAt).toBeNull();
    expect(result.current.state.startCountdownActive).toBe(false);

    await act(async () => { vi.advanceTimersByTime(50); });

    expect(result.current.state.currentQuestion?.qIndex).toBe(0);
    expect(result.current.state.showOptions).toBe(true);
  });

  it('emits reveal ack exactly once when options unlock and re-emits for the next question', async () => {
    vi.setSystemTime(new Date('2026-06-14T12:00:00.000Z'));
    seedMatch();
    const store = useRealtimeMatchStore.getState();
    const now = Date.now();

    const { result } = renderHook(() =>
      useRealtimeGameLogic({ transitionDelayMs: 1600 })
    );

    act(() => store.setMatchQuestion({
      ...makeQuestion(1),
      playableAt: new Date(now + 500).toISOString(),
      deadlineAt: new Date(now + 10_500).toISOString(),
    }));

    await act(async () => { vi.advanceTimersByTime(499); });

    expect(result.current.state.showOptions).toBe(false);
    expect(getSocketEmitCalls('match:question_revealed')).toHaveLength(0);

    await act(async () => { vi.advanceTimersByTime(1); });

    expect(result.current.state.showOptions).toBe(true);
    expect(getSocketEmitCalls('match:question_revealed')).toEqual([
      ['match:question_revealed', { matchId: MATCH_ID, qIndex: 1 }],
    ]);

    act(() => store.setMatchPaused({ graceMs: 60_000, remainingReconnects: 2 }));
    expect(result.current.state.showOptions).toBe(false);

    act(() => store.clearMatchPaused());
    await act(async () => { vi.advanceTimersByTime(50); });

    expect(getSocketEmitCalls('match:question_revealed')).toHaveLength(1);

    act(() => store.setMatchQuestion(makeQuestionWithImmediatePlay(2)));
    await act(async () => { vi.advanceTimersByTime(50); });

    expect(getSocketEmitCalls('match:question_revealed')).toEqual([
      ['match:question_revealed', { matchId: MATCH_ID, qIndex: 1 }],
      ['match:question_revealed', { matchId: MATCH_ID, qIndex: 2 }],
    ]);
  });

  it('emits reveal ack when the fallback reveal delay unlocks options', async () => {
    vi.setSystemTime(new Date('2026-06-14T12:05:00.000Z'));
    seedMatch();
    const store = useRealtimeMatchStore.getState();

    const { result } = renderHook(() =>
      useRealtimeGameLogic({ transitionDelayMs: 1600 })
    );

    act(() => store.setMatchQuestion(makeQuestion(3)));

    expect(result.current.state.showOptions).toBe(false);

    await act(async () => { vi.advanceTimersByTime(QUESTION_REVEAL_MS); });

    expect(result.current.state.showOptions).toBe(true);
    expect(getSocketEmitCalls('match:question_revealed')).toEqual([
      ['match:question_revealed', { matchId: MATCH_ID, qIndex: 3 }],
    ]);
  });

  it('measures answer time from actual unlock when options unlock after playableAt', async () => {
    vi.setSystemTime(new Date('2026-06-14T12:10:00.000Z'));
    seedMatch();
    const store = useRealtimeMatchStore.getState();
    const now = Date.now();
    const playableAtMs = now + 1_000;

    const { result, rerender } = renderHook(
      ({ blockReveal }: { blockReveal: boolean }) =>
        useRealtimeGameLogic({ transitionDelayMs: 1600, blockReveal }),
      { initialProps: { blockReveal: true } }
    );

    act(() => store.setMatchQuestion({
      ...makeQuestion(4),
      playableAt: new Date(playableAtMs).toISOString(),
      deadlineAt: new Date(now + 11_000).toISOString(),
    }));

    await act(async () => { vi.advanceTimersByTime(1_500); });

    expect(result.current.state.showOptions).toBe(false);

    act(() => rerender({ blockReveal: false }));
    await act(async () => { vi.advanceTimersByTime(0); });

    expect(result.current.state.showOptions).toBe(true);

    const unlockedAtMs = Date.now();
    expect(unlockedAtMs).toBeGreaterThan(playableAtMs);

    await act(async () => { vi.advanceTimersByTime(2_000); });

    act(() => result.current.actions.submitAnswer(2));

    const answerCall = getSocketEmitCalls('match:answer').at(-1);
    expect(answerCall).toEqual([
      'match:answer',
      {
        matchId: MATCH_ID,
        qIndex: 4,
        selectedIndex: 2,
        timeMs: Date.now() - unlockedAtMs,
      },
    ]);
    expect(answerCall?.[1]).not.toMatchObject({
      timeMs: Date.now() - playableAtMs,
    });
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

    // The hold is now bar-battle-aware: it waits for the shot (which waits for
    // the bars) plus the result display + splash, so the SAVED!/GOAL! splash
    // isn't cut off. Compute the same hold the hook does for this round's points
    // (self USER_A earned 10, opponent USER_B earned 0).
    const shotDelayMs = getBarBattleGoalAttackDelayMs(10, 0, PENALTY_SCORE_FLIGHT_HANDOFF_MS, {
      includeScoreFlightHandoff: true,
    });
    const penaltyHoldMs = Math.max(
      PENALTY_RESULT_SEQUENCE_HOLD_MS,
      shotDelayMs + PENALTY_RESULT_DISPLAY_DELAY_MS + PENALTY_RESULT_SPLASH_MS,
    );

    await act(async () => {
      vi.advanceTimersByTime(penaltyHoldMs - ROUND_RESULT_HOLD_MS + 50);
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

  it('hides answer options while a paused match is in the resume handoff', async () => {
    seedMatch();
    const store = useRealtimeMatchStore.getState();

    const { result } = renderHook(() =>
      useRealtimeGameLogic({ transitionDelayMs: 1600 })
    );

    act(() => store.setMatchQuestion(makeQuestionWithImmediatePlay(9)));
    await act(async () => { vi.advanceTimersByTime(50); });

    expect(result.current.state.showOptions).toBe(true);

    act(() => {
      store.setMatchPaused({ graceMs: 60_000, remainingReconnects: 2 });
      store.setMatchCountdown({
        matchId: MATCH_ID,
        seconds: 5,
        startsAt: new Date(Date.now() + 5_000).toISOString(),
        reason: 'resume',
      });
    });

    expect(result.current.state.matchPaused).toBe(true);
    expect(result.current.state.startCountdownActive).toBe(true);
    expect(result.current.state.showOptions).toBe(false);

    await act(async () => { vi.advanceTimersByTime(5_100); });

    expect(result.current.state.matchPaused).toBe(true);
    expect(result.current.state.startCountdownActive).toBe(false);
    expect(result.current.state.showOptions).toBe(false);
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
