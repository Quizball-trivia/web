import { cache } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { headers } from 'next/headers';
import { ArrowRight, Swords } from 'lucide-react';
import { AppShellPageChrome } from '@/components/layout/app-shell/AppShellPageChrome';
import { CAMPAIGN_QUIZ_CONTENT } from './campaignQuiz.content';
import { listCampaignQuizPages } from './campaignQuiz.api';
import type { CampaignQuizHubPage } from './campaignQuiz.types';
import { CampaignQuizHubPageView } from './CampaignQuizHubPageView';
import { CampaignTrackedLink } from './CampaignTrackedLink';
import { CampaignSignupLink } from './CampaignSignupLink';
import { campaignHubPath, campaignQuizPath, type CampaignQuizLocale } from './campaignQuiz.routes';
import { LanguageSwitcher } from '@/components/i18n/LanguageSwitcher';
import { buildCampaignQuizHubJsonLd, serializeCampaignHubJsonLd } from './campaignQuiz.hub-seo';
import { SITE_URL } from '@/lib/seo/site';

const POPULAR_QUIZ_SLUGS = {
  en: ['club-badges', 'career-path', 'everton', 'liverpool'],
  ka: ['club-badges', 'career-path', 'everton', 'liverpool'],
  es: ['guess-the-player', 'club-badges', 'real-madrid', 'barcelona'],
  ru: ['career-path', 'guess-the-player', 'club-badges', 'real-madrid'],
  pt: ['career-path', 'guess-the-player', 'club-badges', 'real-madrid'],
  de: ['career-path', 'guess-the-player', 'club-badges', 'premier-league'],
} as const satisfies Record<CampaignQuizLocale, readonly string[]>;

const HUB_COPY = {
  en: {
    ranked: 'Play Ranked', eyebrow: 'Free football trivia',
    title: 'Football Quiz — Play Free Football Quizzes & Trivia',
    intro: 'Pick a quiz, answer verified football questions and get your score instantly. Every solo quiz is free to start and needs no account.',
    popularHeading: 'Popular football quizzes in the UK',
    popularBody: 'Start with useful football quiz questions on club badges, career paths, Everton and Liverpool — the quizzes UK football fans engage with most.',
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
    popularBody: 'Empieza con preguntas de fútbol para adivinar el futbolista, reconocer escudos y poner a prueba cuánto sabes del Real Madrid y el Barcelona.',
    playFree: 'Jugar gratis', verifiedHeading: 'Trivia de fútbol con datos verificados',
    verifiedBody: 'Los quizzes públicos de QuizBall incluyen preguntas verificadas sobre clubes, competiciones, futbolistas y momentos históricos.',
    methodologyLink: 'Cómo revisa QuizBall cada pregunta',
    rankedHeading: 'Lleva tu puntuación a los duelos clasificatorios',
    rankedBody: 'Los quizzes individuales son el calentamiento. Regístrate gratis para enfrentarte a aficionados reales y subir en la clasificación.',
    groups: { team: 'Quizzes de clubes', league: 'Quizzes de ligas', quiz_type: 'Retos de fútbol', article: 'Trivia de fútbol' },
  },
  ru: {
    ranked: 'Рейтинговый матч', eyebrow: 'Бесплатные футбольные тесты',
    // docs/SEO-GAME-NAMING-RU-2026-10-15.md §4: the H1 leads with "Футбольная викторина онлайн".
    title: 'Футбольная викторина онлайн: тест на знание футбола',
    intro: 'Выбери викторину, ответь на проверенные вопросы о футболе и сразу узнай свой результат. Все одиночные викторины бесплатные, аккаунт не нужен.',
    popularHeading: 'Популярные футбольные викторины',
    popularBody: 'Начни с самых популярных тестов: угадай футболиста по карьере и по подсказкам, узнай клуб по эмблеме и проверь, как хорошо ты знаешь «Реал».',
    playFree: 'Играть бесплатно', verifiedHeading: 'Футбольные вопросы с проверенными фактами',
    verifiedBody: 'Публичные викторины QuizBall состоят из проверенных вопросов о клубах, турнирах, футболистах и истории футбола.',
    methodologyLink: 'Как QuizBall проверяет каждый вопрос',
    rankedHeading: 'Проверь себя в рейтинговых матчах',
    rankedBody: 'Одиночные викторины — это разминка. Зарегистрируйся бесплатно, чтобы сыграть с живыми соперниками и подняться в рейтинге QuizBall.',
    groups: { team: 'Викторины по клубам и сборным', league: 'Викторины по лигам', quiz_type: 'Футбольные испытания', article: 'Футбольные факты' },
  },
  pt: {
    ranked: 'Jogar no ranqueado', eyebrow: 'Quiz de futebol grátis',
    // docs/SEO-GAME-NAMING-PT-2026-10-21.md §4: the H1 of the "football quiz" landing.
    title: 'Quiz de futebol: perguntas e respostas online',
    intro: 'Escolha um quiz, responda perguntas de futebol verificadas e veja seu resultado na hora. Todos os quizzes individuais são grátis e não precisam de conta.',
    popularHeading: 'Quizzes de futebol mais populares',
    popularBody: 'Comece pelos favoritos: adivinhe o jogador pela carreira e pelas dicas, acerte o time pelo escudo e mostre o quanto você sabe sobre o Real Madrid.',
    playFree: 'Jogar grátis', verifiedHeading: 'Perguntas de futebol com fatos verificados',
    verifiedBody: 'Os quizzes públicos do QuizBall usam perguntas verificadas sobre times, campeonatos, jogadores e a história do futebol.',
    methodologyLink: 'Como o QuizBall confere cada pergunta',
    rankedHeading: 'Leve seu resultado para os duelos ranqueados',
    rankedBody: 'Os quizzes individuais são o aquecimento. Crie sua conta grátis para enfrentar torcedores de verdade e subir no ranking do QuizBall.',
    groups: { team: 'Quizzes de times e seleções', league: 'Quizzes de campeonatos', quiz_type: 'Desafios de futebol', article: 'Curiosidades do futebol' },
  },
  de: {
    ranked: 'Ranked spielen', eyebrow: 'Kostenloses Fußballquiz',
    // docs/SEO-GAME-NAMING-DE-2026-10-23.md §4: the H1 of the "football quiz" landing.
    title: 'Fußball-Quiz: Fragen und Antworten online',
    intro: 'Wähle ein Quiz, beantworte geprüfte Fragen zum Fußball und sieh sofort dein Ergebnis. Jedes Einzelquiz ist kostenlos und du brauchst kein Konto.',
    popularHeading: 'Beliebte Fußballquizze in Deutschland',
    popularBody: 'Teste dein Wissen zu Vereinswappen und Spielerkarrieren oder errate Spieler – Quizthemen für Fußballfans in Deutschland.',
    playFree: 'Kostenlos spielen', verifiedHeading: 'Geprüfte Fragen rund um Fußball',
    verifiedBody: 'Die öffentlichen Quizze von QuizBall enthalten geprüfte Fragen zu Vereinen, Wettbewerben, Spielern und zur Geschichte des Fußballs.',
    methodologyLink: 'So prüft QuizBall jede Frage',
    rankedHeading: 'Spiel Ranked-Duelle',
    rankedBody: 'Einzelquizze sind dein Warm-up. Registriere dich kostenlos, tritt gegen echte Fans an und steige in der QuizBall-Rangliste auf.',
    groups: { team: 'Vereinsquizze', league: 'Ligaquizze', quiz_type: 'Fußball-Challenges', article: 'Fußballwissen' },
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
  // The Portuguese hub is offered once at least one quiz has a pt edition.
  const hasPortuguese = (locale === 'pt' ? pages : await loadHubPages('pt')).length > 0;
  // The German hub is offered once at least one quiz has a de edition.
  const hasGerman = (locale === 'de' ? pages : await loadHubPages('de')).length > 0;
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
  const headerList = await headers();
  const nonce = headerList.get('x-nonce') ?? undefined;
  const hubUrl = `${SITE_URL}${campaignHubPath(locale)}`;
  const jsonLd = buildCampaignQuizHubJsonLd({
    locale,
    url: hubUrl,
    title: copy.title,
    description: copy.intro,
    pages,
  });

  return (
    <div className="relative min-h-screen bg-surface-page-alt font-poppins text-white">
      <script nonce={nonce} type="application/ld+json" suppressHydrationWarning dangerouslySetInnerHTML={{ __html: serializeCampaignHubJsonLd(jsonLd) }} />
      <CampaignQuizHubPageView locale={locale} />
      <AppShellPageChrome />
      <header className="relative z-10 bg-surface-page-alt/80 backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:h-20 lg:px-8">
          <Link href={`/${locale}`} aria-label="QuizBall"><Image src="/assets/brand/quizball-logo.webp" alt="QuizBall" width={218} height={64} className="h-10 w-auto object-contain sm:h-12" /></Link>
          <div className="flex items-center gap-3">
            <LanguageSwitcher locale={locale} locales={hasPortuguese ? (hasGerman ? ['en', 'es', 'ru', 'pt', 'de'] : ['en', 'es', 'ru', 'pt']) : (hasGerman ? ['en', 'es', 'ru', 'de'] : ['en', 'es', 'ru'])} className="hidden sm:inline-flex" />
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
