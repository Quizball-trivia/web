import "@/styles/application-utilities.css";
import type { Metadata } from 'next';
import { notFound, redirect } from 'next/navigation';
import { CampaignQuizHub } from '@/features/campaign-quiz/CampaignQuizHub';
import { campaignHubAlternates, hasCampaignHub } from '@/features/campaign-quiz/campaignQuiz.editions';
import {
  SITE_NAME,
  SITE_OG_IMAGE_ALT,
  SITE_OG_IMAGE_PATH,
  SITE_URL,
} from '@/lib/seo/site';

// docs/SEO-GAME-NAMING-DE-2026-10-23.md §4: H1 "Fußball-Quiz: Fragen und Antworten online"; the title also carries
// "Teste dein Fußballwissen".
const TITLE = 'Fußball-Quiz: Fragen und Antworten online — teste dein Fußballwissen | QuizBall';
const DESCRIPTION = 'Fußball-Quiz online und kostenlos: Fragen und Antworten zu Vereinen, Nationalmannschaften, Wappen und Spielerkarrieren. Ergebnis sofort, ohne Anmeldung.';

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  if (locale !== 'de') return {};
  if (!(await hasCampaignHub('de'))) return {};
  const canonical = `${SITE_URL}/de/fussball-quiz`;
  const { languages, alternateLocale } = await campaignHubAlternates('de');
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
      locale: 'de_DE',
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

export default async function GermanFootballQuizHubPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  if (locale !== 'de') redirect('/en/football-quiz');
  // No quiz has a complete de edition yet: no hub either (an empty page under a German address).
  if (!(await hasCampaignHub('de'))) notFound();
  return <CampaignQuizHub locale="de" />;
}
