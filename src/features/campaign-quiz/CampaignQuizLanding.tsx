import Image from 'next/image';
import Link from 'next/link';
import {
  ArrowRight,
  BadgeCheck,
  Brain,
  Clock3,
  LockKeyhole,
  ShieldCheck,
  Swords,
} from 'lucide-react';
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '@/components/ui/breadcrumb';
import { CampaignQuizGame } from './CampaignQuizGame';
import { CampaignQuizRating } from './CampaignQuizRating';
import { CampaignSignupLink } from './CampaignSignupLink';
import {
  CAMPAIGN_QUIZ_CONTENT,
  type CampaignQuizPageContent,
} from './campaignQuiz.content';
import type { CampaignQuiz } from './campaignQuiz.types';

interface CampaignQuizLandingProps {
  content: CampaignQuizPageContent;
  quiz: CampaignQuiz;
}

const CLUB_QUIZ_LOGOS: Record<string, string> = {
  everton: '/clubs/everton-fc.webp',
  liverpool: '/clubs/liverpool-fc.webp',
  'manchester-united': '/clubs/manchester-united.webp',
  tottenham: '/clubs/tottenham-hotspur.webp',
};

export function CampaignQuizLanding({ content, quiz }: CampaignQuizLandingProps) {
  const playId = `play-${content.slug}-quiz`;

  return (
    <div className="min-h-screen overflow-x-hidden bg-surface-page font-poppins text-white">
      <header className="sticky top-0 z-50 bg-surface-page/95 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-4 px-4 sm:px-6 lg:h-20 lg:px-8">
          <Link href="/en" aria-label="QuizBall home" className="shrink-0">
            <Image
              src="/assets/brand/quizball-logo.webp"
              alt="QuizBall"
              width={218}
              height={64}
              priority
              className="h-10 w-auto object-contain sm:h-12"
            />
          </Link>

          <div className="flex items-center gap-3">
            <span className="hidden items-center gap-2 text-sm font-semibold text-white/55 md:flex">
              <Swords className="size-4 text-brand-yellow" aria-hidden />
              Ranked football trivia
            </span>
            <CampaignSignupLink
              slug={quiz.slug}
              placement="header"
              href={`/en?signup=1&source=${content.slug}-quiz-header`}
              className="inline-flex min-h-10 items-center justify-center rounded-lg bg-brand-yellow px-4 text-sm font-semibold text-black transition-colors hover:bg-brand-yellow/90 sm:px-5"
            >
              Sign up free
            </CampaignSignupLink>
          </div>
        </div>
      </header>

      <main>
        <div className="mx-auto max-w-7xl px-4 pt-5 sm:px-6 lg:px-8">
          <Breadcrumb>
            <BreadcrumbList className="text-xs font-semibold text-white/40 sm:text-sm">
              <BreadcrumbItem>
                <BreadcrumbLink asChild>
                  <Link href="/en" className="hover:text-brand-yellow">
                    Home
                  </Link>
                </BreadcrumbLink>
              </BreadcrumbItem>
              <BreadcrumbSeparator className="text-white/25" />
              <BreadcrumbItem>
                <BreadcrumbLink asChild>
                  <Link href="/en/football-quiz" className="text-white/50 hover:text-brand-yellow">
                    Football Quiz
                  </Link>
                </BreadcrumbLink>
              </BreadcrumbItem>
              <BreadcrumbSeparator className="text-white/25" />
              <BreadcrumbItem>
                <BreadcrumbPage className="font-semibold text-white">
                  {content.breadcrumbLabel}
                </BreadcrumbPage>
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>
        </div>

        <section>
          <div className="mx-auto grid max-w-7xl items-center gap-10 px-4 py-10 sm:px-6 sm:py-14 lg:grid-cols-[1.1fr_0.9fr] lg:px-8 lg:py-20">
            <div className="max-w-3xl">
              <div className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.16em] text-brand-yellow">
                <BadgeCheck className="size-4" aria-hidden />
                {quiz.total_questions} verified questions
              </div>
              <h1 className="mt-5 text-balance text-4xl font-semibold leading-[1.04] tracking-[-0.035em] text-white sm:text-5xl lg:text-6xl">
                {content.heroLead}{' '}
                <span className="text-brand-yellow">{content.heroHighlight}</span>
              </h1>
              <p className="mt-5 max-w-2xl text-pretty text-base font-medium leading-relaxed text-white/68 sm:text-lg">
                {content.lede}
              </p>

              <div className="mt-7 flex flex-wrap items-center gap-4">
                <a
                  href={`#${playId}`}
                  className="inline-flex min-h-12 items-center justify-center gap-2 rounded-lg bg-brand-blue px-5 font-semibold text-white transition-colors hover:bg-brand-blue/90"
                >
                  Start the quiz
                  <ArrowRight className="size-5" aria-hidden />
                </a>
                <div className="flex min-h-12 items-center gap-2 px-1 text-sm font-medium text-white/55">
                  <LockKeyhole className="size-4 text-brand-cyan" aria-hidden />
                  No login needed
                </div>
              </div>

              {quiz.total_questions === 15 ? (
                <div className="mt-8 flex flex-wrap gap-x-6 gap-y-2 text-sm font-medium text-white/55">
                  <span><strong className="font-semibold text-white">5</strong> easy</span>
                  <span><strong className="font-semibold text-white">5</strong> medium</span>
                  <span><strong className="font-semibold text-white">5</strong> hard</span>
                </div>
              ) : null}
            </div>

            <div className="mx-auto w-full max-w-lg">
              <div className="relative aspect-square overflow-hidden rounded-xl bg-surface-card-deeper">
                <Image
                  src={content.heroImage}
                  alt={content.heroImageAlt}
                  fill
                  sizes="(min-width: 1024px) 40vw, 90vw"
                  priority
                  className="object-cover"
                />
              </div>
            </div>
          </div>
        </section>

        <section
          id={playId}
          aria-labelledby={`${playId}-heading`}
          className="scroll-mt-24 py-12 sm:py-16"
        >
          <div className="mx-auto max-w-4xl px-4 sm:px-6">
            <div className="mb-6 text-center">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-brand-cyan">
                Solo warm-up
              </p>
              <h2
                id={`${playId}-heading`}
                className="mt-2 text-3xl font-semibold text-white sm:text-4xl"
              >
                {content.playHeading}
              </h2>
              <p className="mt-2 font-medium text-white/50">
                Pick one answer for each question. Your score arrives instantly.
              </p>
            </div>
            <CampaignQuizGame
              slug={quiz.slug}
              questions={quiz.questions}
              scoreTemplate={content.scoreTemplate}
            />
            <div className="mt-5 flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-xs font-semibold text-white/40">
              <span className="inline-flex items-center gap-1.5">
                <ShieldCheck className="size-4 text-brand-green-light" aria-hidden />
                Fact-checked questions
              </span>
              <span className="inline-flex items-center gap-1.5">
                <Clock3 className="size-4 text-brand-cyan" aria-hidden />
                About 5 minutes
              </span>
              <span className="inline-flex items-center gap-1.5">
                <Brain className="size-4 text-brand-yellow" aria-hidden />
                Instant score
              </span>
            </div>
          </div>
        </section>

        <section className="mx-auto grid max-w-7xl gap-7 px-4 py-14 sm:px-6 sm:py-20 lg:grid-cols-[1fr_320px] lg:px-8">
          <article className="py-4">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-brand-yellow">
              {content.aboutEyebrow}
            </p>
            <h2 className="mt-1 text-2xl font-semibold text-white sm:text-3xl">
              {content.aboutHeading}
            </h2>

            <div className="mt-6 space-y-4 text-[15px] font-medium leading-7 text-white/65 sm:text-base">
              {content.aboutParagraphs.map((paragraph) => (
                <p key={paragraph}>{paragraph}</p>
              ))}
            </div>
          </article>

          <div>
            <CampaignQuizRating slug={quiz.slug} initialRating={quiz.rating} />
            <div className="mt-5 px-1 pt-3">
              <p className="text-xs font-semibold uppercase tracking-[0.17em] text-brand-cyan">
                Built for fair play
              </p>
              <p className="mt-2 text-sm font-medium leading-relaxed text-white/60">
                These public warm-up questions stay separate from the ranked question pool.
              </p>
            </div>
          </div>
        </section>

        <section
          id="related-football-quizzes"
          aria-labelledby="related-football-quizzes-heading"
          className="scroll-mt-24 mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8"
        >
          <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-brand-cyan">
                Keep playing
              </p>
              <h2
                id="related-football-quizzes-heading"
                className="mt-1 text-2xl font-semibold text-white"
              >
                Related football quizzes
              </h2>
            </div>
            <Link
              href="/en/football-quiz"
              className="inline-flex items-center gap-2 text-sm font-semibold text-brand-yellow hover:text-white"
            >
              All football quizzes
              <ArrowRight className="size-4" aria-hidden />
            </Link>
          </div>
          <div className="mt-5 grid grid-cols-2 gap-x-8 gap-y-3 sm:grid-cols-4">
            {content.relatedSlugs.map((slug) => {
              const related = CAMPAIGN_QUIZ_CONTENT[slug];
              const clubLogo = CLUB_QUIZ_LOGOS[slug];
              return (
                <Link
                  key={slug}
                  href={`/en/football-quiz/${slug}`}
                  aria-label={`Play ${related.breadcrumbLabel}`}
                  title={related.breadcrumbLabel}
                  className="group flex min-h-28 items-center justify-center py-3 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-yellow"
                >
                  <Image
                    src={clubLogo ?? related.heroImage}
                    alt=""
                    aria-hidden
                    width={120}
                    height={120}
                    className={`size-20 transition-transform duration-200 group-hover:scale-105 sm:size-24 ${
                      clubLogo
                        ? `object-contain ${
                            slug === 'tottenham' ? 'brightness-0 invert' : ''
                          }`
                        : 'rounded-xl object-cover'
                    }`}
                  />
                </Link>
              );
            })}
          </div>
        </section>

        <section
          id="ranked-quiz-cta"
          className="scroll-mt-24 mx-auto max-w-7xl px-4 py-14 sm:px-6 sm:py-20 lg:px-8"
        >
          <div className="max-w-2xl py-8">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-brand-yellow">
              Ready for ranked?
            </p>
            <h2 className="mt-2 text-balance text-3xl font-semibold leading-tight text-white sm:text-4xl">
              {content.footerCta}
            </h2>
            <CampaignSignupLink
              slug={quiz.slug}
              placement="footer"
              href={`/en?signup=1&source=${content.slug}-quiz-footer`}
              className="mt-6 inline-flex min-h-12 items-center justify-center gap-2 rounded-lg bg-brand-yellow px-6 font-semibold text-black transition-colors hover:bg-brand-yellow/90"
            >
              Sign up free
              <ArrowRight className="size-5" aria-hidden />
            </CampaignSignupLink>
          </div>
        </section>
      </main>

      <footer className="bg-surface-page px-4 py-10">
        <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-5 sm:flex-row">
          <Link href="/en" aria-label="QuizBall home">
            <Image
              src="/assets/brand/quizball-logo.webp"
              alt="QuizBall"
              width={180}
              height={54}
              className="h-10 w-auto object-contain"
            />
          </Link>
          <p className="text-center text-xs font-medium text-white/35 sm:text-right">
            © 2026 QuizBall. Football trivia built for proper competition.
          </p>
        </div>
      </footer>
    </div>
  );
}
