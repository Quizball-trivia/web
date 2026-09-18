# Staging → Production promotion plan (September 2026 batch)

Status: **draft v2, 2026-09-18** — for owner review. Nothing in this document has been executed. v2 folds in the independent critique (deep-reasoner, Codex quota exhausted until 2026-09-19); the changes are marked **[v2]**.
Scope: everything on `staging` that production lacks — new auth, the Play hub and public game pages, guest play, the five new dailies and four coin mini games, Football Grid (Tic Tac Toe), locales, question pools, store, Weekend League leftovers, infra — plus the database, storage and content that go with it. Ends with `main` and `staging` identical and a rule that keeps them that way.

Inventory sources: read-only surveys of both repos (`inventory-backend.md`, `inventory-web.md`, 2026-09-18), Railway variables, both Supabase databases (table list, row estimates, pg_cron, storage) — all read-only.

---

## 0. Where we are

| | Backend (`quizball-backend`) | Web (`web`) |
|---|---|---|
| Commits staging ahead of main | 1,149 (721 distinct patches) | 697 (411 distinct patches) |
| Commits main has that staging lacks | 387 (168 patches; almost all cherry-pick re-landings) | 258 (81 patches; almost all re-landings) |
| Shared history since | July 2026 | 2026-07-09 |
| Migrations staging-only / prod-only | **71 / 7** | — |
| Tables staging has that prod lacks | **58** (grid ×39, road to goal ×9, squad spin ×8, trivia mines ×2, free kicks ×2, guests ×2, pass chain, name translations) | — |
| Railway vars staging-only / prod-only | 30 / 8 | Vercel: unverified (CLI not linked) |
| New app routes on staging | — | 52 pages (17 public game pages × 4 locales, 7 app routes, ~32 dev/lab) |
| Storage (`imgs` bucket) | football-grid 50,964 objects on staging vs 1,440 on prod; goal-clips 85 vs 5; demos 32 vs 0 | — |

**Why cherry-picking feature by feature is no longer viable:** the backend needs 721 patches and 71 migrations that stack on each other (six migrations each rewrite the same `store_transaction_logs` CHECK, Road to Goal has a 16-step v2→v3 chain). Picking "just mini games" or "just auth" would mean re-resolving the same conflicts the last ten weeks already produced, and would leave the branches diverged again the next morning. The plan therefore promotes **one release branch built from `main` that takes the whole staging tree**, with a short, explicit list of prod-only decisions applied on top, deployed with every new feature **flag-off**, then switched on in stages. Feature selection happens through the flags and the content steps, not through the git history.

### The genuine prod-only items the release branch must keep (everything else on main is a re-landed staging change)

| Item | Where | Decision |
|---|---|---|
| `AUCTION_ENABLED` kill switch (staging deleted it; prod uses it in 4 files / 12 sites) | backend `config.ts`, auction handler/matchmaking/lobby start | **Re-add** on the release branch (default true on prod). Keeps the emergency stop. |
| Draft gate UI reverted on prod (`cd954c61`); staging still carries the gate | web | **Owner decision.** Recommend keep prod behaviour (no gate) unless the gate was fixed since. |
| API client types regenerated from the prod spec (`6c46c7eb`) | web `src/types/api.generated.ts` | Regenerate from the **release backend** after backend deploy (step 4.3). |
| 16 index migrations written with `CREATE INDEX CONCURRENTLY`; prod re-landed them as plain indexes (`#632`) | backend migrations | **Rewrite the 16 files on the release branch to plain `CREATE INDEX IF NOT EXISTS` with `lock_timeout`** (owner rule 2026-09-04). Same objects, no runner special path. |
| 7 prod-only migrations (`20260713150000`, `20260726130000`, `20260727130001`, `20260730080000`, `20260810201500`, `20260817123000`, `20260901090000`) | backend | **Keep the files** on the release branch (they are already applied on prod; keeping them keeps the repo describing prod). |
| GOAT threshold 5,000 RP tuning (`168adfb6`) | backend | Superseded by staging's Season 2 curve (GOAT 9,000); Season 3 change comes separately. Take staging. |
| **[v2] 15 migration files that exist on both branches with different bodies** (already applied on prod under main's body) — notably `20260904200100_lobby_daily_stats_and_retention` (main buckets by Asia/Tbilisi, staging by UTC), `20260904200200_purge_closed_lobbies_cron` (main has the newer purge shape; the job is unscheduled on prod), `20260904140000`, `20260904140100`, `20260820073707` (main rewrote to plain indexes) | backend migrations | **Resolve every one toward main's body** (prod is the truth; nothing re-runs because the versions are recorded). Pre-flight artifact: `git diff origin/main origin/staging -- supabase/migrations/` filtered to both-side files, reviewed line by line. |
| **[v2] Ledger / daily-type CHECK re-lists that narrow a live constraint.** `20260818110000_free_kicks` drops and re-creates `store_transaction_logs_event_type_check` with a list that omits `guess_the_goal_reward` (added on prod by `20260819100000`, already applied, so it will not re-run); the type only comes back at `20260820075000`. Every Guess the Goal payout between those two files would fail. Same pattern on `chk_daily_challenge_type` / `chk_questions_type` until the union at `20260906130000`. | backend migrations | **Patch every intermediate re-list on the release branch to include every value prod's live constraint has** (capture with `select conname, pg_get_constraintdef(oid) from pg_constraint where conname in (...)` first). Rehearsal gate: fail if any migration narrows a live CHECK. |
| **[v2] Guest identity routes have no flag.** `guest.routes.ts` mounts `POST /guest/session`, `/guest/standings` and `/guest/daily-challenges/*` with rate limits only; `GUEST_LOBBIES_*` gate lobbies and reconnect, not minting. Guest users and guest daily completions would start on prod at backend deploy. | backend | **Add `GUEST_SESSIONS_ENABLED` (default false) on the router mount** on the release branch; it becomes the E1 switch. |
| Prod campaign-quiz content commits (club pools, Spanish market pages) | backend + CMS data | Content lives in the prod DB, not the branch; nothing to carry. Verify after deploy that `/football-quiz/*` still serves. |
| `SUPABASE_AUTH_IP_FORWARDING_ENABLED` false on prod, true on staging | Railway | Leave prod value. |

---

## 1. Principles

1. **Backend first, then web.** Staging web emits 17 socket events and calls 54 HTTP paths the prod backend does not have (guest principal, all of Grid, all four coin games, system status). Web before backend = dead guest mode, dead Grid, dead mini games.
2. **Deploy dark, enable by flag.** Every new backend feature defaults off (`FOOTBALL_GRID_*`, `FREE_KICKS/TRIVIA_MINES/SQUAD_SPIN/ROAD_TO_GOAL_ENABLED`, `GUEST_LOBBIES_*`). Web flags: `NEXT_PUBLIC_GUEST_LOBBIES`, `NEXT_PUBLIC_MINI_GAMES_ENABLED` default off; **`NEXT_PUBLIC_TIC_TAC_TOE_ENABLED` defaults ON and must be set to `false` explicitly** until Grid content exists on prod. Flags are the first rollback lever; redeploying the previous build is the second.
3. **Migrations are forward-only.** Rollback of schema = restore from backup (Supabase PITR), so every data-mutating migration gets a pre-snapshot and a written reverse statement before the window. Never a full `pg_dump` through the pooler while live (Aug-17 incident). **[v2] "The old build runs on the new schema" is a claim to be rehearsed, not assumed** (2.1.4b).
4. **Content is a separate stream from code.** The code can ship with empty content tables; the feature stays dark until its content is loaded and verified (section 6).
5. **One window, one operator, one channel.** Deploy in the low-traffic window (Georgia 04:00–07:00, after the 02:20–03:50 pg_cron block), with the owner reachable. Every step has a verification and a stop condition.
6. **After go-live, `main` is the source of truth.** Staging is reset to `main` and only ever fast-forwards from it (section 8).

---

## 2. Pre-flight (days before, no downtime)

### 2.1 Backend release branch
1. `git checkout -b release/2026-09-prod origin/main`, `git merge origin/staging` (expect conflicts only in `config.ts`, the auction files, migrations dir, `openapi.json`, docs). Resolve per the table in section 0.
2. Rewrite the 16 CONCURRENTLY migrations to plain indexes (`CREATE INDEX IF NOT EXISTS`; `DROP INDEX IF EXISTS`). Keep version numbers. **[v2] Reason: prod consistency (`#632` already did this for the applied ones), and the runner's online path records the version in a separate statement, so a mid-file failure leaves an unrecorded half-built index.** Cost: a plain build holds an exclusive lock on the table for the build; with `lock_timeout = '5s'` a busy table aborts the migration and fails the deploy. Use a longer `lock_timeout` (30–60 s) with the runner's retry rather than 5 s, and rely on the window plus the 2.1.4 timings.
3. Re-add `AUCTION_ENABLED` (config + the 12 call sites) exactly as on main.
4. Run the full backend test suite and `tsc`; run the chaos/lobby harness against a local stack; apply **all 71 migrations to a data-sized copy of prod** (a Supabase branch restored from the latest backup, not a schema-only dump — timing a `VALIDATE CONSTRAINT` or an index build on an empty `store_transaction_logs` proves nothing) and record per-file timings plus a total; set a stop-if-exceeds threshold for the window. Include `20260718164633_restore_core_indexes` (10 plain indexes on `matches`, `lobbies`, `users`, `store_transaction_logs`) in the timing table. **[v2]**
4b. **[v2] Rollback rehearsal:** on that migrated copy, start the **`origin/main` build** and smoke it (ranked, auction, daily, store, Guess the Goal reward write, ticket refill function). Only if that passes may the plan say "backend rollback = redeploy previous build". Known facts: the backend connects as a privileged role so the new RLS on `questions`/`question_payloads` does not affect it; no NOT NULL columns without defaults were added; `refill_tickets_global()` keeps its new body after a build rollback (behaviourally identical plus the guest guard).
4c. **[v2] CMS check:** `cms/` and `qb-admin-cms/` are outside both repos. `20260717082323` enables RLS and revokes anon/authenticated on `questions` and `question_payloads` **with no policies on either branch**. Confirm which role each CMS uses for those tables; if either goes through PostgREST with anon/authenticated, add policies on the release branch or the CMS breaks at deploy (new build and old alike).
4d. **[v2] Inbound strictness:** read the penalty ready-ack (`#690`) and grid command handlers and confirm a payload without `ackToken` / `expectedStateVersion` / `commandId` is still accepted (or only rejected on the new Grid events). Old mobile clients are the ones that would break.
5. Codex review of the release diff vs `origin/main` (not vs staging) — the target is "what changes on prod", including the flag defaults section of `config.ts` and every migration.
6. Open the PR `release/2026-09-prod → main`; CodeRabbit; do **not** merge yet.

### 2.2 Prod data checks the migrations depend on (read-only queries, results attached to the PR)
| Check | Migration that fails if wrong | Query |
|---|---|---|
| Every `is_ai` user has `ai_kind` | `20260727190000_ai_kind_strict_check` (prod deferred this on purpose) | `select count(*) from users where is_ai and ai_kind is null` → must be 0, else backfill first |
| Every `users.country` is ISO-2 or null | `20260826192845_validate_user_country_codes` | `select country, count(*) from users where country !~ '^[A-Z]{2}$' group by 1` |
| Coin fraction consistency | `20260820063738` / `20260820082001` | `select count(*) from store_transaction_logs where coins_delta_minor is not null and coins_delta_minor <> coins_delta*100` (adapt to the migration's predicate) |
| 29 store product rows have the old English names | `20260915120000_store_neutral_kit_names` | compare `store_products.slug, name->>'en'` to the migration's mapping (already applied on prod via be#680 — expect a no-op; confirm) |
| No Road to Goal v2 rounds | `20260820082005_road_to_goal_v2_active_refunds` | table does not exist on prod → migration creates then refunds nothing; confirm 0 rows after |
| Categories the SEO migration will deactivate | `20260817170121_keep_seo_quiz_categories_inactive` | run its SELECT, **save the id list** as the reverse statement |
| `schema_migrations` has all 222 main versions and none of the 71 | runner | `select count(*) from supabase_migrations.schema_migrations` |
| **[v2] Live CHECK constraint bodies** (`store_transaction_logs_event_type_check`, `chk_daily_challenge_type`, `chk_daily_completion_type`, `chk_questions_type`) | every re-listing migration | `select conname, pg_get_constraintdef(oid) from pg_constraint where conname in (...)` — saved to the PR; every re-list on the release branch must be a superset |

### 2.3 Railway production variables (read the live values first; do not change yet)
- Must hold or boot fails: `RETENTION_EMAIL_MAX_LEAD_HOURS ≤ 96`; `REALTIME_TIMER_HANDLER_CONCURRENCY ≤ DB_INFLIGHT_LIMIT` (prod does not set the former; confirm).
- Add now, harmless before deploy: `FOOTBALL_GRID_RISK_HASH_SECRET` (32+ random chars; required the moment Grid coins/points turn on), `GUEST_SIGNAL_HMAC_KEY` (optional), `FOOTBALL_GRID_BOT_MODEL_VERSION=2`.
- Explicit offs (defaults are off, but write them so the intent is visible): `GUEST_SESSIONS_ENABLED=false` **[v2]**, `FOOTBALL_GRID_QUEUE_ENABLED=false`, `FOOTBALL_GRID_LOBBY_ENABLED=false`, `FOOTBALL_GRID_CONTENT_ENABLED=false`, `GUEST_LOBBIES_PROVISIONING_ENABLED=false`, `GUEST_LOBBIES_RECONNECT_ENABLED=false`, `TRIVIA_MINES_ENABLED=false`, `FREE_KICKS_ENABLED=false`, `SQUAD_SPIN_ENABLED=false`, `ROAD_TO_GOAL_ENABLED=false`, `POSSESSION_MCQ_ONLY=false` (Season 3 switch, separate decision).
- Keep prod-only: `AUCTION_ENABLED=true`, `REACTIVATION_JOURNEY_ENABLED`, `RETENTION_EMAIL_EXPERIMENT_ENABLED=true`, Resend keys, `MIGRATION_DATABASE_URL`.
- Always `--environment production --service quizball-backend` on every `railway variables` call (2026-09-12 trap).

### 2.4 Vercel production variables
- Set `NEXT_PUBLIC_TIC_TAC_TOE_ENABLED=false`, `NEXT_PUBLIC_MINI_GAMES_ENABLED=false`, `NEXT_PUBLIC_GUEST_LOBBIES=false` (explicit).
- **[v2] Also set explicitly** (missed by the inventory): `NEXT_PUBLIC_AUCTION_CARD_ENABLED=true` (defaults ON; prod today bakes it via `449735d8`/`01d62516`, which the merge replaces), `NEXT_PUBLIC_OBJECTIVES_ENABLED` (defaults ON — keep prod's current value), `NEXT_PUBLIC_ROAD_TO_GOAL_ENABLED=false`, `NEXT_PUBLIC_ROAD_TO_GOAL_ANALYTICS_ENABLED=false`, `NEXT_PUBLIC_FEATURE_EVENTS_ENABLED`, `NEXT_PUBLIC_GEORGIA_WC_EVENT_ENABLED` (both `=== 'true'`, keep prod values).
- Set `NEXT_PUBLIC_FOOTBALL_GRID_CDN_BASE_URL=https://lfbwhxvwubzeqkztghok.supabase.co/storage/v1/object/public/imgs/football-grid/v1` — **the code's hardcoded fallback is the staging project**; without this, prod would serve Grid art from staging storage (wrong project, staging egress bill).
- Confirm `NEXT_PUBLIC_SUPABASE_URL` = prod project, `NEXT_PUBLIC_API_URL` = prod API, `DEMOS_ROUTE_ENABLED` / `PROMO_ROUTE_ENABLED` unset.
- Add a production guard for `/dev/*` and `/game-mode-lab` (same `notFound()` pattern as `/demos/layout.tsx`) on the web release branch — today ~32 dev routes would be reachable on quizball.io.

### 2.5 Storage (prod `imgs` bucket)
- Publish the Grid asset release to prod: `npm run grid-assets:publish` against the prod project (release `v1` is immutable; verify with `grid-assets:verify-cdn`). Needed before Grid or the Auction/Grid trainings show real portraits. 50,964 objects; do it days ahead, throttled.
- Copy `club-logos` (317 vs 312), `competition-logos`, `league-logos`, `demos` artwork. Do **not** touch `question-images` (prod has 1,489, staging 233 — prod is the source there).

### 2.6 Backups
- Take a Supabase backup / confirm PITR is on for prod right before the window, **and that its retention covers the whole soak (7 days), and that a restore into a branch has been exercised once** — untested PITR is not a rollback plan. **[v2]** Record the restore point time (Georgia time).
- **[v2] PostHog:** check the plan's event quota before deploy day; guest funnel events on 68 indexed pages start the day the web ships.
- Schema-only `pg_dump -s` of prod through the **session** pooler (5432) is fine; no data dumps.

---

## 3. Deploy day — backend (window: Georgia 04:00)

| # | Step | Verify | Stop if |
|---|---|---|---|
| 3.1 | Announce the window; owner online. Note current prod deployment id (`railway deployment list --environment production --service quizball-backend`). **[v2] Start at Georgia 04:30, not 04:00: the 4-hourly ticket refill fires at 04:00 and `20260912130000` replaces that function's body; land it between ticks.** Confirm no Weekend League is in its registration or play window. | | |
| 3.2 | Merge `release/2026-09-prod → main` (squash off; keep history so `main` ⊇ `staging`). Railway auto-deploys; the pre-deploy step runs the 71 migrations under the advisory lock. | Migration log: 71 applied, 0 failed; timings within the rehearsal. Deploy status SUCCESS. | Migration fails → deploy aborts, old build keeps serving (this is by design). Fix forward or stop; **do not** hand-apply SQL. |
| 3.3 | Health: `/api/v1/health`, `/api/v1/system/status` (new), socket connect from a member account, one ranked match, one auction match, one daily, Weekend League page, store purchase. | All green; PostHog `api_error` flat; Railway CPU/DB connections normal for 15 min. | Error rate up → **rollback: Railway redeploy of the previous deployment id** (schema is additive, old build runs on it). |
| 3.4 | Confirm new workers are idle: four 15 s sweepers and the guest sweeper log nothing but empty passes; Grid sweep inert (queue flag off). | Railway logs. | |
| 3.5 | `DB_OUTAGE_BREAKER_ENABLED` is the one new live behaviour: watch for a false trip in the first hour (log line "degraded"). | | Trips falsely → set `DB_OUTAGE_BREAKER_ENABLED=false`. |
| 3.6 | Mobile app smoke (prod build from the store): login, ranked match, auction, daily. Contract is additive, so this is confirmation only. | | |

Rollback of 3.x = redeploy previous build. The only non-reversible parts are the data-mutating migrations (categories deactivation, store names no-op, ticket-refill function body); their reverse statements are attached to the PR from 2.2.

---

## 4. Deploy day — web (same window, after 3.3 is green)

| # | Step | Verify | Stop if |
|---|---|---|---|
| 4.1 | Web release branch: `release/2026-09-prod` off `origin/main`, merge `origin/staging`, apply the section 0 decisions (draft gate, dev-route guard), keep everything else. Vercel preview build must pass. | Preview URL smoke: `/`, `/en`, `/ka`, `/en/football-games/auction`, `/en/football-quiz`, sitemap, robots. | |
| 4.2 | Set Vercel production env (2.4). | `vercel env ls production` shows them. | |
| 4.3 | Regenerate `src/types/api.generated.ts` from the live prod backend spec (now = release backend) and commit to the release branch. | typecheck green. | |
| 4.4 | Merge `release → main`; Vercel production deploy. | Build green; `quizball.io/` → 307 to `/ka` or `/en` hub; old bookmarks (`/daily/challenges/moneyDrop`, `/play`) still resolve (middleware 308 aliases); `/football-quiz/*` campaign pages serve; sign-in, ranked, auction, daily, store, profile, leaderboard as a member; Turkish/Spanish/Georgian pages; no `/dev/*` reachable. | Anything broken → **Vercel instant rollback** to the previous production deployment (one click). Backend stays; it is backward compatible. |
| 4.5 | SEO: submit the new sitemap in Search Console; verify `robots.txt` disallows `/dev/`; check Core Web Vitals after 24 h (three.js/phaser bundles must be lazy). | | |

---

## 5. Enable in stages (each stage is its own day, its own flag flip, its own rollback = flip back)

| Stage | What turns on | Flags | Needs content? | Verify |
|---|---|---|---|---|
| E1 (deploy day + 1) | Public game pages already live (they are pages, not flags). Guest **sneak peeks** (dailies, coin games samples) are frontend-only. **[v2] The Auction and Tic Tac Toe pages carry a "Play now" CTA that needs guest provisioning; with the guest flags off a guest gets a socket refusal, not a message. Before E1: walk that CTA on the preview build with prod flag values and record what the visitor sees; if it is an error, hide the CTA (or fold E2 into E1).** | `GUEST_SESSIONS_ENABLED=true` if guest dailies/standings are wanted on day 1 | no | Guest funnel events in PostHog; no `/api` calls from sample rounds. |
| E2 | Guest friend rooms + guest "Play now" (Auction only until Grid content exists) | backend `GUEST_SESSIONS_ENABLED=true`, `GUEST_LOBBIES_PROVISIONING_ENABLED=true`, `GUEST_LOBBIES_RECONNECT_ENABLED=true`; web `NEXT_PUBLIC_GUEST_LOBBIES=true` | no | Guest smoke script (same as staging 2026-09-16); guest sweeper first run after 24 h. |
| E3 | Coin mini games: Free Kicks, Road to Goal, Trivia Mines (their content is question-based, already on prod) | `FREE_KICKS_ENABLED`, `ROAD_TO_GOAL_ENABLED`, `TRIVIA_MINES_ENABLED`; bots flags after a day; web `NEXT_PUBLIC_MINI_GAMES_ENABLED=true`, `NEXT_PUBLIC_ROAD_TO_GOAL_ENABLED=true` **[v2]** | Road to Goal calibration runs hourly once enabled | Wallet ledger idempotency: `store_transaction_logs` deltas match round outcomes for 20 rounds. |
| E4 | New dailies with data: Stat Sniper, Pass Chain, Missing XI | daily configs (`daily_challenge_configs` rows) | **yes — section 6** | One day's set renders in 4 locales; completion modal; leaderboard for Stat Sniper. |
| E5 | Squad Spin | `SQUAD_SPIN_ENABLED` | **yes, and no committed seeder** — needs the seeding script recovered/written first | |
| E6 | Football Grid (Tic Tac Toe): queue, lobby, coins, points, bots | `FOOTBALL_GRID_*` + `NEXT_PUBLIC_TIC_TAC_TOE_ENABLED=true` | **yes — the Grid runbook's 5 gates incl. the legal gate** (`docs/FOOTBALL-GRID-BACKEND-RUNBOOK.md`) | |
| E7 | Question locale fill (es/tr) | none (data) | yes — section 6 | Spanish/Turkish ranked match shows translated questions. |

Anything not reached by the end of the month simply stays dark; code and flags are already in place.

---

## 6. Content and data transfer (separate from code; each item has its own owner decision)

| Dataset | Prod today | Staging today | How it moves | Risk |
|---|---|---|---|---|
| Question es/tr translations (`questions`, `question_payloads` locale columns) | ka+en only (22,959 questions) | filled (27,711 questions incl. staging-only additions) | Run the Gemini fill scripts (`translate-missing-locales.ts`, `translate-goal-choreographies.ts`) **against prod**, question type by type, with `--since`; do not copy rows from staging (ids differ, staging has test questions). | CMS trigger on manual questions; run with the write flag. ~1 evening. |
| `football_players` + market values (portraits, aliases) | 1,311 / 32k | 50,476 / 667k | Dump-and-load the tables from staging via the session pooler in the window (schema identical after migrations). Then publish portraits to prod storage (2.5). | Big load; run in the low-traffic window with `statement_timeout`. |
| Grid content (`football_grid_boards`, criteria, memberships, aliases, releases, label locales) | empty | live | The Grid runbook: `npm run grid:content` generate → review → validate → publish → activate on prod, or load the reviewed release from staging. | Legal gate (player names/likeness), needs owner sign-off. |
| Pass Chain puzzles (`pass_chain_players`), Stat Sniper facts (questions type `statSniper`), Missing XI squads | empty | loaded | Re-run the generators against prod (`scripts/` per the daily content playbook) or dump-and-load; then add `daily_challenge_configs` rows. | Verify with the daily content audit script. |
| Squad Spin players/criteria/combos | empty | loaded | **Seeder must be recovered from the local build** (memory: built on LOCAL, not committed). Block E5 until it exists in `scripts/`. | |
| Auction cards (`player_clue_cards`, snapshots) | 5,604 / 8,320 | 5,950 / 20,759 | Already on prod; sync only PUBLISHED families that are new, via the checksummed content package tooling. | |
| Card Detective, FIFA Cards, Guess the Goal, Football Logic, WL content | on prod | on prod | Nothing to do. | |
| Persistent bot roster (`synthetic_bots`, 1,000) | on prod (live since July) | on staging | Nothing; Grid bots reuse the roster. | |
| Store products | 29 renames already applied on prod | same | Nothing. | |
| Campaign quiz pages (CMS) | prod-curated | different | Prod is the source. Nothing moves staging→prod. | |

---

## 7. Rollback matrix

| Layer | Trigger | Action | Time |
|---|---|---|---|
| A feature misbehaves | errors/complaints scoped to one mode | Flip its flag off (Railway or Vercel env) → redeploy env only | minutes |
| Backend build bad | error rate, latency, socket disconnects | `railway redeploy` previous deployment id (production/quizball-backend) | ~3 min |
| Web build bad | broken pages, hydration errors | Vercel → Deployments → previous production → "Instant rollback" | ~1 min |
| Migration failed mid-run | pre-deploy step non-zero | Nothing to do: deploy aborted, old build serving, partial migration rolled back (each file is one transaction). Fix the file, redeploy. | — |
| Data-mutating migration wrong | categories deactivated wrongly, ticket refill misbehaving | Apply the saved reverse statement; for the function, re-apply the previous body from `main` history | minutes |
| Content load wrong | bad boards/puzzles served | Flip the feature flag; truncate and reload the content tables (they are feature-private) | |
| Everything wrong | data corruption | Supabase PITR to the 2.6 restore point (last resort; loses minutes of prod writes) | 30–60 min |

The old backend build keeps working on the new schema (all changes additive), so a backend rollback never requires a schema rollback.

---

## 8. Convergence: make `main` and `staging` the same, and keep them that way

1. **[v2] After the soak (deploy + 7 days), not right after 4.4** — the old staging tree is the fallback if the release has to be pulled. Sequence: close or retarget every open PR against `staging`; tag `staging-pre-reset-2026-09` in both repos; then `git checkout staging && git reset --hard origin/main && git push --force-with-lease origin staging`. Tell everyone with local worktrees (there are ~40 web / ~50 backend) that staging moved. Railway/Vercel staging redeploy from the identical tree; in the same step reconcile the 30 staging-only Railway vars: keep the test flags on (guest, grid, mini games), delete the leftovers (`CHAOS_*`, `DEV_UNLIMITED_EMAILS` reviewed), add prod-only ones that staging needs (`AUCTION_ENABLED`).
2. New rule from that day: **branch from `main`, open the PR against `staging`**, merge (staging deploys), test, then open `staging → main` — which is a fast-forward because staging contains nothing but merged PRs on top of main. Hotfixes: PR to `main`, then `git merge main` into `staging` the same day. **No more cherry-picking**; if the branches ever diverge by more than a day's work, stop and reconcile before the next merge. **[v2] Make it enforceable: branch protection on `staging` and `main` (PRs only, no direct pushes; only 95 of the last 1,149 backend commits on staging came through PRs, so without protection the rule will not hold).**
3. Data: keep prod as the content source of truth; staging gets refreshed from prod (the `sync-question-locales-prod-to-staging` pattern), never the other way, except for the one-off transfers in section 6.
4. Retire the prod-only worktrees and the `prod/*` branch naming; one release branch per promotion is enough.

---

## 9. Owner decisions needed before pre-flight starts

1. **Homepage**: quizball.io root becomes the Football Games hub (geo 307 to `/ka` or `/en`). Yes/no. This is the most visible change and the hardest to undo in search results.
2. **Draft gate UI**: keep prod's no-gate behaviour or ship staging's gate.
3. **Which stages (E1–E7) launch this month**, and in which order. My recommendation: E1 + E2 + E3 in the first week; E4 after the daily content transfer; E7 (locales) as soon as the fill has run; E5/E6 only when their content and gates are done.
4. **Grid legal gate**: who signs off on player names/likeness for prod (runbook gate).
5. **Squad Spin**: recover the seeder or postpone the mode.
6. **Season 3 reset** (ranks, thresholds, loss table, inactivity) is a separate change on top of this batch; do not bundle it into the promotion window.
7. **Window**: proposed Georgia 04:30 (after the 04:00 ticket refill), a weekday with no Weekend League in registration or play.
8. **[v2] Guest identity on day 1**: with `GUEST_SESSIONS_ENABLED` added, decide whether guest sessions (dailies as a guest, standings) turn on with the web deploy (E1) or with guest rooms (E2). Recommendation: E1, since the public pages advertise it.

---

## 10. Verification checklist (copy into the release PR)

- [ ] 2.2 data checks attached, all green (or backfills done); live CHECK constraint bodies captured, every re-list verified a superset **[v2]**
- [ ] 2.1.4b old-build-on-new-schema rehearsal passed; 2.1.4c CMS role check done; 2.1.4d inbound strictness confirmed **[v2]**
- [ ] The 15 both-side migration files resolved toward main; the 16 CONCURRENTLY files rewritten **[v2]**
- [ ] Migration rehearsal on a prod-schema copy: 71 applied, timings noted
- [ ] Release backend PR: Codex ship + CodeRabbit + CI green; diff reviewed vs `main`
- [ ] Railway prod vars set (2.3), values re-read and pasted (secrets masked)
- [ ] Vercel prod vars set (2.4)
- [ ] Storage published (2.5), `grid-assets:verify-cdn` green against prod
- [ ] Backup/PITR point recorded
- [ ] Backend deployed, 3.3–3.6 green, 60 min soak
- [ ] Web release PR: Codex + CodeRabbit + preview smoke
- [ ] Web deployed, 4.4 checklist green, mobile app smoke green
- [ ] Sitemap submitted; robots verified
- [ ] Guest "Play now" CTA behaviour with prod flags recorded before E1 **[v2]**
- [ ] After the 7-day soak: PRs retargeted, `staging-pre-reset-2026-09` tagged, staging reset to main (8.1), env vars reconciled, both environments redeployed and green; branch protection on **[v2]**
- [ ] Stage flips (section 5) logged with date, flag, verifier

---

## 11. Review log

- **v1 → v2 (2026-09-18, deep-reasoner critique; Codex quota exhausted until 2026-09-19 12:42):** two blockers that made the "dark deploy" claim false — the ledger CHECK re-list gap that would break Guess the Goal payouts between two migrations, and unflagged guest identity routes — plus the untested old-build-on-new-schema rollback claim, 15 both-side migration files with different bodies (resolve toward main), CONCURRENTLY rewrite justification and data-sized timings, six missed web flags (two default on), the guest "Play now" CTA with guest flags off, a safer convergence sequence (after soak, PRs retargeted, tag, env reconciliation, branch protection), window at 04:30 after the ticket refill, PITR retention/restore test, PostHog quota, mobile inbound strictness. All folded into the sections marked **[v2]**.

---

## 12. Live-path audit: what actually changes for existing prod users, and what to hold back **[v2]**

Read-only file-level audit of the backend (2026-09-18). The commit count is misleading: `git diff --stat origin/main origin/staging -- src/` is 258 files / +25,927 / −2,000, and most of the additions are whole new modules behind flags that default off (football-grid 24 files, road-to-goal 14, squad-spin 12, trivia-mines 10, free-kicks 10, guest 8).

**Already identical on prod (byte-for-byte):** `ai-ranked.constants.ts`, `lobby-ranked-ai.service.ts`, `season-rp-formula.ts`, `match-cache.ts`, `possession-reveal-ack.ts`. Every ranked-AI difficulty, bot rotation, persistent-bot, penalty and draw change is already live; the two newest staging PRs (#689, #690) carry no prod code prod lacks.

**Ungated changes that alter live behaviour on day one** (none catastrophic; name them in the release PR):

| Area | Change | Risk | Hold-back |
|---|---|---|---|
| Auction matchmaking | `auction-matchmaking.service.ts` rewritten (1,579 → 869 lines: #469 queue bursts, #465 scout rotation, #474 bot retune; fallback window 5–18 s, pre-match 2.5/3/5 s) | **Highest in the batch**: largest untested live rewrite, and the `AUCTION_ENABLED` kill switch is gone | Re-add `AUCTION_ENABLED`; give auction its own soak day with the owner playing; flag stays the emergency stop |
| DB read-only breaker | `DB_OUTAGE_BREAKER_ENABLED` defaults **true**; `/health/db` becomes a write probe; ranked joins and lobby creation are refused while tripped | A false trip refuses matchmaking fleet-wide and can pull replicas from Railway rotation | Deploy with `DB_OUTAGE_BREAKER_ENABLED=false`; enable deliberately after the soak |
| Grid sweep timers | `startSweep`/`startRecovery` run regardless of `FOOTBALL_GRID_QUEUE_ENABLED` (750 ms Redis lock per replica) | Idle Redis chatter for a dark mode | `FOOTBALL_GRID_MM_SWEEP_MS=0` on prod until Grid launches |
| Ranked matchmaking | Batched session/wallet lookups, stage timing on `/health/db`, `MAX_CONCURRENT_PAIR_STARTS=6`, drafts defer 500 ms when the queue exceeds 50 | No pairing-policy change; a throughput profile prod has not run | Watch queue-wait and pair-start metrics for the first evening peak |
| Possession engine | New `second_half_preset` halftime branch (friend lobbies that preset both halves); AI answer retry on a busy round lock (750 ms); Q4 image question no longer falls back to the global pool; achievements skip guests | Fewer image questions in ranked; one new state-machine path (friendly only); rolling-deploy window where replicas disagree | Accept; deploy in one go (Railway replaces replicas together) |
| Lobbies | Ready-check and settings-update re-read the lobby under the lock; new `NOT_HOST` / `LOBBY_NOT_WAITING` rejections | Correct hardening; a racing client sees an error where it used to silently proceed | Accept |
| Answer matching | Apostrophes joined (Eto'o / O'Shea) on the live ranked answer path | Accepts a few more spellings | Accept |
| Weekend League | Standings readable signed-out (15 s cache), deleted users redacted, Hall of Fame grouped by user id | Public unauthenticated endpoint; first request per window does the full load | Accept (cache makes it cheap), or keep the auth requirement by reverting the nullable-user hunk |
| Store | Fractional coins (null-safe before the migration), batched ticket wallet reads | Low | Accept |
| Sockets/config | Rate limiting condition fixed (was always on anyway); two new boot-time validations; retention lead-hours max 168→96; GSC "configure together" check removed | Boot failure if prod env conflicts | Pre-flight 2.3 |

**Things on staging we do not want on prod, and how they are held back**

| Item | Why | How |
|---|---|---|
| `AUCTION_ENABLED` deletion | Loses the auction emergency stop during the riskiest rewrite | Revert the hunk on the release branch |
| Breaker on by default | New live gate on matchmaking | Env var off at deploy |
| Grid sweep | Redis traffic for a dark feature | `FOOTBALL_GRID_MM_SWEEP_MS=0` |
| Guest identity routes | Guest minting with no flag (finding 2) | `GUEST_SESSIONS_ENABLED` gate added on the release branch |
| `GET /api/v1/system/status` (unauthenticated, DB-free) | Discloses degraded state publicly | Keep (the web needs it as a socket-down fallback), or drop the mount if unwanted |
| Public WL standings | Exposure change | Keep or revert, owner call |
| `scripts/chaos/*`, `scripts/load/*`, `terminate-staging-connections.ts`, 111 new script files | Never run at boot; inert in the image | Just don't run them; drop `terminate-staging-connections.ts` from the release branch |
| `/dev/*`, `/game-mode-lab` web routes | Reachable on prod today | Layout guard (2.4) |
| Demo/lab assets (~26 MB in `public/`) | Bundle weight | Optional exclusion on the web release branch |
| 15 same-name migrations with different bodies | Runner skips them silently | Resolve toward main (section 0) |
| Ops outage-simulation endpoints, dev socket handler, staging-sync service | Already guarded by `NODE_ENV` allowlists / project-ref assertions | Verify prod `NODE_ENV=prod` and `STAGING_DATABASE_URL` unset |

Nothing in `src/` references test identities, the dev-unlimited allowlist, or staging credentials.
