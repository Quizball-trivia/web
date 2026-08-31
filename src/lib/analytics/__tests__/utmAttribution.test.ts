import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { getUtmAttributionHeader, rememberUtmFromUrl } from '../utmAttribution';

const STORAGE_KEY = 'quizball_utm_attribution';

function decodeHeader(header: string): unknown {
  const padded = header.replace(/-/g, '+').replace(/_/g, '/');
  return JSON.parse(Buffer.from(padded, 'base64').toString('utf8'));
}

describe('utmAttribution', () => {
  beforeEach(() => {
    window.localStorage.clear();
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-08-31T12:00:00.000Z'));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('captures the UTM triplet from a tagged landing URL', () => {
    rememberUtmFromUrl(new URL('https://quizball.io/en?utm_source=tiktok&utm_medium=creator&utm_campaign=quizball-launch'));
    expect(decodeHeader(getUtmAttributionHeader()!)).toEqual({
      utm_source: 'tiktok',
      utm_medium: 'creator',
      utm_campaign: 'quizball-launch',
      captured_at: '2026-08-31T12:00:00.000Z',
    });
  });

  it('captures source-only links (medium/campaign optional)', () => {
    rememberUtmFromUrl(new URL('https://quizball.io/ka?utm_source=tiktok'));
    expect(decodeHeader(getUtmAttributionHeader()!)).toEqual({
      utm_source: 'tiktok',
      captured_at: '2026-08-31T12:00:00.000Z',
    });
  });

  it('keeps FIRST touch — a later tagged link does not overwrite it', () => {
    rememberUtmFromUrl(new URL('https://quizball.io/en?utm_source=tiktok&utm_campaign=first'));
    vi.setSystemTime(new Date('2026-08-31T13:00:00.000Z'));
    rememberUtmFromUrl(new URL('https://quizball.io/en?utm_source=facebook&utm_campaign=second'));
    expect(decodeHeader(getUtmAttributionHeader()!)).toMatchObject({
      utm_source: 'tiktok',
      utm_campaign: 'first',
    });
  });

  it('ignores untagged navigations and returns no header', () => {
    rememberUtmFromUrl(new URL('https://quizball.io/en/football-quiz/liverpool'));
    expect(getUtmAttributionHeader()).toBeNull();
  });

  it('ignores values the backend would reject (spaces, markup, over-long)', () => {
    rememberUtmFromUrl(new URL('https://quizball.io/en?utm_source=tik%20tok'));
    expect(getUtmAttributionHeader()).toBeNull();

    rememberUtmFromUrl(new URL('https://quizball.io/en?utm_source=%3Cscript%3E'));
    expect(getUtmAttributionHeader()).toBeNull();

    rememberUtmFromUrl(new URL(`https://quizball.io/en?utm_source=${'a'.repeat(65)}`));
    expect(getUtmAttributionHeader()).toBeNull();
  });

  it('drops an optional field that fails validation but keeps a valid source', () => {
    rememberUtmFromUrl(new URL('https://quizball.io/en?utm_source=tiktok&utm_medium=bad%20medium'));
    expect(decodeHeader(getUtmAttributionHeader()!)).toEqual({
      utm_source: 'tiktok',
      captured_at: '2026-08-31T12:00:00.000Z',
    });
  });

  it('expires after 30 days', () => {
    rememberUtmFromUrl(new URL('https://quizball.io/en?utm_source=tiktok'));
    vi.setSystemTime(new Date('2026-10-05T12:00:00.000Z'));
    expect(getUtmAttributionHeader()).toBeNull();
  });

  it('survives corrupt storage without throwing', () => {
    window.localStorage.setItem(STORAGE_KEY, 'not json');
    expect(getUtmAttributionHeader()).toBeNull();
    // and a fresh capture still works afterwards
    rememberUtmFromUrl(new URL('https://quizball.io/en?utm_source=tiktok'));
    expect(getUtmAttributionHeader()).not.toBeNull();
  });
});
