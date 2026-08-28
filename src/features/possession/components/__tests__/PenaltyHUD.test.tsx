import { act, render, screen } from '@testing-library/react';
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

describe('PenaltyHUD sudden-death pip hold', () => {
  const fiveMissesEach = {
    ...baseProps,
    penaltyPlayerScore: 0,
    penaltyOpponentScore: 0,
    penaltyPlayerAttempts: ['miss', 'miss', 'miss', 'miss', 'miss'] as Array<'goal' | 'miss'>,
    penaltyOpponentAttempts: ['miss', 'miss', 'miss', 'miss', 'miss'] as Array<'goal' | 'miss'>,
    isPenaltySuddenDeath: true,
    penaltyRound: 11,
  };

  it('keeps the full regulation rows visible when sudden death first flips on (the 10th kick must be seen)', () => {
    vi.useFakeTimers();
    try {
      render(<PenaltyHUD {...fiveMissesEach} />);
      // Immediately after the SD flag arrives — BEFORE the hold expires — all
      // five regulation pips must still be shown filled, not wiped to empty.
      const playerPips = screen.getAllByTestId('penalty-player-pip');
      expect(playerPips).toHaveLength(5);
      for (const pip of playerPips) {
        expect(pip).toHaveClass('bg-brand-red-soft');
      }
    } finally {
      vi.useRealTimers();
    }
  });

  it('clears the rows to the SD-relative view only after the hold elapses', async () => {
    vi.useFakeTimers();
    try {
      render(<PenaltyHUD {...fiveMissesEach} />);
      await act(async () => { await vi.advanceTimersByTimeAsync(2100); });
      // Post-hold: baseline captured at 5 attempts each → SD-relative rows are
      // empty slots again (no attempts sliced in yet).
      for (const pip of screen.getAllByTestId('penalty-player-pip')) {
        expect(pip).toHaveClass('bg-transparent');
      }
      for (const pip of screen.getAllByTestId('penalty-opponent-pip')) {
        expect(pip).toHaveClass('bg-transparent');
      }
    } finally {
      vi.useRealTimers();
    }
  });

  it('shows only SD attempts after the hold, even when an SD kick already landed', async () => {
    vi.useFakeTimers();
    try {
      const { rerender } = render(<PenaltyHUD {...fiveMissesEach} />);
      await act(async () => { await vi.advanceTimersByTimeAsync(2100); });
      rerender(
        <PenaltyHUD
          {...fiveMissesEach}
          penaltyPlayerScore={1}
          penaltyPlayerAttempts={[...fiveMissesEach.penaltyPlayerAttempts, 'goal']}
        />,
      );
      const playerPips = screen.getAllByTestId('penalty-player-pip');
      expect(playerPips[0]).toHaveClass('bg-brand-green-light');
      expect(playerPips.filter((pip) => pip.className.includes('bg-brand-red-soft'))).toHaveLength(0);
    } finally {
      vi.useRealTimers();
    }
  });

  it('a fast SD kick landing INSIDE the hold window is not folded into the baseline', async () => {
    vi.useFakeTimers();
    try {
      const { rerender } = render(<PenaltyHUD {...fiveMissesEach} />);
      // SD kick resolves before the hold expires (attempts grow to 6).
      rerender(
        <PenaltyHUD
          {...fiveMissesEach}
          penaltyPlayerScore={1}
          penaltyPlayerAttempts={[...fiveMissesEach.penaltyPlayerAttempts, 'goal']}
        />,
      );
      await act(async () => { await vi.advanceTimersByTimeAsync(2100); });
      // Baseline clamps to the 5 regulation kicks, so the SD goal survives.
      const playerPips = screen.getAllByTestId('penalty-player-pip');
      expect(playerPips[0]).toHaveClass('bg-brand-green-light');
    } finally {
      vi.useRealTimers();
    }
  });

  it('resets the baseline when sudden death ends (rematch shows regulation pips again)', async () => {
    vi.useFakeTimers();
    try {
      const { rerender } = render(<PenaltyHUD {...fiveMissesEach} />);
      await act(async () => { await vi.advanceTimersByTimeAsync(2100); });
      rerender(
        <PenaltyHUD
          {...fiveMissesEach}
          isPenaltySuddenDeath={false}
          penaltyRound={1}
          penaltyPlayerAttempts={['goal'] as Array<'goal' | 'miss'>}
          penaltyPlayerScore={1}
        />,
      );
      const playerPips = screen.getAllByTestId('penalty-player-pip');
      expect(playerPips[0]).toHaveClass('bg-brand-green-light');
    } finally {
      vi.useRealTimers();
    }
  });
});
