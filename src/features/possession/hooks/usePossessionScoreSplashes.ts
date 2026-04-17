'use client';

import { useEffect, useRef, useState } from 'react';
import type {
  MatchAnswerAckPayload,
  MatchRoundResultPayload,
  MatchRoundResultPlayer,
  ResolvedMatchQuestionPayload,
} from '@/lib/realtime/socket.types';
import {
  getOptimisticSplashOutcome,
  type SplashVariant,
} from '../realtimePossession.helpers';

interface UsePossessionScoreSplashesParams {
  localQuestion: ResolvedMatchQuestionPayload | null;
  phaseKind: string;
  selectedAnswer: number | null;
  selectedAnswerQIndex: number | null;
  opponentAnswered: boolean;
  opponentAnsweredCorrectly: boolean | null;
  answerAck: MatchAnswerAckPayload | null;
  roundResult: MatchRoundResultPayload | null;
  opponentRound: MatchRoundResultPlayer | null;
}

export function usePossessionScoreSplashes({
  localQuestion,
  phaseKind,
  selectedAnswer,
  selectedAnswerQIndex,
  opponentAnswered,
  opponentAnsweredCorrectly,
  answerAck,
  roundResult,
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
    if (!answerAck || !answerAck.isCorrect) return;
    if (selectedAnswer === null || selectedAnswerQIndex == null) return;
    if (phaseKind !== 'normal' && phaseKind !== 'last_attack') return;
    if (selectedAnswerQIndex !== answerAck.qIndex) return;
    if (shownSplashQRef.current.player === answerAck.qIndex) return;

    const activeQIndex = localQuestion?.qIndex ?? answerAck.qIndex;
    if (activeQIndex !== answerAck.qIndex) return;

    const startedAtMs = localQuestion?.playableAt ? new Date(localQuestion.playableAt).getTime() : null;
    const deadlineAtMs = localQuestion?.deadlineAt ? new Date(localQuestion.deadlineAt).getTime() : null;
    const optimistic = getOptimisticSplashOutcome({ startedAtMs, deadlineAtMs });

    setPlayerSplashVariant(optimistic.variant === 'pending' ? 'pending' : 'points');
    setPlayerSplashPoints(optimistic.variant === 'pending' ? null : answerAck.pointsEarned);
    setShowPlayerSplash(true);
    shownSplashQRef.current.player = answerAck.qIndex;
  }, [answerAck, localQuestion?.deadlineAt, localQuestion?.playableAt, localQuestion?.qIndex, phaseKind, selectedAnswer, selectedAnswerQIndex]);

  useEffect(() => {
    if (!opponentAnswered && !roundResult) return;
    const resolvedPhaseKind = roundResult?.phaseKind ?? phaseKind;
    if (resolvedPhaseKind !== 'normal' && resolvedPhaseKind !== 'last_attack') return;

    const activeQIndex = localQuestion?.qIndex ?? roundResult?.qIndex ?? null;
    if (activeQIndex === null || shownSplashQRef.current.opponent === activeQIndex) return;

    const opponentCorrectImmediate = opponentAnswered && opponentAnsweredCorrectly === true;
    const opponentCorrectResolved = opponentRound?.isCorrect === true;
    if (opponentCorrectImmediate || opponentCorrectResolved) {
      setOpponentSplashVariant(opponentCorrectResolved ? 'points' : 'pending');
      setOpponentSplashPoints(opponentCorrectResolved ? (opponentRound?.pointsEarned ?? null) : null);
      setShowOpponentSplash(true);
      shownSplashQRef.current.opponent = activeQIndex;
    }
  }, [localQuestion?.qIndex, opponentAnswered, opponentAnsweredCorrectly, opponentRound, phaseKind, roundResult]);

  useEffect(() => {
    if (!roundResult || !opponentRound?.isCorrect) return;
    if (shownSplashQRef.current.opponent !== roundResult.qIndex) return;

    setOpponentSplashVariant('points');
    setOpponentSplashPoints(opponentRound.pointsEarned);
    setShowOpponentSplash(true);
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
