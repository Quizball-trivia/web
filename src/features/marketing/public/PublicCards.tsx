import { DemoModeArt } from "@/features/demos/DemoModeArt";
import type { Locale } from "@/lib/i18n/locale";
import { HOME_COPY } from "@/lib/seo/home-copy";
import type { PublicSurface } from "@/lib/analytics/public-games.analytics";
import { cardHref, type PublicGame } from "@/lib/seo/public-games";
import { GameCardLink } from "./PublicLinks";

function GameCard({ game, locale, surface }: { game: PublicGame; locale: Locale; surface: PublicSurface }) {
  const copy = HOME_COPY[locale].cards;
  const text = game.copy[locale];
  const badge = game.guest === "demo" ? copy.practice : copy.accountRequired;
  return (
    <GameCardLink
      href={cardHref(game, locale)}
      modeId={game.modeId}
      group={game.group}
      surface={surface}
      destination={game.destination.kind}
      className="group flex flex-col overflow-hidden rounded-xl bg-brand-blue transition-transform hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/60"
    >
      <div className="relative aspect-video w-full overflow-hidden">
        <DemoModeArt slug={game.artSlug} className="size-full transition-transform duration-300 group-hover:scale-[1.05]" />
        <span className="absolute left-2 top-2 rounded-full bg-black/60 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-white">{badge}</span>
      </div>
      <div className="p-3">
        <h3 className="truncate text-sm font-semibold uppercase md:text-base">{text.title}</h3>
        <p className="mt-1 line-clamp-2 text-xs text-white/70 md:text-sm">{text.intro}</p>
        <span className="mt-2 inline-block text-xs font-bold uppercase tracking-wide text-brand-yellow">
          {game.destination.kind === "quiz" ? copy.quizPage : game.guest === "demo" ? copy.guest : copy.playLabel}
        </span>
      </div>
    </GameCardLink>
  );
}

export function PublicCardGrid({ games, locale, surface = "public_home" }: { games: PublicGame[]; locale: Locale; surface?: PublicSurface }) {
  return (
    <div className="grid grid-cols-2 gap-3 md:grid-cols-3 md:gap-4">
      {games.map((game) => <GameCard key={game.modeId} game={game} locale={locale} surface={surface} />)}
    </div>
  );
}

/** Content width for a public page inside the app shell. */
export function PublicPageFrame({ children }: { children: React.ReactNode }) {
  return <div className="mx-auto w-full max-w-5xl px-4 py-4 font-poppins text-white md:py-6">{children}</div>;
}
