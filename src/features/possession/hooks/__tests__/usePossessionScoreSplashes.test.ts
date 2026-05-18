import { act, renderHook } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { MatchAnswerAckPayload, MatchRoundResultPayload, ResolvedMatchQuestionPayload } from '@/lib/realtime/socket.types';
import { usePossessionScoreSplashes } from '../usePossessionScoreSplashes';

const QUESTION: ResolvedMatchQuestionPayload = {
  matchId: 'match-1',
  qIndex: 5,
  total: 12,
  phaseKind: 'normal',
  phaseRound: 6,
  playableAt: new Date(Date.now() - 1000).toISOString(),
  deadlineAt: new Date(Date.now() + 9000).toISOString(),
  question: {
    kind: 'multipleChoice',
    id: 'q-5',
    prompt: 'Question 5',
    options: ['A', 'B', 'C', 'D'],
    categoryName: 'Football',
  },
};

const ACK: MatchAnswerAckPayload = {
  matchId: 'match-1',
  qIndex: 5,
  questionKind: 'multipleChoice',
  selectedIndex: 1,
  isCorrect: true,
  correctIndex: 1,
  myTotalPoints: 120,
  oppAnswered: false,
  pointsEarned: 70,
  phaseKind: 'normal',
  phaseRound: 6,
};

const ROUND_RESULT: MatchRoundResultPayload = {
  matchId: 'match-1',
  qIndex: 5,
  questionKind: 'multipleChoice',
  reveal: { kind: 'multipleChoice', correctIndex: 1 },
  players: {
    player: {
      totalPoints: 120,
      pointsEarned: 70,
      isCorrect: true,
      timeMs: 900,
      selectedIndex: 1,
      submittedOrderIds: [],
    },
    opponent: {
      totalPoints: 40,
      pointsEarned: 0,
      isCorrect: false,
      timeMs: 3000,
      selectedIndex: 2,
      submittedOrderIds: [],
    },
  },
  phaseKind: 'normal',
  phaseRound: 6,
  shooterSeat: null,
  attackerSeat: null,
  deltas: {
    possessionDelta: 70,
    penaltyOutcome: null,
    goalScoredBySeat: null,
  },
};

describe('usePossessionScoreSplashes', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('clears active player splash when halftime begins', async () => {
    const { result, rerender } = renderHook((props: {
      isHalftime: boolean;
      localQuestion: ResolvedMatchQuestionPayload | null;
      answerAck: MatchAnswerAckPayload | null;
    }) => usePossessionScoreSplashes({
      localQuestion: props.localQuestion,
      phaseKind: 'normal',
      isHalftime: props.isHalftime,
      selectedAnswer: 1,
      selectedAnswerQIndex: 5,
      opponentAnswered: false,
      opponentAnsweredCorrectly: null,
      opponentRecentPoints: null,
      answerAck: props.answerAck,
      roundResult: null,
      myRound: null,
      opponentRound: null,
    }), {
      initialProps: {
        isHalftime: false,
        localQuestion: QUESTION,
        answerAck: ACK,
      },
    });

    await act(async () => {});

    expect(result.current.showPlayerSplash).toBe(true);

    rerender({
      isHalftime: true,
      localQuestion: QUESTION,
      answerAck: ACK,
    });

    await act(async () => {});

    expect(result.current.showPlayerSplash).toBe(false);
    expect(result.current.playerSplashPoints).toBeNull();
  });

  it('uses authoritative player points from answer ack even near a timer boundary', async () => {
    const mockNow = new Date('2026-04-26T12:00:00.999Z').getTime();
    vi.spyOn(Date, 'now').mockReturnValue(mockNow);

    const boundaryQuestion: ResolvedMatchQuestionPayload = {
      ...QUESTION,
      playableAt: new Date(mockNow - 999).toISOString(),
      deadlineAt: new Date(mockNow + 9001).toISOString(),
    };

    const { result } = renderHook(() => usePossessionScoreSplashes({
      localQuestion: boundaryQuestion,
      phaseKind: 'normal',
      isHalftime: false,
      selectedAnswer: 1,
      selectedAnswerQIndex: 5,
      opponentAnswered: false,
      opponentAnsweredCorrectly: null,
      opponentRecentPoints: null,
      answerAck: ACK,
      roundResult: null,
      myRound: null,
      opponentRound: null,
    }));

    await act(async () => {});

    expect(result.current.showPlayerSplash).toBe(true);
    expect(result.current.playerSplashVariant).toBe('points');
    expect(result.current.playerSplashPoints).toBe(70);
  });

  it('shows player splash for clue answer acks without a selected MC answer', async () => {
    const clueAck: MatchAnswerAckPayload = {
      ...ACK,
      questionKind: 'clues',
      selectedIndex: null,
      isCorrect: true,
      correctIndex: undefined,
      pointsEarned: 100,
    };
    const clueQuestion: ResolvedMatchQuestionPayload = {
      ...QUESTION,
      question: {
        kind: 'clues',
        id: 'clue-5',
        prompt: 'Who am I?',
        categoryName: 'Football',
        clues: [
          { type: 'text', content: 'Portuguese forward' },
          { type: 'text', content: 'Won five Ballon d’Or awards' },
        ],
      },
    };

    const { result } = renderHook(() => usePossessionScoreSplashes({
      localQuestion: clueQuestion,
      phaseKind: 'normal',
      isHalftime: false,
      selectedAnswer: null,
      selectedAnswerQIndex: null,
      opponentAnswered: false,
      opponentAnsweredCorrectly: null,
      opponentRecentPoints: null,
      answerAck: clueAck,
      roundResult: null,
      myRound: null,
      opponentRound: null,
    }));

    await act(async () => {});

    expect(result.current.showPlayerSplash).toBe(true);
    expect(result.current.playerSplashVariant).toBe('points');
    expect(result.current.playerSplashPoints).toBe(100);
  });

  it('uses immediate opponent points instead of a pending correct label when available', async () => {
    const { result } = renderHook(() => usePossessionScoreSplashes({
      localQuestion: QUESTION,
      phaseKind: 'normal',
      isHalftime: false,
      selectedAnswer: null,
      selectedAnswerQIndex: null,
      opponentAnswered: true,
      opponentAnsweredCorrectly: true,
      opponentRecentPoints: 60,
      answerAck: null,
      roundResult: null,
      myRound: null,
      opponentRound: null,
    }));

    await act(async () => {});

    expect(result.current.showOpponentSplash).toBe(true);
    expect(result.current.opponentSplashVariant).toBe('points');
    expect(result.current.opponentSplashPoints).toBe(60);
  });

  it('falls back to round result for player MC splash when answer ack is missed', async () => {
    const { result } = renderHook(() => usePossessionScoreSplashes({
      localQuestion: QUESTION,
      phaseKind: 'normal',
      isHalftime: false,
      selectedAnswer: 1,
      selectedAnswerQIndex: 5,
      opponentAnswered: true,
      opponentAnsweredCorrectly: false,
      opponentRecentPoints: 0,
      answerAck: null,
      roundResult: ROUND_RESULT,
      myRound: ROUND_RESULT.players.player,
      opponentRound: ROUND_RESULT.players.opponent,
    }));

    await act(async () => {});

    expect(result.current.showPlayerSplash).toBe(true);
    expect(result.current.playerSplashVariant).toBe('points');
    expect(result.current.playerSplashPoints).toBe(70);
  });
});
