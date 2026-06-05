import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { MatchRoundResultPayload } from '@/lib/realtime/socket.types';
import {
  PENALTY_KICK_CONTACT_MS,
  PENALTY_SCORE_FLIGHT_HANDOFF_MS,
} from '../../realtimePossession.helpers';
import { usePossessionMatchSounds } from '../usePossessionMatchSounds';

function makePenaltyRoundResult(qIndex = 13): MatchRoundResultPayload {
  return {
    matchId: 'match-1',
    qIndex,
    questionKind: 'multipleChoice',
    reveal: {
      kind: 'multipleChoice',
      correctIndex: 0,
    },
    players: {},
    phaseKind: 'penalty',
    phaseRound: 1,
    shooterSeat: 1,
    attackerSeat: null,
    deltas: {
      possessionDelta: 0,
      penaltyOutcome: 'goal',
      goalScoredBySeat: 1,
    },
  };
}

describe('usePossessionMatchSounds', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('does not duplicate a delayed penalty kick sound when the same round result is re-emitted', () => {
    const playSfx = vi.fn();
    const { rerender } = renderHook((props: { roundResult: MatchRoundResultPayload | null }) => {
      usePossessionMatchSounds({
        phase: 'PENALTY_SHOOTOUT',
        answerAck: null,
        roundResult: props.roundResult,
        devPossessionAnimation: null,
        playSfx,
      });
    }, {
      initialProps: {
        roundResult: null as MatchRoundResultPayload | null,
      },
    });

    rerender({ roundResult: makePenaltyRoundResult() });
    rerender({ roundResult: makePenaltyRoundResult() });

    act(() => {
      vi.advanceTimersByTime(PENALTY_SCORE_FLIGHT_HANDOFF_MS + PENALTY_KICK_CONTACT_MS + 1);
    });

    expect(playSfx).toHaveBeenCalledTimes(1);
    expect(playSfx).toHaveBeenCalledWith('kick');
  });
});
