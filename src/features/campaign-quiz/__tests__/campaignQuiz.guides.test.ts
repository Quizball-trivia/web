import { describe, expect, it } from 'vitest';
import { getCampaignQuizGuide } from '../campaignQuiz.guides';

describe('campaign quiz guides', () => {
  it('publishes useful English, Spanish, Georgian, Turkish and French guidance for the priority clusters', () => {
    for (const slug of ['guess-the-player', 'career-path', 'club-badges']) {
      for (const locale of ['en', 'es', 'ka', 'tr', 'fr'] as const) {
        const guide = getCampaignQuizGuide(slug, locale);
        expect(guide?.heading).toBeTruthy();
        expect(guide?.introduction.length).toBeGreaterThan(60);
        expect(guide?.tips).toHaveLength(4);
        expect(guide?.practiceSlug).toBeTruthy();
      }
    }
  });

  it('does not show untranslated English guidance on pages without a guide of their own', () => {
    expect(getCampaignQuizGuide('career-path', 'de')).toBeUndefined();
    expect(getCampaignQuizGuide('career-path', 'ka')?.heading).toMatch(/\p{Script=Georgian}/u);
  });

  it('connects the Spanish player page to the natural futbolista query', () => {
    const guide = getCampaignQuizGuide('guess-the-player', 'es');
    expect(`${guide?.heading} ${guide?.introduction}`.toLowerCase()).toContain('adivinar el futbolista');
  });

  it('uses the natural English target phrases in visible guidance', () => {
    const playerGuide = getCampaignQuizGuide('guess-the-player', 'en');
    const badgeGuide = getCampaignQuizGuide('club-badges', 'en');

    expect(`${playerGuide?.heading} ${playerGuide?.introduction}`.toLowerCase())
      .toContain('guess the football player');
    expect(`${badgeGuide?.eyebrow} ${badgeGuide?.heading}`.toLowerCase())
      .toContain('football badge quiz');
  });
});
