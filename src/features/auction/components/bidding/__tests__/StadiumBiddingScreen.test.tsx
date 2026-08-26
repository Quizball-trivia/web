import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import type { AuctionActions } from '../../../hooks/useAuctionGame';
import { FORMATIONS } from '../../../data';
import type { AuctionGameState, AuctionPlayer } from '../../../types';
import { StadiumBiddingScreen } from '../StadiumBiddingScreen';

vi.mock('@/contexts/LocaleContext', () => ({
  useLocale: () => ({
    locale: 'en',
    t: (key: string) => {
      const messages: Record<string, string> = {
        'auctionGame.mysteryPlayer': 'Mystery Player',
        'auctionGame.preparingMysteryPlayer': 'Preparing player clues…',
      };
      return messages[key] ?? key;
    },
  }),
}));

const formation = FORMATIONS[0];

function player(): AuctionPlayer {
  return {
    id: 'seat-human',
    username: 'Human',
    avatarSeed: 'seat-human',
    budget: 100_000_000,
    isBot: false,
    isEliminated: false,
    team: {
      formation,
      slots: { GK: [], DEF: [], MID: [], FWD: [] },
    },
  };
}

function state(overrides: Partial<AuctionGameState> = {}): AuctionGameState {
  return {
    phase: 'clue-reveal',
    players: [player()],
    formation,
    currentRound: null,
    roundIndex: 1,
    totalRounds: 2,
    completedRounds: [],
    soloPick: null,
    ...overrides,
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

describe('StadiumBiddingScreen', () => {
  it('shows the mystery-player transition instead of a black screen when round data is late', () => {
    render(<StadiumBiddingScreen state={state()} actions={actions()} humanPlayerId="seat-human" />);

    expect(screen.getByTestId('stadium-mystery-loading')).toBeInTheDocument();
    expect(screen.getByRole('status')).toHaveTextContent('Mystery Player');
    expect(screen.getByText('Preparing player clues…')).toBeInTheDocument();
  });

  it('shows the same transition while the local player seat is still hydrating', () => {
    render(
      <StadiumBiddingScreen
        state={state({ players: [] })}
        actions={actions()}
        humanPlayerId="seat-human"
      />,
    );

    expect(screen.getByTestId('stadium-mystery-loading')).toBeInTheDocument();
  });
});
