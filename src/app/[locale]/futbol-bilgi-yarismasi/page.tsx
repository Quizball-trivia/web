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

// Google Suggest hl=tr, gl=TR 2026-11-06: "futbol bilgi yarışması" (…soruları, …oyna, …online), "futbol testi", "futbol soruları".
const TITLE = 'Futbol Bilgi Yarışması: Futbol Testi ve Soruları Online | QuizBall';
const DESCRIPTION = 'Ücretsiz futbol bilgi yarışması: kulüpler, milli takımlar, armalar ve futbolcu kariyerleri hakkında futbol soruları. Anında puanını gör, kayıt olmadan oyna.';

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  if (locale !== 'tr') return {};
  if (!(await hasCampaignHub('tr'))) return {};
  const canonical = `${SITE_URL}/tr/futbol-bilgi-yarismasi`;
  const { languages, alternateLocale } = await campaignHubAlternates('tr');
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
      locale: 'tr_TR',
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

export default async function TurkishFootballQuizHubPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  if (locale !== 'tr') redirect('/en/football-quiz');
  // No quiz has a complete tr edition (or the backend predates Turkish): home and footer links land on the English hub.
  if (!(await hasCampaignHub('tr'))) redirect('/en/football-quiz');
  return <CampaignQuizHub locale="tr" />;
}
