import { describe, expect, it } from 'vitest';

import { explicitLocaleFromPathname, localeFromPathname } from '@/lib/i18n/locale';

describe('locale pathname helpers', () => {
  it('keeps default html locale for app routes without treating them as URL-selected locales', () => {
    expect(localeFromPathname('/store')).toBe('en');
    expect(localeFromPathname('/play')).toBe('en');
    expect(explicitLocaleFromPathname('/store')).toBeUndefined();
    expect(explicitLocaleFromPathname('/play')).toBeUndefined();
  });

  it('detects explicit localized public routes', () => {
    expect(localeFromPathname('/ka/terms')).toBe('ka');
    expect(explicitLocaleFromPathname('/ka/terms')).toBe('ka');
  });
});
