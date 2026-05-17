'use client';

import { useMemo, type ComponentProps } from 'react';
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
import { getQuestionDurationSeconds } from '../realtimePossession.helpers';
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
    possessionState,
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

  const penaltyResult: PenaltyResult = useMemo(() => {
    if (!isPenaltyQuestion) return null;

    if (roundResult?.deltas?.penaltyOutcome) {
      return roundResult.deltas.penaltyOutcome;
    }

    if (roundResult && (roundResult.phaseKind ?? phaseKind) === 'penalty') {
      const shooterRound = resultShooterIsMe ? myRound : opponentRound;
      const keeperRound = resultShooterIsMe ? opponentRound : myRound;
      const shooterCorrect = shooterRound?.isCorrect ?? false;
      const keeperCorrect = keeperRound?.isCorrect ?? false;
      if (!shooterCorrect) return 'saved';
      if (!keeperCorrect) return 'goal';
      return (shooterRound?.timeMs ?? 10000) < (keeperRound?.timeMs ?? 10000) ? 'goal' : 'saved';
    }

    const myAnswerCorrect = answerAck?.isCorrect;
    if (myAnswerCorrect == null) return null;

    if (opponentAnsweredCorrectly != null) {
      const shooterCorrect = shooterIsMe ? myAnswerCorrect : opponentAnsweredCorrectly;
      const keeperCorrect = shooterIsMe ? opponentAnsweredCorrectly : myAnswerCorrect;
      if (!shooterCorrect) return 'saved';
      if (!keeperCorrect) return 'goal';
      return 'goal';
    }

    return null;
  }, [
    answerAck?.isCorrect,
    isPenaltyQuestion,
    myRound,
    opponentAnsweredCorrectly,
    opponentRound,
    phaseKind,
    resultShooterIsMe,
    roundResult,
    shooterIsMe,
  ]);

  const uiPhase: Phase = useMemo(() => {
    if (isHalftime) return 'halftime';
    if (isPenaltyQuestion) {
      if (roundResolved || penaltyResult) return 'penalty-result';
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
      phase: (roundResolved ? 'result' : (questionPhase === 'playing' ? 'playing' : 'setup')) as 'setup' | 'playing' | 'result',
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
    myPenaltyGoals,
    oppPenaltyGoals,
    questionDurationSeconds,
    zone,
    zoneColor,
    visualMyPossessionPct,
    shotResult,
    penaltyResult,
    uiPhase,
    pitchProps,
  };
}
