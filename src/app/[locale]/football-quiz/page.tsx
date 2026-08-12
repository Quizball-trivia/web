import type { Metadata } from 'next';
import Image from 'next/image';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArrowRight, Swords } from 'lucide-react';
import { AppShellPageChrome } from '@/components/layout/app-shell/AppShellPageChrome';
import {
  CAMPAIGN_QUIZ_CONTENT,
} from '@/features/campaign-quiz/campaignQuiz.content';
import { listCampaignQuizPages } from '@/features/campaign-quiz/campaignQuiz.api';
import type { CampaignQuizHubPage } from '@/features/campaign-quiz/campaignQuiz.types';
import { CampaignTrackedLink } from '@/features/campaign-quiz/CampaignTrackedLink';
import { SITE_NAME, SITE_URL } from '@/lib/seo/site';

const TITLE = 'Football Quiz — Play Free Football Quizzes & Trivia | QuizBall';
const DESCRIPTION = 'Play free football quizzes on clubs, players, badges, career paths and Premier League history. Instant scores, no sign-up needed.';
const GROUP_LABELS: Record<CampaignQuizHubPage['category'], string> = {
  team: 'Club quizzes',
  league: 'League quizzes',
  quiz_type: 'Football challenges',
  article: 'Football trivia',
};

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  if (locale !== 'en' && locale !== 'ka') return {};
  const pageUrl = `${SITE_URL}/${locale}/football-quiz`;
  return {
    title: { absolute: TITLE },
    description: DESCRIPTION,
    alternates: { canonical: pageUrl },
    openGraph: { type: 'website', siteName: SITE_NAME, title: TITLE, description: DESCRIPTION, url: pageUrl, locale: locale === 'ka' ? 'ka_GE' : 'en_GB' },
  };
}

async function loadHubPages(locale: 'en' | 'ka'): Promise<CampaignQuizHubPage[]> {
  try {
    return await listCampaignQuizPages(locale);
  } catch {
    // Publication state belongs to the CMS. If it cannot be loaded, fail
    // closed rather than resurfacing a deleted or unpublished legacy page.
    return [];
  }
}

export default async function FootballQuizHubPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale: rawLocale } = await params;
  if (rawLocale !== 'en' && rawLocale !== 'ka') notFound();
  const locale = rawLocale as 'en' | 'ka';
  const pages = await loadHubPages(locale);
  if (locale === 'ka' && pages.length === 0) notFound();

  const groups = (['team', 'league', 'quiz_type', 'article'] as const)
    .map((category) => ({ category, pages: pages.filter((page) => page.category === category) }))
    .filter((group) => group.pages.length > 0);

  return (
    <div className="relative min-h-screen bg-surface-page-alt font-poppins text-white">
      <AppShellPageChrome />
      <header className="relative z-10 bg-surface-page-alt/80 backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:h-20 lg:px-8">
          <Link href={`/${locale}`} aria-label="QuizBall home"><Image src="/assets/brand/quizball-logo.webp" alt="QuizBall" width={218} height={64} priority className="h-10 w-auto object-contain sm:h-12" /></Link>
          <Link href={`/${locale}?signup=1&source=football-quiz-hub-header`} className="inline-flex min-h-10 items-center rounded-lg bg-brand-yellow px-4 text-sm font-semibold text-black hover:bg-brand-yellow/90">Play Ranked</Link>
        </div>
      </header>

      <main className="relative z-10">
        <section className="mx-auto max-w-7xl px-4 py-14 sm:px-6 sm:py-20 lg:px-8">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-brand-cyan">Free football trivia</p>
          <h1 className="mt-3 max-w-4xl text-balance text-4xl font-semibold leading-tight tracking-[-0.035em] sm:text-5xl lg:text-6xl">Football Quiz — Play Free Football Quizzes &amp; Trivia</h1>
          <p className="mt-5 max-w-2xl text-base font-medium leading-relaxed text-white/65 sm:text-lg">Pick a quiz, answer verified football questions and get your score instantly. Every solo quiz is free to start and needs no account.</p>
        </section>

        <section className="mx-auto max-w-7xl space-y-14 px-4 pb-16 sm:px-6 sm:pb-24 lg:px-8">
          {groups.map((group) => (
            <div key={group.category}>
              <h2 className="text-2xl font-semibold sm:text-3xl">{GROUP_LABELS[group.category]}</h2>
              <div className="mt-7 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
                {group.pages.map((page) => {
                  const fallback = CAMPAIGN_QUIZ_CONTENT[page.slug];
                  const heroImage = page.hero_image_url ?? fallback?.heroImage;
                  if (!heroImage) return null;
                  return (
                    <CampaignTrackedLink key={page.slug} targetSlug={page.slug} href={`/${locale}/football-quiz/${page.slug}`} className="group flex h-full flex-col overflow-hidden rounded-xl bg-surface-card-deeper">
                      <div className="relative aspect-[4/3] overflow-hidden"><Image src={heroImage} alt={page.hero_image_alt || fallback?.heroImageAlt || ''} fill sizes="(min-width: 1024px) 25vw, (min-width: 640px) 50vw, 100vw" className="object-cover transition-transform duration-300 group-hover:scale-[1.03]" /></div>
                      <div className="flex flex-1 items-center justify-between gap-4 bg-brand-blue p-5"><div><p className="text-xs font-semibold uppercase tracking-[0.14em] text-brand-yellow">Play free</p><h3 className="mt-1 text-lg font-semibold text-white">{page.breadcrumb_label || fallback?.breadcrumbLabel}</h3></div><ArrowRight className="size-5 shrink-0 text-brand-yellow transition-transform group-hover:translate-x-1" aria-hidden /></div>
                    </CampaignTrackedLink>
                  );
                })}
              </div>
            </div>
          ))}
        </section>

        <section className="mx-auto grid max-w-7xl gap-10 px-4 pb-20 sm:px-6 lg:grid-cols-2 lg:px-8">
          <div><h2 className="text-2xl font-semibold">Football trivia, checked properly</h2><p className="mt-4 font-medium leading-7 text-white/65">QuizBall’s public quizzes use verified questions covering clubs, competitions, players and the moments supporters still argue about. Your result appears as soon as the final answer is in.</p></div>
          <div><h2 className="flex items-center gap-3 text-2xl font-semibold"><Swords className="size-6 text-brand-yellow" aria-hidden />Take your score into ranked duels</h2><p className="mt-4 font-medium leading-7 text-white/65">Solo quizzes are the warm-up. Sign up free when you are ready to face real fans, turn correct answers into possession and climb the QuizBall leaderboard.</p></div>
        </section>
      </main>
    </div>
  );
}
