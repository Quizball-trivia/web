import type { Locale } from './messages';

interface LocaleInferenceSignals {
  languages?: readonly string[] | null;
  language?: string | null;
  timeZone?: string | null;
}

function isGeorgianLanguageTag(value: string | null | undefined): boolean {
  const normalized = value?.trim().toLowerCase().replace('_', '-');
  return normalized === 'ka' || normalized?.startsWith('ka-') === true;
}

export function inferLocaleFromSignals({
  languages,
  language,
  timeZone,
}: LocaleInferenceSignals): Locale {
  const browserLanguages = [
    ...(languages ?? []),
    language,
  ];

  if (browserLanguages.some(isGeorgianLanguageTag)) {
    return 'ka';
  }

  if (timeZone === 'Asia/Tbilisi') {
    return 'ka';
  }

  return 'en';
}

export function inferLocaleFromBrowser(): Locale {
  const languages =
    typeof navigator !== 'undefined' && Array.isArray(navigator.languages)
      ? navigator.languages
      : null;
  const language = typeof navigator !== 'undefined' ? navigator.language : null;
  const timeZone =
    typeof Intl !== 'undefined'
      ? Intl.DateTimeFormat().resolvedOptions().timeZone
      : null;

  return inferLocaleFromSignals({ languages, language, timeZone });
}
