'use client';

import { useCallback, useEffect, useRef } from 'react';
import type { MatchAnswerAckPayload, MatchRoundResultPayload } from '@/lib/realtime/socket.types';
import { useRealtimeMatchStore, type DevPossessionAnimation } from '@/stores/realtimeMatch.store';
import {
  GOAL_ATTACK_START_DELAY_MS,
  PENALTY_KICK_CONTACT_MS,
  PENALTY_SCORE_FLIGHT_HANDOFF_MS,
} from '../realtimePossession.helpers';
import {
  getBarBattleGoalAttackDelayMs,
  resolvePossessionBattlePoints,
  shouldUsePossessionPointsForSide,
} from './useBarBattle';

type PossessionSfxName = 'whistle' | 'kick' | 'pass' | 'correctRanked' | 'wrongAnswer';

interface UsePossessionMatchSoundsParams {
  phase: string | undefined;
  answerAck: MatchAnswerAckPayload | null;
  roundResult: MatchRoundResultPayload | null;
  devPossessionAnimation: DevPossessionAnimation | null;
  playSfx: (name: PossessionSfxName) => void;
}

export function usePossessionMatchSounds({
  phase,
  answerAck,
  roundResult,
  devPossessionAnimation,
  playSfx,
}: UsePossessionMatchSoundsParams): void {
  const matchVariant = useRealtimeMatchStore((s) => s.match?.variant);
  const selfUserId = useRealtimeMatchStore((s) => s.selfUserId);
  const mySeat = useRealtimeMatchStore((s) => s.match?.mySeat ?? null);
  const prevPhaseRef = useRef<string | null>(null);
  const playSfxRef = useRef(playSfx);
  useEffect(() => {
    playSfxRef.current = playSfx;
  });

  useEffect(() => {
    if (!phase) return;
    const prevPhase = prevPhaseRef.current;
    prevPhaseRef.current = phase;
    if (!prevPhase || prevPhase === phase) return;
    if (phase === 'HALFTIME' || phase === 'PENALTY_SHOOTOUT') {
      playSfxRef.current('whistle');
    }
  }, [phase]);

  // One answer-result SFX per question: the correct chime when the player got
  // it right, the wrong-answer buzzer when they didn't. Deduped by matchId+qIndex
  // so re-renders / repeated acks don't retrigger it.
  const answerSfxKeyRef = useRef<string | null>(null);
  useEffect(() => {
    if (!answerAck) return;
    const key = `${answerAck.matchId}:${answerAck.qIndex}`;
    if (answerSfxKeyRef.current === key) return;
    answerSfxKeyRef.current = key;
    playSfxRef.current(answerAck.isCorrect ? 'correctRanked' : 'wrongAnswer');
  }, [answerAck]);

  const roundResultSfxKeyRef = useRef<string | null>(null);
  const roundResultSfxTimerRef = useRef<number | null>(null);
  const clearRoundResultSfxTimer = useCallback(() => {
    if (roundResultSfxTimerRef.current === null) return;
    window.clearTimeout(roundResultSfxTimerRef.current);
    roundResultSfxTimerRef.current = null;
  }, []);

  useEffect(() => clearRoundResultSfxTimer, [clearRoundResultSfxTimer]);

  useEffect(() => {
    if (!roundResult) {
      clearRoundResultSfxTimer();
      return;
    }
    const roundResultSfxKey = [
      roundResult.matchId,
      roundResult.qIndex,
      roundResult.phaseKind,
      roundResult.deltas?.goalScoredBySeat ?? 'no-goal',
      roundResult.deltas?.penaltyOutcome ?? 'no-penalty-outcome',
    ].join(':');
    if (roundResultSfxKeyRef.current === roundResultSfxKey) return;
    roundResultSfxKeyRef.current = roundResultSfxKey;
    clearRoundResultSfxTimer();
    const phaseKindForSfx = roundResult.phaseKind;
    if (
      phaseKindForSfx === 'penalty'
      || phaseKindForSfx === 'last_attack'
      || Boolean(roundResult.deltas?.goalScoredBySeat)
    ) {
      const isPenaltyKick = phaseKindForSfx === 'penalty';
      const shouldDelayKick = !isPenaltyKick && (
        phaseKindForSfx === 'last_attack' || Boolean(roundResult.deltas?.goalScoredBySeat)
      );
      // Look up player/opponent by self user id rather than Object.values()
      // ordering — Record key enumeration order is engine-dependent for
      // non-integer keys, so [0]/[1] could swap player and opponent.
      const players = roundResult.players ?? {};
      const playerRound = selfUserId ? players[selfUserId] : undefined;
      const opponentRound = Object.entries(players).find(([userId]) => userId !== selfUserId)?.[1];
      const boostedSeat = roundResult.deltas?.speedStreakBoostedSeat ?? null;
      const playerPoints = resolvePossessionBattlePoints(playerRound, roundResult.questionKind, {
        usePossessionPoints: shouldUsePossessionPointsForSide({
          phaseKind: phaseKindForSfx,
          speedStreakBoostedSeat: boostedSeat,
          mySeat,
          side: 'player',
        }),
      });
      const opponentPoints = resolvePossessionBattlePoints(opponentRound, roundResult.questionKind, {
        usePossessionPoints: shouldUsePossessionPointsForSide({
          phaseKind: phaseKindForSfx,
          speedStreakBoostedSeat: boostedSeat,
          mySeat,
          side: 'opponent',
        }),
      });
      // Penalty kick: roundResult first waits for score-flight handoff before
      // the visible avatar kick starts. Schedule the SFX from raw roundResult
      // to that same eventual contact beat.
      const kickDelayMs = isPenaltyKick
        ? PENALTY_SCORE_FLIGHT_HANDOFF_MS + PENALTY_KICK_CONTACT_MS
        : shouldDelayKick
          ? getBarBattleGoalAttackDelayMs(playerPoints, opponentPoints, GOAL_ATTACK_START_DELAY_MS, {
              includeScoreFlightHandoff: matchVariant === 'ranked_sim',
            })
          : 0;
      roundResultSfxTimerRef.current = window.setTimeout(() => {
        roundResultSfxTimerRef.current = null;
        playSfxRef.current('kick');
      }, kickDelayMs);
    } else {
      playSfxRef.current('pass');
    }
  }, [clearRoundResultSfxTimer, matchVariant, mySeat, roundResult, selfUserId]);

  useEffect(() => {
    if (!devPossessionAnimation) return;
    playSfxRef.current('kick');
  }, [devPossessionAnimation]);
}
