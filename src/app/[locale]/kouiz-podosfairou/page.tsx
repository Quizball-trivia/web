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

// docs/SEO-GAME-NAMING-EL-2026-11-13.md §4: "κουίζ ποδοσφαίρου" leads (Google folds "κουιζ ποδοσφαιρο" into it); "Football Quiz" once in Latin.
const TITLE = 'Κουίζ ποδοσφαίρου: ερωτήσεις ποδοσφαίρου online | QuizBall';
const DESCRIPTION = 'Δωρεάν κουίζ ποδοσφαίρου (Football Quiz): ομάδες, εθνικές, σήματα και καριέρες παικτών. Απάντησε σε ελεγμένες ερωτήσεις και δες αμέσως το σκορ σου, χωρίς εγγραφή.';

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  if (locale !== 'el') return {};
  if (!(await hasCampaignHub('el'))) return {};
  const canonical = `${SITE_URL}/el/kouiz-podosfairou`;
  const { languages, alternateLocale } = await campaignHubAlternates('el');
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
      locale: 'el_GR',
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

export default async function GreekFootballQuizHubPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  if (locale !== 'el') redirect('/en/football-quiz');
  // No quiz has a complete el edition (or the backend predates Greek): home and footer links land on the English hub.
  if (!(await hasCampaignHub('el'))) redirect('/en/football-quiz');
  return <CampaignQuizHub locale="el" />;
}
