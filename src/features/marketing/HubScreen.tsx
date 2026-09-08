import Link from "next/link";
import { Play } from "lucide-react";
import { AppLogo } from "@/components/AppLogo";
import { LanguageSwitcher } from "@/components/i18n/LanguageSwitcher";
import { SiteFooter } from "@/components/layout/SiteFooter";
import { DemoModeArt } from "@/features/demos/DemoModeArt";
import { HomeAuthRedirect } from "@/features/marketing/HomeAuthRedirect";
import type { Locale } from "@/lib/i18n/locale";
import { GAME_PAGES, gamePagePath, type GamePageEntry } from "@/lib/seo/game-pages";
import { HUB_COPY, type HubKind } from "@/lib/seo/hub-pages";

function CardGrid({ entries, locale }: { entries: GamePageEntry[]; locale: Locale }) {
  return (
    <div className="grid grid-cols-2 gap-3 md:grid-cols-3 md:gap-4">
      {entries.map((entry) => (
        <Link
          key={`${entry.section}-${entry.slug}`}
          href={gamePagePath(entry, locale)}
          className="group overflow-hidden rounded-xl bg-brand-blue transition-transform hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/60"
        >
          <div className="aspect-video w-full overflow-hidden">
            <DemoModeArt slug={entry.artSlug} className="size-full transition-transform duration-300 group-hover:scale-[1.05]" />
          </div>
          <div className="p-3">
            <h3 className="truncate text-sm font-semibold uppercase md:text-base">{entry.copy[locale].title}</h3>
            <p className="mt-1 line-clamp-2 text-xs text-white/70 md:text-sm">{entry.copy[locale].metaDescription}</p>
          </div>
        </Link>
      ))}
    </div>
  );
}

/**
 * Server-rendered, indexable hub: the homepage and the /daily and /games
 * indexes share this. Guests and crawlers get the full catalogue with a link
 * to every game page; signed-in players are sent on to the app.
 */
export function HubScreen({ kind, locale }: { kind: HubKind; locale: Locale }) {
  const copy = HUB_COPY[kind][locale];
  const dailies = GAME_PAGES.filter((entry) => entry.section === "daily");
  const games = GAME_PAGES.filter((entry) => entry.section === "games");
  const primary = kind === "games" ? games : dailies;
  const secondary = kind === "games" ? dailies : games;
  const primaryTitle = kind === "games" ? copy.sectionGames : copy.sectionDaily;
  const primaryHint = kind === "games" ? copy.sectionGamesHint : copy.sectionDailyHint;
  const secondaryTitle = kind === "games" ? copy.sectionDaily : copy.sectionGames;
  const secondaryHint = kind === "games" ? copy.sectionDailyHint : copy.sectionGamesHint;

  return (
    <div className="min-h-screen w-full bg-surface-page-alt bg-[url('/assets/bg-pattern.webp')] bg-cover bg-center bg-no-repeat font-poppins text-white">
      <HomeAuthRedirect />
      <header className="sticky top-0 z-50 flex h-14 items-center justify-between border-b border-white/[0.06] bg-surface-page-alt/95 px-4 backdrop-blur-md md:h-16 md:px-8">
        <AppLogo />
        <div className="flex items-center gap-3">
          <LanguageSwitcher locale={locale} />
          <Link
            href="/play"
            className="inline-flex h-9 items-center rounded-full bg-brand-yellow px-4 text-sm font-bold uppercase tracking-wide text-black hover:bg-brand-yellow-deep"
          >
            {copy.ctaSignIn}
          </Link>
        </div>
      </header>

      <main className="mx-auto w-full max-w-5xl px-4 py-10 md:px-8 md:py-14">
        <section className="max-w-2xl">
          <h1 className="text-3xl font-black uppercase leading-tight md:text-5xl">{copy.title}</h1>
          <p className="mt-4 text-base leading-relaxed text-white/80 md:text-lg">{copy.intro}</p>
          <Link
            href="/play"
            className="mt-6 inline-flex h-14 items-center justify-center gap-2 rounded-full bg-brand-yellow px-8 text-base font-bold uppercase tracking-wide text-black transition-colors hover:bg-brand-yellow-deep"
          >
            <Play className="size-5" /> {copy.ctaPlay}
          </Link>
        </section>

        <section className="mt-12">
          <h2 className="text-xl font-bold uppercase md:text-2xl">{primaryTitle}</h2>
          <p className="mt-1 text-sm text-white/55">{primaryHint}</p>
          <div className="mt-4"><CardGrid entries={primary} locale={locale} /></div>
        </section>

        <section className="mt-12">
          <h2 className="text-xl font-bold uppercase md:text-2xl">{secondaryTitle}</h2>
          <p className="mt-1 text-sm text-white/55">{secondaryHint}</p>
          <div className="mt-4"><CardGrid entries={secondary} locale={locale} /></div>
        </section>
      </main>
      <SiteFooter locale={locale} />
    </div>
  );
}
