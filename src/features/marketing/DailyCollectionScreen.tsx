import Link from "next/link";
import { ChevronRight } from "lucide-react";
import type { Locale } from "@/lib/i18n/locale";
import { COLLECTION_COPY, HOME_COPY } from "@/lib/seo/home-copy";
import { homepageCards } from "@/lib/seo/public-games";
import { PublicCardGrid, PublicPageFrame } from "./public/PublicCards";

/** Narrow collection page for the daily challenges; links back to the homepage hub. */
export function DailyCollectionScreen({ locale }: { locale: Locale }) {
  const copy = COLLECTION_COPY[locale];
  const home = HOME_COPY[locale];
  return (
    <PublicPageFrame>
      <nav aria-label="Breadcrumb" className="text-xs font-semibold uppercase tracking-wide text-white/55">
        <ol className="flex items-center gap-1">
          <li><Link href={`/${locale}`} className="hover:text-white">{home.nav.games}</Link></li>
          <li aria-hidden><ChevronRight className="size-3" /></li>
          <li className="text-white/85" aria-current="page">{copy.h1}</li>
        </ol>
      </nav>
      <section className="mt-4 max-w-3xl">
        <h1 className="text-3xl font-black uppercase leading-tight md:text-5xl">{copy.h1}</h1>
        <p className="mt-4 text-base leading-relaxed text-white/80 md:text-lg">{copy.intro}</p>
        <p className="mt-2 text-sm font-semibold text-brand-yellow">{copy.reset}</p>
      </section>
      <section className="mt-8">
        <PublicCardGrid games={homepageCards("daily")} locale={locale} surface="daily_collection" />
      </section>
    </PublicPageFrame>
  );
}
