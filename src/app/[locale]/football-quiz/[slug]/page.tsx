import { cache } from 'react';
import type { Metadata } from 'next';
import { headers } from 'next/headers';
import { notFound, permanentRedirect } from 'next/navigation';
import { CampaignQuizLanding } from '@/features/campaign-quiz/CampaignQuizLanding';
import {
  CAMPAIGN_QUIZ_SLUGS,
  getCampaignQuizContent,
} from '@/features/campaign-quiz/campaignQuiz.content';
import {
  CampaignQuizApiError,
  getCampaignQuiz,
  resolveCampaignQuizRoute,
} from '@/features/campaign-quiz/campaignQuiz.api';
import { SITE_NAME, SITE_URL } from '@/lib/seo/site';

export const dynamic = 'force-dynamic';

interface CampaignQuizPageProps {
  params: Promise<{ locale: string; slug: string }>;
  searchParams: Promise<{ preview?: string }>;
}

const loadQuiz = cache((slug: string, preview?: string) => getCampaignQuiz(slug, preview));

export function generateStaticParams() {
  return CAMPAIGN_QUIZ_SLUGS.map((slug) => ({ locale: 'en', slug }));
}

function absoluteImage(url: string): string {
  return url.startsWith('http') ? url : `${SITE_URL}${url}`;
}

export async function generateMetadata({ params, searchParams }: CampaignQuizPageProps): Promise<Metadata> {
  const [{ locale, slug }, { preview }] = await Promise.all([params, searchParams]);
  if (locale !== 'en' && locale !== 'ka') return {};

  try {
    const quiz = await loadQuiz(slug, preview);
    const content = getCampaignQuizContent(slug, quiz.page, locale);
    if (!content) return {};
    if (locale === 'ka' && content.localeMode !== 'en_ka') return {};

    const isGeorgian = locale === 'ka';
    const title = isGeorgian ? (content.kaMetadataTitle ?? content.metadataTitle) : content.metadataTitle;
    const description = isGeorgian ? (content.kaDescription ?? content.description) : content.description;
    const pageUrl = `${SITE_URL}/${locale}/football-quiz/${content.slug}`;
    const ogImage = content.ogImage ?? content.heroImage;
    const ogAlt = content.ogImageAlt ?? content.heroImageAlt;
    const languages = content.localeMode === 'en_ka'
      ? {
          en: `${SITE_URL}/en/football-quiz/${content.slug}`,
          ka: `${SITE_URL}/ka/football-quiz/${content.slug}`,
          'x-default': `${SITE_URL}/en/football-quiz/${content.slug}`,
        }
      : { en: `${SITE_URL}/en/football-quiz/${content.slug}` };

    return {
      title: { absolute: title },
      description,
      robots: preview ? { index: false, follow: false } : undefined,
      alternates: { canonical: pageUrl, languages },
      openGraph: {
        type: 'website',
        siteName: SITE_NAME,
        title,
        description,
        url: pageUrl,
        locale: isGeorgian ? 'ka_GE' : 'en_GB',
        images: [{ url: absoluteImage(ogImage), width: 1200, height: 1200, alt: ogAlt }],
      },
      twitter: {
        card: 'summary_large_image',
        title,
        description,
        images: [absoluteImage(ogImage)],
      },
    };
  } catch {
    return {};
  }
}

export default async function CampaignQuizPage({ params, searchParams }: CampaignQuizPageProps) {
  const [{ locale, slug }, { preview }] = await Promise.all([params, searchParams]);
  if (locale !== 'en' && locale !== 'ka') notFound();

  let quiz;
  try {
    quiz = await loadQuiz(slug, preview);
  } catch (error) {
    if (!(error instanceof CampaignQuizApiError) || error.status !== 404) throw error;
    const route = await resolveCampaignQuizRoute(slug).catch(() => null);
    if (route?.kind === 'redirect' && route.target_slug) {
      permanentRedirect(`/${locale}/football-quiz/${route.target_slug}`);
    }
    notFound();
  }

  const content = getCampaignQuizContent(slug, quiz.page, locale);
  if (!content) notFound();
  if (locale === 'ka' && content.localeMode !== 'en_ka') permanentRedirect(`/en/football-quiz/${content.slug}`);

  const headerList = await headers();
  const nonce = headerList.get('x-nonce') ?? undefined;
  const pageUrl = `${SITE_URL}/${locale}/football-quiz/${content.slug}`;
  const isGeorgian = locale === 'ka';
  const title = isGeorgian ? (content.kaMetadataTitle ?? content.metadataTitle) : content.metadataTitle;
  const description = isGeorgian ? (content.kaDescription ?? content.description) : content.description;
  const h1 = isGeorgian ? (content.kaH1 ?? content.title) : content.title;
  const homeLabel = isGeorgian ? 'მთავარი' : 'Home';
  const hubLabel = isGeorgian ? 'ფეხბურთის ქვიზი' : 'Football Quiz';

  const gameSchema: Record<string, unknown> = {
    '@type': 'Game',
    name: h1,
    description,
    url: pageUrl,
    inLanguage: isGeorgian ? 'ka-GE' : 'en-GB',
    isAccessibleForFree: true,
    numberOfPlayers: { '@type': 'QuantitativeValue', value: 1 },
  };

  if (quiz.rating.count > 0 && quiz.rating.average !== null) {
    gameSchema.aggregateRating = {
      '@type': 'AggregateRating',
      ratingValue: quiz.rating.average,
      ratingCount: quiz.rating.count,
      bestRating: 5,
      worstRating: 1,
    };
  }

  const jsonLd = {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'WebPage',
        '@id': `${pageUrl}#webpage`,
        url: pageUrl,
        name: title,
        description,
        inLanguage: isGeorgian ? 'ka-GE' : 'en-GB',
        isPartOf: { '@id': `${SITE_URL}/#website` },
        mainEntity: { '@id': `${pageUrl}#quiz` },
      },
      {
        '@type': 'BreadcrumbList',
        '@id': `${pageUrl}#breadcrumb`,
        itemListElement: [
          { '@type': 'ListItem', position: 1, name: homeLabel, item: `${SITE_URL}/${locale}` },
          { '@type': 'ListItem', position: 2, name: hubLabel, item: `${SITE_URL}/${locale}/football-quiz` },
          { '@type': 'ListItem', position: 3, name: content.breadcrumbLabel, item: pageUrl },
        ],
      },
      { '@id': `${pageUrl}#quiz`, ...gameSchema },
    ],
  };

  return (
    <>
      <script nonce={nonce} type="application/ld+json" suppressHydrationWarning dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, '\\u003c') }} />
      <CampaignQuizLanding content={content} quiz={quiz} locale={locale} previewToken={preview} />
    </>
  );
}
