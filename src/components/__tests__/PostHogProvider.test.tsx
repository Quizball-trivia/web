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

const recordingMocks = vi.hoisted(() => ({
  startSessionRecording: vi.fn(),
  stopSessionRecording: vi.fn(),
}));

const campaignAttributionMocks = vi.hoisted(() => ({
  hasRecentCampaignAttribution: vi.fn(() => false),
}));

vi.mock('@/lib/posthog', () => recordingMocks);
vi.mock('@/features/campaign-quiz/campaignAttribution', () => campaignAttributionMocks);

import { PostHogPageView } from '../PostHogProvider';

describe('PostHogPageView', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    navigationMocks.pathname = '/game';
    navigationMocks.searchParams = new URLSearchParams();
    campaignAttributionMocks.hasRecentCampaignAttribution.mockReturnValue(false);
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

  it('starts session recording on football-quiz pages', async () => {
    navigationMocks.pathname = '/en/football-quiz/liverpool';

    render(<PostHogPageView />);

    await waitFor(() => {
      expect(recordingMocks.startSessionRecording).toHaveBeenCalled();
    });
    expect(recordingMocks.stopSessionRecording).not.toHaveBeenCalled();
  });

  it('stops session recording everywhere else', async () => {
    navigationMocks.pathname = '/play';

    render(<PostHogPageView />);

    await waitFor(() => {
      expect(recordingMocks.stopSessionRecording).toHaveBeenCalled();
    });
    expect(recordingMocks.startSessionRecording).not.toHaveBeenCalled();
  });

  it('does not record lookalike or non-locale football-quiz paths', async () => {
    for (const path of ['/en/football-quiz-tips', '/foo/football-quiz', '/en/xfootball-quiz']) {
      navigationMocks.pathname = path;

      render(<PostHogPageView />);

      await waitFor(() => {
        expect(recordingMocks.stopSessionRecording).toHaveBeenCalled();
      });
      expect(recordingMocks.startSessionRecording).not.toHaveBeenCalled();
      vi.clearAllMocks();
    }
  });

  it('records the quiz hub page', async () => {
    navigationMocks.pathname = '/ka/football-quiz';

    render(<PostHogPageView />);

    await waitFor(() => {
      expect(recordingMocks.startSessionRecording).toHaveBeenCalled();
    });
  });

  it('continues recording on a campaign signup landing page', async () => {
    navigationMocks.pathname = '/en';
    navigationMocks.searchParams = new URLSearchParams('signup=1');

    render(<PostHogPageView />);

    await waitFor(() => {
      expect(recordingMocks.startSessionRecording).toHaveBeenCalled();
    });
    expect(recordingMocks.stopSessionRecording).not.toHaveBeenCalled();
  });

  it('continues recording after the one-shot signup query is removed', async () => {
    navigationMocks.pathname = '/en';
    campaignAttributionMocks.hasRecentCampaignAttribution.mockReturnValue(true);

    render(<PostHogPageView />);

    await waitFor(() => {
      expect(recordingMocks.startSessionRecording).toHaveBeenCalled();
    });
  });
});
