'use client';

import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import type {
  MatchRoundResultPayload,
  MatchRoundResultPlayer,
  ResolvedMatchQuestionPayload,
} from '@/lib/realtime/socket.types';
import type { DevPossessionAnimation, MatchStatus } from '@/stores/realtimeMatch.store';
import {
  DEV_ATTACK_GOAL_HOLD_MS,
  DEV_ATTACK_OTHER_HOLD_MS,
  FIELD_POSSESSION_CUE_MS,
  FIELD_RESULT_COMPARE_MS,
  PENALTY_ICON_SWAP_DELAY_MS,
  computeMyPossessionPct,
} from '../realtimePossession.helpers';
import type { ShotResult } from '../types/possession.types';

interface AttackAnimation {
  result: ShotResult;
  attackerSeat: 1 | 2 | null;
}

interface UsePossessionAnimationOrchestratorParams {
  possessionState: MatchStatus['possessionState'];
  mySeat: number | null;
  shooterSeat: number | null;
  phaseKind: string;
  isPenaltyQuestion: boolean;
  isShotQuestion: boolean;
  localQuestion: ResolvedMatchQuestionPayload | null;
  roundResult: MatchRoundResultPayload | null;
  myRound: MatchRoundResultPlayer | null;
  opponentRound: MatchRoundResultPlayer | null;
  devPossessionAnimation: DevPossessionAnimation | null;
  clearDevPossessionAnimation: () => void;
}

interface PossessionAnimationOrchestratorResult {
  activeAttackAnimation: AttackAnimation | null;
  attackerSeat: 1 | 2 | null;
  delayedIsShooter: boolean;
  isAttackAnimationPhase: boolean;
  isShotVisualPhase: boolean;
  shotBallOriginX: number;
  visualMyPossessionPct: number;
}

function toSeat(value: number | null): 1 | 2 {
  return value === 2 ? 2 : 1;
}

export function usePossessionAnimationOrchestrator({
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
}: UsePossessionAnimationOrchestratorParams): PossessionAnimationOrchestratorResult {
  const phase = possessionState?.phase;
  const localQuestionIndex = localQuestion?.qIndex ?? null;
  const effectiveSeat = toSeat(mySeat);
  const possessionDiff = possessionState?.possessionDiff ?? 0;
  const initialPossessionPct = computeMyPossessionPct(possessionDiff, effectiveSeat, 0, 'field');

  const [delayedIsShooter, setDelayedIsShooter] = useState(false);
  const [optimisticOffset, setOptimisticOffset] = useState(0);
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

  const isShooter = mySeat !== null && mySeat !== undefined && shooterSeat === mySeat;
  const serverMyPossessionPct = computeMyPossessionPct(possessionDiff, effectiveSeat);
  const immediateMyPossessionPct = computeMyPossessionPct(
    possessionDiff,
    effectiveSeat,
    optimisticOffset,
    'field'
  );

  useEffect(() => {
    if (!isPenaltyQuestion) {
      queueMicrotask(() => {
        setDelayedIsShooter(isShooter);
      });
      return;
    }

    const timer = setTimeout(() => setDelayedIsShooter(isShooter), PENALTY_ICON_SWAP_DELAY_MS);
    return () => clearTimeout(timer);
  }, [isPenaltyQuestion, isShooter]);

  const suppressCarryoverAttackVisual = secondHalfKickoffResetPending && Boolean(roundResult);

  const roundAttackAnimation = useMemo((): AttackAnimation | null => {
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

  const devAttackAnimation = useMemo((): AttackAnimation | null => {
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
      queueMicrotask(() => {
        setOptimisticOffset(mySignedDelta / 2);
      });
      return;
    }

    const mySignedDelta = myRound.pointsEarned - opponentRound.pointsEarned;
    queueMicrotask(() => {
      setOptimisticOffset(mySignedDelta / 2);
    });
  }, [mySeat, myRound, opponentRound, phaseKind, roundResult]);

  useEffect(() => {
    queueMicrotask(() => {
      setOptimisticOffset(0);
    });
  }, [serverMyPossessionPct]);

  useEffect(() => {
    latestPossessionRef.current = immediateMyPossessionPct;
  }, [immediateMyPossessionPct]);

  useEffect(() => {
    const prevPhase = prevPhaseForFieldResetRef.current;
    prevPhaseForFieldResetRef.current = phase ?? null;
    if (prevPhase !== 'HALFTIME' || phase !== 'NORMAL_PLAY' || possessionState?.half !== 2) return;

    queueMicrotask(() => {
      setSecondHalfKickoffResetPending(true);
    });
    if (fieldReleaseTimerRef.current) {
      clearTimeout(fieldReleaseTimerRef.current);
      fieldReleaseTimerRef.current = null;
    }
    delayedFieldQRef.current = null;
    latestPossessionRef.current = 50;
    queueMicrotask(() => {
      setFieldMotionLocked(false);
      setOptimisticOffset(0);
      setMyPossessionPct(50);
    });
  }, [phase, possessionState?.half]);

  useEffect(() => {
    if (!secondHalfKickoffResetPending) return;
    if (roundResult) return;
    queueMicrotask(() => {
      setSecondHalfKickoffResetPending(false);
    });
  }, [roundResult, secondHalfKickoffResetPending]);

  useEffect(() => {
    if (fieldMotionLocked) return;
    const activeRoundQIdx = roundResult?.qIndex ?? null;
    if (activeRoundQIdx !== null && delayedFieldQRef.current === activeRoundQIdx) return;
    queueMicrotask(() => {
      setMyPossessionPct(immediateMyPossessionPct);
    });
  }, [fieldMotionLocked, immediateMyPossessionPct, roundResult]);

  useLayoutEffect(() => {
    if (!roundResult) return;

    const kind = roundResult.phaseKind ?? phaseKind;
    if (kind !== 'normal' && kind !== 'last_attack') return;

    const qIndex = roundResult.qIndex;
    if (delayedFieldQRef.current === qIndex) return;

    delayedFieldQRef.current = qIndex;
    queueMicrotask(() => {
      setFieldMotionLocked(true);
    });
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
    queueMicrotask(() => {
      setFieldMotionLocked(false);
      setMyPossessionPct(latestPossessionRef.current);
    });
  }, [localQuestionIndex]);

  useEffect(() => {
    if (phase !== 'HALFTIME' && phase !== 'COMPLETED') return;
    if (fieldReleaseTimerRef.current) {
      clearTimeout(fieldReleaseTimerRef.current);
      fieldReleaseTimerRef.current = null;
    }
    queueMicrotask(() => {
      setFieldMotionLocked(false);
      setMyPossessionPct(latestPossessionRef.current);
    });
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
  const visualMyPossessionPct = suppressCarryoverAttackVisual ? 50 : myPossessionPct;

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
    // Defer animation state until the current render commits; this preserves avatar/field transition timing.
    queueMicrotask(() => {
      setShotBallOriginX(isAttackerMe ? basePlayerX + 14 : baseOpponentX - 14);
    });
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

  return {
    activeAttackAnimation,
    attackerSeat,
    delayedIsShooter,
    isAttackAnimationPhase,
    isShotVisualPhase,
    shotBallOriginX,
    visualMyPossessionPct,
  };
}
