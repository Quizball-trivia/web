import type { Locale } from "@/lib/i18n/locale";
import { campaignHubPath, campaignPublicSlug } from "@/features/campaign-quiz/campaignQuiz.routes";
import { GAME_PAGES, SEO_PAGE_LOCALES, dailyCollectionPath, gamePagePath, isSeoPageLocale, type GamePageEntry, type SeoPageLocale } from "./game-pages";
import { GAME_PAGE_DETAILS } from "./game-page-details";

/**
 * Release manifest for the public games catalogue (homepage + game pages).
 * Copy lives in game-pages.ts; this file answers "does it have a page, how does
 * a guest play it, which engine runs inline, where does its card go". One
 * publication predicate (`page`) drives routes, metadata, sitemap, hreflang,
 * the language switcher and related links; everything else is a 404.
 */
export type GuestStrategy =
  /** The mode's client engine runs inline as a practice round: no account, no wallet, sample content. */
  | "demo"
  /** No guest engine yet: the card/page says "Account required" and opens the app sign-in. */
  | "app";

export type PublicGameGroup = "multiplayer" | "daily" | "coins" | "solo" | "competitive";

/** Where a homepage card sends the visitor. */
export type CardDestination =
  | { kind: "page" }
  /** An established campaign-quiz page owns this intent on production (Career Path, Guess the Player). */
  | { kind: "quiz"; sourceSlug: string }
  | { kind: "app"; path: string };

export interface PublicGameMeta {
  /** Stable analytics/manifest id (never translated display text). */
  modeId: string;
  /** Copy key in game-pages.ts. */
  slug: string;
  group: PublicGameGroup;
  guest: GuestStrategy;
  /** Demo-mode slug whose engine runs inline for guests (required for `demo`). */
  demoSlug?: string;
  /** Has public, indexable pages in every locale. */
  page: boolean;
  /** Shown as a homepage card; `false` keeps it out of the catalogue. */
  card: boolean;
  destination: CardDestination;
  related: string[];
  /** Ordering inside its group (lower first). */
  order: number;
  /** Locales whose practice engine is localised; others show it in English with a notice. Daily modes play the real localised set. */
  practiceLocales?: Locale[];
}

/** Daily engines report start/complete/replay themselves; other engines are timed from the outer Play control. */
export const engineEmitsEvents = (demoSlug: string | undefined): boolean => Boolean(demoSlug?.startsWith("daily-"));
/** Sign-in entry: the Play screen opens its auth dialog for guests when asked to. */
export const SIGN_IN_PATH = "/play?signin=1";

export const PUBLIC_GAME_META: PublicGameMeta[] = [
  { modeId: "grid", slug: "football-tic-tac-toe", group: "multiplayer", guest: "demo", demoSlug: "mini-football-grid", page: true, card: true, destination: { kind: "page" }, related: ["auction", "moneyDrop", "cardDetective"], order: 0, practiceLocales: ["en", "ka", "es", "tr"] },
  { modeId: "auction", slug: "auction", group: "multiplayer", guest: "demo", demoSlug: "auction", page: true, card: true, destination: { kind: "page" }, related: ["grid", "cardDetective", "moneyDrop"], order: 1, practiceLocales: ["en", "ka", "es", "tr"] },
  // Friendly rooms need a guest identity on the server (phase 3): card only, opens the app.
  { modeId: "friendly", slug: "friendly", group: "multiplayer", guest: "app", page: false, card: true, destination: { kind: "app", path: "/friend" }, related: ["grid", "auction", "moneyDrop"], order: 2 },
  { modeId: "ranked", slug: "ranked", group: "competitive", guest: "demo", demoSlug: "match", page: true, card: true, destination: { kind: "page" }, related: ["grid", "auction"], order: 0 },
  // Established campaign-quiz pages keep these intents; the cards link there.
  { modeId: "clues", slug: "who-am-i", group: "daily", guest: "demo", demoSlug: "daily-clues", page: false, card: true, destination: { kind: "quiz", sourceSlug: "guess-the-player" }, related: [], order: 0 },
  { modeId: "careerPath", slug: "career-path", group: "daily", guest: "demo", demoSlug: "daily-careerPath", page: false, card: true, destination: { kind: "quiz", sourceSlug: "career-path" }, related: [], order: 4 },
  { modeId: "moneyDrop", slug: "money-drop", group: "daily", guest: "demo", demoSlug: "daily-moneyDrop", page: true, card: true, destination: { kind: "page" }, related: ["trueFalse", "countdown", "highLow"], order: 1 },
  { modeId: "trueFalse", slug: "true-or-false-football", group: "daily", guest: "demo", demoSlug: "daily-trueFalse", page: true, card: true, destination: { kind: "page" }, related: ["moneyDrop", "highLow", "imposter"], order: 2 },
  { modeId: "countdown", slug: "countdown", group: "daily", guest: "demo", demoSlug: "daily-countdown", page: true, card: true, destination: { kind: "page" }, related: ["moneyDrop", "imposter", "cardDetective"], order: 3 },
  { modeId: "highLow", slug: "higher-or-lower", group: "daily", guest: "demo", demoSlug: "daily-highLow", page: true, card: true, destination: { kind: "page" }, related: ["trueFalse", "moneyDrop", "countdown"], order: 5 },
  { modeId: "imposter", slug: "imposter", group: "daily", guest: "demo", demoSlug: "daily-imposter", page: true, card: true, destination: { kind: "page" }, related: ["trueFalse", "countdown", "cardDetective"], order: 6 },
  { modeId: "cardDetective", slug: "card-detective", group: "daily", guest: "demo", demoSlug: "daily-cardDetective", page: true, card: true, destination: { kind: "page" }, related: ["countdown", "imposter", "grid"], order: 7 },
  // Put in Order is inactive on production: no page until it is switched back on.
  { modeId: "footballLogic", slug: "football-logic", group: "daily", guest: "demo", demoSlug: "daily-footballLogic", page: true, card: true, destination: { kind: "page" }, related: ["imposter", "countdown", "cardDetective"], order: 8 },
  { modeId: "missingXi", slug: "missing-xi", group: "daily", guest: "demo", demoSlug: "daily-missingXi", page: true, card: true, destination: { kind: "page" }, related: ["passChain", "cardDetective", "grid"], order: 9 },
  { modeId: "passChain", slug: "pass-chain", group: "daily", guest: "demo", demoSlug: "daily-passChain", page: true, card: true, destination: { kind: "page" }, related: ["missingXi", "grid", "cardDetective"], order: 10 },
  { modeId: "statSniper", slug: "stat-sniper", group: "daily", guest: "demo", demoSlug: "daily-statSniper", page: true, card: true, destination: { kind: "page" }, related: ["highLow", "moneyDrop", "trueFalse"], order: 11 },
  { modeId: "putInOrder", slug: "football-timeline", group: "daily", guest: "demo", demoSlug: "daily-putInOrder", page: false, card: false, destination: { kind: "page" }, related: [], order: 12 },
  // The practice prototype (tactical-board animation, multiple choice) is not the real clip game: no page until it is; card opens the app.
  { modeId: "guessTheGoal", slug: "guess-the-goal", group: "solo", guest: "app", page: false, card: true, destination: { kind: "app", path: "/guess-the-goal" }, related: [], order: 0 },
  { modeId: "triviaMines", slug: "trivia-mines", group: "coins", guest: "demo", demoSlug: "mini-trivia-mines", page: true, card: true, destination: { kind: "page" }, related: ["grid", "moneyDrop", "cardDetective"], order: 0, practiceLocales: ["en", "ka"] },
  { modeId: "freeKicks", slug: "free-kicks", group: "coins", guest: "demo", demoSlug: "mini-final-third", page: true, card: true, destination: { kind: "page" }, related: ["roadToGoal", "triviaMines", "squadSpin"], order: 1, practiceLocales: ["en", "ka"] },
  { modeId: "roadToGoal", slug: "road-to-goal", group: "coins", guest: "demo", demoSlug: "mini-road-to-goal", page: true, card: true, destination: { kind: "page" }, related: ["freeKicks", "triviaMines", "squadSpin"], order: 2, practiceLocales: ["en", "ka"] },
  { modeId: "squadSpin", slug: "squad-spin", group: "coins", guest: "demo", demoSlug: "mini-squad-spin", page: true, card: true, destination: { kind: "page" }, related: ["triviaMines", "freeKicks", "grid"], order: 3, practiceLocales: ["en", "ka"] },
];

export type PublicGame = GamePageEntry & PublicGameMeta;

const COPY_BY_SLUG = new Map(GAME_PAGES.map((entry) => [entry.slug, entry]));

/** Every manifest entry joined with its copy. A missing copy entry is a build error, not a silent drop. */
export const PUBLIC_GAMES: PublicGame[] = PUBLIC_GAME_META.map((meta) => {
  const copy = COPY_BY_SLUG.get(meta.slug);
  if (!copy) throw new Error(`public-games: no copy for "${meta.slug}" in game-pages.ts`);
  return { ...copy, ...meta };
});

const BY_MODE_ID = new Map(PUBLIC_GAMES.map((game) => [game.modeId, game]));

/** Modes with indexable pages in every locale. */
export const PUBLISHED_PUBLIC_GAMES = PUBLIC_GAMES.filter((game) => game.page);

export const findPublicGameBySlug = (slug: string): PublicGame | null => PUBLIC_GAMES.find((game) => game.slug === slug) ?? null;

export function findPublicGameByModeId(modeId: string): PublicGame | null {
  return BY_MODE_ID.get(modeId) ?? null;
}

const BY_DEMO_SLUG = new Map(PUBLIC_GAMES.filter((game) => game.demoSlug).map((game) => [game.demoSlug as string, game]));

/**
 * The Play screen's cards are keyed by demo slug (daily cards also carry the
 * daily type). Resolves the card to its public game so a signed-out visitor is
 * sent to the public page / owning quiz instead of an account-only route.
 */
export function findPublicGameForCard(card: { slug: string; dailyType?: string | null }): PublicGame | null {
  return BY_DEMO_SLUG.get(card.slug) ?? (card.dailyType ? BY_MODE_ID.get(card.dailyType) ?? null : null);
}

/** Where a signed-out visitor goes from a Play card; null = the card needs an account (sign-in dialog). */
export function guestCardHref(card: { slug: string; dailyType?: string | null }, locale: Locale): string | null {
  const game = findPublicGameForCard(card);
  if (!game || !game.card || game.destination.kind === "app") return null;
  if (game.destination.kind === "page" && !game.page) return null;
  return cardHref(game, locale);
}

export const quizHubHref = (locale: Locale): string => campaignHubPath(campaignLocaleOf(locale));

/** Resolves a localized URL (folder must match the locale) to a PUBLISHED game, else null → 404. */
export function findPublishedGame(locale: Locale, folder: string, slug: string): PublicGame | null {
  if (!isSeoPageLocale(locale)) return null;
  const entry = PUBLISHED_PUBLIC_GAMES.find((game) => (game.slugs?.[locale] ?? game.slug) === slug);
  if (!entry || !isPublishedIn(entry, locale)) return null;
  return gamePagePath(entry, locale).split("/")[2] === folder ? entry : null;
}

export function homepageCards(group: PublicGameGroup): PublicGame[] {
  return PUBLIC_GAMES.filter((game) => game.card && game.group === group).sort((a, b) => a.order - b.order);
}

export function relatedPublishedGames(game: PublicGame): PublicGame[] {
  const picked = game.related.map(findPublicGameByModeId).filter((g): g is PublicGame => Boolean(g?.page));
  for (const candidate of PUBLISHED_PUBLIC_GAMES) {
    if (picked.length >= 3) break;
    if (candidate.slug !== game.slug && !picked.includes(candidate)) picked.push(candidate);
  }
  return picked.slice(0, 3);
}

/** Where a card links: its page, the established quiz page, or the app. */
/** Campaign quiz pages exist in en/es only. */
export const campaignLocaleOf = (locale: Locale): "en" | "es" => (locale === "es" ? "es" : "en");

/** Locales in which this game's public page exists (page flag + a written body). */
export function publishedLocalesOf(game: PublicGame): SeoPageLocale[] {
  if (!game.page) return [];
  return SEO_PAGE_LOCALES.filter((locale) => (GAME_PAGE_DETAILS[game.slug]?.[locale]?.length ?? 0) > 0);
}
export const isPublishedIn = (game: PublicGame, locale: Locale): locale is SeoPageLocale =>
  isSeoPageLocale(locale) && publishedLocalesOf(game).includes(locale);

/** The page a card links to: the locale's page when it exists, otherwise the English page. */
export const publicPagePathFor = (game: PublicGame, locale: Locale): string => gamePagePath(game, isPublishedIn(game, locale) ? locale : "en");

export function cardHref(game: PublicGame, locale: Locale): string {
  switch (game.destination.kind) {
    case "page": return publicPagePathFor(game, locale);
    case "quiz": {
      const quizLocale = campaignLocaleOf(locale);
      return `${campaignHubPath(quizLocale)}/${campaignPublicSlug(game.destination.sourceSlug, quizLocale)}`;
    }
    case "app": return game.destination.path;
  }
}

export { gamePagePath as publicGamePath, dailyCollectionPath };
