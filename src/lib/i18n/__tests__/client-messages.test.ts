import { describe, expect, it } from 'vitest';
import { cachedLocaleMessages, loadLocaleMessages, translate, translateDictionary } from '../client-messages';
import { messages, translate as staticTranslate, type MessageKey } from '../messages';

describe('language-split messages', () => {
  it.each(['en', 'es', 'ka', 'tr'] as const)('loads and caches the unchanged %s dictionary', async locale => {
    const dictionary = await loadLocaleMessages(locale);
    expect(dictionary).toEqual(messages[locale]);
    expect(await loadLocaleMessages(locale)).toBe(dictionary);
    expect(cachedLocaleMessages(locale)).toBe(dictionary);
    expect(translate(locale, 'welcome.signInTab')).toBe(staticTranslate(locale, 'welcome.signInTab'));
    expect(translate(locale, 'languageSwitcher.chooseLanguage', { language: 'Test' })).toBe(staticTranslate(locale, 'languageSwitcher.chooseLanguage', { language: 'Test' }));
  });

  it('preserves the English fallback, key fallback and unknown interpolation tokens', () => {
    expect(translateDictionary({}, 'welcome.signInTab')).toBe(staticTranslate('en', 'welcome.signInTab'));
    expect(translateDictionary({}, 'unknown.key' as MessageKey)).toBe('unknown.key');
    expect(translateDictionary({ languageSwitcher: { chooseLanguage: '{language} {missing}' } }, 'languageSwitcher.chooseLanguage', { language: 42 })).toBe('42 {missing}');
  });
});
