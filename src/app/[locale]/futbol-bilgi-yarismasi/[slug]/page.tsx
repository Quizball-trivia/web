import "@/styles/application-utilities.css";
import type { Metadata } from 'next';
import { notFound, permanentRedirect } from 'next/navigation';
import { CAMPAIGN_QUIZ_SLUGS } from '@/features/campaign-quiz/campaignQuiz.content';
import { campaignPublicSlug, campaignQuizPath, campaignSourceSlug, normalizeCampaignSlug, withPreview } from '@/features/campaign-quiz/campaignQuiz.routes';
import { buildCampaignQuizMetadata, renderCampaignQuizPage } from '@/features/campaign-quiz/CampaignQuizServerPage';
import { CampaignQuizApiError, loadCampaignSlugRegistry, resolveCampaignQuizRoute } from '@/features/campaign-quiz/campaignQuiz.api';

export const dynamic = 'force-dynamic';

interface TurkishCampaignQuizPageProps {
  params: Promise<{ locale: string; slug: string }>;
  searchParams: Promise<{ preview?: string }>;
}

export function generateStaticParams() {
  return CAMPAIGN_QUIZ_SLUGS.map((sourceSlug) => ({ locale: 'tr', slug: campaignPublicSlug(sourceSlug, 'tr') }));
}

export async function generateMetadata({ params, searchParams }: TurkishCampaignQuizPageProps): Promise<Metadata> {
  const [{ locale, slug }, { preview }] = await Promise.all([params, searchParams, loadCampaignSlugRegistry()]);
  if (locale !== 'tr') return {};
  if (normalizeCampaignSlug(slug).kind !== 'ok') return {};
  const sourceSlug = campaignSourceSlug(slug, 'tr');
  return buildCampaignQuizMetadata(sourceSlug, 'tr', preview);
}

export default async function TurkishCampaignQuizPage({ params, searchParams }: TurkishCampaignQuizPageProps) {
  const [{ locale, slug }, { preview }] = await Promise.all([params, searchParams, loadCampaignSlugRegistry()]);
  const slugCheck = normalizeCampaignSlug(slug);
  if (slugCheck.kind === 'invalid') notFound();
  if (slugCheck.kind === 'redirect') permanentRedirect(withPreview(`/${locale}/futbol-bilgi-yarismasi/${slugCheck.slug}`, preview));
  const sourceSlug = campaignSourceSlug(slug, 'tr');
  // Permanent: these mappings (English slug on the Turkish folder, other locales) never depend on the visitor.
  if (locale !== 'tr') permanentRedirect(withPreview(campaignQuizPath(sourceSlug, 'en'), preview));
  if (slug !== campaignPublicSlug(sourceSlug, 'tr')) permanentRedirect(withPreview(campaignQuizPath(sourceSlug, 'tr'), preview));
  try {
    return await renderCampaignQuizPage(sourceSlug, 'tr', preview);
  } catch (error) {
    if (!(error instanceof CampaignQuizApiError) || error.status !== 404) throw error;
    const route = await resolveCampaignQuizRoute(sourceSlug).catch(() => null);
    if (route?.kind === 'redirect' && route.target_slug) {
      permanentRedirect(withPreview(campaignQuizPath(route.target_slug, 'tr'), preview));
    }
    notFound();
  }
}
