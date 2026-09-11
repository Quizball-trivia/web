# Training match → "Play solo" (guests) + first-qualifier offer (members) — plan v1 (2026-09-09)

Owner decisions (2026-09-09): fully guided; shorter = ONE half + penalties; include Put in Order and Who Am I;
signed-out visitors play it freely from the hub / Ranked public page to understand Ranked; members get it once,
skippable, before their first of three qualifiers.

## Current state (branch feat/training-mode, based on staging e10f8ff, staged not committed)
12 scripted questions in two halves of 6 (`TRAINING_SCRIPT`), ban phase before each half (`TRAINING_FLOW_SCRIPT`),
fixed beats: Q2 player demo goal, Q11 guided wrong → CoachBot goal → 1-1 → 4-kick scripted shootout
(`TRAINING_PENALTY_SCRIPT`, player wins 2-1). Put in Order / Who Am I are canned localized rounds at indexes 4 and 8
(`trainingSpecialRounds.ts`) but `TrainingMatchProvider` disables them whenever the real category pool is active
(the live path loads mcq_single per half from `/api/v1/questions`, which needs a session). Known gaps: ban screen stalls
when the surviving category has < 6 published MCQs in the locale; HUD timer frozen at 10 under a "speed matters" tooltip.

## Target match (6 questions + penalties, ~4 min + 1.5 min)
1. MCQ, guided correct — timer / bar battle / possession tooltips.
2. MCQ, guided correct, scripted demo goal (+40 → 100) — 1-0.
3. Put in Order, guided ids.
4. Who Am I, guided clue answer.
5. MCQ, guided WRONG → CoachBot goal — 1-1 ("a wrong answer hands possession away").
6. MCQ, guided correct, "speed matters" with the clock actually running.
Full time 1-1 after one half → penalties (existing 4-kick script, player wins 2-1) → results.

## Changes
- `trainingScript.ts`: 6 entries; `TRAINING_FLOW_SCRIPT` loses the halftime ban; demo-goal index stays 1; CoachBot goal at index 4.
- `useTrainingMatch.ts`: when the first half ends (`nextIdx === QUESTIONS_PER_HALF`), go to `penalties` (the script
  guarantees a level score) instead of `halftime`; second-half code paths become unreachable and are removed with their tests.
- Special rounds: builders at indexes 2 and 3; provider no longer disables them when live questions are active
  (they are canned + localized, independent of the category pool). Live pool needs 4 MCQs per match, not 12.
- Stall fix: if the surviving category cannot supply 4 published `mcq_single` in the locale (or the request fails /
  takes > N s), fall back to the offline localized pool (`trainingQuestions.ts`). Guests always use the offline pool
  (`questionsOverride` + `banCategoriesOverride`), never the authenticated questions endpoint.
- Timer: Q6 runs the real clock; guided rounds keep the frozen clock (answers are forced).
- Guest entry (SEO worktree, after rebase): the hub's Ranked "Try the demo" → "Play solo", runs `TrainingMatchScreen`
  in the practice layer (replaces `DemoTraining`'s engine); new Ranked public page `/en/football-games/ranked-match`
  (+ ka / es) with copy body and this engine as the playable element (manifest `ranked` → `page: true`, `guest: demo`).
- Member entry: keep `TrainingOfferModal` before the first qualifier (zero placement matches, not completed/skipped);
  `startSession({ mode: "training" })` → `/game`. Completion flag per user id (guest = browser flag).
- Sudden-death tooltip is dead (no sudden death in the fixed script) → remove.

## Order
1. Commit + push the staged SEO/guest work (web feat/seo-public-games, backend feat/guest-sessions); update PRs #662/#516.
2. Rebase feat/training-mode onto the SEO web branch (conflicts expected: ModeSelectionScreen, PenaltyHUD,
   PossessionMatchViewport, messages/*.json).
3. Script + special rounds + fallback + timer, tests updated.
4. Guest + member wiring, Ranked page copy (en/es/ka), Codex + deep-reasoner diff review, PR to staging.

## v2 — after Codex + deep-reasoner plan reviews (2026-09-09)

### Round table (the script is the spec; a test simulates it)
Possession diff is cumulative; a scripted shot fires only when the projected position reaches 100 (player) or 0
(CoachBot), and a goal resets the diff to 0.

| # | Kind | Answer | Player / Bot pts | Diff after | Beat |
|---|------|--------|------------------|-----------|------|
| 0 | MCQ | guided correct | 60 / 20 | +40 | timer / bar battle / possession tooltips |
| 1 | MCQ | guided correct, `startPossessionDiff: 40` | 100 / 0 | +140 → goal → reset 0 | demo goal, 1-0 |
| 2 | Put in Order (canned) | `free` (guided ids) | 60 / 60 | 0 | ordering round |
| 3 | Who Am I (canned) | `free` (guided clue answer) | 40 / 80 | −40 | clues + clue points |
| 4 | MCQ | guided WRONG | 0 / 100 | −140 → CoachBot goal → reset 0 | 1-1, "a wrong answer hands possession away" |
| 5 | MCQ | guided correct, `clock: "running"` | 50 / 50 | 0 | "speed matters" with a real clock |
Full time 1-1 → penalties (existing 4-kick script, player 2-1) → results. `trainingScript.test.ts` simulates the
cumulative diff and asserts: shot plan at index 1 (player), at index 4 (CoachBot), none elsewhere; regulation 1-1.
Special-round points are authoritative from the script: the panel shows the script points, not its own arithmetic.

### Stage machine
- Remove the halftime branch in BOTH `advanceAfterReveal` and `continueAfterPhase` (the goal path is the one Q4 takes);
  regulation ends when the last script index resolves → `phase: "fulltime"` → penalties. Assert 1-1 at the transition.
- Training round count = `TRAINING_SCRIPT.length` (one exported constant); ranked's `QUESTIONS_PER_HALF` untouched.
- Penalties after half 1: `mirrored: false`, `targetGoal: "right"` (ranked's shootout follows the mirrored second half;
  training has no second half — commented).
- Dead code out: `TrainingHalftimeStage`, `startSecondHalf`, the `halftime` stage member, `TRAINING_FLOW_SCRIPT.halftime`,
  second-category query, `CATEGORY_QUESTION_FETCH_COUNT`; `HalftimeScreen.guidedCategoryId` hunk dropped from the shared diff.
- Q5 clock: a new script field `clock: "frozen" | "running"` separate from answer gating; guided answer stays the only
  enabled option; expiry auto-submits it; points stay fixed and the tooltip says "in Ranked, faster answers score more".

### Special rounds in the live path
- `TRAINING_SPECIAL_ROUND_BUILDERS` → `{2: putInOrder, 3: clues}`; both script entries `requiredAnswer: "free"`.
- Remove the `usingCategoryQuestions ? null : …` gate in `TrainingPlayingStage` (the real suppression); guided ids /
  clue answers / frozen time already flow through `TrainingSpecialRoundPanel`.
- Tutorial copy says the two canned rounds are "example rounds" (they are not from the surviving category).
- Tooltips remapped: bar-battle/possession at 0, goal at 1, put-in-order at 2, clues at 3, wrong-answer at 4, speed at 5;
  `halftime`, `penalty-sudden-death`, unused `tipShot*` deleted in en/es/ka; queue question-index and event tooltips
  so neither overwrites the other.

### Questions, fallback, guests
- Live pool = ONE category (the surviving ban), needs 4 DISTINCT usable `mcq_single` in the locale (validate localized
  text before flattening; no modulo repetition for match slots). Below that, on query error, or after 4 s → the offline
  localized pool; the chosen pool is committed for the run (a late response never swaps questions or ban targets).
- `offline` mode (derived from both overrides present) disables BOTH queries; guests always run offline
  (`questionsOverride` + `banCategoriesOverride`) — the questions/categories endpoints require a session and a 401
  triggers the client's sign-out path.
- Offline pool reordered so the strongest MCQs sit at slots 0, 1, 4, 5.
- Guest HUD shows no RP for the player (not "0 vs 1200").

### Completion + offer
- Guest completion stored under its own key; never the member map or the legacy global boolean.
- Completion marked on reaching results (not only on the results CTA).
- Offer gate waits for the ranked profile before qualifier confirmation can open, including `/play?mode=ranked`.

### Results
- Dots and accuracy from the script length; the deliberately wrong round is excluded from accuracy (or accuracy dropped).

### Shared-component diff hygiene (ranked must not change)
- Revert `PenaltyHUD` sudden-death reset to synchronous; call out the `useBarBattle` `mySeat` dep in the PR body;
  `goal.webp` `<img>`→`next/image` split out or justified; `BanCategoryCard.fadedOut` optional default false.
- Regression tests with the guided props absent: put-in-order arbitrary ordering + expiry auto-submit, ordinary clue
  guesses/give-up/deadline, unrestricted ban cards, bar battle without `forceShotResolution`, 5-round penalties.

### Tests + analytics
- Delete second-half tests; update script/pool length assertions; add the diff simulation, a 6-item override test,
  the distinct-count/fallback/timeout/late-response cases, a guest run asserting no network, and one integration run
  through both special panels, Q4 goal, Q5 clock, four penalties and results (1-1 / 2-1 / six dots).
- Events: `training_offered`, `training_started` (guest|member, entry: hub|page|offer), `training_skipped` (stage),
  `training_completed`, and the guest results CTA → `games_signup_click`.

### Rebase hygiene
After rebasing onto the SEO branch, diff `src/messages/{en,es,ka}.json` against `origin/staging` for lost/duplicate keys.

## v3 — Season 3: ranked is MCQ-only (owner, 2026-09-11)
Who Am I and Put in Order moved to the daily challenges; from Season 3 ranked/friendly possession matches serve MCQs only.
The tutorial follows: six guided MCQs (indexes 2 and 3 become MCQs, `TRAINING_SPECIAL_ROUND_BUILDERS` emptied, special-panel
driver and their tooltips removed), same possession table (Q4 wrong → CoachBot goal → 1-1 → penalties). Live pool needs 6 distinct
MCQs from the surviving category; offline pool unchanged.
