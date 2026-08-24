import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { LottieSearch } from '../LottieSearch';

vi.mock('@lottiefiles/dotlottie-react', () => ({
  DotLottieReact: () => <div data-testid="search-animation" />,
  setWasmUrl: vi.fn(),
}));

vi.mock('@/contexts/LocaleContext', () => ({
  useLocale: () => ({
    t: (key: string) =>
      ({
        'auctionGame.searchMode': 'Auction matchmaking',
        'auctionGame.searchStatusStep1': 'Searching',
        'auctionGame.searchStatusStep2': 'Another bidder joined',
        'auctionGame.searchStatusStep3': 'One seat left',
        'auctionGame.auctionStarting': 'Auction starting',
        'auctionGame.youLabel': 'You',
        'auctionGame.waitingBidder': 'Waiting for bidder',
        'auctionGame.aiBidder': 'AI bidder',
        'common.cancel': 'Cancel',
      })[key] ?? key,
  }),
}));

vi.mock('../../shared/ScreenBackdrop', () => ({
  ScreenBackdrop: () => null,
  SCREEN_GLOW: { formation: undefined },
}));

vi.mock('../../shared/FramedAvatar', () => ({
  FramedAvatar: ({ filled }: { filled: boolean }) => (
    <div data-testid={filled ? 'filled-seat' : 'empty-seat'} />
  ),
}));

describe('LottieSearch queue roster', () => {
  it('shows the current player, joined rivals and the waiting seat beneath their cards', () => {
    render(
      <LottieSearch
        joined={2}
        total={3}
        players={[
          { userId: 'self-1', displayName: 'Web Player' },
          { userId: 'rival-1', displayName: 'Mobile Rival' },
        ]}
        selfUserId="self-1"
        selfDisplayName="Fallback Name"
      />,
    );

    expect(screen.getByLabelText('Web Player')).toBeVisible();
    expect(screen.getByLabelText('Mobile Rival')).toBeVisible();
    expect(screen.getByLabelText('Waiting for bidder')).toBeVisible();
    expect(screen.getAllByTestId('filled-seat')).toHaveLength(2);
    expect(screen.getByTestId('empty-seat')).toBeInTheDocument();
  });

  it('shows the assigned smart bot name instead of the generic AI label', () => {
    render(
      <LottieSearch
        joined={3}
        total={3}
        players={[{ userId: 'self-1', displayName: 'Web Player' }]}
        botCount={2}
        botPlayers={[
          { seatId: 'bot-seat-1', displayName: 'Goal Goblin' },
          { seatId: 'bot-seat-2', displayName: 'Pressing Machine' },
        ]}
        selfUserId="self-1"
      />,
    );

    expect(screen.getByLabelText('Goal Goblin')).toBeVisible();
    expect(screen.getByLabelText('Pressing Machine')).toBeVisible();
    expect(screen.queryByLabelText('AI bidder')).not.toBeInTheDocument();
  });
});
