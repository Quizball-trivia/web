'use client';

import { useEffect, useMemo, useState, type ComponentProps } from 'react';
import type {
  MatchAnswerAckPayload,
  MatchRoundResultPayload,
  MatchRoundResultPlayer,
  ResolvedMatchQuestionPayload,
} from '@/lib/realtime/socket.types';
import type { MatchStatePayload, MatchVariant } from '@/lib/realtime/socket.types';
import type { DevPossessionAnimation } from '@/stores/realtimeMatch.store';
import { PitchVisualization } from '../components/PitchVisualization';
import { usePossessionAnimationOrchestrator } from './usePossessionAnimationOrchestrator';
import { getBarBattleGoalAttackDelayMs, resolvePossessionBattlePoints } from './useBarBattle';
import { getZone } from './usePossessionMovement';
import {
  getQuestionDurationSeconds,
  PENALTY_RESULT_DISPLAY_DELAY_MS,
  PENALTY_SCORE_FLIGHT_HANDOFF_MS,
} from '../realtimePossession.helpers';
import type { PenaltyResult, Phase, ShotResult } from '../types/possession.types';

type PitchProps = ComponentProps<typeof PitchVisualization>;

export interface PossessionFieldState {
  mySeat: number | null;
  phaseKind: string;
  isPenaltyQuestion: boolean;
  isLastAttackQuestion: boolean;
  isShotQuestion: boolean;
  isAttackAnimationPhase: boolean;
  isShotVisualPhase: boolean;
  attackerIsMe: boolean;
  shooterIsMe: boolean;
  resultShooterIsMe: boolean;
  delayedIsShooter: boolean;
  myGoals: number;
  oppGoals: number;
  myPenaltyGoals: number;
  oppPenaltyGoals: number;
  myPenaltyAttempts: Array<'goal' | 'miss'>;
  oppPenaltyAttempts: Array<'goal' | 'miss'>;
  questionDurationSeconds: number;
  zone: string;
  zoneColor: string;
  visualMyPossessionPct: number;
  shotResult: ShotResult;
  penaltyResult: PenaltyResult;
  penaltyDisplayResult: PenaltyResult;
  uiPhase: Phase;
  pitchProps: PitchProps;
  /** True when I currently hold the 2× speed streak. */
  speedStreakMine: boolean;
  /** True when the opponent currently holds the 2× speed streak. */
  speedStreakOpponent: boolean;
}

interface UsePossessionFieldStateParams {
  possessionState: MatchStatePayload | null;
  mySeat: number | null;
  matchId: string | null;
  variant: MatchVariant | null;
  localQuestion: ResolvedMatchQuestionPayload | null;
  roundResult: MatchRoundResultPayload | null;
  questionPhase: 'reveal' | 'playing';
  roundResolved: boolean;
  answerAck: MatchAnswerAckPayload | null;
  opponentAnsweredCorrectly: boolean | null;
  myRound: MatchRoundResultPlayer | null;
  opponentRound: MatchRoundResultPlayer | null;
  devPossessionAnimation: DevPossessionAnimation | null;
  clearDevPossessionAnimation: () => void;
  playerAvatar: string;
  opponentAvatar: string;
  playerUsername: string;
  opponentUsername: string;
  isHalftime: boolean;
  unopposedBarPulse?: boolean;
}

function getSeatGoals(params: {
  possessionState: MatchStatePayload | null;
  mySeat: number | null;
}) {
  const { possessionState, mySeat } = params;
  if (!possessionState) {
    return {
      myGoals: 0,
      oppGoals: 0,
      myPenaltyGoals: 0,
      oppPenaltyGoals: 0,
    };
  }

  return {
    myGoals: mySeat === 2 ? possessionState.goals.seat2 : possessionState.goals.seat1,
    oppGoals: mySeat === 2 ? possessionState.goals.seat1 : possessionState.goals.seat2,
    myPenaltyGoals: mySeat === 2 ? possessionState.penaltyGoals.seat2 : possessionState.penaltyGoals.seat1,
    oppPenaltyGoals: mySeat === 2 ? possessionState.penaltyGoals.seat1 : possessionState.penaltyGoals.seat2,
  };
}

function reconstructPenaltyAttempts(goals: number, attempts: number): Array<'goal' | 'miss'> {
  return [
    ...Array.from({ length: Math.max(0, goals) }, () => 'goal' as const),
    ...Array.from({ length: Math.max(0, attempts - goals) }, () => 'miss' as const),
  ];
}

function getSeatPenaltyAttempts(params: {
  possessionState: MatchStatePayload | null;
  mySeat: number | null;
}): { myPenaltyAttempts: Array<'goal' | 'miss'>; oppPenaltyAttempts: Array<'goal' | 'miss'> } {
  const { possessionState, mySeat } = params;
  if (!possessionState) return { myPenaltyAttempts: [], oppPenaltyAttempts: [] };

  const attempts = possessionState.penaltyAttempts;
  if (attempts) {
    return {
      myPenaltyAttempts: mySeat === 2 ? attempts.seat2 : attempts.seat1,
      oppPenaltyAttempts: mySeat === 2 ? attempts.seat1 : attempts.seat2,
    };
  }

  const stateWithPenalty = possessionState as MatchStatePayload & {
    penalty?: { kicksTaken?: { seat1?: number; seat2?: number } };
  };
  const seat1Attempts = reconstructPenaltyAttempts(
    possessionState.penaltyGoals.seat1,
    Number(stateWithPenalty.penalty?.kicksTaken?.seat1 ?? possessionState.penaltyGoals.seat1)
  );
  const seat2Attempts = reconstructPenaltyAttempts(
    possessionState.penaltyGoals.seat2,
    Number(stateWithPenalty.penalty?.kicksTaken?.seat2 ?? possessionState.penaltyGoals.seat2)
  );
  return {
    myPenaltyAttempts: mySeat === 2 ? seat2Attempts : seat1Attempts,
    oppPenaltyAttempts: mySeat === 2 ? seat1Attempts : seat2Attempts,
  };
}

export function usePossessionFieldState({
  possessionState,
  mySeat,
  matchId,
  variant,
  localQuestion,
  roundResult,
  questionPhase,
  roundResolved,
  answerAck,
  opponentAnsweredCorrectly,
  myRound,
  opponentRound,
  devPossessionAnimation,
  clearDevPossessionAnimation,
  playerAvatar,
  opponentAvatar,
  playerUsername,
  opponentUsername,
  isHalftime,
  unopposedBarPulse = false,
}: UsePossessionFieldStateParams): PossessionFieldState {
  const phaseKind = localQuestion?.phaseKind ?? possessionState?.phaseKind ?? 'normal';
  const isPenaltyQuestion = phaseKind === 'penalty';
  const isLastAttackQuestion = phaseKind === 'last_attack';
  const isShotQuestion = phaseKind === 'shot';
  const penaltyRoundResult = roundResult && (roundResult.phaseKind ?? phaseKind) === 'penalty'
    ? roundResult
    : null;
  const shooterSeat = isPenaltyQuestion
    ? (penaltyRoundResult?.shooterSeat ?? localQuestion?.shooterSeat ?? possessionState?.shooterSeat ?? null)
    : null;

  const questionDurationSeconds = getQuestionDurationSeconds(localQuestion);

  const { myGoals, oppGoals, myPenaltyGoals, oppPenaltyGoals } = useMemo(() => getSeatGoals({
    possessionState,
    mySeat,
  }), [mySeat, possessionState]);
  const { myPenaltyAttempts, oppPenaltyAttempts } = useMemo(() => getSeatPenaltyAttempts({
    possessionState,
    mySeat,
  }), [mySeat, possessionState]);

  const {
    activeAttackAnimation,
    attackerSeat,
    delayedIsShooter,
    isAttackAnimationPhase,
    isShotVisualPhase,
    shotBallOriginX,
    visualMyPossessionPct,
  } = usePossessionAnimationOrchestrator({
    matchId,
    possessionState,
    matchVariant: variant,
    mySeat,
    shooterSeat,
    phaseKind,
    isPenaltyQuestion,
    isShotQuestion,
    localQuestion,
    roundResult,
    myRound,
    opponentRound,
    devPossessionAnimation,
    clearDevPossessionAnimation,
    unopposedBarPulse,
  });

  const attackerIsMe = attackerSeat !== null && attackerSeat === mySeat;
  const shooterIsMe = shooterSeat !== null && shooterSeat === mySeat;
  const mirrored = possessionState?.half === 2;
  const ballOnPlayer = visualMyPossessionPct > 50 || (
    visualMyPossessionPct === 50 && possessionState?.kickOffSeat === mySeat
  );

  const shotAnimationVariant = useMemo(() => {
    if (roundResult) {
      return roundResult.qIndex % 5;
    }
    if (devPossessionAnimation) {
      return devPossessionAnimation.id % 5;
    }
    return (localQuestion?.qIndex ?? 0) % 5;
  }, [devPossessionAnimation, localQuestion?.qIndex, roundResult]);

  const targetGoal = useMemo((): 'left' | 'right' | undefined => {
    if (!isShotVisualPhase && !isPenaltyQuestion) return undefined;
    if (isPenaltyQuestion) return mirrored ? 'left' : 'right';
    return attackerIsMe !== mirrored ? 'right' : 'left';
  }, [attackerIsMe, isPenaltyQuestion, isShotVisualPhase, mirrored]);

  const optimisticShotResult: ShotResult = useMemo(() => {
    if (!isShotQuestion) return 'pending';

    if (roundResult && (roundResult.phaseKind ?? phaseKind) === 'shot' && myRound && opponentRound) {
      const attackerCorrect = attackerIsMe ? myRound.isCorrect : opponentRound.isCorrect;
      const defenderCorrect = attackerIsMe ? opponentRound.isCorrect : myRound.isCorrect;
      if (attackerCorrect && !defenderCorrect) return 'goal';
      if (defenderCorrect) return 'saved';
      return 'miss';
    }

    const myAnswerCorrect = answerAck?.isCorrect;
    const opponentAnswerCorrect = opponentAnsweredCorrectly;
    if (myAnswerCorrect == null || opponentAnswerCorrect == null) return 'pending';

    const attackerCorrect = attackerIsMe ? myAnswerCorrect : opponentAnswerCorrect;
    const defenderCorrect = attackerIsMe ? opponentAnswerCorrect : myAnswerCorrect;
    if (attackerCorrect && !defenderCorrect) return 'goal';
    if (defenderCorrect) return 'saved';
    return 'miss';
  }, [answerAck?.isCorrect, attackerIsMe, isShotQuestion, myRound, opponentAnsweredCorrectly, opponentRound, phaseKind, roundResult]);

  const shotResult: ShotResult = isAttackAnimationPhase
    ? (activeAttackAnimation?.result ?? 'pending')
    : optimisticShotResult;

  const resultShooterSeat = penaltyRoundResult
    ? (penaltyRoundResult.shooterSeat ?? localQuestion?.shooterSeat ?? shooterSeat)
    : null;
  const resultShooterIsMe = resultShooterSeat != null && resultShooterSeat === mySeat;

  const immediatePenaltyResult: PenaltyResult = useMemo(() => {
    if (!isPenaltyQuestion || !penaltyRoundResult) return null;

    if (penaltyRoundResult.deltas?.penaltyOutcome) {
      return penaltyRoundResult.deltas.penaltyOutcome;
    }

    const shooterRound = resultShooterIsMe ? myRound : opponentRound;
    const keeperRound = resultShooterIsMe ? opponentRound : myRound;
    const shooterCorrect = shooterRound?.isCorrect ?? false;
    const keeperCorrect = keeperRound?.isCorrect ?? false;
    if (!shooterCorrect) return 'saved';
    if (!keeperCorrect) return 'goal';
    return (shooterRound?.timeMs ?? 10000) < (keeperRound?.timeMs ?? 10000) ? 'goal' : 'saved';
  }, [isPenaltyQuestion, myRound, opponentRound, penaltyRoundResult, resultShooterIsMe]);

  const penaltyShotDelayMs = useMemo(() => {
    if (!isPenaltyQuestion || !penaltyRoundResult || !myRound || !opponentRound || !immediatePenaltyResult) return 0;
    if (variant !== 'ranked_sim') return 0;

    // Wait for the bar battle to play out before the shot/result, exactly like
    // an open-play goal (usePossessionGoalCelebration). Using a fixed handoff
    // fired the shot while the bars were still animating.
    const playerPoints = resolvePossessionBattlePoints(myRound, penaltyRoundResult.questionKind);
    const opponentPoints = resolvePossessionBattlePoints(opponentRound, penaltyRoundResult.questionKind);
    return getBarBattleGoalAttackDelayMs(playerPoints, opponentPoints, PENALTY_SCORE_FLIGHT_HANDOFF_MS, {
      includeScoreFlightHandoff: true,
    });
  }, [immediatePenaltyResult, isPenaltyQuestion, variant, myRound, opponentRound, penaltyRoundResult]);

  const penaltyResultKey = penaltyRoundResult && immediatePenaltyResult
    ? `${penaltyRoundResult.matchId}:${penaltyRoundResult.qIndex}:${immediatePenaltyResult}`
    : null;
  const [delayedPenaltyResult, setDelayedPenaltyResult] = useState<{
    key: string;
    result: NonNullable<PenaltyResult>;
  } | null>(null);

  useEffect(() => {
    // Stale state is filtered by the `penaltyResult` selector below
    // (key mismatch ⇒ null), so we don't need to reset here — that would
    // cost an extra render.
    if (!penaltyResultKey || !immediatePenaltyResult) return undefined;

    const timer = window.setTimeout(() => {
      setDelayedPenaltyResult({
        key: penaltyResultKey,
        result: immediatePenaltyResult,
      });
    }, penaltyShotDelayMs);

    return () => window.clearTimeout(timer);
  }, [immediatePenaltyResult, penaltyResultKey, penaltyShotDelayMs]);

  const penaltyResult: PenaltyResult = delayedPenaltyResult?.key === penaltyResultKey
    ? delayedPenaltyResult.result
    : null;

  const [displayedPenaltyResult, setDisplayedPenaltyResult] = useState<{
    key: string;
    result: NonNullable<PenaltyResult>;
  } | null>(null);

  useEffect(() => {
    // Same key-filter pattern as the delayedPenaltyResult effect above.
    if (!penaltyResultKey || !immediatePenaltyResult) return undefined;

    const timer = window.setTimeout(() => {
      setDisplayedPenaltyResult({
        key: penaltyResultKey,
        result: immediatePenaltyResult,
      });
    }, penaltyShotDelayMs + PENALTY_RESULT_DISPLAY_DELAY_MS);

    return () => window.clearTimeout(timer);
  }, [immediatePenaltyResult, penaltyResultKey, penaltyShotDelayMs]);

  const penaltyDisplayResult: PenaltyResult = displayedPenaltyResult?.key === penaltyResultKey
    ? displayedPenaltyResult.result
    : null;

  const visiblePenaltyGoals = useMemo(() => {
    if (!isPenaltyQuestion || !penaltyRoundResult || !immediatePenaltyResult || penaltyDisplayResult) {
      return { myPenaltyGoals, oppPenaltyGoals };
    }
    if (immediatePenaltyResult !== 'goal') {
      return { myPenaltyGoals, oppPenaltyGoals };
    }
    return resultShooterIsMe
      ? { myPenaltyGoals: Math.max(0, myPenaltyGoals - 1), oppPenaltyGoals }
      : { myPenaltyGoals, oppPenaltyGoals: Math.max(0, oppPenaltyGoals - 1) };
  }, [
    immediatePenaltyResult,
    isPenaltyQuestion,
    myPenaltyGoals,
    oppPenaltyGoals,
    penaltyDisplayResult,
    penaltyRoundResult,
    resultShooterIsMe,
  ]);

  const visiblePenaltyAttempts = useMemo(() => {
    if (!isPenaltyQuestion || !penaltyRoundResult || !immediatePenaltyResult || penaltyDisplayResult) {
      return { myPenaltyAttempts, oppPenaltyAttempts };
    }
    return resultShooterIsMe
      ? { myPenaltyAttempts: myPenaltyAttempts.slice(0, -1), oppPenaltyAttempts }
      : { myPenaltyAttempts, oppPenaltyAttempts: oppPenaltyAttempts.slice(0, -1) };
  }, [
    immediatePenaltyResult,
    isPenaltyQuestion,
    myPenaltyAttempts,
    oppPenaltyAttempts,
    penaltyDisplayResult,
    penaltyRoundResult,
    resultShooterIsMe,
  ]);

  const uiPhase: Phase = useMemo(() => {
    if (isHalftime) return 'halftime';
    if (isPenaltyQuestion) {
      if (penaltyResult) return 'penalty-result';
      return questionPhase === 'playing' ? 'penalty-playing' : 'penalty-question';
    }
    if (isShotVisualPhase) {
      if (roundResolved || shotResult !== 'pending') return 'shot-result';
      return 'shot';
    }
    if (roundResolved) return 'reveal';
    return questionPhase === 'playing' ? 'playing' : 'question-reveal';
  }, [isHalftime, isPenaltyQuestion, isShotVisualPhase, penaltyResult, questionPhase, roundResolved, shotResult]);

  const { zone, color: zoneColor } = useMemo(() => getZone(visualMyPossessionPct), [visualMyPossessionPct]);

  // Narrow match.variant to the BarBattle variants the overlay knows
  // about. Anything else (party-quiz etc.) flows in as undefined, so
  // PitchVisualization → BarBattleOverlay falls back to the classic
  // (non-anchored) layout — same observable behavior as the previous
  // in-component store read.
  const matchVariant = variant;
  const barBattleVariant: 'ranked_sim' | 'friendly_possession' | undefined =
    matchVariant === 'ranked_sim' || matchVariant === 'friendly_possession'
      ? matchVariant
      : undefined;

  const pitchProps = useMemo((): PitchProps => ({
    playerPosition: visualMyPossessionPct,
    playerAvatarUrl: playerAvatar,
    opponentAvatarUrl: opponentAvatar,
    playerName: playerUsername,
    opponentName: opponentUsername,
    penaltyMode: isPenaltyQuestion ? {
      isPlayerShooter: delayedIsShooter,
      result: penaltyResult,
      phase: (penaltyResult ? 'result' : (questionPhase === 'playing' ? 'playing' : 'setup')) as 'setup' | 'playing' | 'result',
    } : undefined,
    shotMode: isShotVisualPhase ? {
      result: shotResult,
      ballOriginX: shotBallOriginX,
      isPlayerAttacker: attackerIsMe,
      variant: shotAnimationVariant,
    } : undefined,
    zoomToGoal: isPenaltyQuestion || isShotQuestion,
    mirrored,
    targetGoal,
    ballOnPlayer,
    barBattleVariant,
  }), [
    attackerIsMe,
    ballOnPlayer,
    barBattleVariant,
    delayedIsShooter,
    isPenaltyQuestion,
    isShotQuestion,
    isShotVisualPhase,
    opponentAvatar,
    opponentUsername,
    penaltyResult,
    playerAvatar,
    playerUsername,
    questionPhase,
    shotAnimationVariant,
    shotBallOriginX,
    shotResult,
    mirrored,
    targetGoal,
    visualMyPossessionPct,
  ]);

  // Sticky across questions: read the live streak holder from match state (not
  // the transient round result). The round-result delta only drives the
  // one-shot fly-in / score-doubling moment, handled in the flight overlay.
  const speedStreakMine =
    mySeat != null && possessionState?.speedStreakHolderSeat === mySeat;
  const speedStreakOpponent =
    mySeat != null
    && possessionState?.speedStreakHolderSeat != null
    && possessionState.speedStreakHolderSeat !== mySeat;

  return {
    mySeat,
    phaseKind,
    isPenaltyQuestion,
    isLastAttackQuestion,
    isShotQuestion,
    isAttackAnimationPhase,
    isShotVisualPhase,
    attackerIsMe,
    shooterIsMe,
    resultShooterIsMe,
    delayedIsShooter,
    myGoals,
    oppGoals,
    myPenaltyGoals: visiblePenaltyGoals.myPenaltyGoals,
    oppPenaltyGoals: visiblePenaltyGoals.oppPenaltyGoals,
    myPenaltyAttempts: visiblePenaltyAttempts.myPenaltyAttempts,
    oppPenaltyAttempts: visiblePenaltyAttempts.oppPenaltyAttempts,
    questionDurationSeconds,
    zone,
    zoneColor,
    visualMyPossessionPct,
    shotResult,
    penaltyResult,
    penaltyDisplayResult,
    uiPhase,
    pitchProps,
    speedStreakMine,
    speedStreakOpponent,
  };
}
