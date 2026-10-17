import { describe, expect, it } from 'vitest';
import {
  CAMPAIGN_SLUG_PATTERN,
  campaignHubPath,
  campaignPublicSlug,
  campaignQuizPath,
  campaignSourceSlug,
  swapCampaignLocalePath,
} from '../campaignQuiz.routes';

/** The 29 published campaign pages (staging, 2026-10-15). */
const PUBLISHED_SOURCE_SLUGS = [
  'premier-league', 'la-liga', 'career-path', 'club-badges', 'guess-the-player', 'everton', 'liverpool',
  'manchester-united', 'tottenham', 'arsenal', 'aston-villa', 'bournemouth', 'brentford', 'brighton', 'chelsea',
  'coventry-city', 'crystal-palace', 'fulham', 'hull-city', 'ipswich-town', 'leeds-united', 'manchester-city',
  'newcastle-united', 'nottingham-forest', 'sunderland', 'real-madrid', 'barcelona', 'argentina', 'spain',
];

describe('localized campaign quiz routes', () => {
  it('uses Spanish search-friendly paths for generic quiz formats', () => {
    expect(campaignQuizPath('guess-the-player', 'es')).toBe('/es/quiz-de-futbol/adivina-el-jugador');
    expect(campaignQuizPath('career-path', 'es')).toBe('/es/quiz-de-futbol/trayectoria-del-jugador');
    expect(campaignQuizPath('club-badges', 'es')).toBe('/es/quiz-de-futbol/escudos-de-futbol');
    expect(campaignQuizPath('argentina', 'es')).toBe('/es/quiz-de-futbol/seleccion-argentina');
    expect(campaignQuizPath('spain', 'es')).toBe('/es/quiz-de-futbol/seleccion-espanola');
  });

  it('maps localized public slugs back to their source campaign record', () => {
    expect(campaignSourceSlug('adivina-el-jugador', 'es')).toBe('guess-the-player');
    expect(campaignSourceSlug('seleccion-argentina', 'es')).toBe('argentina');
  });

  it('switches equivalent English and Spanish campaign URLs', () => {
    expect(swapCampaignLocalePath('/en/football-quiz/guess-the-player', 'es'))
      .toBe('/es/quiz-de-futbol/adivina-el-jugador');
    expect(swapCampaignLocalePath('/es/quiz-de-futbol/adivina-el-jugador', 'en'))
      .toBe('/en/football-quiz/guess-the-player');
  });

  it('uses transliterated Russian search phrases for every published page', () => {
    expect(campaignHubPath('ru')).toBe('/ru/futbolnaya-viktorina');
    expect(campaignQuizPath('career-path', 'ru')).toBe('/ru/futbolnaya-viktorina/ugaday-futbolista-po-karere');
    expect(campaignQuizPath('guess-the-player', 'ru')).toBe('/ru/futbolnaya-viktorina/ugaday-futbolista');
    expect(campaignQuizPath('arsenal', 'ru')).toBe('/ru/futbolnaya-viktorina/viktorina-arsenal');
    expect(campaignQuizPath('real-madrid', 'ru')).toBe('/ru/futbolnaya-viktorina/viktorina-real-madrid');
    expect(campaignQuizPath('manchester-united', 'ru')).toBe('/ru/futbolnaya-viktorina/viktorina-manchester-yunayted');

    const russianSlugs = PUBLISHED_SOURCE_SLUGS.map((slug) => campaignPublicSlug(slug, 'ru'));
    expect(new Set(russianSlugs).size).toBe(PUBLISHED_SOURCE_SLUGS.length);
    for (const [index, slug] of russianSlugs.entries()) {
      expect(slug).not.toBe(PUBLISHED_SOURCE_SLUGS[index]);
      expect(slug).toMatch(CAMPAIGN_SLUG_PATTERN);
      expect(slug.split('-').length).toBeGreaterThanOrEqual(2);
      expect(slug.split('-').length).toBeLessThanOrEqual(5);
      expect(campaignSourceSlug(slug, 'ru')).toBe(PUBLISHED_SOURCE_SLUGS[index]);
    }
  });

  it('keeps the source slug for a page without a Russian slug', () => {
    expect(campaignPublicSlug('some-new-page', 'ru')).toBe('some-new-page');
    expect(campaignSourceSlug('some-new-page', 'ru')).toBe('some-new-page');
  });

  it('switches between the English, Spanish and Russian editions', () => {
    expect(swapCampaignLocalePath('/en/football-quiz/career-path', 'ru'))
      .toBe('/ru/futbolnaya-viktorina/ugaday-futbolista-po-karere');
    expect(swapCampaignLocalePath('/ru/futbolnaya-viktorina/ugaday-futbolista-po-karere', 'en'))
      .toBe('/en/football-quiz/career-path');
    expect(swapCampaignLocalePath('/ru/futbolnaya-viktorina/viktorina-sbornaya-argentiny', 'es'))
      .toBe('/es/quiz-de-futbol/seleccion-argentina');
    expect(swapCampaignLocalePath('/es/quiz-de-futbol', 'ru')).toBe('/ru/futbolnaya-viktorina');
    expect(swapCampaignLocalePath('/ru/football-quiz/arsenal', 'en')).toBeNull();
  });
});
