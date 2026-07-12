import { describe, expect, it } from 'vitest';
import { useRealtimeMatchStore } from '../../realtimeMatch.store';
import { selectDraftCountdownSeconds, selectHasResolvedRound } from '../selectors';

describe('selectDraftCountdownSeconds', () => {
  it('counts down from the authoritative 16-second turn deadline as a 15..0 UI clock', () => {
    expect(selectDraftCountdownSeconds({
      draft: { forceAtMs: 116_000, turnAnchorMs: 100_000 },
    }, 100_000)).toBe(15);

    expect(selectDraftCountdownSeconds({
      draft: { forceAtMs: 116_000, turnAnchorMs: 100_000 },
    }, 104_001)).toBe(11);
  });

  it('falls back to 15 seconds when the deadline is absent', () => {
    expect(selectDraftCountdownSeconds({ draft: {} }, 100_000)).toBe(15);
  });
});

function seedMatch() {
  useRealtimeMatchStore.getState().setSelfUserId('u1');
  useRealtimeMatchStore.getState().setMatchStart({
    matchId: 'match-1',
    mode: 'ranked',
    variant: 'ranked_sim',
    mySeat: 1,
    opponent: { id: 'u2', username: 'Opponent', avatarUrl: null },
    participants: [
      { userId: 'u1', username: 'Me', avatarUrl: null, seat: 1 },
      { userId: 'u2', username: 'Opponent', avatarUrl: null, seat: 2 },
    ],
  });
}

describe('selectHasResolvedRound', () => {
  it('stays false when q0 has started but has no round result', () => {
    useRealtimeMatchStore.getState().reset();
    seedMatch();
    useRealtimeMatchStore.getState().setMatchQuestion({
      matchId: 'match-1',
      qIndex: 0,
      total: 12,
      question: {
        kind: 'multipleChoice',
        id: 'q-0',
        prompt: 'Question 0',
        options: ['A', 'B'],
        categoryName: 'General',
      },
      correctIndex: 0,
      deadlineAt: new Date(Date.now() + 10_000).toISOString(),
    });

    expect(selectHasResolvedRound(useRealtimeMatchStore.getState())).toBe(false);
  });

  it('stays true after a resolved result is no longer the current result', () => {
    useRealtimeMatchStore.getState().reset();
    seedMatch();
    const store = useRealtimeMatchStore.getState();
    store.setMatchQuestion({
      matchId: 'match-1',
      qIndex: 0,
      total: 12,
      question: {
        kind: 'multipleChoice',
        id: 'q-0',
        prompt: 'Question 0',
        options: ['A', 'B'],
        categoryName: 'General',
      },
      deadlineAt: new Date(Date.now() + 10_000).toISOString(),
    });
    store.setRoundResult({
      matchId: 'match-1',
      qIndex: 0,
      questionKind: 'multipleChoice',
      reveal: { kind: 'multipleChoice', correctIndex: 0 },
      players: {
        u1: { totalPoints: 10, pointsEarned: 10, isCorrect: true, timeMs: 1000, selectedIndex: 0, submittedOrderIds: [] },
        u2: { totalPoints: 0, pointsEarned: 0, isCorrect: false, timeMs: 2000, selectedIndex: 1, submittedOrderIds: [] },
      },
      phaseKind: 'normal',
      phaseRound: 1,
      deltas: { possessionDelta: 10, goalScoredBySeat: null, penaltyOutcome: null },
    });

    expect(selectHasResolvedRound(useRealtimeMatchStore.getState())).toBe(true);

    useRealtimeMatchStore.setState((state) => ({
      match: state.match ? { ...state.match, lastRoundResult: null } : null,
    }));

    expect(selectHasResolvedRound(useRealtimeMatchStore.getState())).toBe(true);
  });
});
