import "@/styles/application-utilities.css";
import type { Metadata } from 'next';
import { notFound, permanentRedirect } from 'next/navigation';
import { CAMPAIGN_QUIZ_SLUGS } from '@/features/campaign-quiz/campaignQuiz.content';
import { campaignPublicSlug, campaignQuizPath, campaignSourceSlug, normalizeCampaignSlug, withPreview } from '@/features/campaign-quiz/campaignQuiz.routes';
import { buildCampaignQuizMetadata, renderCampaignQuizPage } from '@/features/campaign-quiz/CampaignQuizServerPage';
import { confirmedCampaignSource } from '@/features/campaign-quiz/campaignQuiz.confirmed';
import { CampaignQuizApiError, loadCampaignSlugRegistry, resolveCampaignQuizRoute } from '@/features/campaign-quiz/campaignQuiz.api';

export const dynamic = 'force-dynamic';

interface GreekCampaignQuizPageProps {
  params: Promise<{ locale: string; slug: string }>;
  searchParams: Promise<{ preview?: string }>;
}

export function generateStaticParams() {
  return CAMPAIGN_QUIZ_SLUGS.map((sourceSlug) => ({ locale: 'el', slug: campaignPublicSlug(sourceSlug, 'el') }));
}

export async function generateMetadata({ params, searchParams }: GreekCampaignQuizPageProps): Promise<Metadata> {
  const [{ locale, slug }, { preview }] = await Promise.all([params, searchParams, loadCampaignSlugRegistry()]);
  if (locale !== 'el') return {};
  if (normalizeCampaignSlug(slug).kind !== 'ok') return {};
  const confirmed = await confirmedCampaignSource();
  const sourceSlug = confirmed ?? campaignSourceSlug(slug, 'el');
  return buildCampaignQuizMetadata(sourceSlug, 'el', preview);
}

export default async function GreekCampaignQuizPage({ params, searchParams }: GreekCampaignQuizPageProps) {
  const [{ locale, slug }, { preview }] = await Promise.all([params, searchParams, loadCampaignSlugRegistry()]);
  const slugCheck = normalizeCampaignSlug(slug);
  if (slugCheck.kind === 'invalid') notFound();
  if (slugCheck.kind === 'redirect') permanentRedirect(withPreview(`/${locale}/kouiz-podosfairou/${slugCheck.slug}`, preview));
  const confirmed = await confirmedCampaignSource();
  const sourceSlug = confirmed ?? campaignSourceSlug(slug, 'el');
  // Permanent: these mappings (English slug on the Greek folder, other locales) never depend on the visitor.
  if (locale !== 'el') permanentRedirect(withPreview(campaignQuizPath(sourceSlug, 'en'), preview));
  if (!confirmed && slug !== campaignPublicSlug(sourceSlug, 'el')) permanentRedirect(withPreview(campaignQuizPath(sourceSlug, 'el'), preview));
  try {
    return await renderCampaignQuizPage(sourceSlug, 'el', preview);
  } catch (error) {
    if (!(error instanceof CampaignQuizApiError) || error.status !== 404) throw error;
    const route = await resolveCampaignQuizRoute(sourceSlug).catch(() => null);
    if (route?.kind === 'redirect' && route.target_slug) {
      permanentRedirect(withPreview(campaignQuizPath(route.target_slug, 'el'), preview));
    }
    notFound();
  }
}
