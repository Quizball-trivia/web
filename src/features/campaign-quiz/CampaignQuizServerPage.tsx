import { cache } from 'react';
import type { Metadata } from 'next';
import { headers } from 'next/headers';
import { notFound } from 'next/navigation';
import { CampaignQuizLanding } from './CampaignQuizLanding';
import { getCampaignQuizContent } from './campaignQuiz.content';
import { getCampaignQuiz, listCampaignQuizPages } from './campaignQuiz.api';
import type { CampaignQuiz } from './campaignQuiz.types';
import { campaignHubPath, campaignQuizPath, type CampaignQuizLocale } from './campaignQuiz.routes';
import { SITE_NAME, SITE_URL } from '@/lib/seo/site';

const SCHEMA_LANGUAGE: Record<CampaignQuizLocale, string> = {
  en: 'en-GB',
  ka: 'ka-GE',
  es: 'es-ES',
  ru: 'ru-RU',
};

const OG_LOCALE: Record<CampaignQuizLocale, string> = {
  en: 'en_GB',
  ka: 'ka_GE',
  es: 'es_ES',
  ru: 'ru_RU',
};

const BREADCRUMB: Record<CampaignQuizLocale, { home: string; hub: string }> = {
  en: { home: 'Home', hub: 'Football Quiz' },
  ka: { home: 'მთავარი', hub: 'ფეხბურთის ქვიზი' },
  es: { home: 'Inicio', hub: 'Quiz de Fútbol' },
  ru: { home: 'Главная', hub: 'Футбольная викторина' },
};

const loadQuiz = cache((slug: string, preview: string | undefined, locale: CampaignQuizLocale) =>
  getCampaignQuiz(slug, preview, locale));

/**
 * The quiz endpoint answers a missing Russian edition in English, so a Russian page exists only when the quiz says it
 * has that edition. Older backends do not say: the Russian catalog decides, and a catalog that cannot be read means no
 * edition (never an English page under a Russian address).
 */
export const hasRussianEdition = cache(async (slug: string, quiz: Pick<CampaignQuiz, 'editions'>) => {
  if (quiz.editions) return quiz.editions.ru;
  try {
    return (await listCampaignQuizPages('ru')).some((page) => page.slug === slug);
  } catch {
    return false;
  }
});

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
    const russian = await hasRussianEdition(sourceSlug, quiz);
    if (locale === 'ru' && !preview && !russian) return {};
    const content = getCampaignQuizContent(sourceSlug, quiz.page, locale);
    if (!content) return {};

    const pageUrl = `${SITE_URL}${campaignQuizPath(sourceSlug, locale)}`;
    const englishUrl = `${SITE_URL}${campaignQuizPath(sourceSlug, 'en')}`;
    const languages = {
      en: englishUrl,
      ...(content.localeMode === 'en_ka' ? { ka: `${SITE_URL}${campaignQuizPath(sourceSlug, 'ka')}` } : {}),
      es: `${SITE_URL}${campaignQuizPath(sourceSlug, 'es')}`,
      ...(russian ? { ru: `${SITE_URL}${campaignQuizPath(sourceSlug, 'ru')}` } : {}),
      'x-default': englishUrl,
    };
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
        locale: OG_LOCALE[locale],
        alternateLocale: (Object.keys(languages) as Array<keyof typeof languages>)
          .filter((language): language is CampaignQuizLocale => language !== locale && language !== 'x-default')
          .map((language) => OG_LOCALE[language]),
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
  const quiz = await loadQuiz(sourceSlug, preview, locale);
  const russian = await hasRussianEdition(sourceSlug, quiz);
  if (locale === 'ru' && !preview && !russian) notFound();
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
      <CampaignQuizLanding content={content} quiz={quiz} locale={locale} previewToken={preview} russianEdition={russian} />
    </>
  );
}
