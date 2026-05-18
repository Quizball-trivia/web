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
  TRANSITION_DELAY_MS,
} from '../../realtimePossession.helpers';
import {
  usePossessionFirstQuestionIntro,
  usePossessionRoundTransition,
  usePossessionSecondHalfQuestionIntro,
} from '../usePossessionRoundTransition';

const MATCH_ID = 'match-1';

function makeQuestion(
  qIndex: number,
  phaseRound: number,
  phaseKind: 'normal' | 'last_attack' | 'penalty' = 'normal',
  categoryName = 'Football'
): ResolvedMatchQuestionPayload {
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

function makeRoundResult(
  phaseKind: 'normal' | 'last_attack' | 'penalty',
  phaseRound: number,
  goalScoredBySeat: 1 | 2 | null = null
): MatchRoundResultPayload {
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
      goalScoredBySeat,
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

  it('keeps the normal transition snapshot stable while the overlay remains visible', async () => {
    const { result, rerender } = renderHook((props: {
      pendingQuestion: ResolvedMatchQuestionPayload | null;
    }) => usePossessionRoundTransition({
      phase: 'NORMAL_PLAY',
      half: 1,
      penaltySuddenDeath: false,
      firstQuestionIntro: false,
      secondHalfQuestionIntro: false,
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

    await act(async () => {});

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

  it('starts the penalty countdown and preserves the penalty transition snapshot', async () => {
    const { result, rerender } = renderHook((props: {
      phase: MatchStatePayload['phase'];
      pendingQuestion: ResolvedMatchQuestionPayload | null;
    }) => usePossessionRoundTransition({
      phase: props.phase,
      half: 2,
      penaltySuddenDeath: true,
      firstQuestionIntro: false,
      secondHalfQuestionIntro: false,
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

    await act(async () => {});

    expect(result.current.penaltyCountdownActive).toBe(true);

    act(() => {
      vi.advanceTimersByTime(PENALTY_COUNTDOWN_MS + 100);
    });

    await act(async () => {});

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

  it('waits for the final field result hold before starting the penalty countdown', async () => {
    const { result, rerender } = renderHook((props: {
      phase: MatchStatePayload['phase'];
      roundResultHoldDone: boolean;
    }) => usePossessionRoundTransition({
      phase: props.phase,
      half: 2,
      penaltySuddenDeath: false,
      firstQuestionIntro: false,
      secondHalfQuestionIntro: false,
      localQuestion: makeQuestion(11, 6, 'normal', 'Current'),
      pendingQuestion: makeQuestion(12, 1, 'penalty', 'Penalty'),
      roundResult: makeRoundResult('normal', 6),
      roundResultHoldDone: props.roundResultHoldDone,
      isPenaltyQuestion: false,
      isShotQuestion: false,
      isLastAttackQuestion: false,
      goalCelebration: null,
    }), {
      initialProps: {
        phase: 'NORMAL_PLAY' as MatchStatePayload['phase'],
        roundResultHoldDone: false,
      },
    });

    rerender({
      phase: 'PENALTY_SHOOTOUT',
      roundResultHoldDone: false,
    });

    await act(async () => {});
    expect(result.current.penaltyCountdownActive).toBe(false);

    rerender({
      phase: 'PENALTY_SHOOTOUT',
      roundResultHoldDone: true,
    });

    await act(async () => {});
    expect(result.current.penaltyCountdownActive).toBe(true);
  });

  it('waits for a boundary goal celebration to clear before starting the penalty countdown', async () => {
    type Props = {
      phase: MatchStatePayload['phase'];
      goalCelebration: { scorerName: string; isMeScorer: boolean } | null;
    };
    const initialProps: Props = {
      phase: 'NORMAL_PLAY',
      goalCelebration: null,
    };

    const { result, rerender } = renderHook((props: Props) => usePossessionRoundTransition({
      phase: props.phase,
      half: 2,
      penaltySuddenDeath: false,
      firstQuestionIntro: false,
      secondHalfQuestionIntro: false,
      localQuestion: makeQuestion(11, 6, 'normal', 'Current'),
      pendingQuestion: makeQuestion(12, 1, 'penalty', 'Penalty'),
      roundResult: makeRoundResult('normal', 6, 1),
      roundResultHoldDone: true,
      isPenaltyQuestion: false,
      isShotQuestion: false,
      isLastAttackQuestion: false,
      goalCelebration: props.goalCelebration,
    }), {
      initialProps,
    });

    rerender({
      phase: 'PENALTY_SHOOTOUT',
      goalCelebration: { scorerName: 'Player', isMeScorer: true },
    } satisfies Props);

    await act(async () => {});
    expect(result.current.penaltyCountdownActive).toBe(false);

    rerender({
      phase: 'PENALTY_SHOOTOUT',
      goalCelebration: null,
    } satisfies Props);

    await act(async () => {});

    expect(result.current.penaltyCountdownActive).toBe(true);
  });

  it('shows a second-half question intro before the first question after halftime can play', () => {
    const { result } = renderHook(() => usePossessionSecondHalfQuestionIntro({
      phase: 'NORMAL_PLAY',
      half: 2,
      normalQuestionsAnsweredInHalf: 0,
      currentQuestionIndex: 6,
      currentQuestionPhase: 'reveal',
    }));

    expect(result.current).toBe(true);

    act(() => {
      vi.advanceTimersByTime(TRANSITION_DELAY_MS + 1);
    });

    expect(result.current).toBe(false);
  });

  it('uses the active second-half question for the transition snapshot', async () => {
    const { result } = renderHook(() => usePossessionRoundTransition({
      phase: 'NORMAL_PLAY',
      half: 2,
      penaltySuddenDeath: false,
      firstQuestionIntro: false,
      secondHalfQuestionIntro: true,
      localQuestion: makeQuestion(6, 1, 'normal', 'Second Half Category'),
      pendingQuestion: null,
      roundResult: null,
      roundResultHoldDone: false,
      isPenaltyQuestion: false,
      isShotQuestion: false,
      isLastAttackQuestion: false,
      goalCelebration: null,
    }));

    await act(async () => {});

    expect(result.current.showRoundTransition).toBe(true);
    expect(result.current.transitionSnapshot).toEqual({
      title: 'Question 7',
      categoryName: 'Second Half Category',
      subtitle: '2nd Half',
    });
  });

  it('shows an extra-question transition before a pending last-attack question', async () => {
    const { result } = renderHook(() => usePossessionRoundTransition({
      phase: 'LAST_ATTACK',
      half: 1,
      penaltySuddenDeath: false,
      firstQuestionIntro: false,
      secondHalfQuestionIntro: false,
      localQuestion: makeQuestion(5, 6, 'normal', 'Current'),
      pendingQuestion: makeQuestion(6, 1, 'last_attack', 'Extra Category'),
      roundResult: makeRoundResult('normal', 6),
      roundResultHoldDone: true,
      isPenaltyQuestion: false,
      isShotQuestion: false,
      isLastAttackQuestion: false,
      goalCelebration: null,
    }));

    await act(async () => {});

    expect(result.current.showRoundTransition).toBe(true);
    expect(result.current.transitionSnapshot).toEqual({
      title: 'Extra Question',
      categoryName: 'Extra Category',
      subtitle: '1st Half',
    });
  });
});
