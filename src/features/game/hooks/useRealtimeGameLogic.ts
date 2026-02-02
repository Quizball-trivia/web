import { useEffect, useMemo, useState } from 'react';
import { useRealtimeMatchStore } from '@/stores/realtimeMatch.store';
import { getSocket } from '@/lib/realtime/socket-client';
import { logger } from '@/utils/logger';

const QUESTION_TIME_MS = 6000;

export function useRealtimeGameLogic() {
  const match = useRealtimeMatchStore((state) => state.match);
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null);
  const [timeRemaining, setTimeRemaining] = useState(QUESTION_TIME_MS / 1000);

  const currentQuestion = match?.currentQuestion ?? null;

  useEffect(() => {
    setSelectedAnswer(null);
  }, [currentQuestion?.qIndex]);

  useEffect(() => {
    if (!currentQuestion) return;

    const deadline = new Date(currentQuestion.deadlineAt).getTime();
    const interval = setInterval(() => {
      const remainingMs = Math.max(0, deadline - Date.now());
      setTimeRemaining(remainingMs / 1000);
    }, 100);

    return () => clearInterval(interval);
  }, [currentQuestion]);

  const answerAck = match?.answerAck && match.currentQuestion?.qIndex === match.answerAck.qIndex
    ? match.answerAck
    : null;

  const roundResult = match?.lastRoundResult && match.currentQuestion?.qIndex === match.lastRoundResult.qIndex
    ? match.lastRoundResult
    : null;

  const showResult = Boolean(answerAck || roundResult);
  const isAnswered = selectedAnswer !== null || showResult;

  const correctIndex = useMemo(() => {
    if (!match || !currentQuestion) return undefined;
    const stored = match.questions[currentQuestion.qIndex]?.correctIndex;
    return stored ?? answerAck?.correctIndex ?? roundResult?.correctIndex;
  }, [answerAck?.correctIndex, roundResult?.correctIndex, match, currentQuestion]);

  const opponentAnswered = match?.opponentAnswered ?? false;
  const playerScore = match?.myTotalPoints ?? 0;
  const opponentScore = match?.oppTotalPoints ?? 0;

  const submitAnswer = (index: number) => {
    if (!match || !currentQuestion) return;
    if (isAnswered) return;
    if (timeRemaining <= 0) return;
    setSelectedAnswer(index);

    const deadlineMs = new Date(currentQuestion.deadlineAt).getTime();
    const elapsed = Math.min(QUESTION_TIME_MS, Math.max(0, QUESTION_TIME_MS - (deadlineMs - Date.now())));

    getSocket().emit('match:answer', {
      matchId: match.matchId,
      qIndex: currentQuestion.qIndex,
      selectedIndex: index,
      timeMs: Math.round(elapsed),
    });
    logger.info('Socket emit match:answer', {
      matchId: match.matchId,
      qIndex: currentQuestion.qIndex,
      selectedIndex: index,
      timeMs: Math.round(elapsed),
    });
  };

  return {
    state: {
      currentQuestion,
      timeRemaining,
      selectedAnswer,
      showResult,
      isAnswered,
      correctIndex,
      opponentAnswered,
      playerScore,
      opponentScore,
    },
    actions: {
      submitAnswer,
    },
  };
}
