import { act, renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
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

vi.mock('@/lib/realtime/useRealtimeConnection', () => ({
  useRealtimeConnection: () => socketMock.socket,
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

function round(): PublicAuctionRoundState {
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
  };
}

function matchState(): PublicAuctionMatchState {
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
  };
}

describe('useRealtimeAuctionMatch', () => {
  beforeEach(() => {
    socketMock.reset();
  });

  it('starts an AI auction match after connecting', async () => {
    renderHook(() => useRealtimeAuctionMatch({
      enabled: true,
      selfUserId: 'user-1',
      locale: 'en',
      humanAvatarSeed: 'avatar-1',
    }));

    await waitFor(() => {
      expect(socketMock.emit).toHaveBeenCalledWith('auction:start_ai_match', { locale: 'en' });
    });
  });

  it('hydrates match state and emits bid/fold/solo-pick actions for the active match', async () => {
    const { result } = renderHook(() => useRealtimeAuctionMatch({
      enabled: true,
      selfUserId: 'user-1',
      locale: 'en',
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

  it('surfaces auction errors without logging sensitive metadata', () => {
    const { result } = renderHook(() => useRealtimeAuctionMatch({
      enabled: true,
      selfUserId: 'user-1',
      locale: 'en',
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
