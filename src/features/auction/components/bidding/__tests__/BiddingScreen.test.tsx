import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import type { AuctionActions } from '../../../hooks/useAuctionGame';
import { FORMATIONS } from '../../../data';
import type { AuctionGameState, AuctionPlayer, AuctionRound, Footballer, PositionGroup } from '../../../types';
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
        'auctionGame.raiseBreakdown': `${String(params?.previous ?? '$0')} + ${String(params?.raise ?? '$10M')} raise`,
        'auctionGame.customBidRange': `Or bid any amount from ${String(params?.min ?? '$0')} to ${String(params?.max ?? '$0')}`,
        'auctionGame.customBidLabel': 'Custom bid amount in millions',
        'auctionGame.cannotAffordRaise': 'Not enough budget',
        'auctionGame.biddingOpensIn': 'Bidding opens in',
        'auctionGame.leftAmount': `Left: ${String(params?.amount ?? '$0')}`,
        'auctionGame.bid': 'Bid',
        'auctionGame.budgetAmount': `Budget: ${String(params?.amount ?? '$0')}`,
        'auctionGame.maxBidAmount': `Max bid: ${String(params?.amount ?? '$0')}`,
        'auctionGame.fold': 'Fold',
        'auctionGame.pass': 'Pass',
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

/**
 * The default fixture leaves all 11 slots empty, so the per-slot budget reserve
 * drives maxBid to 0 and every bid control is disabled. These states give the
 * human one slot left and a full budget, which is what a real late lot looks
 * like — maxBid is then the whole budget.
 */
function stateWithBidRoom(overrides: Partial<AuctionGameState> = {}): AuctionGameState {
  const filled = (group: PositionGroup, count: number): Footballer[] =>
    Array.from({ length: count }, (_, i) => ({
      id: `${group}-${i}`,
      name: `Filled ${group} ${i}`,
      positionGroup: group,
      value: 20_000_000,
      startingPrice: 20_000_000,
      clues: [],
      nationality: 'Georgia',
    }));

  const human = player('seat-human', {
    budget: 100_000_000,
    team: {
      formation,
      // 2-2-2 with every slot filled except one FWD — the group this lot is
      // for. One empty slot means no budget reserve, so maxBid == budget.
      slots: {
        GK: filled('GK', 1),
        DEF: filled('DEF', 2),
        MID: filled('MID', 2),
        FWD: filled('FWD', 1),
      },
    },
  });

  return state({ players: [human, player('seat-bot')], ...overrides });
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

  it('offers the quick raise, a custom-amount input and fold once a bid stands', () => {
    render(<BiddingScreen state={stateWithBidRoom()} actions={actions()} humanPlayerId="seat-human" />);

    // Standing bid of $25M → quick bid is the $35M total, not a bare "+$10M".
    expect(screen.getByRole('button', { name: /BID \$35M/ })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Fold' })).toBeInTheDocument();
    // The custom input is back; the five fixed presets are still gone.
    expect(screen.getByRole('spinbutton')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /ALL IN|MIN|\+\$25M|\+\$50M/i })).not.toBeInTheDocument();
  });

  it('submits a custom amount that is not a multiple of the raise increment', async () => {
    const user = userEvent.setup();
    const gameActions = actions();

    render(<BiddingScreen state={stateWithBidRoom()} actions={gameActions} humanPlayerId="seat-human" />);

    await user.type(screen.getByRole('spinbutton'), '41.6');
    await user.click(screen.getByRole('button', { name: 'Bid' }));

    expect(gameActions.placeBid).toHaveBeenCalledWith(41_600_000);
  });

  it('rejects a custom amount below the minimum bid', async () => {
    const user = userEvent.setup();
    const gameActions = actions();

    render(<BiddingScreen state={stateWithBidRoom()} actions={gameActions} humanPlayerId="seat-human" />);

    // Standing bid $25M → minimum is $35M, so $30M must not be submittable.
    await user.type(screen.getByRole('spinbutton'), '30');

    expect(screen.getByRole('button', { name: 'Bid' })).toBeDisabled();
    expect(gameActions.placeBid).not.toHaveBeenCalled();
  });

  it('submits the exact amount typed rather than rounding to display precision', async () => {
    const user = userEvent.setup();
    const gameActions = actions();

    render(<BiddingScreen state={stateWithBidRoom()} actions={gameActions} humanPlayerId="seat-human" />);

    // 41.06 must not become 41.1M — that would charge more than was entered.
    await user.type(screen.getByRole('spinbutton'), '41.06');
    await user.click(screen.getByRole('button', { name: 'Bid' }));

    expect(gameActions.placeBid).toHaveBeenCalledWith(41_060_000);
  });

  it('keeps the typed amount after submitting so a rejected bid is not lost', async () => {
    const user = userEvent.setup();
    const gameActions = actions();

    render(<BiddingScreen state={stateWithBidRoom()} actions={gameActions} humanPlayerId="seat-human" />);

    const input = screen.getByRole('spinbutton');
    await user.type(input, '41.6');
    await user.click(screen.getByRole('button', { name: 'Bid' }));

    expect(input).toHaveValue(41.6);
  });

  it('shows the raise broken down so a non-round total explains itself', () => {
    render(<BiddingScreen state={stateWithBidRoom()} actions={actions()} humanPlayerId="seat-human" />);

    // Standing bid $25M + $10M = $35M. The subtext must show the arithmetic,
    // which is what stops a non-round total reading as a broken increment.
    expect(screen.getByText('$25M + $10M raise')).toBeInTheDocument();
  });

  it('suggests a placeholder its own Bid button will accept', () => {
    // A $350K opening price must not suggest "0.3" — that parses below the
    // minimum and leaves the button permanently disabled.
    const cheapLot = round({
      bids: [],
      highestBidderId: null,
      highestBid: 0,
      startingPrice: 350_000,
    });

    render(
      <BiddingScreen
        state={stateWithBidRoom({ currentRound: cheapLot })}
        actions={actions()}
        humanPlayerId="seat-human"
      />,
    );

    expect(screen.getByRole('spinbutton')).toHaveAttribute('placeholder', '0.35');
  });

  it('labels the opening bid with the starting price and offers Pass', () => {
    const openingRound = round({ bids: [], highestBidderId: null, highestBid: 0 });

    render(
      <BiddingScreen
        state={state({ currentRound: openingRound })}
        actions={actions()}
        humanPlayerId="seat-human"
      />,
    );

    // Opening a lot bids the starting price outright — or the opener passes
    // (the forced-open rule is gone; the button reads Pass, not Fold).
    expect(screen.getByRole('button', { name: /BID \$20M/ })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Pass' })).toBeInTheDocument();
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

  it('shows each rival’s status and budget, and never labels a seat as a bot', () => {
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
    // Product rule: users are never told an opponent is a bot.
    expect(screen.queryByText('BOT')).not.toBeInTheDocument();
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
