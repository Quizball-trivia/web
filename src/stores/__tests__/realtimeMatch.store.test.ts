import { describe, it, expect, beforeEach } from 'vitest';
import { useRealtimeMatchStore } from '../realtimeMatch.store';
import type {
  MatchRoundResultPayload,
  MatchStatePayload,
  ResolvedMatchQuestionPayload,
} from '@/lib/realtime/socket.types';

// ---------------------------------------------------------------------------
// Helpers — minimal valid payloads
// ---------------------------------------------------------------------------

const MATCH_ID = 'match-1';
const USER_A = 'user-a';
const USER_B = 'user-b';

function seedMatch() {
  const store = useRealtimeMatchStore.getState();
  store.setMatchStart({
    matchId: MATCH_ID,
    mode: 'ranked',
    variant: 'ranked_sim',
    mySeat: 1,
    opponent: { id: USER_B, username: 'opponent', avatarUrl: null },
    participants: [
      { userId: USER_A, username: 'me', avatarUrl: null, seat: 1 },
      { userId: USER_B, username: 'opponent', avatarUrl: null, seat: 2 },
    ],
  });
}

function makeQuestion(qIndex: number, phaseKind: 'normal' | 'last_attack' = 'normal'): ResolvedMatchQuestionPayload {
  return {
    matchId: MATCH_ID,
    qIndex,
    total: 12,
    question: {
      id: `q-${qIndex}`,
      prompt: `Question ${qIndex}`,
      options: ['A', 'B', 'C', 'D'],
      categoryName: 'General',
    } as ResolvedMatchQuestionPayload['question'],
    deadlineAt: new Date(Date.now() + 10_000).toISOString(),
    correctIndex: 0,
    phaseKind,
  };
}

function makeRoundResult(
  qIndex: number,
  opts: {
    phaseKind?: 'normal' | 'last_attack' | 'penalty';
    goalScoredBySeat?: 1 | 2 | null;
    penaltyOutcome?: 'goal' | 'saved' | null;
  } = {}
): MatchRoundResultPayload {
  return {
    matchId: MATCH_ID,
    qIndex,
    correctIndex: 0,
    players: {
      [USER_A]: { totalPoints: 100, pointsEarned: 10, isCorrect: true, timeMs: 3000, selectedIndex: 0 },
      [USER_B]: { totalPoints: 80, pointsEarned: 0, isCorrect: false, timeMs: 5000, selectedIndex: 1 },
    },
    phaseKind: opts.phaseKind ?? 'normal',
    phaseRound: 6,
    deltas: {
      possessionDelta: 10,
      goalScoredBySeat: opts.goalScoredBySeat ?? null,
      penaltyOutcome: opts.penaltyOutcome ?? null,
    },
  };
}

function makeMatchState(
  phase: MatchStatePayload['phase'],
  opts: { stateVersion?: number; half?: 1 | 2 } = {}
): MatchStatePayload {
  return {
    matchId: MATCH_ID,
    phase,
    half: opts.half ?? 1,
    possessionDiff: 55,
    normalQuestionsAnsweredInHalf: 6,
    attackerSeat: 1,
    kickOffSeat: 1,
    goals: { seat1: 1, seat2: 0 },
    penaltyGoals: { seat1: 0, seat2: 0 },
    phaseKind: 'normal',
    phaseRound: 6,
    shooterSeat: null,
    halftime: {
      deadlineAt: null,
      categoryOptions: [],
      firstBanSeat: null,
      bans: { seat1: null, seat2: null },
    },
    stateVersion: opts.stateVersion ?? 1,
  };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('realtimeMatch.store — setMatchState shouldClearQuestion', () => {
  beforeEach(() => {
    useRealtimeMatchStore.getState().reset();
  });

  // -------------------------------------------------------------------------
  // HALFTIME — existing behavior (was already working)
  // -------------------------------------------------------------------------

  describe('HALFTIME phase', () => {
    it('preserves lastRoundResult when round result arrived before halftime state', () => {
      seedMatch();
      const store = useRealtimeMatchStore.getState();

      // Simulate: question is shown, round result arrives, then match:state HALFTIME
      store.setMatchQuestion(makeQuestion(5));
      store.setRoundResult(makeRoundResult(5, { goalScoredBySeat: 1 }));

      // Sanity: round result is stored
      expect(useRealtimeMatchStore.getState().match?.lastRoundResult).not.toBeNull();
      expect(useRealtimeMatchStore.getState().match?.lastRoundResult?.qIndex).toBe(5);

      // match:state HALFTIME arrives
      store.setMatchState(makeMatchState('HALFTIME'));

      const state = useRealtimeMatchStore.getState();
      // lastRoundResult must be preserved for goal animation
      expect(state.match?.lastRoundResult).not.toBeNull();
      expect(state.match?.lastRoundResult?.qIndex).toBe(5);
      expect(state.match?.lastRoundResult?.deltas?.goalScoredBySeat).toBe(1);
      // currentQuestion must also be preserved (needed for roundResult qIndex matching)
      expect(state.match?.currentQuestion).not.toBeNull();
      expect(state.match?.possessionState?.phase).toBe('HALFTIME');
    });

    it('clears state when HALFTIME arrives with no pending round result', () => {
      seedMatch();
      const store = useRealtimeMatchStore.getState();

      store.setMatchQuestion(makeQuestion(0));

      // match:state HALFTIME arrives with no round result pending
      store.setMatchState(makeMatchState('HALFTIME'));

      const state = useRealtimeMatchStore.getState();
      expect(state.match?.currentQuestion).toBeNull();
      expect(state.match?.lastRoundResult).toBeNull();
    });
  });

  // -------------------------------------------------------------------------
  // COMPLETED — the fixed behavior
  // -------------------------------------------------------------------------

  describe('COMPLETED phase', () => {
    it('preserves lastRoundResult when round result arrived before completed state (normal goal)', () => {
      seedMatch();
      const store = useRealtimeMatchStore.getState();

      // 2nd half, 6th question, normal goal → COMPLETED
      store.setMatchQuestion(makeQuestion(11));
      store.setRoundResult(makeRoundResult(11, { phaseKind: 'normal', goalScoredBySeat: 1 }));

      expect(useRealtimeMatchStore.getState().match?.lastRoundResult?.qIndex).toBe(11);

      store.setMatchState(makeMatchState('COMPLETED', { stateVersion: 2, half: 2 }));

      const state = useRealtimeMatchStore.getState();
      // Must be preserved — goal animation + hold timer depend on it
      expect(state.match?.lastRoundResult).not.toBeNull();
      expect(state.match?.lastRoundResult?.qIndex).toBe(11);
      expect(state.match?.lastRoundResult?.deltas?.goalScoredBySeat).toBe(1);
      expect(state.match?.currentQuestion).not.toBeNull();
      expect(state.match?.possessionState?.phase).toBe('COMPLETED');
    });

    it('preserves lastRoundResult when round result arrived before completed state (last_attack goal)', () => {
      seedMatch();
      const store = useRealtimeMatchStore.getState();

      // 2nd half, last attack (7th question), goal → COMPLETED
      store.setMatchQuestion(makeQuestion(12, 'last_attack'));
      store.setRoundResult(makeRoundResult(12, { phaseKind: 'last_attack', goalScoredBySeat: 2 }));

      store.setMatchState(makeMatchState('COMPLETED', { stateVersion: 2, half: 2 }));

      const state = useRealtimeMatchStore.getState();
      expect(state.match?.lastRoundResult).not.toBeNull();
      expect(state.match?.lastRoundResult?.phaseKind).toBe('last_attack');
      expect(state.match?.lastRoundResult?.deltas?.goalScoredBySeat).toBe(2);
      expect(state.match?.currentQuestion?.phaseKind).toBe('last_attack');
      expect(state.match?.possessionState?.phase).toBe('COMPLETED');
    });

    it('preserves lastRoundResult for non-goal completion (no goal but round result exists)', () => {
      seedMatch();
      const store = useRealtimeMatchStore.getState();

      // Last attack question, attacker got it wrong (no goal), match ends
      store.setMatchQuestion(makeQuestion(12, 'last_attack'));
      store.setRoundResult(makeRoundResult(12, { phaseKind: 'last_attack', goalScoredBySeat: null }));

      store.setMatchState(makeMatchState('COMPLETED', { stateVersion: 2, half: 2 }));

      const state = useRealtimeMatchStore.getState();
      // Even without a goal, the round result is preserved (for result display timing)
      expect(state.match?.lastRoundResult).not.toBeNull();
      expect(state.match?.lastRoundResult?.deltas?.goalScoredBySeat).toBeNull();
    });

    it('clears state when COMPLETED arrives with no pending round result (e.g. reconnect)', () => {
      seedMatch();
      const store = useRealtimeMatchStore.getState();

      // No round result has been set — simulates a reconnect where only match:state arrives
      store.setMatchState(makeMatchState('COMPLETED', { stateVersion: 2, half: 2 }));

      const state = useRealtimeMatchStore.getState();
      expect(state.match?.currentQuestion).toBeNull();
      expect(state.match?.lastRoundResult).toBeNull();
      expect(state.match?.possessionState?.phase).toBe('COMPLETED');
    });

    it('preserves lastRoundResult for penalty goal completion', () => {
      seedMatch();
      const store = useRealtimeMatchStore.getState();

      // Penalty round, goal scored → COMPLETED
      store.setMatchQuestion(makeQuestion(14));
      store.setRoundResult(
        makeRoundResult(14, { phaseKind: 'penalty', goalScoredBySeat: 1, penaltyOutcome: 'goal' })
      );

      store.setMatchState(makeMatchState('COMPLETED', { stateVersion: 3, half: 2 }));

      const state = useRealtimeMatchStore.getState();
      expect(state.match?.lastRoundResult).not.toBeNull();
      expect(state.match?.lastRoundResult?.deltas?.penaltyOutcome).toBe('goal');
    });
  });

  // -------------------------------------------------------------------------
  // NORMAL_PLAY — should never clear question state
  // -------------------------------------------------------------------------

  describe('NORMAL_PLAY phase', () => {
    it('never clears question state during normal play', () => {
      seedMatch();
      const store = useRealtimeMatchStore.getState();

      store.setMatchQuestion(makeQuestion(3));
      store.setRoundResult(makeRoundResult(3, { goalScoredBySeat: null }));

      store.setMatchState(makeMatchState('NORMAL_PLAY', { stateVersion: 2 }));

      const state = useRealtimeMatchStore.getState();
      expect(state.match?.lastRoundResult).not.toBeNull();
      expect(state.match?.currentQuestion).not.toBeNull();
    });
  });

  // -------------------------------------------------------------------------
  // Stale state version rejection (unrelated, but ensures we don't regress)
  // -------------------------------------------------------------------------

  describe('stateVersion ordering', () => {
    it('rejects stale match:state with lower version', () => {
      seedMatch();
      const store = useRealtimeMatchStore.getState();

      store.setMatchState(makeMatchState('NORMAL_PLAY', { stateVersion: 5 }));
      expect(useRealtimeMatchStore.getState().match?.possessionState?.phase).toBe('NORMAL_PLAY');

      // Stale state with lower version should be ignored
      store.setMatchState(makeMatchState('COMPLETED', { stateVersion: 3 }));
      expect(useRealtimeMatchStore.getState().match?.possessionState?.phase).toBe('NORMAL_PLAY');
    });
  });
});
