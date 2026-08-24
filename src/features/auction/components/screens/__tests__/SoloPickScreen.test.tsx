import { render, screen, act } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { AuctionActions } from '../../../hooks/useAuctionGame';
import { FORMATIONS } from '../../../data';
import type { AuctionGameState, AuctionPlayer } from '../../../types';
import { SoloPickScreen } from '../SoloPickScreen';

vi.mock('@/contexts/LocaleContext', () => ({
  useLocale: () => ({
    locale: 'en',
    t: (key: string, params?: Record<string, unknown>) => {
      if (key === 'auctionGame.opponentPicking') return `${String(params?.name)} is picking`;
      if (key === 'auctionGame.opponentPickingHint') return 'Bidding resumes right after';
      return key;
    },
  }),
}));

const formation = FORMATIONS[0];

function player(id: string, isBot: boolean): AuctionPlayer {
  return {
    id,
    username: id,
    avatarSeed: id,
    budget: 500_000_000,
    isBot,
    isEliminated: false,
    team: { formation, slots: { GK: [], DEF: [], MID: [], FWD: [] } },
  };
}

const footballer = {
  id: 'f1',
  name: 'Someone',
  positionGroup: 'GK' as const,
  value: 50_000_000,
  startingPrice: 20_000_000,
  clues: ['a', 'b', 'c'],
  nationality: 'Georgia',
};

function state(pickerId: string, pickerIsBot: boolean): AuctionGameState {
  return {
    phase: 'solo-pick',
    players: [player('seat-human', false), player(pickerId, pickerIsBot)],
    formation,
    currentRound: null,
    roundIndex: 1,
    totalRounds: 2,
    completedRounds: [],
    soloPick: {
      playerId: pickerId,
      positionGroup: 'GK',
      optionA: { type: 'revealed', footballer },
      optionB: { type: 'mystery', footballer, clues: ['a', 'b', 'c'] },
    },
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

beforeEach(() => vi.useFakeTimers());
afterEach(() => vi.useRealTimers());

describe('SoloPickScreen — spectating another seat', () => {
  it('never submits a pick on another seat’s behalf in a live match', () => {
    // Regression: this fired for every spectator, so in a 3-player match both
    // non-pickers sent a pick for the picker, got rejected server-side, and were
    // shown an error banner on every solo-pick round.
    const pickSoloOption = vi.fn();
    render(
      <SoloPickScreen
        state={state('seat-rival', false)}
        actions={actions({ pickSoloOption })}
        humanPlayerId="seat-human"
        serverDrivenTransitions
      />,
    );

    act(() => void vi.advanceTimersByTime(5000));
    expect(pickSoloOption).not.toHaveBeenCalled();
  });

  it('still stands in for a bot in the offline mock flow', () => {
    const pickSoloOption = vi.fn();
    render(
      <SoloPickScreen
        state={state('seat-bot', true)}
        actions={actions({ pickSoloOption })}
        humanPlayerId="seat-human"
      />,
    );

    act(() => void vi.advanceTimersByTime(2000));
    expect(pickSoloOption).toHaveBeenCalledTimes(1);
  });

  it('does not call a human opponent a bot', () => {
    render(
      <SoloPickScreen
        state={state('seat-rival', false)}
        actions={actions()}
        humanPlayerId="seat-human"
        serverDrivenTransitions
      />,
    );

    expect(screen.getByText('seat-rival is picking')).toBeInTheDocument();
    expect(screen.queryByText('🤖')).not.toBeInTheDocument();
    expect(screen.getByText('⏳')).toBeInTheDocument();
  });
});
