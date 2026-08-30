import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { CampaignSignupLink } from '../CampaignSignupLink';
import { trackCampaignSignupClick } from '../campaignQuiz.analytics';

const mocks = vi.hoisted(() => ({
  push: vi.fn(),
  trackSignupClick: vi.fn(),
}));

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: mocks.push }),
}));

vi.mock('../campaignQuiz.analytics', () => ({
  trackCampaignSignupClick: mocks.trackSignupClick,
}));

describe('CampaignSignupLink', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('keeps signup tracking URLs out of crawlable links while preserving navigation', () => {
    const href = '/en?signup=1&source=football-quiz-hub-header';

    render(
      <CampaignSignupLink slug="football-quiz" placement="hero" href={href}>
        Play Ranked
      </CampaignSignupLink>,
    );

    expect(screen.queryByRole('link', { name: 'Play Ranked' })).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Play Ranked' }));

    expect(trackCampaignSignupClick).toHaveBeenCalledWith('football-quiz', 'hero');
    expect(mocks.push).toHaveBeenCalledWith(href);
  });
});
