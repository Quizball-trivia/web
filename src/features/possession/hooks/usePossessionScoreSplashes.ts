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
    if (!answerAck || !answerAck.isCorrect) return;
    if (selectedAnswer === null || selectedAnswerQIndex == null) return;
    if (phaseKind !== 'normal' && phaseKind !== 'last_attack') return;
    if (selectedAnswerQIndex !== answerAck.qIndex) return;
    if (shownSplashQRef.current.player === answerAck.qIndex) return;

    const activeQIndex = localQuestion?.qIndex ?? answerAck.qIndex;
    if (activeQIndex !== answerAck.qIndex) return;

    queueMicrotask(() => {
      setPlayerSplashVariant('points');
      setPlayerSplashPoints(answerAck.pointsEarned);
      setShowPlayerSplash(true);
    });
    shownSplashQRef.current.player = answerAck.qIndex;
  }, [answerAck, localQuestion?.qIndex, phaseKind, selectedAnswer, selectedAnswerQIndex]);

  // Player splash for non-MC questions (countdown, putInOrder, clues) — fires from roundResult
  // since selectedAnswer is always null for these types
  useEffect(() => {
    if (!roundResult || !myRound) return;
    const resolvedPhaseKind = roundResult.phaseKind ?? phaseKind;
    if (resolvedPhaseKind !== 'normal' && resolvedPhaseKind !== 'last_attack') return;
    if (shownSplashQRef.current.player === roundResult.qIndex) return;
    // Only for non-MC: if selectedAnswer was set, the MC path above already handled it
    if (selectedAnswer !== null) return;
    if (!myRound.isCorrect || myRound.pointsEarned <= 0) return;

    queueMicrotask(() => {
      setPlayerSplashVariant('points');
      setPlayerSplashPoints(myRound.pointsEarned);
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

    const opponentCorrectImmediate = opponentAnswered && opponentAnsweredCorrectly === true;
    const opponentCorrectResolved = opponentRound?.isCorrect === true;
    const immediatePoints = opponentCorrectImmediate ? opponentRecentPoints : null;
    const resolvedPoints = opponentCorrectResolved ? (opponentRound?.pointsEarned ?? null) : null;
    const splashPoints = resolvedPoints ?? immediatePoints;

    if ((opponentCorrectImmediate || opponentCorrectResolved) && splashPoints != null && splashPoints > 0) {
      queueMicrotask(() => {
        setOpponentSplashVariant('points');
        setOpponentSplashPoints(splashPoints);
        setShowOpponentSplash(true);
      });
      shownSplashQRef.current.opponent = activeQIndex;
    }
  }, [localQuestion?.qIndex, opponentAnswered, opponentAnsweredCorrectly, opponentRecentPoints, opponentRound, phaseKind, roundResult]);

  useEffect(() => {
    if (!roundResult || !opponentRound?.isCorrect) return;
    if (shownSplashQRef.current.opponent !== roundResult.qIndex) return;

    queueMicrotask(() => {
      setOpponentSplashVariant('points');
      setOpponentSplashPoints(opponentRound.pointsEarned);
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
