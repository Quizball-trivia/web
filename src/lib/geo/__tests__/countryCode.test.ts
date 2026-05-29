import { describe, expect, it } from 'vitest';
import { normalizeCountryCode } from '../countryCode';
import { resolveOpponentLocation } from '../resolveLocation';

describe('normalizeCountryCode', () => {
  it('normalizes country names and legacy aliases to flag codes', () => {
    expect(normalizeCountryCode('GE')).toBe('ge');
    expect(normalizeCountryCode('Georgia')).toBe('ge');
    expect(normalizeCountryCode('Morocco')).toBe('ma');
    expect(normalizeCountryCode('USA')).toBe('us');
    expect(normalizeCountryCode('United Kingdom')).toBe('gb');
  });
});

describe('resolveOpponentLocation', () => {
  it('uses the Morocco fallback for MA country codes', () => {
    expect(resolveOpponentLocation({
      id: 'opponent',
      username: 'Opponent',
      avatarUrl: null,
      countryCode: 'MA',
    }, 'Denver', 'USA')).toMatchObject({
      city: 'Casablanca',
      country: 'Morocco',
      flag: '🇲🇦',
      source: 'country_fallback',
    });
  });
});
