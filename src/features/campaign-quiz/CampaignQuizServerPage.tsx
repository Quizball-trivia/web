import { cache } from 'react';
import type { Metadata } from 'next';
import { headers } from 'next/headers';
import { notFound, redirect } from 'next/navigation';
import { CampaignQuizLanding } from './CampaignQuizLanding';
import { getCampaignQuizContent } from './campaignQuiz.content';
import { CampaignQuizApiError, getCampaignQuiz, listCampaignQuizPages } from './campaignQuiz.api';
import { registerCampaignSlugs } from './campaignQuiz.routes';
import type { CampaignQuiz } from './campaignQuiz.types';
import { CAMPAIGN_HREFLANG, CAMPAIGN_OG_LOCALE, CAMPAIGN_QUIZ_LOCALES, campaignHubPath, campaignQuizPath, isLanguageRejected, type CampaignQuizLocale } from './campaignQuiz.routes';
import { SITE_NAME, SITE_URL } from '@/lib/seo/site';

const SCHEMA_LANGUAGE: Record<CampaignQuizLocale, string> = {
  en: 'en-GB',
  ka: 'ka-GE',
  es: 'es-ES',
  ru: 'ru-RU',
  pt: 'pt-BR',
  de: 'de-DE',
  tr: 'tr-TR',
  fr: 'fr-FR',
};

const BREADCRUMB: Record<CampaignQuizLocale, { home: string; hub: string }> = {
  en: { home: 'Home', hub: 'Football Quiz' },
  ka: { home: 'მთავარი', hub: 'ფეხბურთის ქვიზი' },
  es: { home: 'Inicio', hub: 'Quiz de Fútbol' },
  ru: { home: 'Главная', hub: 'Футбольная викторина' },
  pt: { home: 'Início', hub: 'Quiz de futebol' },
  de: { home: 'Startseite', hub: 'Fußball-Quiz' },
  tr: { home: 'Ana sayfa', hub: 'Futbol Bilgi Yarışması' },
  fr: { home: 'Accueil', hub: 'Quiz foot' },
};

const loadQuiz = cache(async (slug: string, preview: string | undefined, locale: CampaignQuizLocale) => {
  const quiz = await getCampaignQuiz(slug, preview, locale);
  // A preview may be a draft whose URLs are not public yet.
  if (!preview) registerCampaignSlugs([quiz]);
  return quiz;
});

/** Editions that always exist; a missing edition of any other language is answered in English by the quiz endpoint. */
const ALWAYS_ON_EDITIONS: readonly CampaignQuizLocale[] = ['en', 'es'];

/**
 * So a gated edition's page exists only when the quiz says it has that edition. Older backends do not say: that
 * language's catalog decides, and a catalog that cannot be read means no edition (never an English page under another
 * language's address). A backend without that language rejects the catalog, so the language stays closed there.
 */
export const hasCampaignEdition = cache(async (slug: string, quiz: Pick<CampaignQuiz, 'editions'>, locale: CampaignQuizLocale) => {
  if (ALWAYS_ON_EDITIONS.includes(locale)) return true;
  const said = quiz.editions?.[locale as keyof NonNullable<CampaignQuiz['editions']>];
  if (typeof said === 'boolean') return said;
  try {
    return (await listCampaignQuizPages(locale)).some((page) => page.slug === slug);
  } catch {
    return false;
  }
});

/**
 * Cards, footers and home links in these languages always point at their own edition, and a question edit can close one
 * at any time, so a closed page sends the visitor to the English quiz (temporarily) instead of a 404. The destination
 * decides, which also covers cached pages and client bundles that cannot know what is open.
 */
const ENGLISH_WHEN_CLOSED: readonly CampaignQuizLocale[] = ['ka', 'tr', 'fr'];

function closedEdition(sourceSlug: string, locale: CampaignQuizLocale): never {
  if (ENGLISH_WHEN_CLOSED.includes(locale)) redirect(campaignQuizPath(sourceSlug, 'en'));
  notFound();
}

/** The languages this quiz can be read in, in switcher order. */
export async function campaignQuizEditions(slug: string, quiz: Pick<CampaignQuiz, 'editions'>): Promise<CampaignQuizLocale[]> {
  const open = await Promise.all(CAMPAIGN_QUIZ_LOCALES.map((locale) => hasCampaignEdition(slug, quiz, locale)));
  return CAMPAIGN_QUIZ_LOCALES.filter((_, index) => open[index]);
}

/**
 * The quizzes a page under `locale` can link to; undefined when every quiz can be linked. A gated edition closes while
 * one of its questions is being retranslated, so a catalog that cannot be read means no links rather than all of them.
 */
export const campaignOpenSlugs = cache(async (locale: CampaignQuizLocale): Promise<ReadonlySet<string> | undefined> => {
  if (ALWAYS_ON_EDITIONS.includes(locale)) return undefined;
  try {
    return new Set((await listCampaignQuizPages(locale)).map((page) => page.slug));
  } catch {
    return new Set();
  }
});

/** The hreflang map of a quiz page. */
export function campaignQuizLanguages(sourceSlug: string, editions: readonly CampaignQuizLocale[]): Record<string, string> {
  return {
    ...Object.fromEntries(editions.map((edition) => [CAMPAIGN_HREFLANG[edition], `${SITE_URL}${campaignQuizPath(sourceSlug, edition)}`])),
    'x-default': `${SITE_URL}${campaignQuizPath(sourceSlug, 'en')}`,
  };
}

function absoluteImage(url: string): string {
  return url.startsWith('http') ? url : `${SITE_URL}${url}`;
}

export async function buildCampaignQuizMetadata(
  sourceSlug: string,
  locale: CampaignQuizLocale,
  preview?: string,
): Promise<Metadata> {
  try {
    const quiz = await loadQuiz(sourceSlug, preview, locale);
    const editions = await campaignQuizEditions(sourceSlug, quiz);
    if (!preview && !editions.includes(locale)) return {};
    const content = getCampaignQuizContent(sourceSlug, quiz.page, locale);
    if (!content) return {};

    const pageUrl = `${SITE_URL}${campaignQuizPath(sourceSlug, locale)}`;
    const languages = campaignQuizLanguages(sourceSlug, editions);
    const image = content.ogImage ?? content.heroImage;
    const imageAlt = content.ogImageAlt ?? content.heroImageAlt;

    return {
      title: { absolute: content.metadataTitle },
      description: content.description,
      robots: preview ? { index: false, follow: false } : undefined,
      alternates: { canonical: pageUrl, languages },
      openGraph: {
        type: 'website',
        siteName: SITE_NAME,
        title: content.metadataTitle,
        description: content.description,
        url: pageUrl,
        locale: CAMPAIGN_OG_LOCALE[locale],
        alternateLocale: editions.filter((edition) => edition !== locale).map((edition) => CAMPAIGN_OG_LOCALE[edition]),
        images: [{ url: absoluteImage(image), alt: imageAlt }],
      },
      twitter: {
        card: 'summary_large_image',
        title: content.metadataTitle,
        description: content.description,
        images: [absoluteImage(image)],
      },
    };
  } catch {
    return {};
  }
}

export async function renderCampaignQuizPage(
  sourceSlug: string,
  locale: CampaignQuizLocale,
  preview?: string,
) {
  // Loaded first: a renamed quiz is a 404 here, which the route turns into its redirect.
  const quiz = await loadQuiz(sourceSlug, preview, locale).catch((error: unknown) => {
    // The slug is already validated, so this is a backend that does not know this language yet: a closed edition.
    if (!preview && locale !== 'en' && error instanceof CampaignQuizApiError && isLanguageRejected(error.status)) closedEdition(sourceSlug, locale);
    throw error;
  });
  const editions = await campaignQuizEditions(sourceSlug, quiz);
  if (!preview && !editions.includes(locale)) closedEdition(sourceSlug, locale);
  const content = getCampaignQuizContent(sourceSlug, quiz.page, locale);
  if (!content) notFound();

  const headerList = await headers();
  const nonce = headerList.get('x-nonce') ?? undefined;
  const pageUrl = `${SITE_URL}${campaignQuizPath(sourceSlug, locale)}`;
  const language = SCHEMA_LANGUAGE[locale];
  const jsonLd = {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'WebPage', '@id': `${pageUrl}#webpage`, url: pageUrl,
        name: content.metadataTitle, description: content.description, inLanguage: language,
        ...(quiz.page?.content_modified_at ? { dateModified: quiz.page.content_modified_at } : {}),
        isPartOf: { '@id': `${SITE_URL}/#website` }, mainEntity: { '@id': `${pageUrl}#quiz` },
      },
      {
        '@type': 'BreadcrumbList', '@id': `${pageUrl}#breadcrumb`,
        itemListElement: [
          { '@type': 'ListItem', position: 1, name: BREADCRUMB[locale].home, item: `${SITE_URL}/${locale}` },
          { '@type': 'ListItem', position: 2, name: BREADCRUMB[locale].hub, item: `${SITE_URL}${campaignHubPath(locale)}` },
          { '@type': 'ListItem', position: 3, name: content.breadcrumbLabel, item: pageUrl },
        ],
      },
      {
        '@id': `${pageUrl}#quiz`, '@type': 'Game', name: content.title,
        description: content.description, url: pageUrl, inLanguage: language,
        isAccessibleForFree: true, numberOfPlayers: { '@type': 'QuantitativeValue', value: 1 },
        ...(quiz.rating.count > 0 && quiz.rating.average !== null
          ? { aggregateRating: { '@type': 'AggregateRating', ratingValue: quiz.rating.average, ratingCount: quiz.rating.count, bestRating: 5, worstRating: 1 } }
          : {}),
      },
    ],
  };

  return (
    <>
      <script nonce={nonce} type="application/ld+json" suppressHydrationWarning dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, '\\u003c') }} />
      <CampaignQuizLanding content={content} quiz={quiz} locale={locale} previewToken={preview} editions={editions} openSlugs={await campaignOpenSlugs(locale)} />
    </>
  );
}
