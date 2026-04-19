import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { MatchRoundResultPayload } from '@/lib/realtime/socket.types';
import { GOAL_CELEBRATION_MS } from '../../realtimePossession.helpers';
import { usePossessionGoalCelebration } from '../usePossessionGoalCelebration';

const MATCH_ID = 'match-1';
const USER_A = 'user-a';
const USER_B = 'user-b';

function makeRoundResult(
  qIndex: number,
  phaseKind: 'normal' | 'last_attack' | 'penalty',
  goalScoredBySeat: 1 | 2 | null
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
      [USER_A]: { totalPoints: 100, pointsEarned: 10, isCorrect: true, timeMs: 1000, selectedIndex: 0 },
      [USER_B]: { totalPoints: 80, pointsEarned: 0, isCorrect: false, timeMs: 2000, selectedIndex: 1 },
    },
    phaseKind,
    phaseRound: 6,
    deltas: {
      possessionDelta: 10,
      penaltyOutcome: phaseKind === 'penalty' ? 'goal' : null,
      goalScoredBySeat,
    },
  };
}

describe('usePossessionGoalCelebration', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('waits for roundResultHoldDone before showing a normal-goal celebration and then clears it', () => {
    const { result, rerender } = renderHook((props: {
      roundResult: MatchRoundResultPayload | null;
      roundResultHoldDone: boolean;
      currentQuestionIndex: number | null;
      isHalftime: boolean;
    }) => usePossessionGoalCelebration({
      ...props,
      mySeat: 1,
      playerUsername: 'me',
      opponentUsername: 'opponent',
      devPossessionAnimation: null,
    }), {
      initialProps: {
        roundResult: null as MatchRoundResultPayload | null,
        roundResultHoldDone: false,
        currentQuestionIndex: 5,
        isHalftime: false,
      },
    });

    rerender({
      roundResult: makeRoundResult(5, 'normal', 1),
      roundResultHoldDone: false,
      currentQuestionIndex: 5,
      isHalftime: false,
    });

    expect(result.current.goalCelebration).toBeNull();

    rerender({
      roundResult: makeRoundResult(5, 'normal', 1),
      roundResultHoldDone: true,
      currentQuestionIndex: 5,
      isHalftime: false,
    });

    expect(result.current.goalCelebration).toEqual({
      scorerName: 'me',
      isMeScorer: true,
    });

    act(() => {
      vi.advanceTimersByTime(GOAL_CELEBRATION_MS + 10);
    });

    expect(result.current.goalCelebration).toBeNull();
  });

  it('ignores penalty goals for the celebration overlay', () => {
    const { result, rerender } = renderHook(() => usePossessionGoalCelebration({
      roundResult: null,
      roundResultHoldDone: false,
      currentQuestionIndex: 9,
      isHalftime: false,
      mySeat: 1,
      playerUsername: 'me',
      opponentUsername: 'opponent',
      devPossessionAnimation: null,
    }));

    rerender();
    expect(result.current.goalCelebration).toBeNull();

    const { result: penaltyResult } = renderHook(() => usePossessionGoalCelebration({
      roundResult: makeRoundResult(9, 'penalty', 1),
      roundResultHoldDone: true,
      currentQuestionIndex: 9,
      isHalftime: false,
      mySeat: 1,
      playerUsername: 'me',
      opponentUsername: 'opponent',
      devPossessionAnimation: null,
    }));

    expect(penaltyResult.current.goalCelebration).toBeNull();
  });

  it('clears an active goal celebration when halftime begins', () => {
    const { result, rerender } = renderHook((props: {
      roundResult: MatchRoundResultPayload | null;
      roundResultHoldDone: boolean;
      currentQuestionIndex: number | null;
      isHalftime: boolean;
    }) => usePossessionGoalCelebration({
      ...props,
      mySeat: 1,
      playerUsername: 'me',
      opponentUsername: 'opponent',
      devPossessionAnimation: null,
    }), {
      initialProps: {
        roundResult: null as MatchRoundResultPayload | null,
        roundResultHoldDone: false,
        currentQuestionIndex: 5,
        isHalftime: false,
      },
    });

    rerender({
      roundResult: makeRoundResult(5, 'normal', 1),
      roundResultHoldDone: true,
      currentQuestionIndex: 5,
      isHalftime: false,
    });

    expect(result.current.goalCelebration).toEqual({
      scorerName: 'me',
      isMeScorer: true,
    });

    rerender({
      roundResult: makeRoundResult(5, 'normal', 1),
      roundResultHoldDone: true,
      currentQuestionIndex: 5,
      isHalftime: true,
    });

    expect(result.current.goalCelebration).toBeNull();
  });
});
