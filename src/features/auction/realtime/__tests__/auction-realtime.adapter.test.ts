import { describe, expect, it } from 'vitest';
import type {
  PublicAuctionFormation,
  PublicAuctionMatchState,
  PublicAuctionPlayer,
  PublicAuctionRoundState,
} from '@/lib/realtime/socket.types';
import {
  findMyAuctionSeatId,
  toClientAuctionState,
} from '../auction-realtime.adapter';
import {
  applyAuctionRealtimeEvent,
  EMPTY_AUCTION_REALTIME_STATE,
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
      clues: ['Won a major European trophy'],
    },
    clueRevealIndex: 1,
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
    revealedClues: ['Won a major European trophy'],
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

describe('auction realtime adapter', () => {
  it('finds the current user seat and maps backend seats to client players', () => {
    const publicState = matchState();

    expect(findMyAuctionSeatId(publicState, 'user-1')).toBe('seat-human');

    const clientState = toClientAuctionState(publicState, {
      humanSeatId: 'seat-human',
      humanAvatarSeed: 'avatar-1',
    });

    expect(clientState.players[0]).toMatchObject({
      id: 'seat-human',
      username: 'You',
      avatarSeed: 'avatar-1',
      isBot: false,
    });
    expect(clientState.formation.name).toBe('4-3-3');
    expect(clientState.totalRounds).toBe(33);
  });

  it('pads hidden rounds to three clue slots while preserving revealed clue text', () => {
    const clientState = toClientAuctionState(matchState());

    expect(clientState.phase).toBe('clue-reveal');
    expect(clientState.currentRound?.clues).toEqual([
      'Won a major European trophy',
      '',
      '',
    ]);
    expect(clientState.currentRound?.clueRevealIndex).toBe(1);
  });

  it('maps revealed rounds with player identity and true value', () => {
    const publicState = matchState({
      phase: 'reveal',
      currentRound: round({
        revealed: true,
        clueRevealIndex: 3,
        winnerSeatId: 'seat-human',
        winningBid: 45_000_000,
        highestBidderSeatId: 'seat-human',
        highestBid: 45_000_000,
        footballer: {
          id: 'card-1',
          name: 'Example Forward',
          positionGroup: 'FWD',
          trueValue: 80_000_000,
          startingPrice: 20_000_000,
          clues: ['Clue one', 'Clue two', 'Clue three'],
          nationality: 'Georgia',
          imageUrl: 'https://example.com/player.png',
        },
        revealedClues: ['Clue one', 'Clue two', 'Clue three'],
      }),
    });

    const clientState = toClientAuctionState(publicState);

    expect(clientState.phase).toBe('reveal');
    expect(clientState.currentRound?.footballer).toMatchObject({
      id: 'card-1',
      name: 'Example Forward',
      value: 80_000_000,
      nationality: 'Georgia',
      imageUrl: 'https://example.com/player.png',
    });
  });
});

describe('auction realtime reducer', () => {
  it('ignores stale state versions', () => {
    const current = applyAuctionRealtimeEvent(EMPTY_AUCTION_REALTIME_STATE, {
      type: 'match_started',
      payload: { matchId: 'match-1', locale: 'en', state: matchState({ version: 3 }) },
    });

    const next = applyAuctionRealtimeEvent(current, {
      type: 'turn_started',
      payload: {
        matchId: 'match-1',
        roundId: 'round-1',
        currentTurnSeatId: 'seat-human',
        minBid: 20_000_000,
        maxBid: 900_000_000,
        turnEndsAt: null,
        round: round({ currentTurnSeatId: 'seat-human' }),
        stateVersion: 2,
      },
    });

    expect(next.publicState?.version).toBe(3);
    expect(next.publicState?.currentRound?.currentTurnSeatId).toBeNull();
  });

  it('appends a revealed round when the next round starts', () => {
    const revealedRound = round({
      revealed: true,
      winnerSeatId: 'seat-human',
      winningBid: 35_000_000,
    });
    const current = applyAuctionRealtimeEvent(EMPTY_AUCTION_REALTIME_STATE, {
      type: 'match_started',
      payload: {
        matchId: 'match-1',
        locale: 'en',
        state: matchState({ version: 4, phase: 'reveal', currentRound: revealedRound }),
      },
    });

    const nextRound = round({ roundId: 'round-2', roundIndex: 2, clueRevealIndex: 0, revealedClues: [], footballer: {
      positionGroup: 'MID',
      startingPrice: 25_000_000,
      clues: [],
    } });
    const next = applyAuctionRealtimeEvent(current, {
      type: 'round_started',
      payload: {
        matchId: 'match-1',
        round: nextRound,
        stateVersion: 5,
      },
    });

    expect(next.publicState?.phase).toBe('clue_reveal');
    expect(next.publicState?.completedRounds.map((entry) => entry.roundId)).toEqual(['round-1']);
    expect(next.publicState?.currentRound?.roundId).toBe('round-2');
  });

  it('tracks version gaps while still applying the latest event', () => {
    const current = applyAuctionRealtimeEvent(EMPTY_AUCTION_REALTIME_STATE, {
      type: 'match_started',
      payload: { matchId: 'match-1', locale: 'en', state: matchState({ version: 1 }) },
    });

    const next = applyAuctionRealtimeEvent(current, {
      type: 'bid_accepted',
      payload: {
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
      },
    });

    expect(next.versionGapDetected).toBe(true);
    expect(next.publicState?.version).toBe(4);
    expect(next.publicState?.currentRound?.highestBid).toBe(40_000_000);
  });
});
