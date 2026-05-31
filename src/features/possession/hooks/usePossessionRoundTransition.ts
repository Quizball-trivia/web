'use client';

import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import type {
  MatchRoundResultPayload,
  MatchStatePayload,
  ResolvedMatchQuestionPayload,
} from '@/lib/realtime/socket.types';
import { useLocale } from '@/contexts/LocaleContext';
import {
  FIRST_QUESTION_INTRO_MS,
  GOAL_VISUAL_SEQUENCE_MS,
  HALFTIME_RESULTS_DELAY_MS,
  PENALTY_COUNTDOWN_MS,
  TRANSITION_DELAY_MS,
  type GoalCelebrationState,
  type TransitionSnapshot,
} from '../realtimePossession.helpers';

export interface PossessionOverlayModel {
  isHalftime: boolean;
  penaltyCountdownActive: boolean;
  penaltyCountdownDisplay: number;
  showRoundTransition: boolean;
  showPenaltyTransition: boolean;
  transitionSnapshot: TransitionSnapshot;
}

interface UsePossessionFirstQuestionIntroParams {
  countdownEndsAt: number | null | undefined;
  currentQuestionIndex: number | null;
}

export function usePossessionFirstQuestionIntro({
  countdownEndsAt,
  currentQuestionIndex,
}: UsePossessionFirstQuestionIntroParams): boolean {
  const [firstQuestionIntro, setFirstQuestionIntro] = useState(true);
  const [nowMs, setNowMs] = useState(() => Date.now());
  const firstIntroExpiredRef = useRef(false);

  useEffect(() => {
    if (!countdownEndsAt) return;
    if (countdownEndsAt <= Date.now()) return;

    const tick = () => setNowMs(Date.now());
    tick();

    const interval = setInterval(() => {
      if (Date.now() >= countdownEndsAt) {
        tick();
        clearInterval(interval);
        return;
      }
      tick();
    }, 100);

    return () => clearInterval(interval);
  }, [countdownEndsAt]);

  useEffect(() => {
    if (firstIntroExpiredRef.current) return;

    const startCountdownActive = Boolean(countdownEndsAt && countdownEndsAt > nowMs && currentQuestionIndex === 0);

    if (currentQuestionIndex !== null && currentQuestionIndex !== 0) {
      firstIntroExpiredRef.current = true;
      queueMicrotask(() => {
        setFirstQuestionIntro(false);
      });
      return;
    }

    if (currentQuestionIndex !== 0 || startCountdownActive) return;

    const timer = setTimeout(() => {
      firstIntroExpiredRef.current = true;
      setFirstQuestionIntro(false);
    }, FIRST_QUESTION_INTRO_MS);

    return () => clearTimeout(timer);
  }, [countdownEndsAt, currentQuestionIndex, nowMs]);

  return firstQuestionIntro;
}

interface UsePossessionSecondHalfQuestionIntroParams {
  phase: MatchStatePayload['phase'] | undefined;
  half: 1 | 2 | undefined;
  normalQuestionsAnsweredInHalf: number | undefined;
  currentQuestionIndex: number | null;
  currentQuestionPhase: 'reveal' | 'playing' | undefined;
}

export function usePossessionSecondHalfQuestionIntro({
  phase,
  half,
  normalQuestionsAnsweredInHalf,
  currentQuestionIndex,
  currentQuestionPhase,
}: UsePossessionSecondHalfQuestionIntroParams): boolean {
  const [expiredKey, setExpiredKey] = useState<string | null>(null);
  const introKey = phase === 'NORMAL_PLAY'
    && half === 2
    && normalQuestionsAnsweredInHalf === 0
    && currentQuestionIndex !== null
    && currentQuestionPhase !== 'playing'
    ? `second-half:${currentQuestionIndex}`
    : null;
  const secondHalfIntro = introKey !== null && expiredKey !== introKey;

  useEffect(() => {
    if (!introKey || expiredKey === introKey) return;
    const timer = setTimeout(() => {
      setExpiredKey(introKey);
    }, TRANSITION_DELAY_MS);
    return () => clearTimeout(timer);
  }, [expiredKey, introKey]);

  return secondHalfIntro;
}

interface UsePossessionRoundTransitionParams {
  phase: MatchStatePayload['phase'] | undefined;
  half: 1 | 2 | undefined;
  penaltySuddenDeath: boolean | undefined;
  firstQuestionIntro: boolean;
  secondHalfQuestionIntro: boolean;
  localQuestion: ResolvedMatchQuestionPayload | null;
  pendingQuestion: ResolvedMatchQuestionPayload | null;
  roundResult: MatchRoundResultPayload | null;
  roundResultHoldDone: boolean;
  isPenaltyQuestion: boolean;
  isShotQuestion: boolean;
  isLastAttackQuestion: boolean;
  goalCelebration: GoalCelebrationState | null;
}

export function usePossessionRoundTransition({
  phase,
  half,
  penaltySuddenDeath,
  firstQuestionIntro,
  secondHalfQuestionIntro,
  localQuestion,
  pendingQuestion,
  roundResult,
  roundResultHoldDone,
  isPenaltyQuestion,
  isShotQuestion,
  isLastAttackQuestion,
  goalCelebration,
}: UsePossessionRoundTransitionParams): PossessionOverlayModel {
  const { t } = useLocale();
  const [isHalftime, setIsHalftime] = useState(false);
  const [penaltyCountdownEndsAt, setPenaltyCountdownEndsAt] = useState<number | null>(null);
  const [penaltyCountdownNow, setPenaltyCountdownNow] = useState(() => Date.now());
  const [transitionSnapshot, setTransitionSnapshot] = useState<TransitionSnapshot>({
    title: t('possession.questionN', { n: 1 }),
    categoryName: '',
    subtitle: t('possession.firstHalf'),
  });

  const prevPenaltyPhaseRef = useRef(phase === 'PENALTY_SHOOTOUT');
  const pendingPenaltyCountdownRef = useRef(false);
  const transitionVisibleRef = useRef(false);
  const hasBoundaryGoalRound = Boolean(
    (roundResult?.phaseKind === 'normal' || roundResult?.phaseKind === 'last_attack') &&
    roundResult.deltas?.goalScoredBySeat
  );
  const hasFieldQuestionBeforePenalty = localQuestion?.phaseKind === 'normal'
    || localQuestion?.phaseKind === 'last_attack'
    || localQuestion?.phaseKind === 'shot';
  const canStartPenaltyCountdown = phase === 'PENALTY_SHOOTOUT'
    && !isPenaltyQuestion
    && (
      !hasFieldQuestionBeforePenalty
      || (Boolean(roundResult) && roundResultHoldDone && !goalCelebration)
    );

  useEffect(() => {
    if (phase === 'HALFTIME') {
      const delayMs = hasBoundaryGoalRound
        ? Math.max(HALFTIME_RESULTS_DELAY_MS, GOAL_VISUAL_SEQUENCE_MS)
        : HALFTIME_RESULTS_DELAY_MS;
      const timer = setTimeout(() => setIsHalftime(true), delayMs);
      return () => clearTimeout(timer);
    }
    queueMicrotask(() => {
      setIsHalftime(false);
    });
  }, [hasBoundaryGoalRound, phase]);

  useEffect(() => {
    const isPenaltyPhaseServer = phase === 'PENALTY_SHOOTOUT';
    if (!isPenaltyPhaseServer) {
      prevPenaltyPhaseRef.current = false;
      pendingPenaltyCountdownRef.current = false;
      // Drop any running countdown — derived penaltyCountdownActive
      // would otherwise keep gating the UI after the server moved on.
      queueMicrotask(() => {
        setPenaltyCountdownEndsAt(null);
      });
      return;
    }

    if (!prevPenaltyPhaseRef.current) {
      pendingPenaltyCountdownRef.current = true;
      prevPenaltyPhaseRef.current = true;
    }

    if (!pendingPenaltyCountdownRef.current || !canStartPenaltyCountdown) {
      return;
    }

    pendingPenaltyCountdownRef.current = false;
    queueMicrotask(() => {
      setPenaltyCountdownEndsAt((current) => {
        if (current && current > Date.now()) return current;
        return Date.now() + PENALTY_COUNTDOWN_MS;
      });
    });
  }, [canStartPenaltyCountdown, phase]);

  useEffect(() => {
    if (!penaltyCountdownEndsAt) return;

    const tick = () => setPenaltyCountdownNow(Date.now());
    tick();

    if (penaltyCountdownEndsAt <= Date.now()) {
      queueMicrotask(() => {
        setPenaltyCountdownEndsAt(null);
      });
      return;
    }

    const interval = setInterval(() => {
      if (Date.now() >= penaltyCountdownEndsAt) {
        setPenaltyCountdownEndsAt(null);
        clearInterval(interval);
        return;
      }
      tick();
    }, 100);

    return () => clearInterval(interval);
  }, [penaltyCountdownEndsAt]);

  const penaltyCountdownRemainingMs = penaltyCountdownEndsAt
    ? Math.max(0, penaltyCountdownEndsAt - penaltyCountdownNow)
    : 0;
  const penaltyCountdownActive = penaltyCountdownRemainingMs > 0;
  const penaltyCountdownDisplay = Math.max(1, Math.ceil(penaltyCountdownRemainingMs / 1000));

  const hasPendingLastAttackQuestion = pendingQuestion?.phaseKind === 'last_attack';
  const isHalfBoundaryRound = roundResult?.phaseKind === 'normal' && roundResult.phaseRound === 6;
  const hasConcreteNextQuestion = Boolean(pendingQuestion);
  const allowBoundaryTransition = !isHalfBoundaryRound || hasConcreteNextQuestion;
  const isRoundTransitionPhase = phase === 'NORMAL_PLAY'
    || (phase === 'LAST_ATTACK' && hasPendingLastAttackQuestion);

  const showRoundTransition = isRoundTransitionPhase
    && (roundResultHoldDone || firstQuestionIntro || secondHalfQuestionIntro)
    && allowBoundaryTransition
    && !isPenaltyQuestion
    && !isShotQuestion
    && !isLastAttackQuestion
    && !isHalftime
    && !goalCelebration;

  const showPenaltyTransition = !firstQuestionIntro
    && !penaltyCountdownActive
    && !goalCelebration
    && phase !== 'COMPLETED'
    && roundResultHoldDone
    && roundResult?.phaseKind === 'penalty'
    && pendingQuestion?.phaseKind === 'penalty';

  useLayoutEffect(() => {
    if (showRoundTransition && !transitionVisibleRef.current) {
      transitionVisibleRef.current = true;
      const isExtra = pendingQuestion?.phaseKind === 'last_attack';
      const transitionQIndex = pendingQuestion?.qIndex ?? localQuestion?.qIndex;
      const questionNumber = typeof transitionQIndex === 'number'
        ? transitionQIndex + 1
        : pendingQuestion?.phaseRound
          ?? (typeof localQuestion?.phaseRound === 'number' ? localQuestion.phaseRound + 1 : 1);
      const title = firstQuestionIntro
        ? t('possession.questionN', { n: 1 })
        : isExtra
          ? t('possession.extraQuestion')
          : t('possession.questionN', { n: questionNumber });
      const categoryName = firstQuestionIntro
        ? (localQuestion?.question.categoryName ?? '')
        : (pendingQuestion?.question.categoryName
          ?? localQuestion?.question.categoryName
          ?? '');

      // eslint-disable-next-line react-hooks/set-state-in-effect -- layout effect commits the new label before paint, avoiding a one-frame stale "Question 1" flash.
      setTransitionSnapshot({
        title,
        categoryName,
        subtitle: (half ?? 1) === 1 ? t('possession.firstHalf') : t('possession.secondHalf'),
      });
      return;
    }

    if (showPenaltyTransition && !transitionVisibleRef.current) {
      transitionVisibleRef.current = true;
      const penaltyRound = pendingQuestion?.phaseRound
        ?? (typeof roundResult?.phaseRound === 'number' ? roundResult.phaseRound + 1 : undefined)
        ?? 1;
      setTransitionSnapshot({
        title: t('possession.penaltyN', { n: penaltyRound }),
        categoryName: t('possession.penaltyShootout'),
        subtitle: penaltySuddenDeath ? t('possession.suddenDeath') : t('possession.shootout'),
      });
      return;
    }

    if (!showRoundTransition && !showPenaltyTransition && transitionVisibleRef.current) {
      transitionVisibleRef.current = false;
    }
  }, [
    firstQuestionIntro,
    half,
    localQuestion?.phaseRound,
    localQuestion?.qIndex,
    localQuestion?.question.categoryName,
    pendingQuestion?.phaseKind,
    pendingQuestion?.phaseRound,
    pendingQuestion?.qIndex,
    pendingQuestion?.question.categoryName,
    penaltySuddenDeath,
    roundResult?.phaseRound,
    secondHalfQuestionIntro,
    showPenaltyTransition,
    showRoundTransition,
    t,
  ]);

  return {
    isHalftime,
    penaltyCountdownActive,
    penaltyCountdownDisplay,
    showRoundTransition,
    showPenaltyTransition,
    transitionSnapshot,
  };
}
