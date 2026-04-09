'use client';

import { useEffect, useRef, useState } from 'react';
import type {
  MatchRoundResultPayload,
  MatchStatePayload,
  ResolvedMatchQuestionPayload,
} from '@/lib/realtime/socket.types';
import {
  FIRST_QUESTION_INTRO_MS,
  HALFTIME_RESULTS_DELAY_MS,
  PENALTY_COUNTDOWN_MS,
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
      setFirstQuestionIntro(false);
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

interface UsePossessionRoundTransitionParams {
  phase: MatchStatePayload['phase'] | undefined;
  half: 1 | 2 | undefined;
  penaltySuddenDeath: boolean | undefined;
  firstQuestionIntro: boolean;
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
  localQuestion,
  pendingQuestion,
  roundResult,
  roundResultHoldDone,
  isPenaltyQuestion,
  isShotQuestion,
  isLastAttackQuestion,
  goalCelebration,
}: UsePossessionRoundTransitionParams): PossessionOverlayModel {
  const [isHalftime, setIsHalftime] = useState(false);
  const [penaltyCountdownEndsAt, setPenaltyCountdownEndsAt] = useState<number | null>(null);
  const [penaltyCountdownNow, setPenaltyCountdownNow] = useState(() => Date.now());
  const [transitionSnapshot, setTransitionSnapshot] = useState<TransitionSnapshot>({
    title: 'Question 1',
    categoryName: 'Football',
    subtitle: '1st Half',
  });

  const prevPenaltyPhaseRef = useRef(phase === 'PENALTY_SHOOTOUT');
  const transitionVisibleRef = useRef(false);

  useEffect(() => {
    if (phase === 'HALFTIME') {
      const timer = setTimeout(() => setIsHalftime(true), HALFTIME_RESULTS_DELAY_MS);
      return () => clearTimeout(timer);
    }
    setIsHalftime(false);
  }, [phase]);

  useEffect(() => {
    const isPenaltyPhaseServer = phase === 'PENALTY_SHOOTOUT';
    if (isPenaltyPhaseServer && !prevPenaltyPhaseRef.current) {
      setPenaltyCountdownEndsAt(Date.now() + PENALTY_COUNTDOWN_MS);
    }
    prevPenaltyPhaseRef.current = isPenaltyPhaseServer;
  }, [phase]);

  useEffect(() => {
    if (!penaltyCountdownEndsAt) return;

    const tick = () => setPenaltyCountdownNow(Date.now());
    tick();

    if (penaltyCountdownEndsAt <= Date.now()) {
      setPenaltyCountdownEndsAt(null);
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

  const isHalfBoundaryRound = roundResult?.phaseKind === 'normal' && roundResult.phaseRound === 6;
  const hasConcreteNextQuestion = Boolean(pendingQuestion);
  const allowBoundaryTransition = !isHalfBoundaryRound || hasConcreteNextQuestion;

  const showRoundTransition = phase === 'NORMAL_PLAY'
    && (roundResultHoldDone || firstQuestionIntro)
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

  useEffect(() => {
    if (showRoundTransition && !transitionVisibleRef.current) {
      transitionVisibleRef.current = true;
      const isExtra = pendingQuestion?.phaseKind === 'last_attack';
      const title = firstQuestionIntro
        ? 'Question 1'
        : isExtra
          ? 'Extra Question'
          : `Question ${pendingQuestion?.phaseRound
            ?? (typeof localQuestion?.phaseRound === 'number' ? localQuestion.phaseRound + 1 : 1)}`;
      const categoryName = firstQuestionIntro
        ? (localQuestion?.question.categoryName ?? 'Football')
        : (pendingQuestion?.question.categoryName
          ?? localQuestion?.question.categoryName
          ?? 'Football');

      setTransitionSnapshot({
        title,
        categoryName,
        subtitle: (half ?? 1) === 1 ? '1st Half' : '2nd Half',
      });
      return;
    }

    if (showPenaltyTransition && !transitionVisibleRef.current) {
      transitionVisibleRef.current = true;
      const penaltyRound = pendingQuestion?.phaseRound
        ?? (typeof roundResult?.phaseRound === 'number' ? roundResult.phaseRound + 1 : undefined)
        ?? 1;
      setTransitionSnapshot({
        title: `Penalty ${penaltyRound}`,
        categoryName: 'Penalty Shootout',
        subtitle: penaltySuddenDeath ? 'Sudden Death' : 'Shootout',
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
    localQuestion?.question.categoryName,
    pendingQuestion?.phaseKind,
    pendingQuestion?.phaseRound,
    pendingQuestion?.question.categoryName,
    penaltySuddenDeath,
    roundResult?.phaseRound,
    showPenaltyTransition,
    showRoundTransition,
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
