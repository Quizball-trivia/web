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
