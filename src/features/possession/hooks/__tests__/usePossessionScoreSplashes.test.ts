import { renderHook } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import type { MatchAnswerAckPayload, ResolvedMatchQuestionPayload } from '@/lib/realtime/socket.types';
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

describe('usePossessionScoreSplashes', () => {
  it('clears active player splash when halftime begins', () => {
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
      answerAck: props.answerAck,
      roundResult: null,
      opponentRound: null,
    }), {
      initialProps: {
        isHalftime: false,
        localQuestion: QUESTION,
        answerAck: ACK,
      },
    });

    expect(result.current.showPlayerSplash).toBe(true);

    rerender({
      isHalftime: true,
      localQuestion: QUESTION,
      answerAck: ACK,
    });

    expect(result.current.showPlayerSplash).toBe(false);
    expect(result.current.playerSplashPoints).toBeNull();
  });
});
