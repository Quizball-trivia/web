import { beforeEach, describe, expect, it } from 'vitest';
import { useAuctionActiveMatchStore } from '../auctionActiveMatch.store';
import type {
  AuctionRejoinAvailablePayload,
  AuctionStatePayload,
  PublicAuctionMatchState,
  PublicAuctionPlayer,
  PublicAuctionTeam,
} from '@/lib/realtime/socket.types';

const SELF = 'user-self';

const EMPTY_TEAM: PublicAuctionTeam = {
  formation: { name: '4-3-3', required: { GK: 1, DEF: 4, MID: 3, FWD: 3 }, rows: [] },
  slots: { GK: [], DEF: [], MID: [], FWD: [] },
};

function seat(overrides: Partial<PublicAuctionPlayer> & { seatId: string }): PublicAuctionPlayer {
  return {
    userId: null,
    displayName: 'Seat',
    isBot: false,
    budget: 1_000_000_000,
    team: EMPTY_TEAM,
    isEliminated: false,
    ...overrides,
  };
}

function matchState(overrides: Partial<PublicAuctionMatchState> = {}): PublicAuctionMatchState {
  return {
    matchId: 'match-1',
    version: 3,
    phase: 'bidding',
    formation: '4-3-3',
    seats: [
      seat({ seatId: 's1', userId: SELF, displayName: 'Me' }),
      seat({ seatId: 's2', userId: 'user-rival', displayName: 'Rival' }),
      seat({ seatId: 's3', userId: 'bot-1', displayName: 'Bot', isBot: true }),
    ],
    currentRound: null,
    completedRounds: [],
    soloPick: null,
    usedClueCardIds: [],
    rankings: null,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    ...overrides,
  };
}

function statePayload(state: PublicAuctionMatchState): AuctionStatePayload {
  return { matchId: state.matchId, state, stateVersion: state.version };
}

describe('auctionActiveMatch.store', () => {
  beforeEach(() => {
    useAuctionActiveMatchStore.setState({ activeAuctionMatch: null });
  });

  it('setFromState derives the human opponent name and marks source active', () => {
    useAuctionActiveMatchStore.getState().setFromState(statePayload(matchState()), SELF);

    expect(useAuctionActiveMatchStore.getState().activeAuctionMatch).toEqual({
      matchId: 'match-1',
      opponentName: 'Rival',
      source: 'active',
    });
  });

  it('setFromState ignores bots and self when picking the opponent name', () => {
    const onlyBots = matchState({
      seats: [
        seat({ seatId: 's1', userId: SELF, displayName: 'Me' }),
        seat({ seatId: 's3', userId: 'bot-1', displayName: 'Bot', isBot: true }),
      ],
    });
    useAuctionActiveMatchStore.getState().setFromState(statePayload(onlyBots), SELF);

    expect(useAuctionActiveMatchStore.getState().activeAuctionMatch?.opponentName).toBeNull();
  });

  it('setFromState clears the banner on a finished snapshot', () => {
    useAuctionActiveMatchStore.setState({
      activeAuctionMatch: { matchId: 'match-1', opponentName: 'Rival', source: 'active' },
    });

    useAuctionActiveMatchStore
      .getState()
      .setFromState(statePayload(matchState({ phase: 'finished' })), SELF);

    expect(useAuctionActiveMatchStore.getState().activeAuctionMatch).toBeNull();
  });

  it('setFromRejoinAvailable marks source rejoin with no opponent name', () => {
    const payload: AuctionRejoinAvailablePayload = {
      matchId: 'match-2',
      seatId: 's1',
      graceMs: 30_000,
      remainingReconnects: 2,
      serverNow: new Date().toISOString(),
    };
    useAuctionActiveMatchStore.getState().setFromRejoinAvailable(payload);

    expect(useAuctionActiveMatchStore.getState().activeAuctionMatch).toEqual({
      matchId: 'match-2',
      opponentName: null,
      source: 'rejoin',
    });
  });

  it('clear resets the active auction match', () => {
    useAuctionActiveMatchStore.setState({
      activeAuctionMatch: { matchId: 'match-1', opponentName: 'Rival', source: 'active' },
    });
    useAuctionActiveMatchStore.getState().clear();
    expect(useAuctionActiveMatchStore.getState().activeAuctionMatch).toBeNull();
  });
});
