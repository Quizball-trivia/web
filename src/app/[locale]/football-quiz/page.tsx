import type { Metadata } from 'next';
import Image from 'next/image';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArrowRight, Swords } from 'lucide-react';
import {
  CAMPAIGN_QUIZ_CONTENT,
  CAMPAIGN_QUIZ_SLUGS,
} from '@/features/campaign-quiz/campaignQuiz.content';
import { SITE_NAME, SITE_URL } from '@/lib/seo/site';

const TITLE = 'Football Quiz — Play Free Football Quizzes & Trivia | QuizBall';
const DESCRIPTION =
  'Play free football quizzes on clubs, players, badges, career paths and Premier League history. Instant scores, no sign-up needed.';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  if (locale !== 'en') return {};

  return {
    title: { absolute: TITLE },
    description: DESCRIPTION,
    alternates: { canonical: `${SITE_URL}/en/football-quiz` },
    openGraph: {
      type: 'website',
      siteName: SITE_NAME,
      title: TITLE,
      description: DESCRIPTION,
      url: `${SITE_URL}/en/football-quiz`,
      locale: 'en_GB',
    },
  };
}

export default async function FootballQuizHubPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (locale !== 'en') notFound();

  return (
    <div className="min-h-screen bg-surface-page font-poppins text-white">
      <header className="bg-surface-page/95">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:h-20 lg:px-8">
          <Link href="/en" aria-label="QuizBall home">
            <Image
              src="/assets/brand/quizball-logo.webp"
              alt="QuizBall"
              width={218}
              height={64}
              priority
              className="h-10 w-auto object-contain sm:h-12"
            />
          </Link>
          <Link
            href="/en?signup=1&source=football-quiz-hub-header"
            className="inline-flex min-h-10 items-center rounded-lg bg-brand-yellow px-4 text-sm font-semibold text-black hover:bg-brand-yellow/90"
          >
            Sign up free
          </Link>
        </div>
      </header>

      <main>
        <section className="mx-auto max-w-7xl px-4 py-14 sm:px-6 sm:py-20 lg:px-8">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-brand-cyan">
            Free football trivia
          </p>
          <h1 className="mt-3 max-w-4xl text-balance text-4xl font-semibold leading-tight tracking-[-0.035em] sm:text-5xl lg:text-6xl">
            Football Quiz — Play Free Football Quizzes &amp; Trivia
          </h1>
          <p className="mt-5 max-w-2xl text-base font-medium leading-relaxed text-white/65 sm:text-lg">
            Pick a quiz, answer verified football questions and get your score instantly.
            Every solo quiz is free to start and needs no account.
          </p>
        </section>

        <section className="mx-auto max-w-7xl px-4 pb-16 sm:px-6 sm:pb-24 lg:px-8">
          <h2 className="text-2xl font-semibold sm:text-3xl">Choose your football quiz</h2>
          <div className="mt-7 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {CAMPAIGN_QUIZ_SLUGS.map((slug) => {
              const quiz = CAMPAIGN_QUIZ_CONTENT[slug];
              return (
                <Link
                  key={slug}
                  href={`/en/football-quiz/${slug}`}
                  className="group overflow-hidden rounded-xl bg-surface-card-deeper"
                >
                  <div className="relative aspect-[4/3] overflow-hidden">
                    <Image
                      src={quiz.heroImage}
                      alt={quiz.heroImageAlt}
                      fill
                      sizes="(min-width: 1024px) 25vw, (min-width: 640px) 50vw, 100vw"
                      className="object-cover transition-transform duration-300 group-hover:scale-[1.03]"
                    />
                  </div>
                  <div className="flex items-center justify-between gap-4 bg-brand-blue p-5">
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-[0.14em] text-brand-yellow">
                        Play free
                      </p>
                      <h2 className="mt-1 text-lg font-semibold text-white">
                        {quiz.breadcrumbLabel}
                      </h2>
                    </div>
                    <ArrowRight className="size-5 shrink-0 text-brand-yellow transition-transform group-hover:translate-x-1" aria-hidden />
                  </div>
                </Link>
              );
            })}
          </div>
        </section>

        <section className="mx-auto grid max-w-7xl gap-10 px-4 pb-20 sm:px-6 lg:grid-cols-2 lg:px-8">
          <div>
            <h2 className="text-2xl font-semibold">Football trivia, checked properly</h2>
            <p className="mt-4 font-medium leading-7 text-white/65">
              QuizBall’s public quizzes use verified questions covering clubs, competitions,
              players and the moments supporters still argue about. Your result appears as soon
              as the final answer is in.
            </p>
          </div>
          <div>
            <h2 className="flex items-center gap-3 text-2xl font-semibold">
              <Swords className="size-6 text-brand-yellow" aria-hidden />
              Take your score into ranked duels
            </h2>
            <p className="mt-4 font-medium leading-7 text-white/65">
              Solo quizzes are the warm-up. Sign up free when you are ready to face real fans,
              turn correct answers into possession and climb the QuizBall leaderboard.
            </p>
          </div>
        </section>
      </main>
    </div>
  );
}
