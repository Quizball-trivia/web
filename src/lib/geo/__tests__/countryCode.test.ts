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

  it('uses display-safe land coordinates for coastal New York payloads', () => {
    expect(resolveOpponentLocation({
      id: 'opponent',
      username: 'Opponent',
      avatarUrl: null,
      city: 'New York',
      countryCode: 'US',
      lat: 40.71,
      lon: -74.01,
    }, 'Denver', 'USA')).toMatchObject({
      city: 'New York',
      country: 'USA',
      lat: 40.9,
      lon: -74.75,
      source: 'city_display_safe',
    });
  });

  it('uses display-safe land coordinates for coastal Los Angeles payloads', () => {
    expect(resolveOpponentLocation({
      id: 'opponent',
      username: 'Opponent',
      avatarUrl: null,
      city: 'Los Angeles',
      countryCode: 'US',
      lat: 34.05,
      lon: -118.24,
    }, 'Denver', 'USA')).toMatchObject({
      city: 'Los Angeles',
      country: 'USA',
      lat: 34.15,
      lon: -117.65,
      source: 'city_display_safe',
    });
  });

  it('handles city-like text stored in the country field', () => {
    expect(resolveOpponentLocation({
      id: 'opponent',
      username: 'Opponent',
      avatarUrl: null,
      country: 'Los Angeles',
    }, 'Denver', 'USA')).toMatchObject({
      city: 'Los Angeles',
      country: 'USA',
      lat: 34.15,
      lon: -117.65,
      source: 'city_override_fallback',
    });
  });

  it('uses approximate land fallbacks for additional major country codes', () => {
    expect(resolveOpponentLocation({
      id: 'opponent',
      username: 'Opponent',
      avatarUrl: null,
      countryCode: 'PL',
    }, 'Denver', 'USA')).toMatchObject({
      city: 'Warsaw',
      country: 'Poland',
      source: 'country_fallback',
    });

    expect(resolveOpponentLocation({
      id: 'opponent',
      username: 'Opponent',
      avatarUrl: null,
      countryCode: 'AE',
    }, 'Denver', 'USA')).toMatchObject({
      city: 'Al Ain',
      country: 'UAE',
      source: 'country_fallback',
    });
  });

  it('uses normalized country names and accented aliases', () => {
    expect(resolveOpponentLocation({
      id: 'opponent',
      username: 'Opponent',
      avatarUrl: null,
      country: 'South Korea',
    }, 'Denver', 'USA')).toMatchObject({
      city: 'Daejeon',
      country: 'South Korea',
      source: 'country_fallback',
    });

    expect(resolveOpponentLocation({
      id: 'opponent',
      username: 'Opponent',
      avatarUrl: null,
      country: "Côte d'Ivoire",
    }, 'Denver', 'USA')).toMatchObject({
      city: 'Yamoussoukro',
      country: 'Ivory Coast',
      source: 'country_fallback',
    });
  });

  it('falls back to the detected country when coordinates are clearly wrong', () => {
    expect(resolveOpponentLocation({
      id: 'opponent',
      username: 'Opponent',
      avatarUrl: null,
      countryCode: 'GE',
      lat: 40.71,
      lon: -74.01,
    }, 'Denver', 'USA')).toMatchObject({
      city: 'Tbilisi',
      country: 'Georgia',
      source: 'country_guard_fallback',
    });
  });
});
