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

## Server half (phase 3, 2026-09-08)
Backend `feat/guest-sessions`: `guest_sessions` (opaque token, sha256 stored) + `guest_daily_completions`; `POST /api/v1/guest/session`
(30/h per IP); `/api/v1/guest/daily-challenges/*` (240/h per token): today's REAL daily set for a guest (same selection, no served-history,
no completion gate), completion recorded as best score without coins/XP/streak, Pass Chain link, public Stat Sniper board;
`GET /api/v1/guest/standings` = read-only Ranked + Weekend League top 5 (alias/rank/score only, 120s cache, honest not_started/unavailable).
Web: guest token in localStorage, daily public pages play today's real set (sample round only as a fallback), homepage standings snippet.
NOT done (needs owner decisions + more backend): coin modes with a guest practice balance, guest friendly/Grid/Auction rooms,
linking guest history to a new account, TR locale.

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

## v3 — the Play screen is the hub (owner correction, 8 Sept 2026)

Owner decision after seeing v2 locally: there must be ONE hub. The existing Play
screen (sidebar + ranked hero + Weekend League rail + game cards) is both the
member hub and the public landing page. Signed-out visitors see the same screen
in guest mode with a slightly different flow. The separate marketing homepage
(`PublicLayout` + `HomeScreen`) built in v2 is wrong and is removed.

Decisions taken with the owner (2026-09-08):
1. `/en`, `/ka`, `/es` and bare `/` render the Play screen. Guests get the guest
   variant plus the SEO copy, standings and FAQ under the cards. `/play` stays
   as the member alias (noindex). The marketing homepage is deleted.
2. Guest card flow: a card opens the public game page for that mode
   (`/{locale}/football-games/{slug}`) inside the same app shell; the page has
   the intro, a practice round or today's guest daily, then the sign-in CTA.
   The ranked hero keeps the vs-AI demo + sign-in. Cards for modes without a
   public page keep opening the sign-in dialog.
3. Leaderboard for guests: top-5 ranked + WL snippet on the hub, and the sidebar
   Leaderboard link opens a read-only public leaderboard for guests. Needs a
   public endpoint (alias/rank/score only, top 50).
4. Game pages render inside the app shell (sidebar), not a standalone layout.

### Routes

| Route | Guest | Member | Index |
|---|---|---|---|
| `/` | 307 geo → `/{locale}` (unchanged) | same | no (redirect) |
| `/{locale}` | Play screen, guest mode + SEO block | Play screen (same as `/play`) | yes, self-canonical, hreflang |
| `/play` | Play screen, guest mode, no SEO block | Play screen | noindex (app route) |
| `/{locale}/football-games/{slug}` | game page in app shell; practice / guest daily | same page; "Open in the app" goes to the real route | yes |
| `/{locale}/football-games/daily-challenges` | collection in app shell | same | yes |
| `/leaderboard` | read-only public board (ranked / auction / grid), no country tab, no "your rank" strip, no seasons | full board (unchanged) | noindex |

### Web changes

- Extract the Play page body (`PlayContent` in `src/app/(app)/play/page.tsx`)
  into `src/features/play/PlayHome.tsx` so `/play` and `/{locale}` render the
  same component. `/{locale}` wraps it in `AppAuthGate` + `AppShell` (its own
  layout under `src/app/[locale]/(hub)/`), with indexable metadata from
  `buildLocalizedMetadata` (unchanged helpers).
- `AppAuthGate.GUEST_ALLOWED_ROUTES` gains `/en`, `/ka`, `/es` (prefix match) and
  `/leaderboard`. `AppShell.guestNavGuard` and `Sidebar.isPathActive` treat
  `/{locale}` as Play and let `/leaderboard` through for guests.
- `ModeSelectionScreen` gets an optional `hubFooter` slot rendered after the
  cards. `/{locale}` passes `HubSeoSection` (server component: H1 + intro
  line above the hero for guests only, then standings snippet with "full
  leaderboard" link, why-account, daily collection link, quiz links, about,
  FAQ, JSON-LD). A client wrapper hides the block once `status === 'authenticated'`
  (SSR always renders the guest variant, so crawlers see the text).
- `AllGamesGrid`: for guests, cards whose mode has a published public page link
  to `publicGamePath(game, locale)` (event `play_card_clicked` destination
  `public_page`); others keep the sign-in prompt. Members unchanged.
- Guest header cluster in `AppShell` gains the `LanguageSwitcher` next to Sign in
  (translated paths already implemented).
- `PublicGameScreen` / `DailyCollectionScreen` drop `PublicLayout` and render
  inside the app shell: breadcrumb, `MiniGameIntro`-style hero (title, intro,
  art, badge, practice / guest daily CTA, sign-in CTA with return path),
  how-to, details, related cards, JSON-LD. Practice engines keep the
  full-screen portal layer.
- `LeaderboardScreen` gets `guest` mode: fetches the public endpoint, maps to
  the existing entry shape (avatar null), hides country tab / seasons / user
  strip / row navigation, shows a sign-in CTA. `/leaderboard/page.tsx` passes
  `currentPlayerId: null` + `guest` when anonymous.
- Delete `PublicLayout.tsx`, `HomeScreen.tsx`, marketing header; keep
  `SiteFooter` only if legal pages still use it.
- `scripts/seo-check.mjs`: hub H1 present in SSR HTML, sidebar present, `/play`
  and `/leaderboard` noindex, game pages 200 with H1, aliases unchanged.
- Card titles exist in en/ka only; `/es` hub cards fall back to English titles
  (existing behaviour, flagged to owner).

### Backend changes

- `GET /api/v1/guest/leaderboard?competition=ranked|auction|grid&limit=50`
  (max 100) → `{ competition, scoring_label, status, entries:[{alias, rank,
  score, tier?}], updated_at }`. Reuses the standings limiter (300/h per IP
  bucket) and the 120 s Redis cache + in-process stale fallback. Only alias /
  rank / score / tier leave the server (no user ids, avatars, countries).
- `publicStandingsService.top(competition, limit)` behind it; the existing
  `/guest/standings` stays as the top-5 hub snippet.

### Out of scope (unchanged from v2)

Guest rooms, guest → account history linking, coin-game guest balance, TR locale.

### v3.1 amendments after Codex + deep-reasoner plan review (2026-09-08)

- SSR of the hub must be the guest variant. Auth starts in `loading`, and every
  guest branch tested `status === 'anonymous'`, so the server HTML carried the
  member chrome. Public presentation is now `status !== 'authenticated'`
  (shared hook), and the SEO intro/body are server components rendered by the
  hub page outside `ModeSelectionScreen`, never gated on auth.
- Members are not kept on `/{locale}`: once authenticated the hub replaces to
  `/play`, so the URL locale never overrides a member's saved language and the
  hub HTML stays a pure guest page (no duplicate member content).
- Single H1: the ranked hero headings become `h2`; the hub H1 comes from the
  server intro.
- Route tree: delete `app/[locale]/page.tsx`; new `app/[locale]/(hub)/` group
  holds the hub page plus `football-games/` and `juegos-de-futbol/`. Legal,
  press and campaign-quiz routes stay outside the shell.
- Guest-allowed routes are matched explicitly (hub exact, game folders by
  prefix, `/leaderboard`), not a bare locale prefix. `HEADER_PATHS`, sidebar
  and mobile nav treat the hub as Play; the logo goes to `/{locale}` for guests
  and `/play` for members, never through the geo redirect on `/`.
- No `/demos` links on the hub (prod-disabled). Guest cards resolve through the
  manifest (page / quiz / sign-in); the ranked hero's "vs AI" demo opens the
  practice engine in the full-screen layer instead of `/demos/match`.
- Public leaderboard: fixed top 50, no caller `limit`, 120 s cache under
  `public:leaderboard:v1:{competition}` with last-good snapshot fallback;
  competitions ranked | auction | grid | weekend_league; separate
  `PublicLeaderboardScreen` (no member hooks). Alias falls back to "Player".
  Standings snippet stays client-fetched so nicknames are not in crawled HTML.
- Guest-side shell cost: socket manager + 1.5 s debug interval +
  system-status poll only run when authenticated.
- `/es` hub cards use the manifest's Spanish copy where a public game exists.
- IPv6 bucket: expand compressed addresses before taking the /64.
- Standings cache: a failed competition load no longer overwrites the last good
  snapshot for 120 s.
- `RETURNABLE_PATH` gains `/leaderboard`; `RouteProviders` client classifier
  matches the server one (es quiz routes).
- `SiteFooter` stays (Play renders it). `PublicCardGrid`/`quizHubHref` move
  to `features/marketing/public/` before `HomeScreen`/`PublicLayout` are deleted.
