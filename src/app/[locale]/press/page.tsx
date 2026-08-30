import type { Metadata } from "next";
import { headers } from "next/headers";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowDownToLine, ArrowRight, CheckCircle2, ChevronLeft, Mail, Newspaper } from "lucide-react";
import { AppLogo } from "@/components/AppLogo";
import { campaignHubPath } from "@/features/campaign-quiz/campaignQuiz.routes";
import type { KnowledgeIndexLocale } from "@/lib/seo/football-knowledge-index";
import { getPressResourcesCopy } from "@/lib/seo/press-resources";
import {
  SITE_NAME,
  SITE_OG_IMAGE_ALT,
  SITE_OG_IMAGE_PATH,
  SITE_URL,
} from "@/lib/seo/site";
import { buildEditorialPageStructuredData, serializeJsonLd } from "@/lib/seo/structured-data";

function isPressLocale(value: string): value is KnowledgeIndexLocale {
  return value === "en" || value === "es";
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  if (!isPressLocale(locale)) return {};
  const copy = getPressResourcesCopy(locale);
  const canonical = `${SITE_URL}/${locale}/press`;

  return {
    title: copy.metaTitle,
    description: copy.metaDescription,
    alternates: {
      canonical,
      languages: {
        en: `${SITE_URL}/en/press`,
        es: `${SITE_URL}/es/press`,
        "x-default": `${SITE_URL}/en/press`,
      },
    },
    openGraph: {
      type: "website",
      siteName: SITE_NAME,
      title: copy.metaTitle,
      description: copy.metaDescription,
      url: canonical,
      locale: locale === "es" ? "es_ES" : "en_GB",
      alternateLocale: [locale === "es" ? "en_GB" : "es_ES"],
      images: [{
        url: SITE_OG_IMAGE_PATH,
        width: 1200,
        height: 630,
        alt: SITE_OG_IMAGE_ALT,
      }],
    },
    twitter: {
      card: "summary_large_image",
      title: copy.metaTitle,
      description: copy.metaDescription,
      images: [SITE_OG_IMAGE_PATH],
    },
  };
}

export default async function PressResourcesPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!isPressLocale(locale)) notFound();

  const copy = getPressResourcesCopy(locale);
  const alternateLocale = locale === "en" ? "es" : "en";
  const headerList = await headers();
  const nonce = headerList.get("x-nonce") ?? undefined;
  const structuredData = buildEditorialPageStructuredData({
    locale,
    path: "/press",
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

      <header className="sticky top-0 z-50 flex min-h-16 items-center justify-between gap-3 bg-surface-page-alt/90 px-4 py-3 backdrop-blur-md md:px-12 lg:px-20">
        <Link href={`/${locale}/about`} className="inline-flex min-h-10 items-center gap-2 rounded-full bg-white/10 px-4 text-sm font-semibold hover:bg-white/20">
          <ChevronLeft className="size-4" aria-hidden />
          <span className="hidden sm:inline">{copy.backLabel}</span>
        </Link>
        <Link href={`/${locale}`} aria-label="QuizBall home"><AppLogo size="md" /></Link>
        <Link href={`/${alternateLocale}/press`} hrefLang={alternateLocale} className="inline-flex min-h-10 items-center rounded-full bg-white/10 px-4 text-sm font-semibold hover:bg-white/20">
          {copy.switchLabel}
        </Link>
      </header>

      <main className="mx-auto max-w-5xl px-5 py-10 md:px-8 md:py-16">
        <section className="rounded-[28px] border border-white/10 bg-surface-card/55 p-6 backdrop-blur-sm md:p-10">
          <div className="flex size-11 items-center justify-center rounded-xl bg-brand-cyan/15 text-brand-cyan">
            <Newspaper className="size-6" aria-hidden />
          </div>
          <p className="mt-6 text-xs font-semibold uppercase tracking-[0.18em] text-brand-cyan">{copy.eyebrow}</p>
          <h1 className="mt-3 max-w-3xl text-balance text-3xl font-semibold tracking-tight md:text-5xl">{copy.title}</h1>
          <p className="mt-5 max-w-3xl text-sm font-medium leading-7 text-white/70 md:text-base">{copy.intro}</p>
          <p className="mt-5 text-xs font-semibold uppercase tracking-[0.12em] text-white/40">{copy.updated}</p>
        </section>

        <section className="mt-8 rounded-2xl border border-white/10 bg-surface-card/45 p-6 md:p-8">
          <h2 className="text-2xl font-semibold">{copy.factsHeading}</h2>
          <ul className="mt-6 grid gap-4 md:grid-cols-2">
            {copy.facts.map((fact) => (
              <li key={fact} className="flex gap-3 rounded-xl bg-white/[0.04] p-4 text-sm font-medium leading-7 text-white/70">
                <CheckCircle2 className="mt-1 size-5 shrink-0 text-brand-green" aria-hidden />
                <span>{fact}</span>
              </li>
            ))}
          </ul>
        </section>

        <section className="mt-8 rounded-2xl border border-brand-cyan/20 bg-brand-cyan/10 p-6 md:p-8">
          <h2 className="text-2xl font-semibold">{copy.descriptionsHeading}</h2>
          {[
            [copy.shortLabel, copy.shortDescription],
            [copy.longLabel, copy.longDescription],
          ].map(([label, description]) => (
            <div key={label} className="mt-6">
              <h3 className="text-xs font-semibold uppercase tracking-[0.15em] text-brand-cyan">{label}</h3>
              <p className="mt-2 rounded-xl bg-surface-page-alt/45 p-5 text-sm font-medium leading-7 text-white/75">{description}</p>
            </div>
          ))}
        </section>

        <section className="mt-8 grid gap-6 lg:grid-cols-2">
          <div className="rounded-2xl border border-white/10 bg-surface-card/45 p-6 md:p-8">
            <h2 className="text-2xl font-semibold">{copy.assetsHeading}</h2>
            <p className="mt-3 text-sm font-medium leading-7 text-white/60">{copy.assetsIntro}</p>
            <div className="mt-6 flex flex-col items-start gap-4">
              <a href="/assets/brand/quizball-icon-512.png" download className="inline-flex items-center gap-2 font-semibold text-brand-yellow hover:underline">
                <ArrowDownToLine className="size-4" aria-hidden />{copy.iconLabel}
              </a>
              <a href="/assets/brand/quizball-og-1200x630.png" download className="inline-flex items-center gap-2 font-semibold text-brand-yellow hover:underline">
                <ArrowDownToLine className="size-4" aria-hidden />{copy.previewLabel}
              </a>
            </div>
          </div>

          <div className="rounded-2xl border border-white/10 bg-surface-card/45 p-6 md:p-8">
            <h2 className="text-2xl font-semibold">{copy.evidenceHeading}</h2>
            <p className="mt-3 text-sm font-medium leading-7 text-white/60">{copy.evidenceIntro}</p>
            <nav className="mt-6 flex flex-col items-start gap-3" aria-label={copy.evidenceHeading}>
              {[
                [`/${locale}/football-knowledge-index`, copy.reportLink],
                [`/${locale}/editorial-methodology`, copy.methodologyLink],
                [`/${locale}/about`, copy.aboutLink],
                [campaignHubPath(locale), copy.quizzesLink],
              ].map(([href, label]) => (
                <Link key={href} href={href} className="inline-flex items-center gap-2 font-semibold text-brand-cyan hover:underline">
                  {label}<ArrowRight className="size-4" aria-hidden />
                </Link>
              ))}
            </nav>
          </div>
        </section>

        <section className="mt-8 rounded-2xl border border-white/10 bg-surface-card/55 p-6 md:p-8">
          <Mail className="size-6 text-brand-cyan" aria-hidden />
          <h2 className="mt-4 text-2xl font-semibold">{copy.contactHeading}</h2>
          <p className="mt-3 max-w-3xl text-sm font-medium leading-7 text-white/65">{copy.contactBody}</p>
          <a href="mailto:support@quizball.io?subject=QuizBall%20verification%20request" className="mt-5 inline-flex min-h-10 items-center font-semibold text-brand-yellow hover:underline">support@quizball.io</a>
          <p className="mt-6 border-t border-white/10 pt-5 text-xs font-medium leading-6 text-white/45">{copy.legalNote}</p>
        </section>
      </main>

      <footer className="py-8 text-center text-xs font-medium tracking-[0.18em] text-white/35">&copy; 2026 QuizBall</footer>
    </div>
  );
}
