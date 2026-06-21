import { act, renderHook } from '@testing-library/react';
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

vi.mock('@/lib/realtime/useRealtimeConnection', () => ({
  useRealtimeConnection: () => socketMock.socket,
}));

vi.mock('@/lib/realtime/socket-client', () => ({
  reconnectSocket: reconnectSocketMock,
}));

const formation: PublicAuctionFormation = {
  name: '4-3-3',
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
    formation: '4-3-3',
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
      formation: '4-3-3',
      humanAvatarSeed: 'avatar-1',
    }));

    expect(socketMock.emit).not.toHaveBeenCalledWith('auction:start_ai_match', { locale: 'en', formation: '4-3-3' });

    act(() => {
      vi.advanceTimersByTime(499);
    });
    expect(socketMock.emit).not.toHaveBeenCalledWith('auction:start_ai_match', { locale: 'en', formation: '4-3-3' });

    act(() => {
      vi.advanceTimersByTime(1);
    });
    expect(socketMock.emit).toHaveBeenCalledWith('auction:start_ai_match', { locale: 'en', formation: '4-3-3' });
  });

  it('does not start a duplicate match when reconnect hydration arrives first', () => {
    vi.useFakeTimers();

    const { result } = renderHook(() => useRealtimeAuctionMatch({
      enabled: true,
      selfUserId: 'user-1',
      locale: 'en',
      formation: '4-3-3',
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
    expect(socketMock.emit).not.toHaveBeenCalledWith('auction:start_ai_match', { locale: 'en', formation: '4-3-3' });
  });

  it('hydrates updated state after reconnect without starting a duplicate match', () => {
    vi.useFakeTimers();

    const { result } = renderHook(() => useRealtimeAuctionMatch({
      enabled: true,
      selfUserId: 'user-1',
      locale: 'en',
      formation: '4-3-3',
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
    expect(socketMock.emit).not.toHaveBeenCalledWith('auction:start_ai_match', { locale: 'en', formation: '4-3-3' });
  });

  it('hydrates match state and emits bid/fold/solo-pick actions for the active match', async () => {
    const { result } = renderHook(() => useRealtimeAuctionMatch({
      enabled: true,
      selfUserId: 'user-1',
      locale: 'en',
      formation: '4-3-3',
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
    expect(result.current.humanPlayerId).toBe('seat-human');
    expect(result.current.state?.phase).toBe('clue-reveal');

    act(() => {
      result.current.actions.placeBid(25_000_000);
      result.current.actions.fold();
      result.current.actions.pickSoloOption('B');
    });

    expect(socketMock.emit).toHaveBeenCalledWith('auction:bid', {
      matchId: 'match-1',
      amount: 25_000_000,
    });
    expect(socketMock.emit).toHaveBeenCalledWith('auction:fold', {
      matchId: 'match-1',
    });
    expect(socketMock.emit).toHaveBeenCalledWith('auction:solo_pick_select', {
      matchId: 'match-1',
      option: 'B',
    });
  });

  it('applies a server event sequence through reveal and results', () => {
    const { result } = renderHook(() => useRealtimeAuctionMatch({
      enabled: true,
      selfUserId: 'user-1',
      locale: 'en',
      formation: '4-3-3',
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
      formation: '4-3-3',
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

  it('surfaces auction errors without logging sensitive metadata', () => {
    const { result } = renderHook(() => useRealtimeAuctionMatch({
      enabled: true,
      selfUserId: 'user-1',
      locale: 'en',
      formation: '4-3-3',
      humanAvatarSeed: 'avatar-1',
    }));

    act(() => {
      socketMock.trigger('auction:error', {
        code: 'auction_content_unavailable',
        message: 'Auction content unavailable',
        meta: { requestId: 'safe-debug-id' },
      });
    });

    expect(result.current.error).toBe('Auction content unavailable (auction_content_unavailable)');
    expect(result.current.status).toBe('error');
  });
});
