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
      currentQuestionIndex: 4,
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
      subtitle: 'First Half',
      upcomingQIndex: 5,
    });

    // Same announced question, only the category payload changed → snapshot
    // stays frozen (no mid-splash flicker).
    rerender({
      pendingQuestion: makeQuestion(5, 6, 'normal', 'Changed Category'),
    });

    expect(result.current.transitionSnapshot).toEqual({
      title: 'Question 6',
      categoryName: 'First Category',
      subtitle: 'First Half',
      upcomingQIndex: 5,
    });

    // A DIFFERENT upcoming question while the overlay is still visible is a
    // back-to-back transition — the snapshot must re-capture instead of
    // replaying the previous round's number (stale-counter bug).
    rerender({
      pendingQuestion: makeQuestion(6, 1, 'normal', 'Next Category'),
    });

    expect(result.current.transitionSnapshot).toEqual({
      title: 'Question 7',
      categoryName: 'Next Category',
      subtitle: 'First Half',
      upcomingQIndex: 6,
    });
  });

  it('announces the upcoming question from the round result when the next question has not arrived yet', async () => {
    // Slow network: the transition becomes visible BEFORE match:question for
    // the next round lands. The just-finished round result is authoritative:
    // upcoming qIndex = roundResult.qIndex + 1. Falling back to localQuestion
    // (the just-answered question) produced a stale "QUESTION 5" splash while
    // entering question 6.
    const { result, rerender } = renderHook((props: {
      pendingQuestion: ResolvedMatchQuestionPayload | null;
    }) => usePossessionRoundTransition({
      phase: 'NORMAL_PLAY',
      half: 1,
      penaltySuddenDeath: false,
      firstQuestionIntro: false,
      secondHalfQuestionIntro: false,
      currentQuestionIndex: 4,
      localQuestion: makeQuestion(4, 5, 'normal', 'Current'),
      pendingQuestion: props.pendingQuestion,
      roundResult: makeRoundResult('normal', 5),
      roundResultHoldDone: true,
      isPenaltyQuestion: false,
      isShotQuestion: false,
      isLastAttackQuestion: false,
      goalCelebration: null,
    }), {
      initialProps: { pendingQuestion: null as ResolvedMatchQuestionPayload | null },
    });

    await act(async () => {});

    expect(result.current.showRoundTransition).toBe(true);
    expect(result.current.transitionSnapshot).toEqual({
      title: 'Question 6',
      categoryName: 'Current',
      subtitle: 'First Half',
      upcomingQIndex: 5,
    });

    // The buffered question lands mid-transition with the same index → the
    // number stays put, the category refreshes to the real upcoming one.
    rerender({ pendingQuestion: makeQuestion(5, 6, 'normal', 'Real Category') });

    expect(result.current.transitionSnapshot).toEqual({
      title: 'Question 6',
      categoryName: 'Real Category',
      subtitle: 'First Half',
      upcomingQIndex: 5,
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
      currentQuestionIndex: 11,
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
      // categoryName is intentionally empty: it duplicated the subtitle in
      // Georgian (both "პენალტების სერია"), so the penalty overlay only shows
      // the title + subtitle now.
      title: 'Penalty 1',
      categoryName: '',
      subtitle: 'Sudden Death',
      upcomingQIndex: 12,
    });

    // Same penalty round, refreshed payload → snapshot stays frozen.
    rerender({
      phase: 'PENALTY_SHOOTOUT',
      pendingQuestion: makeQuestion(12, 1, 'penalty', 'Changed Penalty'),
    });

    expect(result.current.transitionSnapshot).toEqual({
      // categoryName is intentionally empty: it duplicated the subtitle in
      // Georgian (both "პენალტების სერია"), so the penalty overlay only shows
      // the title + subtitle now.
      title: 'Penalty 1',
      categoryName: '',
      subtitle: 'Sudden Death',
      upcomingQIndex: 12,
    });

    // A NEW penalty round while the overlay is still visible re-captures
    // (back-to-back transition) instead of replaying "Penalty 1".
    rerender({
      phase: 'PENALTY_SHOOTOUT',
      pendingQuestion: makeQuestion(13, 2, 'penalty', 'Changed Penalty'),
    });

    expect(result.current.transitionSnapshot).toEqual({
      title: 'Penalty 2',
      categoryName: '',
      subtitle: 'Sudden Death',
      upcomingQIndex: 13,
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
      currentQuestionIndex: 11,
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
      currentQuestionIndex: 11,
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
      currentQuestionIndex: 6,
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
      subtitle: 'Second Half',
      upcomingQIndex: 6,
    });
  });

  it('does not flash the stale first-question snapshot when second-half intro starts', async () => {
    type Props = {
      firstQuestionIntro: boolean;
      secondHalfQuestionIntro: boolean;
      currentQuestionIndex: number | null;
      localQuestion: ResolvedMatchQuestionPayload | null;
      half: 1 | 2;
    };
    const { result, rerender } = renderHook((props: Props) => usePossessionRoundTransition({
      phase: 'NORMAL_PLAY',
      half: props.half,
      penaltySuddenDeath: false,
      firstQuestionIntro: props.firstQuestionIntro,
      secondHalfQuestionIntro: props.secondHalfQuestionIntro,
      currentQuestionIndex: props.currentQuestionIndex,
      localQuestion: props.localQuestion,
      pendingQuestion: null,
      roundResult: null,
      roundResultHoldDone: false,
      isPenaltyQuestion: false,
      isShotQuestion: false,
      isLastAttackQuestion: false,
      goalCelebration: null,
    }), {
      initialProps: {
        firstQuestionIntro: true,
        secondHalfQuestionIntro: false,
        currentQuestionIndex: 0,
        localQuestion: makeQuestion(0, 1, 'normal', 'Football'),
        half: 1,
      },
    });

    await act(async () => {});

    expect(result.current.transitionSnapshot.title).toBe('Question 1');

    rerender({
      firstQuestionIntro: false,
      secondHalfQuestionIntro: false,
      currentQuestionIndex: null,
      localQuestion: null,
      half: 2,
    });

    // Second-half intro fires while the gated localQuestion still LAGS (null
    // here) — the bug was that the snapshot then fell back to "Question 1".
    // The authoritative currentQuestionIndex (6) must drive the number instead,
    // so the splash shows "Question 7" with no stale flash.
    rerender({
      firstQuestionIntro: false,
      secondHalfQuestionIntro: true,
      currentQuestionIndex: 6,
      localQuestion: null,
      half: 2,
    });

    expect(result.current.showRoundTransition).toBe(true);
    expect(result.current.transitionSnapshot.title).toBe('Question 7');
    expect(result.current.transitionSnapshot.subtitle).toBe('Second Half');
    expect(result.current.transitionSnapshot.upcomingQIndex).toBe(6);
  });

  it('does not show the second-half transition until the authoritative question index is known', async () => {
    type Props = {
      currentQuestionIndex: number | null;
      localQuestion: ResolvedMatchQuestionPayload | null;
    };
    const { result, rerender } = renderHook((props: Props) => usePossessionRoundTransition({
      phase: 'NORMAL_PLAY',
      half: 2,
      penaltySuddenDeath: false,
      firstQuestionIntro: false,
      secondHalfQuestionIntro: true,
      currentQuestionIndex: props.currentQuestionIndex,
      localQuestion: props.localQuestion,
      pendingQuestion: null,
      roundResult: null,
      roundResultHoldDone: false,
      isPenaltyQuestion: false,
      isShotQuestion: false,
      isLastAttackQuestion: false,
      goalCelebration: null,
    }), {
      initialProps: {
        currentQuestionIndex: null as number | null,
        localQuestion: null,
      },
    });

    await act(async () => {});

    expect(result.current.showRoundTransition).toBe(false);

    rerender({
      currentQuestionIndex: 6,
      localQuestion: null,
    });

    expect(result.current.showRoundTransition).toBe(true);
    expect(result.current.transitionSnapshot.title).toBe('Question 7');
    expect(result.current.transitionSnapshot.upcomingQIndex).toBe(6);
  });

  it('ignores a stale first-half local question during the second-half intro', async () => {
    const { result, rerender } = renderHook((props: {
      currentQuestionIndex: number | null;
    }) => usePossessionRoundTransition({
      phase: 'NORMAL_PLAY',
      half: 2,
      penaltySuddenDeath: false,
      firstQuestionIntro: false,
      secondHalfQuestionIntro: true,
      currentQuestionIndex: props.currentQuestionIndex,
      localQuestion: makeQuestion(5, 6, 'normal', 'Stale First Half Category'),
      pendingQuestion: null,
      roundResult: null,
      roundResultHoldDone: false,
      isPenaltyQuestion: false,
      isShotQuestion: false,
      isLastAttackQuestion: false,
      goalCelebration: null,
    }), {
      initialProps: {
        currentQuestionIndex: null as number | null,
      },
    });

    await act(async () => {});

    expect(result.current.showRoundTransition).toBe(false);

    rerender({ currentQuestionIndex: 6 });

    expect(result.current.showRoundTransition).toBe(true);
    expect(result.current.transitionSnapshot).toEqual({
      title: 'Question 7',
      categoryName: '',
      subtitle: 'Second Half',
      upcomingQIndex: 6,
    });
  });

  it('shows an extra-question transition before a pending last-attack question', async () => {
    const { result } = renderHook(() => usePossessionRoundTransition({
      phase: 'LAST_ATTACK',
      half: 1,
      penaltySuddenDeath: false,
      firstQuestionIntro: false,
      secondHalfQuestionIntro: false,
      currentQuestionIndex: 5,
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
      subtitle: 'First Half',
      upcomingQIndex: 6,
    });
  });
});
