import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { CampaignQuizHub } from '@/features/campaign-quiz/CampaignQuizHub';
import {
  SITE_NAME,
  SITE_OG_IMAGE_ALT,
  SITE_OG_IMAGE_PATH,
  SITE_URL,
} from '@/lib/seo/site';

const TITLE = 'Quiz de Fútbol — Preguntas y Trivia Gratis | QuizBall';
const DESCRIPTION = 'Juega quizzes de fútbol gratis sobre clubes, jugadores, escudos, trayectorias y grandes competiciones. Resultado instantáneo y sin registro.';

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  if (locale !== 'es') return {};
  const canonical = `${SITE_URL}/es/quiz-de-futbol`;
  return {
    title: { absolute: TITLE },
    description: DESCRIPTION,
    alternates: {
      canonical,
      languages: {
        en: `${SITE_URL}/en/football-quiz`,
        es: canonical,
        'x-default': `${SITE_URL}/en/football-quiz`,
      },
    },
    openGraph: {
      type: 'website',
      siteName: SITE_NAME,
      title: TITLE,
      description: DESCRIPTION,
      url: canonical,
      locale: 'es_ES',
      alternateLocale: ['en_GB'],
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

export default async function SpanishFootballQuizHubPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  if (locale === 'en') redirect('/en/football-quiz');
  if (locale !== 'es') redirect('/en/football-quiz');
  return <CampaignQuizHub locale="es" />;
}
