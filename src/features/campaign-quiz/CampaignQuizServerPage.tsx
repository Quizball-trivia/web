import { cache } from 'react';
import type { Metadata } from 'next';
import { headers } from 'next/headers';
import { notFound } from 'next/navigation';
import { CampaignQuizLanding } from './CampaignQuizLanding';
import { getCampaignQuizContent } from './campaignQuiz.content';
import { getCampaignQuiz } from './campaignQuiz.api';
import { campaignHubPath, campaignQuizPath, type CampaignQuizLocale } from './campaignQuiz.routes';
import { SITE_NAME, SITE_URL } from '@/lib/seo/site';

const SCHEMA_LANGUAGE: Record<CampaignQuizLocale, string> = {
  en: 'en-GB',
  ka: 'ka-GE',
  es: 'es-ES',
};

const loadQuiz = cache((slug: string, preview: string | undefined, locale: CampaignQuizLocale) =>
  getCampaignQuiz(slug, preview, locale));

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
    const content = getCampaignQuizContent(sourceSlug, quiz.page, locale);
    if (!content) return {};

    const pageUrl = `${SITE_URL}${campaignQuizPath(sourceSlug, locale)}`;
    const englishUrl = `${SITE_URL}${campaignQuizPath(sourceSlug, 'en')}`;
    const spanishUrl = `${SITE_URL}${campaignQuizPath(sourceSlug, 'es')}`;
    const languages = {
      en: englishUrl,
      ...(content.localeMode === 'en_ka' ? { ka: `${SITE_URL}${campaignQuizPath(sourceSlug, 'ka')}` } : {}),
      es: spanishUrl,
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
        locale: locale === 'es' ? 'es_ES' : locale === 'ka' ? 'ka_GE' : 'en_GB',
        alternateLocale: Object.keys(languages)
          .filter((language) => language !== locale && language !== 'x-default')
          .map((language) => language === 'es' ? 'es_ES' : language === 'ka' ? 'ka_GE' : 'en_GB'),
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
  const quiz = await loadQuiz(sourceSlug, preview, locale);
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
          { '@type': 'ListItem', position: 1, name: locale === 'es' ? 'Inicio' : locale === 'ka' ? 'მთავარი' : 'Home', item: `${SITE_URL}/${locale}` },
          { '@type': 'ListItem', position: 2, name: locale === 'es' ? 'Quiz de Fútbol' : locale === 'ka' ? 'ფეხბურთის ქვიზი' : 'Football Quiz', item: `${SITE_URL}${campaignHubPath(locale)}` },
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
      <CampaignQuizLanding content={content} quiz={quiz} locale={locale} previewToken={preview} />
    </>
  );
}
