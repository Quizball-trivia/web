import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { AppLogo } from "@/components/AppLogo";
import { LanguageSwitcher } from "@/components/i18n/LanguageSwitcher";
import { campaignHubPath, campaignQuizPath } from "@/features/campaign-quiz/campaignQuiz.routes";
import { colors } from "@/lib/colors";
import type { AboutCopy } from "@/lib/i18n/copy";
import type { Locale } from "@/lib/i18n/locale";
import { ABOUT_GAME_MODES_COPY } from "@/lib/seo/about-game-modes";
import { ABOUT_CREDIBILITY_COPY } from "@/lib/seo/editorial-methodology";

interface AboutScreenProps {
  copy: AboutCopy;
  locale: Locale;
}

const BACK_LABEL: Record<Locale, string> = {
  en: "Back",
  ka: "უკან",
  es: "Volver",
};

const MODE_COLORS = [
  colors.blue.brand,
  colors.green.base,
  colors.yellow.base,
  colors.blue.base,
] as const;

export function AboutScreen({ copy, locale }: AboutScreenProps) {
  const credibility = ABOUT_CREDIBILITY_COPY[locale];
  const gameModes = ABOUT_GAME_MODES_COPY[locale];
  const quizLocale = locale === "ka" ? "en" : locale;
  const reportLocale = locale === "es" ? "es" : "en";

  return (
    <div className="min-h-screen w-full bg-surface-page-alt font-poppins text-white">
      <header className="sticky top-0 z-50 flex h-14 items-center justify-between border-b border-white/[0.06] bg-surface-page-alt/95 px-4 backdrop-blur-md md:h-16 md:px-8">
        <Link
          href={`/${locale}`}
          aria-label={BACK_LABEL[locale]}
          title={BACK_LABEL[locale]}
          className="flex size-9 items-center justify-center rounded-full text-white"
          style={{ backgroundColor: colors.blue.brand }}
        >
          <ChevronLeft className="size-5" aria-hidden />
        </Link>
        <Link href={`/${locale}`} aria-label="QuizBall home">
          <AppLogo size="sm" />
        </Link>
        <LanguageSwitcher locale={locale} />
      </header>

      <main className="mx-auto max-w-4xl px-5 py-10 md:px-8 md:py-16">
        <article>
          <header className="border-b border-white/10 pb-10 md:pb-14">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-brand-yellow">
              {gameModes.overviewEyebrow}
            </p>
            <h1 className="mt-4 text-4xl font-semibold leading-tight tracking-[-0.03em] text-white md:text-5xl">
              {copy.title}
            </h1>
            <p className="mt-4 max-w-2xl text-base font-semibold leading-7 text-white/65 md:text-lg">
              {copy.subtitle}
            </p>

            <div className="mt-8 border-l-4 pl-5" style={{ borderColor: colors.green.base }}>
              <h2 className="text-xl font-semibold text-white md:text-2xl">{gameModes.overviewTitle}</h2>
              <div className="mt-3 space-y-3">
                {copy.paragraphs.map((paragraph) => (
                  <p key={paragraph} className="text-sm font-medium leading-7 text-white/60">
                    {paragraph}
                  </p>
                ))}
              </div>
            </div>
          </header>

          <section className="border-b border-white/10 py-10 md:py-14" aria-labelledby="quizball-game-modes">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-brand-yellow">
              {gameModes.modesEyebrow}
            </p>
            <h2 id="quizball-game-modes" className="mt-3 text-2xl font-semibold text-white md:text-3xl">
              {gameModes.modesTitle}
            </h2>
            <p className="mt-4 max-w-3xl text-sm font-medium leading-7 text-white/60">
              {gameModes.modesIntro}
            </p>

            <div className="mt-8 divide-y divide-white/10 border-y border-white/10">
              {gameModes.modes.map((mode, index) => (
                <section key={mode.id} className="grid gap-3 py-6 md:grid-cols-[8rem_1fr] md:gap-8">
                  <p className="text-sm font-semibold" style={{ color: MODE_COLORS[index] }}>
                    0{index + 1}
                  </p>
                  <div>
                    <h3 className="text-lg font-semibold text-white">{mode.title}</h3>
                    <p className="mt-2 text-sm font-medium leading-7 text-white/55">{mode.body}</p>
                  </div>
                </section>
              ))}
            </div>
          </section>

          <section className="border-b border-white/10 py-10 md:py-14" aria-labelledby="ranked-one-v-one">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-brand-yellow">
              {gameModes.rankedEyebrow}
            </p>
            <h2 id="ranked-one-v-one" className="mt-3 text-2xl font-semibold text-white md:text-3xl">
              {gameModes.rankedTitle}
            </h2>
            <p className="mt-4 max-w-3xl text-sm font-medium leading-7 text-white/60">
              {gameModes.rankedIntro}
            </p>

            <ol className="mt-8 divide-y divide-white/10 border-y border-white/10">
              {gameModes.rankedSteps.map((step, index) => (
                <li key={step.title} className="grid gap-3 py-6 md:grid-cols-[8rem_1fr] md:gap-8">
                  <p className="text-sm font-semibold" style={{ color: MODE_COLORS[index] }}>
                    0{index + 1}
                  </p>
                  <div>
                    <h3 className="text-lg font-semibold text-white">{step.title}</h3>
                    <p className="mt-2 text-sm font-medium leading-7 text-white/55">{step.body}</p>
                  </div>
                </li>
              ))}
            </ol>

            <p className="mt-5 text-xs font-semibold uppercase tracking-[0.12em] text-brand-green-light">
              {gameModes.rankedMeta}
            </p>
          </section>

          <section className="grid gap-10 py-10 md:py-14 lg:grid-cols-2 lg:gap-14">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-brand-yellow">
                {credibility.eyebrow}
              </p>
              <h2 className="mt-3 text-2xl font-semibold leading-tight text-white">{credibility.title}</h2>
              <p className="mt-4 text-sm font-medium leading-7 text-white/60">{credibility.body}</p>
              <nav className="mt-6 flex flex-col items-start gap-3" aria-label={credibility.eyebrow}>
                <Link href={`/${locale}/editorial-methodology`} className="font-semibold text-brand-cyan hover:text-white">
                  {credibility.methodologyLink} →
                </Link>
                <Link href={`/${reportLocale}/football-knowledge-index`} className="font-semibold text-brand-green-light hover:text-white">
                  {credibility.reportLink} →
                </Link>
                <Link href={`/${reportLocale}/press`} className="font-semibold text-brand-yellow hover:text-white">
                  {credibility.pressLink} →
                </Link>
              </nav>
            </div>

            <div className="border-l-4 pl-5" style={{ borderColor: colors.blue.brand }}>
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-brand-yellow">
                {credibility.exploreHeading}
              </p>
              <p className="mt-4 text-sm font-medium leading-7 text-white/60">{credibility.exploreBody}</p>
              <nav className="mt-6 flex flex-col items-start gap-3" aria-label={credibility.exploreHeading}>
                {[
                  [campaignQuizPath("career-path", quizLocale), credibility.careerPathLink],
                  [campaignQuizPath("club-badges", quizLocale), credibility.clubBadgesLink],
                  [campaignHubPath(quizLocale), credibility.hubLink],
                ].map(([href, label]) => (
                  <Link key={href} href={href} className="font-semibold text-white hover:text-brand-yellow">
                    {label} →
                  </Link>
                ))}
              </nav>
            </div>
          </section>
        </article>
      </main>

      <footer className="border-t border-white/[0.06] py-7 text-center text-xs font-medium tracking-[0.18em] text-white/35">
        &copy; 2026 QuizBall
      </footer>
    </div>
  );
}
