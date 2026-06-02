import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useRealtimeMatchStore } from '@/stores/realtimeMatch.store';
import { usePossessionBarBattleFlights } from '../usePossessionBarBattleFlights';

const MATCH_ID = 'match-1';

function rect(left: number, top: number, width = 40, height = 40): DOMRect {
  return {
    x: left,
    y: top,
    left,
    top,
    width,
    height,
    right: left + width,
    bottom: top + height,
    toJSON: () => ({}),
  } as DOMRect;
}

function appendAnchor(selectorAttr: string, value: string, bounds: DOMRect) {
  const element = document.createElement('div');
  element.setAttribute(selectorAttr, value);
  element.getBoundingClientRect = () => bounds;
  document.body.appendChild(element);
}

describe('usePossessionBarBattleFlights', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    document.body.innerHTML = '';
    useRealtimeMatchStore.getState().reset();

    appendAnchor('data-splash-anchor', 'player', rect(40, 420));
    appendAnchor('data-splash-anchor', 'opponent', rect(400, 420));
    appendAnchor('data-pitch-avatar', 'player', rect(120, 120));
    appendAnchor('data-pitch-avatar', 'opponent', rect(340, 120));
    appendAnchor('data-pitch-field', 'possession', rect(20, 40, 460, 260));
  });

  afterEach(() => {
    document.body.innerHTML = '';
    useRealtimeMatchStore.getState().reset();
    vi.useRealTimers();
  });

  it('fires score flights for last-attack extra questions', async () => {
    useRealtimeMatchStore.setState({
      match: {
        variant: 'ranked_sim',
        matchId: MATCH_ID,
        mySeat: 1,
        currentQuestionPhase: 'playing',
        currentQuestion: {
          matchId: MATCH_ID,
          qIndex: 12,
          total: 13,
          phaseKind: 'last_attack',
          phaseRound: 1,
          question: {
            kind: 'multipleChoice',
            id: 'extra-q',
            prompt: 'Extra question',
            options: ['A', 'B', 'C', 'D'],
            categoryName: 'General',
          },
          deadlineAt: new Date(Date.now() + 10_000).toISOString(),
        },
        answerAck: {
          matchId: MATCH_ID,
          qIndex: 12,
          questionKind: 'multipleChoice',
          selectedIndex: 0,
          isCorrect: true,
          correctIndex: 0,
          myTotalPoints: 100,
          oppAnswered: false,
          pointsEarned: 90,
          phaseKind: 'last_attack',
          phaseRound: 1,
        },
        possessionState: {
          phaseKind: 'last_attack',
        },
      } as never,
    });

    const { result } = renderHook(() => usePossessionBarBattleFlights());

    await act(async () => {
      vi.advanceTimersByTime(250);
    });

    expect(result.current.flights).toHaveLength(1);
    expect(result.current.flights[0]).toMatchObject({
      side: 'player',
      points: 90,
      failed: false,
    });
  });

  it('fires the local penalty score flight immediately from answer_ack', async () => {
    useRealtimeMatchStore.setState({
      match: {
        variant: 'ranked_sim',
        matchId: MATCH_ID,
        mySeat: 1,
        currentQuestionPhase: 'playing',
        currentQuestion: {
          matchId: MATCH_ID,
          qIndex: 13,
          total: 20,
          phaseKind: 'penalty',
          phaseRound: 1,
          shooterSeat: 1,
          question: {
            kind: 'multipleChoice',
            id: 'penalty-ack-q',
            prompt: 'Penalty question',
            options: ['A', 'B', 'C', 'D'],
            categoryName: 'General',
          },
          deadlineAt: new Date(Date.now() + 10_000).toISOString(),
        },
        answerAck: {
          matchId: MATCH_ID,
          qIndex: 13,
          questionKind: 'multipleChoice',
          selectedIndex: 0,
          isCorrect: true,
          correctIndex: 0,
          myTotalPoints: 90,
          oppAnswered: false,
          pointsEarned: 90,
          phaseKind: 'penalty',
          phaseRound: 1,
        },
        possessionState: {
          phaseKind: 'penalty',
          shooterSeat: 1,
        },
      } as never,
    });

    const { result } = renderHook(() => usePossessionBarBattleFlights());

    await act(async () => {
      vi.advanceTimersByTime(250);
    });

    expect(result.current.flights).toHaveLength(1);
    expect(result.current.flights[0]).toMatchObject({
      side: 'player',
      points: 90,
      failed: false,
    });
  });

  it('fires a local penalty +0 miss immediately from answer_ack', async () => {
    useRealtimeMatchStore.setState({
      match: {
        variant: 'ranked_sim',
        matchId: MATCH_ID,
        mySeat: 1,
        currentQuestionPhase: 'playing',
        currentQuestion: {
          matchId: MATCH_ID,
          qIndex: 14,
          total: 20,
          phaseKind: 'penalty',
          phaseRound: 1,
          shooterSeat: 1,
          question: {
            kind: 'multipleChoice',
            id: 'penalty-ack-zero-q',
            prompt: 'Penalty question',
            options: ['A', 'B', 'C', 'D'],
            categoryName: 'General',
          },
          deadlineAt: new Date(Date.now() + 10_000).toISOString(),
        },
        answerAck: {
          matchId: MATCH_ID,
          qIndex: 14,
          questionKind: 'multipleChoice',
          selectedIndex: 1,
          isCorrect: false,
          correctIndex: 0,
          myTotalPoints: 0,
          oppAnswered: false,
          pointsEarned: 0,
          phaseKind: 'penalty',
          phaseRound: 1,
        },
        possessionState: {
          phaseKind: 'penalty',
          shooterSeat: 1,
        },
      } as never,
    });

    const { result } = renderHook(() => usePossessionBarBattleFlights());

    await act(async () => {
      vi.advanceTimersByTime(250);
    });

    expect(result.current.flights).toHaveLength(1);
    expect(result.current.flights[0]).toMatchObject({
      side: 'player',
      points: 0,
      failed: true,
    });
  });

  it('fires the opponent penalty score flight immediately from opponent_answered', async () => {
    useRealtimeMatchStore.setState({
      match: {
        variant: 'ranked_sim',
        matchId: MATCH_ID,
        mySeat: 1,
        currentQuestionPhase: 'playing',
        currentQuestion: {
          matchId: MATCH_ID,
          qIndex: 15,
          total: 20,
          phaseKind: 'penalty',
          phaseRound: 1,
          shooterSeat: 2,
          question: {
            kind: 'multipleChoice',
            id: 'penalty-opponent-ack-q',
            prompt: 'Penalty question',
            options: ['A', 'B', 'C', 'D'],
            categoryName: 'General',
          },
          deadlineAt: new Date(Date.now() + 10_000).toISOString(),
        },
        possessionState: {
          phaseKind: 'penalty',
          shooterSeat: 2,
        },
        opponentAnswered: true,
        opponentAnsweredCorrectly: true,
        opponentRecentPoints: 90,
      } as never,
    });

    const { result } = renderHook(() => usePossessionBarBattleFlights());

    await act(async () => {
      vi.advanceTimersByTime(250);
    });

    expect(result.current.flights).toHaveLength(1);
    expect(result.current.flights[0]).toMatchObject({
      side: 'opponent',
      points: 90,
      failed: false,
    });
  });

  it('fires the opponent penalty +0 miss immediately from opponent_answered', async () => {
    useRealtimeMatchStore.setState({
      match: {
        variant: 'ranked_sim',
        matchId: MATCH_ID,
        mySeat: 1,
        currentQuestionPhase: 'playing',
        currentQuestion: {
          matchId: MATCH_ID,
          qIndex: 16,
          total: 20,
          phaseKind: 'penalty',
          phaseRound: 1,
          shooterSeat: 2,
          question: {
            kind: 'multipleChoice',
            id: 'penalty-opponent-ack-zero-q',
            prompt: 'Penalty question',
            options: ['A', 'B', 'C', 'D'],
            categoryName: 'General',
          },
          deadlineAt: new Date(Date.now() + 10_000).toISOString(),
        },
        possessionState: {
          phaseKind: 'penalty',
          shooterSeat: 2,
        },
        opponentAnswered: true,
        opponentAnsweredCorrectly: false,
        opponentRecentPoints: 0,
      } as never,
    });

    const { result } = renderHook(() => usePossessionBarBattleFlights());

    await act(async () => {
      vi.advanceTimersByTime(250);
    });

    expect(result.current.flights).toHaveLength(1);
    expect(result.current.flights[0]).toMatchObject({
      side: 'opponent',
      points: 0,
      failed: true,
    });
  });

  it('fires penalty round-result flights when opponent_answered is not emitted', async () => {
    useRealtimeMatchStore.getState().setSelfUserId('user-a');
    useRealtimeMatchStore.setState({
      match: {
        variant: 'ranked_sim',
        matchId: MATCH_ID,
        mySeat: 1,
        currentQuestionPhase: 'playing',
        currentQuestion: {
          matchId: MATCH_ID,
          qIndex: 20,
          total: 20,
          phaseKind: 'penalty',
          phaseRound: 1,
          shooterSeat: 2,
          question: {
            kind: 'multipleChoice',
            id: 'penalty-q',
            prompt: 'Penalty question',
            options: ['A', 'B', 'C', 'D'],
            categoryName: 'General',
          },
          deadlineAt: new Date(Date.now() + 10_000).toISOString(),
        },
        lastRoundResult: {
          matchId: MATCH_ID,
          qIndex: 20,
          questionKind: 'multipleChoice',
          reveal: { kind: 'multipleChoice', correctIndex: 0 },
          players: {
            'user-a': {
              selectedIndex: 1,
              isCorrect: false,
              timeMs: 3000,
              pointsEarned: 0,
              totalPoints: 100,
              submittedOrderIds: [],
            },
            'user-b': {
              selectedIndex: 0,
              isCorrect: true,
              timeMs: 1800,
              pointsEarned: 90,
              totalPoints: 190,
              submittedOrderIds: [],
            },
          },
          phaseKind: 'penalty',
          phaseRound: 1,
          shooterSeat: 2,
          deltas: {
            possessionDelta: 0,
            goalScoredBySeat: 2,
            penaltyOutcome: 'goal',
          },
        },
        possessionState: {
          phaseKind: 'penalty',
          shooterSeat: 1,
        },
        opponentAnswered: false,
      } as never,
    });

    const { result } = renderHook(() => usePossessionBarBattleFlights());

    await act(async () => {
      vi.advanceTimersByTime(250);
    });

    expect(result.current.flights).toHaveLength(2);
    expect(result.current.flights).toEqual(expect.arrayContaining([
      expect.objectContaining({
        side: 'player',
        points: 0,
        failed: true,
      }),
      expect.objectContaining({
        side: 'opponent',
        points: 90,
        failed: undefined,
      }),
    ]));
  });

  it('fires failed +0 flights for both sides on a zero-zero penalty round result', async () => {
    useRealtimeMatchStore.getState().setSelfUserId('user-a');
    useRealtimeMatchStore.setState({
      match: {
        variant: 'ranked_sim',
        matchId: MATCH_ID,
        mySeat: 1,
        currentQuestionPhase: 'playing',
        currentQuestion: {
          matchId: MATCH_ID,
          qIndex: 21,
          total: 20,
          phaseKind: 'penalty',
          phaseRound: 2,
          shooterSeat: 1,
          question: {
            kind: 'multipleChoice',
            id: 'penalty-q-zero',
            prompt: 'Penalty question',
            options: ['A', 'B', 'C', 'D'],
            categoryName: 'General',
          },
          deadlineAt: new Date(Date.now() + 10_000).toISOString(),
        },
        lastRoundResult: {
          matchId: MATCH_ID,
          qIndex: 21,
          questionKind: 'multipleChoice',
          reveal: { kind: 'multipleChoice', correctIndex: 0 },
          players: {
            'user-a': {
              selectedIndex: 1,
              isCorrect: false,
              timeMs: 3000,
              pointsEarned: 0,
              totalPoints: 100,
              submittedOrderIds: [],
            },
            'user-b': {
              selectedIndex: 2,
              isCorrect: false,
              timeMs: 3200,
              pointsEarned: 0,
              totalPoints: 100,
              submittedOrderIds: [],
            },
          },
          phaseKind: 'penalty',
          phaseRound: 2,
          shooterSeat: 1,
          deltas: {
            possessionDelta: 0,
            goalScoredBySeat: null,
            penaltyOutcome: 'saved',
          },
        },
        possessionState: {
          phaseKind: 'penalty',
          shooterSeat: 1,
        },
        opponentAnswered: false,
      } as never,
    });

    const { result } = renderHook(() => usePossessionBarBattleFlights());

    await act(async () => {
      vi.advanceTimersByTime(250);
    });

    expect(result.current.flights).toHaveLength(2);
    expect(result.current.flights).toEqual(expect.arrayContaining([
      expect.objectContaining({
        side: 'player',
        points: 0,
        failed: true,
      }),
      expect.objectContaining({
        side: 'opponent',
        points: 0,
        failed: true,
      }),
    ]));
  });

  it('flies the 2x badge token to the opponent slot when the opponent newly earns the streak', async () => {
    appendAnchor('data-speed-streak-slot', 'opponent', rect(430, 70, 1, 1));
    useRealtimeMatchStore.setState({
      match: {
        variant: 'ranked_sim',
        matchId: MATCH_ID,
        mySeat: 1,
        currentQuestionPhase: 'playing',
        currentQuestion: {
          matchId: MATCH_ID,
          qIndex: 7,
          total: 12,
          phaseKind: 'normal',
          phaseRound: 8,
          question: {
            kind: 'multipleChoice',
            id: 'q-7',
            prompt: 'Question',
            options: ['A', 'B', 'C', 'D'],
            categoryName: 'General',
          },
          deadlineAt: new Date(Date.now() + 10_000).toISOString(),
        },
        possessionState: {
          phaseKind: 'normal',
          speedStreakHolderSeat: null,
        },
      } as never,
    });

    const { result } = renderHook(() => usePossessionBarBattleFlights());

    await act(async () => {});

    act(() => {
      const currentMatch = useRealtimeMatchStore.getState().match;
      useRealtimeMatchStore.setState({
        match: currentMatch
          ? ({
              ...currentMatch,
              possessionState: {
                ...(currentMatch.possessionState as object),
                speedStreakHolderSeat: 2,
              },
            } as never)
          : currentMatch,
      });
    });

    await act(async () => {});

    expect(result.current.flights).toHaveLength(1);
    expect(result.current.flights[0]).toMatchObject({
      side: 'opponent',
      kind: 'badge',
      points: 0,
    });
  });

  it('routes opponent score flights through the opponent 2x badge when visible', async () => {
    appendAnchor('data-speed-streak-badge', 'opponent', rect(430, 70, 48, 28));
    useRealtimeMatchStore.setState({
      match: {
        variant: 'ranked_sim',
        matchId: MATCH_ID,
        mySeat: 1,
        currentQuestionPhase: 'playing',
        currentQuestion: {
          matchId: MATCH_ID,
          qIndex: 8,
          total: 12,
          phaseKind: 'normal',
          phaseRound: 9,
          question: {
            kind: 'multipleChoice',
            id: 'q-8',
            prompt: 'Question',
            options: ['A', 'B', 'C', 'D'],
            categoryName: 'General',
          },
          deadlineAt: new Date(Date.now() + 10_000).toISOString(),
        },
        possessionState: {
          phaseKind: 'normal',
          speedStreakHolderSeat: 2,
        },
        opponentAnswered: true,
        opponentAnsweredCorrectly: true,
        opponentRecentPoints: 80,
      } as never,
    });

    const { result } = renderHook(() => usePossessionBarBattleFlights());

    await act(async () => {
      vi.advanceTimersByTime(250);
    });

    expect(result.current.flights).toHaveLength(1);
    expect(result.current.flights[0]).toMatchObject({
      side: 'opponent',
      points: 80,
      boostVia: { x: 454, y: 84 },
    });
  });
});
