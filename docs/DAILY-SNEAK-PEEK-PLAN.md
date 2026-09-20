# Daily challenges: fixed sneak-peek sets for guests (plan v1, 2026-09-14)

## Problem
The public game pages (`/{locale}/{games}/{slug}`) let signed-out visitors play. For the multiplayer modes that is a scripted training; for the 11 daily challenge types it is TODAY'S REAL SET (`GuestDailyPlay` → `POST /api/v1/guest/daily-challenges/:type/session`), scored into `guest_daily_completions` keyed by the guest session. Two problems:
1. Product: the owner wants the daily pages to be a sneak peek of the format, not the real daily. A guest who plays the real set and then signs up (fresh account by design, nothing links the guest session) can replay today's set for coins with the answers known — a one-day leak, and it makes guest play an answer key.
2. Copy: every page says "Play training" / "Guest practice" / "Play the real thing … appear on the leaderboards", written for the trainings.

## Proposal
- One FROZEN set per daily type (11 types: clues/Who Am I, careerPath, moneyDrop, trueFalse, countdown, highLow, imposter, cardDetective, footballLogic, missingXi, passChain, statSniper, putInOrder is unpublished): real questions/puzzles from our pool, chosen from a past day that played well. Same for every visitor, every day, until edited. Existing translations (en/ka/es/tr) apply.
- Served by the existing guest endpoint in place of "today's selection"; the client engines are unchanged.
- Length: the type's normal format; question-list types (moneyDrop, trueFalse, countdown, highLow, imposter, statSniper, footballLogic) shortened to about half a round; single-puzzle types (careerPath, cardDetective, missingXi, passChain, clues) keep one full puzzle.
- Persistence: none for guests (no completion row, no best score). Replays restart. `guest_daily_completions` and the guest complete endpoint become unused for dailies.
- Storage of the frozen ids: config file in the backend for v1 (owner may prefer a CMS-editable table).
- Copy per group: trainings keep "Play training"; dailies and coin mini-games get "Sneak peek" label, "Try the game" button, note "A fixed sample set, the same every day. No account needed, nothing is saved." Bottom box becomes brand blue: title "Play for coins" (dailies/coins) / "Play online" (multiplayer), text "Sign in to play today's real challenge for coins and your streak" — no leaderboard sentence on dailies.
- Results screen: score + one sign-up line.

## Open decisions (owner)
1. Config file vs CMS table for the frozen ids.
2. Half-length vs full-length for question-list types.
3. Which past day to freeze per type (candidates to be proposed from completion data).

## v2 — as built (2026-09-14), after Codex's review of v1
Owner decision: frontend-only. The public daily pages never call the backend; they run the bundled sample session
(`buildDemoDailySession` → `toSneakPeekSession`) with the real engines and screens. Same questions for everyone, every day.

- Lengths: 5 questions for Money Drop / True or False / Imposter / Football Logic, all 10 Stat Sniper numbers (the page copy
  promises ten), 2 Who Am I clue chains, 3 Career Paths, 1 round of Countdown / Higher or Lower / Put in Order, 1 Missing XI
  squad, 1 Pass Chain puzzle, 2 Card Detective cards. Count fields follow the slice (`toSneakPeekSession.test.ts`).
- Stat Sniper shows a bundled "Sample leaderboard" (labelled); Pass Chain uses the local resolver with Georgian aliases added.
- Four languages: pool sessions for es/tr generated from the staging question pool by `scripts/gen-demo-pool-locales.py`
  (matches the same questions by English text; 47/47 matched), Money Drop questions likewise (14/15), hand fixtures via the
  `EXTRA` table in `demoDailySessions.ts`, Stat Sniper bank es/tr. `demoDailySessions.locales.test.ts` asserts every type is
  localized in es/tr/ka.
- Completion modal gets `practice` (no Weekend League / comeback queries or reminders in samples); every demo round is practice.
- Result screen primary action: "Play today's real challenge" (sign-in for guests with placement `sample_result`, straight to
  the game for members), replay secondary.
- Copy per group on the page ("Sneak peek" / "Try the game" / brand-blue "Play for coins" box; no leaderboard promise).
- Analytics: `access_type` (guest|member) is now a PostHog super property on every event; public-game events carry
  `session_kind` (sample|training); new `game_exit` (exit_stage playing|results). Dashboard spec in
  `docs/analytics/guest-play-dashboard.json` — the personal API key lacks `dashboard:write`/`insight:write`, so it must be
  created with a key that has them (or the PostHog MCP). Production has ~315 public-page views in the last 30 days, so the
  reports start near-empty.
- Not done: the guest daily endpoints on the backend still exist (unused by the web) — retire in a backend PR.
