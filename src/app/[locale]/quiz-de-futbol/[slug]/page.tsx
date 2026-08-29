import type { Metadata } from 'next';
import { notFound, permanentRedirect, redirect } from 'next/navigation';
import { CAMPAIGN_QUIZ_SLUGS } from '@/features/campaign-quiz/campaignQuiz.content';
import { campaignPublicSlug, campaignQuizPath, campaignSourceSlug } from '@/features/campaign-quiz/campaignQuiz.routes';
import { buildCampaignQuizMetadata, renderCampaignQuizPage } from '@/features/campaign-quiz/CampaignQuizServerPage';
import { CampaignQuizApiError, resolveCampaignQuizRoute } from '@/features/campaign-quiz/campaignQuiz.api';

export const dynamic = 'force-dynamic';

interface SpanishCampaignQuizPageProps {
  params: Promise<{ locale: string; slug: string }>;
  searchParams: Promise<{ preview?: string }>;
}

export function generateStaticParams() {
  return CAMPAIGN_QUIZ_SLUGS.map((sourceSlug) => ({ locale: 'es', slug: campaignPublicSlug(sourceSlug, 'es') }));
}

export async function generateMetadata({ params, searchParams }: SpanishCampaignQuizPageProps): Promise<Metadata> {
  const [{ locale, slug }, { preview }] = await Promise.all([params, searchParams]);
  if (locale !== 'es') return {};
  const sourceSlug = campaignSourceSlug(slug, 'es');
  return buildCampaignQuizMetadata(sourceSlug, 'es', preview);
}

export default async function SpanishCampaignQuizPage({ params, searchParams }: SpanishCampaignQuizPageProps) {
  const [{ locale, slug }, { preview }] = await Promise.all([params, searchParams]);
  const sourceSlug = campaignSourceSlug(slug, 'es');
  if (locale === 'en') redirect(campaignQuizPath(sourceSlug, 'en'));
  if (locale !== 'es') redirect(campaignQuizPath(sourceSlug, 'en'));
  if (slug !== campaignPublicSlug(sourceSlug, 'es')) redirect(campaignQuizPath(sourceSlug, 'es'));
  try {
    return await renderCampaignQuizPage(sourceSlug, 'es', preview);
  } catch (error) {
    if (!(error instanceof CampaignQuizApiError) || error.status !== 404) throw error;
    const route = await resolveCampaignQuizRoute(sourceSlug).catch(() => null);
    if (route?.kind === 'redirect' && route.target_slug) {
      permanentRedirect(campaignQuizPath(route.target_slug, 'es'));
    }
    notFound();
  }
}
