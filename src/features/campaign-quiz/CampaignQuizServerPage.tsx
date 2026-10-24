import { cache } from 'react';
import type { Metadata } from 'next';
import { headers } from 'next/headers';
import { notFound } from 'next/navigation';
import { CampaignQuizLanding } from './CampaignQuizLanding';
import { getCampaignQuizContent } from './campaignQuiz.content';
import { getCampaignQuiz, listCampaignQuizPages } from './campaignQuiz.api';
import type { CampaignQuiz } from './campaignQuiz.types';
import { CAMPAIGN_HREFLANG, campaignHubPath, campaignQuizPath, type CampaignQuizLocale } from './campaignQuiz.routes';
import { SITE_NAME, SITE_URL } from '@/lib/seo/site';

const SCHEMA_LANGUAGE: Record<CampaignQuizLocale, string> = {
  en: 'en-GB',
  ka: 'ka-GE',
  es: 'es-ES',
  ru: 'ru-RU',
  pt: 'pt-BR',
  de: 'de-DE',
};

const OG_LOCALE: Record<CampaignQuizLocale, string> = {
  en: 'en_GB',
  ka: 'ka_GE',
  es: 'es_ES',
  ru: 'ru_RU',
  pt: 'pt_BR',
  de: 'de_DE',
};

const BREADCRUMB: Record<CampaignQuizLocale, { home: string; hub: string }> = {
  en: { home: 'Home', hub: 'Football Quiz' },
  ka: { home: 'მთავარი', hub: 'ფეხბურთის ქვიზი' },
  es: { home: 'Inicio', hub: 'Quiz de Fútbol' },
  ru: { home: 'Главная', hub: 'Футбольная викторина' },
  pt: { home: 'Início', hub: 'Quiz de futebol' },
  de: { home: 'Startseite', hub: 'Fußball-Quiz' },
};

const loadQuiz = cache((slug: string, preview: string | undefined, locale: CampaignQuizLocale) =>
  getCampaignQuiz(slug, preview, locale));

/**
 * The quiz endpoint answers a missing Russian, Portuguese or German edition in English, so such a page exists only
 * when the quiz says it has that edition. Older backends do not say: that language's catalog decides, and a catalog
 * that cannot be read means no edition (never an English page under a Russian, Portuguese or German address). A
 * backend without Portuguese or German pages rejects that catalog, so the language stays closed there.
 */
export const hasCampaignEdition = cache(async (slug: string, quiz: Pick<CampaignQuiz, 'editions'>, locale: 'ru' | 'pt' | 'de') => {
  const said = quiz.editions?.[locale];
  if (typeof said === 'boolean') return said;
  try {
    return (await listCampaignQuizPages(locale)).some((page) => page.slug === slug);
  } catch {
    return false;
  }
});

export const hasRussianEdition = (slug: string, quiz: Pick<CampaignQuiz, 'editions'>) => hasCampaignEdition(slug, quiz, 'ru');
export const hasPortugueseEdition = (slug: string, quiz: Pick<CampaignQuiz, 'editions'>) => hasCampaignEdition(slug, quiz, 'pt');
export const hasGermanEdition = (slug: string, quiz: Pick<CampaignQuiz, 'editions'>) => hasCampaignEdition(slug, quiz, 'de');

/** True when this page may be served under `locale`: Russian, Portuguese and German need their edition (previews always render). */
function servable(locale: CampaignQuizLocale, preview: string | undefined, editions: { ru: boolean; pt: boolean; de: boolean }): boolean {
  if (preview) return true;
  if (locale === 'ru') return editions.ru;
  if (locale === 'pt') return editions.pt;
  if (locale === 'de') return editions.de;
  return true;
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
    const editions = {
      ru: await hasRussianEdition(sourceSlug, quiz),
      pt: await hasPortugueseEdition(sourceSlug, quiz),
      de: await hasGermanEdition(sourceSlug, quiz),
    };
    if (!servable(locale, preview, editions)) return {};
    const content = getCampaignQuizContent(sourceSlug, quiz.page, locale);
    if (!content) return {};

    const pageUrl = `${SITE_URL}${campaignQuizPath(sourceSlug, locale)}`;
    const englishUrl = `${SITE_URL}${campaignQuizPath(sourceSlug, 'en')}`;
    const editionLocales: CampaignQuizLocale[] = [
      'en',
      ...(content.localeMode === 'en_ka' ? ['ka' as const] : []),
      'es',
      ...(editions.ru ? ['ru' as const] : []),
      ...(editions.pt ? ['pt' as const] : []),
      ...(editions.de ? ['de' as const] : []),
    ];
    const languages: Record<string, string> = {
      ...Object.fromEntries(editionLocales.map((edition) => [CAMPAIGN_HREFLANG[edition], `${SITE_URL}${campaignQuizPath(sourceSlug, edition)}`])),
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
        alternateLocale: editionLocales.filter((edition) => edition !== locale).map((edition) => OG_LOCALE[edition]),
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
  const portuguese = await hasPortugueseEdition(sourceSlug, quiz);
  const german = await hasGermanEdition(sourceSlug, quiz);
  if (!servable(locale, preview, { ru: russian, pt: portuguese, de: german })) notFound();
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
      <CampaignQuizLanding content={content} quiz={quiz} locale={locale} previewToken={preview} russianEdition={russian} portugueseEdition={portuguese} germanEdition={german} />
    </>
  );
}
