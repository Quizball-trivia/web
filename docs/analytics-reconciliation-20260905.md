# Analytics corrections and reconciliation — 2026-09-05

## Delivery status

- Live PostHog changes applied; raw dashboard snapshots kept out of the public release
  because they contain account-specific test exclusions.
- Frontend changes in this branch are NOT deployed. No database changes or migrations.
- Production branch base: `82c6d2e1` (freshly fetched). Dirty main checkout was untouched.

## Preserved acquisition strategy

Free SEO quizzes remain a discovery mechanism. Two separate questions now have separate funnels:

1. Google → free campaign quiz → signup CTA → new account (existing insight EHPVjXUn).
2. Google → new account → observed match (new insight XgBOvWCg).

The completion-first funnel syb9fhoP now uses ordered matched people instead of the
incorrect earliest-timestamp SQL join. This is not same-quiz-attempt attribution:
people can visit multiple quizzes/sessions. Header signups need not complete a quiz.
All use a seven-day conversion window; recent cohorts are immature.

Historical signup_page_view means signup TAB exposure. sAsMzQDW is labelled accordingly
and accepts all auth modes; social sign-in can create a new account. Raw stage totals
are explicitly not a funnel. Do not rewrite the meaning of historical events.

## Code changes

- Shared exact SEO route definitions include Spanish `/es/quiz-de-futbol`.
- Web Vitals retain homepages plus quiz hubs/details, excluding gameplay paths.
- Replay retains its existing delay/interaction trigger and sampling configuration;
  Spanish routes now qualify. This does not promise a recording for every visitor.
- `auth_panel_shown` records each welcome dialog opening irrespective of signin/signup/
  phone tab. Tab switches and rerenders do not inflate exposure. Existing signup-tab
  event remains for backwards compatibility. Campaign context is retained.
- No visible UI/authentication/gameplay changes.

## Live dashboard changes

- Four SEO traffic/vitals route filters corrected; Spanish Liverpool and badges pages
  appeared when the saved traffic query was rerun.
- Eight Matches & Game Modes queries now exclude nonproduction and configured test
  email patterns (snapshot as of this audit); FIFA Cards added to the daily chart.
- Daily completed/started ratio explicitly labelled raw, not matched conversion.
- Dashboard descriptions distinguish telemetry from authoritative database totals.
- Original dashboard definitions are backed up for rollback.

## Reconciliation

Window: September 1 00:00 through September 5 00:00, Asia/Tbilisi (four complete days).
Raw production totals below intentionally include internal/test humans on BOTH sides,
to audit delivery independently of mutable person filtering. AI accounts excluded.
SQL was read-only with 10–15 second statement timeouts. No gameplay writes/locks.

| Metric | Database | PostHog | Result |
|---|---:|---:|---|
| New non-AI accounts | 429 | 429 | Exact ID sets match; zero missing/extra |
| Auction completed matches | 1,118 | 1,118 | Exact match IDs present |
| Ranked completed matches | 3,167 | 2,865 | 302 match IDs missing in this event window |
| Friendly completed matches | 305 | 286 | 19 IDs missing (4 party quiz, 15 possession) |
| Daily completions | 2,319 | 2,193 | Aggregate browser coverage 94.6%; not an ID-level match |

No duplicated participant/match pairs in production match_completed in this window.
The database contains human participants in all the completed matches above. Missing
ranked events cannot be explained simply as bot-only matches. ALL 302 missing ranked
matches and ALL 19 missing friendly matches have state_payload.winnerDecisionMethod
equal to `forfeit`; ordinary completed match IDs match exactly. The backend forfeit
service calls completeMatch without the canonical match_completed emission used by
normal completion. This is a missing terminal-path instrumentation gap, not general
ad-blocker loss. Browser match_forfeit is not an authoritative completion event and
must not be silently substituted (disconnect/system forfeits can have no browser).

Daily challenge_id currently contains challenge TYPE, not unique completion ID.
It cannot support exact completion-level reconciliation. Six local-development events
were present in the original unfiltered dashboard; production filter now excludes them.
Server-persisted daily completions are authoritative; browser events occur after the
successful completion API response, so failures/blocking between these stages can lose
analytics without losing the game result. This is a hypothesis, not a proven cause.

## Release/verification gates still required

1. Deploy this frontend patch through normal staging → production promotion.
2. Open welcome auth in signin/signup/phone modes, tab-switch, close/reopen, and verify
   new auth_panel_shown ingestion and campaign context without creating fake accounts.
3. After schema ingestion, add an auth_panel_shown → auth_started (ANY mode) →
   backend prod account_created funnel to dashboard 2047320, with production browser
   filters, configured test exclusions and a seven-day ordered person window.
   Label coverage from actual deployment date; do not mix its denominator with old history.
4. Verify Spanish delayed replay eligibility and actual field vitals after release.
5. Add idempotent canonical completion telemetry to backend forfeit/recovery terminal
   paths before claiming game totals are fully certified. Do not
   backfill events or alter gameplay terminal paths without idempotency tests.
6. Daily events need server completion IDs/day for exact reconciliation; durable
   server-side completion delivery is a separate reliability improvement.

This audit covers the SEO dashboards and all eight Matches & Game Modes tiles, not
every separate experiment, retention or mode-specific dashboard in the project.

## Validation

- 91 tests passed, including welcome auth integration, StrictMode exposure dedupe,
  Spanish replay routes and URL sanitization/capture tests.
- Type-check passed.
- Production build passed with isolated locked dependencies. Initial shared-dependency
  symlink was rejected by Turbopack; replaced with a local `npm ci` install and reran.
- Changed-file lint: zero errors; 18 pre-existing unused-parameter warnings in the
  welcome test harness.
- Saved dashboard queries tested before saving; Spanish traffic query rerun afterward.
