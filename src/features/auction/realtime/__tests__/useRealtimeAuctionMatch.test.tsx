import { act, renderHook, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type {
  PublicAuctionFormation,
  PublicAuctionMatchState,
  PublicAuctionPlayer,
  PublicAuctionRoundState,
} from '@/lib/realtime/socket.types';
import { useRealtimeAuctionMatch } from '../useRealtimeAuctionMatch';

type Handler = (payload?: unknown) => void;

const socketMock = vi.hoisted(() => {
  const handlers = new Map<string, Set<Handler>>();
  const emit = vi.fn();
  const socket = {
    connected: true,
    id: 'socket-1',
    on: vi.fn((event: string, handler: Handler) => {
      const entries = handlers.get(event) ?? new Set<Handler>();
      entries.add(handler);
      handlers.set(event, entries);
      return socket;
    }),
    off: vi.fn((event: string, handler: Handler) => {
      handlers.get(event)?.delete(handler);
      return socket;
    }),
    emit,
  };

  return {
    socket,
    emit,
    reset: () => {
      handlers.clear();
      emit.mockReset();
      socket.on.mockClear();
      socket.off.mockClear();
      socket.connected = true;
    },
    trigger: (event: string, payload?: unknown) => {
      handlers.get(event)?.forEach((handler) => handler(payload));
    },
  };
});

const reconnectSocketMock = vi.hoisted(() => vi.fn());
const loggerWarnMock = vi.hoisted(() => vi.fn());

vi.mock('@/lib/realtime/useRealtimeConnection', () => ({
  useRealtimeConnection: () => socketMock.socket,
}));

vi.mock('@/lib/realtime/socket-client', () => ({
  reconnectSocket: reconnectSocketMock,
}));

vi.mock('@/utils/logger', () => ({
  logger: {
    warn: loggerWarnMock,
    info: vi.fn(),
  },
}));

const formation: PublicAuctionFormation = {
  name: '2-2-2',
  required: { GK: 1, DEF: 4, MID: 3, FWD: 3 },
  rows: [
    { pos: 'FWD', count: 3 },
    { pos: 'MID', count: 3 },
    { pos: 'DEF', count: 4 },
    { pos: 'GK', count: 1 },
  ],
};

function player(seatId: string, displayName: string, userId: string | null): PublicAuctionPlayer {
  return {
    seatId,
    userId,
    displayName,
    isBot: userId === null,
    budget: 1_000_000_000,
    team: {
      formation,
      slots: { GK: [], DEF: [], MID: [], FWD: [] },
    },
    isEliminated: false,
  };
}

function round(overrides: Partial<PublicAuctionRoundState> = {}): PublicAuctionRoundState {
  return {
    roundId: 'round-1',
    roundIndex: 1,
    positionGroup: 'FWD',
    footballer: {
      positionGroup: 'FWD',
      startingPrice: 20_000_000,
      clues: [],
    },
    clueRevealIndex: 0,
    bids: [],
    highestBidderSeatId: null,
    highestBid: 0,
    startingPrice: 20_000_000,
    winnerSeatId: null,
    winningBid: 0,
    revealed: false,
    turnOrder: ['seat-human', 'seat-bot-1'],
    currentTurnSeatId: null,
    foldedSeatIds: [],
    turnEndsAt: null,
    biddingStartsAt: null,
    startedAt: '2026-06-20T10:00:00.000Z',
    updatedAt: '2026-06-20T10:00:00.000Z',
    revealedClues: [],
    ...overrides,
  };
}

function matchState(overrides: Partial<PublicAuctionMatchState> = {}): PublicAuctionMatchState {
  return {
    matchId: 'match-1',
    version: 1,
    locale: 'en',
    phase: 'clue_reveal',
    formation: '2-2-2',
    seats: [
      player('seat-human', 'You', 'user-1'),
      player('seat-bot-1', 'Bot 1', null),
      player('seat-bot-2', 'Bot 2', null),
    ],
    currentRound: round(),
    completedRounds: [],
    soloPick: null,
    usedClueCardIds: [],
    rankings: null,
    createdAt: '2026-06-20T10:00:00.000Z',
    updatedAt: '2026-06-20T10:00:00.000Z',
    ...overrides,
  };
}

describe('useRealtimeAuctionMatch', () => {
  beforeEach(() => {
    socketMock.reset();
    reconnectSocketMock.mockClear();
    loggerWarnMock.mockClear();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('starts an AI auction match after the post-connect hydration grace window', () => {
    vi.useFakeTimers();

    renderHook(() => useRealtimeAuctionMatch({
      enabled: true,
      selfUserId: 'user-1',
      locale: 'en',
      formation: '2-2-2',
      humanAvatarSeed: 'avatar-1',
    }));

    expect(socketMock.emit).not.toHaveBeenCalledWith('auction:start_ai_match', { locale: 'en', formation: '2-2-2' });

    act(() => {
      vi.advanceTimersByTime(499);
    });
    expect(socketMock.emit).not.toHaveBeenCalledWith('auction:start_ai_match', { locale: 'en', formation: '2-2-2' });

    act(() => {
      vi.advanceTimersByTime(1);
    });
    expect(socketMock.emit).toHaveBeenCalledWith('auction:start_ai_match', { locale: 'en', formation: '2-2-2' });
  });

  it('starts live matchmaking in search mode instead of starting an immediate AI match', () => {
    vi.useFakeTimers();

    renderHook(() => useRealtimeAuctionMatch({
      enabled: true,
      autoStart: true,
      matchmakingMode: 'search',
      selfUserId: 'user-1',
      locale: 'en',
      formation: '2-2-2',
      humanAvatarSeed: 'avatar-1',
    }));

    act(() => {
      vi.advanceTimersByTime(500);
    });

    expect(socketMock.emit).toHaveBeenCalledWith('auction:search_start', { locale: 'en', formation: '2-2-2' });
    expect(socketMock.emit).not.toHaveBeenCalledWith('auction:start_ai_match', { locale: 'en', formation: '2-2-2' });
  });

  it('attaches to an existing match instead of queueing when entered from a lobby', () => {
    vi.useFakeTimers();

    renderHook(() => useRealtimeAuctionMatch({
      enabled: true,
      autoStart: true,
      matchmakingMode: 'search',
      attachMatchId: 'lobby-match-1',
      selfUserId: 'user-1',
      locale: 'en',
      formation: '2-2-2',
      humanAvatarSeed: 'avatar-1',
    }));

    expect(socketMock.emit).toHaveBeenCalledWith('auction:rejoin', { matchId: 'lobby-match-1' });

    act(() => {
      vi.advanceTimersByTime(2000);
    });

    // The autoStart search timer must never fire for a lobby hand-off — the
    // player already has a match, a second search would be a duplicate queue.
    expect(socketMock.emit).not.toHaveBeenCalledWith('auction:search_start', { locale: 'en', formation: '2-2-2' });
  });

  it('re-attaches rather than re-queueing when the socket reconnects after a lobby hand-off', () => {
    vi.useFakeTimers();

    renderHook(() => useRealtimeAuctionMatch({
      enabled: true,
      autoStart: true,
      matchmakingMode: 'search',
      attachMatchId: 'lobby-match-1',
      selfUserId: 'user-1',
      locale: 'en',
      formation: '2-2-2',
      humanAvatarSeed: 'avatar-1',
    }));

    socketMock.emit.mockClear();

    act(() => {
      socketMock.trigger('connect');
    });

    expect(socketMock.emit).toHaveBeenCalledWith('auction:rejoin', { matchId: 'lobby-match-1' });
    expect(socketMock.emit).not.toHaveBeenCalledWith('auction:search_start', { locale: 'en', formation: '2-2-2' });
  });

  it('updates search status from auction matchmaking events', () => {
    const { result } = renderHook(() => useRealtimeAuctionMatch({
      enabled: true,
      autoStart: false,
      matchmakingMode: 'search',
      selfUserId: 'user-1',
      locale: 'en',
      formation: '2-2-2',
      humanAvatarSeed: 'avatar-1',
    }));

    act(() => {
      result.current.actions.startGame();
      socketMock.trigger('auction:search_start', {
        searchId: 'search-1',
        locale: 'en',
        queuedUserCount: 1,
        seatsNeeded: 2,
        fallbackAt: '2026-06-20T10:00:12.000Z',
      });
      socketMock.trigger('auction:search_status', {
        searchId: 'search-1',
        locale: 'en',
        queuedUserCount: 2,
        seatsNeeded: 1,
        fallbackAt: '2026-06-20T10:00:12.000Z',
      });
    });

    expect(result.current.search).toMatchObject({
      phase: 'queued',
      searchId: 'search-1',
      queuedUserCount: 2,
      seatsNeeded: 1,
    });
  });

  it('tracks match_found and then reuses match_started hydration for the auction flow', () => {
    const { result } = renderHook(() => useRealtimeAuctionMatch({
      enabled: true,
      autoStart: false,
      matchmakingMode: 'search',
      selfUserId: 'user-1',
      locale: 'en',
      formation: '2-2-2',
      humanAvatarSeed: 'avatar-1',
    }));

    act(() => {
      result.current.actions.startGame();
      socketMock.trigger('auction:search_start', {
        searchId: 'search-1',
        locale: 'en',
        queuedUserCount: 1,
        seatsNeeded: 2,
        fallbackAt: '2026-06-20T10:00:12.000Z',
      });
      socketMock.trigger('auction:match_found', {
        matchId: 'match-1',
        humanUserIds: ['user-1', 'user-2'],
        botCount: 1,
        locale: 'en',
        formation: '2-2-2',
      });
    });

    expect(result.current.search).toMatchObject({
      phase: 'match_found',
      queuedUserCount: 2,
      botCount: 1,
    });
    expect(result.current.matchId).toBeNull();

    act(() => {
      socketMock.trigger('auction:match_started', {
        matchId: 'match-1',
        locale: 'en',
        state: matchState({
          version: 1,
          phase: 'bidding',
          currentRound: round({ currentTurnSeatId: 'seat-human' }),
        }),
      });
    });

    expect(result.current.search).toBeNull();
    expect(result.current.matchId).toBe('match-1');
    expect(result.current.state?.phase).toBe('bidding');
  });

  it('holds a found lineup and ignores a late search echo that would downgrade it', () => {
    const { result } = renderHook(() => useRealtimeAuctionMatch({
      enabled: true,
      autoStart: true,
      matchmakingMode: 'search',
      selfUserId: 'user-1',
      locale: 'en',
      formation: '2-2-2',
      humanAvatarSeed: 'avatar-1',
    }));

    act(() => {
      result.current.actions.startGame();
      socketMock.trigger('auction:search_status', {
        searchId: 'search-1',
        locale: 'en',
        queuedUserCount: 3,
        seatsNeeded: 0,
        fallbackAt: '2026-06-20T10:00:12.000Z',
      });
      socketMock.trigger('auction:match_found', {
        matchId: 'match-1',
        humanUserIds: ['user-1', 'user-2', 'user-3'],
        botCount: 0,
        locale: 'en',
        formation: '2-2-2',
      });
    });

    expect(result.current.search).toMatchObject({ phase: 'match_found', queuedUserCount: 3 });
    const searchStartsBeforeReconnect = socketMock.emit.mock.calls.filter(
      ([event]) => event === 'auction:search_start',
    ).length;

    // A reconnect re-runs search on the server, which echoes a fresh low count.
    // It must NOT regress the found lineup back to a partial searching state.
    act(() => {
      socketMock.socket.connected = false;
      socketMock.trigger('disconnect');
      socketMock.socket.connected = true;
      socketMock.trigger('connect');
      socketMock.trigger('auction:search_start', {
        searchId: 'search-1',
        locale: 'en',
        queuedUserCount: 1,
        seatsNeeded: 2,
        fallbackAt: '2026-06-20T10:00:12.000Z',
      });
      socketMock.trigger('auction:search_status', {
        searchId: 'search-1',
        locale: 'en',
        queuedUserCount: 1,
        seatsNeeded: 2,
        fallbackAt: '2026-06-20T10:00:12.000Z',
      });
    });

    expect(result.current.search).toMatchObject({ phase: 'match_found', queuedUserCount: 3 });
    // Reconnect while a match is found must not re-queue (only re-hydrate state).
    const searchStartsAfterReconnect = socketMock.emit.mock.calls.filter(
      ([event]) => event === 'auction:search_start',
    ).length;
    expect(searchStartsAfterReconnect).toBe(searchStartsBeforeReconnect);
  });

  it('re-attaches to a found match on reconnect via auction:rejoin instead of re-queuing', () => {
    const { result } = renderHook(() => useRealtimeAuctionMatch({
      enabled: true,
      autoStart: true,
      matchmakingMode: 'search',
      selfUserId: 'user-1',
      locale: 'en',
      formation: '2-2-2',
      humanAvatarSeed: 'avatar-1',
    }));

    act(() => {
      result.current.actions.startGame();
      socketMock.trigger('auction:match_found', {
        matchId: 'match-1',
        humanUserIds: ['user-1', 'user-2', 'user-3'],
        botCount: 0,
        locale: 'en',
        formation: '2-2-2',
      });
    });

    expect(result.current.search).toMatchObject({ phase: 'match_found' });
    socketMock.emit.mockClear();

    // The routine socket swap at match entry: the old socket drops, a fresh one
    // connects. It must re-attach to the match room (auction:rejoin), NOT re-run
    // the search — otherwise the server sees no replacement, arms grace, and
    // pushes a spurious "you disconnected, return?" prompt.
    act(() => {
      socketMock.socket.connected = false;
      socketMock.trigger('disconnect');
      socketMock.socket.connected = true;
      socketMock.trigger('connect');
    });

    expect(socketMock.emit).toHaveBeenCalledWith('auction:rejoin', { matchId: 'match-1' });
    expect(socketMock.emit).not.toHaveBeenCalledWith(
      'auction:search_start',
      expect.anything(),
    );
    expect(result.current.search).toMatchObject({ phase: 'match_found' });
  });

  it('cancels live matchmaking and ignores stale match_found hydration after cancel', () => {
    const { result } = renderHook(() => useRealtimeAuctionMatch({
      enabled: true,
      autoStart: false,
      matchmakingMode: 'search',
      selfUserId: 'user-1',
      locale: 'en',
      formation: '2-2-2',
      humanAvatarSeed: 'avatar-1',
    }));

    act(() => {
      result.current.actions.startGame();
      socketMock.trigger('auction:search_start', {
        searchId: 'search-1',
        locale: 'en',
        queuedUserCount: 1,
        seatsNeeded: 2,
        fallbackAt: '2026-06-20T10:00:12.000Z',
      });
      result.current.actions.cancelSearch?.();
      socketMock.trigger('auction:match_found', {
        matchId: 'match-late',
        humanUserIds: ['user-1', 'user-2', 'user-3'],
        botCount: 0,
        locale: 'en',
        formation: '2-2-2',
      });
      socketMock.trigger('auction:match_started', {
        matchId: 'match-late',
        locale: 'en',
        state: matchState({ matchId: 'match-late', version: 1 }),
      });
    });

    expect(socketMock.emit).toHaveBeenCalledWith('auction:search_cancel');
    expect(result.current.search).toMatchObject({ phase: 'cancelled' });
    expect(result.current.matchId).toBeNull();
    expect(result.current.state).toBeNull();
  });

  it('blocks duplicate auction matchmaking queue requests', () => {
    const { result } = renderHook(() => useRealtimeAuctionMatch({
      enabled: true,
      autoStart: false,
      matchmakingMode: 'search',
      selfUserId: 'user-1',
      locale: 'en',
      formation: '2-2-2',
      humanAvatarSeed: 'avatar-1',
    }));

    act(() => {
      result.current.actions.startGame();
      result.current.actions.startGame();
    });

    expect(socketMock.emit.mock.calls.filter(([event]) => event === 'auction:search_start')).toEqual([
      ['auction:search_start', { locale: 'en', formation: '2-2-2' }],
    ]);
  });

  it('reasserts auction matchmaking search after a socket reconnect while queued', () => {
    const { result } = renderHook(() => useRealtimeAuctionMatch({
      enabled: true,
      autoStart: true,
      matchmakingMode: 'search',
      selfUserId: 'user-1',
      locale: 'en',
      formation: '2-2-2',
      humanAvatarSeed: 'avatar-1',
    }));

    act(() => {
      result.current.actions.startGame();
      socketMock.trigger('auction:search_start', {
        searchId: 'search-1',
        locale: 'en',
        queuedUserCount: 1,
        seatsNeeded: 2,
        fallbackAt: '2026-06-20T10:00:12.000Z',
      });
    });

    expect(socketMock.emit.mock.calls.filter(([event]) => event === 'auction:search_start')).toHaveLength(1);

    act(() => {
      socketMock.socket.connected = false;
      socketMock.trigger('disconnect');
      socketMock.socket.connected = true;
      socketMock.trigger('connect');
    });

    expect(socketMock.emit.mock.calls.filter(([event]) => event === 'auction:search_start')).toHaveLength(2);
  });

  it('does not start a duplicate match when reconnect hydration arrives first', () => {
    vi.useFakeTimers();

    const { result } = renderHook(() => useRealtimeAuctionMatch({
      enabled: true,
      selfUserId: 'user-1',
      locale: 'en',
      formation: '2-2-2',
      humanAvatarSeed: 'avatar-1',
    }));

    act(() => {
      socketMock.trigger('auction:state', {
        matchId: 'match-1',
        state: matchState(),
        stateVersion: 1,
      });
    });
    expect(result.current.matchId).toBe('match-1');

    act(() => {
      vi.advanceTimersByTime(500);
    });
    expect(socketMock.emit).not.toHaveBeenCalledWith('auction:start_ai_match', { locale: 'en', formation: '2-2-2' });
  });

  it('hydrates updated state after reconnect without starting a duplicate match', () => {
    vi.useFakeTimers();

    const { result } = renderHook(() => useRealtimeAuctionMatch({
      enabled: true,
      selfUserId: 'user-1',
      locale: 'en',
      formation: '2-2-2',
      humanAvatarSeed: 'avatar-1',
    }));

    act(() => {
      socketMock.trigger('auction:match_started', {
        matchId: 'match-1',
        locale: 'en',
        state: matchState(),
      });
    });
    expect(result.current.matchId).toBe('match-1');

    act(() => {
      socketMock.socket.connected = false;
      socketMock.trigger('disconnect');
    });
    expect(result.current.status).toBe('connecting');

    act(() => {
      socketMock.socket.connected = true;
      socketMock.trigger('connect');
      socketMock.trigger('auction:state', {
        matchId: 'match-1',
        state: matchState({
          version: 2,
          phase: 'bidding',
          currentRound: round({
            currentTurnSeatId: 'seat-bot-1',
            turnEndsAt: '2026-06-20T10:00:08.000Z',
          }),
        }),
        stateVersion: 2,
      });
      vi.advanceTimersByTime(500);
    });

    expect(result.current.status).toBe('playing');
    expect(result.current.state?.phase).toBe('bidding');
    expect(result.current.state?.currentRound?.currentTurnId).toBe('seat-bot-1');
    expect(socketMock.emit).not.toHaveBeenCalledWith('auction:start_ai_match', { locale: 'en', formation: '2-2-2' });
  });

  it('applies auction pause state and clears it on resume hydration', () => {
    const { result } = renderHook(() => useRealtimeAuctionMatch({
      enabled: true,
      selfUserId: 'user-1',
      locale: 'en',
      formation: '2-2-2',
      humanAvatarSeed: 'avatar-1',
    }));

    const pausedState = matchState({
      version: 2,
      phase: 'bidding',
      currentRound: round({
        currentTurnSeatId: 'seat-human',
        turnEndsAt: '2026-06-20T10:00:30.000Z',
      }),
    });

    act(() => {
      socketMock.trigger('auction:paused', {
        matchId: 'match-1',
        seatId: 'seat-human',
        userId: 'user-1',
        pauseUntil: '2026-06-20T10:00:30.000Z',
        graceMs: 30_000,
        remainingReconnects: 2,
        reason: 'disconnect',
        state: pausedState,
        stateVersion: 2,
        serverNow: '2026-06-20T10:00:00.000Z',
      });
    });

    expect(result.current.state?.phase).toBe('bidding');
    expect(result.current.state?.currentRound?.currentTurnId).toBe('seat-human');
    expect(result.current.pause).toMatchObject({
      matchId: 'match-1',
      seatId: 'seat-human',
      userId: 'user-1',
      remainingReconnects: 2,
      reason: 'disconnect',
    });

    act(() => {
      socketMock.trigger('auction:resume', {
        matchId: 'match-1',
        seatId: 'seat-human',
        userId: 'user-1',
        reason: 'reconnected',
        state: {
          ...pausedState,
          version: 3,
        },
        stateVersion: 3,
        serverNow: '2026-06-20T10:00:05.000Z',
      });
    });

    expect(result.current.pause).toBeNull();
    expect(result.current.matchId).toBe('match-1');
  });

  it('hydrates match state and blocks duplicate bid/fold emits while a turn action is pending', async () => {
    const { result } = renderHook(() => useRealtimeAuctionMatch({
      enabled: true,
      selfUserId: 'user-1',
      locale: 'en',
      formation: '2-2-2',
      humanAvatarSeed: 'avatar-1',
    }));

    act(() => {
      socketMock.trigger('auction:match_started', {
        matchId: 'match-1',
        locale: 'en',
        state: matchState({
          phase: 'bidding',
          currentRound: round({
            currentTurnSeatId: 'seat-human',
            turnEndsAt: new Date(Date.now() + 5_000).toISOString(),
          }),
        }),
      });
    });

    expect(result.current.matchId).toBe('match-1');
    expect(result.current.humanPlayerId).toBe('seat-human');
    expect(result.current.state?.phase).toBe('bidding');

    act(() => {
      result.current.actions.placeBid(25_000_000);
      result.current.actions.placeBid(30_000_000);
      result.current.actions.fold();
    });

    expect(socketMock.emit.mock.calls.filter(([event]) => event === 'auction:bid')).toEqual([
      ['auction:bid', { matchId: 'match-1', amount: 25_000_000 }],
    ]);
    expect(socketMock.emit).not.toHaveBeenCalledWith('auction:fold', {
      matchId: 'match-1',
    });
    expect(result.current.actions.pendingTurnAction).toMatchObject({
      kind: 'bid',
      amount: 25_000_000,
      matchId: 'match-1',
      roundId: 'round-1',
    });

    act(() => {
      socketMock.trigger('auction:bid_accepted', {
        matchId: 'match-1',
        roundId: 'round-1',
        seatId: 'seat-human',
        amount: 25_000_000,
        round: round({
          bids: [{ seatId: 'seat-human', amount: 25_000_000, placedAt: '2026-06-20T10:00:01.000Z' }],
          highestBidderSeatId: 'seat-human',
          highestBid: 25_000_000,
        }),
        stateVersion: 2,
      });
    });

    expect(result.current.actions.pendingTurnAction).toBeNull();

    act(() => {
      result.current.actions.fold();
    });

    expect(socketMock.emit).toHaveBeenCalledWith('auction:fold', {
      matchId: 'match-1',
    });
    expect(result.current.actions.pendingTurnAction).toMatchObject({
      kind: 'fold',
      matchId: 'match-1',
      roundId: 'round-1',
    });

    act(() => {
      socketMock.trigger('auction:error', {
        code: 'auction_not_your_turn',
        message: 'Not your turn',
      });
    });

    expect(result.current.actions.pendingTurnAction).toBeNull();

    act(() => {
      result.current.actions.pickSoloOption('B');
    });

    expect(socketMock.emit).toHaveBeenCalledWith('auction:solo_pick_select', {
      matchId: 'match-1',
      option: 'B',
    });
  });

  it('uses serverNow from auction events to adapt turn deadlines with server-clock offset', () => {
    const nowSpy = vi.spyOn(Date, 'now').mockReturnValue(Date.parse('2026-06-20T10:00:00.000Z'));
    try {
      const { result } = renderHook(() => useRealtimeAuctionMatch({
        enabled: true,
        selfUserId: 'user-1',
        locale: 'en',
        formation: '2-2-2',
        humanAvatarSeed: 'avatar-1',
      }));

      act(() => {
        socketMock.trigger('auction:match_started', {
          matchId: 'match-1',
          locale: 'en',
          serverNow: '2026-06-20T10:00:10.000Z',
          state: matchState({
            version: 1,
            phase: 'bidding',
            currentRound: round({
              currentTurnSeatId: 'seat-human',
              turnEndsAt: '2026-06-20T10:00:05.000Z',
            }),
          }),
        });
      });

      expect(result.current.state?.phase).toBe('bidding');
      expect(result.current.state?.currentRound?.turnEndsAt).toBe(Date.parse('2026-06-20T10:00:10.000Z'));
    } finally {
      nowSpy.mockRestore();
    }
  });

  it('holds the round ui-ready until the intro is confirmed, then acks bidding', async () => {
    const { result } = renderHook(() => useRealtimeAuctionMatch({
      enabled: true,
      selfUserId: 'user-1',
      locale: 'en',
      formation: '2-2-2',
      humanAvatarSeed: 'avatar-1',
    }));

    act(() => {
      socketMock.trigger('auction:match_started', {
        matchId: 'match-1',
        locale: 'en',
        state: matchState({
          version: 1,
          phase: 'clue_reveal',
          currentRound: round({ roundId: 'round-1' }),
        }),
      });
    });

    // The round intro is still on screen — acking here would let the server
    // start revealing clues behind it.
    await waitFor(() => expect(result.current.state?.phase).toBe('clue-reveal'));
    expect(socketMock.emit).not.toHaveBeenCalledWith('auction:ui_ready', expect.objectContaining({ phase: 'round' }));

    act(() => {
      result.current.actions.confirmRoundIntro?.();
    });

    await waitFor(() => {
      expect(socketMock.emit).toHaveBeenCalledWith('auction:ui_ready', {
        matchId: 'match-1',
        phase: 'round',
        roundId: 'round-1',
        stateVersion: 1,
      });
    });

    act(() => {
      socketMock.trigger('auction:bidding_started', {
        matchId: 'match-1',
        roundId: 'round-1',
        round: round({
          roundId: 'round-1',
          clueRevealIndex: 3,
          currentTurnSeatId: null,
          turnEndsAt: null,
        }),
        currentTurnSeatId: null,
        turnEndsAt: null,
        stateVersion: 2,
      });
    });

    await waitFor(() => {
      expect(socketMock.emit).toHaveBeenCalledWith('auction:ui_ready', {
        matchId: 'match-1',
        phase: 'bidding',
        roundId: 'round-1',
        stateVersion: 2,
      });
    });

    expect(result.current.state?.phase).toBe('bidding');
  });

  it('still acks the round ui-ready when the intro is fast-forwarded after clues start revealing', async () => {
    // FIX C: the server may reveal clues before this client finishes the round
    // intro. BiddingScreen fast-forwards (skips the intro) and calls
    // confirmRoundIntro on skip — that ack must still release the round gate for
    // the current version, even though clues already advanced the round.
    const { result } = renderHook(() => useRealtimeAuctionMatch({
      enabled: true,
      selfUserId: 'user-1',
      locale: 'en',
      formation: '2-2-2',
      humanAvatarSeed: 'avatar-1',
    }));

    act(() => {
      socketMock.trigger('auction:match_started', {
        matchId: 'match-1',
        locale: 'en',
        state: matchState({
          version: 1,
          phase: 'clue_reveal',
          currentRound: round({ roundId: 'round-1' }),
        }),
      });
    });

    await waitFor(() => expect(result.current.state?.phase).toBe('clue-reveal'));
    expect(socketMock.emit).not.toHaveBeenCalledWith(
      'auction:ui_ready',
      expect.objectContaining({ phase: 'round' }),
    );

    // A clue is revealed while the intro is still on screen (round advances).
    act(() => {
      socketMock.trigger('auction:clue_revealed', {
        matchId: 'match-1',
        roundId: 'round-1',
        clueIndex: 0,
        clue: 'Scored in a Champions League final',
        round: round({
          roundId: 'round-1',
          clueRevealIndex: 1,
          revealedClues: ['Scored in a Champions League final'],
        }),
        stateVersion: 2,
      });
    });

    // The screen fast-forwards the intro and confirms — the ack must fire for
    // the current (advanced) version so the round gate releases.
    act(() => {
      result.current.actions.confirmRoundIntro?.();
    });

    await waitFor(() => {
      expect(socketMock.emit).toHaveBeenCalledWith('auction:ui_ready', {
        matchId: 'match-1',
        phase: 'round',
        roundId: 'round-1',
        stateVersion: 2,
      });
    });
  });

  it('emits reveal ui-ready only after reveal completion and re-emits after reconnect', async () => {
    const { result } = renderHook(() => useRealtimeAuctionMatch({
      enabled: true,
      selfUserId: 'user-1',
      locale: 'en',
      formation: '2-2-2',
      humanAvatarSeed: 'avatar-1',
    }));

    act(() => {
      socketMock.trigger('auction:match_started', {
        matchId: 'match-1',
        locale: 'en',
        state: matchState({
          version: 3,
          phase: 'reveal',
          currentRound: round({
            roundId: 'round-1',
            revealed: true,
            clueRevealIndex: 3,
            winnerSeatId: 'seat-human',
            winningBid: 30_000_000,
            footballer: {
              id: 'card-1',
              name: 'Test Striker',
              positionGroup: 'FWD',
              trueValue: 80_000_000,
              startingPrice: 20_000_000,
              clues: ['clue 1', 'clue 2', 'clue 3'],
              nationality: 'Georgia',
            },
            revealedClues: ['clue 1', 'clue 2', 'clue 3'],
          }),
        }),
      });
    });

    await waitFor(() => {
      expect(result.current.state?.phase).toBe('reveal');
    });
    expect(socketMock.emit).not.toHaveBeenCalledWith('auction:ui_ready', {
      matchId: 'match-1',
      phase: 'reveal',
      roundId: 'round-1',
      stateVersion: 3,
    });

    act(() => {
      result.current.actions.confirmReveal();
    });

    expect(socketMock.emit).toHaveBeenCalledWith('auction:ui_ready', {
      matchId: 'match-1',
      phase: 'reveal',
      roundId: 'round-1',
      stateVersion: 3,
    });
    expect(socketMock.emit.mock.calls.filter(([event, payload]) => (
      event === 'auction:ui_ready' &&
      (payload as { phase?: string }).phase === 'reveal'
    ))).toHaveLength(1);

    act(() => {
      socketMock.socket.connected = false;
      socketMock.trigger('disconnect');
      socketMock.socket.connected = true;
      socketMock.trigger('connect');
    });

    await waitFor(() => {
      expect(socketMock.emit.mock.calls.filter(([event, payload]) => (
        event === 'auction:ui_ready' &&
        (payload as { phase?: string }).phase === 'reveal'
      ))).toHaveLength(2);
    });
  });

  it('tracks auction waiting-for-ready state and clears it when the turn starts', async () => {
    const { result } = renderHook(() => useRealtimeAuctionMatch({
      enabled: true,
      selfUserId: 'user-1',
      locale: 'en',
      formation: '2-2-2',
      humanAvatarSeed: 'avatar-1',
    }));

    act(() => {
      socketMock.trigger('auction:waiting_for_ready', {
        matchId: 'match-1',
        phase: 'bidding',
        roundId: 'round-1',
        stateVersion: 2,
        readyCount: 0,
        totalCount: 2,
        readyUserIds: [],
        waitingUserIds: ['user-1', 'user-2'],
        forceStartsAt: '2026-06-20T10:00:08.000Z',
        serverNow: '2026-06-20T10:00:00.000Z',
      });
    });

    // Our own ack is still pending — the strip stays hidden rather than
    // telling the player we're waiting on them.
    expect(result.current.waitingForReady).toBeNull();

    act(() => {
      socketMock.trigger('auction:waiting_for_ready', {
        matchId: 'match-1',
        phase: 'bidding',
        roundId: 'round-1',
        stateVersion: 2,
        readyCount: 1,
        totalCount: 2,
        readyUserIds: ['user-1'],
        waitingUserIds: ['user-1', 'user-2'],
        forceStartsAt: '2026-06-20T10:00:08.000Z',
        serverNow: '2026-06-20T10:00:00.000Z',
      });
    });

    expect(result.current.waitingForReady).toMatchObject({
      matchId: 'match-1',
      phase: 'bidding',
      roundId: 'round-1',
      totalCount: 2,
      forceStartsAtMs: Date.parse('2026-06-20T10:00:08.000Z'),
    });

    act(() => {
      socketMock.trigger('auction:match_started', {
        matchId: 'match-1',
        locale: 'en',
        state: matchState({
          version: 1,
          phase: 'bidding',
          currentRound: round({ roundId: 'round-1', currentTurnSeatId: null }),
        }),
      });
      socketMock.trigger('auction:turn_started', {
        matchId: 'match-1',
        roundId: 'round-1',
        currentTurnSeatId: 'seat-human',
        minBid: 20_000_000,
        maxBid: 1_000_000_000,
        turnEndsAt: new Date(Date.now() + 5_000).toISOString(),
        round: round({
          roundId: 'round-1',
          currentTurnSeatId: 'seat-human',
          turnEndsAt: new Date(Date.now() + 5_000).toISOString(),
        }),
        stateVersion: 2,
      });
    });

    expect(result.current.waitingForReady).toBeNull();
  });

  it('applies a server event sequence through reveal and results', () => {
    const { result } = renderHook(() => useRealtimeAuctionMatch({
      enabled: true,
      selfUserId: 'user-1',
      locale: 'en',
      formation: '2-2-2',
      humanAvatarSeed: 'avatar-1',
    }));

    act(() => {
      socketMock.trigger('auction:match_started', {
        matchId: 'match-1',
        locale: 'en',
        state: matchState(),
      });
    });

    act(() => {
      socketMock.trigger('auction:clue_revealed', {
        matchId: 'match-1',
        roundId: 'round-1',
        clueIndex: 0,
        clue: 'Scored in a Champions League final',
        round: round({
          clueRevealIndex: 1,
          revealedClues: ['Scored in a Champions League final'],
          footballer: {
            positionGroup: 'FWD',
            startingPrice: 20_000_000,
            clues: ['Scored in a Champions League final'],
          },
        }),
        stateVersion: 2,
      });
    });

    expect(result.current.state?.phase).toBe('clue-reveal');
    expect(result.current.state?.currentRound?.footballer.name).toBe('Mystery Player');
    expect(result.current.state?.currentRound?.clues).toEqual([
      'Scored in a Champions League final',
      '',
      '',
    ]);

    const turnDeadline = new Date(Date.now() + 5_000).toISOString();

    act(() => {
      socketMock.trigger('auction:turn_started', {
        matchId: 'match-1',
        roundId: 'round-1',
        currentTurnSeatId: 'seat-human',
        minBid: 20_000_000,
        maxBid: 1_000_000_000,
        turnEndsAt: turnDeadline,
        round: round({
          clueRevealIndex: 1,
          revealedClues: ['Scored in a Champions League final'],
          currentTurnSeatId: 'seat-human',
          turnEndsAt: turnDeadline,
        }),
        stateVersion: 3,
      });
    });

    expect(result.current.state?.phase).toBe('bidding');
    expect(result.current.state?.currentRound?.currentTurnId).toBe('seat-human');
    expect(result.current.state?.currentRound?.turnEndsAt).toBe(Date.parse(turnDeadline));

    const revealedRound = round({
      revealed: true,
      clueRevealIndex: 3,
      winnerSeatId: 'seat-human',
      winningBid: 70_000_000,
      highestBidderSeatId: 'seat-human',
      highestBid: 70_000_000,
      revealedClues: [
        'Scored in a Champions League final',
        'Won the league with a German club',
        'Moved to England before turning 23',
      ],
      footballer: {
        id: 'card-1',
        clueCardId: 'clue-card-1',
        name: 'Example Forward',
        positionGroup: 'FWD',
        trueValue: 120_000_000,
        startingPrice: 20_000_000,
        clues: [
          'Scored in a Champions League final',
          'Won the league with a German club',
          'Moved to England before turning 23',
        ],
        imageUrl: 'https://example.com/example-forward.png',
        currentClub: 'Example FC',
        nationality: 'Norway',
      },
    });

    act(() => {
      socketMock.trigger('auction:round_revealed', {
        matchId: 'match-1',
        roundId: 'round-1',
        winnerSeatId: 'seat-human',
        winningBid: 70_000_000,
        round: revealedRound,
        stateVersion: 4,
      });
    });

    expect(result.current.state?.phase).toBe('reveal');
    expect(result.current.state?.currentRound?.footballer).toMatchObject({
      id: 'card-1',
      name: 'Example Forward',
      value: 120_000_000,
      imageUrl: 'https://example.com/example-forward.png',
    });
    expect(result.current.state?.currentRound?.winnerId).toBe('seat-human');

    const finishedState = matchState({
      version: 5,
      phase: 'finished',
      currentRound: null,
      completedRounds: [revealedRound],
      rankings: [{
        seatId: 'seat-human',
        userId: 'user-1',
        isBot: false,
        displayName: 'You',
        rank: 1,
        isComplete: false,
        totalTrueValue: 120_000_000,
        budgetRemaining: 930_000_000,
        player: player('seat-human', 'You', 'user-1'),
      }],
    });

    act(() => {
      socketMock.trigger('auction:match_finished', {
        matchId: 'match-1',
        rankings: finishedState.rankings,
        winnerSeatId: 'seat-human',
        state: finishedState,
        stateVersion: 5,
      });
    });

    expect(result.current.status).toBe('finished');
    expect(result.current.state?.phase).toBe('results');
    expect(result.current.state?.completedRounds).toHaveLength(1);
  });

  it('soft-reconnects after a state-version gap so backend hydration can repair state', () => {
    vi.useFakeTimers();

    const { result } = renderHook(() => useRealtimeAuctionMatch({
      enabled: true,
      selfUserId: 'user-1',
      locale: 'en',
      formation: '2-2-2',
      humanAvatarSeed: 'avatar-1',
    }));

    act(() => {
      socketMock.trigger('auction:match_started', {
        matchId: 'match-1',
        locale: 'en',
        state: matchState({ version: 1 }),
      });
    });

    act(() => {
      socketMock.trigger('auction:bid_accepted', {
        matchId: 'match-1',
        roundId: 'round-1',
        seatId: 'seat-human',
        amount: 40_000_000,
        round: round({
          bids: [{ seatId: 'seat-human', amount: 40_000_000, placedAt: '2026-06-20T10:00:01.000Z' }],
          highestBidderSeatId: 'seat-human',
          highestBid: 40_000_000,
        }),
        stateVersion: 4,
      });
    });

    expect(result.current.versionGapDetected).toBe(true);
    expect(reconnectSocketMock).not.toHaveBeenCalled();

    act(() => {
      vi.advanceTimersByTime(250);
    });

    expect(reconnectSocketMock).toHaveBeenCalledTimes(1);

    act(() => {
      socketMock.trigger('auction:state', {
        matchId: 'match-1',
        state: matchState({
          version: 5,
          phase: 'bidding',
          currentRound: round({
            bids: [{ seatId: 'seat-human', amount: 40_000_000, placedAt: '2026-06-20T10:00:01.000Z' }],
            highestBidderSeatId: 'seat-human',
            highestBid: 40_000_000,
          }),
        }),
        stateVersion: 5,
      });
    });

    expect(result.current.versionGapDetected).toBe(false);
  });

  it('only reconnects for authoritative hydration on tab focus when the socket is stale', () => {
    let visibilityState: DocumentVisibilityState = 'hidden';
    const visibilitySpy = vi.spyOn(document, 'visibilityState', 'get').mockImplementation(() => visibilityState);
    try {
      const { result } = renderHook(() => useRealtimeAuctionMatch({
        enabled: true,
        selfUserId: 'user-1',
        locale: 'en',
        formation: '2-2-2',
        humanAvatarSeed: 'avatar-1',
      }));

      act(() => {
        socketMock.trigger('auction:match_started', {
          matchId: 'match-1',
          locale: 'en',
          state: matchState({
            version: 1,
            phase: 'bidding',
            currentRound: round({ currentTurnSeatId: 'seat-human' }),
          }),
        });
      });

      expect(result.current.matchId).toBe('match-1');

      act(() => {
        document.dispatchEvent(new Event('visibilitychange'));
      });
      expect(reconnectSocketMock).not.toHaveBeenCalled();

      act(() => {
        visibilityState = 'visible';
        document.dispatchEvent(new Event('visibilitychange'));
      });

      expect(reconnectSocketMock).not.toHaveBeenCalled();

      act(() => {
        socketMock.socket.connected = false;
        socketMock.trigger('disconnect');
        visibilityState = 'hidden';
        document.dispatchEvent(new Event('visibilitychange'));
      });
      expect(reconnectSocketMock).not.toHaveBeenCalled();

      act(() => {
        visibilityState = 'visible';
        document.dispatchEvent(new Event('visibilitychange'));
      });

      expect(reconnectSocketMock).toHaveBeenCalledTimes(1);
    } finally {
      visibilitySpy.mockRestore();
    }
  });

  it('keeps the current state and reconnects when a malformed event would break adaptation', async () => {
    const { result } = renderHook(() => useRealtimeAuctionMatch({
      enabled: true,
      selfUserId: 'user-1',
      locale: 'en',
      formation: '2-2-2',
      humanAvatarSeed: 'avatar-1',
    }));

    act(() => {
      socketMock.trigger('auction:match_started', {
        matchId: 'match-1',
        locale: 'en',
        state: matchState({
          version: 1,
          phase: 'bidding',
          currentRound: round({
            currentTurnSeatId: 'seat-human',
            foldedSeatIds: [],
          }),
        }),
      });
    });

    expect(result.current.state?.phase).toBe('bidding');
    expect(result.current.state?.currentRound?.foldedIds).toEqual([]);

    act(() => {
      socketMock.trigger('auction:turn_started', {
        matchId: 'match-1',
        roundId: 'round-1',
        currentTurnSeatId: 'seat-human',
        minBid: 20_000_000,
        maxBid: 1_000_000_000,
        turnEndsAt: null,
        round: {
          ...round({
            currentTurnSeatId: 'seat-human',
          }),
          foldedSeatIds: undefined,
        } as unknown as PublicAuctionRoundState,
        stateVersion: 2,
      });
    });

    await waitFor(() => {
      expect(reconnectSocketMock).toHaveBeenCalled();
    });

    expect(result.current.state?.phase).toBe('bidding');
    expect(result.current.state?.currentRound?.foldedIds).toEqual([]);
    expect(result.current.error).toBe('Auction state changed unexpectedly. Reconnecting.');
    expect(loggerWarnMock).toHaveBeenCalledWith(
      'Auction realtime event application failed; reconnecting for state repair',
      expect.objectContaining({
        eventType: 'turn_started',
        message: expect.any(String),
      }),
    );
    expect(loggerWarnMock.mock.calls[0]?.[1]).not.toHaveProperty('payload');
  });

  it('surfaces selfForfeited when the server forfeits this player', () => {
    const { result } = renderHook(() => useRealtimeAuctionMatch({
      enabled: true,
      selfUserId: 'user-1',
      locale: 'en',
      formation: '2-2-2',
      humanAvatarSeed: 'avatar-1',
    }));

    act(() => {
      socketMock.trigger('auction:match_started', {
        matchId: 'match-1',
        locale: 'en',
        state: matchState({
          version: 1,
          phase: 'bidding',
          currentRound: round({ currentTurnSeatId: 'seat-bot-1' }),
        }),
      });
    });

    expect(result.current.selfForfeited).toBe(false);

    const forfeitedState = matchState({
      version: 2,
      phase: 'bidding',
      seats: [
        { ...player('seat-human', 'You', 'user-1'), forfeited: true },
        player('seat-bot-1', 'Bot 1', null),
        player('seat-bot-2', 'Bot 2', null),
      ],
      currentRound: round({ currentTurnSeatId: 'seat-bot-1' }),
    });

    act(() => {
      socketMock.trigger('auction:player_forfeited', {
        matchId: 'match-1',
        seatId: 'seat-human',
        userId: 'user-1',
        reason: 'reconnect_limit',
        state: forfeitedState,
        stateVersion: 2,
        serverNow: '2026-06-20T10:00:05.000Z',
      });
    });

    expect(result.current.selfForfeited).toBe(true);
  });

  it('does not ack ui_ready or reconnect once this player is forfeited', () => {
    const { result } = renderHook(() => useRealtimeAuctionMatch({
      enabled: true,
      selfUserId: 'user-1',
      locale: 'en',
      formation: '2-2-2',
      humanAvatarSeed: 'avatar-1',
    }));

    const forfeitedSeats = [
      { ...player('seat-human', 'You', 'user-1'), forfeited: true },
      player('seat-bot-1', 'Bot 1', null),
      player('seat-bot-2', 'Bot 2', null),
    ];

    act(() => {
      socketMock.trigger('auction:player_forfeited', {
        matchId: 'match-1',
        seatId: 'seat-human',
        userId: 'user-1',
        reason: 'reconnect_limit',
        state: matchState({
          version: 2,
          phase: 'bidding',
          seats: forfeitedSeats,
          currentRound: round({ currentTurnSeatId: 'seat-bot-1' }),
        }),
        stateVersion: 2,
        serverNow: '2026-06-20T10:00:05.000Z',
      });
    });

    expect(result.current.selfForfeited).toBe(true);
    socketMock.emit.mockClear();
    reconnectSocketMock.mockClear();

    // Further state (including a reveal that would normally be acked) must not
    // produce any ui_ready ack from the now-spectating forfeited client.
    act(() => {
      socketMock.trigger('auction:state', {
        matchId: 'match-1',
        state: matchState({
          version: 3,
          phase: 'reveal',
          seats: forfeitedSeats,
          currentRound: round({
            roundId: 'round-1',
            revealed: true,
            clueRevealIndex: 3,
            winnerSeatId: 'seat-bot-1',
            winningBid: 30_000_000,
            revealedClues: ['clue 1', 'clue 2', 'clue 3'],
          }),
        }),
        stateVersion: 3,
      });
      result.current.actions.confirmReveal();
    });

    expect(result.current.state?.phase).toBe('reveal');
    expect(socketMock.emit).not.toHaveBeenCalledWith(
      'auction:ui_ready',
      expect.anything(),
    );

    // A reconnect cycle must not re-trigger any ui_ready storm either.
    act(() => {
      socketMock.socket.connected = false;
      socketMock.trigger('disconnect');
      socketMock.socket.connected = true;
      socketMock.trigger('connect');
    });

    expect(socketMock.emit).not.toHaveBeenCalledWith(
      'auction:ui_ready',
      expect.anything(),
    );
  });

  it('clears the waiting-for-ready strip once everyone is ready', () => {
    const { result } = renderHook(() => useRealtimeAuctionMatch({
      enabled: true,
      selfUserId: 'user-1',
      locale: 'en',
      formation: '2-2-2',
      humanAvatarSeed: 'avatar-1',
    }));

    act(() => {
      socketMock.trigger('auction:waiting_for_ready', {
        matchId: 'match-1',
        phase: 'bidding',
        roundId: 'round-1',
        stateVersion: 2,
        readyCount: 1,
        totalCount: 2,
        readyUserIds: ['user-1'],
        waitingUserIds: ['user-2'],
        forceStartsAt: '2026-06-20T10:00:08.000Z',
        serverNow: '2026-06-20T10:00:00.000Z',
      });
    });

    expect(result.current.waitingForReady).not.toBeNull();

    act(() => {
      socketMock.trigger('auction:waiting_for_ready', {
        matchId: 'match-1',
        phase: 'bidding',
        roundId: 'round-1',
        stateVersion: 2,
        readyCount: 2,
        totalCount: 2,
        readyUserIds: ['user-1', 'user-2'],
        waitingUserIds: [],
        forceStartsAt: '2026-06-20T10:00:08.000Z',
        serverNow: '2026-06-20T10:00:00.000Z',
      });
    });

    expect(result.current.waitingForReady).toBeNull();
  });

  it('surfaces auction errors without logging sensitive metadata', () => {
    const { result } = renderHook(() => useRealtimeAuctionMatch({
      enabled: true,
      selfUserId: 'user-1',
      locale: 'en',
      formation: '2-2-2',
      humanAvatarSeed: 'avatar-1',
    }));

    act(() => {
      socketMock.trigger('auction:error', {
        code: 'auction_content_unavailable',
        message: 'Auction content unavailable',
        meta: { requestId: 'safe-debug-id' },
      });
    });

    // Raw server message + code is NEVER shown — mapped to a friendly,
    // localized message instead (no '(code)' suffix, no sensitive meta).
    expect(result.current.error).toBe('No auction content is available right now.');
    expect(result.current.error).not.toContain('auction_content_unavailable');
    expect(result.current.status).toBe('error');
  });
});
