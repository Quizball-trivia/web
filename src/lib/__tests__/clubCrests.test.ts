import { describe, expect, it } from 'vitest';
import { findClubByName, resolveClubCrestByName, slugifyClubName } from '../clubs';

describe('slugifyClubName', () => {
  it('produces TM-style slugs from formal names', () => {
    expect(slugifyClubName('AFC Bournemouth')).toBe('afc-bournemouth');
    expect(slugifyClubName('Beşiktaş Jimnastik Kulübü')).toBe('besiktas-jimnastik-kulubu');
    expect(slugifyClubName('Borussia Mönchengladbach')).toBe('borussia-monchengladbach');
    expect(slugifyClubName('S. A. F. Botafogo')).toBe('s-a-f-botafogo');
  });
});

describe('resolveClubCrestByName', () => {
  it('serves local career-path crests for TM-named clubs', () => {
    expect(resolveClubCrestByName('AFC Bournemouth')?.logo).toBe('/clubs/afc-bournemouth.webp');
    expect(resolveClubCrestByName('Crystal Palace')?.logo).toBe('/clubs/crystal-palace.webp');
    expect(resolveClubCrestByName('Associazione Sportiva Roma')?.logo).toBe('/clubs/as-roma.webp');
  });

  it('never falls into the prefix trap: distinct clubs sharing a name prefix stay distinct', () => {
    expect(resolveClubCrestByName('Paris FC')?.logo).toBe('/clubs/paris-fc.webp');
    expect(resolveClubCrestByName('Los Angeles Galaxy')?.label).toBe('LA Galaxy');
    expect(resolveClubCrestByName('Sparta Rotterdam')).toBeNull();
    expect(resolveClubCrestByName('Union Saint-Gilloise')).toBeNull();
    expect(resolveClubCrestByName('Deportivo Toluca')).toBeNull();
  });

  it('reaches registry crests through hand-verified aliases', () => {
    expect(resolveClubCrestByName('Clube de Regatas do Flamengo')?.label).toBe('Flamengo');
    expect(resolveClubCrestByName('Feyenoord Rotterdam')?.label).toBe('Feyenoord');
    expect(resolveClubCrestByName('Ajax Amsterdam')?.label).toBe('AFC Ajax');
  });

  it('returns null for clubs whose only registry crest is the corrupt placeholder', () => {
    expect(resolveClubCrestByName('PFK CSKA Moskva')).toBeNull();
    expect(resolveClubCrestByName('Bournemouth')?.logo).toBe('/clubs/afc-bournemouth.webp');
    for (const name of ['Bournemouth', 'Crystal Palace', 'Stoke City']) {
      const registryHit = findClubByName(name);
      const resolved = resolveClubCrestByName(name);
      if (registryHit?.id.startsWith('wl-')) {
        expect(resolved?.logo ?? '').not.toBe(registryHit.logo);
      }
    }
  });

  it('returns null (not a guess) for clubs with no crest art anywhere', () => {
    expect(resolveClubCrestByName('FC Shakhtar Donetsk')).toBeNull();
    expect(resolveClubCrestByName('Atlético Nacional')).toBeNull();
    expect(resolveClubCrestByName(null)).toBeNull();
    expect(resolveClubCrestByName('')).toBeNull();
  });
});
