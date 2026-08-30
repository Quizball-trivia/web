import type { Metadata } from "next";
import { headers } from "next/headers";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowRight, BookCheck, ChevronLeft, Mail, ShieldCheck } from "lucide-react";
import { AppLogo } from "@/components/AppLogo";
import { LanguageSwitcher } from "@/components/i18n/LanguageSwitcher";
import { campaignHubPath, campaignQuizPath } from "@/features/campaign-quiz/campaignQuiz.routes";
import { isLocale } from "@/lib/i18n/locale";
import { buildLocalizedMetadata } from "@/lib/i18n/metadata";
import { getEditorialMethodologyCopy } from "@/lib/seo/editorial-methodology";
import {
  buildEditorialPageStructuredData,
  serializeJsonLd,
} from "@/lib/seo/structured-data";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  if (!isLocale(locale)) return {};
  const copy = getEditorialMethodologyCopy(locale);

  return buildLocalizedMetadata({
    locale,
    path: "/editorial-methodology",
    title: copy.metaTitle,
    description: copy.metaDescription,
  });
}

export default async function EditorialMethodologyPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();

  const copy = getEditorialMethodologyCopy(locale);
  const quizLocale = locale === "ka" ? "en" : locale;
  const headerList = await headers();
  const nonce = headerList.get("x-nonce") ?? undefined;
  const structuredData = buildEditorialPageStructuredData({
    locale,
    path: "/editorial-methodology",
    title: copy.metaTitle,
    description: copy.metaDescription,
    pageType: "WebPage",
  });

  return (
    <div className="relative min-h-screen w-full bg-surface-page-alt bg-[url('/assets/bg-pattern.webp')] bg-cover bg-center bg-no-repeat font-poppins text-white">
      <script
        nonce={nonce}
        type="application/ld+json"
        suppressHydrationWarning
        dangerouslySetInnerHTML={{ __html: serializeJsonLd(structuredData) }}
      />

      <header className="sticky top-0 z-50 flex h-16 items-center justify-between bg-surface-page-alt/85 px-5 backdrop-blur-md md:h-20 md:px-12 lg:px-20">
        <Link
          href={`/${locale}/about`}
          className="inline-flex min-h-10 items-center gap-2 rounded-full bg-white/10 px-4 text-sm font-semibold text-white transition-colors hover:bg-white/20"
        >
          <ChevronLeft className="size-4" aria-hidden />
          {copy.backLabel}
        </Link>
        <Link href={`/${locale}`} aria-label="QuizBall home">
          <AppLogo size="md" />
        </Link>
        <LanguageSwitcher locale={locale} />
      </header>

      <main className="mx-auto max-w-5xl px-5 py-10 md:px-8 md:py-16">
        <section className="rounded-[28px] border border-white/10 bg-surface-card/50 p-6 backdrop-blur-sm md:p-10">
          <div className="flex size-11 items-center justify-center rounded-xl bg-brand-cyan/15 text-brand-cyan">
            <BookCheck className="size-6" aria-hidden />
          </div>
          <p className="mt-6 text-xs font-semibold uppercase tracking-[0.18em] text-brand-cyan">
            {copy.eyebrow}
          </p>
          <h1 className="mt-3 max-w-3xl text-balance text-3xl font-semibold tracking-tight md:text-5xl">
            {copy.title}
          </h1>
          <p className="mt-5 max-w-3xl text-sm font-medium leading-7 text-white/70 md:text-base">
            {copy.intro}
          </p>
          <p className="mt-5 text-xs font-semibold uppercase tracking-[0.12em] text-white/40">
            {copy.updated}
          </p>
        </section>

        <section className="mt-8 grid gap-4 md:grid-cols-2" aria-label={copy.eyebrow}>
          {copy.sections.map((section) => (
            <article key={section.title} className="rounded-2xl border border-white/10 bg-surface-card/40 p-6">
              <h2 className="text-lg font-semibold text-white">{section.title}</h2>
              <p className="mt-3 text-sm font-medium leading-7 text-white/65">{section.body}</p>
            </article>
          ))}
        </section>

        <section className="mt-8 grid gap-6 lg:grid-cols-2">
          <div className="rounded-2xl border border-brand-cyan/20 bg-brand-cyan/10 p-6">
            <ShieldCheck className="size-6 text-brand-cyan" aria-hidden />
            <h2 className="mt-4 text-xl font-semibold">{copy.correctionHeading}</h2>
            <p className="mt-3 text-sm font-medium leading-7 text-white/65">{copy.correctionBody}</p>
            <a
              href="mailto:support@quizball.io?subject=QuizBall%20question%20correction"
              className="mt-5 inline-flex min-h-10 items-center gap-2 font-semibold text-brand-cyan hover:underline"
            >
              <Mail className="size-4" aria-hidden />
              {copy.correctionLink}
            </a>
          </div>

          <div className="rounded-2xl border border-white/10 bg-surface-card/40 p-6">
            <h2 className="text-xl font-semibold">{copy.exploreHeading}</h2>
            <p className="mt-3 text-sm font-medium leading-7 text-white/65">{copy.exploreBody}</p>
            <nav className="mt-5 flex flex-col items-start gap-3" aria-label={copy.exploreHeading}>
              {[
                [campaignQuizPath("career-path", quizLocale), copy.careerPathLink],
                [campaignQuizPath("club-badges", quizLocale), copy.clubBadgesLink],
                [campaignHubPath(quizLocale), copy.hubLink],
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
