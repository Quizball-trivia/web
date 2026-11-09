import "@/styles/application-utilities.css";
import type { Metadata } from 'next';
import { notFound, permanentRedirect } from 'next/navigation';
import { CAMPAIGN_QUIZ_SLUGS } from '@/features/campaign-quiz/campaignQuiz.content';
import { campaignPublicSlug, campaignQuizPath, campaignSourceSlug, normalizeCampaignSlug, withPreview } from '@/features/campaign-quiz/campaignQuiz.routes';
import { buildCampaignQuizMetadata, renderCampaignQuizPage } from '@/features/campaign-quiz/CampaignQuizServerPage';
import { CampaignQuizApiError, resolveCampaignQuizRoute } from '@/features/campaign-quiz/campaignQuiz.api';

export const dynamic = 'force-dynamic';

interface FrenchCampaignQuizPageProps {
  params: Promise<{ locale: string; slug: string }>;
  searchParams: Promise<{ preview?: string }>;
}

export function generateStaticParams() {
  return CAMPAIGN_QUIZ_SLUGS.map((sourceSlug) => ({ locale: 'fr', slug: campaignPublicSlug(sourceSlug, 'fr') }));
}

export async function generateMetadata({ params, searchParams }: FrenchCampaignQuizPageProps): Promise<Metadata> {
  const [{ locale, slug }, { preview }] = await Promise.all([params, searchParams]);
  if (locale !== 'fr') return {};
  if (normalizeCampaignSlug(slug).kind !== 'ok') return {};
  const sourceSlug = campaignSourceSlug(slug, 'fr');
  return buildCampaignQuizMetadata(sourceSlug, 'fr', preview);
}

export default async function FrenchCampaignQuizPage({ params, searchParams }: FrenchCampaignQuizPageProps) {
  const [{ locale, slug }, { preview }] = await Promise.all([params, searchParams]);
  const slugCheck = normalizeCampaignSlug(slug);
  if (slugCheck.kind === 'invalid') notFound();
  if (slugCheck.kind === 'redirect') permanentRedirect(withPreview(`/${locale}/quiz-foot/${slugCheck.slug}`, preview));
  const sourceSlug = campaignSourceSlug(slug, 'fr');
  // Permanent: these mappings (English slug on the French folder, other locales) never depend on the visitor.
  if (locale !== 'fr') permanentRedirect(withPreview(campaignQuizPath(sourceSlug, 'en'), preview));
  if (slug !== campaignPublicSlug(sourceSlug, 'fr')) permanentRedirect(withPreview(campaignQuizPath(sourceSlug, 'fr'), preview));
  try {
    return await renderCampaignQuizPage(sourceSlug, 'fr', preview);
  } catch (error) {
    if (!(error instanceof CampaignQuizApiError) || error.status !== 404) throw error;
    const route = await resolveCampaignQuizRoute(sourceSlug).catch(() => null);
    if (route?.kind === 'redirect' && route.target_slug) {
      permanentRedirect(withPreview(campaignQuizPath(route.target_slug, 'fr'), preview));
    }
    notFound();
  }
}
