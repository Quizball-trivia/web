'use client';

import { useEffect, useRef, useState } from 'react';
import type { MatchRoundResultPayload } from '@/lib/realtime/socket.types';
import type { ShotResult } from '../types/possession.types';
import {
  GOAL_ATTACK_START_DELAY_MS,
  GOAL_CELEBRATION_MS,
  GOAL_SHOT_TO_CELEBRATION_MS,
  type GoalCelebrationState,
} from '../realtimePossession.helpers';

interface DevPossessionAnimationLike {
  id?: number;
  result: ShotResult;
  attackerSeat: 1 | 2 | null;
}

interface UsePossessionGoalCelebrationParams {
  roundResult: MatchRoundResultPayload | null;
  roundResultHoldDone: boolean;
  currentQuestionIndex: number | null;
  isHalftime: boolean;
  mySeat: number | undefined;
  playerUsername: string;
  opponentUsername: string;
  devPossessionAnimation: DevPossessionAnimationLike | null;
}

export function usePossessionGoalCelebration({
  roundResult,
  roundResultHoldDone: _roundResultHoldDone,
  currentQuestionIndex,
  isHalftime,
  mySeat,
  playerUsername,
  opponentUsername,
  devPossessionAnimation,
}: UsePossessionGoalCelebrationParams) {
  const [goalCelebration, setGoalCelebration] = useState<GoalCelebrationState | null>(null);
  const goalCelebrationHideTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const goalCelebrationStartTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const goalCelebrationKeyRef = useRef<string | null>(null);
  const roundDeltas = roundResult?.deltas;
  const roundScorerSeat = roundDeltas?.goalScoredBySeat ?? null;
  const roundPenaltyOutcome = roundDeltas?.penaltyOutcome ?? null;
  const roundPhaseKind = roundResult?.phaseKind ?? null;
  const roundQIndex = roundResult?.qIndex ?? null;
  const roundMatchId = roundResult?.matchId ?? null;
  const devAnimationId = devPossessionAnimation?.id ?? null;
  const devAnimationResult = devPossessionAnimation?.result ?? null;
  const devAnimationAttackerSeat = devPossessionAnimation?.attackerSeat ?? null;

  useEffect(() => {
    if (!roundMatchId || roundQIndex === null) return;
    if (!roundScorerSeat) return;

    if (roundPhaseKind !== 'normal' && roundPhaseKind !== 'last_attack') return;
    if (roundPenaltyOutcome) return;

    if (currentQuestionIndex !== null && currentQuestionIndex !== undefined && currentQuestionIndex !== roundQIndex) {
      return;
    }
    const celebrationKey = `${roundMatchId}:${roundQIndex}`;
    if (goalCelebrationKeyRef.current === celebrationKey) return;

    goalCelebrationKeyRef.current = celebrationKey;
    const isMeScorer = roundScorerSeat === mySeat;
    goalCelebrationStartTimerRef.current = setTimeout(() => {
      setGoalCelebration({
        scorerName: isMeScorer ? playerUsername : opponentUsername,
        isMeScorer,
      });
      goalCelebrationStartTimerRef.current = null;
    }, GOAL_ATTACK_START_DELAY_MS + GOAL_SHOT_TO_CELEBRATION_MS);

    return () => {
      if (goalCelebrationStartTimerRef.current) {
        clearTimeout(goalCelebrationStartTimerRef.current);
        goalCelebrationStartTimerRef.current = null;
      }
    };
  }, [
    currentQuestionIndex,
    mySeat,
    opponentUsername,
    playerUsername,
    roundMatchId,
    roundPenaltyOutcome,
    roundPhaseKind,
    roundQIndex,
    roundScorerSeat,
  ]);

  useEffect(() => {
    if (!isHalftime) return;
    const isBoundaryGoalRound = Boolean(
      roundScorerSeat
      && (roundPhaseKind === 'normal' || roundPhaseKind === 'last_attack')
      && !roundPenaltyOutcome
    );
    if (isBoundaryGoalRound) return;

    if (goalCelebrationStartTimerRef.current) {
      clearTimeout(goalCelebrationStartTimerRef.current);
      goalCelebrationStartTimerRef.current = null;
    }
    queueMicrotask(() => {
      setGoalCelebration(null);
    });
    if (goalCelebrationHideTimerRef.current) {
      clearTimeout(goalCelebrationHideTimerRef.current);
      goalCelebrationHideTimerRef.current = null;
    }
  }, [isHalftime, roundPenaltyOutcome, roundPhaseKind, roundScorerSeat]);

  useEffect(() => {
    if (!goalCelebration) return;

    if (goalCelebrationHideTimerRef.current) {
      clearTimeout(goalCelebrationHideTimerRef.current);
    }

    goalCelebrationHideTimerRef.current = setTimeout(() => {
      setGoalCelebration(null);
      goalCelebrationHideTimerRef.current = null;
    }, GOAL_CELEBRATION_MS);

    return () => {
      if (goalCelebrationHideTimerRef.current) {
        clearTimeout(goalCelebrationHideTimerRef.current);
        goalCelebrationHideTimerRef.current = null;
      }
    };
  }, [goalCelebration]);

  useEffect(() => {
    if (devAnimationResult !== 'goal') return;

    const isMeScorer = devAnimationAttackerSeat === mySeat;
    goalCelebrationStartTimerRef.current = setTimeout(() => {
      setGoalCelebration({
        scorerName: isMeScorer ? playerUsername : opponentUsername,
        isMeScorer,
      });
      goalCelebrationStartTimerRef.current = null;
    }, GOAL_SHOT_TO_CELEBRATION_MS);

    return () => {
      if (goalCelebrationStartTimerRef.current) {
        clearTimeout(goalCelebrationStartTimerRef.current);
        goalCelebrationStartTimerRef.current = null;
      }
    };
  }, [devAnimationAttackerSeat, devAnimationId, devAnimationResult, mySeat, opponentUsername, playerUsername]);

  return { goalCelebration };
}
