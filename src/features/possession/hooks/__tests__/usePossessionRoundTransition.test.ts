import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type {
  MatchRoundResultPayload,
  MatchStatePayload,
  ResolvedMatchQuestionPayload,
} from '@/lib/realtime/socket.types';
import {
  FIRST_QUESTION_INTRO_MS,
  PENALTY_COUNTDOWN_MS,
} from '../../realtimePossession.helpers';
import {
  usePossessionFirstQuestionIntro,
  usePossessionRoundTransition,
} from '../usePossessionRoundTransition';

const MATCH_ID = 'match-1';

function makeQuestion(qIndex: number, phaseRound: number, phaseKind: 'normal' | 'penalty' = 'normal', categoryName = 'Football'): ResolvedMatchQuestionPayload {
  return {
    matchId: MATCH_ID,
    qIndex,
    total: 12,
    phaseKind,
    phaseRound,
    deadlineAt: new Date(Date.now() + 10000).toISOString(),
    question: {
      kind: 'multipleChoice',
      id: `q-${qIndex}`,
      prompt: `Question ${qIndex}`,
      options: ['A', 'B', 'C', 'D'],
      categoryName,
    },
  };
}

function makeRoundResult(phaseKind: 'normal' | 'penalty', phaseRound: number): MatchRoundResultPayload {
  return {
    matchId: MATCH_ID,
    qIndex: phaseRound - 1,
    questionKind: 'multipleChoice',
    reveal: { kind: 'multipleChoice', correctIndex: 0 },
    players: {},
    phaseKind,
    phaseRound,
    deltas: {
      possessionDelta: 0,
      penaltyOutcome: null,
      goalScoredBySeat: null,
    },
  };
}

describe('usePossessionRoundTransition', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('keeps the first-question intro active until kickoff finishes and the intro delay elapses', () => {
    const countdownEndsAt = Date.now() + 5000;
    const { result } = renderHook(() => usePossessionFirstQuestionIntro({
      countdownEndsAt,
      currentQuestionIndex: 0,
    }));

    expect(result.current).toBe(true);

    act(() => {
      vi.advanceTimersByTime(5000);
    });

    act(() => {
      vi.advanceTimersByTime(FIRST_QUESTION_INTRO_MS + 100);
    });

    expect(result.current).toBe(false);
  });

  it('keeps the normal transition snapshot stable while the overlay remains visible', () => {
    const { result, rerender } = renderHook((props: {
      pendingQuestion: ResolvedMatchQuestionPayload | null;
    }) => usePossessionRoundTransition({
      phase: 'NORMAL_PLAY',
      half: 1,
      penaltySuddenDeath: false,
      firstQuestionIntro: false,
      localQuestion: makeQuestion(4, 5, 'normal', 'Current'),
      pendingQuestion: props.pendingQuestion,
      roundResult: makeRoundResult('normal', 5),
      roundResultHoldDone: true,
      isPenaltyQuestion: false,
      isShotQuestion: false,
      isLastAttackQuestion: false,
      goalCelebration: null,
    }), {
      initialProps: {
        pendingQuestion: makeQuestion(5, 6, 'normal', 'First Category'),
      },
    });

    expect(result.current.showRoundTransition).toBe(true);
    expect(result.current.transitionSnapshot).toEqual({
      title: 'Question 6',
      categoryName: 'First Category',
      subtitle: '1st Half',
    });

    rerender({
      pendingQuestion: makeQuestion(6, 1, 'normal', 'Changed Category'),
    });

    expect(result.current.transitionSnapshot).toEqual({
      title: 'Question 6',
      categoryName: 'First Category',
      subtitle: '1st Half',
    });
  });

  it('starts the penalty countdown and preserves the penalty transition snapshot', () => {
    const { result, rerender } = renderHook((props: {
      phase: MatchStatePayload['phase'];
      pendingQuestion: ResolvedMatchQuestionPayload | null;
    }) => usePossessionRoundTransition({
      phase: props.phase,
      half: 2,
      penaltySuddenDeath: true,
      firstQuestionIntro: false,
      localQuestion: makeQuestion(11, 6, 'normal', 'Current'),
      pendingQuestion: props.pendingQuestion,
      roundResult: makeRoundResult('penalty', 1),
      roundResultHoldDone: true,
      isPenaltyQuestion: false,
      isShotQuestion: false,
      isLastAttackQuestion: false,
      goalCelebration: null,
    }), {
      initialProps: {
        phase: 'NORMAL_PLAY',
        pendingQuestion: makeQuestion(12, 1, 'penalty', 'Penalty'),
      },
    });

    rerender({
      phase: 'PENALTY_SHOOTOUT',
      pendingQuestion: makeQuestion(12, 1, 'penalty', 'Penalty'),
    });

    expect(result.current.penaltyCountdownActive).toBe(true);

    act(() => {
      vi.advanceTimersByTime(PENALTY_COUNTDOWN_MS + 100);
    });

    expect(result.current.penaltyCountdownActive).toBe(false);
    expect(result.current.showPenaltyTransition).toBe(true);
    expect(result.current.transitionSnapshot).toEqual({
      title: 'Penalty 1',
      categoryName: 'Penalty Shootout',
      subtitle: 'Sudden Death',
    });

    rerender({
      phase: 'PENALTY_SHOOTOUT',
      pendingQuestion: makeQuestion(13, 2, 'penalty', 'Changed Penalty'),
    });

    expect(result.current.transitionSnapshot).toEqual({
      title: 'Penalty 1',
      categoryName: 'Penalty Shootout',
      subtitle: 'Sudden Death',
    });
  });
});
