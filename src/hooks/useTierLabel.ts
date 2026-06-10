'use client';

import { useLocale } from '@/contexts/LocaleContext';
import type { MessageKey } from '@/lib/i18n/messages';

/**
 * Returns a function translating a ranked tier name ("Reserve") via the
 * `tiers.*` message keys, falling back to the raw English name when no
 * translation exists.
 */
export function useTierLabel(): (tier: string) => string {
  const { t } = useLocale();
  return (tier: string) => {
    const key = `tiers.${tier}` as MessageKey;
    const translated = t(key);
    return translated === key ? tier : translated;
  };
}
