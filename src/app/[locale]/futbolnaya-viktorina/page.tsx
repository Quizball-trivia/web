import "@/styles/application-utilities.css";
import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { CampaignQuizHub } from '@/features/campaign-quiz/CampaignQuizHub';
import { campaignHubAlternates } from '@/features/campaign-quiz/campaignQuiz.editions';
import {
  SITE_NAME,
  SITE_OG_IMAGE_ALT,
  SITE_OG_IMAGE_PATH,
  SITE_URL,
} from '@/lib/seo/site';

// docs/SEO-GAME-NAMING-RU-2026-10-15.md §4: lead with "футбольная викторина онлайн", also carry "футбольный квиз".
const TITLE = 'Футбольная викторина онлайн: тест и футбольный квиз | QuizBall';
const DESCRIPTION = 'Бесплатная футбольная викторина онлайн: тесты на знание клубов, сборных, эмблем и карьер футболистов. Результат сразу, без регистрации.';

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  if (locale !== 'ru') return {};
  const canonical = `${SITE_URL}/ru/futbolnaya-viktorina`;
  const { languages, alternateLocale } = await campaignHubAlternates('ru');
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
      locale: 'ru_RU',
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

export default async function RussianFootballQuizHubPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  if (locale !== 'ru') redirect('/en/football-quiz');
  return <CampaignQuizHub locale="ru" />;
}
