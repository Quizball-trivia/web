import "@/styles/application-utilities.css";
import { cache } from 'react';
import type { Metadata } from 'next';
import { headers } from 'next/headers';
import { notFound, permanentRedirect, redirect } from 'next/navigation';
import { CampaignQuizLanding } from '@/features/campaign-quiz/CampaignQuizLanding';
import { campaignOpenSlugs, campaignQuizEditions, campaignQuizLanguages, hasCampaignEdition } from '@/features/campaign-quiz/CampaignQuizServerPage';
import {
  CAMPAIGN_QUIZ_SLUGS,
  getCampaignQuizContent,
} from '@/features/campaign-quiz/campaignQuiz.content';
import {
  CampaignQuizApiError,
  getCampaignQuiz,
  loadCampaignSlugRegistry,
  resolveCampaignQuizRoute,
} from '@/features/campaign-quiz/campaignQuiz.api';
import { SITE_NAME, SITE_URL } from '@/lib/seo/site';
import { campaignQuizPath, normalizeCampaignSlug, registerCampaignSlugs, withPreview } from '@/features/campaign-quiz/campaignQuiz.routes';

export const dynamic = 'force-dynamic';

interface CampaignQuizPageProps {
  params: Promise<{ locale: string; slug: string }>;
  searchParams: Promise<{ preview?: string }>;
}

const loadQuiz = cache(async (slug: string, preview: string | undefined, locale: 'en' | 'ka') => {
  const quiz = await getCampaignQuiz(slug, preview, locale);
  // A preview may be a draft whose URLs are not public yet.
  if (!preview) registerCampaignSlugs([quiz]);
  return quiz;
});

export function generateStaticParams() {
  return CAMPAIGN_QUIZ_SLUGS.map((slug) => ({ locale: 'en', slug }));
}

function absoluteImage(url: string): string {
  return url.startsWith('http') ? url : `${SITE_URL}${url}`;
}

export async function generateMetadata({ params, searchParams }: CampaignQuizPageProps): Promise<Metadata> {
  const [{ locale, slug }, { preview }] = await Promise.all([params, searchParams, loadCampaignSlugRegistry()]);
  if (locale !== 'en' && locale !== 'ka') return {};
  if (normalizeCampaignSlug(slug).kind !== 'ok') return {};

  try {
    const quiz = await loadQuiz(slug, preview, locale);
    const content = getCampaignQuizContent(slug, quiz.page, locale);
    if (!content) return {};
    const editions = await campaignQuizEditions(slug, quiz);
    if (locale === 'ka' && !preview && !editions.includes('ka')) return {};

    const isGeorgian = locale === 'ka';
    const title = isGeorgian ? (content.kaMetadataTitle ?? content.metadataTitle) : content.metadataTitle;
    const description = isGeorgian ? (content.kaDescription ?? content.description) : content.description;
    const pageUrl = `${SITE_URL}/${locale}/football-quiz/${content.slug}`;
    const ogImage = content.ogImage ?? content.heroImage;
    const ogAlt = content.ogImageAlt ?? content.heroImageAlt;
    const languages = campaignQuizLanguages(content.slug, editions);

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
        // CMS artwork is currently 4:3, while future dedicated OG assets may
        // be 1.91:1. Omitting guessed dimensions lets crawlers use the real
        // image ratio instead of advertising every asset as 1200×1200.
        images: [{ url: absoluteImage(ogImage), alt: ogAlt }],
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
  const [{ locale, slug }, { preview }] = await Promise.all([params, searchParams, loadCampaignSlugRegistry()]);
  const slugCheck = normalizeCampaignSlug(slug);
  if (slugCheck.kind === 'invalid') notFound();
  if (slugCheck.kind === 'redirect') permanentRedirect(withPreview(`/${locale}/football-quiz/${slugCheck.slug}`, preview));
  if (locale === 'es') permanentRedirect(withPreview(campaignQuizPath(slug, 'es'), preview));
  if (locale === 'ru') permanentRedirect(withPreview(campaignQuizPath(slug, 'ru'), preview));
  if (locale === 'pt') permanentRedirect(withPreview(campaignQuizPath(slug, 'pt'), preview));
  if (locale === 'de') permanentRedirect(withPreview(campaignQuizPath(slug, 'de'), preview));
  if (locale === 'tr') permanentRedirect(withPreview(campaignQuizPath(slug, 'tr'), preview));
  if (locale === 'fr') permanentRedirect(withPreview(campaignQuizPath(slug, 'fr'), preview));
  if (locale !== 'en' && locale !== 'ka') notFound();

  let quiz;
  try {
    quiz = await loadQuiz(slug, preview, locale);
  } catch (error) {
    if (!(error instanceof CampaignQuizApiError) || error.status !== 404) throw error;
    const route = await resolveCampaignQuizRoute(slug).catch(() => null);
    if (route?.kind === 'redirect' && route.target_slug) {
      permanentRedirect(withPreview(`/${locale}/football-quiz/${route.target_slug}`, preview));
    }
    notFound();
  }

  const content = getCampaignQuizContent(slug, quiz.page, locale);
  if (!content) notFound();
  // Temporary: a Georgian edition closes while a question is being retranslated and opens again.
  if (locale === 'ka' && !preview && !(await hasCampaignEdition(slug, quiz, 'ka'))) redirect(`/en/football-quiz/${content.slug}`);

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
        ...(quiz.page?.content_modified_at ? { dateModified: quiz.page.content_modified_at } : {}),
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
      <CampaignQuizLanding content={content} quiz={quiz} locale={locale} previewToken={preview} editions={await campaignQuizEditions(slug, quiz)} openSlugs={await campaignOpenSlugs(locale)} />
    </>
  );
}
