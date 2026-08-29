import { describe, expect, it } from 'vitest';
import type { CaptureResult } from 'posthog-js';
import { preparePostHogCapture } from '../posthog-capture-policy';

function webVitals(url?: string): CaptureResult {
  return {
    uuid: 'event-1',
    event: '$web_vitals',
    properties: url ? { $current_url: url, $web_vitals_LCP_value: 2100 } : {},
  };
}

describe('PostHog capture policy', () => {
  it.each([
    'https://quizball.io/en/football-quiz',
    'https://quizball.io/en/football-quiz/career-path?utm_source=google',
    '/ka/football-quiz/club-badges',
    'https://quizball.io/es/quiz-de-futbol',
    '/es/quiz-de-futbol/trayectoria-del-jugador?utm_source=google',
  ])('keeps Web Vitals for public football quiz pages: %s', (url) => {
    expect(preparePostHogCapture(webVitals(url))?.event).toBe('$web_vitals');
  });

  it.each([
    'https://quizball.io/en',
    'https://quizball.io/en/play',
    'https://quizball.io/en/football-quiz-extra',
  ])('drops Web Vitals outside the SEO quiz routes: %s', (url) => {
    expect(preparePostHogCapture(webVitals(url))).toBeNull();
  });

  it('drops Web Vitals without a page URL', () => {
    expect(preparePostHogCapture(webVitals())).toBeNull();
  });

  it('keeps other events and sanitizes sensitive URL parameters', () => {
    const result = preparePostHogCapture({
      uuid: 'event-2',
      event: 'campaign_quiz_page_view',
      properties: {
        $current_url: 'https://quizball.io/en/football-quiz/liverpool?token=secret&utm_source=google',
      },
    });

    expect(result?.properties.$current_url).toBe(
      'https://quizball.io/en/football-quiz/liverpool?utm_source=google',
    );
  });
});
