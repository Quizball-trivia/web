import { describe, expect, it } from 'vitest';
import { boardSearch, parseBoardParams } from '../boards';

describe('board URLs', () => {
  it('round-trips a shared club standings link', () => {
    const parsed = parseBoardParams(new URLSearchParams('mode=auction&board=club&club=fc-barcelona&view=standings'));
    expect(parsed).toEqual({ mode: 'auction', scope: { kind: 'club', club: 'fc-barcelona' }, view: 'standings' });
    expect(boardSearch(parsed)).toBe('?mode=auction&board=club&club=fc-barcelona&view=standings');
  });

  it('keeps the world board and ranked mode out of the URL', () => {
    expect(boardSearch({ mode: 'ranked', scope: { kind: 'global' }, view: 'players' })).toBe('');
  });

  it('normalizes the country code and ignores unknown boards', () => {
    expect(parseBoardParams(new URLSearchParams('board=country&country=ar')).scope).toEqual({ kind: 'country', country: 'AR' });
    expect(parseBoardParams(new URLSearchParams('board=club&club=not-a-club')).scope).toBeNull();
    expect(parseBoardParams(new URLSearchParams('board=club&club=zlatan-fc')).scope).toBeNull();
    expect(parseBoardParams(new URLSearchParams('mode=poker&view=standings')).view).toBe('players');
  });
});
