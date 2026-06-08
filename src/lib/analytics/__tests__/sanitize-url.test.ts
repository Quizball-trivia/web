import { describe, expect, it } from 'vitest';
import {
  sanitizeAnalyticsProperties,
  sanitizeAnalyticsUrl,
  sanitizePostHogCapture,
} from '../sanitize-url';

describe('analytics URL sanitization', () => {
  it('removes sensitive auth callback query and hash values', () => {
    const sanitized = sanitizeAnalyticsUrl(
      'https://quizball.io/auth/callback?code=oauth-code&next=/friend/room/ABC123&utm_source=messenger#access_token=access&refresh_token=refresh&provider_token=provider&id_token=id'
    );

    expect(sanitized).toBe(
      'https://quizball.io/auth/callback?next=%2Ffriend%2Froom%2FABC123&utm_source=messenger'
    );
  });

  it('keeps relative invite URLs but removes token-like params', () => {
    expect(
      sanitizeAnalyticsUrl('/friend/room/ABC123?utm_source=messenger&reset_token=secret')
    ).toBe('/friend/room/ABC123?utm_source=messenger');
  });

  it('sanitizes URL-like analytics properties', () => {
    const properties = sanitizeAnalyticsProperties({
      $current_url: 'https://quizball.io/auth/reset-password?token=reset-secret&type=recovery',
      routeType: 'reset-password',
    });

    expect(properties).toEqual({
      $current_url: 'https://quizball.io/auth/reset-password?type=recovery',
      routeType: 'reset-password',
    });
  });

  it('sanitizes PostHog before_send payloads', () => {
    const result = sanitizePostHogCapture({
      uuid: 'event-1',
      event: 'api_error',
      properties: {
        $current_url: 'https://quizball.io/auth/callback#access_token=access&refresh_token=refresh',
      },
    });

    expect(result?.properties.$current_url).toBe('https://quizball.io/auth/callback');
  });
});
