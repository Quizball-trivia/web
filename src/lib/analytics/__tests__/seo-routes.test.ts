import { describe, expect, it } from 'vitest';
import { SEO_QUIZ_PATH, isSeoAnalyticsPath } from '../seo-routes';
describe('shared SEO routing for replay and vitals', () => {
  it.each(['/en/football-quiz', '/ka/football-quiz/badges', '/es/quiz-de-futbol', '/es/quiz-de-futbol/adivina-el-jugador/'])('includes %s', path => {
    expect(SEO_QUIZ_PATH.test(path)).toBe(true);
    expect(isSeoAnalyticsPath(path)).toBe(true);
  });
  it.each(['/es/football-quiz', '/en/football-quiz-extra', '/es/quiz-de-futbol/a/b', '/play'])('excludes %s', path => {
    expect(isSeoAnalyticsPath(path)).toBe(false);
  });
});
