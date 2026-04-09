'use client';

import { useEffect, useRef, useState } from 'react';
import type { MatchRoundResultPayload } from '@/lib/realtime/socket.types';
import type { ShotResult } from '../types/possession.types';
import {
  DEV_GOAL_CELEBRATION_DELAY_MS,
  GOAL_CELEBRATION_MS,
  type GoalCelebrationState,
} from '../realtimePossession.helpers';

interface DevPossessionAnimationLike {
  result: ShotResult;
  attackerSeat: 1 | 2 | null;
}

interface UsePossessionGoalCelebrationParams {
  roundResult: MatchRoundResultPayload | null;
  roundResultHoldDone: boolean;
  currentQuestionIndex: number | null;
  mySeat: number | undefined;
  playerUsername: string;
  opponentUsername: string;
  devPossessionAnimation: DevPossessionAnimationLike | null;
}

export function usePossessionGoalCelebration({
  roundResult,
  roundResultHoldDone,
  currentQuestionIndex,
  mySeat,
  playerUsername,
  opponentUsername,
  devPossessionAnimation,
}: UsePossessionGoalCelebrationParams) {
  const [goalCelebration, setGoalCelebration] = useState<GoalCelebrationState | null>(null);
  const goalCelebrationHideTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const goalCelebrationQRef = useRef<number | null>(null);
  const pendingGoalRef = useRef<{ scorerName: string; isMeScorer: boolean; qIndex: number } | null>(null);

  useEffect(() => {
    if (!roundResult) return;

    const deltas = roundResult.deltas;
    const scorerSeat = deltas?.goalScoredBySeat ?? null;
    if (!scorerSeat) return;

    const kind = roundResult.phaseKind;
    if (kind !== 'normal' && kind !== 'last_attack') return;
    if (deltas?.penaltyOutcome) return;

    const qIndex = roundResult.qIndex;
    if (goalCelebrationQRef.current === qIndex) return;

    goalCelebrationQRef.current = qIndex;
    const isMeScorer = scorerSeat === mySeat;
    pendingGoalRef.current = {
      scorerName: isMeScorer ? playerUsername : opponentUsername,
      isMeScorer,
      qIndex,
    };
  }, [mySeat, opponentUsername, playerUsername, roundResult]);

  useEffect(() => {
    if (currentQuestionIndex !== null && currentQuestionIndex !== undefined) {
      pendingGoalRef.current = null;
    }
  }, [currentQuestionIndex]);

  useEffect(() => {
    if (!roundResultHoldDone || !pendingGoalRef.current) return;
    const info = pendingGoalRef.current;
    pendingGoalRef.current = null;
    setGoalCelebration({ scorerName: info.scorerName, isMeScorer: info.isMeScorer });
  }, [roundResultHoldDone]);

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
    if (!devPossessionAnimation || devPossessionAnimation.result !== 'goal') return;

    const celebrationTimer = setTimeout(() => {
      const isMeScorer = devPossessionAnimation.attackerSeat === mySeat;
      setGoalCelebration({
        scorerName: isMeScorer ? playerUsername : opponentUsername,
        isMeScorer,
      });
    }, DEV_GOAL_CELEBRATION_DELAY_MS);

    return () => clearTimeout(celebrationTimer);
  }, [devPossessionAnimation, mySeat, opponentUsername, playerUsername]);

  return { goalCelebration };
}
