import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useRankedMatchmakingStore } from '../rankedMatchmaking.store';

vi.mock('@/lib/analytics/game-events', () => ({
  trackMatchmakingStarted: vi.fn(),
  trackMatchmakingHumanFound: vi.fn(),
  trackMatchmakingAiFallback: vi.fn(),
  trackMatchmakingCancelled: vi.fn(),
}));

function resetRankedStore() {
  useRankedMatchmakingStore.setState({
    rankedSearchDurationMs: null,
    rankedSearchStartedAt: null,
    rankedFoundOpponent: null,
    rankedFoundMyRecentForm: null,
    rankedSearching: false,
    rankedCancelRequestedAt: null,
    rankedQueueLeftAt: null,
    rankedQueueLeftSeq: 0,
    rankedQueueLeftSource: null,
  });
}

describe('rankedMatchmaking.store', () => {
  beforeEach(() => {
    resetRankedStore();
  });

  it('ignores late search and match-found events after local cancel', () => {
    const store = useRankedMatchmakingStore.getState();

    store.markRankedSearchRequested();
    store.setRankedSearchStarted({ durationMs: 7000 });
    expect(useRankedMatchmakingStore.getState().rankedSearching).toBe(true);

    useRankedMatchmakingStore.getState().markRankedCancelRequested();
    const cancelledAt = useRankedMatchmakingStore.getState().rankedCancelRequestedAt;

    useRankedMatchmakingStore.getState().setRankedSearchStarted({ durationMs: 5000 });
    useRankedMatchmakingStore.getState().setRankedMatchFound({
      opponent: { id: 'opp-late', username: 'Late Opponent', avatarUrl: null },
    });

    expect(useRankedMatchmakingStore.getState().rankedCancelRequestedAt).toBe(cancelledAt);
    expect(useRankedMatchmakingStore.getState().rankedSearching).toBe(false);
    expect(useRankedMatchmakingStore.getState().rankedFoundOpponent).toBeNull();
  });

  it('accepts match-found again after a new ranked search request', () => {
    const store = useRankedMatchmakingStore.getState();

    store.markRankedCancelRequested();
    useRankedMatchmakingStore.getState().markRankedSearchRequested();
    useRankedMatchmakingStore.getState().setRankedSearchStarted({ durationMs: 7000 });
    useRankedMatchmakingStore.getState().setRankedMatchFound({
      opponent: { id: 'opp-new', username: 'New Opponent', avatarUrl: null },
      myRecentForm: ['W', 'L', 'D'],
    });

    const state = useRankedMatchmakingStore.getState();
    expect(state.rankedCancelRequestedAt).toBeNull();
    expect(state.rankedSearching).toBe(false);
    expect(state.rankedFoundOpponent?.id).toBe('opp-new');
    expect(state.rankedFoundMyRecentForm).toEqual(['W', 'L', 'D']);
  });

  it('records server queue-left separately from local cancel state', () => {
    const store = useRankedMatchmakingStore.getState();

    store.setRankedQueueLeft('server_event');

    const state = useRankedMatchmakingStore.getState();
    expect(state.rankedQueueLeftAt).toEqual(expect.any(Number));
    expect(state.rankedQueueLeftSeq).toBe(1);
    expect(state.rankedQueueLeftSource).toBe('server_event');
    expect(state.rankedCancelRequestedAt).toEqual(expect.any(Number));
  });
});
