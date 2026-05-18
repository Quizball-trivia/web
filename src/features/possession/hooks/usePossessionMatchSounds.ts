'use client';

import { useEffect, useRef } from 'react';
import type { MatchRoundResultPayload } from '@/lib/realtime/socket.types';
import { useRealtimeMatchStore, type DevPossessionAnimation } from '@/stores/realtimeMatch.store';
import {
  GOAL_ATTACK_START_DELAY_MS,
  PENALTY_KICK_CONTACT_MS,
  PENALTY_SCORE_FLIGHT_HANDOFF_MS,
} from '../realtimePossession.helpers';
import { getBarBattleGoalAttackDelayMs, resolveBattlePoints } from './useBarBattle';

type PossessionSfxName = 'whistle' | 'kick' | 'pass';

interface UsePossessionMatchSoundsParams {
  phase: string | undefined;
  roundResult: MatchRoundResultPayload | null;
  devPossessionAnimation: DevPossessionAnimation | null;
  playSfx: (name: PossessionSfxName) => void;
}

export function usePossessionMatchSounds({
  phase,
  roundResult,
  devPossessionAnimation,
  playSfx,
}: UsePossessionMatchSoundsParams): void {
  const matchVariant = useRealtimeMatchStore((s) => s.match?.variant);
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
      const roundPlayers = Object.values(roundResult.players ?? {});
      const playerPoints = resolveBattlePoints(
        roundPlayers[0]?.pointsEarned ?? 0,
        roundResult.questionKind,
        roundPlayers[0]?.foundCount
      );
      const opponentPoints = resolveBattlePoints(
        roundPlayers[1]?.pointsEarned ?? 0,
        roundResult.questionKind,
        roundPlayers[1]?.foundCount
      );
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
  }, [matchVariant, roundResult]);

  useEffect(() => {
    if (!devPossessionAnimation) return;
    playSfxRef.current('kick');
  }, [devPossessionAnimation]);
}
