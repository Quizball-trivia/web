import "@/styles/application-utilities.css";
import type { Metadata } from 'next';
import { notFound, permanentRedirect } from 'next/navigation';
import { CAMPAIGN_QUIZ_SLUGS } from '@/features/campaign-quiz/campaignQuiz.content';
import { campaignPublicSlug, campaignQuizPath, campaignSourceSlug, normalizeCampaignSlug, withPreview } from '@/features/campaign-quiz/campaignQuiz.routes';
import { buildCampaignQuizMetadata, renderCampaignQuizPage } from '@/features/campaign-quiz/CampaignQuizServerPage';
import { CampaignQuizApiError, resolveCampaignQuizRoute } from '@/features/campaign-quiz/campaignQuiz.api';

export const dynamic = 'force-dynamic';

interface PortugueseCampaignQuizPageProps {
  params: Promise<{ locale: string; slug: string }>;
  searchParams: Promise<{ preview?: string }>;
}

export function generateStaticParams() {
  return CAMPAIGN_QUIZ_SLUGS.map((sourceSlug) => ({ locale: 'pt', slug: campaignPublicSlug(sourceSlug, 'pt') }));
}

export async function generateMetadata({ params, searchParams }: PortugueseCampaignQuizPageProps): Promise<Metadata> {
  const [{ locale, slug }, { preview }] = await Promise.all([params, searchParams]);
  if (locale !== 'pt') return {};
  if (normalizeCampaignSlug(slug).kind !== 'ok') return {};
  const sourceSlug = campaignSourceSlug(slug, 'pt');
  return buildCampaignQuizMetadata(sourceSlug, 'pt', preview);
}

export default async function PortugueseCampaignQuizPage({ params, searchParams }: PortugueseCampaignQuizPageProps) {
  const [{ locale, slug }, { preview }] = await Promise.all([params, searchParams]);
  const slugCheck = normalizeCampaignSlug(slug);
  if (slugCheck.kind === 'invalid') notFound();
  if (slugCheck.kind === 'redirect') permanentRedirect(withPreview(`/${locale}/quiz-de-futebol/${slugCheck.slug}`, preview));
  const sourceSlug = campaignSourceSlug(slug, 'pt');
  // Permanent: these mappings (English slug on the Portuguese folder, other locales) never depend on the visitor.
  if (locale !== 'pt') permanentRedirect(withPreview(campaignQuizPath(sourceSlug, 'en'), preview));
  if (slug !== campaignPublicSlug(sourceSlug, 'pt')) permanentRedirect(withPreview(campaignQuizPath(sourceSlug, 'pt'), preview));
  try {
    return await renderCampaignQuizPage(sourceSlug, 'pt', preview);
  } catch (error) {
    if (!(error instanceof CampaignQuizApiError) || error.status !== 404) throw error;
    const route = await resolveCampaignQuizRoute(sourceSlug).catch(() => null);
    if (route?.kind === 'redirect' && route.target_slug) {
      permanentRedirect(withPreview(campaignQuizPath(route.target_slug, 'pt'), preview));
    }
    notFound();
  }
}
