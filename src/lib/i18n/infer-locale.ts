import type { Locale } from './messages';

interface LocaleInferenceSignals {
  languages?: readonly string[] | null;
  language?: string | null;
  timeZone?: string | null;
  /** ISO country code from IP geolocation (e.g. "GE"). */
  country?: string | null;
}

function isGeorgianLanguageTag(value: string | null | undefined): boolean {
  const normalized = value?.trim().toLowerCase().replace('_', '-');
  return normalized === 'ka' || normalized?.startsWith('ka-') === true;
}

function isSpanishLanguageTag(value: string | null | undefined): boolean {
  const normalized = value?.trim().toLowerCase().replace('_', '-');
  return normalized === 'es' || normalized?.startsWith('es-') === true;
}

function isTurkishLanguageTag(value: string | null | undefined): boolean {
  const normalized = value?.trim().toLowerCase().replace('_', '-');
  return normalized === 'tr' || normalized?.startsWith('tr-') === true;
}

function isRussianLanguageTag(value: string | null | undefined): boolean {
  const normalized = value?.trim().toLowerCase().replace('_', '-');
  return normalized === 'ru' || normalized?.startsWith('ru-') === true;
}

function isPortugueseLanguageTag(value: string | null | undefined): boolean {
  const normalized = value?.trim().toLowerCase().replace('_', '-');
  return normalized === 'pt' || normalized?.startsWith('pt-') === true;
}

function isGermanLanguageTag(value: string | null | undefined): boolean {
  const normalized = value?.trim().toLowerCase().replace('_', '-');
  return normalized === 'de' || normalized?.startsWith('de-') === true;
}

export function inferLocaleFromSignals({
  languages,
  language,
  timeZone,
  country,
}: LocaleInferenceSignals): Locale {
  // IP geolocation: a visitor physically in Georgia gets Georgian by default.
  if (country?.trim().toUpperCase() === 'GE') {
    return 'ka';
  }

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

  // Otherwise the first language the browser lists that we offer.
  for (const tag of browserLanguages) {
    if (isSpanishLanguageTag(tag)) return 'es';
    if (isTurkishLanguageTag(tag)) return 'tr';
    if (isRussianLanguageTag(tag)) return 'ru';
    if (isPortugueseLanguageTag(tag)) return 'pt';
    if (isGermanLanguageTag(tag)) return 'de';
  }

  return 'en';
}

export function inferLocaleFromBrowser(country?: string | null): Locale {
  const languages =
    typeof navigator !== 'undefined' && Array.isArray(navigator.languages)
      ? navigator.languages
      : null;
  const language = typeof navigator !== 'undefined' ? navigator.language : null;
  const timeZone =
    typeof Intl !== 'undefined'
      ? Intl.DateTimeFormat().resolvedOptions().timeZone
      : null;

  return inferLocaleFromSignals({ languages, language, timeZone, country });
}
