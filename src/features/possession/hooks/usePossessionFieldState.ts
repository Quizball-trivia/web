'use client';

import { useEffect, useMemo, useState, type ComponentProps } from 'react';
import type {
  MatchAnswerAckPayload,
  MatchRoundResultPayload,
  MatchRoundResultPlayer,
  ResolvedMatchQuestionPayload,
} from '@/lib/realtime/socket.types';
import type { DevPossessionAnimation, MatchStatus } from '@/stores/realtimeMatch.store';
import { PitchVisualization } from '../components/PitchVisualization';
import { usePossessionAnimationOrchestrator } from './usePossessionAnimationOrchestrator';
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
  questionDurationSeconds: number;
  zone: string;
  zoneColor: string;
  visualMyPossessionPct: number;
  shotResult: ShotResult;
  penaltyResult: PenaltyResult;
  penaltyDisplayResult: PenaltyResult;
  uiPhase: Phase;
  pitchProps: PitchProps;
}

interface UsePossessionFieldStateParams {
  match: MatchStatus | null;
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
  possessionState: MatchStatus['possessionState'];
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

export function usePossessionFieldState({
  match,
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
  const possessionState = match?.possessionState ?? null;
  const mySeat = match?.mySeat ?? null;
  const shooterSeat = possessionState?.shooterSeat ?? null;
  const phaseKind = localQuestion?.phaseKind ?? possessionState?.phaseKind ?? 'normal';
  const isPenaltyQuestion = phaseKind === 'penalty';
  const isLastAttackQuestion = phaseKind === 'last_attack';
  const isShotQuestion = phaseKind === 'shot';

  const questionDurationSeconds = getQuestionDurationSeconds(localQuestion);

  const { myGoals, oppGoals, myPenaltyGoals, oppPenaltyGoals } = useMemo(() => getSeatGoals({
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
    matchId: match?.matchId ?? null,
    possessionState,
    matchVariant: match?.variant ?? null,
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

  const resultShooterIsMe = roundResult?.shooterSeat != null && roundResult.shooterSeat === mySeat;

  const penaltyRoundResult = roundResult && (roundResult.phaseKind ?? phaseKind) === 'penalty'
    ? roundResult
    : null;

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
    if (match?.variant !== 'ranked_sim') return 0;

    return PENALTY_SCORE_FLIGHT_HANDOFF_MS;
  }, [immediatePenaltyResult, isPenaltyQuestion, match?.variant, myRound, opponentRound, penaltyRoundResult]);

  const penaltyResultKey = penaltyRoundResult && immediatePenaltyResult
    ? `${penaltyRoundResult.matchId}:${penaltyRoundResult.qIndex}:${immediatePenaltyResult}`
    : null;
  const [delayedPenaltyResult, setDelayedPenaltyResult] = useState<{
    key: string;
    result: NonNullable<PenaltyResult>;
  } | null>(null);

  useEffect(() => {
    if (!penaltyResultKey || !immediatePenaltyResult) {
      setDelayedPenaltyResult(null);
      return undefined;
    }

    setDelayedPenaltyResult(null);
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
    if (!penaltyResultKey || !immediatePenaltyResult) {
      setDisplayedPenaltyResult(null);
      return undefined;
    }

    setDisplayedPenaltyResult(null);
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
  }), [
    attackerIsMe,
    ballOnPlayer,
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
    roundResolved,
    shotAnimationVariant,
    shotBallOriginX,
    shotResult,
    mirrored,
    targetGoal,
    visualMyPossessionPct,
  ]);

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
    questionDurationSeconds,
    zone,
    zoneColor,
    visualMyPossessionPct,
    shotResult,
    penaltyResult,
    penaltyDisplayResult,
    uiPhase,
    pitchProps,
  };
}
