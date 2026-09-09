import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { DemoModeArt } from "@/features/demos/DemoModeArt";
import type { Locale } from "@/lib/i18n/locale";
import { GAME_PAGE_DETAILS } from "@/lib/seo/game-page-details";
import { HOME_COPY } from "@/lib/seo/home-copy";
import { engineEmitsEvents, publicGamePath, relatedPublishedGames, type PublicGame } from "@/lib/seo/public-games";
import { PublicCardGrid, PublicPageFrame } from "./public/PublicCards";
import { PublicGameEmbed } from "./public/PublicGameEmbed";
import { SignInLink } from "./public/PublicLinks";

const L: Record<Locale, { howTo: string; details: string; related: string; all: string; account: string; accountText: string; start: string; note: string; exit: string; guest: string; member: string; english: string; noteDaily: string; loading: string; sampleFallback: string; accountTextDaily: string }> = {
  en: { howTo: "How to play", details: "Rules and details", related: "Related games", all: "All football games", account: "Play the real thing", accountText: "The practice round above is a sample. Sign in to play today's real game, keep your results and earn coins.", start: "Try a practice round", note: "No account needed. Sample content, bot opponents where relevant, virtual points only, nothing is saved.", exit: "Exit practice", guest: "Guest practice", member: "Open in the app", english: "The practice round is in English for now.", noteDaily: "Today's real set, played as a guest: no coins, no streak. Your best score of the day is kept for this browser's guest session only.", accountTextDaily: "Sign in to earn coins for today's set, keep your streak and appear on the leaderboards.", loading: "Loading today's set…", sampleFallback: "Sample round (today's set could not be loaded)" },
  es: { howTo: "Cómo jugar", details: "Reglas y detalles", related: "Juegos relacionados", all: "Todos los juegos de fútbol", account: "Juega la versión real", accountText: "La ronda de práctica de arriba es una muestra. Inicia sesión para jugar el juego real de hoy, guardar tus resultados y ganar monedas.", start: "Probar una ronda de práctica", note: "Sin cuenta. Contenido de muestra, rivales bot donde aplica, solo puntos virtuales, no se guarda nada.", exit: "Salir de la práctica", guest: "Práctica de invitado", member: "Abrir en la app", english: "La ronda de práctica está en inglés por ahora.", noteDaily: "El set real de hoy, jugado como invitado: sin monedas ni racha. Tu mejor puntuación del día se guarda solo para la sesión de invitado de este navegador.", accountTextDaily: "Inicia sesión para ganar monedas con el set de hoy, mantener tu racha y aparecer en las clasificaciones.", loading: "Cargando el set de hoy…", sampleFallback: "Ronda de muestra (no se pudo cargar el set de hoy)" },
  ka: { howTo: "როგორ ვითამაშო", details: "წესები და დეტალები", related: "მსგავსი თამაშები", all: "ყველა საფეხბურთო თამაში", account: "ითამაშე ნამდვილი", accountText: "ზემოთ სავარჯიშო რაუნდია — ნიმუში. შედი ანგარიშში, რომ ითამაშო დღევანდელი ნამდვილი თამაში, შეინახო შედეგები და დააგროვო ქოინები.", start: "სცადე სავარჯიშო რაუნდი", note: "ანგარიშის გარეშე. სანიმუშო შინაარსი, ბოტი მეტოქე სადაც საჭიროა, მხოლოდ ვირტუალური ქულები, არაფერი ინახება.", exit: "სავარჯიშოდან გასვლა", guest: "სტუმრის სავარჯიშო", member: "აპლიკაციაში გახსნა", english: "სავარჯიშო რაუნდი ჯერჯერობით ინგლისურადაა.", noteDaily: "დღევანდელი ნამდვილი ნაკრები სტუმრად: ქოინებისა და სერიის გარეშე. დღის საუკეთესო ქულა მხოლოდ ამ ბრაუზერის სტუმრის სესიისთვის ინახება.", accountTextDaily: "შედი ანგარიშში, რომ დღევანდელი ნაკრებით ქოინები დააგროვო, სერია შეინარჩუნო და ლიდერბორდზე გამოჩნდე.", loading: "დღევანდელი ნაკრები იტვირთება…", sampleFallback: "სანიმუშო რაუნდი (დღევანდელი ნაკრები ვერ ჩაიტვირთა)" },
};

/** One public game page: server-rendered content first, the practice engine on demand below it. */
export function PublicGameScreen({ game, locale }: { game: PublicGame; locale: Locale }) {
  const copy = game.copy[locale];
  const labels = L[locale];
  const home = HOME_COPY[locale];
  const details = GAME_PAGE_DETAILS[game.slug]?.[locale] ?? [];
  const path = publicGamePath(game, locale);
  const related = relatedPublishedGames(game);
  return (
    <PublicPageFrame>
      <nav aria-label="Breadcrumb" className="text-xs font-semibold uppercase tracking-wide text-white/55">
        <ol className="flex items-center gap-1">
          <li><Link href={`/${locale}`} className="hover:text-white">{home.nav.games}</Link></li>
          <li aria-hidden><ChevronRight className="size-3" /></li>
          <li className="text-white/85" aria-current="page">{copy.title}</li>
        </ol>
      </nav>

      <section className="mt-4 grid items-start gap-8 md:grid-cols-[1.2fr_1fr]">
        <div>
          <h1 className="text-3xl font-black uppercase leading-tight md:text-5xl">{copy.title}</h1>
          <p className="mt-4 text-base leading-relaxed text-white/80 md:text-lg">{copy.intro}</p>
          <p className="mt-3 text-sm font-semibold text-brand-yellow">{game.guest === "demo" ? labels.guest : home.cards.accountRequired}</p>
          {game.guest === "demo" && game.demoSlug ? (
            <PublicGameEmbed modeId={game.modeId} demoSlug={game.demoSlug} locale={locale} pagePath={path} engineEmitsEvents={engineEmitsEvents(game.demoSlug)} practiceLocalised={!game.practiceLocales || game.practiceLocales.includes(locale)} copy={{ start: labels.start, note: game.demoSlug.startsWith("daily-") ? labels.noteDaily : labels.note, exit: labels.exit, english: labels.english, title: copy.title, loading: labels.loading, sampleFallback: labels.sampleFallback }} />
          ) : (
            <SignInLink placement="game_page_hero" modeId={game.modeId} returnTo={game.playPath} className="mt-6 inline-flex h-14 items-center justify-center rounded-full bg-brand-yellow px-8 text-base font-bold uppercase tracking-wide text-black hover:bg-brand-yellow-deep">{home.nav.signIn}</SignInLink>
          )}
        </div>
        <div className="overflow-hidden rounded-2xl bg-brand-blue">
          <div className="aspect-video w-full"><DemoModeArt slug={game.artSlug} className="size-full" /></div>
        </div>
      </section>

      <section className="mt-12 max-w-3xl">
        <h2 className="text-xl font-bold uppercase md:text-2xl">{labels.howTo}</h2>
        <ol className="mt-4 space-y-3">
          {copy.howToPlay.map((step, index) => (
            <li key={step} className="flex gap-3">
              <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-brand-yellow text-sm font-black text-black">{index + 1}</span>
              <p className="pt-0.5 text-sm leading-relaxed text-white/85 md:text-base">{step}</p>
            </li>
          ))}
        </ol>
      </section>

      {details.length > 0 && (
        <section className="mt-12 max-w-3xl">
          <h2 className="text-xl font-bold uppercase md:text-2xl">{labels.details}</h2>
          {details.map((paragraph) => <p key={paragraph} className="mt-3 text-sm leading-relaxed text-white/75 md:text-base">{paragraph}</p>)}
          <p className="mt-3 text-sm font-semibold text-brand-yellow">{copy.reward}</p>
        </section>
      )}

      <section className="mt-12 max-w-3xl rounded-2xl border border-white/10 bg-white/[0.04] p-5">
        <h2 className="text-lg font-bold uppercase">{labels.account}</h2>
        <p className="mt-2 text-sm text-white/75">{game.demoSlug?.startsWith("daily-") ? labels.accountTextDaily : labels.accountText}</p>
        <SignInLink placement="game_page_account" modeId={game.modeId} returnTo={game.playPath} className="mt-4 inline-flex h-11 items-center rounded-full bg-brand-yellow px-6 text-sm font-bold uppercase tracking-wide text-black hover:bg-brand-yellow-deep">{labels.member}</SignInLink>
      </section>

      <section className="mt-12">
        <div className="flex items-end justify-between gap-4">
          <h2 className="text-xl font-bold uppercase md:text-2xl">{labels.related}</h2>
          <Link href={`/${locale}`} className="text-sm font-bold uppercase tracking-wide text-brand-yellow hover:underline">{labels.all}</Link>
        </div>
        <div className="mt-4"><PublicCardGrid games={related} locale={locale} surface="public_game" /></div>
      </section>
    </PublicPageFrame>
  );
}
