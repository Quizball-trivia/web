'use client';

import { useEffect, useRef, useState } from 'react';
import type { MatchRoundResultPayload } from '@/lib/realtime/socket.types';
import { useRealtimeMatchStore } from '@/stores/realtimeMatch.store';
import type { ShotResult } from '../types/possession.types';
import {
  GOAL_ATTACK_START_DELAY_MS,
  GOAL_CELEBRATION_MS,
  GOAL_SHOT_TO_CELEBRATION_MS,
  type GoalCelebrationState,
} from '../realtimePossession.helpers';
import {
  getBarBattleGoalAttackDelayMs,
  resolvePossessionBattlePoints,
  shouldUsePossessionPointsForSide,
} from './useBarBattle';

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
  const matchVariant = useRealtimeMatchStore((s) => s.match?.variant);
  const selfUserId = useRealtimeMatchStore((s) => s.selfUserId);
  const storeMySeat = useRealtimeMatchStore((s) => s.match?.mySeat ?? null);
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
    // Look up player/opponent by self user id rather than Object.values()
    // ordering — Record key enumeration order is engine-dependent for
    // non-integer keys, so [0]/[1] could swap player and opponent.
    const players = roundResult?.players ?? {};
    const playerRound = selfUserId ? players[selfUserId] : undefined;
    const opponentRound = Object.entries(players).find(([userId]) => userId !== selfUserId)?.[1];
    const boostedSeat = roundDeltas?.speedStreakBoostedSeat ?? null;
    const effectiveMySeat = mySeat ?? storeMySeat;
    const playerPoints = resolvePossessionBattlePoints(playerRound, roundResult?.questionKind, {
      usePossessionPoints: shouldUsePossessionPointsForSide({
        phaseKind: roundPhaseKind,
        speedStreakBoostedSeat: boostedSeat,
        mySeat: effectiveMySeat,
        side: 'player',
      }),
    });
    const opponentPoints = resolvePossessionBattlePoints(opponentRound, roundResult?.questionKind, {
      usePossessionPoints: shouldUsePossessionPointsForSide({
        phaseKind: roundPhaseKind,
        speedStreakBoostedSeat: boostedSeat,
        mySeat: effectiveMySeat,
        side: 'opponent',
      }),
    });
    const attackDelayMs = getBarBattleGoalAttackDelayMs(
      playerPoints,
      opponentPoints,
      GOAL_ATTACK_START_DELAY_MS,
      { includeScoreFlightHandoff: matchVariant === 'ranked_sim' }
    );
    goalCelebrationStartTimerRef.current = setTimeout(() => {
      setGoalCelebration({
        scorerName: isMeScorer ? playerUsername : opponentUsername,
        isMeScorer,
      });
      goalCelebrationStartTimerRef.current = null;
    }, attackDelayMs + GOAL_SHOT_TO_CELEBRATION_MS);

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
    roundResult,
    roundDeltas,
    matchVariant,
    selfUserId,
    storeMySeat,
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
