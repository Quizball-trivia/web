export type CampaignQuizLocale = 'en' | 'ka' | 'es' | 'ru' | 'pt' | 'de';

const SPANISH_PUBLIC_SLUGS: Record<string, string> = {
  'guess-the-player': 'adivina-el-jugador',
  'career-path': 'trayectoria-del-jugador',
  'club-badges': 'escudos-de-futbol',
  argentina: 'seleccion-argentina',
  spain: 'seleccion-espanola',
};

/**
 * Russian public slugs: simplified BGN/PCGN transliteration of what Russians search
 * ("викторина арсенал", "угадай футболиста по карьере"). The backend's Search Console
 * mapping (campaign-quiz-search-console.service.ts) mirrors this table.
 */
const RUSSIAN_PUBLIC_SLUGS: Record<string, string> = {
  'career-path': 'ugaday-futbolista-po-karere',
  'guess-the-player': 'ugaday-futbolista',
  'club-badges': 'ugaday-klub-po-embleme',
  'premier-league': 'viktorina-apl',
  'la-liga': 'viktorina-la-liga',
  arsenal: 'viktorina-arsenal',
  'aston-villa': 'viktorina-aston-villa',
  bournemouth: 'viktorina-bornmut',
  brentford: 'viktorina-brentford',
  brighton: 'viktorina-brayton',
  chelsea: 'viktorina-chelsi',
  'coventry-city': 'viktorina-koventri-siti',
  'crystal-palace': 'viktorina-kristal-pelas',
  everton: 'viktorina-everton',
  fulham: 'viktorina-fulkhem',
  'hull-city': 'viktorina-khall-siti',
  'ipswich-town': 'viktorina-ipsvich-taun',
  'leeds-united': 'viktorina-lids-yunayted',
  liverpool: 'viktorina-liverpul',
  'manchester-city': 'viktorina-manchester-siti',
  'manchester-united': 'viktorina-manchester-yunayted',
  'newcastle-united': 'viktorina-nyukasl-yunayted',
  'nottingham-forest': 'viktorina-nottingem-forest',
  sunderland: 'viktorina-sanderlend',
  tottenham: 'viktorina-tottenkhem',
  'real-madrid': 'viktorina-real-madrid',
  barcelona: 'viktorina-barselona',
  argentina: 'viktorina-sbornaya-argentiny',
  spain: 'viktorina-sbornaya-ispanii',
};

/**
 * Brazilian Portuguese public slugs (docs/SEO-GAME-NAMING-PT-2026-10-21.md §4): "quiz-do-<clube>",
 * "quiz-da-selecao-<adjetivo>", and the "adivinhe o jogador" family. Lowercase ASCII, accents stripped. The backend's
 * Search Console mapping (campaign-quiz-search-console.service.ts) mirrors this table.
 */
const PORTUGUESE_PUBLIC_SLUGS: Record<string, string> = {
  'career-path': 'adivinhe-o-jogador-pela-carreira',
  'guess-the-player': 'adivinhe-o-jogador',
  'club-badges': 'adivinhe-o-time-pelo-escudo',
  'premier-league': 'quiz-da-premier-league',
  'la-liga': 'quiz-da-la-liga',
  arsenal: 'quiz-do-arsenal',
  'aston-villa': 'quiz-do-aston-villa',
  bournemouth: 'quiz-do-bournemouth',
  brentford: 'quiz-do-brentford',
  brighton: 'quiz-do-brighton',
  chelsea: 'quiz-do-chelsea',
  'coventry-city': 'quiz-do-coventry-city',
  'crystal-palace': 'quiz-do-crystal-palace',
  everton: 'quiz-do-everton',
  fulham: 'quiz-do-fulham',
  'hull-city': 'quiz-do-hull-city',
  'ipswich-town': 'quiz-do-ipswich-town',
  'leeds-united': 'quiz-do-leeds-united',
  liverpool: 'quiz-do-liverpool',
  'manchester-city': 'quiz-do-manchester-city',
  'manchester-united': 'quiz-do-manchester-united',
  'newcastle-united': 'quiz-do-newcastle',
  'nottingham-forest': 'quiz-do-nottingham-forest',
  sunderland: 'quiz-do-sunderland',
  tottenham: 'quiz-do-tottenham',
  'real-madrid': 'quiz-do-real-madrid',
  barcelona: 'quiz-do-barcelona',
  argentina: 'quiz-da-selecao-argentina',
  spain: 'quiz-da-selecao-espanhola',
};

/**
 * German public slugs (docs/SEO-GAME-NAMING-DE-2026-10-23.md §4): "<verein>-quiz" as German fans type it, national
 * teams by the German country name, and "fussballer erraten" for the guess-the-player family. Lowercase ASCII
 * (ß→ss, ä→ae, ö→oe, ü→ue). career-path reuses the career-path game slug, as pt does: that game has no page of its own
 * and links here. The backend's Search Console mapping (campaign-quiz-search-console.service.ts) mirrors this table.
 */
const GERMAN_PUBLIC_SLUGS: Record<string, string> = {
  'career-path': 'karrierestationen-erraten',
  'guess-the-player': 'fussballer-erraten',
  'club-badges': 'fussball-wappen-quiz',
  'premier-league': 'premier-league-quiz',
  'la-liga': 'la-liga-quiz',
  arsenal: 'arsenal-quiz',
  'aston-villa': 'aston-villa-quiz',
  bournemouth: 'bournemouth-quiz',
  brentford: 'brentford-quiz',
  brighton: 'brighton-quiz',
  chelsea: 'chelsea-quiz',
  'coventry-city': 'coventry-city-quiz',
  'crystal-palace': 'crystal-palace-quiz',
  everton: 'everton-quiz',
  fulham: 'fulham-quiz',
  'hull-city': 'hull-city-quiz',
  'ipswich-town': 'ipswich-town-quiz',
  'leeds-united': 'leeds-united-quiz',
  liverpool: 'liverpool-quiz',
  'manchester-city': 'manchester-city-quiz',
  'manchester-united': 'manchester-united-quiz',
  'newcastle-united': 'newcastle-united-quiz',
  'nottingham-forest': 'nottingham-forest-quiz',
  sunderland: 'sunderland-quiz',
  tottenham: 'tottenham-quiz',
  'real-madrid': 'real-madrid-quiz',
  barcelona: 'fc-barcelona-quiz',
  argentina: 'argentinien-quiz',
  spain: 'spanien-quiz',
};

const PUBLIC_SLUGS: Partial<Record<CampaignQuizLocale, Record<string, string>>> = {
  es: SPANISH_PUBLIC_SLUGS,
  ru: RUSSIAN_PUBLIC_SLUGS,
  pt: PORTUGUESE_PUBLIC_SLUGS,
  de: GERMAN_PUBLIC_SLUGS,
};

const SOURCE_SLUGS: Partial<Record<CampaignQuizLocale, Record<string, string>>> = Object.fromEntries(
  Object.entries(PUBLIC_SLUGS).map(([locale, slugs]) => [
    locale,
    Object.fromEntries(Object.entries(slugs).map(([sourceSlug, publicSlug]) => [publicSlug, sourceSlug])),
  ]),
);

/** The hub folder per edition; English and Georgian share /football-quiz. */
export const CAMPAIGN_HUB_FOLDER: Record<CampaignQuizLocale, string> = {
  en: 'football-quiz',
  ka: 'football-quiz',
  es: 'quiz-de-futbol',
  ru: 'futbolnaya-viktorina',
  pt: 'quiz-de-futebol',
  de: 'fussball-quiz',
};

/** hreflang per edition: the internal locale is `pt`, the Brazilian page is announced as pt-BR (HTML_LANG). */
export const CAMPAIGN_HREFLANG: Record<CampaignQuizLocale, string> = {
  en: 'en',
  ka: 'ka',
  es: 'es',
  ru: 'ru',
  pt: 'pt-BR',
  de: 'de',
};

export function campaignHubPath(locale: CampaignQuizLocale): string {
  return `/${locale}/${CAMPAIGN_HUB_FOLDER[locale]}`;
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
  return PUBLIC_SLUGS[locale]?.[sourceSlug] ?? sourceSlug;
}

export function campaignSourceSlug(publicSlug: string, locale: CampaignQuizLocale): string {
  return SOURCE_SLUGS[locale]?.[publicSlug] ?? publicSlug;
}

export function campaignQuizPath(sourceSlug: string, locale: CampaignQuizLocale): string {
  return `${campaignHubPath(locale)}/${campaignPublicSlug(sourceSlug, locale)}`;
}

export function swapCampaignLocalePath(pathname: string, targetLocale: CampaignQuizLocale): string | null {
  const segments = pathname.split('/').filter(Boolean);
  if (segments.length < 2) return null;

  const [currentLocale, hub, publicSlug] = segments;
  const sourceLocale = (Object.keys(CAMPAIGN_HUB_FOLDER) as CampaignQuizLocale[])
    .find((locale) => locale === currentLocale && CAMPAIGN_HUB_FOLDER[locale] === hub);
  if (!sourceLocale) return null;

  if (!publicSlug) return campaignHubPath(targetLocale);
  const sourceSlug = campaignSourceSlug(publicSlug, sourceLocale);
  return campaignQuizPath(sourceSlug, targetLocale);
}
