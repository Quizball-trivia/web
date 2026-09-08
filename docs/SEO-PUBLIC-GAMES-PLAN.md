# Public games homepage + game pages — implementation plan v2 (brief of 7 Sept 2026)
Revised 2026-09-08 after two independent plan reviews (Codex, Claude deep-reasoner).

## URL scheme (locales en / ka / es; tr when the locale exists)
- Locale homepage = Football Games hub: `/en`, `/ka`, `/es` (200, self-canonical, indexable).
- Game pages: `/en/football-games/{slug}`, `/ka/football-games/{slug}`, `/es/juegos-de-futbol/{slug}` (ES slugs from the keyword map).
- Daily collection: `/en/football-games/daily-challenges`, `/es/juegos-de-futbol/retos-diarios` (explicit routes, not a slug special case).
- Folder roots (`/en/football-games` …) 308 → locale homepage (the brief asks for permanent).
- Bare `/football-games/{en slug}` and `/about|/terms|/privacy|/daily|/games` → 308 to the **English** page, no geo (a permanent
  redirect must never depend on the visitor).
- `/` → 307 to `/ka` (GE) or `/en`, `Cache-Control: private, no-store`. Geo lives only here.
- Never-deployed staging routes `/{locale}/games/*`, `/{locale}/daily/*` are removed (404), not redirected.
- `/play` and every app route keep noindex; `/demos` stays noindex and prod-disabled.

## Manifest = single publication predicate
`src/lib/seo/public-games.ts` joins copy (game-pages.ts) with runtime metadata by stable `modeId`, validated by a unit test
(unique localized paths, no slug/collection collisions, related ids exist, demo engines exist).
- `page: true` → the locale pages exist, are in the sitemap, get hreflang and related links. Everything else 404s.
- `card` → homepage placement, with an explicit destination: the game page, an existing campaign quiz page (Career Path,
  Who Am I → Guess the Player, which already rank on prod), or the app (Ranked, Weekend League, Friendly).
- Phase 1 publishes 10 pages with a real body of copy each (Tic Tac Toe, Auction, Money Drop, True or False, Countdown,
  Higher or Lower, Imposter, Card Detective, Guess the Goal, Trivia Mines). The rest stay `page: false` until their
  copy is written; no thin templated pages go live.

## hreflang / canonical
`buildLocalizedMetadata` gets per-locale `paths`; alternates are emitted only for published locales, reciprocal, and
`x-default` points at the **English equivalent page** (not the homepage). Self-canonical everywhere.

## Guest play (phase 1) — practice rounds, labelled honestly
The public page is server-rendered content first (H1, intro, how to play, rules and limits, related games). The practice
engine is a client chunk loaded on demand below that content. Label: "Practice round — no account needed. Sample puzzle /
bot opponent / virtual points, no saved progress." Practice state never touches account state. Modes without a guest
engine (Friendly rooms, Ranked, Weekend League) are cards that say "Account required" and open the app sign-in.
Sign-in links from public pages remember the mode + locale and return there after auth (existing postAuthRedirect).

## Phases
1. This change: manifest + validation, routes, redirects, sitemap, hreflang, switcher, public layout, homepage,
   10 game pages with bodies, daily collection, structured data (CollectionPage/ItemList, WebPage+VideoGame+Breadcrumb),
   analytics funnel, sign-in return, `scripts/seo-check.mjs` acceptance crawl (status, canonical, alternates, robots, sitemap).
2. Remaining game pages as copy is written; native review of KA/ES copy before indexing.
3. Guest sessions on the backend (real daily content for guests, coin practice balance, guest friendly rooms).
4. Public standings projection + verified prize copy; then TR locale, catalogue filter.

## Confirm before release (owner)
Root `/` policy (members land on the public hub); Weekend League / Ranked public copy and prize claims; final naming
(Card Detective vs "Player Cards"); whether guest practice should later count for anything (it must not today).
