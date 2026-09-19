const COUNTRY_NAME_TO_CODE: Record<string, string> = {
  argentina: 'ar',
  australia: 'au',
  brazil: 'br',
  canada: 'ca',
  egypt: 'eg',
  france: 'fr',
  georgia: 'ge',
  georgian: 'ge',
  germany: 'de',
  india: 'in',
  indonesia: 'id',
  italy: 'it',
  japan: 'jp',
  kenya: 'ke',
  mexico: 'mx',
  morocco: 'ma',
  netherlands: 'nl',
  nigeria: 'ng',
  portugal: 'pt',
  qatar: 'qa',
  saudi: 'sa',
  'saudi arabia': 'sa',
  south_korea: 'kr',
  'south korea': 'kr',
  spain: 'es',
  turkey: 'tr',
  uk: 'gb',
  united_kingdom: 'gb',
  'united kingdom': 'gb',
  britain: 'gb',
  'great britain': 'gb',
  usa: 'us',
  us: 'us',
  united_states: 'us',
  'united states': 'us',
  'united states of america': 'us',
  america: 'us',
  ka: 'ge',
  ka_ge: 'ge',
  en: 'gb',
  eng: 'gb',
  en_gb: 'gb',
  en_us: 'us',
  gb_eng: 'gb',
  gb_sct: 'gb',
  geo: 'ge',
  gbr: 'gb',
};

export function normalizeCountryCode(country: string | null | undefined): string | null {
  const raw = country?.trim();
  if (!raw) return null;

  const lower = raw.toLowerCase();
  if (/^[a-z]{2}$/.test(lower)) return lower;
  if (lower === 'usa') return 'us';
  if (lower === 'gbr') return 'gb';
  if (lower === 'geo') return 'ge';

  const key = lower.replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '');
  return COUNTRY_NAME_TO_CODE[key] ?? COUNTRY_NAME_TO_CODE[key.replace(/_/g, ' ')] ?? null;
}
