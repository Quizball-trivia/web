import type { Metadata } from 'next';
import { notFound, permanentRedirect } from 'next/navigation';
import { CAMPAIGN_QUIZ_SLUGS } from '@/features/campaign-quiz/campaignQuiz.content';
import { campaignPublicSlug, campaignQuizPath, campaignSourceSlug, normalizeCampaignSlug, sanitizePreview, withPreview } from '@/features/campaign-quiz/campaignQuiz.routes';
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
  const [{ locale, slug }, { preview: rawPreview }] = await Promise.all([params, searchParams]);
  const preview = sanitizePreview(rawPreview);
  if (locale !== 'es') return {};
  if (normalizeCampaignSlug(slug).kind !== 'ok') return {};
  const sourceSlug = campaignSourceSlug(slug, 'es');
  return buildCampaignQuizMetadata(sourceSlug, 'es', preview);
}

export default async function SpanishCampaignQuizPage({ params, searchParams }: SpanishCampaignQuizPageProps) {
  const [{ locale, slug }, { preview: rawPreview }] = await Promise.all([params, searchParams]);
  const preview = sanitizePreview(rawPreview);
  const slugCheck = normalizeCampaignSlug(slug);
  if (slugCheck.kind === 'invalid') notFound();
  if (slugCheck.kind === 'redirect') permanentRedirect(withPreview(`/${locale}/quiz-de-futbol/${slugCheck.slug}`, preview));
  const sourceSlug = campaignSourceSlug(slug, 'es');
  // Permanent: these mappings (English slug on the Spanish folder, other locales) never depend on the visitor.
  if (locale !== 'es') permanentRedirect(withPreview(campaignQuizPath(sourceSlug, 'en'), preview));
  if (slug !== campaignPublicSlug(sourceSlug, 'es')) permanentRedirect(withPreview(campaignQuizPath(sourceSlug, 'es'), preview));
  try {
    return await renderCampaignQuizPage(sourceSlug, 'es', preview);
  } catch (error) {
    if (!(error instanceof CampaignQuizApiError)) throw error;
    // Only an identifiable preview rejection (a token was sent and the API refused it) becomes a
    // deliberate 404; every other failure (429, unexpected 4xx, 5xx) still surfaces as an error.
    if (preview && [400, 401, 403, 422].includes(error.status)) notFound();
    if (error.status !== 404) throw error;
    const route = await resolveCampaignQuizRoute(sourceSlug).catch(() => null);
    if (route?.kind === 'redirect' && route.target_slug) {
      permanentRedirect(withPreview(campaignQuizPath(route.target_slug, 'es'), preview));
    }
    notFound();
  }
}
