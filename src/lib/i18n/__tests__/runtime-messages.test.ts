import { afterEach, describe, expect, it } from 'vitest';
import { getDailyChallengeCopy } from '../dailyChallenge';
import { storage, STORAGE_KEYS } from '@/utils/storage';
import { cachedLocaleMessages } from '../client-messages';
import { translate as canonicalTranslate } from '../messages';
import { RUNTIME_MESSAGE_KEYS, translateRuntimeCopy } from '../runtime-messages';

describe('synchronous non-React translations', () => {
  afterEach(() => { storage.remove(STORAGE_KEYS.LOCALE); });

  it.each(['es', 'ka', 'tr'] as const)('has correct %s copy before any locale chunk is loaded', locale => {
    expect(cachedLocaleMessages(locale)).toBeUndefined();
    for (const key of RUNTIME_MESSAGE_KEYS) {
      expect(translateRuntimeCopy(locale, key)).toBe(canonicalTranslate(locale, key));
    }
    storage.set(STORAGE_KEYS.LOCALE, locale);
    expect(getDailyChallengeCopy().higherValueInstruction).toBe(canonicalTranslate(locale, 'dailyChallenge.higherValueInstruction'));
    expect(getDailyChallengeCopy().submit).toBe(canonicalTranslate(locale, 'common.submit'));
    expect(cachedLocaleMessages(locale)).toBeUndefined();
  });

  it.each(['en', 'es', 'ka', 'tr'] as const)('preserves %s interpolation and unfilled placeholders', locale => {
    expect(translateRuntimeCopy(locale, 'notifications.challengeReceivedToast', { name: 'Test player' }))
      .toBe(canonicalTranslate(locale, 'notifications.challengeReceivedToast', { name: 'Test player' }));
    expect(translateRuntimeCopy(locale, 'notifications.challengeReceivedToast'))
      .toBe(canonicalTranslate(locale, 'notifications.challengeReceivedToast'));
  });
});
