import { describe, expect, it } from 'vitest';

import { inferLocaleFromSignals } from '../infer-locale';

describe('inferLocaleFromSignals', () => {
  it('uses Georgian when the browser language is Georgian', () => {
    expect(inferLocaleFromSignals({
      languages: ['ka-GE', 'en-US'],
      timeZone: 'America/New_York',
    })).toBe('ka');
  });

  it('uses Georgian when the browser timezone is Tbilisi', () => {
    expect(inferLocaleFromSignals({
      languages: ['en-US'],
      timeZone: 'Asia/Tbilisi',
    })).toBe('ka');
  });

  it('falls back to English for unsupported browser languages and timezones', () => {
    expect(inferLocaleFromSignals({
      languages: ['fr-FR'],
      language: 'fr-FR',
      timeZone: 'Europe/Paris',
    })).toBe('en');
  });
});
