import type { Metadata } from 'next';
import { headers } from 'next/headers';
import { notFound } from 'next/navigation';
import { CampaignQuizLanding } from '@/features/campaign-quiz/CampaignQuizLanding';
import {
  CAMPAIGN_QUIZ_SLUGS,
  getCampaignQuizContent,
} from '@/features/campaign-quiz/campaignQuiz.content';
import { getCampaignQuiz } from '@/features/campaign-quiz/campaignQuiz.api';
import { SITE_NAME, SITE_URL } from '@/lib/seo/site';

export const dynamic = 'force-dynamic';

interface CampaignQuizPageProps {
  params: Promise<{ locale: string; slug: string }>;
}

export function generateStaticParams() {
  return CAMPAIGN_QUIZ_SLUGS.map((slug) => ({ locale: 'en', slug }));
}

export async function generateMetadata({
  params,
}: CampaignQuizPageProps): Promise<Metadata> {
  const { locale, slug } = await params;
  const content = getCampaignQuizContent(slug);
  if (locale !== 'en' || !content) return {};

  const pageUrl = `${SITE_URL}/en/football-quiz/${content.slug}`;

  return {
    title: { absolute: content.metadataTitle },
    description: content.description,
    alternates: {
      canonical: pageUrl,
    },
    openGraph: {
      type: 'website',
      siteName: SITE_NAME,
      title: content.metadataTitle,
      description: content.description,
      url: pageUrl,
      locale: 'en_GB',
      images: [
        {
          url: content.heroImage.startsWith('http')
            ? content.heroImage
            : `${SITE_URL}${content.heroImage}`,
          width: 1200,
          height: 1200,
          alt: content.heroImageAlt,
        },
      ],
    },
    twitter: {
      card: 'summary_large_image',
      title: content.metadataTitle,
      description: content.description,
      images: [
        content.heroImage.startsWith('http')
          ? content.heroImage
          : `${SITE_URL}${content.heroImage}`,
      ],
    },
  };
}

export default async function CampaignQuizPage({ params }: CampaignQuizPageProps) {
  const { locale, slug } = await params;
  const content = getCampaignQuizContent(slug);
  if (locale !== 'en' || !content) notFound();

  const [quiz, headerList] = await Promise.all([
    getCampaignQuiz(content.slug),
    headers(),
  ]);
  const nonce = headerList.get('x-nonce') ?? undefined;
  const pageUrl = `${SITE_URL}/en/football-quiz/${content.slug}`;

  const gameSchema: Record<string, unknown> = {
    '@type': 'Game',
    name: content.title,
    description: content.description,
    url: pageUrl,
    inLanguage: 'en-GB',
    isAccessibleForFree: true,
    numberOfPlayers: {
      '@type': 'QuantitativeValue',
      value: 1,
    },
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
        name: content.metadataTitle,
        description: content.description,
        inLanguage: 'en-GB',
        isPartOf: {
          '@id': `${SITE_URL}/#website`,
        },
        mainEntity: {
          '@id': `${pageUrl}#quiz`,
        },
      },
      {
        '@type': 'BreadcrumbList',
        '@id': `${pageUrl}#breadcrumb`,
        itemListElement: [
          {
            '@type': 'ListItem',
            position: 1,
            name: 'Home',
            item: `${SITE_URL}/en`,
          },
          {
            '@type': 'ListItem',
            position: 2,
            name: 'Football Quiz',
            item: `${SITE_URL}/en/football-quiz`,
          },
          {
            '@type': 'ListItem',
            position: 3,
            name: content.breadcrumbLabel,
            item: pageUrl,
          },
        ],
      },
      {
        '@id': `${pageUrl}#quiz`,
        ...gameSchema,
      },
    ],
  };

  return (
    <>
      <script
        nonce={nonce}
        type="application/ld+json"
        suppressHydrationWarning
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(jsonLd).replace(/</g, '\\u003c'),
        }}
      />
      <CampaignQuizLanding content={content} quiz={quiz} />
    </>
  );
}
