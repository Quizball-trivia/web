import type { Locale } from '@/lib/i18n/messages';

const NUMBER_LOCALE: Record<Exclude<Locale, 'ka'>, string> = {
  en: 'en-GB',
  es: 'es-ES',
  ru: 'ru-RU',
  pt: 'pt-BR',
  de: 'de-DE',
  fr: 'fr-FR',
  tr: 'tr-TR',
};

/**
 * Georgian number display (CLDR `ka`): decimal comma, no-break-space thousands groups, and no grouping below five
 * integer digits (1000, 12 345). Built here instead of asked of `ka-GE` because runtimes disagree on it: Node renders
 * "1,0" while browsers without Georgian number data fall back to "1.0", and that text mismatch fails hydration.
 * Rounding still comes from Intl (`en-US` ships with every ICU build), so 2.55 shows 2,6 exactly as before.
 */
function formatGeorgianNumber(value: number, options: Intl.NumberFormatOptions): string {
  const plain = new Intl.NumberFormat('en-US', { ...options, useGrouping: false }).format(value);
  const parts = /^(-?)(\d+)(?:\.(\d+))?$/.exec(plain);
  if (!parts) return plain;
  const [, sign, integer, fraction] = parts;
  const grouped = integer.length >= 5 ? integer.replace(/\B(?=(\d{3})+$)/g, ' ') : integer;
  return `${sign}${grouped}${fraction === undefined ? '' : `,${fraction}`}`;
}

/** A number formatted for a campaign page in `locale`, identical on the server and in every browser for Georgian. */
export function formatCampaignNumber(value: number, locale: Locale, options: Intl.NumberFormatOptions = {}): string {
  if (locale === 'ka') return formatGeorgianNumber(value, options);
  return value.toLocaleString(NUMBER_LOCALE[locale] ?? 'en-GB', options);
}
