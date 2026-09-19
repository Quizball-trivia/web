import { beforeEach, describe, expect, it, vi } from 'vitest';

const trackEventMock = vi.fn();
const getCampaignPropertiesMock = vi.fn(() => ({}));
const clearCampaignAttributionMock = vi.fn();

vi.mock('@/lib/posthog', () => ({
  trackEvent: (event: string, props?: Record<string, unknown>) => trackEventMock(event, props),
}));

vi.mock('@/features/campaign-quiz/campaignAttribution', () => ({
  getCampaignAttributionAnalyticsProperties: () => getCampaignPropertiesMock(),
  clearCampaignAttribution: () => clearCampaignAttributionMock(),
}));

import {
  trackAuthPanelShown,
  trackSignupPageView,
  trackAuthStarted,
  trackOnboardingCompleted,
  trackLoginCompleted,
  trackMatchStarted,
} from '../game-events';

// These tests pin the canonical auth contract: one intent event with method +
// mode, campaign properties when present, and backend-only account conversion.
describe('auth analytics events', () => {
  beforeEach(() => {
    trackEventMock.mockClear();
    getCampaignPropertiesMock.mockReset();
    getCampaignPropertiesMock.mockReturnValue({});
    clearCampaignAttributionMock.mockClear();
  });

  it.each(['signin', 'signup', 'phone'])('records panel exposure for %s with campaign attribution', (mode) => {
    getCampaignPropertiesMock.mockReturnValue({ source: 'campaign_quiz', quiz_slug: 'career-path' });
    trackAuthPanelShown(mode);
    expect(trackEventMock).toHaveBeenCalledExactlyOnceWith('auth_panel_shown', {
      auth_mode: mode,
      surface: 'welcome',
      source: 'campaign_quiz',
      quiz_slug: 'career-path',
    });
  });

  it('auth_started carries method and mode without legacy duplicate events', () => {
    trackAuthStarted('facebook', 'signup');

    expect(trackEventMock).toHaveBeenCalledTimes(1);
    expect(trackEventMock).toHaveBeenCalledWith('auth_started', {
      method: 'facebook',
      auth_mode: 'signup',
    });
  });

  it('tracks the campaign signup landing between CTA click and auth intent', () => {
    getCampaignPropertiesMock.mockReturnValue({
      source: 'campaign_quiz',
      quiz_slug: 'club-badges',
      campaign_conversion_id: '11111111-1111-4111-8111-111111111111',
    });

    trackSignupPageView();

    expect(trackEventMock).toHaveBeenCalledWith('signup_page_view', {
      auth_mode: 'signup',
      source: 'campaign_quiz',
      quiz_slug: 'club-badges',
      campaign_conversion_id: '11111111-1111-4111-8111-111111111111',
    });
  });

  it('adds persisted quiz campaign context to auth intent', () => {
    getCampaignPropertiesMock.mockReturnValue({
      source: 'campaign_quiz',
      quiz_slug: 'liverpool',
      cta_placement: 'score',
      quiz_score: 11,
    });

    trackAuthStarted('email', 'signup');

    expect(trackEventMock).toHaveBeenCalledWith('auth_started', {
      method: 'email',
      auth_mode: 'signup',
      source: 'campaign_quiz',
      quiz_slug: 'liverpool',
      cta_placement: 'score',
      quiz_score: 11,
    });
  });

  it('onboarding_completed fires without attribution when no campaign exists', () => {
    trackOnboardingCompleted();
    expect(trackEventMock).toHaveBeenCalledWith('onboarding_completed', undefined);
  });

  it('carries campaign context through onboarding and consumes it on the first match', () => {
    getCampaignPropertiesMock.mockReturnValue({
      source: 'campaign_quiz',
      quiz_type: 'campaign',
      quiz_slug: 'liverpool',
      campaign_conversion_id: '11111111-1111-4111-8111-111111111111',
    });

    trackOnboardingCompleted();
    trackMatchStarted({
      matchId: 'match-1',
      mode: 'ranked',
      opponentIsAi: false,
    });

    expect(trackEventMock).toHaveBeenCalledWith('onboarding_completed', expect.objectContaining({
      quiz_slug: 'liverpool',
    }));
    expect(trackEventMock).toHaveBeenCalledWith('match_started', expect.objectContaining({
      match_id: 'match-1',
      quiz_slug: 'liverpool',
    }));
    expect(clearCampaignAttributionMock).toHaveBeenCalledOnce();
  });

  it('login_completed fires with the method', () => {
    trackLoginCompleted('email');
    expect(trackEventMock).toHaveBeenCalledWith('login_completed', { method: 'email' });
  });
});
