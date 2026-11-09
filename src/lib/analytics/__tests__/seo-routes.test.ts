import { describe, expect, it } from 'vitest';
import { CAMPAIGN_QUIZ_LOCALES, campaignHubPath, campaignQuizPath } from '@/features/campaign-quiz/campaignQuiz.routes';
import { isLightweightSeoRoute } from '@/lib/seo/lightweight-routes';
import { SEO_QUIZ_PATH, isSeoAnalyticsPath } from '../seo-routes';
describe('shared SEO routing for replay and vitals', () => {
  it.each(CAMPAIGN_QUIZ_LOCALES)('routes the %s quiz hub and its pages as SEO pages', (locale) => {
    for (const path of [campaignHubPath(locale), campaignQuizPath('arsenal', locale)]) {
      expect(SEO_QUIZ_PATH.test(path)).toBe(true);
      expect(isLightweightSeoRoute(path)).toBe(true);
    }
  });
  it.each(['/en', '/ka/', '/es', '/tr/', '/fr', '/fr/'])('includes the public hub %s', path => {
    expect(isSeoAnalyticsPath(path)).toBe(true);
  });
  it.each(['/en/football-quiz', '/ka/football-quiz/badges', '/es/quiz-de-futbol', '/es/quiz-de-futbol/adivina-el-jugador/', '/ru/futbolnaya-viktorina', '/ru/futbolnaya-viktorina/viktorina-arsenal', '/pt/quiz-de-futebol', '/pt/quiz-de-futebol/quiz-do-arsenal/', '/de/fussball-quiz', '/de/fussball-quiz/arsenal-quiz/', '/fr/quiz-foot', '/fr/quiz-foot/quiz-arsenal/'])('includes %s', path => {
    expect(SEO_QUIZ_PATH.test(path)).toBe(true);
    expect(isSeoAnalyticsPath(path)).toBe(true);
  });
  it.each(['/es/football-quiz', '/en/football-quiz-extra', '/es/quiz-de-futbol/a/b', '/ru/football-quiz', '/en/futbolnaya-viktorina', '/ru/futbolnaya-viktorina/a/b', '/pt/football-quiz', '/pt/quiz-de-futbol', '/es/quiz-de-futebol', '/pt/quiz-de-futebol/a/b', '/de/football-quiz', '/en/fussball-quiz', '/de/fussball-quiz-mit-freunden', '/de/fussball-quiz/a/b', '/fr/football-quiz', '/en/quiz-foot', '/fr/quiz-foot/a/b', '/fr/quiz-foot-entre-amis', '/play'])('excludes %s', path => {
    expect(isSeoAnalyticsPath(path)).toBe(false);
  });
});
