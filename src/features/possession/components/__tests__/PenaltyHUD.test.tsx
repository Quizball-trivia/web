import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { PenaltyHUD } from '../PenaltyHUD';

vi.mock('@/components/AvatarDisplay', () => ({
  AvatarDisplay: () => <div data-testid="avatar" />,
}));

const baseProps = {
  penaltyPlayerScore: 0,
  penaltyOpponentScore: 0,
  penaltyRound: 1,
  isPenaltySuddenDeath: false,
  isPlayerShooter: true,
  playerName: 'Player',
  opponentName: 'Opponent',
  playerAvatarUrl: '',
  opponentAvatarUrl: '',
  timeRemaining: 10,
  phase: 'penalty-question' as const,
};

describe('PenaltyHUD pips', () => {
  it('colors made penalties green for both player and opponent, and misses red', () => {
    render(
      <PenaltyHUD
        {...baseProps}
        penaltyPlayerScore={1}
        penaltyOpponentScore={1}
        penaltyPlayerAttempts={['miss', 'goal']}
        penaltyOpponentAttempts={['goal']}
      />,
    );

    const playerPips = screen.getAllByTestId('penalty-player-pip');
    const opponentPips = screen.getAllByTestId('penalty-opponent-pip');

    expect(playerPips[0]).toHaveClass('bg-brand-red-soft');
    expect(playerPips[1]).toHaveClass('bg-brand-green-light');
    expect(opponentPips[0]).toHaveClass('bg-brand-green-light');
    expect(opponentPips[0]).not.toHaveClass('bg-brand-red-soft');
  });
});
