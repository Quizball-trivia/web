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
        'auctionGame.bidAmount': `BID ${String(params?.amount ?? '$20M')}`,
        'auctionGame.raiseBy': `+${String(params?.amount ?? '$10M')}`,
        'auctionGame.bidTotalAmount': `Bid: ${String(params?.amount ?? '$0')}`,
        'auctionGame.cannotAffordRaise': 'Not enough budget',
        'auctionGame.biddingOpensIn': 'Bidding opens in',
        'auctionGame.leftAmount': `Left: ${String(params?.amount ?? '$0')}`,
        'auctionGame.bid': 'Bid',
        'auctionGame.budgetAmount': `Budget: ${String(params?.amount ?? '$0')}`,
        'auctionGame.maxBidAmount': `Max bid: ${String(params?.amount ?? '$0')}`,
        'auctionGame.fold': 'Fold',
        'auctionGame.bidPlacedWaiting': 'Bid placed - waiting...',
        'auctionGame.foldPlacedWaiting': 'Fold sent - waiting...',
        'auctionGame.eliminatedWatching': 'You are eliminated - watching',
        'auctionGame.positionFilledWatching': `${String(params?.position ?? 'Forward')} filled - watching`,
        'auctionGame.waitingForTurn': `${String(params?.name ?? '')}'s turn...`,
        'auctionGame.budgetLabel': 'Budget',
        'auctionGame.totalBidsShort': `${String(params?.count ?? 0)} bids`,
        'auctionGame.rivalLeading': 'Leading',
        'auctionGame.rivalIn': 'In',
        'auctionGame.rivalFolded': 'Folded',
        'auctionGame.rivalSittingOut': 'Sitting out',
        'auctionGame.rivalOut': 'Out',
        'auctionGame.botTag': 'BOT',
        'auctionGame.positionForward': 'Forward',
      };
      return messages[key] ?? key;
    },
  }),
}));

vi.mock('../../pitch/AllSquads', () => ({
  AllSquads: () => <div data-testid="all-squads" />,
}));

const formation = FORMATIONS[0];

function player(seatId: string, overrides: Partial<AuctionPlayer> = {}): AuctionPlayer {
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
    ...overrides,
  };
}

function round(overrides: Partial<AuctionRound> = {}): AuctionRound {
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
    biddingStartsAt: null,
    ...overrides,
  };
}

function state(overrides: Partial<AuctionGameState> = {}): AuctionGameState {
  return {
    phase: 'bidding',
    players: [player('seat-human'), player('seat-bot')],
    formation,
    currentRound: round(),
    roundIndex: 1,
    totalRounds: 2,
    completedRounds: [],
    soloPick: null,
    ...overrides,
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
    expect(screen.queryByRole('button', { name: /BID|\+\$/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Fold' })).not.toBeInTheDocument();
  });

  it('offers exactly one raise button plus fold once a bid stands', () => {
    render(<BiddingScreen state={state()} actions={actions()} humanPlayerId="seat-human" />);

    // Standing bid of $25M → the only raise on offer is +$10M, no presets.
    expect(screen.getByRole('button', { name: /\+\$10M/ })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Fold' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /ALL IN|MIN|\+\$25M|\+\$50M/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('spinbutton')).not.toBeInTheDocument();
  });

  it('labels the opening bid with the starting price and hides fold', () => {
    const openingRound = round({ bids: [], highestBidderId: null, highestBid: 0 });

    render(
      <BiddingScreen
        state={state({ currentRound: openingRound })}
        actions={actions()}
        humanPlayerId="seat-human"
      />,
    );

    // Opening a lot bids the starting price outright, and the opener can't fold.
    expect(screen.getByRole('button', { name: /BID \$20M/ })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Fold' })).not.toBeInTheDocument();
  });

  it('counts down the study window and withholds bid controls until it ends', () => {
    const studyRound = round({ biddingStartsAt: Date.now() + 10_000, currentTurnId: null, turnEndsAt: null });

    render(
      <BiddingScreen
        state={state({ phase: 'clue-reveal', currentRound: studyRound })}
        actions={actions()}
        humanPlayerId="seat-human"
      />,
    );

    expect(screen.getByText('Bidding opens in')).toBeInTheDocument();
    expect(screen.queryByText('Bidding open')).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /BID|\+\$/i })).not.toBeInTheDocument();
  });

  it('explains why you are sitting a lot out instead of just saying "watching"', () => {
    // turnOrder omits seats that already filled this position, so the player
    // can never act. Previously the UI gave no reason and looked broken.
    const sitOutRound = round({ turnOrder: ['seat-bot'], currentTurnId: 'seat-bot' });

    render(
      <BiddingScreen
        state={state({ currentRound: sitOutRound })}
        actions={actions()}
        humanPlayerId="seat-human"
      />,
    );

    expect(screen.getByText('Forward filled - watching')).toBeInTheDocument();
  });

  it('says you are eliminated when your budget ran out', () => {
    const eliminated = [player('seat-human', { isEliminated: true }), player('seat-bot')];
    const sitOutRound = round({ turnOrder: ['seat-bot'], currentTurnId: 'seat-bot' });

    render(
      <BiddingScreen
        state={state({ players: eliminated, currentRound: sitOutRound })}
        actions={actions()}
        humanPlayerId="seat-human"
      />,
    );

    expect(screen.getByText('You are eliminated - watching')).toBeInTheDocument();
  });

  it('shows each rival’s status and budget, and flags bots', () => {
    const folded = round({ foldedIds: ['seat-bot'] });

    render(
      <BiddingScreen
        state={state({ currentRound: folded })}
        actions={actions()}
        humanPlayerId="seat-human"
      />,
    );

    // A rival folding means the lot may already be yours — it must be visible.
    expect(screen.getByText('Folded')).toBeInTheDocument();
    expect(screen.getByText('BOT')).toBeInTheDocument();
  });

  it('keeps your own budget on screen when it is not your turn', () => {
    const notMyTurn = round({ currentTurnId: 'seat-bot' });

    render(
      <BiddingScreen
        state={state({ currentRound: notMyTurn })}
        actions={actions()}
        humanPlayerId="seat-human"
      />,
    );

    expect(screen.getByText('Budget')).toBeInTheDocument();
  });
});
