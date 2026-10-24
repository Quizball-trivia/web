import "@/styles/application-utilities.css";
import type { Metadata } from 'next';
import { notFound, redirect } from 'next/navigation';
import { CampaignQuizHub } from '@/features/campaign-quiz/CampaignQuizHub';
import { hasGermanCampaignHub, hasPortugueseCampaignHub } from '@/features/campaign-quiz/campaignQuiz.editions';
import {
  SITE_NAME,
  SITE_OG_IMAGE_ALT,
  SITE_OG_IMAGE_PATH,
  SITE_URL,
} from '@/lib/seo/site';

// docs/SEO-GAME-NAMING-PT-2026-10-21.md §4: H1 "Quiz de futebol: perguntas e respostas online"; the title also carries
// "teste seus conhecimentos" (never leading with "teste": in Brazil that is youth-team trials).
const TITLE = 'Quiz de futebol: perguntas e respostas — teste seus conhecimentos | QuizBall';
const DESCRIPTION = 'Quiz de futebol online e grátis: perguntas e respostas sobre times, seleções, escudos e a carreira dos jogadores. Resultado na hora, sem cadastro.';

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  if (locale !== 'pt') return {};
  if (!(await hasPortugueseCampaignHub())) return {};
  const canonical = `${SITE_URL}/pt/quiz-de-futebol`;
  const german = await hasGermanCampaignHub();
  return {
    title: { absolute: TITLE },
    description: DESCRIPTION,
    alternates: {
      canonical,
      languages: {
        en: `${SITE_URL}/en/football-quiz`,
        es: `${SITE_URL}/es/quiz-de-futbol`,
        ru: `${SITE_URL}/ru/futbolnaya-viktorina`,
        'pt-BR': canonical,
        ...(german ? { de: `${SITE_URL}/de/fussball-quiz` } : {}),
        'x-default': `${SITE_URL}/en/football-quiz`,
      },
    },
    openGraph: {
      type: 'website',
      siteName: SITE_NAME,
      title: TITLE,
      description: DESCRIPTION,
      url: canonical,
      locale: 'pt_BR',
      alternateLocale: ['en_GB', 'es_ES', 'ru_RU', ...(german ? ['de_DE'] : [])],
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

export default async function PortugueseFootballQuizHubPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  if (locale !== 'pt') redirect('/en/football-quiz');
  // No quiz has a complete pt edition yet: no hub either (an empty page under a Portuguese address).
  if (!(await hasPortugueseCampaignHub())) notFound();
  return <CampaignQuizHub locale="pt" />;
}
