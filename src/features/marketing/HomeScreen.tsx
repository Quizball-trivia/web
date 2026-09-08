import Link from "next/link";
import { DemoModeArt } from "@/features/demos/DemoModeArt";
import { campaignPublicSlug } from "@/features/campaign-quiz/campaignQuiz.routes";
import type { Locale } from "@/lib/i18n/locale";
import { HOME_COPY } from "@/lib/seo/home-copy";
import type { PublicSurface } from "@/lib/analytics/public-games.analytics";
import { cardHref, dailyCollectionPath, homepageCards, type PublicGame } from "@/lib/seo/public-games";
import { PublicLayout, quizHubHref } from "./PublicLayout";
import { CompetitiveLink, GameCardLink, SignInLink } from "./public/PublicLinks";

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

function CardGrid({ games, locale, surface = "public_home" }: { games: PublicGame[]; locale: Locale; surface?: PublicSurface }) {
  return (
    <div className="grid grid-cols-2 gap-3 md:grid-cols-3 md:gap-4">
      {games.map((game) => <GameCard key={game.modeId} game={game} locale={locale} surface={surface} />)}
    </div>
  );
}

function Competitive({ locale }: { locale: Locale }) {
  const c = HOME_COPY[locale].cards;
  const card = "flex flex-col gap-2 rounded-xl border border-brand-yellow/40 bg-brand-blue/60 p-4";
  const cta = "mt-auto inline-flex h-10 w-fit items-center rounded-full bg-brand-yellow px-4 text-xs font-bold uppercase tracking-wide text-black hover:bg-brand-yellow-deep";
  return (
    <div className="grid gap-3 md:grid-cols-2">
      <div className={card}>
        <h3 className="text-base font-bold uppercase">{c.rankedTitle}</h3>
        <p className="text-sm text-white/75">{c.rankedText}</p>
        <CompetitiveLink kind="ranked" href="/play?signin=1&mode=ranked" placement="home_competitive" className={cta}>{c.rankedCta}</CompetitiveLink>
      </div>
      <div className={card}>
        <h3 className="text-base font-bold uppercase">{c.wlTitle}</h3>
        <p className="text-sm text-white/75">{c.wlText}</p>
        <CompetitiveLink kind="weekend_league" href="/weekend-league" placement="home_competitive" className={cta}>{c.wlCta}</CompetitiveLink>
      </div>
    </div>
  );
}

/** The locale homepage: Quizball's Football Games hub (brief of 7 Sept 2026, section 5). */
export function HomeScreen({ locale }: { locale: Locale }) {
  const copy = HOME_COPY[locale];
  const multiplayer = homepageCards("multiplayer");
  const solo = homepageCards("solo");
  const daily = homepageCards("daily");
  const coins = homepageCards("coins");
  const quizLocale = locale === "ka" ? "en" : locale;
  const h2 = "text-xl font-bold uppercase md:text-2xl";
  return (
    <PublicLayout locale={locale}>
      <section className="max-w-3xl">
        <h1 className="text-3xl font-black uppercase leading-tight md:text-5xl">{copy.h1}</h1>
        <p className="mt-4 text-base leading-relaxed text-white/80 md:text-lg">{copy.intro}</p>
        <p className="mt-3 text-sm font-semibold text-brand-yellow">{copy.accessLine}</p>
      </section>

      <section className="mt-10">
        <h2 className={h2}>{copy.sections.play}</h2>
        <p className="mt-1 text-sm text-white/55">{copy.sections.playHint}</p>
        <div className="mt-4 lg:grid lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)] lg:gap-6">
          <CardGrid games={[...multiplayer, ...solo]} locale={locale} />
          <aside className="mt-6 lg:mt-0">
            <h2 className="text-base font-bold uppercase text-white/85">{copy.sections.competitive}</h2>
            <div className="mt-3"><Competitive locale={locale} /></div>
          </aside>
        </div>
      </section>

      <section className="mt-12">
        <div className="flex items-end justify-between gap-4">
          <div>
            <h2 className={h2}>{copy.sections.daily}</h2>
            <p className="mt-1 text-sm text-white/55">{copy.sections.dailyHint}</p>
          </div>
          <Link href={dailyCollectionPath(locale)} className="shrink-0 text-sm font-bold uppercase tracking-wide text-brand-yellow hover:underline">{copy.sections.dailyAll}</Link>
        </div>
        <div className="mt-4"><CardGrid games={daily} locale={locale} /></div>
      </section>

      {coins.length > 0 && (
        <section className="mt-12">
          <h2 className={h2}>{copy.sections.more}</h2>
          <p className="mt-1 text-sm text-white/55">{copy.sections.moreHint}</p>
          <div className="mt-4"><CardGrid games={coins} locale={locale} /></div>
        </section>
      )}

      <section className="mt-12 max-w-3xl">
        <h2 className={h2}>{copy.sections.whyAccount}</h2>
        {copy.whyAccount.map((p) => <p key={p} className="mt-3 text-sm leading-relaxed text-white/75 md:text-base">{p}</p>)}
        <SignInLink placement="home_why_account" className="mt-4 inline-flex h-11 items-center rounded-full bg-brand-yellow px-6 text-sm font-bold uppercase tracking-wide text-black hover:bg-brand-yellow-deep">{copy.nav.signIn}</SignInLink>
      </section>

      <section className="mt-12 max-w-3xl">
        <h2 className={h2}>{copy.sections.quizzes}</h2>
        <ul className="mt-3 flex flex-wrap gap-3 text-sm font-semibold">
          <li><Link href={quizHubHref(locale)} className="rounded-full border border-white/20 px-4 py-2 hover:border-white">{copy.quizLinks.hub}</Link></li>
          <li><Link href={`${quizHubHref(locale)}/${campaignPublicSlug("guess-the-player", quizLocale)}`} className="rounded-full border border-white/20 px-4 py-2 hover:border-white">{copy.quizLinks.guessPlayer}</Link></li>
          <li><Link href={`${quizHubHref(locale)}/${campaignPublicSlug("career-path", quizLocale)}`} className="rounded-full border border-white/20 px-4 py-2 hover:border-white">{copy.quizLinks.careerPath}</Link></li>
        </ul>
      </section>

      <section className="mt-12 max-w-3xl">
        <h2 className={h2}>{copy.about.title}</h2>
        <p className="mt-3 text-sm leading-relaxed text-white/75 md:text-base">{copy.about.text}</p>
      </section>

      <section className="mt-12 max-w-3xl">
        <h2 className={h2}>{copy.sections.faq}</h2>
        <dl className="mt-4 space-y-4">
          {copy.faq.map((item) => (
            <div key={item.q}>
              <dt className="font-semibold">{item.q}</dt>
              <dd className="mt-1 text-sm text-white/75">{item.a}</dd>
            </div>
          ))}
        </dl>
      </section>
    </PublicLayout>
  );
}

export { CardGrid as PublicCardGrid };
