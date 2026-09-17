import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

vi.mock('@/components/AvatarDisplay', () => ({
  AvatarDisplay: () => <div data-testid="avatar" />,
}));

import { PenaltyMatchEndOverlay } from '../PenaltyMatchEndOverlay';

const baseProps = {
  visible: true,
  myPenaltyGoals: 3,
  oppPenaltyGoals: 3,
  playerName: 'Me',
  opponentName: 'Them',
};

describe('PenaltyMatchEndOverlay', () => {
  it('renders a draw title (never "Did not win") when the shootout ends level', () => {
    render(<PenaltyMatchEndOverlay {...baseProps} playerWon={false} isDraw />);
    expect(screen.getByText('Draw')).toBeInTheDocument();
    expect(screen.getByText("Level after the penalties — it's a draw.")).toBeInTheDocument();
    expect(screen.queryByText('Did not win')).not.toBeInTheDocument();
    expect(screen.queryByText('Won')).not.toBeInTheDocument();
  });

  it('still renders won / did-not-win for decided shootouts', () => {
    const { unmount } = render(<PenaltyMatchEndOverlay {...baseProps} playerWon oppPenaltyGoals={2} />);
    expect(screen.getByText('Won')).toBeInTheDocument();
    unmount();
    render(<PenaltyMatchEndOverlay {...baseProps} playerWon={false} myPenaltyGoals={2} />);
    expect(screen.getByText('Did not win')).toBeInTheDocument();
  });
});
