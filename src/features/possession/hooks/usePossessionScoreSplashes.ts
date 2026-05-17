'use client';

import { useEffect, useRef, useState } from 'react';
import type {
  MatchAnswerAckPayload,
  MatchRoundResultPayload,
  MatchRoundResultPlayer,
  ResolvedMatchQuestionPayload,
} from '@/lib/realtime/socket.types';
import { type SplashVariant } from '../realtimePossession.helpers';

interface UsePossessionScoreSplashesParams {
  localQuestion: ResolvedMatchQuestionPayload | null;
  phaseKind: string;
  isHalftime: boolean;
  selectedAnswer: number | null;
  selectedAnswerQIndex: number | null;
  opponentAnswered: boolean;
  opponentAnsweredCorrectly: boolean | null;
  opponentRecentPoints: number | null;
  answerAck: MatchAnswerAckPayload | null;
  roundResult: MatchRoundResultPayload | null;
  myRound: MatchRoundResultPlayer | null;
  opponentRound: MatchRoundResultPlayer | null;
}

function resolveFeedbackPoints(
  pointsEarned: number,
  questionKind?: MatchAnswerAckPayload['questionKind'] | MatchRoundResultPayload['questionKind'],
  foundCount?: number
): number {
  if (pointsEarned > 0) return pointsEarned;
  if (questionKind === 'putInOrder' && typeof foundCount === 'number' && foundCount > 0) {
    return Math.min(foundCount, 5) * 20;
  }
  return pointsEarned;
}

export function usePossessionScoreSplashes({
  localQuestion,
  phaseKind,
  isHalftime,
  selectedAnswer,
  selectedAnswerQIndex,
  opponentAnswered,
  opponentAnsweredCorrectly,
  opponentRecentPoints,
  answerAck,
  roundResult,
  myRound,
  opponentRound,
}: UsePossessionScoreSplashesParams) {
  const [showPlayerSplash, setShowPlayerSplash] = useState(false);
  const [showOpponentSplash, setShowOpponentSplash] = useState(false);
  const [playerSplashPoints, setPlayerSplashPoints] = useState<number | null>(null);
  const [opponentSplashPoints, setOpponentSplashPoints] = useState<number | null>(null);
  const [playerSplashVariant, setPlayerSplashVariant] = useState<SplashVariant>('points');
  const [opponentSplashVariant, setOpponentSplashVariant] = useState<SplashVariant>('points');
  const shownSplashQRef = useRef<{ player: number | null; opponent: number | null }>({
    player: null,
    opponent: null,
  });

  useEffect(() => {
    if (!isHalftime && localQuestion?.qIndex == null) return;

    queueMicrotask(() => {
      setShowPlayerSplash(false);
      setShowOpponentSplash(false);
      setPlayerSplashPoints(null);
      setOpponentSplashPoints(null);
      setPlayerSplashVariant('points');
      setOpponentSplashVariant('points');
    });

    if (isHalftime) {
      shownSplashQRef.current = { player: null, opponent: null };
      return;
    }
  }, [isHalftime, localQuestion?.qIndex]);

  useEffect(() => {
    if (!answerAck) return;
    const points = resolveFeedbackPoints(answerAck.pointsEarned, answerAck.questionKind, answerAck.foundCount);
    if (points <= 0) return;
    if (phaseKind !== 'normal' && phaseKind !== 'last_attack') return;
    const isMultipleChoiceAck = answerAck.questionKind === 'multipleChoice';
    if (isMultipleChoiceAck && (selectedAnswer === null || selectedAnswerQIndex !== answerAck.qIndex)) return;
    if (shownSplashQRef.current.player === answerAck.qIndex) return;

    const activeQIndex = localQuestion?.qIndex ?? answerAck.qIndex;
    if (activeQIndex !== answerAck.qIndex) return;

    queueMicrotask(() => {
      setPlayerSplashVariant('points');
      setPlayerSplashPoints(points);
      setShowPlayerSplash(true);
    });
    shownSplashQRef.current.player = answerAck.qIndex;
  }, [answerAck, localQuestion?.qIndex, phaseKind, selectedAnswer, selectedAnswerQIndex]);

  // Round-result fallback. Special questions always use this path; MC rounds
  // also use it if the immediate answer_ack was missed and did not show a
  // player splash already.
  useEffect(() => {
    if (!roundResult || !myRound) return;
    const resolvedPhaseKind = roundResult.phaseKind ?? phaseKind;
    if (resolvedPhaseKind !== 'normal' && resolvedPhaseKind !== 'last_attack') return;
    if (shownSplashQRef.current.player === roundResult.qIndex) return;
    const points = resolveFeedbackPoints(myRound.pointsEarned, roundResult.questionKind, myRound.foundCount);
    if (points <= 0) return;

    queueMicrotask(() => {
      setPlayerSplashVariant('points');
      setPlayerSplashPoints(points);
      setShowPlayerSplash(true);
    });
    shownSplashQRef.current.player = roundResult.qIndex;
  }, [roundResult, myRound, phaseKind, selectedAnswer]);

  useEffect(() => {
    if (!opponentAnswered && !roundResult) return;
    const resolvedPhaseKind = roundResult?.phaseKind ?? phaseKind;
    if (resolvedPhaseKind !== 'normal' && resolvedPhaseKind !== 'last_attack') return;

    const activeQIndex = localQuestion?.qIndex ?? roundResult?.qIndex ?? null;
    if (activeQIndex === null || shownSplashQRef.current.opponent === activeQIndex) return;

    const immediatePoints = opponentAnswered ? opponentRecentPoints : null;
    const resolvedPoints = opponentRound
      ? resolveFeedbackPoints(opponentRound.pointsEarned, roundResult?.questionKind, opponentRound.foundCount)
      : null;
    const splashPoints = resolvedPoints ?? immediatePoints;

    if (splashPoints != null && splashPoints > 0) {
      queueMicrotask(() => {
        setOpponentSplashVariant('points');
        setOpponentSplashPoints(splashPoints);
        setShowOpponentSplash(true);
      });
      shownSplashQRef.current.opponent = activeQIndex;
    }
  }, [localQuestion?.qIndex, opponentAnswered, opponentAnsweredCorrectly, opponentRecentPoints, opponentRound, phaseKind, roundResult]);

  useEffect(() => {
    if (!roundResult || !opponentRound) return;
    const points = resolveFeedbackPoints(opponentRound.pointsEarned, roundResult.questionKind, opponentRound.foundCount);
    if (points <= 0) return;
    if (shownSplashQRef.current.opponent !== roundResult.qIndex) return;

    queueMicrotask(() => {
      setOpponentSplashVariant('points');
      setOpponentSplashPoints(points);
      setShowOpponentSplash(true);
    });
  }, [opponentRound, roundResult]);

  return {
    showPlayerSplash,
    showOpponentSplash,
    playerSplashPoints,
    opponentSplashPoints,
    playerSplashVariant,
    opponentSplashVariant,
    onPlayerSplashComplete: () => setShowPlayerSplash(false),
    onOpponentSplashComplete: () => setShowOpponentSplash(false),
  };
}
