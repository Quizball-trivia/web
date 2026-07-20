import { describe, expect, it } from 'vitest';
import type {
  PublicAuctionFormation,
  PublicAuctionMatchState,
  PublicAuctionPlayer,
  PublicAuctionRoundState,
} from '@/lib/realtime/socket.types';
import {
  applyAuctionRealtimeEvent,
  type AuctionRealtimeState,
} from '../auction-realtime.reducer';

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

function player(seatId: string, displayName: string): PublicAuctionPlayer {
  return {
    seatId,
    userId: seatId === 'seat-human' ? 'user-1' : null,
    displayName,
    isBot: seatId !== 'seat-human',
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
      clues: ['First clue', 'Second clue', 'Third clue'],
    },
    clueRevealIndex: 3,
    bids: [],
    highestBidderSeatId: null,
    highestBid: 0,
    startingPrice: 20_000_000,
    winnerSeatId: null,
    winningBid: 0,
    revealed: false,
    turnOrder: ['seat-human', 'seat-bot'],
    currentTurnSeatId: 'seat-human',
    foldedSeatIds: [],
    turnEndsAt: null,
    biddingStartsAt: null,
    startedAt: '2026-06-20T10:00:00.000Z',
    updatedAt: '2026-06-20T10:00:00.000Z',
    revealedClues: ['First clue', 'Second clue', 'Third clue'],
    ...overrides,
  };
}

function matchState(overrides: Partial<PublicAuctionMatchState> = {}): PublicAuctionMatchState {
  return {
    matchId: 'match-1',
    version: 3,
    locale: 'en',
    phase: 'bidding',
    formation: '4-3-3',
    seats: [player('seat-human', 'You'), player('seat-bot', 'Bot')],
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

describe('auction realtime reducer', () => {
  it('ignores non-full events from a stale match id', () => {
    const current: AuctionRealtimeState = {
      publicState: matchState({ matchId: 'match-current', version: 3 }),
      versionGapDetected: false,
    };

    const next = applyAuctionRealtimeEvent(current, {
      type: 'bid_accepted',
      payload: {
        matchId: 'match-stale',
        roundId: 'round-1',
        seatId: 'seat-human',
        amount: 40_000_000,
        round: round({
          bids: [{ seatId: 'seat-human', amount: 40_000_000, placedAt: '2026-06-20T10:00:01.000Z' }],
          highestBidderSeatId: 'seat-human',
          highestBid: 40_000_000,
        }),
        stateVersion: 4,
      },
    });

    expect(next).toBe(current);
    expect(next.publicState?.currentRound?.highestBid).toBe(0);
    expect(next.versionGapDetected).toBe(false);
  });

  it('allows a full state event to replace the active match even with a lower version', () => {
    const current: AuctionRealtimeState = {
      publicState: matchState({ matchId: 'match-old', version: 99 }),
      versionGapDetected: true,
    };

    const next = applyAuctionRealtimeEvent(current, {
      type: 'match_started',
      payload: {
        matchId: 'match-new',
        locale: 'en',
        state: matchState({
          matchId: 'match-new',
          version: 1,
          currentRound: round({ roundId: 'new-round' }),
        }),
      },
    });

    expect(next.publicState?.matchId).toBe('match-new');
    expect(next.publicState?.version).toBe(1);
    expect(next.publicState?.currentRound?.roundId).toBe('new-round');
    expect(next.versionGapDetected).toBe(false);
  });
});
