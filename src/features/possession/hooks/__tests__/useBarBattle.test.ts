import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { MatchRoundResultPayload, MatchRoundResultPlayer } from '@/lib/realtime/socket.types';
import { useRealtimeMatchStore } from '@/stores/realtimeMatch.store';
import {
  getBarBattleFieldLockMs,
  getBarBattleGoalAttackDelayMs,
  getBarBattleTotalMs,
  useBarBattle,
} from '../useBarBattle';

const MATCH_ID = 'match-1';

function makePlayer(
  pointsEarned: number,
  isCorrect: boolean,
  possessionPointsEarned = pointsEarned
): MatchRoundResultPlayer {
  return {
    selectedIndex: null,
    isCorrect,
    timeMs: 3000,
    pointsEarned,
    possessionPointsEarned,
    totalPoints: pointsEarned,
    submittedOrderIds: [],
  };
}

function makeGoalRoundResult(): MatchRoundResultPayload {
  return {
    matchId: MATCH_ID,
    qIndex: 4,
    questionKind: 'clues',
    reveal: {
      kind: 'clues',
      displayAnswer: { en: 'Gregor Kobel' },
    },
    phaseKind: 'normal',
    phaseRound: 5,
    players: {
      me: makePlayer(0, false),
      opp: makePlayer(100, true),
    },
    deltas: {
      possessionDelta: -100,
      goalScoredBySeat: 2,
      penaltyOutcome: null,
    },
  };
}

function makeRoundResult(
  playerPoints: number,
  opponentPoints: number,
  goalScoredBySeat: 1 | 2 | null = null,
  phaseKind: 'normal' | 'last_attack' = 'normal'
): MatchRoundResultPayload {
  return {
    matchId: MATCH_ID,
    qIndex: 5,
    questionKind: 'multipleChoice',
    reveal: {
      kind: 'multipleChoice',
      correctIndex: 0,
    },
    phaseKind,
    phaseRound: 6,
    players: {
      me: makePlayer(playerPoints, playerPoints > 0),
      opp: makePlayer(opponentPoints, opponentPoints > 0),
    },
    deltas: {
      possessionDelta: playerPoints - opponentPoints,
      goalScoredBySeat,
      penaltyOutcome: null,
    },
  };
}

function makePenaltyRoundResult(
  playerPoints: number,
  opponentPoints: number,
  penaltyOutcome: 'goal' | 'saved'
): MatchRoundResultPayload {
  return {
    ...makeRoundResult(playerPoints, opponentPoints),
    phaseKind: 'penalty',
    phaseRound: 3,
    deltas: {
      possessionDelta: 0,
      goalScoredBySeat: null,
      penaltyOutcome,
    },
  };
}

describe('useBarBattle', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    useRealtimeMatchStore.setState({ match: null });
    vi.useRealTimers();
  });

  it('still runs the score-to-bars sequence for goal rounds', async () => {
    const myRound = makePlayer(0, false);
    const opponentRound = makePlayer(100, true);
    const roundResult = makeGoalRoundResult();

    const { result } = renderHook(() => useBarBattle({
      answerAck: {
        matchId: MATCH_ID,
        qIndex: 4,
        questionKind: 'clues',
        selectedIndex: null,
        isCorrect: false,
        myTotalPoints: 0,
        oppAnswered: true,
        pointsEarned: 0,
        phaseKind: 'normal',
        phaseRound: 5,
        clueIndex: null,
      },
      opponentAnswered: true,
      opponentRecentPoints: 100,
      opponentAnsweredCorrectly: true,
      roundResult,
      myRound,
      opponentRound,
      phaseKind: 'normal',
      dividerX: 250,
    }));

    await act(async () => {});

    expect(result.current).toMatchObject({
      phase: 'both-score',
      playerPoints: 0,
      opponentPoints: 100,
      opponentBars: 10,
      remainingDelta: -10,
    });

    act(() => {
      vi.advanceTimersByTime(871);
    });

    expect(result.current).toMatchObject({
      phase: 'charge',
      opponentBars: 10,
      remainingDelta: -10,
    });
  });

  it('delays one-sided goal shots for the charge handoff', () => {
    const nonShotTotalMs = getBarBattleTotalMs(100, 0);
    const handoffMs = getBarBattleGoalAttackDelayMs(100, 0, 1000);

    expect(handoffMs).toBeGreaterThan(nonShotTotalMs);
    expect(handoffMs - nonShotTotalMs).toBeLessThan(700);
  });

  it('starts ranked bars after the shortened score-flight handoff', async () => {
    useRealtimeMatchStore.setState({ match: { variant: 'ranked_sim' } as never });

    const myRound = makePlayer(70, true);
    const opponentRound = makePlayer(0, false);
    const roundResult = makeRoundResult(70, 0);

    const { result } = renderHook(() => useBarBattle({
      answerAck: {
        matchId: MATCH_ID,
        qIndex: 5,
        questionKind: 'multipleChoice',
        selectedIndex: 0,
        isCorrect: true,
        myTotalPoints: 70,
        oppAnswered: true,
        pointsEarned: 70,
        phaseKind: 'normal',
        phaseRound: 6,
      },
      opponentAnswered: true,
      opponentRecentPoints: 0,
      opponentAnsweredCorrectly: false,
      roundResult,
      myRound,
      opponentRound,
      phaseKind: 'normal',
      dividerX: 250,
    }));

    await act(async () => {});

    act(() => {
      vi.advanceTimersByTime(499);
    });

    expect(result.current).toMatchObject({
      phase: 'convert',
      playerBars: 7,
      opponentBars: 0,
    });

    act(() => {
      vi.advanceTimersByTime(1);
    });

    expect(result.current).toMatchObject({
      phase: 'bars',
      playerBars: 7,
      opponentBars: 0,
    });
  });

  it('does not charge surviving bars after a normal non-shot collision', async () => {
    const myRound = makePlayer(80, true);
    const opponentRound = makePlayer(30, true);
    const roundResult = makeRoundResult(80, 30);

    const { result } = renderHook(() => useBarBattle({
      answerAck: {
        matchId: MATCH_ID,
        qIndex: 5,
        questionKind: 'multipleChoice',
        selectedIndex: 0,
        isCorrect: true,
        myTotalPoints: 80,
        oppAnswered: true,
        pointsEarned: 80,
        phaseKind: 'normal',
        phaseRound: 6,
      },
      opponentAnswered: true,
      opponentRecentPoints: 30,
      opponentAnsweredCorrectly: true,
      roundResult,
      myRound,
      opponentRound,
      phaseKind: 'normal',
      dividerX: 250,
    }));

    await act(async () => {});

    act(() => {
      vi.advanceTimersByTime(755);
    });

    expect(result.current).toMatchObject({
      phase: 'battle',
      playerBars: 8,
      opponentBars: 3,
      remainingDelta: 5,
    });

    act(() => {
      vi.advanceTimersByTime(836);
    });

    expect(result.current).toMatchObject({
      phase: 'result',
      playerBars: 8,
      opponentBars: 3,
      remainingDelta: 5,
    });
  });

  it('can pulse one-sided surviving bars before normal possession movement', async () => {
    const myRound = makePlayer(70, true);
    const opponentRound = makePlayer(0, false);
    const roundResult = makeRoundResult(70, 0);

    const { result } = renderHook(() => useBarBattle({
      answerAck: {
        matchId: MATCH_ID,
        qIndex: 5,
        questionKind: 'multipleChoice',
        selectedIndex: 0,
        isCorrect: true,
        myTotalPoints: 70,
        oppAnswered: true,
        pointsEarned: 70,
        phaseKind: 'normal',
        phaseRound: 6,
      },
      opponentAnswered: true,
      opponentRecentPoints: 0,
      opponentAnsweredCorrectly: false,
      roundResult,
      myRound,
      opponentRound,
      phaseKind: 'normal',
      dividerX: 250,
      unopposedBarPulse: true,
    }));

    await act(async () => {});

    act(() => {
      vi.advanceTimersByTime(700);
    });

    expect(result.current).toMatchObject({
      phase: 'charge',
      chargeMode: 'pulse',
      playerBars: 7,
      opponentBars: 0,
      remainingDelta: 7,
    });

    act(() => {
      vi.advanceTimersByTime(1030);
    });

    expect(result.current).toMatchObject({
      phase: 'result',
      playerBars: 7,
      opponentBars: 0,
      remainingDelta: 7,
    });
  });

  it('keeps only a minimal movement delay after a one-sided pulse cleanup', () => {
    const totalMs = getBarBattleTotalMs(70, 0, { includeUnopposedPulse: true });
    const fieldLockMs = getBarBattleFieldLockMs(70, 0, { includeUnopposedPulse: true });

    expect(fieldLockMs - totalMs).toBe(60);
  });

  it('charges surviving bars after a shot collision before the goal animation', async () => {
    const myRound = makePlayer(80, true);
    const opponentRound = makePlayer(30, true);
    const roundResult = makeRoundResult(80, 30, 1);

    const { result } = renderHook(() => useBarBattle({
      answerAck: {
        matchId: MATCH_ID,
        qIndex: 5,
        questionKind: 'multipleChoice',
        selectedIndex: 0,
        isCorrect: true,
        myTotalPoints: 80,
        oppAnswered: true,
        pointsEarned: 80,
        phaseKind: 'normal',
        phaseRound: 6,
      },
      opponentAnswered: true,
      opponentRecentPoints: 30,
      opponentAnsweredCorrectly: true,
      roundResult,
      myRound,
      opponentRound,
      phaseKind: 'normal',
      dividerX: 250,
    }));

    await act(async () => {});

    act(() => {
      vi.advanceTimersByTime(755);
    });

    expect(result.current).toMatchObject({
      phase: 'battle',
      playerBars: 8,
      opponentBars: 3,
      remainingDelta: 5,
    });

    act(() => {
      vi.advanceTimersByTime(836);
    });

    expect(result.current).toMatchObject({
      phase: 'charge',
      playerBars: 8,
      opponentBars: 3,
      remainingDelta: 5,
    });
  });

  it('carries penalty save outcome into the charge animation state', async () => {
    const myRound = makePlayer(50, true);
    const opponentRound = makePlayer(0, false);
    const roundResult = makePenaltyRoundResult(50, 0, 'saved');

    const { result } = renderHook(() => useBarBattle({
      answerAck: {
        matchId: MATCH_ID,
        qIndex: 5,
        questionKind: 'multipleChoice',
        selectedIndex: 0,
        isCorrect: true,
        myTotalPoints: 50,
        oppAnswered: true,
        pointsEarned: 50,
        phaseKind: 'penalty',
        phaseRound: 3,
      },
      opponentAnswered: true,
      opponentRecentPoints: 0,
      opponentAnsweredCorrectly: false,
      roundResult,
      myRound,
      opponentRound,
      phaseKind: 'penalty',
      dividerX: 250,
    }));

    await act(async () => {});

    act(() => {
      vi.advanceTimersByTime(950);
    });

    expect(result.current).toMatchObject({
      phase: 'charge',
      penaltyOutcome: 'saved',
      playerBars: 5,
      remainingDelta: 5,
    });

    act(() => {
      vi.advanceTimersByTime(1300);
    });

    expect(result.current).toMatchObject({
      phase: 'result',
      penaltyOutcome: 'saved',
      playerBars: 5,
      remainingDelta: 5,
    });
  });

  it('keeps zero-zero penalty resolution alive for score-flight targets', async () => {
    const myRound = makePlayer(0, false);
    const opponentRound = makePlayer(0, false);
    const roundResult = makePenaltyRoundResult(0, 0, 'saved');

    const { result } = renderHook(() => useBarBattle({
      answerAck: {
        matchId: MATCH_ID,
        qIndex: 5,
        questionKind: 'multipleChoice',
        selectedIndex: 1,
        isCorrect: false,
        myTotalPoints: 0,
        oppAnswered: true,
        pointsEarned: 0,
        phaseKind: 'penalty',
        phaseRound: 3,
      },
      opponentAnswered: true,
      opponentRecentPoints: 0,
      opponentAnsweredCorrectly: false,
      roundResult,
      myRound,
      opponentRound,
      phaseKind: 'penalty',
      dividerX: 250,
    }));

    await act(async () => {});

    expect(result.current).toMatchObject({
      phase: 'both-score',
      playerPoints: 0,
      opponentPoints: 0,
      playerBars: 0,
      opponentBars: 0,
      remainingDelta: 0,
      penaltyOutcome: 'saved',
    });
  });

  it('uses boosted possession points for bar battle resolution while preserving base points', async () => {
    const myRound = makePlayer(80, true);
    const opponentRound = makePlayer(80, true, 160);
    const roundResult = makeRoundResult(80, 80);
    roundResult.players.opp = opponentRound;
    roundResult.deltas = {
      possessionDelta: -80,
      goalScoredBySeat: null,
      penaltyOutcome: null,
      speedStreakBoostedSeat: 2,
    };

    const { result } = renderHook(() => useBarBattle({
      answerAck: {
        matchId: MATCH_ID,
        qIndex: 5,
        questionKind: 'multipleChoice',
        selectedIndex: 0,
        isCorrect: true,
        myTotalPoints: 80,
        oppAnswered: true,
        pointsEarned: 80,
        phaseKind: 'normal',
        phaseRound: 6,
      },
      opponentAnswered: true,
      opponentRecentPoints: 80,
      opponentAnsweredCorrectly: true,
      roundResult,
      myRound,
      opponentRound,
      phaseKind: 'normal',
      dividerX: 250,
      mySeat: 1,
    }));

    await act(async () => {});

    expect(result.current).toMatchObject({
      phase: 'both-score',
      playerPoints: 80,
      opponentPoints: 160,
      playerBars: 8,
      opponentBars: 16,
      remainingDelta: -8,
    });
  });

  it('ignores stray possession points when no speed-streak boost fired', async () => {
    const myRound = makePlayer(100, true);
    const opponentRound = makePlayer(10, true, 20);
    const roundResult = makeRoundResult(100, 10);
    roundResult.players.opp = opponentRound;
    roundResult.deltas = {
      possessionDelta: 90,
      goalScoredBySeat: null,
      penaltyOutcome: null,
      speedStreakBoostedSeat: null,
    };

    const { result } = renderHook(() => useBarBattle({
      answerAck: {
        matchId: MATCH_ID,
        qIndex: 5,
        questionKind: 'multipleChoice',
        selectedIndex: 0,
        isCorrect: true,
        myTotalPoints: 100,
        oppAnswered: true,
        pointsEarned: 100,
        phaseKind: 'normal',
        phaseRound: 6,
      },
      opponentAnswered: true,
      opponentRecentPoints: 10,
      opponentAnsweredCorrectly: true,
      roundResult,
      myRound,
      opponentRound,
      phaseKind: 'normal',
      dividerX: 250,
      mySeat: 1,
    }));

    await act(async () => {});

    expect(result.current).toMatchObject({
      phase: 'both-score',
      playerPoints: 100,
      opponentPoints: 10,
      playerBars: 10,
      opponentBars: 1,
      remainingDelta: 9,
    });
  });

  it('runs the bar-battle sequence for extra-question last-attack rounds', async () => {
    const myRound = makePlayer(90, true);
    const opponentRound = makePlayer(20, true);
    const roundResult = makeRoundResult(90, 20, 1, 'last_attack');

    const { result } = renderHook(() => useBarBattle({
      answerAck: {
        matchId: MATCH_ID,
        qIndex: 5,
        questionKind: 'multipleChoice',
        selectedIndex: 0,
        isCorrect: true,
        myTotalPoints: 90,
        oppAnswered: true,
        pointsEarned: 90,
        phaseKind: 'last_attack',
        phaseRound: 1,
      },
      opponentAnswered: true,
      opponentRecentPoints: 20,
      opponentAnsweredCorrectly: true,
      roundResult,
      myRound,
      opponentRound,
      phaseKind: 'last_attack',
      dividerX: 250,
    }));

    await act(async () => {});

    expect(result.current).toMatchObject({
      phase: 'both-score',
      playerPoints: 90,
      opponentPoints: 20,
      playerBars: 9,
      opponentBars: 2,
    });

    act(() => {
      vi.advanceTimersByTime(820);
    });

    expect(result.current).toMatchObject({
      phase: 'battle',
      remainingDelta: 7,
    });
  });
});
