import { beforeEach, describe, expect, it, vi } from 'vitest';

const trackEventMock = vi.fn();

vi.mock('@/lib/posthog', () => ({
  trackEvent: (...args: unknown[]) => trackEventMock(...args),
}));

import {
  appendCampaignAttribution,
  bindCampaignAttributionToUser,
  clearCampaignAttribution,
  getCampaignAttributionAnalyticsProperties,
  getCampaignAttributionHeader,
  getOrCreateCampaignConversionId,
  hasRecentCampaignAttribution,
  hydrateCampaignAttributionFromUrl,
  rememberCampaignAttribution,
  rememberCampaignAttributionFromSignupUrl,
} from '../campaignAttribution';
import {
  trackCampaignQuizComplete,
  trackCampaignQuizHubView,
  trackCampaignQuizPageView,
  trackCampaignQuizStart,
  trackCampaignSignupClick,
} from '../campaignQuiz.analytics';

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

  it('only treats recent campaign attribution as replay-eligible', () => {
    rememberCampaignAttribution({ quizSlug: 'club-badges', placement: 'score' });

    expect(hasRecentCampaignAttribution()).toBe(true);
    expect(hasRecentCampaignAttribution(-1)).toBe(false);
  });

  it('uses one conversion ID throughout the same quiz journey', () => {
    vi.mocked(window.crypto.randomUUID)
      .mockReturnValueOnce('11111111-1111-4111-8111-111111111111')
      .mockReturnValueOnce('22222222-2222-4222-8222-222222222222');
    const pageViewId = getOrCreateCampaignConversionId('liverpool', true);
    const startId = getOrCreateCampaignConversionId('liverpool');
    rememberCampaignAttribution({ quizSlug: 'liverpool', placement: 'score' });

    expect(startId).toBe(pageViewId);
    expect(getCampaignAttributionAnalyticsProperties().campaign_conversion_id).toBe(pageViewId);
  });

  it('puts one conversion ID on every browser stage of a quiz funnel', () => {
    vi.mocked(window.crypto.randomUUID)
      .mockReturnValueOnce('11111111-1111-4111-8111-111111111111')
      .mockReturnValueOnce('22222222-2222-4222-8222-222222222222');

    trackCampaignQuizPageView('liverpool', 15);
    trackCampaignQuizStart('liverpool', 15);
    trackCampaignQuizComplete('liverpool', 12, 15);
    trackCampaignSignupClick('liverpool', 'score', { score: 12, totalQuestions: 15 });

    const journeyIds = trackEventMock.mock.calls.map(
      ([, properties]) => (properties as Record<string, unknown>).campaign_conversion_id,
    );
    expect(journeyIds).toEqual([
      '11111111-1111-4111-8111-111111111111',
      '11111111-1111-4111-8111-111111111111',
      '11111111-1111-4111-8111-111111111111',
      '11111111-1111-4111-8111-111111111111',
    ]);
    expect(window.crypto.randomUUID).toHaveBeenCalledOnce();
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

  it('recovers attribution from the football quiz hub signup link', () => {
    rememberCampaignAttributionFromSignupUrl(
      new URL('https://quizball.io/en?signup=1&source=football-quiz-hub-header'),
    );

    expect(getCampaignAttributionAnalyticsProperties()).toMatchObject({
      quiz_slug: 'football-quiz',
      cta_placement: 'hero',
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

  it('tracks a campaign-scoped hub view with its locale', () => {
    trackCampaignQuizHubView('en');

    expect(trackEventMock).toHaveBeenCalledWith('campaign_quiz_hub_view', {
      quiz_type: 'campaign',
      locale: 'en',
    });
  });

  it('keeps attribution account-bound for onboarding and the first match', () => {
    rememberCampaignAttribution({ quizSlug: 'liverpool', placement: 'score' });

    bindCampaignAttributionToUser('user-1');

    expect(getCampaignAttributionHeader()).toBeNull();
    expect(getCampaignAttributionAnalyticsProperties()).toMatchObject({
      source: 'campaign_quiz',
      quiz_slug: 'liverpool',
      campaign_conversion_id: '11111111-1111-4111-8111-111111111111',
    });
  });

  it('does not let a different account inherit authenticated attribution', () => {
    rememberCampaignAttribution({ quizSlug: 'liverpool', placement: 'score' });
    bindCampaignAttributionToUser('user-1');

    bindCampaignAttributionToUser('user-2');

    expect(getCampaignAttributionAnalyticsProperties()).toEqual({});
  });
});
