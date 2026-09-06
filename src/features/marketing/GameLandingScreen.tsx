import Link from "next/link";
import { ChevronLeft, Coins, Play } from "lucide-react";
import { AppLogo } from "@/components/AppLogo";
import { SiteFooter } from "@/components/layout/SiteFooter";
import { LanguageSwitcher } from "@/components/i18n/LanguageSwitcher";
import { DemoModeArt } from "@/features/demos/DemoModeArt";
import { colors } from "@/lib/colors";
import type { Locale } from "@/lib/i18n/locale";
import { GAME_PAGES, gamePagePath, type GamePageEntry } from "@/lib/seo/game-pages";

const BACK_LABEL: Record<Locale, string> = { en: "Back", ka: "უკან", es: "Volver" };
const HOW_TO_PLAY: Record<Locale, string> = { en: "How to play", ka: "როგორ ვითამაშო", es: "Cómo jugar" };
const MORE_GAMES: Record<Locale, string> = { en: "More games", ka: "სხვა თამაშები", es: "Más juegos" };

/**
 * The public landing page for one game mode: server-rendered, indexable, and
 * the same shape for every mode so search engines get a consistent document
 * (title, intro, how-to-play, reward, call to action, related games).
 */
export function GameLandingScreen({ entry, locale }: { entry: GamePageEntry; locale: Locale }) {
  const copy = entry.copy[locale];
  const related = GAME_PAGES.filter((other) => other.slug !== entry.slug).slice(0, 6);

  return (
    <div className="min-h-screen w-full bg-surface-page-alt bg-[url('/assets/bg-pattern.webp')] bg-cover bg-center bg-no-repeat font-poppins text-white">
      <header className="sticky top-0 z-50 flex h-14 items-center justify-between border-b border-white/[0.06] bg-surface-page-alt/95 px-4 backdrop-blur-md md:h-16 md:px-8">
        <Link
          href="/play"
          aria-label={BACK_LABEL[locale]}
          title={BACK_LABEL[locale]}
          className="flex size-9 items-center justify-center rounded-full text-white"
          style={{ backgroundColor: colors.blue.brand }}
        >
          <ChevronLeft className="size-5" />
        </Link>
        <AppLogo />
        <LanguageSwitcher locale={locale} />
      </header>

      <main className="mx-auto w-full max-w-4xl px-4 py-8 md:px-8 md:py-12">
        <section className="grid items-center gap-8 md:grid-cols-[1.1fr_1fr]">
          <div>
            <h1 className="text-3xl font-black uppercase leading-tight md:text-5xl">{copy.title}</h1>
            <p className="mt-4 text-base leading-relaxed text-white/80 md:text-lg">{copy.intro}</p>
            <p className="mt-3 flex items-center gap-2 text-sm font-semibold text-brand-yellow">
              <Coins className="size-4" /> {copy.reward}
            </p>
            <Link
              href={entry.playPath}
              className="mt-6 inline-flex h-14 items-center justify-center gap-2 rounded-full bg-brand-yellow px-8 text-base font-bold uppercase tracking-wide text-black transition-colors hover:bg-brand-yellow-deep"
            >
              <Play className="size-5" /> {copy.cta}
            </Link>
          </div>
          <div className="overflow-hidden rounded-2xl bg-brand-blue">
            <div className="aspect-video w-full">
              <DemoModeArt slug={entry.artSlug} className="size-full" />
            </div>
          </div>
        </section>

        <section className="mt-12">
          <h2 className="text-xl font-bold uppercase md:text-2xl">{HOW_TO_PLAY[locale]}</h2>
          <ol className="mt-4 space-y-3">
            {copy.howToPlay.map((step, index) => (
              <li key={step} className="flex gap-3 rounded-xl bg-white/[0.05] px-4 py-3">
                <span className="grid size-7 shrink-0 place-items-center rounded-full bg-brand-yellow text-sm font-black text-black">
                  {index + 1}
                </span>
                <p className="text-sm leading-relaxed text-white/85 md:text-base">{step}</p>
              </li>
            ))}
          </ol>
        </section>

        <section className="mt-12">
          <h2 className="text-xl font-bold uppercase md:text-2xl">{MORE_GAMES[locale]}</h2>
          <div className="mt-4 grid grid-cols-2 gap-3 md:grid-cols-3">
            {related.map((other) => (
              <Link
                key={`${other.section}-${other.slug}`}
                href={gamePagePath(other, locale)}
                className="group overflow-hidden rounded-xl bg-brand-blue transition-transform hover:-translate-y-0.5"
              >
                <div className="aspect-video w-full overflow-hidden">
                  <DemoModeArt slug={other.artSlug} className="size-full transition-transform duration-300 group-hover:scale-[1.05]" />
                </div>
                <p className="truncate p-2.5 text-sm font-semibold uppercase">{other.copy[locale].title}</p>
              </Link>
            ))}
          </div>
        </section>
      </main>
      <SiteFooter locale={locale} />
    </div>
  );
}
