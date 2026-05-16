'use client';

import { useEffect, useRef } from 'react';
import type { MatchRoundResultPayload } from '@/lib/realtime/socket.types';
import type { DevPossessionAnimation } from '@/stores/realtimeMatch.store';
import { GOAL_ATTACK_START_DELAY_MS } from '../realtimePossession.helpers';

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
      const shouldDelayKick = phaseKindForSfx !== 'penalty' && (
        phaseKindForSfx === 'last_attack' || Boolean(roundResult.deltas?.goalScoredBySeat)
      );
      const timer = window.setTimeout(
        () => playSfxRef.current('kick'),
        shouldDelayKick ? GOAL_ATTACK_START_DELAY_MS : 0
      );
      return () => window.clearTimeout(timer);
    } else {
      playSfxRef.current('pass');
    }
  }, [roundResult]);

  useEffect(() => {
    if (!devPossessionAnimation) return;
    playSfxRef.current('kick');
  }, [devPossessionAnimation]);
}
