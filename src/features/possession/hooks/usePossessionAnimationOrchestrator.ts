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
  GOAL_ATTACK_START_DELAY_MS,
  GOAL_FIELD_CENTER_RESET_MS,
  PENALTY_ICON_SWAP_DELAY_MS,
  computeMyPossessionPct,
} from '../realtimePossession.helpers';
import { getBarBattleFieldLockMs, getBarBattleGoalAttackDelayMs, resolveBattlePoints } from './useBarBattle';
import type { ShotResult } from '../types/possession.types';

interface AttackAnimation {
  result: ShotResult;
  attackerSeat: 1 | 2 | null;
}

interface UsePossessionAnimationOrchestratorParams {
  matchId?: string | null;
  possessionState: MatchStatus['possessionState'];
  matchVariant?: MatchStatus['variant'] | null;
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
  unopposedBarPulse?: boolean;
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
  matchId,
  possessionState,
  matchVariant,
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
  unopposedBarPulse = false,
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
  const [goalFieldResetReadyQIndex, setGoalFieldResetReadyQIndex] = useState<number | null>(null);
  const [readyRoundAttackKey, setReadyRoundAttackKey] = useState<string | null>(null);

  const latestPossessionRef = useRef(initialPossessionPct);
  const fieldMotionLockedRef = useRef(false);
  const prevPhaseForFieldResetRef = useRef<string | null>(phase ?? null);
  const delayedFieldQRef = useRef<number | null>(null);
  const fieldReleaseTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const goalFieldResetTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
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

  useLayoutEffect(() => {
    latestPossessionRef.current = initialPossessionPct;
    fieldMotionLockedRef.current = false;
    delayedFieldQRef.current = null;
    shotOriginCaptureKeyRef.current = null;
    attackOriginQRef.current = null;
    attackOriginPctRef.current = null;
    // Drop carried-over phase so the halftime→NORMAL_PLAY second-half
    // detection can't misfire on a fresh match.
    prevPhaseForFieldResetRef.current = null;
    if (fieldReleaseTimerRef.current) {
      clearTimeout(fieldReleaseTimerRef.current);
      fieldReleaseTimerRef.current = null;
    }
    if (goalFieldResetTimerRef.current) {
      clearTimeout(goalFieldResetTimerRef.current);
      goalFieldResetTimerRef.current = null;
    }
    setOptimisticOffset(0);
    setFieldMotionLocked(false);
    setGoalFieldResetReadyQIndex(null);
    setSecondHalfKickoffResetPending(false);
    setReadyRoundAttackKey(null);
    setMyPossessionPct(initialPossessionPct);
  // Reset only when the active match changes. `initialPossessionPct` is
  // intentionally read from this render; including it as a dependency would
  // reset the field on every legitimate possessionDiff update and cancel the
  // bar/field animation timing.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [matchId]);

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

  const roundAttackKey = roundResult && roundAttackAnimation
    ? `${roundResult.matchId}:${roundResult.qIndex}:${roundAttackAnimation.result}:${roundAttackAnimation.attackerSeat ?? 'none'}`
    : null;

  useEffect(() => {
    if (!roundAttackKey) {
      queueMicrotask(() => {
        setReadyRoundAttackKey(null);
      });
      return;
    }

    if (roundResult?.qIndex !== null && attackOriginQRef.current !== roundResult?.qIndex) {
      attackOriginQRef.current = roundResult?.qIndex ?? null;
      attackOriginPctRef.current = latestPossessionRef.current;
    }

    queueMicrotask(() => {
      setReadyRoundAttackKey(null);
    });
    const playerPoints = resolveBattlePoints(
      myRound?.pointsEarned ?? 0,
      roundResult?.questionKind,
      myRound?.foundCount
    );
    const opponentPoints = resolveBattlePoints(
      opponentRound?.pointsEarned ?? 0,
      roundResult?.questionKind,
      opponentRound?.foundCount
    );
    const attackDelayMs = getBarBattleGoalAttackDelayMs(
      playerPoints,
      opponentPoints,
      GOAL_ATTACK_START_DELAY_MS,
      { includeScoreFlightHandoff: matchVariant === 'ranked_sim' }
    );

    const timer = setTimeout(() => {
      setReadyRoundAttackKey(roundAttackKey);
    }, attackDelayMs);

    return () => clearTimeout(timer);
  }, [matchVariant, myRound, opponentRound, roundAttackKey, roundResult?.questionKind]);

  const delayedRoundAttackAnimation = roundAttackKey && readyRoundAttackKey === roundAttackKey
    ? roundAttackAnimation
    : null;
  const hasPendingRoundAttackAnimation = Boolean(
    roundAttackAnimation
    && roundAttackKey
    && readyRoundAttackKey !== roundAttackKey
  );
  const activeAttackAnimation = delayedRoundAttackAnimation ?? (roundResult ? null : devAttackAnimation);
  const activeAttackQIndex = roundResult?.qIndex ?? localQuestion?.qIndex ?? null;

  useEffect(() => {
    if (!devPossessionAnimation) return;

    const holdMs = devPossessionAnimation.result === 'goal' ? DEV_ATTACK_GOAL_HOLD_MS : DEV_ATTACK_OTHER_HOLD_MS;
    const timer = setTimeout(() => clearDevPossessionAnimation(), holdMs);
    return () => clearTimeout(timer);
  }, [clearDevPossessionAnimation, devPossessionAnimation]);

  const isAttackAnimationPhase = activeAttackAnimation !== null;
  const isShotVisualPhase = isShotQuestion || isAttackAnimationPhase;

  useEffect(() => {
    if (goalFieldResetTimerRef.current) {
      clearTimeout(goalFieldResetTimerRef.current);
      goalFieldResetTimerRef.current = null;
    }

    if (!isAttackAnimationPhase || activeAttackAnimation?.result !== 'goal' || activeAttackQIndex === null) {
      queueMicrotask(() => {
        setGoalFieldResetReadyQIndex(null);
      });
      return;
    }

    queueMicrotask(() => {
      setGoalFieldResetReadyQIndex(null);
    });
    goalFieldResetTimerRef.current = setTimeout(() => {
      latestPossessionRef.current = 50;
      queueMicrotask(() => {
        setMyPossessionPct(50);
        setGoalFieldResetReadyQIndex(activeAttackQIndex);
      });
      goalFieldResetTimerRef.current = null;
    }, GOAL_FIELD_CENTER_RESET_MS);

    return () => {
      if (goalFieldResetTimerRef.current) {
        clearTimeout(goalFieldResetTimerRef.current);
        goalFieldResetTimerRef.current = null;
      }
    };
  }, [activeAttackAnimation?.result, activeAttackQIndex, isAttackAnimationPhase]);

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
    fieldMotionLockedRef.current = false;
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
    const hasOpenNormalQuestion = phase === 'NORMAL_PLAY' && phaseKind === 'normal' && localQuestionIndex !== null;
    if (!roundResult && hasOpenNormalQuestion) return;
    queueMicrotask(() => {
      if (fieldMotionLockedRef.current) return;
      setMyPossessionPct(immediateMyPossessionPct);
    });
  }, [fieldMotionLocked, immediateMyPossessionPct, localQuestionIndex, phase, phaseKind, roundResult]);

  useLayoutEffect(() => {
    if (!roundResult) return;

    const kind = roundResult.phaseKind ?? phaseKind;
    if (kind !== 'normal') return;
    if (roundResult.deltas?.goalScoredBySeat) return;

    const qIndex = roundResult.qIndex;
    if (delayedFieldQRef.current === qIndex) return;

    delayedFieldQRef.current = qIndex;
    fieldMotionLockedRef.current = true;
    setFieldMotionLocked(true);
    if (fieldReleaseTimerRef.current) clearTimeout(fieldReleaseTimerRef.current);
    const playerPoints = resolveBattlePoints(
      myRound?.pointsEarned ?? 0,
      roundResult.questionKind,
      myRound?.foundCount
    );
    const opponentPoints = resolveBattlePoints(
      opponentRound?.pointsEarned ?? 0,
      roundResult.questionKind,
      opponentRound?.foundCount
    );
    const fieldLockMs = Math.max(
      FIELD_RESULT_COMPARE_MS + FIELD_POSSESSION_CUE_MS,
      getBarBattleFieldLockMs(playerPoints, opponentPoints, {
        includeScoreFlightHandoff: matchVariant === 'ranked_sim',
        includeUnopposedPulse: unopposedBarPulse,
      })
    );

    fieldReleaseTimerRef.current = setTimeout(() => {
      fieldMotionLockedRef.current = false;
      setFieldMotionLocked(false);
      setMyPossessionPct(latestPossessionRef.current);
      fieldReleaseTimerRef.current = null;
    }, fieldLockMs);
  }, [matchVariant, myRound, opponentRound, phaseKind, roundResult, unopposedBarPulse]);

  useEffect(() => {
    delayedFieldQRef.current = null;
    if (fieldReleaseTimerRef.current) {
      clearTimeout(fieldReleaseTimerRef.current);
      fieldReleaseTimerRef.current = null;
    }
    if (goalFieldResetTimerRef.current) {
      clearTimeout(goalFieldResetTimerRef.current);
      goalFieldResetTimerRef.current = null;
    }
    fieldMotionLockedRef.current = false;
    const resetPossessionPct = latestPossessionRef.current;
    queueMicrotask(() => {
      setFieldMotionLocked(false);
      setGoalFieldResetReadyQIndex(null);
      setMyPossessionPct(resetPossessionPct);
    });
  }, [localQuestionIndex]);

  useEffect(() => {
    if (phase !== 'HALFTIME' && phase !== 'COMPLETED') return;
    const hasBoundaryAttackRound = Boolean(
      (phase === 'HALFTIME' || phase === 'COMPLETED')
      && (roundResult?.phaseKind === 'normal' || roundResult?.phaseKind === 'last_attack')
      && (roundResult?.deltas?.goalScoredBySeat || roundResult?.phaseKind === 'last_attack')
    );
    if (hasBoundaryAttackRound) return;

    if (fieldReleaseTimerRef.current) {
      clearTimeout(fieldReleaseTimerRef.current);
      fieldReleaseTimerRef.current = null;
    }
    if (goalFieldResetTimerRef.current) {
      clearTimeout(goalFieldResetTimerRef.current);
      goalFieldResetTimerRef.current = null;
    }
    fieldMotionLockedRef.current = false;
    const resetPossessionPct = latestPossessionRef.current;
    queueMicrotask(() => {
      setFieldMotionLocked(false);
      setGoalFieldResetReadyQIndex(null);
      setMyPossessionPct(resetPossessionPct);
    });
  }, [phase, roundResult]);

  useEffect(() => {
    return () => {
      if (fieldReleaseTimerRef.current) {
        clearTimeout(fieldReleaseTimerRef.current);
      }
      if (goalFieldResetTimerRef.current) {
        clearTimeout(goalFieldResetTimerRef.current);
      }
    };
  }, []);

  const attackerSeat = (isAttackAnimationPhase
    ? activeAttackAnimation?.attackerSeat
    : (localQuestion?.attackerSeat ?? possessionState?.attackerSeat)) ?? null;
  const freezeActiveAttackField =
    isAttackAnimationPhase
    && activeAttackQIndex !== null
    && (
      activeAttackAnimation?.result !== 'goal'
      || goalFieldResetReadyQIndex !== activeAttackQIndex
    );
  const freezePendingAttackField = hasPendingRoundAttackAnimation;
  // Intentionally reads `attackOriginPctRef.current` during render: when
  // an attack animation starts we capture a SNAPSHOT of the possession
  // pct into the ref (see the useEffect below), and during the freeze
  // window we want every subsequent render to see that frozen value so
  // the field doesn't drift while the ball/avatar animate. Mirroring the
  // ref into state would re-introduce a 1-render lag and break the
  // freeze — the stale read is the desired behaviour here.
  const visualMyPossessionPct = suppressCarryoverAttackVisual
    ? 50
    : (freezeActiveAttackField || freezePendingAttackField)
      // eslint-disable-next-line react-hooks/refs -- snapshot read by design (see comment above)
      ? (attackOriginPctRef.current ?? myPossessionPct)
      : myPossessionPct;

  useEffect(() => {
    if (!isAttackAnimationPhase && !hasPendingRoundAttackAnimation) {
      attackOriginQRef.current = null;
      attackOriginPctRef.current = null;
      return;
    }

    const qIndex = roundResult?.qIndex ?? localQuestion?.qIndex ?? null;
    if (qIndex === null) return;
    if (attackOriginQRef.current === qIndex) return;

    attackOriginQRef.current = qIndex;
    attackOriginPctRef.current = visualMyPossessionPct;
  }, [hasPendingRoundAttackAnimation, isAttackAnimationPhase, localQuestion?.qIndex, roundResult?.qIndex, visualMyPossessionPct]);

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
