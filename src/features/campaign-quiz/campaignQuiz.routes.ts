export type CampaignQuizLocale = 'en' | 'ka' | 'es';

const SPANISH_PUBLIC_SLUGS: Record<string, string> = {
  'guess-the-player': 'adivina-el-jugador',
  'career-path': 'trayectoria-del-jugador',
  'club-badges': 'escudos-de-futbol',
  argentina: 'seleccion-argentina',
  spain: 'seleccion-espanola',
};

const SOURCE_SLUGS_BY_SPANISH_SLUG = Object.fromEntries(
  Object.entries(SPANISH_PUBLIC_SLUGS).map(([sourceSlug, publicSlug]) => [publicSlug, sourceSlug]),
);

export function campaignHubPath(locale: CampaignQuizLocale): string {
  return locale === 'es' ? '/es/quiz-de-futbol' : `/${locale}/football-quiz`;
}

/** The API accepts lowercase, hyphen-separated slugs of at most 80 characters. */
export const CAMPAIGN_SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
export const CAMPAIGN_SLUG_MAX_LENGTH = 80;
const isValidSlug = (slug: string) => slug.length <= CAMPAIGN_SLUG_MAX_LENGTH && CAMPAIGN_SLUG_PATTERN.test(slug);

/** Keeps the CMS preview token across a redirect so an editor's preview link still previews. */
export function withPreview(path: string, preview: string | undefined): string {
  return preview ? `${path}?preview=${encodeURIComponent(preview)}` : path;
}

/**
 * Case/whitespace variants of a valid slug redirect to the canonical spelling
 * (incoming links such as /football-quiz/Liverpool); anything else is a 404,
 * never a request to the API (whose validation error would surface as a 500).
 */
export function normalizeCampaignSlug(slug: string): { kind: 'ok' } | { kind: 'redirect'; slug: string } | { kind: 'invalid' } {
  if (isValidSlug(slug)) return { kind: 'ok' };
  const normalized = slug.trim().toLowerCase();
  if (normalized !== slug && isValidSlug(normalized)) return { kind: 'redirect', slug: normalized };
  return { kind: 'invalid' };
}

export function campaignPublicSlug(sourceSlug: string, locale: CampaignQuizLocale): string {
  return locale === 'es' ? SPANISH_PUBLIC_SLUGS[sourceSlug] ?? sourceSlug : sourceSlug;
}

export function campaignSourceSlug(publicSlug: string, locale: CampaignQuizLocale): string {
  return locale === 'es' ? SOURCE_SLUGS_BY_SPANISH_SLUG[publicSlug] ?? publicSlug : publicSlug;
}

export function campaignQuizPath(sourceSlug: string, locale: CampaignQuizLocale): string {
  return `${campaignHubPath(locale)}/${campaignPublicSlug(sourceSlug, locale)}`;
}

export function swapCampaignLocalePath(pathname: string, targetLocale: CampaignQuizLocale): string | null {
  const segments = pathname.split('/').filter(Boolean);
  if (segments.length < 2) return null;

  const [currentLocale, hub, publicSlug] = segments;
  const sourceLocale: CampaignQuizLocale | null =
    currentLocale === 'en' && hub === 'football-quiz'
      ? 'en'
      : currentLocale === 'ka' && hub === 'football-quiz'
        ? 'ka'
      : currentLocale === 'es' && hub === 'quiz-de-futbol'
        ? 'es'
        : null;
  if (!sourceLocale) return null;

  if (!publicSlug) return campaignHubPath(targetLocale);
  const sourceSlug = campaignSourceSlug(publicSlug, sourceLocale);
  return campaignQuizPath(sourceSlug, targetLocale);
}
