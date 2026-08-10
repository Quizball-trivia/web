import { beforeEach, describe, expect, it, vi } from 'vitest';

const getDistinctIdMock = vi.fn(() => 'anon-browser-123');

vi.mock('@/lib/posthog', () => ({
  posthog: { get_distinct_id: () => getDistinctIdMock() },
}));

import {
  appendCampaignAttribution,
  clearCampaignAttribution,
  getCampaignAttributionAnalyticsProperties,
  getCampaignAttributionHeader,
  hydrateCampaignAttributionFromUrl,
  rememberCampaignAttribution,
  rememberCampaignAttributionFromSignupUrl,
  setCampaignAuthMethod,
} from '../campaignAttribution';

describe('campaign attribution handoff', () => {
  beforeEach(() => {
    window.sessionStorage.clear();
    getDistinctIdMock.mockReturnValue('anon-browser-123');
  });

  it('persists score, CTA placement, auth method, and anonymous ID', () => {
    rememberCampaignAttribution({
      quizSlug: 'manchester-city',
      placement: 'score',
      score: 12,
      totalQuestions: 15,
    });
    setCampaignAuthMethod('google');

    const encoded = getCampaignAttributionHeader();
    expect(encoded).toBeTruthy();
    const decoded = JSON.parse(
      window.atob(encoded!.replace(/-/g, '+').replace(/_/g, '/').padEnd(Math.ceil(encoded!.length / 4) * 4, '=')),
    );
    expect(decoded).toMatchObject({
      source: 'campaign_quiz',
      quiz_slug: 'manchester-city',
      cta_placement: 'score',
      anonymous_distinct_id: 'anon-browser-123',
      auth_method: 'google',
      quiz_score: 12,
      quiz_total_questions: 15,
    });
  });

  it('round-trips attribution through an OAuth/email callback URL', () => {
    rememberCampaignAttribution({ quizSlug: 'liverpool', placement: 'footer' });
    const callback = appendCampaignAttribution('https://quizball.io/auth/callback');

    clearCampaignAttribution();
    expect(getCampaignAttributionHeader()).toBeNull();
    hydrateCampaignAttributionFromUrl(new URL(callback));

    expect(getCampaignAttributionAnalyticsProperties()).toMatchObject({
      source: 'campaign_quiz',
      quiz_slug: 'liverpool',
      cta_placement: 'footer',
    });
  });

  it('recovers attribution from the existing campaign signup deep link', () => {
    rememberCampaignAttributionFromSignupUrl(
      new URL('https://quizball.io/en?signup=1&source=arsenal-quiz-header'),
    );

    expect(getCampaignAttributionAnalyticsProperties()).toMatchObject({
      quiz_slug: 'arsenal',
      cta_placement: 'header',
    });
  });
});
