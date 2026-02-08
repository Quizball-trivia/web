import { useEffect, useMemo, useRef, useState } from 'react';
import { useRealtimeMatchStore } from '@/stores/realtimeMatch.store';
import { getSocket } from '@/lib/realtime/socket-client';
import { logger } from '@/utils/logger';

const QUESTION_REVEAL_MS = 2000; // 2 second reveal phase before options become clickable
const QUESTION_PLAYING_MS = 10000; // 10 second playing phase
const ROUND_RESULT_HOLD_MS = 2000; // hold correct answer for 2s before moving to next round

export function useRealtimeGameLogic() {
  const match = useRealtimeMatchStore((state) => state.match);
  const selfUserId = useRealtimeMatchStore((state) => state.selfUserId);
  const matchPaused = useRealtimeMatchStore((state) => state.matchPaused);
  const pauseUntil = useRealtimeMatchStore((state) => state.pauseUntil);
  const setQuestionPhase = useRealtimeMatchStore((state) => state.setQuestionPhase);
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null);
  const [timeRemaining, setTimeRemaining] = useState(QUESTION_PLAYING_MS / 1000);
  const [showOptions, setShowOptions] = useState(false);
  const matchPausedRef = useRef(matchPaused);

  useEffect(() => {
    matchPausedRef.current = matchPaused;
  }, [matchPaused]);

  const currentQuestion = match?.currentQuestion ?? null;
  const currentQuestionIndex = currentQuestion?.qIndex;
  const questionPhase = match?.currentQuestionPhase ?? 'reveal';

  useEffect(() => {
    // Reset selected answer when question changes - intentional sync pattern
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setSelectedAnswer(null);
  }, [currentQuestionIndex]);

  // Phase transition effect: reveal → playing
  useEffect(() => {
    if (currentQuestionIndex === undefined || matchPausedRef.current) return;

    const resetTimer = setTimeout(() => {
      if (matchPausedRef.current) return;
      setShowOptions(false);
      setQuestionPhase('reveal');
    }, 0);

    const revealTimer = setTimeout(() => {
      if (matchPausedRef.current) return;
      setShowOptions(true);
      setQuestionPhase('playing');
    }, QUESTION_REVEAL_MS);

    return () => {
      clearTimeout(resetTimer);
      clearTimeout(revealTimer);
    };
  }, [currentQuestionIndex, setQuestionPhase]);

  // Timer countdown effect
  useEffect(() => {
    if (!currentQuestion) return;
    if (matchPaused) return;

    // Backend deadline is for 10s playing phase
    // Add reveal offset so countdown starts when options unlock
    const backendDeadline = new Date(currentQuestion.deadlineAt).getTime();
    const adjustedDeadline = backendDeadline + QUESTION_REVEAL_MS;

    const interval = setInterval(() => {
      const remainingMs = adjustedDeadline - Date.now();
      // Only show countdown if we're in the playing phase
      // During reveal phase, don't show timer at all (handled in component)
      if (remainingMs > 0) {
        setTimeRemaining(Math.ceil(remainingMs / 1000));
      } else {
        setTimeRemaining(0);
      }
    }, 100);

    return () => clearInterval(interval);
  }, [currentQuestion, matchPaused]);

  const answerAck = match?.answerAck && match.currentQuestion?.qIndex === match.answerAck.qIndex
    ? match.answerAck
    : null;

  const roundResult = match?.lastRoundResult && match.currentQuestion?.qIndex === match.lastRoundResult.qIndex
    ? match.lastRoundResult
    : null;
  const opponentAnswered = match?.opponentAnswered ?? false;

  const roundResolved = Boolean(
    roundResult ||
      (answerAck && (answerAck.oppAnswered || opponentAnswered))
  );

  useEffect(() => {
    if (!roundResolved || !showOptions || matchPaused) return;

    const holdTimer = setTimeout(() => {
      setShowOptions(false);
    }, ROUND_RESULT_HOLD_MS);

    return () => clearTimeout(holdTimer);
  }, [roundResolved, showOptions, matchPaused, currentQuestionIndex]);

  const showResult = Boolean(answerAck || roundResult);
  const isAnswered = selectedAnswer !== null || showResult;

  const opponentId = match?.opponent.id ?? null;
  const myRoundResult = useMemo(() => {
    if (!roundResult) return null;
    if (selfUserId && roundResult.players[selfUserId]) {
      return roundResult.players[selfUserId] ?? null;
    }
    if (opponentId) {
      return (
        Object.entries(roundResult.players).find(([userId]) => userId !== opponentId)?.[1] ?? null
      );
    }
    return Object.values(roundResult.players)[0] ?? null;
  }, [roundResult, selfUserId, opponentId]);

  const opponentRoundResult = useMemo(() => {
    if (!roundResult) return null;
    if (opponentId && roundResult.players[opponentId]) {
      return roundResult.players[opponentId] ?? null;
    }
    if (selfUserId) {
      return Object.entries(roundResult.players).find(([userId]) => userId !== selfUserId)?.[1] ?? null;
    }
    return Object.values(roundResult.players)[1] ?? null;
  }, [roundResult, selfUserId, opponentId]);

  const correctIndex = useMemo(() => {
    if (!match || !currentQuestion) return undefined;
    const stored = match.questions[currentQuestion.qIndex]?.correctIndex;
    return stored ?? answerAck?.correctIndex ?? roundResult?.correctIndex;
  }, [answerAck?.correctIndex, roundResult?.correctIndex, match, currentQuestion]);

  const playerScore = match?.myTotalPoints ?? 0;
  const opponentScore = match?.oppTotalPoints ?? 0;

  const submitAnswer = (index: number) => {
    if (!match || !currentQuestion) return;
    if (isAnswered) return;
    if (matchPaused) return;
    if (questionPhase !== 'playing') return; // Prevent answers during reveal
    if (timeRemaining <= 0) return;
    setSelectedAnswer(index);

    const deadlineMs = new Date(currentQuestion.deadlineAt).getTime();
    const elapsed = Math.min(QUESTION_PLAYING_MS, Math.max(0, QUESTION_PLAYING_MS - (deadlineMs - Date.now())));

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
      roundResolved,
      roundResult,
      isAnswered,
      correctIndex,
      opponentAnswered,
      myRoundResult,
      opponentRoundResult,
      playerScore,
      opponentScore,
      matchPaused,
      pauseUntil,
      questionPhase,
      showOptions,
    },
    actions: {
      submitAnswer,
    },
  };
}
