import { act, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

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

describe('HalftimeScreen preset second half', () => {
  const categoryOptions = [
    { id: 'cat-preset', name: { en: 'Legends' }, icon: null, imageUrl: null },
  ];
  // The ban cards only mount after the 3s score intro.
  const revealBanPhase = async () => {
    await act(async () => {
      vi.advanceTimersByTime(3500);
    });
  };

  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('renders a single reveal card and no ban prompt', async () => {
    render(
      <HalftimeScreen
        {...baseProps}
        isPresetSecondHalf
        categoryOptions={categoryOptions}
      />,
    );
    await revealBanPhase();

    expect(screen.getByText('Second Half Category')).toBeInTheDocument();
    expect(screen.getAllByTestId('ban-card')).toHaveLength(1);
    // None of the ban-flow affordances belong on a preset reveal.
    expect(screen.queryByText('Ban 1 Category Each')).not.toBeInTheDocument();
    expect(screen.queryByText('Your Turn')).not.toBeInTheDocument();
    expect(screen.queryByText('Opponent is banning')).not.toBeInTheDocument();
  });

  it('does not emit halftime ui_ready, which the server ignores for presets', async () => {
    const onBanPhaseShown = vi.fn();
    render(
      <HalftimeScreen
        {...baseProps}
        isPresetSecondHalf
        categoryOptions={categoryOptions}
        onBanPhaseShown={onBanPhaseShown}
      />,
    );
    await revealBanPhase();

    expect(onBanPhaseShown).not.toHaveBeenCalled();
  });

  it('still renders the three-card ban flow when no preset is set', async () => {
    render(
      <HalftimeScreen
        {...baseProps}
        categoryOptions={[
          { id: 'a', name: { en: 'A' }, icon: null, imageUrl: null },
          { id: 'b', name: { en: 'B' }, icon: null, imageUrl: null },
          { id: 'c', name: { en: 'C' }, icon: null, imageUrl: null },
        ]}
      />,
    );
    await revealBanPhase();

    expect(screen.getAllByTestId('ban-card')).toHaveLength(3);
    expect(screen.getByText('Ban 1 Category Each')).toBeInTheDocument();
    expect(screen.queryByText('Second Half Category')).not.toBeInTheDocument();
  });
});
