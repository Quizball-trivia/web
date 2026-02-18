import { useEffect, useMemo, useRef, useState } from 'react';
import { useRealtimeMatchStore } from '@/stores/realtimeMatch.store';
import { getSocket } from '@/lib/realtime/socket-client';
import { logger } from '@/utils/logger';
import { QUESTION_REVEAL_MS } from '@/features/possession/types/possession.types';

const QUESTION_PLAYING_MS = 10000; // 10 second playing phase
const ROUND_RESULT_HOLD_MS = 1800; // hold result for 1.8s before transitioning to next question
const GOAL_CELEBRATION_HOLD_MS = 2000; // keep goal celebrations visible for 2s before next question

export function useRealtimeGameLogic() {
  const match = useRealtimeMatchStore((state) => state.match);
  const selfUserId = useRealtimeMatchStore((state) => state.selfUserId);
  const matchPaused = useRealtimeMatchStore((state) => state.matchPaused);
  const pauseUntil = useRealtimeMatchStore((state) => state.pauseUntil);
  const setQuestionPhase = useRealtimeMatchStore((state) => state.setQuestionPhase);
  const promotePendingQuestion = useRealtimeMatchStore((state) => state.promotePendingQuestion);
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null);
  const [selectedAnswerQIndex, setSelectedAnswerQIndex] = useState<number | undefined>(undefined);
  const [timeRemaining, setTimeRemaining] = useState(QUESTION_PLAYING_MS / 1000);
  const [showOptions, setShowOptions] = useState(false);
  const [nowMs, setNowMs] = useState(() => Date.now());
  const matchPausedRef = useRef(matchPaused);

  useEffect(() => {
    matchPausedRef.current = matchPaused;
  }, [matchPaused]);

  const currentQuestion = match?.currentQuestion ?? null;
  const isLastAttackQuestion = currentQuestion?.phaseKind === 'last_attack';
  const currentQuestionIndex = currentQuestion?.qIndex;
  const questionPhase = match?.currentQuestionPhase ?? 'reveal';
  const countdownEndsAt = match?.countdownEndsAt ?? null;
  const countdownRemainingMs = useMemo(() => {
    if (!countdownEndsAt) return 0;
    return Math.max(0, countdownEndsAt - nowMs);
  }, [countdownEndsAt, nowMs]);
  const countdownSeconds = Math.ceil(countdownRemainingMs / 1000);
  const startCountdownActive = countdownRemainingMs > 0 && (currentQuestion?.qIndex ?? 0) === 0;

  useEffect(() => {
    if (!countdownEndsAt) return;
    const tick = () => setNowMs(Date.now());
    tick();
    if (countdownEndsAt <= Date.now()) return;
    const intervalId = setInterval(() => {
      tick();
      if (Date.now() >= countdownEndsAt) {
        clearInterval(intervalId);
      }
    }, 100);
    return () => clearInterval(intervalId);
  }, [countdownEndsAt]);

  useEffect(() => {
    // Reset UI state synchronously when question changes — prevents one-frame flash
    // where new question mounts with stale showOptions=true from previous question.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setSelectedAnswer(null);
    setSelectedAnswerQIndex(undefined);
    setShowOptions(false);
  }, [currentQuestionIndex]);

  // Phase transition effect: reveal → playing
  // showOptions is already reset synchronously in the question-change effect above,
  // so we only need the delayed reveal timer here.
  useEffect(() => {
    if (currentQuestionIndex === undefined || matchPausedRef.current || startCountdownActive) return;

    const revealTimer = setTimeout(() => {
      if (matchPausedRef.current) return;
      setShowOptions(true);
      setQuestionPhase('playing');
    }, QUESTION_REVEAL_MS);

    return () => clearTimeout(revealTimer);
  }, [currentQuestionIndex, setQuestionPhase, startCountdownActive]);

  // Timer countdown effect
  useEffect(() => {
    if (!currentQuestion) return;
    if (matchPaused || startCountdownActive) return;

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
  }, [currentQuestion, matchPaused, startCountdownActive]);

  const answerAck = match?.answerAck && match.currentQuestion?.qIndex === match.answerAck.qIndex
    ? match.answerAck
    : null;

  const roundResult = match?.lastRoundResult && match.currentQuestion?.qIndex === match.lastRoundResult.qIndex
    ? match.lastRoundResult
    : null;
  const roundResultHoldMs = roundResult?.deltas?.goalScoredBySeat ? GOAL_CELEBRATION_HOLD_MS : ROUND_RESULT_HOLD_MS;
  const opponentAnswered = match?.opponentAnswered ?? false;

  const roundResolved = Boolean(roundResult);

  useEffect(() => {
    if (!roundResolved || !showOptions || matchPaused || startCountdownActive) return;

    const holdTimer = setTimeout(() => {
      setShowOptions(false);
      // If a question arrived while result was showing, promote it now
      promotePendingQuestion();
    }, roundResultHoldMs);

    return () => clearTimeout(holdTimer);
  }, [roundResolved, showOptions, matchPaused, currentQuestionIndex, promotePendingQuestion, roundResultHoldMs, startCountdownActive]);

  // Promote late-arriving questions: if the hold timer already fired (showOptions=false)
  // but the question arrived after, it's stuck in pendingQuestion. Promote immediately.
  const hasPendingQuestion = Boolean(match?.pendingQuestion);
  useEffect(() => {
    if (!hasPendingQuestion || showOptions || matchPaused || startCountdownActive) return;
    // showOptions is false + pendingQuestion exists = hold timer already fired, question arrived late
    promotePendingQuestion();
  }, [hasPendingQuestion, showOptions, matchPaused, promotePendingQuestion, startCountdownActive]);

  const showResult = Boolean(answerAck || roundResult);
  const isAnswered = selectedAnswer !== null || showResult;
  const showOptionsVisible = showOptions && !startCountdownActive;

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
    // Primary: read directly from the question payload (sent with question for instant feedback)
    if (currentQuestion.correctIndex !== undefined) return currentQuestion.correctIndex;
    const stored = match.questions[currentQuestion.qIndex]?.correctIndex;
    return stored ?? answerAck?.correctIndex ?? roundResult?.correctIndex;
  }, [answerAck?.correctIndex, roundResult?.correctIndex, match, currentQuestion]);

  const playerScore = match?.myTotalPoints ?? 0;
  const opponentScore = match?.oppTotalPoints ?? 0;

  const submitAnswer = (index: number) => {
    if (!match || !currentQuestion) return;
    if (isAnswered) return;
    if (matchPaused) return;
    if (startCountdownActive) return;
    if (questionPhase !== 'playing') return; // Prevent answers during reveal
    if (timeRemaining <= 0) return;

    logger.info('Submitting answer with resolved correct index sources', {
      correctIndex,
      currentQuestionCorrectIndex: currentQuestion.correctIndex,
      storedQuestionCorrectIndex: match.questions[currentQuestion.qIndex]?.correctIndex,
    });

    setSelectedAnswer(index);
    setSelectedAnswerQIndex(currentQuestion.qIndex);

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
      isLastAttackQuestion,
      timeRemaining,
      selectedAnswer,
      selectedAnswerQIndex,
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
      showOptions: showOptionsVisible,
      countdownRemainingMs,
      countdownSeconds,
      startCountdownActive,
    },
    actions: {
      submitAnswer,
    },
  };
}
