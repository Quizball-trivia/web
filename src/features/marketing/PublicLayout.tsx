import Link from "next/link";
import type { ReactNode } from "react";
import { AppLogo } from "@/components/AppLogo";
import { SiteFooter } from "@/components/layout/SiteFooter";
import { LanguageSwitcher } from "@/components/i18n/LanguageSwitcher";
import { campaignHubPath } from "@/features/campaign-quiz/campaignQuiz.routes";
import type { Locale } from "@/lib/i18n/locale";
import { HOME_COPY } from "@/lib/seo/home-copy";
import { HeaderPlayLink } from "./public/PublicLinks";

export const quizHubHref = (locale: Locale) => campaignHubPath(locale === "ka" ? "en" : locale);

/**
 * Public page chrome: brand header adapted for games navigation and the
 * production footer. No application sidebar, store, social or profile controls.
 */
export function PublicLayout({ locale, children }: { locale: Locale; children: ReactNode }) {
  const nav = HOME_COPY[locale].nav;
  return (
    <div className="min-h-screen w-full bg-surface-page-alt bg-[url('/assets/bg-pattern.webp')] bg-cover bg-center bg-no-repeat font-poppins text-white">
      <a href="#main" className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-[60] focus:rounded-full focus:bg-brand-yellow focus:px-4 focus:py-2 focus:text-black">
        {locale === "ka" ? "შინაარსზე გადასვლა" : locale === "es" ? "Ir al contenido" : "Skip to content"}
      </a>
      <header className="sticky top-0 z-50 border-b border-white/[0.06] bg-surface-page-alt/95 backdrop-blur-md">
        <div className="mx-auto flex h-14 w-full max-w-6xl items-center justify-between gap-3 px-4 md:h-16 md:px-8">
          <div className="flex items-center gap-4 md:gap-6">
            <Link href={`/${locale}`} aria-label="Quizball" className="flex items-center"><AppLogo /></Link>
            <nav aria-label={nav.games} className="hidden items-center gap-4 text-sm font-semibold text-white/80 md:flex">
              <Link href={`/${locale}`} className="hover:text-white">{nav.games}</Link>
              <Link href={quizHubHref(locale)} className="hover:text-white">{nav.quizzes}</Link>
            </nav>
          </div>
          <div className="flex items-center gap-2 md:gap-3">
            <LanguageSwitcher locale={locale} />
            <HeaderPlayLink
              signIn={nav.signIn}
              openPlay={nav.openPlay}
              className="inline-flex h-9 items-center rounded-full bg-brand-yellow px-4 text-sm font-bold uppercase tracking-wide text-black hover:bg-brand-yellow-deep"
            />
          </div>
        </div>
      </header>
      <main id="main" className="mx-auto w-full max-w-6xl px-4 py-8 md:px-8 md:py-12">{children}</main>
      <SiteFooter locale={locale} />
    </div>
  );
}
