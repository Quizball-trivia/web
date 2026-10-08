import type { Metadata } from 'next';
import Image from 'next/image';
import Link from 'next/link';
import { headers } from 'next/headers';
import { notFound } from 'next/navigation';
import { ArrowLeft, ArrowUpRight, ChevronDown, Smartphone } from 'lucide-react';
import { LOCALES, isLocale } from '@/lib/i18n/locale';
import { LOCALES as LANGUAGE_OPTIONS } from '@/lib/i18n/messages';
import { buildLocalizedMetadata } from '@/lib/i18n/metadata';
import { DOWNLOAD_COPY, GOOGLE_PLAY_URL, buildDownloadStructuredData, downloadPath } from '@/lib/seo/app-download';
import { serializeJsonLd } from '@/lib/seo/structured-data';

type Params = Promise<{ locale: string }>;

export function generateStaticParams() {
  return LOCALES.map((locale) => ({ locale }));
}

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const copy = DOWNLOAD_COPY[locale];
  return buildLocalizedMetadata({ locale, path: '/download', title: copy.metaTitle, description: copy.description });
}

export default async function DownloadPage({ params }: { params: Params }) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const copy = DOWNLOAD_COPY[locale];
  const nonce = (await headers()).get('x-nonce') ?? undefined;

  return (
    <div className="min-h-screen bg-surface-page-alt font-poppins text-white">
      <script nonce={nonce} type="application/ld+json" suppressHydrationWarning dangerouslySetInnerHTML={{ __html: serializeJsonLd(buildDownloadStructuredData(locale)) }} />
      <header className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-4 px-5 py-5 md:px-8">
        <Link href={`/${locale}`} aria-label={copy.homeLabel} className="flex min-h-11 items-center gap-3 rounded-md focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-brand-yellow">
          <ArrowLeft className="size-5" aria-hidden />
          <Image src="/assets/brand/quizball-logo.webp" alt="Quizball" width={218} height={64} className="h-10 w-auto" />
        </Link>
        <nav aria-label={copy.languagesLabel} className="flex flex-wrap gap-1">
          {LANGUAGE_OPTIONS.map((option) => (
            // A full navigation refreshes the server-derived <html lang>, which
            // Next's persistent root layout does not update on a client transition.
            <a key={option.code} href={downloadPath(option.code)} hrefLang={option.code} lang={option.code} aria-current={option.code === locale ? 'page' : undefined}
              className={`inline-flex min-h-11 items-center rounded-full px-3 text-xs font-semibold transition-colors focus-visible:outline-2 focus-visible:outline-brand-yellow ${option.code === locale ? 'bg-brand-yellow text-black' : 'text-white/75 hover:bg-white/10 hover:text-white'}`}>
              {option.nativeName}
            </a>
          ))}
        </nav>
      </header>

      <main className="mx-auto max-w-6xl px-4 pb-12 md:px-8 md:pb-16">
        <nav aria-label={copy.homeCta} className="mb-5 flex flex-wrap items-center gap-2 text-xs text-white/65">
          <Link href={`/${locale}`} className="underline underline-offset-4 hover:text-brand-yellow">{copy.homeLabel}</Link>
          <span aria-hidden>/</span><span aria-current="page">{copy.homeCta}</span>
        </nav>
        <section className="relative isolate grid gap-10 overflow-hidden rounded-[24px] bg-brand-blue px-6 py-10 md:px-10 md:py-12 lg:grid-cols-[minmax(0,1fr)_280px] lg:items-center lg:gap-12 xl:px-12">
          <div className="min-w-0">
          <p className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.12em] text-brand-yellow">
            <Smartphone className="size-4 shrink-0" aria-hidden /> {copy.eyebrow}
          </p>
          <h1 className="mt-6 max-w-3xl text-4xl font-black leading-[1.1] tracking-tight [overflow-wrap:anywhere] md:text-6xl">
            {copy.title}<br /><span className="text-brand-yellow">{copy.highlight}</span>
          </h1>
          <p className="mt-6 max-w-2xl text-sm leading-7 text-white/90 md:text-base">{copy.description}</p>
          <div className="mt-8 flex flex-col items-start gap-4 sm:flex-row sm:flex-wrap sm:items-center">
            <a href={GOOGLE_PLAY_URL} className="inline-flex min-h-14 max-w-full items-center justify-center gap-3 rounded-2xl bg-brand-yellow px-6 py-4 text-sm font-bold text-black transition-colors hover:bg-brand-yellow-deep focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-white">
              <span>{copy.storeCta}</span><ArrowUpRight className="size-5 shrink-0" aria-hidden />
            </a>
            <Link href={`/${locale}`} className="inline-flex min-h-11 items-center text-sm font-semibold underline underline-offset-4 hover:text-brand-yellow focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-white">{copy.browserCta}</Link>
          </div>
          <p className="mt-5 text-xs font-medium leading-5 text-white/80">{copy.free}</p>
          <p className="mt-2 max-w-2xl text-xs leading-5 text-white/75">{copy.officialNote}</p>
          </div>
          <figure className="mx-auto w-full max-w-[260px] lg:max-w-[280px]">
            <div className="relative rounded-[2.15rem] border-2 border-white/40 bg-surface-page-alt p-1.5 shadow-[0_24px_48px_rgba(0,0,0,0.4)]">
              <span aria-hidden className="absolute -right-1 top-24 h-9 w-1 rounded-r-sm bg-white/50" />
              <Image src={copy.rankedScreenshot} alt={copy.rankedAlt} width={1080} height={2424} sizes="(min-width: 1024px) 280px, 260px" priority className="h-auto w-full rounded-[1.65rem]" />
            </div>
            <figcaption className="mt-5 text-center text-xs font-semibold leading-5 text-white/85">{copy.rankedCaption}</figcaption>
          </figure>
        </section>

        <section className="pt-10 md:pt-14" aria-labelledby="download-features">
          <h2 id="download-features" className="text-xl font-bold md:text-2xl">{copy.featuresTitle}</h2>
          <div className="mt-6 grid gap-6 border-y border-white/15 py-6 md:grid-cols-3 md:gap-8">
            {copy.features.map((feature, index) => (
              <div key={feature.title}>
                <p className="text-xs font-bold text-brand-yellow" aria-hidden>0{index + 1}</p>
                <h3 className="mt-3 text-base font-bold">{feature.title}</h3>
                <p className="mt-2 text-sm leading-6 text-white/75">{feature.body}</p>
              </div>
            ))}
          </div>
          <p className="mt-6 max-w-3xl text-sm leading-6 text-white/70">{copy.accountNote}</p>
        </section>

        <section aria-labelledby="download-install" className="grid gap-8 pt-10 md:grid-cols-[minmax(0,1fr)_minmax(0,0.7fr)] md:pt-14">
          <div>
            <h2 id="download-install" className="text-xl font-bold md:text-2xl">{copy.installTitle}</h2>
            <ol className="mt-6 space-y-5">
              {copy.installSteps.map((step, index) => (
                <li key={step} className="flex items-start gap-4 text-sm leading-6 text-white/80">
                  <span aria-hidden className="flex size-8 shrink-0 items-center justify-center rounded-full bg-brand-yellow font-bold text-black">{index + 1}</span>
                  <span>{step}</span>
                </li>
              ))}
            </ol>
          </div>
          <div className="min-w-0 border-l-4 border-brand-yellow pl-5">
            <h2 className="text-lg font-bold">{copy.identityTitle}</h2>
            <dl className="mt-5 space-y-4 text-sm">
              <div><dt className="text-white/60">{copy.publisherLabel}</dt><dd className="mt-1 font-semibold">Quizball LLC</dd></div>
              <div><dt className="text-white/60">{copy.packageLabel}</dt><dd className="mt-1 font-mono [overflow-wrap:anywhere]">io.quizball.mobile</dd></div>
            </dl>
            <p className="mt-5 text-xs leading-5 text-white/70">{copy.officialNote}</p>
          </div>
        </section>

        <section aria-labelledby="download-questions" className="pt-10 md:pt-14">
          <h2 id="download-questions" className="text-xl font-bold md:text-2xl">{copy.questionsTitle}</h2>
          <div className="mt-5 divide-y divide-white/15 border-y border-white/15">
            {copy.questions.map((item) => (
              <details key={item.question} className="group py-5">
                <summary className="flex cursor-pointer list-none items-center justify-between gap-4 text-sm font-semibold [&::-webkit-details-marker]:hidden">
                  <span>{item.question}</span><ChevronDown aria-hidden className="size-5 shrink-0 transition-transform group-open:rotate-180" />
                </summary>
                <p className="mt-3 max-w-3xl text-sm leading-7 text-white/75">{item.answer}</p>
              </details>
            ))}
          </div>
        </section>
      </main>

      <footer className="mx-auto flex max-w-6xl flex-wrap justify-between gap-4 border-t border-white/10 px-5 py-6 text-xs text-white/70 md:px-8">
        <p>© 2026 Quizball</p>
        <nav className="flex flex-wrap gap-5">
          <Link href={`/${locale}/privacy`} className="hover:text-brand-yellow focus-visible:outline-2 focus-visible:outline-brand-yellow">{copy.privacy}</Link>
          <Link href={`/${locale}/terms`} className="hover:text-brand-yellow focus-visible:outline-2 focus-visible:outline-brand-yellow">{copy.terms}</Link>
        </nav>
      </footer>
    </div>
  );
}
