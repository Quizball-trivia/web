import { useEffect, useMemo, useRef, useState } from 'react';
import { useRealtimeMatchStore } from '@/stores/realtimeMatch.store';
import { getSocket } from '@/lib/realtime/socket-client';
import { logger } from '@/utils/logger';
import { QUESTION_REVEAL_MS } from '@/features/possession/types/possession.types';
import { trackAnswerSubmitted } from '@/lib/analytics/game-events';

const QUESTION_PLAYING_MS = 10000; // 10 second playing phase
export const ROUND_RESULT_HOLD_MS = 2500; // hold result for 2.5s before transitioning to next question
const GOAL_CELEBRATION_EXTRA_MS = 2500; // extra delay for GOOOL overlay before round transition

interface UseRealtimeGameLogicOptions {
  /** Extra delay (ms) between hiding options and promoting the next question. Used for round transition overlay. */
  transitionDelayMs?: number;
  /** When true, the question reveal timer is blocked (options + timer won't start). */
  blockReveal?: boolean;
}

export function useRealtimeGameLogic(options: UseRealtimeGameLogicOptions = {}) {
  const { transitionDelayMs = 0, blockReveal = false } = options;
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
  const [roundResultHoldDone, setRoundResultHoldDone] = useState(false);
  const [transitionElapsed, setTransitionElapsed] = useState(false);
  const [nowMs, setNowMs] = useState(() => Date.now());
  const matchPausedRef = useRef(matchPaused);

  useEffect(() => {
    matchPausedRef.current = matchPaused;
  }, [matchPaused]);

  const currentQuestion = match?.currentQuestion ?? null;
  const isLastAttackQuestion = currentQuestion?.phaseKind === 'last_attack';
  const currentQuestionIndex = currentQuestion?.qIndex;
  const questionPhase = match?.currentQuestionPhase ?? 'reveal';
  const playableAtMs = currentQuestion?.playableAt
    ? new Date(currentQuestion.playableAt).getTime()
    : null;
  const normalizedPlayableAtMs = playableAtMs !== null && Number.isFinite(playableAtMs)
    ? playableAtMs
    : null;
  const questionDeadlineAtMs = currentQuestion?.deadlineAt
    ? new Date(currentQuestion.deadlineAt).getTime()
    : null;
  const normalizedQuestionDeadlineAtMs = questionDeadlineAtMs !== null && Number.isFinite(questionDeadlineAtMs)
    ? questionDeadlineAtMs
    : null;
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
    setTimeRemaining(QUESTION_PLAYING_MS / 1000);

    // If the transition overlay was showing, keep roundResultHoldDone=true briefly
    // so the overlay lingers while the question panel swaps underneath. This prevents
    // the old question text from flashing when the overlay exits.
    if (roundResultHoldDone) {
      const lingerTimer = setTimeout(() => {
        setRoundResultHoldDone(false);
        setTransitionElapsed(false);
      }, 450); // enough for question AnimatePresence swap (0.2s exit + 0.2s enter)
      return () => clearTimeout(lingerTimer);
    }

    setRoundResultHoldDone(false);
    setTransitionElapsed(false);
  }, [currentQuestionIndex]); // eslint-disable-line react-hooks/exhaustive-deps -- roundResultHoldDone read intentionally without dep

  // Phase transition effect: reveal → playing
  // showOptions is already reset synchronously in the question-change effect above,
  // so we only need the delayed reveal timer here.
  // blockReveal gates the timer so options + answer countdown don't start while
  // an intro overlay is still showing (e.g. first question "QUESTION 1" overlay).
  useEffect(() => {
    if (currentQuestionIndex === undefined || matchPausedRef.current || startCountdownActive || blockReveal) return;

    const revealDelayMs = normalizedPlayableAtMs !== null
      ? Math.max(0, normalizedPlayableAtMs - Date.now())
      : QUESTION_REVEAL_MS;
    const revealTimer = setTimeout(() => {
      if (matchPausedRef.current) return;
      setShowOptions(true);
      setQuestionPhase('playing');
    }, revealDelayMs);

    return () => clearTimeout(revealTimer);
  }, [blockReveal, currentQuestionIndex, matchPaused, normalizedPlayableAtMs, setQuestionPhase, startCountdownActive]);

  // Timer countdown effect — purely client-driven from when options appear
  const optionsShownAtRef = useRef<number | null>(null);
  useEffect(() => {
    if (showOptions) {
      optionsShownAtRef.current = normalizedPlayableAtMs ?? Date.now();
    } else {
      optionsShownAtRef.current = null;
    }
  }, [normalizedPlayableAtMs, showOptions]);

  useEffect(() => {
    if (!showOptions || !currentQuestion) return;
    if (matchPaused || startCountdownActive) return;

    if (normalizedQuestionDeadlineAtMs !== null) {
      const tick = () => {
        const now = Date.now();
        const effectiveNow = normalizedPlayableAtMs !== null ? Math.max(now, normalizedPlayableAtMs) : now;
        const remainingMs = normalizedQuestionDeadlineAtMs - effectiveNow;
        if (remainingMs > 0) {
          setTimeRemaining(Math.ceil(remainingMs / 1000));
        } else {
          setTimeRemaining(0);
        }
      };

      tick();
      const interval = setInterval(tick, 100);
      return () => clearInterval(interval);
    }

    const startedAt = optionsShownAtRef.current ?? Date.now();

    const interval = setInterval(() => {
      const elapsedMs = Date.now() - startedAt;
      const remainingMs = QUESTION_PLAYING_MS - elapsedMs;
      if (remainingMs > 0) {
        setTimeRemaining(Math.ceil(remainingMs / 1000));
      } else {
        setTimeRemaining(0);
      }
    }, 100);

    return () => clearInterval(interval);
  }, [currentQuestion, matchPaused, normalizedPlayableAtMs, normalizedQuestionDeadlineAtMs, showOptions, startCountdownActive]);

  const answerAck = match?.answerAck && match.currentQuestion?.qIndex === match.answerAck.qIndex
    ? match.answerAck
    : null;

  const roundResult = match?.lastRoundResult && match.currentQuestion?.qIndex === match.lastRoundResult.qIndex
    ? match.lastRoundResult
    : null;
  const roundResultHoldMs = ROUND_RESULT_HOLD_MS;
  const opponentAnswered = match?.opponentAnswered ?? false;

  const roundResolved = Boolean(roundResult);

  const currentPhaseKind = currentQuestion?.phaseKind ?? 'normal';
  const isGoalRound = Boolean(roundResult?.deltas?.goalScoredBySeat);
  const isFinalGoalRound = isGoalRound && match?.possessionState?.phase === 'COMPLETED';
  const goalExtra = isFinalGoalRound ? GOAL_CELEBRATION_EXTRA_MS : 0;
  const effectiveDelay = currentPhaseKind === 'normal' ? transitionDelayMs + goalExtra : 0;

  // Hold timer — hide options after result display, then either signal transition
  // (normal phases with delay) or let the gate effect promote directly (non-normal).
  // Also set roundResultHoldDone for goal rounds so the GoalCelebrationOverlay fires
  // (it triggers on roundResultHoldDone, not effectiveDelay).
  useEffect(() => {
    if (!roundResolved || !showOptions || matchPaused || startCountdownActive) return;

    const holdTimer = setTimeout(() => {
      setShowOptions(false);
      if (effectiveDelay > 0 || isGoalRound) {
        setRoundResultHoldDone(true);
      }
    }, roundResultHoldMs);

    return () => clearTimeout(holdTimer);
  }, [roundResolved, showOptions, matchPaused, currentQuestionIndex, roundResultHoldMs, startCountdownActive, effectiveDelay, isGoalRound]);

  // Transition delay timer — when the overlay is showing, count down the delay.
  // Sets transitionElapsed=true which opens the gate for promotion.
  useEffect(() => {
    if (!roundResultHoldDone) return;
    const timer = setTimeout(() => setTransitionElapsed(true), effectiveDelay);
    return () => clearTimeout(timer);
  }, [roundResultHoldDone, effectiveDelay]);

  // Unified promote gate — advances to the next question when conditions are met.
  // Handles: (a) non-transition promotes (effectiveDelay=0), (b) post-transition promotes,
  // and (c) late-arriving questions in both cases. The gate stays open (transitionElapsed=true)
  // until the question actually changes, so stragglers are caught immediately.
  const hasPendingQuestion = Boolean(match?.pendingQuestion);
  useEffect(() => {
    if (!hasPendingQuestion || showOptions || matchPaused || startCountdownActive) return;
    // During transition gap: wait for transition delay to elapse
    if (roundResultHoldDone && !transitionElapsed) return;
    promotePendingQuestion();
  }, [hasPendingQuestion, showOptions, roundResultHoldDone, transitionElapsed, matchPaused, promotePendingQuestion, startCountdownActive]);

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

    const startedAt = normalizedPlayableAtMs ?? optionsShownAtRef.current ?? Date.now();
    const now = normalizedQuestionDeadlineAtMs != null
      ? Math.min(Date.now(), normalizedQuestionDeadlineAtMs)
      : Date.now();
    const maxWindowMs = normalizedQuestionDeadlineAtMs != null
      ? Math.max(0, normalizedQuestionDeadlineAtMs - startedAt)
      : QUESTION_PLAYING_MS;
    const elapsed = Math.min(maxWindowMs, Math.max(0, now - startedAt));

    if (correctIndex !== undefined) {
      trackAnswerSubmitted(
        String(currentQuestion.qIndex),
        index === correctIndex,
        Math.round(elapsed),
        currentQuestion.qIndex,
      );
    }

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
      roundResultHoldDone,
      countdownRemainingMs,
      countdownSeconds,
      startCountdownActive,
    },
    actions: {
      submitAnswer,
    },
  };
}
