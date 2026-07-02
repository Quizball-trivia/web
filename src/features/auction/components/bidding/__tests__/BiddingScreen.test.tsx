import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import type { AuctionActions } from '../../../hooks/useAuctionGame';
import { FORMATIONS } from '../../../data';
import type { AuctionGameState, AuctionPlayer, AuctionRound } from '../../../types';
import { BiddingScreen } from '../BiddingScreen';

vi.mock('@/contexts/LocaleContext', () => ({
  useLocale: () => ({
    locale: 'en',
    t: (key: string, params?: Record<string, unknown>) => {
      const messages: Record<string, string> = {
        'auctionGame.round': `Round ${String(params?.round ?? 1)}`,
        'auctionGame.mysteryPlayer': 'Mystery Player',
        'auctionGame.startingPriceLabel': 'Starting price',
        'auctionGame.highestBid': 'Highest bid',
        'auctionGame.totalBids': 'Total bids',
        'auctionGame.biddingOpen': 'Bidding open',
        'auctionGame.placeFirstBidToStartClock': 'Place first bid',
        'auctionGame.yourTurn': 'Your turn',
        'auctionGame.minBid': `MIN ${String(params?.amount ?? '$20M')}`,
        'auctionGame.bidPlus10M': '+$10M',
        'auctionGame.bidPlus25M': '+$25M',
        'auctionGame.bidPlus50M': '+$50M',
        'auctionGame.allIn': 'ALL IN',
        'auctionGame.leftAmount': `Left: ${String(params?.amount ?? '$0')}`,
        'auctionGame.bid': 'Bid',
        'auctionGame.budgetAmount': `Budget: ${String(params?.amount ?? '$0')}`,
        'auctionGame.maxBidAmount': `Max bid: ${String(params?.amount ?? '$0')}`,
        'auctionGame.fold': 'Fold',
        'auctionGame.bidPlacedWaiting': 'Bid placed - waiting...',
        'auctionGame.foldPlacedWaiting': 'Fold sent - waiting...',
      };
      return messages[key] ?? key;
    },
  }),
}));

vi.mock('../../pitch/AllSquads', () => ({
  AllSquads: () => <div data-testid="all-squads" />,
}));

const formation = FORMATIONS[0];

function player(seatId: string): AuctionPlayer {
  return {
    id: seatId,
    username: seatId === 'seat-human' ? 'Human' : 'Bot',
    avatarSeed: seatId,
    budget: 100_000_000,
    isBot: seatId !== 'seat-human',
    isEliminated: false,
    team: {
      formation,
      slots: { GK: [], DEF: [], MID: [], FWD: [] },
    },
  };
}

function round(): AuctionRound {
  return {
    positionGroup: 'FWD',
    footballer: {
      id: 'card-1',
      name: 'Mystery Player',
      positionGroup: 'FWD',
      value: 80_000_000,
      startingPrice: 20_000_000,
      clues: ['Clue one', 'Clue two', 'Clue three'],
      nationality: 'Georgia',
    },
    clues: ['Clue one', 'Clue two', 'Clue three'],
    clueRevealIndex: 3,
    bids: [{ playerId: 'seat-bot', amount: 25_000_000 }],
    highestBidderId: 'seat-bot',
    highestBid: 25_000_000,
    startingPrice: 20_000_000,
    winnerId: null,
    winningBid: 0,
    revealed: false,
    countdownEndsAt: null,
    turnOrder: ['seat-human', 'seat-bot'],
    currentTurnId: 'seat-human',
    foldedIds: [],
    turnEndsAt: Date.now() + 5_000,
  };
}

function state(): AuctionGameState {
  return {
    phase: 'bidding',
    players: [player('seat-human'), player('seat-bot')],
    formation,
    currentRound: round(),
    roundIndex: 1,
    totalRounds: 2,
    completedRounds: [],
    soloPick: null,
  };
}

function actions(overrides: Partial<AuctionActions> = {}): AuctionActions {
  return {
    startGame: vi.fn(),
    placeBid: vi.fn(),
    fold: vi.fn(),
    confirmReveal: vi.fn(),
    pickSoloOption: vi.fn(),
    setPhase: vi.fn(),
    ...overrides,
  };
}

describe('BiddingScreen', () => {
  it('shows pending bid feedback instead of live turn controls', () => {
    render(
      <BiddingScreen
        state={state()}
        actions={actions({
          pendingTurnAction: {
            kind: 'bid',
            amount: 30_000_000,
            matchId: 'match-1',
            roundId: 'round-1',
          },
        })}
        humanPlayerId="seat-human"
      />,
    );

    expect(screen.getByText('Bid placed - waiting...')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /MIN/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Fold' })).not.toBeInTheDocument();
  });
});
