import { afterEach, describe, expect, it, vi } from 'vitest';
import { formatCampaignNumber } from '../campaignQuiz.number';
import type { Locale } from '@/lib/i18n/messages';

const ONE_DECIMAL = { minimumFractionDigits: 1, maximumFractionDigits: 1 } as const;
const NBSP = ' ';

/** Node ships full ICU, so its own `ka-GE` output is the Georgian display the page has always intended on the server. */
const nodeKnowsGeorgian = new Intl.NumberFormat('ka-GE').resolvedOptions().locale.startsWith('ka');

describe('formatCampaignNumber — Georgian', () => {
  afterEach(() => vi.restoreAllMocks());

  it.each([
    [1, '1,0'],
    [2.67, '2,7'],
    [3.5, '3,5'],
    // Decimal half-up like Intl (toFixed would give 2.5 and 2.6 from the binary values).
    [2.55, '2,6'],
    [2.65, '2,7'],
    [4.95, '5,0'],
    [5, '5,0'],
  ])('averages: %s → %s', (value, expected) => {
    expect(formatCampaignNumber(value, 'ka', ONE_DECIMAL)).toBe(expected);
  });

  it.each([
    [1, '1'],
    [3, '3'],
    [4, '4'],
    [1000, '1000'],
    [9999, '9999'],
    [10000, `10${NBSP}000`],
    [12345, `12${NBSP}345`],
    [123456, `123${NBSP}456`],
    [1234567, `1${NBSP}234${NBSP}567`],
  ])('counts: %s → %s', (value, expected) => {
    expect(formatCampaignNumber(value, 'ka')).toBe(expected);
  });

  it.runIf(nodeKnowsGeorgian)('matches the server runtime’s own ka-GE output', () => {
    for (const value of [0, 1, 2.67, 3.5, 2.55, 2.65, 4.95, 1.05, 0.05]) {
      expect(formatCampaignNumber(value, 'ka', ONE_DECIMAL)).toBe(value.toLocaleString('ka-GE', ONE_DECIMAL));
    }
    for (const value of [1, 3, 4, 999, 1000, 9999, 10000, 12345, 99999, 100000, 1234567, 1000000000]) {
      expect(formatCampaignNumber(value, 'ka')).toBe(value.toLocaleString('ka-GE'));
    }
  });

  it('never asks the runtime for Georgian number data, so a browser without it renders the same text', () => {
    const NativeNumberFormat = Intl.NumberFormat;
    const requested: unknown[] = [];
    vi.spyOn(Intl, 'NumberFormat').mockImplementation(function (locales?: string | string[], options?: Intl.NumberFormatOptions) {
      requested.push(locales);
      return new NativeNumberFormat(locales, options);
    } as typeof Intl.NumberFormat);
    const toLocaleString = vi.spyOn(Number.prototype, 'toLocaleString');

    expect(formatCampaignNumber(2.55, 'ka', ONE_DECIMAL)).toBe('2,6');
    expect(formatCampaignNumber(12345, 'ka')).toBe(`12${NBSP}345`);
    expect(requested.every((locale) => !String(locale).startsWith('ka'))).toBe(true);
    expect(toLocaleString).not.toHaveBeenCalled();
  });
});

describe('formatCampaignNumber — other locales are unchanged', () => {
  const PREVIOUS: Record<Exclude<Locale, 'ka'>, string> = {
    en: 'en-GB', es: 'es-ES', ru: 'ru-RU', pt: 'pt-BR', de: 'de-DE', fr: 'fr-FR', tr: 'tr-TR',
  };

  it.each(Object.entries(PREVIOUS))('%s formats with %s', (locale, tag) => {
    for (const value of [1, 2.67, 3.5, 2.55, 2.65, 4.95]) {
      expect(formatCampaignNumber(value, locale as Locale, ONE_DECIMAL)).toBe(value.toLocaleString(tag, ONE_DECIMAL));
    }
    for (const value of [1, 3, 4, 1000, 12345, 1234567]) {
      expect(formatCampaignNumber(value, locale as Locale)).toBe(value.toLocaleString(tag));
    }
  });

  it('keeps the English display', () => {
    expect(formatCampaignNumber(2.55, 'en', ONE_DECIMAL)).toBe('2.6');
    expect(formatCampaignNumber(1234567, 'en')).toBe('1,234,567');
  });
});
