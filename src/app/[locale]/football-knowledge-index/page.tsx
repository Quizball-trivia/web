import type { Metadata } from "next";
import { headers } from "next/headers";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowDownToLine, ArrowRight, BarChart3, ChevronLeft, Database } from "lucide-react";
import { AppLogo } from "@/components/AppLogo";
import { campaignHubPath } from "@/features/campaign-quiz/campaignQuiz.routes";
import {
  getKnowledgeIndexCopy,
  type KnowledgeIndexLocale,
} from "@/lib/seo/football-knowledge-index";
import {
  SITE_NAME,
  SITE_OG_IMAGE_ALT,
  SITE_OG_IMAGE_PATH,
  SITE_URL,
} from "@/lib/seo/site";
import {
  buildResearchReportStructuredData,
  serializeJsonLd,
} from "@/lib/seo/structured-data";

const SUPPORTED_LOCALES = new Set<KnowledgeIndexLocale>(["en", "es"]);

function isKnowledgeIndexLocale(value: string): value is KnowledgeIndexLocale {
  return SUPPORTED_LOCALES.has(value as KnowledgeIndexLocale);
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  if (!isKnowledgeIndexLocale(locale)) return {};

  const copy = getKnowledgeIndexCopy(locale);
  const canonical = `${SITE_URL}/${locale}/football-knowledge-index`;

  return {
    title: copy.metaTitle,
    description: copy.metaDescription,
    alternates: {
      canonical,
      languages: {
        en: `${SITE_URL}/en/football-knowledge-index`,
        es: `${SITE_URL}/es/football-knowledge-index`,
        "x-default": `${SITE_URL}/en/football-knowledge-index`,
      },
    },
    openGraph: {
      type: "article",
      siteName: SITE_NAME,
      title: copy.metaTitle,
      description: copy.metaDescription,
      url: canonical,
      locale: locale === "es" ? "es_ES" : "en_GB",
      alternateLocale: [locale === "es" ? "en_GB" : "es_ES"],
      publishedTime: "2026-08-30T00:00:00.000Z",
      modifiedTime: "2026-08-30T00:00:00.000Z",
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

const accuracy = [86.6, 67.8, 69.2];
const reach = [
  { position: 1, answers: 80, percent: 100 },
  { position: 5, answers: 55, percent: 68.8 },
  { position: 10, answers: 44, percent: 55 },
  { position: 15, answers: 31, percent: 38.8 },
];
const topics = [
  { starts: 19, completion: 36.8 },
  { starts: 17, completion: 29.4 },
  { starts: 16, completion: 50 },
];

function Bar({
  label,
  value,
  displayValue,
  color = "bg-brand-cyan",
}: {
  label: string;
  value: number;
  displayValue: string;
  color?: string;
}) {
  return (
    <div>
      <div className="mb-2 flex items-baseline justify-between gap-4 text-sm font-semibold">
        <span>{label}</span>
        <span className="tabular-nums text-white/70">{displayValue}</span>
      </div>
      <div className="h-3 overflow-hidden rounded-full bg-white/10">
        <div className={`h-full rounded-full ${color}`} style={{ width: `${value}%` }} />
      </div>
    </div>
  );
}

export default async function FootballKnowledgeIndexPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!isKnowledgeIndexLocale(locale)) notFound();

  const copy = getKnowledgeIndexCopy(locale);
  const alternateLocale = locale === "en" ? "es" : "en";
  const headerList = await headers();
  const nonce = headerList.get("x-nonce") ?? undefined;
  const structuredData = buildResearchReportStructuredData({
    locale,
    title: copy.title,
    description: copy.metaDescription,
  });

  return (
    <div className="relative min-h-screen w-full bg-surface-page-alt bg-[url('/assets/bg-pattern.webp')] bg-cover bg-center bg-fixed bg-no-repeat font-poppins text-white">
      <script
        nonce={nonce}
        type="application/ld+json"
        suppressHydrationWarning
        dangerouslySetInnerHTML={{ __html: serializeJsonLd(structuredData) }}
      />

      <header className="sticky top-0 z-50 flex min-h-16 items-center justify-between gap-3 bg-surface-page-alt/90 px-4 py-3 backdrop-blur-md md:px-12 lg:px-20">
        <Link
          href={`/${locale}/about`}
          className="inline-flex min-h-10 items-center gap-2 rounded-full bg-white/10 px-4 text-sm font-semibold transition-colors hover:bg-white/20"
        >
          <ChevronLeft className="size-4" aria-hidden />
          <span className="hidden sm:inline">{copy.backLabel}</span>
        </Link>
        <Link href={`/${locale}`} aria-label="QuizBall home">
          <AppLogo size="md" />
        </Link>
        <Link
          href={`/${alternateLocale}/football-knowledge-index`}
          hrefLang={alternateLocale}
          className="inline-flex min-h-10 items-center rounded-full bg-white/10 px-4 text-sm font-semibold transition-colors hover:bg-white/20"
        >
          {copy.switchLabel}
        </Link>
      </header>

      <main className="mx-auto max-w-6xl px-5 py-10 md:px-8 md:py-16">
        <article>
          <header className="overflow-hidden rounded-[32px] border border-white/10 bg-surface-card/55 p-6 backdrop-blur-sm md:p-12">
            <div className="flex size-12 items-center justify-center rounded-2xl bg-brand-cyan/15 text-brand-cyan">
              <BarChart3 className="size-7" aria-hidden />
            </div>
            <p className="mt-7 text-xs font-semibold uppercase tracking-[0.18em] text-brand-cyan">
              {copy.eyebrow}
            </p>
            <h1 className="mt-4 max-w-4xl text-balance text-4xl font-semibold tracking-tight md:text-6xl">
              {copy.title}
            </h1>
            <p className="mt-6 max-w-3xl text-base font-medium leading-8 text-white/70 md:text-lg">
              {copy.intro}
            </p>
            <div className="mt-7 flex flex-wrap gap-x-6 gap-y-2 text-xs font-semibold uppercase tracking-[0.12em] text-white/45">
              <span>{copy.published}</span>
              <span>{copy.period}</span>
            </div>
            <a
              href="/data/quizball-football-knowledge-index-2026.csv"
              download
              className="mt-8 inline-flex min-h-11 items-center gap-2 rounded-full bg-brand-yellow px-5 font-semibold text-black transition-transform hover:-translate-y-0.5"
            >
              <ArrowDownToLine className="size-4" aria-hidden />
              {copy.downloadLabel}
            </a>
          </header>

          <section className="mt-10" aria-labelledby="sample-heading">
            <h2 id="sample-heading" className="text-2xl font-semibold md:text-3xl">{copy.sampleHeading}</h2>
            <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {copy.stats.map((stat) => (
                <div key={stat.label} className="rounded-2xl border border-white/10 bg-surface-card/45 p-6">
                  <p className="text-4xl font-semibold text-brand-yellow">{stat.value}</p>
                  <p className="mt-2 text-sm font-medium text-white/60">{stat.label}</p>
                </div>
              ))}
            </div>
          </section>

          <section className="mt-14" aria-labelledby="findings-heading">
            <h2 id="findings-heading" className="text-2xl font-semibold md:text-3xl">{copy.findingsHeading}</h2>
            <p className="mt-3 max-w-3xl text-sm font-medium leading-7 text-white/60">{copy.findingsIntro}</p>
            <ol className="mt-7 grid gap-4 lg:grid-cols-2">
              {copy.findings.map((finding, index) => (
                <li key={finding.title} className="rounded-2xl border border-white/10 bg-surface-card/45 p-6">
                  <span className="flex size-8 items-center justify-center rounded-full bg-brand-cyan/15 text-sm font-semibold text-brand-cyan">
                    {index + 1}
                  </span>
                  <h3 className="mt-5 text-lg font-semibold leading-7">{finding.title}</h3>
                  <p className="mt-3 text-sm font-medium leading-7 text-white/60">{finding.body}</p>
                </li>
              ))}
            </ol>
          </section>

          <section className="mt-14 grid gap-6 lg:grid-cols-2" aria-label="Football knowledge charts">
            <figure className="rounded-2xl border border-white/10 bg-surface-card/45 p-6 md:p-8">
              <figcaption>
                <h2 className="text-xl font-semibold">{copy.accuracyHeading}</h2>
                <p className="mt-2 text-sm font-medium leading-6 text-white/55">{copy.accuracyDescription}</p>
              </figcaption>
              <div className="mt-7 space-y-5" role="img" aria-label={copy.accuracyHeading}>
                {accuracy.map((value, index) => (
                  <Bar
                    key={copy.accuracyLabels[index]}
                    label={copy.accuracyLabels[index]}
                    value={value}
                    displayValue={`${value.toLocaleString(locale, { maximumFractionDigits: 1 })}%`}
                    color={index === 0 ? "bg-brand-green" : index === 1 ? "bg-brand-yellow" : "bg-brand-cyan"}
                  />
                ))}
              </div>
            </figure>

            <figure className="rounded-2xl border border-white/10 bg-surface-card/45 p-6 md:p-8">
              <figcaption>
                <h2 className="text-xl font-semibold">{copy.reachHeading}</h2>
                <p className="mt-2 text-sm font-medium leading-6 text-white/55">{copy.reachDescription}</p>
              </figcaption>
              <div className="mt-7 space-y-5" role="img" aria-label={copy.reachHeading}>
                {reach.map((point) => (
                  <Bar
                    key={point.position}
                    label={`${copy.questionLabel} ${point.position}`}
                    value={point.percent}
                    displayValue={`${point.answers}`}
                    color="bg-brand-cyan"
                  />
                ))}
              </div>
            </figure>

            <figure className="rounded-2xl border border-white/10 bg-surface-card/45 p-6 md:p-8 lg:col-span-2">
              <figcaption>
                <h2 className="text-xl font-semibold">{copy.topicHeading}</h2>
                <p className="mt-2 text-sm font-medium leading-6 text-white/55">{copy.topicDescription}</p>
              </figcaption>
              <div className="mt-7 grid gap-6 md:grid-cols-3" role="img" aria-label={copy.topicHeading}>
                {topics.map((topic, index) => (
                  <div key={copy.topicLabels[index]} className="rounded-xl bg-white/[0.04] p-5">
                    <h3 className="font-semibold">{copy.topicLabels[index]}</h3>
                    <p className="mt-4 text-3xl font-semibold text-brand-yellow">
                      {topic.starts} <span className="text-sm text-white/50">{copy.startsLabel}</span>
                    </p>
                    <div className="mt-4 h-2 overflow-hidden rounded-full bg-white/10">
                      <div className="h-full rounded-full bg-brand-green" style={{ width: `${topic.completion}%` }} />
                    </div>
                    <p className="mt-2 text-xs font-semibold text-white/55">
                      {topic.completion.toLocaleString(locale, { maximumFractionDigits: 1 })}% {copy.completionLabel}
                    </p>
                  </div>
                ))}
              </div>
            </figure>
          </section>

          <section className="mt-14 grid gap-6 lg:grid-cols-2">
            <div className="rounded-2xl border border-brand-cyan/20 bg-brand-cyan/10 p-6 md:p-8">
              <Database className="size-6 text-brand-cyan" aria-hidden />
              <h2 className="mt-5 text-2xl font-semibold">{copy.methodologyHeading}</h2>
              <div className="mt-4 space-y-4">
                {copy.methodologyParagraphs.map((paragraph) => (
                  <p key={paragraph} className="text-sm font-medium leading-7 text-white/65">{paragraph}</p>
                ))}
              </div>
            </div>

            <div className="rounded-2xl border border-white/10 bg-surface-card/45 p-6 md:p-8">
              <h2 className="text-2xl font-semibold">{copy.limitationsHeading}</h2>
              <ul className="mt-5 space-y-4 text-sm font-medium leading-7 text-white/65">
                {copy.limitations.map((limitation) => (
                  <li key={limitation} className="flex gap-3">
                    <span className="mt-2 size-1.5 shrink-0 rounded-full bg-brand-yellow" aria-hidden />
                    <span>{limitation}</span>
                  </li>
                ))}
              </ul>
            </div>
          </section>

          <section className="mt-10 rounded-[28px] border border-white/10 bg-surface-card/55 p-6 md:p-10">
            <h2 className="text-2xl font-semibold">{copy.nextHeading}</h2>
            <p className="mt-4 max-w-3xl text-sm font-medium leading-7 text-white/65">{copy.nextBody}</p>
            <nav className="mt-6 flex flex-col items-start gap-3 sm:flex-row sm:gap-6" aria-label={copy.nextHeading}>
              <Link href={`/${locale}/editorial-methodology`} className="inline-flex items-center gap-2 font-semibold text-brand-cyan hover:underline">
                {copy.methodologyLink}
                <ArrowRight className="size-4" aria-hidden />
              </Link>
              <Link href={campaignHubPath(locale)} className="inline-flex items-center gap-2 font-semibold text-brand-yellow hover:underline">
                {copy.quizLink}
                <ArrowRight className="size-4" aria-hidden />
              </Link>
            </nav>
          </section>
        </article>
      </main>

      <footer className="py-8 text-center text-xs font-medium tracking-[0.18em] text-white/35">
        &copy; 2026 QuizBall
      </footer>
    </div>
  );
}
