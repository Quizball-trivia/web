import { cache } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { ArrowRight, Swords } from 'lucide-react';
import { AppShellPageChrome } from '@/components/layout/app-shell/AppShellPageChrome';
import { CAMPAIGN_QUIZ_CONTENT } from './campaignQuiz.content';
import { listCampaignQuizPages } from './campaignQuiz.api';
import type { CampaignQuizHubPage } from './campaignQuiz.types';
import { CampaignQuizHubPageView } from './CampaignQuizHubPageView';
import { CampaignTrackedLink } from './CampaignTrackedLink';
import { CampaignSignupLink } from './CampaignSignupLink';
import { campaignQuizPath, type CampaignQuizLocale } from './campaignQuiz.routes';
import { LanguageSwitcher } from '@/components/i18n/LanguageSwitcher';

const POPULAR_QUIZ_SLUGS = {
  en: ['club-badges', 'career-path', 'everton', 'liverpool'],
  ka: ['club-badges', 'career-path', 'everton', 'liverpool'],
  es: ['guess-the-player', 'club-badges', 'real-madrid', 'barcelona'],
} as const satisfies Record<CampaignQuizLocale, readonly string[]>;

const HUB_COPY = {
  en: {
    ranked: 'Play Ranked', eyebrow: 'Free football trivia',
    title: 'Football Quiz — Play Free Football Quizzes & Trivia',
    intro: 'Pick a quiz, answer verified football questions and get your score instantly. Every solo quiz is free to start and needs no account.',
    popularHeading: 'Popular football quizzes in the UK',
    popularBody: 'Start with club badges, career paths, Everton and Liverpool — the quizzes UK football fans engage with most.',
    playFree: 'Play free', verifiedHeading: 'Football trivia, checked properly',
    verifiedBody: 'QuizBall’s public quizzes use verified questions covering clubs, competitions, players and football history.',
    methodologyLink: 'How QuizBall checks every question',
    rankedHeading: 'Take your score into ranked duels',
    rankedBody: 'Solo quizzes are the warm-up. Sign up free to face real fans and climb the QuizBall leaderboard.',
    groups: { team: 'Club quizzes', league: 'League quizzes', quiz_type: 'Football challenges', article: 'Football trivia' },
  },
  ka: {
    ranked: 'ითამაშე რეიტინგული', eyebrow: 'უფასო ფეხბურთის ტრივია', title: 'ფეხბურთის ქვიზი — ითამაშე უფასოდ',
    intro: 'აირჩიე ქვიზი, უპასუხე გადამოწმებულ კითხვებს და შედეგი მყისიერად მიიღე.',
    popularHeading: 'პოპულარული ფეხბურთის ქვიზები', popularBody: 'დაიწყე ყველაზე პოპულარული ქვიზებით.',
    playFree: 'ითამაშე უფასოდ', verifiedHeading: 'გადამოწმებული ფეხბურთის ტრივია',
    verifiedBody: 'QuizBall-ის საჯარო ქვიზები მოიცავს გადამოწმებულ კითხვებს კლუბებზე, ტურნირებსა და მოთამაშეებზე.',
    methodologyLink: 'როგორ ამოწმებს QuizBall კითხვებს',
    rankedHeading: 'გადადი რეიტინგულ დუელებში', rankedBody: 'დარეგისტრირდი უფასოდ და დაუპირისპირდი ნამდვილ გულშემატკივრებს.',
    groups: { team: 'კლუბების ქვიზები', league: 'ლიგების ქვიზები', quiz_type: 'ფეხბურთის გამოწვევები', article: 'ფეხბურთის ტრივია' },
  },
  es: {
    ranked: 'Jugar clasificatoria', eyebrow: 'Trivia de fútbol gratis',
    title: 'Quiz de Fútbol — Preguntas y Trivia Gratis',
    intro: 'Elige un quiz, responde preguntas de fútbol verificadas y recibe tu puntuación al instante. Todos los quizzes individuales son gratis y no necesitan cuenta.',
    popularHeading: 'Quizzes de fútbol populares',
    popularBody: 'Empieza con jugadores, escudos, Real Madrid y Barcelona: retos pensados para aficionados de España y Latinoamérica.',
    playFree: 'Jugar gratis', verifiedHeading: 'Trivia de fútbol con datos verificados',
    verifiedBody: 'Los quizzes públicos de QuizBall incluyen preguntas verificadas sobre clubes, competiciones, futbolistas y momentos históricos.',
    methodologyLink: 'Cómo revisa QuizBall cada pregunta',
    rankedHeading: 'Lleva tu puntuación a los duelos clasificatorios',
    rankedBody: 'Los quizzes individuales son el calentamiento. Regístrate gratis para enfrentarte a aficionados reales y subir en la clasificación.',
    groups: { team: 'Quizzes de clubes', league: 'Quizzes de ligas', quiz_type: 'Retos de fútbol', article: 'Trivia de fútbol' },
  },
} as const satisfies Record<CampaignQuizLocale, {
  ranked: string; eyebrow: string; title: string; intro: string; popularHeading: string;
  popularBody: string; playFree: string; verifiedHeading: string; verifiedBody: string;
  methodologyLink: string;
  rankedHeading: string; rankedBody: string; groups: Record<CampaignQuizHubPage['category'], string>;
}>;

const loadHubPages = cache(async (locale: CampaignQuizLocale) => {
  try {
    return await listCampaignQuizPages(locale);
  } catch {
    return [];
  }
});

function QuizCard({ page, locale, label, preload = false }: {
  page: CampaignQuizHubPage; locale: CampaignQuizLocale; label: string; preload?: boolean;
}) {
  const fallback = CAMPAIGN_QUIZ_CONTENT[page.slug];
  const image = page.hero_image_url ?? fallback?.heroImage;
  if (!image) return null;
  return (
    <CampaignTrackedLink targetSlug={page.slug} href={campaignQuizPath(page.slug, locale)} className="group flex h-full flex-col overflow-hidden rounded-xl bg-surface-card-deeper">
      <div className="relative aspect-[4/3] overflow-hidden">
        <Image src={image} alt={page.hero_image_alt || fallback?.heroImageAlt || ''} fill preload={preload} fetchPriority={preload ? 'high' : undefined} quality={70} sizes="(max-width: 639px) calc(100vw - 2rem), (max-width: 1023px) calc(50vw - 2.5rem), 280px" className="object-cover transition-transform duration-300 group-hover:scale-[1.03]" />
      </div>
      <div className="flex flex-1 items-center justify-between gap-4 bg-brand-blue p-5">
        <div><p className="text-xs font-semibold uppercase tracking-[0.14em] text-brand-yellow">{label}</p><h3 className="mt-1 text-lg font-semibold text-white">{page.breadcrumb_label || fallback?.breadcrumbLabel}</h3></div>
        <ArrowRight className="size-5 shrink-0 text-brand-yellow transition-transform group-hover:translate-x-1" aria-hidden />
      </div>
    </CampaignTrackedLink>
  );
}

export async function CampaignQuizHub({ locale }: { locale: CampaignQuizLocale }) {
  const copy = HUB_COPY[locale];
  const pages = await loadHubPages(locale);
  const popularSlugs = POPULAR_QUIZ_SLUGS[locale];
  const popularSlugSet = new Set<string>(popularSlugs);
  const popularPages = popularSlugs.flatMap((slug) => {
    const page = pages.find((candidate) => candidate.slug === slug);
    return page ? [page] : [];
  });
  const groups = (['team', 'league', 'quiz_type', 'article'] as const)
    .map((category) => ({
      category,
      pages: pages.filter(
        (page) => page.category === category && !popularSlugSet.has(page.slug),
      ),
    }))
    .filter((group) => group.pages.length > 0);

  return (
    <div className="relative min-h-screen bg-surface-page-alt font-poppins text-white">
      <CampaignQuizHubPageView locale={locale} />
      <AppShellPageChrome />
      <header className="relative z-10 bg-surface-page-alt/80 backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:h-20 lg:px-8">
          <Link href={`/${locale}`} aria-label="QuizBall"><Image src="/assets/brand/quizball-logo.webp" alt="QuizBall" width={218} height={64} className="h-10 w-auto object-contain sm:h-12" /></Link>
          <div className="flex items-center gap-3">
            <LanguageSwitcher locale={locale} locales={['en', 'es']} className="hidden sm:inline-flex" />
            <CampaignSignupLink slug="football-quiz" placement="hero" href={`/${locale}?signup=1&source=football-quiz-hub-header`} className="inline-flex min-h-10 items-center rounded-lg bg-brand-yellow px-4 text-sm font-semibold text-black hover:bg-brand-yellow/90">{copy.ranked}</CampaignSignupLink>
          </div>
        </div>
      </header>
      <main className="relative z-10">
        <section className="mx-auto max-w-7xl px-4 py-14 sm:px-6 sm:py-20 lg:px-8">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-brand-cyan">{copy.eyebrow}</p>
          <h1 className="mt-3 max-w-4xl text-balance text-4xl font-semibold leading-tight tracking-[-0.035em] sm:text-5xl lg:text-6xl">{copy.title}</h1>
          <p className="mt-5 max-w-2xl text-base font-medium leading-relaxed text-white/65 sm:text-lg">{copy.intro}</p>
        </section>
        {popularPages.length ? (
          <section className="mx-auto max-w-7xl px-4 pb-16 sm:px-6 sm:pb-20 lg:px-8">
            <h2 className="text-2xl font-semibold sm:text-3xl">{copy.popularHeading}</h2>
            <p className="mt-3 max-w-2xl font-medium leading-7 text-white/65">{copy.popularBody}</p>
            <div className="mt-7 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">{popularPages.map((page, index) => <QuizCard key={page.slug} page={page} locale={locale} label={copy.playFree} preload={index === 0} />)}</div>
          </section>
        ) : null}
        <section className="mx-auto max-w-7xl space-y-14 px-4 pb-16 sm:px-6 sm:pb-24 lg:px-8">
          {groups.map((group) => <div key={group.category}><h2 className="text-2xl font-semibold sm:text-3xl">{copy.groups[group.category]}</h2><div className="mt-7 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">{group.pages.map((page) => <QuizCard key={page.slug} page={page} locale={locale} label={copy.playFree} />)}</div></div>)}
        </section>
        <section className="mx-auto grid max-w-7xl gap-10 px-4 pb-20 sm:px-6 lg:grid-cols-2 lg:px-8">
          <div>
            <h2 className="text-2xl font-semibold">{copy.verifiedHeading}</h2>
            <p className="mt-4 font-medium leading-7 text-white/65">{copy.verifiedBody}</p>
            <Link href={`/${locale}/editorial-methodology`} className="mt-4 inline-flex items-center gap-2 font-semibold text-brand-cyan hover:underline">
              {copy.methodologyLink}
              <ArrowRight className="size-4" aria-hidden />
            </Link>
          </div>
          <div><h2 className="flex items-center gap-3 text-2xl font-semibold"><Swords className="size-6 text-brand-yellow" aria-hidden />{copy.rankedHeading}</h2><p className="mt-4 font-medium leading-7 text-white/65">{copy.rankedBody}</p></div>
        </section>
      </main>
    </div>
  );
}
