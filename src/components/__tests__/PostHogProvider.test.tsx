import { render, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const navigationMocks = vi.hoisted(() => ({
  pathname: '/game',
  searchParams: new URLSearchParams(),
}));

const analyticsMocks = vi.hoisted(() => ({
  consumeExitToPlayPending: vi.fn(),
  trackExitToPlayLanded: vi.fn(),
}));

vi.mock('next/navigation', () => ({
  usePathname: () => navigationMocks.pathname,
  useSearchParams: () => navigationMocks.searchParams,
}));

vi.mock('posthog-js', () => ({
  default: {
    capture: vi.fn(),
  },
}));

vi.mock('@/lib/analytics/game-events', () => analyticsMocks);

import { PostHogPageView } from '../PostHogProvider';

describe('PostHogPageView', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    navigationMocks.pathname = '/game';
    navigationMocks.searchParams = new URLSearchParams();
  });

  it('emits the pending results-exit landing event once /play is reached', async () => {
    const pendingExit = {
      source: 'results_main_menu',
      matchId: 'match-1',
      matchType: 'ranked',
      mode: 'ranked',
      variant: 'ranked_sim',
      resultVersion: 9,
      hadFinalResults: true,
      finalResultsAckSent: true,
      stage: 'finalResults',
      startedAtMs: 100,
      fromPath: '/game',
    };
    navigationMocks.pathname = '/play';
    analyticsMocks.consumeExitToPlayPending.mockReturnValue(pendingExit);

    render(<PostHogPageView />);

    await waitFor(() => {
      expect(analyticsMocks.trackExitToPlayLanded).toHaveBeenCalledWith({
        ...pendingExit,
        landedPath: '/play',
      });
    });
  });
});
