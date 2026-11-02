import { act, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { AuctionActions } from '../../../hooks/useAuctionGame';
import { FORMATIONS } from '../../../data';
import type { AuctionGameState, AuctionPlayer, AuctionRound } from '../../../types';
import { REVEAL_HOLD_MS, RevealScreen } from '../RevealScreen';

vi.mock('@/contexts/LocaleContext', () => ({
  useLocale: () => ({
    locale: 'en',
    t: (key: string, params?: Record<string, unknown>) => {
      if (key === 'auctionGame.trueValue') return 'True Value';
      if (key === 'auctionGame.valueInSeason') return `Value · ${String(params?.season)}`;
      if (key === 'auctionGame.revealScoutValue') return `Scouting card · ${String(params?.season)}`;
      if (key === 'auctionGame.revealStartingPrice') return `Starting price · ${String(params?.season)}`;
      if (key === 'auctionGame.startingPriceLabel') return 'Starting price';
      if (key === 'auctionGame.soldFor') return 'Sold For';
      if (key === 'auctionGame.joinedYourSquad') return `${String(params?.name ?? 'Player')} joined your squad`;
      if (key === 'auctionGame.joinedSquad') return `${String(params?.name ?? 'Player')} joined ${String(params?.owner ?? 'opponent')}`;
      if (key === 'auctionGame.nextRound') return 'Next Round';
      if (key === 'auctionGame.confirmingTransfer') return 'Confirming transfer…';
      return key;
    },
  }),
}));

const formation = FORMATIONS[0];

function player(id: string, username: string): AuctionPlayer {
  return {
    id,
    username,
    avatarSeed: id,
    budget: 80_000_000,
    isBot: false,
    isEliminated: false,
    team: {
      formation,
      slots: {
        GK: [],
        DEF: [],
        MID: [],
        FWD: [],
      },
    },
  };
}

function round(): AuctionRound {
  return {
    positionGroup: 'FWD',
    footballer: {
      id: 'footballer-1',
      name: 'Test Striker',
      positionGroup: 'FWD',
      value: 100_000_000,
      startingPrice: 20_000_000,
      clues: ['clue 1', 'clue 2', 'clue 3'],
      nationality: 'Georgia',
    },
    clues: ['clue 1', 'clue 2', 'clue 3'],
    clueRevealIndex: 3,
    bids: [{ playerId: 'seat-human', amount: 30_000_000 }],
    highestBidderId: 'seat-human',
    highestBid: 30_000_000,
    startingPrice: 20_000_000,
    winnerId: 'seat-human',
    winningBid: 30_000_000,
    revealed: true,
    countdownEndsAt: null,
    turnOrder: ['seat-human', 'seat-bot'],
    currentTurnId: null,
    foldedIds: ['seat-bot'],
    turnEndsAt: null,
    biddingStartsAt: null,
  };
}

function state(): AuctionGameState {
  const currentRound = round();
  return {
    phase: 'reveal',
    players: [player('seat-human', 'Human'), player('seat-bot', 'Bot')],
    formation,
    currentRound,
    roundIndex: 0,
    totalRounds: 1,
    completedRounds: [currentRound],
    soloPick: null,
  };
}

function actions(): AuctionActions {
  return {
    startGame: vi.fn(),
    placeBid: vi.fn(),
    fold: vi.fn(),
    confirmReveal: vi.fn(),
    pickSoloOption: vi.fn(),
    setPhase: vi.fn(),
  };
}

describe('RevealScreen', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('shows the next round button for local transitions', () => {
    render(<RevealScreen state={state()} actions={actions()} humanPlayerId="seat-human" />);

    act(() => {
      vi.advanceTimersByTime(3300);
    });

    expect(screen.getByRole('button', { name: 'Next Round' })).toBeInTheDocument();
  });

  it('hides the next round button for server-driven transitions', () => {
    render(
      <RevealScreen
        state={state()}
        actions={actions()}
        humanPlayerId="seat-human"
        serverDrivenTransitions
      />,
    );

    act(() => {
      vi.advanceTimersByTime(3300);
    });

    expect(screen.queryByRole('button', { name: 'Next Round' })).not.toBeInTheDocument();
  });

  it('acks server-driven reveal only after the reveal animation completes', () => {
    const testActions = actions();

    render(
      <RevealScreen
        state={state()}
        actions={testActions}
        humanPlayerId="seat-human"
        serverDrivenTransitions
      />,
    );

    expect(testActions.confirmReveal).not.toHaveBeenCalled();

    // Reveal cascade holds the full picture until REVEAL_HOLD_MS (4.5s),
    // then acks the server-driven transition.
    act(() => {
      vi.advanceTimersByTime(REVEAL_HOLD_MS - 1);
    });
    expect(testActions.confirmReveal).not.toHaveBeenCalled();

    act(() => {
      vi.advanceTimersByTime(1);
    });
    expect(testActions.confirmReveal).toHaveBeenCalledTimes(1);
  });

  it('shows a visible transition state instead of a black screen when reveal data is late', () => {
    const missingRoundState = {
      ...state(),
      currentRound: null,
      completedRounds: [],
    };

    render(
      <RevealScreen
        state={missingRoundState}
        actions={actions()}
        humanPlayerId="seat-human"
        serverDrivenTransitions
      />,
    );

    expect(screen.getByText('Confirming transfer…')).toBeInTheDocument();
  });

  it('runs the full staged reveal when round data arrives after mount', () => {
    const missingRoundState = {
      ...state(),
      currentRound: null,
      completedRounds: [],
    };
    const testActions = actions();

    const { rerender } = render(
      <RevealScreen
        state={missingRoundState}
        actions={testActions}
        humanPlayerId="seat-human"
        serverDrivenTransitions
      />,
    );

    // Long spinner wait — mount-keyed timers would have fully elapsed by now.
    act(() => {
      vi.advanceTimersByTime(10_000);
    });
    expect(testActions.confirmReveal).not.toHaveBeenCalled();

    rerender(
      <RevealScreen
        state={state()}
        actions={testActions}
        humanPlayerId="seat-human"
        serverDrivenTransitions
      />,
    );

    // The reveal must restage from the moment the data landed, not ack at once.
    act(() => {
      vi.advanceTimersByTime(REVEAL_HOLD_MS - 1);
    });
    expect(testActions.confirmReveal).not.toHaveBeenCalled();

    act(() => {
      vi.advanceTimersByTime(1);
    });
    expect(testActions.confirmReveal).toHaveBeenCalledTimes(1);
  });

  it('restages a new reveal identity instead of acking it instantly', () => {
    const testActions = actions();

    const { rerender } = render(
      <RevealScreen
        state={state()}
        actions={testActions}
        humanPlayerId="seat-human"
        serverDrivenTransitions
      />,
    );

    act(() => {
      vi.advanceTimersByTime(REVEAL_HOLD_MS);
    });
    expect(testActions.confirmReveal).toHaveBeenCalledTimes(1);

    // Next lot arrives while the screen stays mounted: new identity must run
    // its own full staged reveal, not inherit the finished stage/holdDone.
    const nextState = state();
    nextState.roundIndex = 1;
    rerender(
      <RevealScreen
        state={nextState}
        actions={testActions}
        humanPlayerId="seat-human"
        serverDrivenTransitions
      />,
    );

    act(() => {
      vi.advanceTimersByTime(REVEAL_HOLD_MS - 1);
    });
    expect(testActions.confirmReveal).toHaveBeenCalledTimes(1);

    act(() => {
      vi.advanceTimersByTime(1);
    });
    expect(testActions.confirmReveal).toHaveBeenCalledTimes(2);
  });
  it('labels every value on the lot with its season and one currency', () => {
    const lot = state();
    lot.currentRound!.footballer = {
      ...lot.currentRound!.footballer,
      value: 8_000_000,
      startingPrice: 2_500_000,
      startingPriceOrigin: { source: 'market_history', season: '2009/10' },
      snapshots: [
        { season: '2017/18', league: 'Ligue 1', age: 26, apps: 20, goals: 19, assists: 13, valueEur: 128_000_000 },
        { season: '2025/26', league: 'Brasileirão', age: 34, apps: 12, goals: 3, valueEur: 8_000_000 },
      ],
    };
    lot.currentRound!.startingPrice = 2_500_000;

    render(<RevealScreen state={lot} actions={actions()} humanPlayerId="seat-human" />);
    act(() => {
      vi.advanceTimersByTime(1_600);
    });

    const trail = screen.getByTestId('auction-value-trail');
    expect(trail).toHaveTextContent('Scouting card · 2017/18€128M');
    expect(trail).toHaveTextContent('Starting price · 2009/10€2.5M');
    expect(trail).toHaveTextContent('Value · 2025/26€8M');
    expect(document.body.textContent).not.toContain('$');
  });

  it('falls back to a plain starting-price label when its origin is unknown', () => {
    render(<RevealScreen state={state()} actions={actions()} humanPlayerId="seat-human" />);
    act(() => {
      vi.advanceTimersByTime(1_600);
    });

    expect(screen.getByTestId('auction-value-trail')).toHaveTextContent('Starting price€20M');
  });
});
