import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useShallow } from 'zustand/shallow';
import { useRealtimeMatchStore, type MatchQuestionState } from '@/stores/realtimeMatch.store';
import { getSocket } from '@/lib/realtime/socket-client';
import { logger } from '@/utils/logger';
import { QUESTION_REVEAL_MS } from '@/features/possession/types/possession.types';
import {
  GOAL_CELEBRATION_MS,
  PENALTY_RESULT_SEQUENCE_HOLD_MS,
} from '@/features/possession/realtimePossession.helpers';
import { trackAnswerSubmitted } from '@/lib/analytics/game-events';

const QUESTION_PLAYING_MS = 10000; // 10 second playing phase
export const ROUND_RESULT_HOLD_MS = 2000; // hold result for 2s before transitioning to next question
const SPECIAL_RESULT_EXTRA_MS = 3000; // extra hold for special question reveals (countdown answers, correct order, clues answer)
const GOAL_CELEBRATION_EXTRA_MS = GOAL_CELEBRATION_MS; // keep promotion blocked until the goal celebration overlay finishes
const ANSWER_ACK_RETRY_MS = 900;
const ANSWER_ACK_MAX_RETRIES = 2;
const SPECIAL_QUESTION_KINDS = new Set(['countdown', 'putInOrder', 'clues']);
const EMPTY_QUESTIONS: Record<number, MatchQuestionState> = {};

interface UseRealtimeGameLogicOptions {
  /** Extra delay (ms) between hiding options and promoting the next question. Used for round transition overlay. */
  transitionDelayMs?: number;
  /** When true, the question reveal timer is blocked (options + timer won't start). */
  blockReveal?: boolean;
}

export function useRealtimeGameLogic(options: UseRealtimeGameLogicOptions = {}) {
  const { transitionDelayMs = 0, blockReveal = false } = options;
  const matchSlice = useRealtimeMatchStore(useShallow((state) => ({
    matchId: state.match?.matchId ?? null,
    currentQuestion: state.match?.currentQuestion ?? null,
    currentQuestionPhase: state.match?.currentQuestionPhase ?? 'reveal',
    countdownEndsAt: state.match?.countdownEndsAt ?? null,
    countdownReason: state.match?.countdownReason ?? null,
    answerAck: state.match?.answerAck ?? null,
    lastRoundResult: state.match?.lastRoundResult ?? null,
    opponentAnswered: state.match?.opponentAnswered ?? false,
    pendingQuestion: state.match?.pendingQuestion ?? null,
    opponentId: state.match?.opponent.id ?? null,
    questions: state.match?.questions ?? EMPTY_QUESTIONS,
    myTotalPoints: state.match?.myTotalPoints ?? 0,
    oppTotalPoints: state.match?.oppTotalPoints ?? 0,
    opponentRecentPoints: state.match?.opponentRecentPoints ?? 0,
    serverTimeOffsetMs: state.match?.serverTimeOffsetMs ?? null,
    mode: state.match?.mode ?? null,
    variant: state.match?.variant ?? null,
  })));
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
  const answerAckRetryCountRef = useRef(0);
  const answerPayloadRef = useRef<{ matchId: string; qIndex: number; selectedIndex: number; timeMs: number } | null>(null);
  const answerSubmitElapsedRef = useRef<number | null>(null);
  const trackedAckQIndexRef = useRef<number | null>(null);

  useEffect(() => {
    matchPausedRef.current = matchPaused;
  }, [matchPaused]);

  const currentQuestion = matchSlice.currentQuestion;
  const serverTimeOffsetMs = matchSlice.serverTimeOffsetMs;
  const getSyncedNowMs = useCallback(() => Date.now() + (serverTimeOffsetMs ?? 0), [serverTimeOffsetMs]);
  const isLastAttackQuestion = currentQuestion?.phaseKind === 'last_attack';
  const currentQuestionIndex = currentQuestion?.qIndex;
  const questionPhase = matchSlice.currentQuestionPhase;
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
  const countdownEndsAt = matchSlice.countdownEndsAt;
  const countdownReason = matchSlice.countdownReason;
  const countdownRemainingMs = useMemo(() => {
    if (!countdownEndsAt) return 0;
    return Math.max(0, countdownEndsAt - nowMs);
  }, [countdownEndsAt, nowMs]);
  const countdownSeconds = Math.ceil(countdownRemainingMs / 1000);
  const startCountdownActive =
    countdownRemainingMs > 0 && (countdownReason === 'resume' || (currentQuestion?.qIndex ?? 0) === 0);

  useEffect(() => {
    if (!countdownEndsAt) return;
    const tick = () => setNowMs(getSyncedNowMs());
    tick();
    if (countdownEndsAt <= getSyncedNowMs()) return;
    const intervalId = setInterval(() => {
      tick();
      if (getSyncedNowMs() >= countdownEndsAt) {
        clearInterval(intervalId);
      }
    }, 100);
    return () => clearInterval(intervalId);
  }, [countdownEndsAt, getSyncedNowMs]);

  useEffect(() => {
    const initialTimeRemaining = normalizedPlayableAtMs !== null && normalizedQuestionDeadlineAtMs !== null
      ? Math.max(0, Math.ceil((normalizedQuestionDeadlineAtMs - normalizedPlayableAtMs) / 1000))
      : QUESTION_PLAYING_MS / 1000;
    // Reset UI state synchronously when question changes — prevents one-frame flash
    // where new question mounts with stale showOptions=true from previous question.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setSelectedAnswer(null);
    setSelectedAnswerQIndex(undefined);
    answerAckRetryCountRef.current = 0;
    answerPayloadRef.current = null;
    answerSubmitElapsedRef.current = null;
    trackedAckQIndexRef.current = null;
    setShowOptions(false);
    setTimeRemaining(initialTimeRemaining);

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
  }, [currentQuestionIndex, normalizedPlayableAtMs, normalizedQuestionDeadlineAtMs]); // eslint-disable-line react-hooks/exhaustive-deps -- roundResultHoldDone read intentionally without dep

  // Phase transition effect: reveal → playing
  // showOptions is already reset synchronously in the question-change effect above,
  // so we only need the delayed reveal timer here.
  // blockReveal gates the timer so options + answer countdown don't start while
  // an intro overlay is still showing (e.g. first question "QUESTION 1" overlay).
  useEffect(() => {
    if (currentQuestionIndex === undefined || matchPausedRef.current || startCountdownActive || blockReveal) return;

    const revealDelayMs = normalizedPlayableAtMs !== null
      ? Math.max(0, normalizedPlayableAtMs - getSyncedNowMs())
      : QUESTION_REVEAL_MS;
    const revealTimer = setTimeout(() => {
      if (matchPausedRef.current) return;
      setShowOptions(true);
      setQuestionPhase('playing');
    }, revealDelayMs);

    return () => clearTimeout(revealTimer);
  }, [blockReveal, currentQuestionIndex, getSyncedNowMs, matchPaused, normalizedPlayableAtMs, setQuestionPhase, startCountdownActive]);

  // Timer countdown effect — purely client-driven from when options appear
  const optionsShownAtRef = useRef<number | null>(null);
  useEffect(() => {
    if (showOptions) {
      optionsShownAtRef.current = normalizedPlayableAtMs ?? getSyncedNowMs();
    } else {
      optionsShownAtRef.current = null;
    }
  }, [getSyncedNowMs, normalizedPlayableAtMs, showOptions]);

  useEffect(() => {
    if (!showOptions || !currentQuestion) return;
    if (matchPaused || startCountdownActive) return;

    if (normalizedQuestionDeadlineAtMs !== null) {
      const tick = () => {
        const now = getSyncedNowMs();
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

    const startedAt = optionsShownAtRef.current ?? getSyncedNowMs();

    const interval = setInterval(() => {
      const elapsedMs = getSyncedNowMs() - startedAt;
      const remainingMs = QUESTION_PLAYING_MS - elapsedMs;
      if (remainingMs > 0) {
        setTimeRemaining(Math.ceil(remainingMs / 1000));
      } else {
        setTimeRemaining(0);
      }
    }, 100);

    return () => clearInterval(interval);
  }, [currentQuestion, getSyncedNowMs, matchPaused, normalizedPlayableAtMs, normalizedQuestionDeadlineAtMs, showOptions, startCountdownActive]);

  const answerAck = matchSlice.answerAck && matchSlice.currentQuestion?.qIndex === matchSlice.answerAck.qIndex
    ? matchSlice.answerAck
    : null;

  const roundResult = matchSlice.lastRoundResult && matchSlice.currentQuestion?.qIndex === matchSlice.lastRoundResult.qIndex
    ? matchSlice.lastRoundResult
    : null;
  const isSpecialRound = roundResult?.questionKind
    ? SPECIAL_QUESTION_KINDS.has(roundResult.questionKind)
    : false;
  const currentPhaseKind = currentQuestion?.phaseKind ?? 'normal';
  const roundPhaseKind = roundResult?.phaseKind ?? currentPhaseKind;
  const isPenaltyRound = roundPhaseKind === 'penalty';
  const baseRoundResultHoldMs = ROUND_RESULT_HOLD_MS + (isSpecialRound ? SPECIAL_RESULT_EXTRA_MS : 0);
  const roundResultHoldMs = isPenaltyRound
    ? Math.max(baseRoundResultHoldMs, PENALTY_RESULT_SEQUENCE_HOLD_MS)
    : baseRoundResultHoldMs;
  const opponentAnswered = matchSlice.opponentAnswered;
  const visibleOpponentAnswered = opponentAnswered && questionPhase === 'playing' && !startCountdownActive;

  const roundResolved = Boolean(roundResult);

  const isGoalRound = Boolean(roundResult?.deltas?.goalScoredBySeat);
  const isLastAttackRound = roundPhaseKind === 'last_attack';
  const goalExtra = isGoalRound ? GOAL_CELEBRATION_EXTRA_MS : 0;
  const effectiveDelay =
    currentPhaseKind === 'normal'
      ? transitionDelayMs + goalExtra
      : currentPhaseKind === 'last_attack' && isGoalRound
        ? goalExtra
        : 0;

  // Hold timer — hide options after result display, then either signal transition
  // (normal phases with delay) or let the gate effect promote directly (non-normal).
  // Also set roundResultHoldDone for goal rounds so normal promotion stays
  // blocked while the shot and goal celebration sequence runs.
  useEffect(() => {
    if (!roundResolved || !showOptions || matchPaused || startCountdownActive) return;

    const holdTimer = setTimeout(() => {
      setShowOptions(false);
      if (effectiveDelay > 0 || isGoalRound || isLastAttackRound || isPenaltyRound) {
        setRoundResultHoldDone(true);
      }
    }, roundResultHoldMs);

    return () => clearTimeout(holdTimer);
  }, [roundResolved, showOptions, matchPaused, currentQuestionIndex, roundResultHoldMs, startCountdownActive, effectiveDelay, isGoalRound, isLastAttackRound, isPenaltyRound]);

  // Transition delay timer — when the overlay is showing, count down the delay.
  // Sets transitionElapsed=true which opens the gate for promotion.
  useEffect(() => {
    if (!roundResultHoldDone) return;
    const timer = setTimeout(() => setTransitionElapsed(true), effectiveDelay);
    return () => clearTimeout(timer);
  }, [roundResultHoldDone, effectiveDelay]);

  // Ready-ack: once the client finishes its post-round overlay sequence, tell
  // the server it's safe to send the next question. Server uses this to avoid
  // scheduling playableAt before our goal-celebration/transition is done.
  // Guarded by ref so we only emit once per resolved qIndex.
  const lastReadyAckQIndexRef = useRef<number | null>(null);
  const resolvedQIndexForAck = roundResult?.qIndex ?? null;
  const matchIdForAck = matchSlice.matchId;
  useEffect(() => {
    if (!transitionElapsed) return;
    if (matchIdForAck === null || resolvedQIndexForAck === null) return;
    if (lastReadyAckQIndexRef.current === resolvedQIndexForAck) return;
    lastReadyAckQIndexRef.current = resolvedQIndexForAck;
    try {
      getSocket().emit('match:ready_for_next_question', {
        matchId: matchIdForAck,
        qIndex: resolvedQIndexForAck,
      });
    } catch (error) {
      logger.warn('Failed to emit match:ready_for_next_question', { error });
    }
  }, [transitionElapsed, matchIdForAck, resolvedQIndexForAck]);

  // Unified promote gate — advances to the next question when conditions are met.
  // Handles: (a) non-transition promotes (effectiveDelay=0), (b) post-transition promotes,
  // and (c) late-arriving questions in both cases. The gate stays open (transitionElapsed=true)
  // until the question actually changes, so stragglers are caught immediately.
  const hasPendingQuestion = Boolean(matchSlice.pendingQuestion);
  useEffect(() => {
    if (!hasPendingQuestion || showOptions || matchPaused || startCountdownActive) return;
    // During transition gap: wait for transition delay to elapse
    if (roundResultHoldDone && !transitionElapsed) return;
    promotePendingQuestion();
  }, [hasPendingQuestion, showOptions, roundResultHoldDone, transitionElapsed, matchPaused, promotePendingQuestion, startCountdownActive]);

  const showResult = Boolean(answerAck || roundResult);
  const isAnswered = selectedAnswer !== null || showResult;
  const showOptionsVisible = showOptions && !startCountdownActive;

  const opponentId = matchSlice.opponentId;
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
    if (!matchSlice.matchId || !currentQuestion) return undefined;
    // Server ships correctIndex on the question payload so the client can
    // show instant tap feedback (Trivia Crack pattern). Server validates
    // selectedIndex independently when scoring — leak is intentional UX.
    const stored = matchSlice.questions[currentQuestion.qIndex]?.correctIndex;
    const currentPayloadCorrectIndex = currentQuestion.correctIndex;
    const revealCorrectIndex = roundResult?.reveal?.kind === 'multipleChoice'
      ? roundResult.reveal.correctIndex
      : undefined;
    return stored ?? currentPayloadCorrectIndex ?? answerAck?.correctIndex ?? revealCorrectIndex;
  }, [answerAck?.correctIndex, roundResult, matchSlice.matchId, matchSlice.questions, currentQuestion]);

  const playerScore = matchSlice.myTotalPoints;
  const holdEarlyOpponentScore = questionPhase !== 'playing' && (opponentAnswered || roundResolved);
  const earlyOpponentPoints = Math.max(
    0,
    roundResult
      ? opponentRoundResult?.pointsEarned ?? 0
      : matchSlice.opponentRecentPoints
  );
  const opponentScore = holdEarlyOpponentScore
    ? Math.max(0, matchSlice.oppTotalPoints - earlyOpponentPoints)
    : matchSlice.oppTotalPoints;

  const submitAnswer = (index: number) => {
    if (!matchSlice.matchId || !currentQuestion) return;
    if (isAnswered) return;
    if (matchPaused) return;
    if (startCountdownActive) return;
    if (questionPhase !== 'playing') return; // Prevent answers during reveal
    if (timeRemaining <= 0) return;

    setSelectedAnswer(index);
    setSelectedAnswerQIndex(currentQuestion.qIndex);

    const startedAt = normalizedPlayableAtMs ?? optionsShownAtRef.current ?? getSyncedNowMs();
    const now = normalizedQuestionDeadlineAtMs != null
      ? Math.min(getSyncedNowMs(), normalizedQuestionDeadlineAtMs)
      : getSyncedNowMs();
    const maxWindowMs = normalizedQuestionDeadlineAtMs != null
      ? Math.max(0, normalizedQuestionDeadlineAtMs - startedAt)
      : QUESTION_PLAYING_MS;
    const elapsed = Math.min(maxWindowMs, Math.max(0, now - startedAt));

    const payload = {
      matchId: matchSlice.matchId,
      qIndex: currentQuestion.qIndex,
      selectedIndex: index,
      timeMs: Math.round(elapsed),
    };
    answerPayloadRef.current = payload;
    answerSubmitElapsedRef.current = Math.round(elapsed);
    getSocket().emit('match:answer', payload);
    logger.info('Socket emit match:answer', payload);
  };

  useEffect(() => {
    if (selectedAnswer === null || selectedAnswerQIndex === undefined) return;
    if (!matchSlice.matchId || !currentQuestion) return;
    if (selectedAnswerQIndex !== currentQuestion.qIndex) return;
    if (answerAck || roundResult) return;
    if (matchPaused || startCountdownActive) return;

    const retryTimer = setInterval(() => {
      if (answerAckRetryCountRef.current >= ANSWER_ACK_MAX_RETRIES) {
        clearInterval(retryTimer);
        return;
      }

      const latestMatch = useRealtimeMatchStore.getState().match;
      if (!latestMatch || latestMatch.matchId !== matchSlice.matchId) {
        clearInterval(retryTimer);
        return;
      }
      if (latestMatch.currentQuestion?.qIndex !== selectedAnswerQIndex) {
        clearInterval(retryTimer);
        return;
      }
      if (latestMatch.answerAck?.qIndex === selectedAnswerQIndex || latestMatch.lastRoundResult?.qIndex === selectedAnswerQIndex) {
        clearInterval(retryTimer);
        return;
      }

      const payload = answerPayloadRef.current;
      if (!payload) {
        clearInterval(retryTimer);
        return;
      }

      answerAckRetryCountRef.current += 1;
      getSocket().emit('match:answer', payload);
      logger.info('Socket retry match:answer pending ack', {
        ...payload,
        retry: answerAckRetryCountRef.current,
      });
    }, ANSWER_ACK_RETRY_MS);

    return () => clearInterval(retryTimer);
  }, [
    answerAck,
    currentQuestion,
    matchSlice.matchId,
    matchPaused,
    roundResult,
    selectedAnswer,
    selectedAnswerQIndex,
    startCountdownActive,
  ]);

  useEffect(() => {
    if (!answerAck || !currentQuestion) return;
    if (answerAck.qIndex !== currentQuestion.qIndex) return;
    if (trackedAckQIndexRef.current === answerAck.qIndex) return;
    if (answerSubmitElapsedRef.current === null) return;
    trackedAckQIndexRef.current = answerAck.qIndex;
    trackAnswerSubmitted({
      questionId: currentQuestion.question.id,
      isCorrect: answerAck.isCorrect,
      timeMs: answerSubmitElapsedRef.current,
      questionIndex: currentQuestion.qIndex,
      difficulty: currentQuestion.question.difficulty,
      categoryName: currentQuestion.question.categoryName,
      matchId: matchSlice.matchId ?? undefined,
      questionKind: currentQuestion.question.kind,
      phaseKind: currentQuestion.phaseKind ?? answerAck.phaseKind,
      mode: matchSlice.mode ?? undefined,
      variant: matchSlice.variant ?? undefined,
      pointsEarned: answerAck.pointsEarned,
      selectedIndex: answerAck.selectedIndex,
    });
  }, [answerAck, currentQuestion, matchSlice.matchId, matchSlice.mode, matchSlice.variant]);

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
      opponentAnswered: visibleOpponentAnswered,
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
      countdownReason,
      startCountdownActive,
    },
    actions: {
      submitAnswer,
    },
  };
}
