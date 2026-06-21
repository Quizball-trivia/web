import { act, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { AuctionActions } from '../../../hooks/useAuctionGame';
import { FORMATIONS } from '../../../data';
import type { AuctionGameState, AuctionPlayer, AuctionRound } from '../../../types';
import { RevealScreen } from '../RevealScreen';

vi.mock('@/contexts/LocaleContext', () => ({
  useLocale: () => ({
    locale: 'en',
    t: (key: string, params?: Record<string, unknown>) => {
      if (key === 'auctionGame.trueValue') return 'True Value';
      if (key === 'auctionGame.soldFor') return 'Sold For';
      if (key === 'auctionGame.joinedYourSquad') return `${String(params?.name ?? 'Player')} joined your squad`;
      if (key === 'auctionGame.joinedSquad') return `${String(params?.name ?? 'Player')} joined ${String(params?.owner ?? 'opponent')}`;
      if (key === 'auctionGame.nextRound') return 'Next Round';
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

    act(() => {
      vi.advanceTimersByTime(3199);
    });
    expect(testActions.confirmReveal).not.toHaveBeenCalled();

    act(() => {
      vi.advanceTimersByTime(1);
    });
    expect(testActions.confirmReveal).toHaveBeenCalledTimes(1);
  });
});
