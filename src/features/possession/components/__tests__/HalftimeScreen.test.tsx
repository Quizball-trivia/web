import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

// Stub heavy children so the test stays cheap and focused on the title.
vi.mock('../PitchVisualization', () => ({ PitchVisualization: () => <div data-testid="pitch" /> }));
vi.mock('@/components/AvatarDisplay', () => ({ AvatarDisplay: () => <div data-testid="avatar" /> }));
vi.mock('@/components/shared/BanCategoryCard', () => ({ BanCategoryCard: () => <div data-testid="ban-card" /> }));

import { HalftimeScreen } from '../HalftimeScreen';

const baseProps = {
  visible: true,
  playerGoals: 0,
  opponentGoals: 0,
  playerName: 'Me',
  opponentName: 'AI',
  playerAvatarUrl: 'a1',
  opponentAvatarUrl: 'a2',
  playerPosition: 50,
};

describe('HalftimeScreen title', () => {
  it('shows the Half Time heading for a normal second-half ban', () => {
    render(<HalftimeScreen {...baseProps} />);
    expect(screen.getByText('Half Time')).toBeInTheDocument();
    expect(screen.queryByText('Penalties')).not.toBeInTheDocument();
  });

  it('shows the Penalties heading when isPenaltyBan is set', () => {
    render(<HalftimeScreen {...baseProps} isPenaltyBan />);
    expect(screen.getByText('Penalties')).toBeInTheDocument();
    expect(screen.queryByText('Half Time')).not.toBeInTheDocument();
  });
});
