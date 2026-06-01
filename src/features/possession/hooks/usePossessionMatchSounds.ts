'use client';

import { useEffect, useRef } from 'react';
import type { MatchAnswerAckPayload, MatchRoundResultPayload } from '@/lib/realtime/socket.types';
import { useRealtimeMatchStore, type DevPossessionAnimation } from '@/stores/realtimeMatch.store';
import {
  GOAL_ATTACK_START_DELAY_MS,
  PENALTY_KICK_CONTACT_MS,
  PENALTY_SCORE_FLIGHT_HANDOFF_MS,
} from '../realtimePossession.helpers';
import { getBarBattleGoalAttackDelayMs, resolvePossessionBattlePoints } from './useBarBattle';

type PossessionSfxName = 'whistle' | 'kick' | 'pass' | 'correctRanked';

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

  const correctAnswerSfxKeyRef = useRef<string | null>(null);
  useEffect(() => {
    if (!answerAck?.isCorrect) return;
    const key = `${answerAck.matchId}:${answerAck.qIndex}`;
    if (correctAnswerSfxKeyRef.current === key) return;
    correctAnswerSfxKeyRef.current = key;
    playSfxRef.current('correctRanked');
  }, [answerAck]);

  useEffect(() => {
    if (!roundResult) return;
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
      const playerPoints = resolvePossessionBattlePoints(playerRound, roundResult.questionKind);
      const opponentPoints = resolvePossessionBattlePoints(opponentRound, roundResult.questionKind);
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
      const timer = window.setTimeout(() => playSfxRef.current('kick'), kickDelayMs);
      return () => window.clearTimeout(timer);
    } else {
      playSfxRef.current('pass');
    }
  }, [matchVariant, roundResult, selfUserId]);

  useEffect(() => {
    if (!devPossessionAnimation) return;
    playSfxRef.current('kick');
  }, [devPossessionAnimation]);
}
