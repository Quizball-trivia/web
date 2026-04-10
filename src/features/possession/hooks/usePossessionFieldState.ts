'use client';

import { useEffect, useLayoutEffect, useMemo, useRef, useState, type ComponentProps } from 'react';
import type {
  MatchAnswerAckPayload,
  MatchRoundResultPayload,
  MatchRoundResultPlayer,
  ResolvedMatchQuestionPayload,
} from '@/lib/realtime/socket.types';
import type { DevPossessionAnimation, MatchStatus } from '@/stores/realtimeMatch.store';
import { PitchVisualization } from '../components/PitchVisualization';
import { getZone } from './usePossessionMovement';
import {
  DEV_ATTACK_GOAL_HOLD_MS,
  DEV_ATTACK_OTHER_HOLD_MS,
  FIELD_POSSESSION_CUE_MS,
  FIELD_RESULT_COMPARE_MS,
  PENALTY_ICON_SWAP_DELAY_MS,
  getQuestionDurationSeconds,
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
  const phase = possessionState?.phase;
  const mySeat = match?.mySeat ?? null;
  const shooterSeat = possessionState?.shooterSeat ?? null;
  const phaseKind = localQuestion?.phaseKind ?? possessionState?.phaseKind ?? 'normal';
  const isPenaltyQuestion = phaseKind === 'penalty';
  const isLastAttackQuestion = phaseKind === 'last_attack';
  const isShotQuestion = phaseKind === 'shot';

  const [delayedIsShooter, setDelayedIsShooter] = useState(false);
  const [optimisticOffset, setOptimisticOffset] = useState(0);
  const initialPossessionPct = Math.max(
    10,
    Math.min(
      90,
      (mySeat === 2 ? 100 - Math.max(0, Math.min(100, 50 + ((possessionState?.possessionDiff ?? 0) / 2))) : Math.max(0, Math.min(100, 50 + ((possessionState?.possessionDiff ?? 0) / 2))))
    )
  );
  const [myPossessionPct, setMyPossessionPct] = useState(initialPossessionPct);
  const [fieldMotionLocked, setFieldMotionLocked] = useState(false);
  const [shotBallOriginX, setShotBallOriginX] = useState(440);
  const [secondHalfKickoffResetPending, setSecondHalfKickoffResetPending] = useState(false);

  const optimisticAppliedQRef = useRef<number | null>(null);
  const latestPossessionRef = useRef(initialPossessionPct);
  const prevPhaseForFieldResetRef = useRef<string | null>(phase ?? null);
  const delayedFieldQRef = useRef<number | null>(null);
  const fieldReleaseTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const shotOriginCaptureKeyRef = useRef<string | null>(null);
  const attackOriginQRef = useRef<number | null>(null);
  const attackOriginPctRef = useRef<number | null>(null);

  const possessionPct = Math.max(0, Math.min(100, 50 + ((possessionState?.possessionDiff ?? 0) / 2)));
  const serverMyPossessionPct = mySeat === 2 ? 100 - possessionPct : possessionPct;
  const localQuestionIndex = localQuestion?.qIndex ?? null;
  const questionDurationSeconds = getQuestionDurationSeconds(localQuestion);
  const isShooter = mySeat !== null && mySeat !== undefined && shooterSeat === mySeat;

  useEffect(() => {
    if (!isPenaltyQuestion) {
      setDelayedIsShooter(isShooter);
      return;
    }

    const timer = setTimeout(() => setDelayedIsShooter(isShooter), PENALTY_ICON_SWAP_DELAY_MS);
    return () => clearTimeout(timer);
  }, [isPenaltyQuestion, isShooter]);

  const { myGoals, oppGoals, myPenaltyGoals, oppPenaltyGoals } = useMemo(() => getSeatGoals({
    possessionState,
    mySeat,
  }), [mySeat, possessionState]);

  const suppressCarryoverAttackVisual = secondHalfKickoffResetPending && Boolean(roundResult);

  const roundAttackAnimation = useMemo((): { result: ShotResult; attackerSeat: 1 | 2 | null } | null => {
    if (!roundResult) return null;
    if (suppressCarryoverAttackVisual) return null;

    const kind = roundResult.phaseKind ?? phaseKind;
    if (kind === 'penalty' || kind === 'shot') return null;

    const scorerSeat = roundResult.deltas?.goalScoredBySeat ?? null;
    if (kind === 'normal') {
      if (!scorerSeat) return null;
      return { result: 'goal', attackerSeat: scorerSeat };
    }

    if (kind === 'last_attack') {
      const attackerSeatFromRound = roundResult.attackerSeat ?? possessionState?.attackerSeat ?? null;
      if (scorerSeat) {
        return { result: 'goal', attackerSeat: attackerSeatFromRound ?? scorerSeat };
      }
      return { result: 'miss', attackerSeat: attackerSeatFromRound };
    }

    return null;
  }, [phaseKind, possessionState?.attackerSeat, roundResult, suppressCarryoverAttackVisual]);

  const devAttackAnimation = useMemo((): { result: ShotResult; attackerSeat: 1 | 2 | null } | null => {
    if (!devPossessionAnimation) return null;
    return {
      result: devPossessionAnimation.result,
      attackerSeat: devPossessionAnimation.attackerSeat,
    };
  }, [devPossessionAnimation]);

  const activeAttackAnimation = roundAttackAnimation ?? (roundResult ? null : devAttackAnimation);

  useEffect(() => {
    if (!devPossessionAnimation) return;

    const holdMs = devPossessionAnimation.result === 'goal' ? DEV_ATTACK_GOAL_HOLD_MS : DEV_ATTACK_OTHER_HOLD_MS;
    const timer = setTimeout(() => clearDevPossessionAnimation(), holdMs);
    return () => clearTimeout(timer);
  }, [clearDevPossessionAnimation, devPossessionAnimation]);

  const isAttackAnimationPhase = activeAttackAnimation !== null;
  const isShotVisualPhase = isShotQuestion || isAttackAnimationPhase;

  useEffect(() => {
    if (!roundResult || !myRound || !opponentRound) return;

    const kind = roundResult.phaseKind ?? phaseKind;
    if (kind === 'normal') return;
    if (kind !== 'last_attack') return;

    const qIndex = roundResult.qIndex;
    if (optimisticAppliedQRef.current === qIndex) return;
    optimisticAppliedQRef.current = qIndex;

    const deltas = roundResult.deltas;
    if (deltas) {
      const mySignedDelta = mySeat === 2 ? -deltas.possessionDelta : deltas.possessionDelta;
      setOptimisticOffset(mySignedDelta / 2);
      return;
    }

    const mySignedDelta = myRound.pointsEarned - opponentRound.pointsEarned;
    setOptimisticOffset(mySignedDelta / 2);
  }, [mySeat, myRound, opponentRound, phaseKind, roundResult]);

  useEffect(() => {
    setOptimisticOffset(0);
  }, [possessionPct]);

  const immediateMyPossessionPct = Math.max(10, Math.min(90, serverMyPossessionPct + optimisticOffset));

  useEffect(() => {
    latestPossessionRef.current = immediateMyPossessionPct;
  }, [immediateMyPossessionPct]);

  useEffect(() => {
    const prevPhase = prevPhaseForFieldResetRef.current;
    prevPhaseForFieldResetRef.current = phase ?? null;
    if (prevPhase !== 'HALFTIME' || phase !== 'NORMAL_PLAY' || possessionState?.half !== 2) return;

    setSecondHalfKickoffResetPending(true);
    if (fieldReleaseTimerRef.current) {
      clearTimeout(fieldReleaseTimerRef.current);
      fieldReleaseTimerRef.current = null;
    }
    delayedFieldQRef.current = null;
    setFieldMotionLocked(false);
    setOptimisticOffset(0);
    latestPossessionRef.current = 50;
    setMyPossessionPct(50);
  }, [phase, possessionState?.half]);

  useEffect(() => {
    if (!secondHalfKickoffResetPending) return;
    if (roundResult) return;
    setSecondHalfKickoffResetPending(false);
  }, [roundResult, secondHalfKickoffResetPending]);

  useEffect(() => {
    if (fieldMotionLocked) return;
    const activeRoundQIdx = roundResult?.qIndex ?? null;
    if (activeRoundQIdx !== null && delayedFieldQRef.current === activeRoundQIdx) return;
    setMyPossessionPct(immediateMyPossessionPct);
  }, [fieldMotionLocked, immediateMyPossessionPct, roundResult]);

  useLayoutEffect(() => {
    if (!roundResult) return;

    const kind = roundResult.phaseKind ?? phaseKind;
    if (kind !== 'normal' && kind !== 'last_attack') return;

    const qIndex = roundResult.qIndex;
    if (delayedFieldQRef.current === qIndex) return;

    delayedFieldQRef.current = qIndex;
    setFieldMotionLocked(true);
    if (fieldReleaseTimerRef.current) clearTimeout(fieldReleaseTimerRef.current);
    fieldReleaseTimerRef.current = setTimeout(() => {
      setFieldMotionLocked(false);
      setMyPossessionPct(latestPossessionRef.current);
      fieldReleaseTimerRef.current = null;
    }, FIELD_RESULT_COMPARE_MS + FIELD_POSSESSION_CUE_MS);
  }, [phaseKind, roundResult]);

  useEffect(() => {
    delayedFieldQRef.current = null;
    if (fieldReleaseTimerRef.current) {
      clearTimeout(fieldReleaseTimerRef.current);
      fieldReleaseTimerRef.current = null;
    }
    setFieldMotionLocked(false);
    setMyPossessionPct(latestPossessionRef.current);
  }, [localQuestionIndex]);

  useEffect(() => {
    if (phase !== 'HALFTIME' && phase !== 'COMPLETED') return;
    if (fieldReleaseTimerRef.current) {
      clearTimeout(fieldReleaseTimerRef.current);
      fieldReleaseTimerRef.current = null;
    }
    setFieldMotionLocked(false);
    setMyPossessionPct(latestPossessionRef.current);
  }, [phase]);

  useEffect(() => {
    return () => {
      if (fieldReleaseTimerRef.current) {
        clearTimeout(fieldReleaseTimerRef.current);
      }
    };
  }, []);

  const attackerSeat = (isAttackAnimationPhase
    ? activeAttackAnimation?.attackerSeat
    : (localQuestion?.attackerSeat ?? possessionState?.attackerSeat)) ?? null;
  const attackerIsMe = attackerSeat !== null && attackerSeat === mySeat;
  const shooterIsMe = shooterSeat !== null && shooterSeat === mySeat;
  const visualMyPossessionPct = suppressCarryoverAttackVisual ? 50 : myPossessionPct;
  const mirrored = possessionState?.half === 2;
  const ballOnPlayer = visualMyPossessionPct > 50 || (
    visualMyPossessionPct === 50 && possessionState?.kickOffSeat === mySeat
  );

  useEffect(() => {
    if (!isAttackAnimationPhase) {
      attackOriginQRef.current = null;
      attackOriginPctRef.current = null;
      return;
    }

    const qIndex = roundResult?.qIndex ?? localQuestion?.qIndex ?? null;
    if (qIndex === null) return;
    if (attackOriginQRef.current === qIndex) return;

    attackOriginQRef.current = qIndex;
    attackOriginPctRef.current = visualMyPossessionPct;
  }, [isAttackAnimationPhase, localQuestion?.qIndex, roundResult?.qIndex, visualMyPossessionPct]);

  useEffect(() => {
    if (!isShotVisualPhase || !possessionState) {
      shotOriginCaptureKeyRef.current = null;
      return;
    }

    const captureKey = isAttackAnimationPhase
      ? `attack:${roundResult?.qIndex ?? localQuestion?.qIndex ?? 'na'}`
      : `shot:${localQuestion?.qIndex ?? 'na'}`;
    if (shotOriginCaptureKeyRef.current === captureKey) return;
    shotOriginCaptureKeyRef.current = captureKey;

    const sourcePossessionPct = isAttackAnimationPhase
      ? (attackOriginPctRef.current ?? visualMyPossessionPct)
      : visualMyPossessionPct;
    const isAttackerMe = attackerSeat === mySeat;
    const basePlayerX = 30 + (sourcePossessionPct / 100) * 440;
    const baseOpponentX = basePlayerX - 30;
    setShotBallOriginX(isAttackerMe ? basePlayerX + 14 : baseOpponentX - 14);
  }, [
    attackerSeat,
    isAttackAnimationPhase,
    isShotVisualPhase,
    localQuestion?.qIndex,
    mySeat,
    possessionState,
    roundResult?.qIndex,
    visualMyPossessionPct,
  ]);

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
    zoomToGoal: isPenaltyQuestion || isShotVisualPhase,
    mirrored,
    targetGoal,
    ballOnPlayer,
  }), [
    attackerIsMe,
    ballOnPlayer,
    delayedIsShooter,
    isPenaltyQuestion,
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
