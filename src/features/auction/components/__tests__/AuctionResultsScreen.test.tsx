import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { FORMATIONS, createEmptyTeam } from '../../data';
import type { AuctionGameState, AuctionPlayer } from '../../types';
import { AuctionResultsScreen } from '../AuctionResultsScreen';

const formation = FORMATIONS[0];

function player(id: string, username: string): AuctionPlayer {
  return {
    id,
    username,
    avatarSeed: id,
    budget: 80_000_000,
    isBot: false,
    isEliminated: false,
    team: createEmptyTeam(formation),
  };
}

function state(rankings?: string[]): AuctionGameState {
  return {
    phase: 'results',
    players: [player('seat-human', 'Human'), player('seat-bot-1', 'Bot One'), player('seat-bot-2', 'Bot Two')],
    formation,
    currentRound: null,
    roundIndex: 0,
    totalRounds: 1,
    completedRounds: [],
    soloPick: null,
    rankings: rankings ?? null,
  };
}

function renderScreen(props: Partial<React.ComponentProps<typeof AuctionResultsScreen>> = {}) {
  return render(
    <AuctionResultsScreen
      state={state(['seat-human', 'seat-bot-1', 'seat-bot-2'])}
      humanPlayerId="seat-human"
      onPlayAgain={() => {}}
      onExit={() => {}}
      {...props}
    />,
  );
}

describe('AuctionResultsScreen — Auction Points', () => {
  it('reveals the AP earned as plain text (no pill, no caption)', () => {
    renderScreen({ apEarned: 50 });

    expect(screen.getAllByText('+50 AP').length).toBeGreaterThan(0);
    expect(screen.queryByText('Auction Points')).not.toBeInTheDocument();
  });

  it.each([
    [50, '+50 AP'],
    [30, '+30 AP'],
    [10, '+10 AP'],
  ])('renders the podium AP value for %i', (ap, label) => {
    renderScreen({ apEarned: ap });

    expect(screen.getAllByText(label).length).toBeGreaterThan(0);
  });

  it('hides AP entirely for friendly lobbies (apEarned absent)', () => {
    renderScreen();

    expect(screen.queryByText(/AP$/)).not.toBeInTheDocument();
    expect(screen.queryByText('Auction Points')).not.toBeInTheDocument();
  });

  it('hides AP when the server awards zero', () => {
    renderScreen({ apEarned: 0 });

    expect(screen.queryByText('+0 AP')).not.toBeInTheDocument();
    expect(screen.queryByText('Auction Points')).not.toBeInTheDocument();
  });

  it('never shows AP to a forfeiter', () => {
    renderScreen({ apEarned: 50, forfeited: true });

    expect(screen.queryByText('+50 AP')).not.toBeInTheDocument();
    expect(screen.queryByText('Auction Points')).not.toBeInTheDocument();
  });

  it('still shows coins independently of AP', () => {
    renderScreen({ coinsAwarded: 500 });

    expect(screen.getByText('+500')).toBeInTheDocument();
    expect(screen.queryByText('Auction Points')).not.toBeInTheDocument();
  });
});

describe('AuctionResultsScreen — forfeit hides the ongoing match', () => {
  it('shows only the leaver’s own outcome, never rival standings', () => {
    renderScreen({ forfeited: true });

    // Own outcome: guaranteed last place, stated plainly.
    expect(screen.getByText('You Forfeited')).toBeInTheDocument();
    expect(screen.getByText('You finish 3rd')).toBeInTheDocument();
    expect(screen.getByText('Your squad')).toBeInTheDocument();

    // The other two are still bidding — none of their state may leak.
    expect(screen.queryByText('Bot One')).not.toBeInTheDocument();
    expect(screen.queryByText('Bot Two')).not.toBeInTheDocument();
    expect(screen.getAllByText('Human')).toHaveLength(1);
  });

  it('renders no podium on a forfeit', () => {
    const { container } = renderScreen({ forfeited: true });

    // The podium is the only place rank numerals are rendered as bare text.
    expect(container.querySelector('.grid-cols-3')).toBeNull();
  });

  it('keeps the full podium and rankings for a finished match', () => {
    const { container } = renderScreen();

    expect(container.querySelector('.grid-cols-3')).not.toBeNull();
    expect(screen.getAllByText('Bot One').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Bot Two').length).toBeGreaterThan(0);
  });

  it('uses removal copy when the server dropped the player', () => {
    renderScreen({ forfeited: true, removed: true });

    expect(screen.getByText('Removed From Match')).toBeInTheDocument();
    expect(screen.getByText('You finish 3rd')).toBeInTheDocument();
    expect(screen.queryByText('Bot One')).not.toBeInTheDocument();
  });
});
