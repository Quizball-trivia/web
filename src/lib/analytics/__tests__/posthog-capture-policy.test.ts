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
    'https://quizball.io/en',
    'https://quizball.io/ka/',
    'https://quizball.io/es?source=football-quiz',
    'https://quizball.io/en/football-quiz',
    'https://quizball.io/en/football-quiz/career-path?utm_source=google',
    '/ka/football-quiz/club-badges',
    'https://quizball.io/es/quiz-de-futbol',
    '/es/quiz-de-futbol/trayectoria-del-jugador?utm_source=google',
    'https://quizball.io/ru/futbolnaya-viktorina',
    '/ru/futbolnaya-viktorina/ugaday-futbolista-po-karere?utm_source=yandex',
    'https://quizball.io/pt/quiz-de-futebol',
    '/pt/quiz-de-futebol/adivinhe-o-jogador-pela-carreira?utm_source=google',
    'https://quizball.io/de/fussball-quiz',
    '/de/fussball-quiz/karrierestationen-erraten?utm_source=google',
  ])('keeps Web Vitals for public football quiz pages: %s', (url) => {
    expect(preparePostHogCapture(webVitals(url))?.event).toBe('$web_vitals');
  });

  it.each([
    'https://quizball.io/es/football-quiz',
    'https://quizball.io/es/quiz-de-futbol/a/b',
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

  it('drops every event from the local games playground (dev tooling)', () => {
    for (const url of ['http://localhost:3010/dev/games', 'http://localhost:3010/dev/games/preview?x=1']) {
      expect(preparePostHogCapture({ uuid: 'e', event: '$pageview', properties: { $current_url: url } })).toBeNull();
      expect(preparePostHogCapture({ uuid: 'e', event: 'pistas_run_start', properties: { $current_url: url } })).toBeNull();
    }
    expect(preparePostHogCapture({ uuid: 'e', event: '$pageview', properties: { $current_url: 'https://quizball.io/dev/gamesX' } })).not.toBeNull();
  });
});

describe('event diet: DB-duplicated gameplay events and retry-storm throttles', () => {
  const ev = (event: string): CaptureResult => ({ uuid: `e-${event}`, event, properties: { $current_url: 'https://quizball.io/en/play' } });

  it('drops gameplay events the production DB already records', () => {
    for (const name of ['match_started', 'match_completed', 'game_start', 'game_complete',
      'game_view', 'lobby_joined', 'matchmaking_started', 'quiz_question_answered',
      'match_results_viewed', 'wl_banner_viewed']) {
      expect(preparePostHogCapture(ev(name))).toBeNull();
    }
  });

  it('keeps the PostHog-only surface: pageviews, errors, funnel and conversion events', () => {
    for (const name of ['$pageview', 'api_error', 'auth_panel_shown', 'account_created',
      'onboarding_step_completed', '$identify']) {
      expect(preparePostHogCapture(ev(name))?.event).toBe(name);
    }
  });

  it('throttles socket failure spam to one event per minute per name', () => {
    expect(preparePostHogCapture(ev('socket_connection_failed'))?.event).toBe('socket_connection_failed');
    expect(preparePostHogCapture(ev('socket_connection_failed'))).toBeNull();
    expect(preparePostHogCapture(ev('socket_reconnected'))?.event).toBe('socket_reconnected');
    expect(preparePostHogCapture(ev('socket_reconnected'))).toBeNull();
  });
});
