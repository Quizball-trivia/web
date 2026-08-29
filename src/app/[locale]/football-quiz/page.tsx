import { cache } from 'react';
import type { Metadata } from 'next';
import Image from 'next/image';
import Link from 'next/link';
import { notFound, permanentRedirect } from 'next/navigation';
import { ArrowRight, Swords } from 'lucide-react';
import { AppShellPageChrome } from '@/components/layout/app-shell/AppShellPageChrome';
import {
  CAMPAIGN_QUIZ_CONTENT,
} from '@/features/campaign-quiz/campaignQuiz.content';
import { CampaignQuizHubPageView } from '@/features/campaign-quiz/CampaignQuizHubPageView';
import { listCampaignQuizPages } from '@/features/campaign-quiz/campaignQuiz.api';
import type { CampaignQuizHubPage } from '@/features/campaign-quiz/campaignQuiz.types';
import { CampaignTrackedLink } from '@/features/campaign-quiz/CampaignTrackedLink';
import { CampaignSignupLink } from '@/features/campaign-quiz/CampaignSignupLink';
import {
  SITE_NAME,
  SITE_OG_IMAGE_ALT,
  SITE_OG_IMAGE_PATH,
  SITE_URL,
} from '@/lib/seo/site';

const TITLE = 'Football Quiz — Play Free Football Quizzes & Trivia | QuizBall';
const DESCRIPTION = 'Play free football quizzes on clubs, players, badges, career paths and Premier League history. Instant scores, no sign-up needed.';
const KA_TITLE = 'ფეხბურთის ქვიზი — ითამაშე უფასოდ | QuizBall';
const KA_DESCRIPTION = 'ითამაშე უფასო ფეხბურთის ქვიზები კლუბებზე, მოთამაშეებზე, ემბლემებსა და პრემიერ ლიგის ისტორიაზე. მიიღე შედეგი მყისიერად.';
const POPULAR_QUIZ_SLUGS = ['club-badges', 'career-path', 'everton', 'liverpool'] as const;
const HUB_COPY = {
  en: {
    playRanked: 'Play Ranked',
    eyebrow: 'Free football trivia',
    h1: 'Football Quiz — Play Free Football Quizzes & Trivia',
    lede: 'Pick a quiz, answer verified football questions and get your score instantly. Every solo quiz is free to start and needs no account.',
    popularHeading: 'Popular football quizzes in the UK',
    popularBody: 'Start with the quizzes UK football fans are playing most: club badges, career paths, Everton and Liverpool.',
    groups: {
      team: 'Club quizzes',
      league: 'League quizzes',
      quiz_type: 'Football challenges',
      article: 'Football trivia',
    },
    playFree: 'Play free',
    checkedHeading: 'Football trivia, checked properly',
    checkedBody: 'QuizBall’s public quizzes use verified questions covering clubs, competitions, players and the moments supporters still argue about. Your result appears as soon as the final answer is in.',
    rankedHeading: 'Take your score into ranked duels',
    rankedBody: 'Solo quizzes are the warm-up. Sign up free when you are ready to face real fans, turn correct answers into possession and climb the QuizBall leaderboard.',
  },
  ka: {
    playRanked: 'ითამაშე რეიტინგული',
    eyebrow: 'უფასო ფეხბურთის ტრივია',
    h1: 'ფეხბურთის ქვიზი — ითამაშე უფასოდ',
    lede: 'აირჩიე ქვიზი, უპასუხე გადამოწმებულ ფეხბურთის კითხვებს და შედეგი მყისიერად მიიღე. ყველა სოლო ქვიზი უფასოა და ანგარიშს არ საჭიროებს.',
    popularHeading: 'პოპულარული ფეხბურთის ქვიზები',
    popularBody: 'დაიწყე ყველაზე პოპულარული ქვიზებით: კლუბების ემბლემები, კარიერის გზები, ევერტონი და ლივერპული.',
    groups: {
      team: 'კლუბების ქვიზები',
      league: 'ლიგების ქვიზები',
      quiz_type: 'ფეხბურთის გამოწვევები',
      article: 'ფეხბურთის ტრივია',
    },
    playFree: 'ითამაშე უფასოდ',
    checkedHeading: 'სწორად გადამოწმებული ფეხბურთის ტრივია',
    checkedBody: 'QuizBall-ის საჯარო ქვიზები მოიცავს გადამოწმებულ კითხვებს კლუბებზე, ტურნირებზე, მოთამაშეებსა და დასამახსოვრებელ მომენტებზე. საბოლოო პასუხის შემდეგ შედეგს მყისიერად მიიღებ.',
    rankedHeading: 'გადაიტანე შენი შედეგი რეიტინგულ დუელებში',
    rankedBody: 'სოლო ქვიზები გახურებაა. დარეგისტრირდი უფასოდ, დაუპირისპირდი ნამდვილ გულშემატკივრებს და აიწიე QuizBall-ის რეიტინგში.',
  },
} as const satisfies Record<'en' | 'ka', {
  playRanked: string;
  eyebrow: string;
  h1: string;
  lede: string;
  popularHeading: string;
  popularBody: string;
  groups: Record<CampaignQuizHubPage['category'], string>;
  playFree: string;
  checkedHeading: string;
  checkedBody: string;
  rankedHeading: string;
  rankedBody: string;
}>;

const loadHubPages = cache(async (locale: 'en' | 'ka'): Promise<CampaignQuizHubPage[]> => {
  try {
    return await listCampaignQuizPages(locale);
  } catch {
    // Publication state belongs to the CMS. If it cannot be loaded, fail
    // closed rather than resurfacing a deleted or unpublished legacy page.
    return [];
  }
});

function QuizCard({
  page,
  locale,
  playFree,
  preload = false,
}: {
  page: CampaignQuizHubPage;
  locale: 'en' | 'ka';
  playFree: string;
  preload?: boolean;
}) {
  const fallback = CAMPAIGN_QUIZ_CONTENT[page.slug];
  const heroImage = page.hero_image_url ?? fallback?.heroImage;
  if (!heroImage) return null;

  return (
    <CampaignTrackedLink
      targetSlug={page.slug}
      href={`/${locale}/football-quiz/${page.slug}`}
      className="group flex h-full flex-col overflow-hidden rounded-xl bg-surface-card-deeper"
    >
      <div className="relative aspect-[4/3] overflow-hidden">
        <Image
          src={heroImage}
          alt={page.hero_image_alt || fallback?.heroImageAlt || ''}
          fill
          preload={preload}
          fetchPriority={preload ? 'high' : undefined}
          quality={70}
          sizes="(max-width: 639px) calc(100vw - 2rem), (max-width: 1023px) calc(50vw - 2.5rem), 280px"
          className="object-cover transition-transform duration-300 group-hover:scale-[1.03]"
        />
      </div>
      <div className="flex flex-1 items-center justify-between gap-4 bg-brand-blue p-5">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-brand-yellow">{playFree}</p>
          <h3 className="mt-1 text-lg font-semibold text-white">{page.breadcrumb_label || fallback?.breadcrumbLabel}</h3>
        </div>
        <ArrowRight className="size-5 shrink-0 text-brand-yellow transition-transform group-hover:translate-x-1" aria-hidden />
      </div>
    </CampaignTrackedLink>
  );
}

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  if (locale !== 'en' && locale !== 'ka') return {};
  const englishPages = await loadHubPages('en');
  const hasGeorgianHub = englishPages.some((page) => page.locale_mode === 'en_ka');
  if (locale === 'ka' && !hasGeorgianHub) return {};
  const pageUrl = `${SITE_URL}/${locale}/football-quiz`;
  const title = locale === 'ka' ? KA_TITLE : TITLE;
  const description = locale === 'ka' ? KA_DESCRIPTION : DESCRIPTION;
  const languages = {
    en: `${SITE_URL}/en/football-quiz`,
    ...(hasGeorgianHub ? { ka: `${SITE_URL}/ka/football-quiz` } : {}),
    es: `${SITE_URL}/es/quiz-de-futbol`,
    'x-default': `${SITE_URL}/en/football-quiz`,
  };
  return {
    title: { absolute: title },
    description,
    alternates: {
      canonical: pageUrl,
      languages,
    },
    openGraph: {
      type: 'website',
      siteName: SITE_NAME,
      title,
      description,
      url: pageUrl,
      locale: locale === 'ka' ? 'ka_GE' : 'en_GB',
      alternateLocale: hasGeorgianHub ? [locale === 'ka' ? 'en_GB' : 'ka_GE'] : undefined,
      images: [{ url: SITE_OG_IMAGE_PATH, width: 1200, height: 630, alt: SITE_OG_IMAGE_ALT }],
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: [SITE_OG_IMAGE_PATH],
    },
  };
}

export default async function FootballQuizHubPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale: rawLocale } = await params;
  if (rawLocale === 'es') permanentRedirect('/es/quiz-de-futbol');
  if (rawLocale !== 'en' && rawLocale !== 'ka') notFound();
  const locale = rawLocale as 'en' | 'ka';
  const copy = HUB_COPY[locale];
  const pages = await loadHubPages(locale);
  if (pages.length === 0) notFound();
  const popularPages = POPULAR_QUIZ_SLUGS.flatMap((slug) => {
    const page = pages.find((candidate) => candidate.slug === slug);
    return page ? [page] : [];
  });

  const groups = (['team', 'league', 'quiz_type', 'article'] as const)
    .map((category) => ({
      category,
      pages: pages.filter(
        (page) => page.category === category && !POPULAR_QUIZ_SLUGS.some((slug) => slug === page.slug),
      ),
    }))
    .filter((group) => group.pages.length > 0);

  return (
    <div className="relative min-h-screen bg-surface-page-alt font-poppins text-white">
      <CampaignQuizHubPageView locale={locale} />
      <AppShellPageChrome />
      <header className="relative z-10 bg-surface-page-alt/80 backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:h-20 lg:px-8">
          <Link href={`/${locale}`} aria-label="QuizBall home"><Image src="/assets/brand/quizball-logo.webp" alt="QuizBall" width={218} height={64} className="h-10 w-auto object-contain sm:h-12" /></Link>
          <CampaignSignupLink
            slug="football-quiz"
            placement="hero"
            href={`/${locale}?signup=1&source=football-quiz-hub-header`}
            className="inline-flex min-h-10 items-center rounded-lg bg-brand-yellow px-4 text-sm font-semibold text-black hover:bg-brand-yellow/90"
          >
            {copy.playRanked}
          </CampaignSignupLink>
        </div>
      </header>

      <main className="relative z-10">
        <section className="mx-auto max-w-7xl px-4 py-14 sm:px-6 sm:py-20 lg:px-8">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-brand-cyan">{copy.eyebrow}</p>
          <h1 className="mt-3 max-w-4xl text-balance text-4xl font-semibold leading-tight tracking-[-0.035em] sm:text-5xl lg:text-6xl">{copy.h1}</h1>
          <p className="mt-5 max-w-2xl text-base font-medium leading-relaxed text-white/65 sm:text-lg">{copy.lede}</p>
        </section>

        {popularPages.length > 0 ? (
          <section className="mx-auto max-w-7xl px-4 pb-16 sm:px-6 sm:pb-20 lg:px-8">
            <h2 className="text-2xl font-semibold sm:text-3xl">{copy.popularHeading}</h2>
            <p className="mt-3 max-w-2xl font-medium leading-7 text-white/65">{copy.popularBody}</p>
            <div className="mt-7 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
              {popularPages.map((page, index) => (
                <QuizCard
                  key={`popular-${page.slug}`}
                  page={page}
                  locale={locale}
                  playFree={copy.playFree}
                  preload={index === 0}
                />
              ))}
            </div>
          </section>
        ) : null}

        <section className="mx-auto max-w-7xl space-y-14 px-4 pb-16 sm:px-6 sm:pb-24 lg:px-8">
          {groups.map((group) => (
            <div key={group.category}>
              <h2 className="text-2xl font-semibold sm:text-3xl">{copy.groups[group.category]}</h2>
              <div className="mt-7 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
                {group.pages.map((page) => (
                  <QuizCard key={page.slug} page={page} locale={locale} playFree={copy.playFree} />
                ))}
              </div>
            </div>
          ))}
        </section>

        <section className="mx-auto grid max-w-7xl gap-10 px-4 pb-20 sm:px-6 lg:grid-cols-2 lg:px-8">
          <div><h2 className="text-2xl font-semibold">{copy.checkedHeading}</h2><p className="mt-4 font-medium leading-7 text-white/65">{copy.checkedBody}</p></div>
          <div><h2 className="flex items-center gap-3 text-2xl font-semibold"><Swords className="size-6 text-brand-yellow" aria-hidden />{copy.rankedHeading}</h2><p className="mt-4 font-medium leading-7 text-white/65">{copy.rankedBody}</p></div>
        </section>
      </main>
    </div>
  );
}
