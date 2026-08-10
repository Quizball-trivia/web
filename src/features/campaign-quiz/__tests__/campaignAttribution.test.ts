import { beforeEach, describe, expect, it, vi } from 'vitest';

const trackEventMock = vi.fn();

vi.mock('@/lib/posthog', () => ({
  trackEvent: (...args: unknown[]) => trackEventMock(...args),
}));

import {
  appendCampaignAttribution,
  clearCampaignAttribution,
  getCampaignAttributionAnalyticsProperties,
  getCampaignAttributionHeader,
  hydrateCampaignAttributionFromUrl,
  rememberCampaignAttribution,
  rememberCampaignAttributionFromSignupUrl,
} from '../campaignAttribution';
import { trackCampaignSignupClick } from '../campaignQuiz.analytics';

describe('campaign attribution handoff', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    window.sessionStorage.clear();
    trackEventMock.mockClear();
    vi.spyOn(window.crypto, 'randomUUID').mockReturnValue('11111111-1111-4111-8111-111111111111');
  });

  it('persists score, CTA placement, and a conversion ID', () => {
    rememberCampaignAttribution({
      quizSlug: 'manchester-city',
      placement: 'score',
      score: 12,
      totalQuestions: 15,
    });

    const encoded = getCampaignAttributionHeader();
    expect(encoded).toBeTruthy();
    const decoded = JSON.parse(
      window.atob(encoded!.replace(/-/g, '+').replace(/_/g, '/').padEnd(Math.ceil(encoded!.length / 4) * 4, '=')),
    );
    expect(decoded).toMatchObject({
      source: 'campaign_quiz',
      quiz_slug: 'manchester-city',
      cta_placement: 'score',
      campaign_conversion_id: '11111111-1111-4111-8111-111111111111',
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

  it('puts the same conversion ID on the signup click event and auth handoff', () => {
    trackCampaignSignupClick('liverpool', 'score', { score: 12, totalQuestions: 15 });

    const signupProperties = trackEventMock.mock.calls[0]?.[1] as Record<string, unknown>;
    expect(trackEventMock).toHaveBeenCalledWith('signup_click', expect.objectContaining({
      quiz_slug: 'liverpool',
      campaign_conversion_id: '11111111-1111-4111-8111-111111111111',
      score: 12,
      total_questions: 15,
    }));
    const encodedHandoff = getCampaignAttributionHeader();
    expect(encodedHandoff).toBeTruthy();
    const base64 = encodedHandoff!.replace(/-/g, '+').replace(/_/g, '/');
    const binary = window.atob(base64.padEnd(Math.ceil(base64.length / 4) * 4, '='));
    const handoff = JSON.parse(
      new TextDecoder().decode(Uint8Array.from(binary, (char) => char.charCodeAt(0))),
    ) as Record<string, unknown>;
    expect(handoff.campaign_conversion_id).toBe(signupProperties.campaign_conversion_id);
  });
});
