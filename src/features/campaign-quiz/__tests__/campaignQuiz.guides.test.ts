import { describe, expect, it } from 'vitest';
import { getCampaignQuizGuide } from '../campaignQuiz.guides';

describe('campaign quiz guides', () => {
  it('publishes useful English and Spanish guidance for the priority clusters', () => {
    for (const slug of ['career-path', 'club-badges']) {
      for (const locale of ['en', 'es'] as const) {
        const guide = getCampaignQuizGuide(slug, locale);
        expect(guide?.heading).toBeTruthy();
        expect(guide?.introduction.length).toBeGreaterThan(60);
        expect(guide?.tips).toHaveLength(4);
        expect(guide?.practiceSlug).toBeTruthy();
      }
    }
  });

  it('does not show untranslated English guidance on Georgian pages', () => {
    expect(getCampaignQuizGuide('career-path', 'ka')).toBeUndefined();
  });
});
