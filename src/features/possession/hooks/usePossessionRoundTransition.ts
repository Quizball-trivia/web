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

type TransitionCapture = {
  captureKey: string;
  snapshot: TransitionSnapshot;
};

const EMPTY_TRANSITION_SNAPSHOT: TransitionSnapshot = {
  title: '',
  categoryName: '',
  subtitle: '',
  upcomingQIndex: null,
};

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
  half?: 1 | 2;
}

export function usePossessionFirstQuestionIntro({
  countdownEndsAt,
  currentQuestionIndex,
  half,
}: UsePossessionFirstQuestionIntroParams): boolean {
  const firstIntroEligible = half !== 2;
  const hasAuthoritativeFirstQuestion = currentQuestionIndex === 0;
  const [firstQuestionIntro, setFirstQuestionIntro] = useState(() => firstIntroEligible);
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
    if (!firstIntroEligible) {
      firstIntroExpiredRef.current = true;
      queueMicrotask(() => {
        setFirstQuestionIntro(false);
      });
      return;
    }

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
  }, [countdownEndsAt, currentQuestionIndex, firstIntroEligible, nowMs]);

  return firstIntroEligible && hasAuthoritativeFirstQuestion && firstQuestionIntro;
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
  /**
   * Authoritative current question index from the server payload. At the second-
   * half intro it already points at the upcoming question (e.g. 6 → "Question 7")
   * even while the gated `localQuestion`/`pendingQuestion` still lag, so it is the
   * reliable source for the second-half splash number.
   */
  currentQuestionIndex: number | null;
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
  currentQuestionIndex,
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
  const [capturedTransition, setCapturedTransition] = useState<{
    captureKey: string | null;
    snapshot: TransitionSnapshot;
  }>({
    captureKey: null,
    snapshot: EMPTY_TRANSITION_SNAPSHOT,
  });

  const prevPenaltyPhaseRef = useRef(phase === 'PENALTY_SHOOTOUT');
  const pendingPenaltyCountdownRef = useRef(false);
  // Capture key of the currently shown transition snapshot.
  // Keyed (rather than boolean) so a back-to-back transition for a NEW round,
  // or a pendingQuestion arriving mid-transition, re-captures the snapshot.
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

  const firstQuestionIntroVisible = firstQuestionIntro && currentQuestionIndex === 0 && (half ?? 1) === 1;
  const hasPendingLastAttackQuestion = pendingQuestion?.phaseKind === 'last_attack';
  const isHalfBoundaryRound = roundResult?.phaseKind === 'normal' && roundResult.phaseRound === 6;
  const hasConcreteNextQuestion = Boolean(pendingQuestion);
  const allowBoundaryTransition = !isHalfBoundaryRound || hasConcreteNextQuestion;
  const isRoundTransitionPhase = phase === 'NORMAL_PLAY'
    || (phase === 'LAST_ATTACK' && hasPendingLastAttackQuestion);
  const secondHalfUpcomingQIndex = secondHalfQuestionIntro
    ? (typeof currentQuestionIndex === 'number'
      ? currentQuestionIndex
      : typeof pendingQuestion?.qIndex === 'number'
        ? pendingQuestion.qIndex
        : null)
    : null;
  const hasSecondHalfQuestionIndex = !secondHalfQuestionIntro
    || typeof secondHalfUpcomingQIndex === 'number';

  const showRoundTransition = isRoundTransitionPhase
    && (roundResultHoldDone || firstQuestionIntroVisible || secondHalfQuestionIntro)
    && allowBoundaryTransition
    && hasSecondHalfQuestionIndex
    && !isPenaltyQuestion
    && !isShotQuestion
    && !isLastAttackQuestion
    && !isHalftime
    && !goalCelebration;

  // Show a "Penalty N" intro between penalty rounds, mirroring the open-play
  // round transition. The next penalty question may arrive as a buffered
  // `pendingQuestion` OR be promoted straight to `localQuestion` (no buffering),
  // so accept either — otherwise the overlay silently never fires and the
  // shootout "snaps" between questions with no intro.
  const hasNextPenaltyQuestion = pendingQuestion?.phaseKind === 'penalty'
    || localQuestion?.phaseKind === 'penalty';
  const showPenaltyTransition = !firstQuestionIntroVisible
    && !penaltyCountdownActive
    && !goalCelebration
    && phase !== 'COMPLETED'
    && roundResultHoldDone
    && roundResult?.phaseKind === 'penalty'
    && hasNextPenaltyQuestion;

  const roundTransitionCapture: TransitionCapture | null = showRoundTransition
    ? (() => {
      const upcomingQIndex = firstQuestionIntroVisible
        ? (localQuestion?.qIndex ?? 0)
        : secondHalfQuestionIntro
          // The second half opens with no roundResult and a cleared/still-
          // lagging localQuestion. Never fall back to localQuestion here: it can
          // still be the last first-half question for one render. The transition
          // is gated until an authoritative server qIndex is known.
          ? secondHalfUpcomingQIndex
          : pendingQuestion?.qIndex
            ?? (typeof roundResult?.qIndex === 'number' ? roundResult.qIndex + 1 : localQuestion?.qIndex ?? null);
      if (typeof upcomingQIndex !== 'number') return null;

      const isExtra = pendingQuestion?.phaseKind === 'last_attack';
      const questionNumber = upcomingQIndex + 1;
      const title = firstQuestionIntroVisible
        ? t('possession.questionN', { n: 1 })
        : isExtra
          ? t('possession.extraQuestion')
          : t('possession.questionN', { n: questionNumber });
      const categoryName = firstQuestionIntroVisible
        ? (localQuestion?.question.categoryName ?? '')
        : secondHalfQuestionIntro
          ? (pendingQuestion?.qIndex === upcomingQIndex
            ? (pendingQuestion.question.categoryName ?? '')
            : localQuestion?.qIndex === upcomingQIndex
              ? (localQuestion.question.categoryName ?? '')
              : '')
          : (pendingQuestion?.question.categoryName
            ?? localQuestion?.question.categoryName
            ?? '');

      return {
        captureKey: `round:${upcomingQIndex}:${pendingQuestion?.qIndex ?? 'pending-missing'}`,
        snapshot: {
          title,
          categoryName,
          subtitle: (half ?? 1) === 1 ? t('possession.firstHalf') : t('possession.secondHalf'),
          upcomingQIndex,
        },
      };
    })()
    : null;
  const renderedShowRoundTransition = showRoundTransition && roundTransitionCapture !== null;

  const penaltyTransitionCapture: TransitionCapture | null = showPenaltyTransition
    ? (() => {
      const penaltyRound = pendingQuestion?.phaseRound
        ?? (localQuestion?.phaseKind === 'penalty' ? localQuestion.phaseRound : undefined)
        ?? (typeof roundResult?.phaseRound === 'number' ? roundResult.phaseRound + 1 : undefined)
        ?? 1;
      return {
        captureKey: `penalty:${penaltyRound}`,
        snapshot: {
          // No `categoryName`: in Georgian both `penaltyShootout` and `shootout`
          // translate to the same "პენალტების სერია", so showing it as the top
          // line AND the subtitle rendered a duplicate. The title ("პენალტი N")
          // plus a single subtitle is all we need.
          title: t('possession.penaltyN', { n: penaltyRound }),
          categoryName: '',
          subtitle: penaltySuddenDeath ? t('possession.suddenDeath') : t('possession.shootout'),
          upcomingQIndex: pendingQuestion?.qIndex
            ?? (localQuestion?.phaseKind === 'penalty' ? localQuestion.qIndex : null),
        },
      };
    })()
    : null;
  const renderedShowPenaltyTransition = showPenaltyTransition && penaltyTransitionCapture !== null;
  const visibleTransitionSnapshot = roundTransitionCapture
    ? (capturedTransition.captureKey === roundTransitionCapture.captureKey
      ? capturedTransition.snapshot
      : roundTransitionCapture.snapshot)
    : penaltyTransitionCapture
      ? (capturedTransition.captureKey === penaltyTransitionCapture.captureKey
        ? capturedTransition.snapshot
        : penaltyTransitionCapture.snapshot)
      : capturedTransition.snapshot;

  useLayoutEffect(() => {
    if (roundTransitionCapture) {
      // Re-capture keyed on the announced question: back-to-back transitions
      // (or a pendingQuestion arriving late with a different category) must
      // refresh the frozen snapshot instead of replaying the previous round's.
      if (capturedTransition.captureKey === roundTransitionCapture.captureKey) return;
      // eslint-disable-next-line react-hooks/set-state-in-effect -- stores the snapshot that was already rendered synchronously for this transition.
      setCapturedTransition(roundTransitionCapture);
      return;
    }

    if (penaltyTransitionCapture) {
      if (capturedTransition.captureKey === penaltyTransitionCapture.captureKey) return;
      setCapturedTransition(penaltyTransitionCapture);
      return;
    }

    if (!renderedShowRoundTransition && !renderedShowPenaltyTransition && capturedTransition.captureKey !== null) {
      setCapturedTransition((current) => ({
        ...current,
        captureKey: null,
      }));
    }
  }, [
    capturedTransition.captureKey,
    penaltyTransitionCapture,
    renderedShowPenaltyTransition,
    renderedShowRoundTransition,
    roundTransitionCapture,
  ]);

  return {
    isHalftime,
    penaltyCountdownActive,
    penaltyCountdownDisplay,
    showRoundTransition: renderedShowRoundTransition,
    showPenaltyTransition: renderedShowPenaltyTransition,
    transitionSnapshot: visibleTransitionSnapshot,
  };
}
