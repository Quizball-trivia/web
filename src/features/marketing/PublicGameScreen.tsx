import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { DemoModeArt } from "@/features/demos/DemoModeArt";
import type { SeoPageLocale } from "@/lib/seo/game-pages";
import { GAME_PAGE_DETAILS } from "@/lib/seo/game-page-details";
import { HOME_COPY } from "@/lib/seo/home-copy";
import { engineEmitsEvents, publicGamePath, relatedPublishedGames, type PublicGame } from "@/lib/seo/public-games";
import { PublicCardGrid, PublicPageFrame } from "./public/PublicCards";
import { PublicGameEmbed } from "./public/PublicGameEmbed";
import { SignInLink } from "./public/PublicLinks";
import { PublicTopTen } from "./public/PublicTopTen";

const L: Record<SeoPageLocale, { compete: string; competeText: string; howTo: string; details: string; related: string; all: string; account: string; accountText: string; start: string; note: string; exit: string; guest: string; guestDaily: string; startDaily: string; accountDaily: string; member: string; english: string; noteDaily: string; loading: string; sampleFallback: string; accountTextDaily: string }> = {
  en: { compete: "Play online", competeText: "Sign up to play real opponents online, earn ranked points and get on the leaderboards.", howTo: "How to play", details: "Rules and details", related: "Related games", all: "All football games", account: "Play the real thing", accountText: "The practice round above is a sample. Sign in to play today's real game, keep your results and earn coins.", start: "Play training", note: "No account needed. Sample content, bot opponents where relevant, virtual points only, nothing is saved.", exit: "Exit practice", guest: "Guest practice", guestDaily: "Sneak peek", startDaily: "Try the game", accountDaily: "Play for coins", member: "Play", english: "The practice round is in English for now.", noteDaily: "A fixed sample round, the same every day. No account needed; your sample score isn't saved.", accountTextDaily: "Sign in to play today's real challenge for coins and keep your streak.", loading: "Loading today's set…", sampleFallback: "Sample round (today's set could not be loaded)" },
  tr: { compete: "Çevrimiçi oyna", competeText: "Kaydol, çevrimiçi gerçek rakiplerle oyna, dereceli puan kazan ve liderlik tablolarına gir.", howTo: "Nasıl oynanır", details: "Kurallar ve ayrıntılar", related: "Benzer oyunlar", all: "Tüm futbol oyunları", account: "Gerçeğini oyna", accountText: "Yukarıdaki alıştırma turu bir örnektir. Bugünün gerçek oyununu oynamak, sonuçlarını saklamak ve jeton kazanmak için giriş yap.", start: "Antrenmanı oyna", note: "Hesap gerekmez. Örnek içerik, gerektiğinde bot rakipler, yalnızca sanal puan, hiçbir şey kaydedilmez.", exit: "Alıştırmadan çık", guest: "Misafir alıştırması", guestDaily: "Ön izleme", startDaily: "Oyunu dene", accountDaily: "Jeton için oyna", member: "Oyna", english: "Alıştırma turu şimdilik İngilizce.", noteDaily: "Her gün aynı olan sabit bir örnek tur. Hesap gerekmez; örnek puanın kaydedilmez.", accountTextDaily: "Bugünün gerçek görevini jeton için oynamak ve serini korumak için giriş yap.", loading: "Bugünün seti yükleniyor…", sampleFallback: "Örnek tur (bugünün seti yüklenemedi)" },
  es: { compete: "Juega online", competeText: "Regístrate para jugar contra rivales reales online, ganar puntos y entrar en las clasificaciones.", howTo: "Cómo jugar", details: "Reglas y detalles", related: "Juegos relacionados", all: "Todos los juegos de fútbol", account: "Juega la versión real", accountText: "La ronda de práctica de arriba es una muestra. Inicia sesión para jugar el juego real de hoy, guardar tus resultados y ganar monedas.", start: "Jugar el entrenamiento", note: "Sin cuenta. Contenido de muestra, rivales bot donde aplica, solo puntos virtuales, no se guarda nada.", exit: "Salir de la práctica", guest: "Práctica de invitado", guestDaily: "Adelanto", startDaily: "Prueba el juego", accountDaily: "Juega por monedas", member: "Jugar", english: "La ronda de práctica está en inglés por ahora.", noteDaily: "Una ronda de muestra fija, la misma cada día. Sin cuenta; tu puntuación de muestra no se guarda.", accountTextDaily: "Inicia sesión para jugar el reto real de hoy por monedas y mantener tu racha.", loading: "Cargando el set de hoy…", sampleFallback: "Ronda de muestra (no se pudo cargar el set de hoy)" },
  ka: { compete: "ითამაშე ონლაინ", competeText: "დარეგისტრირდი, ითამაშე ნამდვილ მეტოქეებთან ონლაინ, დააგროვე რეიტინგული ქულები და მოხვდი ლიდერბორდზე.", howTo: "როგორ ვითამაშო", details: "წესები და დეტალები", related: "მსგავსი თამაშები", all: "ყველა საფეხბურთო თამაში", account: "ითამაშე ნამდვილი", accountText: "ზემოთ სავარჯიშო რაუნდია — ნიმუში. შედი ანგარიშში, რომ ითამაშო დღევანდელი ნამდვილი თამაში, შეინახო შედეგები და დააგროვო ქოინები.", start: "ითამაშე ვარჯიში", note: "ანგარიშის გარეშე. სანიმუშო შინაარსი, ბოტი მეტოქე სადაც საჭიროა, მხოლოდ ვირტუალური ქულები, არაფერი ინახება.", exit: "სავარჯიშოდან გასვლა", guest: "სტუმრის სავარჯიშო", guestDaily: "გასინჯე", startDaily: "სცადე თამაში", accountDaily: "ითამაშე ქოინებზე", member: "ითამაშე", english: "სავარჯიშო რაუნდი ჯერჯერობით ინგლისურადაა.", noteDaily: "ფიქსირებული სანიმუშო რაუნდი — ყოველდღე ერთი და იგივე. ანგარიში არ სჭირდება; სანიმუშო ქულა არ ინახება.", accountTextDaily: "შედი ანგარიშში, რომ დღევანდელი ნამდვილი გამოწვევა ქოინებზე ითამაშო და სერია შეინარჩუნო.", loading: "დღევანდელი ნაკრები იტვირთება…", sampleFallback: "სანიმუშო რაუნდი (დღევანდელი ნაკრები ვერ ჩაიტვირთა)" },
};

/** One public game page: server-rendered content first, the practice engine on demand below it. */
export function PublicGameScreen({ game, locale }: { game: PublicGame; locale: SeoPageLocale }) {
  const copy = game.copy[locale];
  const labels = L[locale];
  const home = HOME_COPY[locale];
  const details = GAME_PAGE_DETAILS[game.slug]?.[locale] ?? [];
  const path = publicGamePath(game, locale);
  const related = relatedPublishedGames(game);
  const competitive = game.group === "multiplayer" || game.group === "competitive";
  const isDaily = Boolean(game.demoSlug?.startsWith("daily-"));
  return (
    <PublicPageFrame>
      <nav aria-label="Breadcrumb" className="text-xs font-semibold uppercase tracking-wide text-white/55">
        <ol className="flex items-center gap-1">
          <li><Link href={`/${locale}`} className="hover:text-white">{home.nav.games}</Link></li>
          <li aria-hidden><ChevronRight className="size-3" /></li>
          <li className="text-white/85" aria-current="page">{copy.title}</li>
        </ol>
      </nav>

      {/* Desktop: the copy sections flow under the hero in the left column so
          they sit beside the leaderboard instead of below it; on phones the
          DOM order keeps the board right after the hero. */}
      <section className="mt-4 grid items-start gap-8 md:grid-cols-[1.2fr_1fr] md:grid-rows-[auto_1fr]">
        <div className="md:col-start-1 md:row-start-1">
          <h1 className="text-3xl font-black uppercase leading-tight md:text-5xl">{copy.title}</h1>
          <p className="mt-4 text-base leading-relaxed text-white/80 md:text-lg">{copy.intro}</p>
          <p className="mt-3 text-sm font-semibold text-brand-yellow">{game.guest === "demo" ? (isDaily ? labels.guestDaily : labels.guest) : home.cards.accountRequired}</p>
          {game.guest === "demo" && game.demoSlug ? (
            <PublicGameEmbed modeId={game.modeId} demoSlug={game.demoSlug} locale={locale} pagePath={path} playPath={game.playPath} engineEmitsEvents={engineEmitsEvents(game.demoSlug)} practiceLocalised={!game.practiceLocales || game.practiceLocales.includes(locale)} copy={{ start: isDaily ? labels.startDaily : labels.start, note: isDaily ? labels.noteDaily : labels.note, exit: labels.exit, english: labels.english, title: copy.title }} />
          ) : (
            <SignInLink placement="game_page_hero" modeId={game.modeId} returnTo={game.playPath} className="mt-6 inline-flex h-14 items-center justify-center rounded-full bg-brand-yellow px-8 text-base font-bold uppercase tracking-wide text-black hover:bg-brand-yellow-deep">{home.nav.signIn}</SignInLink>
          )}
        </div>
        <div className="md:col-start-2 md:row-span-2 md:row-start-1">
          <div className="overflow-hidden rounded-2xl bg-brand-blue">
            <div className="aspect-video w-full"><DemoModeArt slug={game.artSlug} className="size-full" /></div>
          </div>
          {(game.modeId === "ranked" || game.modeId === "grid" || game.modeId === "auction") && <PublicTopTen board={game.modeId} locale={locale} />}
        </div>

        <div className="md:col-start-1 md:row-start-2">
      <section className="mt-4 max-w-3xl md:mt-0">
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

      <section className="mt-12 max-w-3xl rounded-2xl bg-brand-blue p-5">
        <h2 className="text-lg font-bold uppercase">{competitive ? labels.compete : isDaily ? labels.accountDaily : labels.account}</h2>
        <p className="mt-2 text-sm text-white/85">{competitive ? labels.competeText : isDaily ? labels.accountTextDaily : labels.accountText}</p>
        <SignInLink placement="game_page_account" modeId={game.modeId} returnTo={game.playPath} className="mt-4 inline-flex h-11 items-center rounded-full bg-brand-yellow px-6 text-sm font-bold uppercase tracking-wide text-black hover:bg-brand-yellow-deep">{labels.member}</SignInLink>
      </section>

        </div>
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
