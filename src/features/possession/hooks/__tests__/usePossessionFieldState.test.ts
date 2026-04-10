import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type {
  MatchRoundResultPayload,
  ResolvedMatchQuestionPayload,
} from '@/lib/realtime/socket.types';
import type { MatchStatus } from '@/stores/realtimeMatch.store';
import {
  FIELD_POSSESSION_CUE_MS,
  FIELD_RESULT_COMPARE_MS,
} from '../../realtimePossession.helpers';
import { usePossessionFieldState } from '../usePossessionFieldState';

const MATCH_ID = 'match-1';

function makeQuestion(
  qIndex: number,
  phaseKind: 'normal' | 'penalty' | 'shot' | 'last_attack' = 'normal',
  attackerSeat: 1 | 2 | null = 1
): ResolvedMatchQuestionPayload {
  return {
    matchId: MATCH_ID,
    qIndex,
    total: 12,
    phaseKind,
    phaseRound: 6,
    attackerSeat,
    deadlineAt: new Date(Date.now() + 10000).toISOString(),
    question: {
      kind: 'multipleChoice',
      id: `q-${qIndex}`,
      prompt: `Question ${qIndex}`,
      options: ['A', 'B', 'C', 'D'],
      categoryName: 'Football',
    },
  };
}

function makeRoundResult(
  qIndex: number,
  goalScoredBySeat: 1 | 2 | null,
  attackerSeat: 1 | 2 | null = 1
): MatchRoundResultPayload {
  return {
    matchId: MATCH_ID,
    qIndex,
    questionKind: 'multipleChoice',
    reveal: { kind: 'multipleChoice', correctIndex: 0 },
    players: {},
    phaseKind: 'normal',
    phaseRound: 6,
    attackerSeat,
    deltas: {
      possessionDelta: 20,
      penaltyOutcome: null,
      goalScoredBySeat,
    },
  };
}

function makeMatch(possessionDiff: number, overrides: Partial<MatchStatus['possessionState']> = {}): MatchStatus {
  return {
    matchId: MATCH_ID,
    mode: 'ranked',
    variant: 'ranked_sim',
    mySeat: 1,
    opponent: { id: 'opp', username: 'opponent', avatarUrl: null },
    participants: [],
    countdownEndsAt: null,
    currentQuestion: null,
    pendingQuestion: null,
    questions: {},
    answerAck: null,
    countdownGuessAck: null,
    cluesGuessAck: null,
    opponentAnswered: false,
    opponentSelectedIndex: null,
    myTotalPoints: 0,
    oppTotalPoints: 0,
    opponentRecentPoints: 0,
    lastRoundResult: null,
    finalResults: null,
    currentQuestionPhase: 'playing',
    opponentAnsweredCorrectly: null,
    partyState: null,
    stateVersion: 1,
    optimisticChanceCard: null,
    possessionState: {
      matchId: MATCH_ID,
      phase: 'NORMAL_PLAY',
      half: 1,
      possessionDiff,
      normalQuestionsAnsweredInHalf: 4,
      attackerSeat: 1,
      kickOffSeat: 1,
      goals: { seat1: 0, seat2: 0 },
      penaltyGoals: { seat1: 0, seat2: 0 },
      phaseKind: 'normal',
      phaseRound: 4,
      shooterSeat: null,
      halftime: {
        deadlineAt: null,
        categoryOptions: [],
        firstBanSeat: null,
        bans: { seat1: null, seat2: null },
      },
      ...overrides,
    },
  };
}

describe('usePossessionFieldState', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('resets the field to center when the second half starts', () => {
    const { result, rerender } = renderHook((props: { match: MatchStatus }) => usePossessionFieldState({
      match: props.match,
      localQuestion: makeQuestion(6),
      roundResult: null,
      questionPhase: 'playing',
      roundResolved: false,
      answerAck: null,
      opponentAnsweredCorrectly: null,
      myRound: null,
      opponentRound: null,
      devPossessionAnimation: null,
      clearDevPossessionAnimation: vi.fn(),
      playerAvatar: '/me.png',
      opponentAvatar: '/opp.png',
      playerUsername: 'me',
      opponentUsername: 'opp',
      isHalftime: false,
    }), {
      initialProps: {
        match: makeMatch(40, { phase: 'HALFTIME', half: 1 }),
      },
    });

    rerender({
      match: makeMatch(40, { phase: 'NORMAL_PLAY', half: 2 }),
    });

    expect(result.current.visualMyPossessionPct).toBe(50);
  });

  it('holds the field position during the result comparison window before applying the new possession', () => {
    const { result, rerender } = renderHook((props: {
      match: MatchStatus;
      roundResult: MatchRoundResultPayload | null;
    }) => usePossessionFieldState({
      match: props.match,
      localQuestion: makeQuestion(5),
      roundResult: props.roundResult,
      questionPhase: 'playing',
      roundResolved: Boolean(props.roundResult),
      answerAck: null,
      opponentAnsweredCorrectly: null,
      myRound: null,
      opponentRound: null,
      devPossessionAnimation: null,
      clearDevPossessionAnimation: vi.fn(),
      playerAvatar: '/me.png',
      opponentAvatar: '/opp.png',
      playerUsername: 'me',
      opponentUsername: 'opp',
      isHalftime: false,
    }), {
      initialProps: {
        match: makeMatch(40),
        roundResult: null as MatchRoundResultPayload | null,
      },
    });

    expect(result.current.visualMyPossessionPct).toBe(70);

    rerender({
      match: makeMatch(0),
      roundResult: makeRoundResult(5, 1),
    });

    expect(result.current.visualMyPossessionPct).toBe(70);

    act(() => {
      vi.advanceTimersByTime(FIELD_RESULT_COMPARE_MS + FIELD_POSSESSION_CUE_MS + 10);
    });

    expect(result.current.visualMyPossessionPct).toBe(50);
  });

  it('keeps the captured shot origin stable even when possession resets after a goal', () => {
    const { result, rerender } = renderHook((props: {
      match: MatchStatus;
      roundResult: MatchRoundResultPayload | null;
    }) => usePossessionFieldState({
      match: props.match,
      localQuestion: makeQuestion(5, 'normal', 1),
      roundResult: props.roundResult,
      questionPhase: 'playing',
      roundResolved: Boolean(props.roundResult),
      answerAck: null,
      opponentAnsweredCorrectly: null,
      myRound: null,
      opponentRound: null,
      devPossessionAnimation: null,
      clearDevPossessionAnimation: vi.fn(),
      playerAvatar: '/me.png',
      opponentAvatar: '/opp.png',
      playerUsername: 'me',
      opponentUsername: 'opp',
      isHalftime: false,
    }), {
      initialProps: {
        match: makeMatch(40),
        roundResult: null as MatchRoundResultPayload | null,
      },
    });

    rerender({
      match: makeMatch(0),
      roundResult: makeRoundResult(5, 1, 1),
    });

    expect(result.current.pitchProps.shotMode?.ballOriginX).toBe(352);

    rerender({
      match: makeMatch(-20),
      roundResult: makeRoundResult(5, 1, 1),
    });

    expect(result.current.pitchProps.shotMode?.ballOriginX).toBe(352);
  });

  it('mirrors the pitch and target goal in the second half', () => {
    const { result, rerender } = renderHook((props: {
      match: MatchStatus;
      localQuestion: ResolvedMatchQuestionPayload;
    }) => usePossessionFieldState({
      match: props.match,
      localQuestion: props.localQuestion,
      roundResult: null,
      questionPhase: 'playing',
      roundResolved: false,
      answerAck: null,
      opponentAnsweredCorrectly: null,
      myRound: null,
      opponentRound: null,
      devPossessionAnimation: null,
      clearDevPossessionAnimation: vi.fn(),
      playerAvatar: '/me.png',
      opponentAvatar: '/opp.png',
      playerUsername: 'me',
      opponentUsername: 'opp',
      isHalftime: false,
    }), {
      initialProps: {
        match: makeMatch(40, { half: 1, attackerSeat: 1 }),
        localQuestion: makeQuestion(6, 'normal', 1),
      },
    });

    expect(result.current.pitchProps.mirrored).toBe(false);
    expect(result.current.pitchProps.targetGoal).toBeUndefined();

    rerender({
      match: makeMatch(40, { half: 2, attackerSeat: 1 }),
      localQuestion: makeQuestion(6, 'normal', 1),
    });

    expect(result.current.pitchProps.mirrored).toBe(true);
    expect(result.current.pitchProps.targetGoal).toBeUndefined();

    rerender({
      match: makeMatch(40, { half: 1, phaseKind: 'shot', attackerSeat: 1 }),
      localQuestion: makeQuestion(6, 'shot', 1),
    });

    expect(result.current.pitchProps.mirrored).toBe(false);
    expect(result.current.pitchProps.targetGoal).toBe('right');

    rerender({
      match: makeMatch(40, { half: 2, phaseKind: 'shot', attackerSeat: 1 }),
      localQuestion: makeQuestion(6, 'shot', 1),
    });

    expect(result.current.pitchProps.mirrored).toBe(true);
    expect(result.current.pitchProps.targetGoal).toBe('left');

    rerender({
      match: makeMatch(40, { half: 2, phaseKind: 'penalty' }),
      localQuestion: makeQuestion(6, 'penalty', 1),
    });

    expect(result.current.pitchProps.targetGoal).toBe('left');
  });
});
