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
  trackSignupStarted,
  trackOnboardingCompleted,
  trackLoginCompleted,
  trackMatchStarted,
} from '../game-events';

// These tests pin the PROD-STYLE analytics shape restored by d3780cf
// ("test: restore prod-style posthog behavior"): plain { method } payloads,
// no in_app_browser enrichment, no persisted-method attribution. The richer
// shape from the auth-migration branch (b55912e) was deliberately rolled
// back; the previous version of this file still asserted it and failed ever
// since.
describe('auth analytics events', () => {
  beforeEach(() => {
    trackEventMock.mockClear();
    getCampaignPropertiesMock.mockReset();
    getCampaignPropertiesMock.mockReturnValue({});
    clearCampaignAttributionMock.mockClear();
  });

  it('auth_started carries the method and dual-fires the legacy signup_started', () => {
    trackSignupStarted('facebook');

    expect(trackEventMock).toHaveBeenCalledWith('auth_started', { method: 'facebook' });
    // still dual-fires the legacy event during the dashboard transition
    expect(trackEventMock).toHaveBeenCalledWith('signup_started', { method: 'facebook' });
  });

  it('adds persisted quiz campaign context to auth intent', () => {
    getCampaignPropertiesMock.mockReturnValue({
      source: 'campaign_quiz',
      quiz_slug: 'liverpool',
      cta_placement: 'score',
      quiz_score: 11,
    });

    trackSignupStarted('email');

    expect(trackEventMock).toHaveBeenCalledWith('auth_started', {
      method: 'email',
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
