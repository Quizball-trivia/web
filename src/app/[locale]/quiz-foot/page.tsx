import "@/styles/application-utilities.css";
import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { CampaignQuizHub } from '@/features/campaign-quiz/CampaignQuizHub';
import { campaignHubAlternates, hasCampaignHub } from '@/features/campaign-quiz/campaignQuiz.editions';
import {
  SITE_NAME,
  SITE_OG_IMAGE_ALT,
  SITE_OG_IMAGE_PATH,
  SITE_URL,
} from '@/lib/seo/site';

// docs/SEO-GAME-NAMING-FR-2026-11-06.md §4 and §6: "quiz foot" leads, "football" once in the title, "soccer" once in the meta for Quebec.
const TITLE = 'Quiz foot : teste ta culture football en ligne | QuizBall';
const DESCRIPTION = 'Quiz de foot et de soccer gratuits : clubs, sélections, logos et parcours de joueurs. Réponds à des questions vérifiées et vois ton score tout de suite, sans inscription.';

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  if (locale !== 'fr') return {};
  if (!(await hasCampaignHub('fr'))) return {};
  const canonical = `${SITE_URL}/fr/quiz-foot`;
  const { languages, alternateLocale } = await campaignHubAlternates('fr');
  return {
    title: { absolute: TITLE },
    description: DESCRIPTION,
    alternates: {
      canonical,
      languages,
    },
    openGraph: {
      type: 'website',
      siteName: SITE_NAME,
      title: TITLE,
      description: DESCRIPTION,
      url: canonical,
      locale: 'fr_FR',
      alternateLocale,
      images: [{
        url: SITE_OG_IMAGE_PATH,
        width: 1200,
        height: 630,
        alt: SITE_OG_IMAGE_ALT,
      }],
    },
    twitter: {
      card: 'summary_large_image',
      title: TITLE,
      description: DESCRIPTION,
      images: [SITE_OG_IMAGE_PATH],
    },
  };
}

export default async function FrenchFootballQuizHubPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  if (locale !== 'fr') redirect('/en/football-quiz');
  // No quiz has a complete fr edition (or the backend predates French): home and footer links land on the English hub.
  if (!(await hasCampaignHub('fr'))) redirect('/en/football-quiz');
  return <CampaignQuizHub locale="fr" />;
}
