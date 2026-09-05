import { act, cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
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
  FramedAvatar: ({
    filled,
    customization,
  }: {
    filled: boolean;
    customization?: { jersey?: string } | null;
  }) => (
    <div
      data-testid={filled ? 'filled-seat' : 'empty-seat'}
      data-jersey={customization?.jersey}
    />
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

  it('keeps an unnamed staged bot seat empty instead of inventing an AI player name', () => {
    render(
      <LottieSearch
        joined={2}
        total={3}
        players={[{ userId: 'self-1', displayName: 'Web Player' }]}
        selfUserId="self-1"
        botCount={1}
      />,
    );

    expect(screen.queryByLabelText('AI bidder')).not.toBeInTheDocument();
    expect(screen.getAllByTestId('filled-seat')).toHaveLength(1);
    expect(screen.getAllByTestId('empty-seat')).toHaveLength(2);
  });

  it('renders an opponent with the avatar customization supplied by the server', () => {
    render(
      <LottieSearch
        joined={2}
        total={3}
        players={[
          { userId: 'self-1', displayName: 'Web Player' },
          {
            userId: 'rival-1',
            displayName: 'Mobile Rival',
            avatarCustomization: {
              skin: 'skin_male_white',
              jersey: 'jersey_red',
              hair: 'hair_boy_basic',
            },
          },
        ]}
        selfUserId="self-1"
      />,
    );

    expect(
      screen.getAllByTestId('filled-seat').some(
        (seat) => seat.getAttribute('data-jersey') === 'jersey_red',
      ),
    ).toBe(true);
  });
});


afterEach(() => { cleanup(); vi.useRealTimers(); });

it('restarts the join delay for a replacement bot in the same seat', () => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date('2026-09-05T12:00:00Z'));
  const { rerender } = render(<LottieSearch joined={2} botPlayers={[{ seatId: 'seat', displayName: 'First bot', joinDelayMs: 1000 }]} />);
  act(() => { vi.advanceTimersByTime(1000); });
  expect(screen.getByLabelText('First bot')).toBeVisible();
  rerender(<LottieSearch joined={2} botPlayers={[{ seatId: 'seat', displayName: 'Replacement bot', joinDelayMs: 1000 }]} />);
  expect(screen.queryByLabelText('Replacement bot')).not.toBeInTheDocument();
  act(() => { vi.advanceTimersByTime(1000); });
  expect(screen.getByLabelText('Replacement bot')).toBeVisible();
});

it('does not restart a join delay for an equivalent roster payload', () => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date('2026-09-05T12:00:00Z'));
  const bot = { seatId: 'seat', displayName: 'Same bot', joinDelayMs: 1000 };
  const { rerender } = render(<LottieSearch joined={2} botPlayers={[bot]} />);
  act(() => { vi.advanceTimersByTime(500); });
  rerender(<LottieSearch joined={2} botPlayers={[{ ...bot }]} />);
  act(() => { vi.advanceTimersByTime(500); });
  expect(screen.getByLabelText('Same bot')).toBeVisible();
});
