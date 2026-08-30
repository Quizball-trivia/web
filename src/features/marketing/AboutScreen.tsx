import Link from "next/link";
import { ArrowRight, BarChart3, BookCheck, ChevronLeft, Info, Newspaper, ShieldCheck } from "lucide-react";
import { AppLogo } from "@/components/AppLogo";
import { LanguageSwitcher } from "@/components/i18n/LanguageSwitcher";
import { campaignHubPath, campaignQuizPath } from "@/features/campaign-quiz/campaignQuiz.routes";
import type { AboutCopy } from "@/lib/i18n/copy";
import type { Locale } from "@/lib/i18n/locale";
import { ABOUT_CREDIBILITY_COPY } from "@/lib/seo/editorial-methodology";

interface AboutScreenProps {
  copy: AboutCopy;
  locale: Locale;
}

const BACK_LABEL: Record<Locale, string> = {
  en: "Back to QuizBall",
  ka: "QuizBall-ზე დაბრუნება",
  es: "Volver a QuizBall",
};

export function AboutScreen({ copy, locale }: AboutScreenProps) {
  const credibility = ABOUT_CREDIBILITY_COPY[locale];
  const quizLocale = locale === "ka" ? "en" : locale;
  const reportLocale = locale === "es" ? "es" : "en";

  return (
    <div className="relative min-h-screen w-full bg-surface-page-alt bg-[url('/assets/bg-pattern.webp')] bg-cover bg-center bg-no-repeat font-poppins text-white">
      <header className="sticky top-0 z-50 flex h-16 items-center justify-between bg-surface-page-alt/85 px-5 backdrop-blur-md md:h-20 md:px-12 lg:px-20">
        <Link
          href={`/${locale}`}
          className="inline-flex min-h-10 items-center gap-2 rounded-full bg-white/10 px-4 text-sm font-semibold text-white transition-colors hover:bg-white/20"
        >
          <ChevronLeft className="size-4" aria-hidden />
          {BACK_LABEL[locale]}
        </Link>
        <Link href={`/${locale}`} aria-label="QuizBall home">
          <AppLogo size="md" />
        </Link>
        <LanguageSwitcher locale={locale} />
      </header>

      <main className="mx-auto max-w-5xl px-5 py-10 md:px-8 md:py-16">
        <section className="rounded-[28px] border border-white/10 bg-surface-card/50 p-6 backdrop-blur-sm md:p-10">
          <div className="flex items-center gap-3">
            <div className="flex size-10 items-center justify-center rounded-xl bg-brand-cyan/15 text-brand-cyan">
              <Info className="size-5" aria-hidden />
            </div>
            <h1 className="text-2xl font-semibold tracking-tight text-white md:text-4xl">
              {copy.title}
            </h1>
          </div>
          <p className="mt-3 text-sm font-medium text-white/55">{copy.subtitle}</p>

          <div className="my-6 h-px w-full bg-white/10" />

          <div className="max-w-3xl space-y-6">
            {copy.paragraphs.map((paragraph) => (
              <p key={paragraph} className="text-sm font-medium leading-7 text-white/70 md:text-[15px]">
                {paragraph}
              </p>
            ))}
          </div>
        </section>

        <section className="mt-8 grid gap-6 lg:grid-cols-2">
          <div className="rounded-2xl border border-brand-cyan/20 bg-brand-cyan/10 p-6 md:p-8">
            <ShieldCheck className="size-6 text-brand-cyan" aria-hidden />
            <p className="mt-5 text-xs font-semibold uppercase tracking-[0.16em] text-brand-cyan">
              {credibility.eyebrow}
            </p>
            <h2 className="mt-3 text-2xl font-semibold">{credibility.title}</h2>
            <p className="mt-4 text-sm font-medium leading-7 text-white/65">{credibility.body}</p>
            <Link
              href={`/${locale}/editorial-methodology`}
              className="mt-6 inline-flex min-h-10 items-center gap-2 font-semibold text-brand-cyan hover:underline"
            >
              <BookCheck className="size-4" aria-hidden />
              {credibility.methodologyLink}
            </Link>
            <Link
              href={`/${reportLocale}/football-knowledge-index`}
              className="mt-3 inline-flex min-h-10 items-center gap-2 font-semibold text-brand-cyan hover:underline"
            >
              <BarChart3 className="size-4" aria-hidden />
              {credibility.reportLink}
            </Link>
            <Link
              href={`/${reportLocale}/press`}
              className="mt-3 inline-flex min-h-10 items-center gap-2 font-semibold text-brand-cyan hover:underline"
            >
              <Newspaper className="size-4" aria-hidden />
              {credibility.pressLink}
            </Link>
          </div>

          <div className="rounded-2xl border border-white/10 bg-surface-card/40 p-6 md:p-8">
            <h2 className="text-2xl font-semibold">{credibility.exploreHeading}</h2>
            <p className="mt-4 text-sm font-medium leading-7 text-white/65">{credibility.exploreBody}</p>
            <nav className="mt-6 flex flex-col items-start gap-3" aria-label={credibility.exploreHeading}>
              {[
                [campaignQuizPath("career-path", quizLocale), credibility.careerPathLink],
                [campaignQuizPath("club-badges", quizLocale), credibility.clubBadgesLink],
                [campaignHubPath(quizLocale), credibility.hubLink],
              ].map(([href, label]) => (
                <Link key={href} href={href} className="inline-flex items-center gap-2 font-semibold text-brand-yellow hover:underline">
                  {label}
                  <ArrowRight className="size-4" aria-hidden />
                </Link>
              ))}
            </nav>
          </div>
        </section>
      </main>

      <footer className="py-8 text-center text-xs font-medium tracking-[0.18em] text-white/35">
        &copy; 2026 QuizBall
      </footer>
    </div>
  );
}
