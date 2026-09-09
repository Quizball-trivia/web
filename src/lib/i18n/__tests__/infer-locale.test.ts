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

  it('uses Spanish for regional Spanish browser language tags', () => {
    expect(inferLocaleFromSignals({
      languages: ['es-MX', 'en-US'],
      timeZone: 'America/Mexico_City',
    })).toBe('es');
  });

  it('uses Turkish for Turkish browser language tags', () => {
    expect(inferLocaleFromSignals({
      languages: ['tr-TR', 'en-US'],
      timeZone: 'Europe/Istanbul',
    })).toBe('tr');
    expect(inferLocaleFromSignals({ language: 'tr' })).toBe('tr');
  });

  it('does not infer Turkish from timezone or country alone', () => {
    expect(inferLocaleFromSignals({
      languages: ['en-US'],
      timeZone: 'Europe/Istanbul',
      country: 'TR',
    })).toBe('en');
  });

  it('keeps the explicit Georgian country signal ahead of a Spanish browser language', () => {
    expect(inferLocaleFromSignals({
      languages: ['es-ES'],
      country: 'GE',
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
