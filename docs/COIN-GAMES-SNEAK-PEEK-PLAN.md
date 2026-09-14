# Coin games: sneak peeks for guests (plan v1, 2026-09-14)

## Decision (owner)
Option C, no guest wallet and no ledger anywhere: the public pages for Trivia Mines, Free Kicks, Road to Goal and Squad Spin
run a client-side sample of the real game — real screens, real rules and odds, fixed sample content in four languages,
a practice bankroll that lives only in the browser. No request to the coin endpoints. Members' real games are untouched.

## What exists
- Live member screens: `features/trivia-mines/TriviaMinesLive.tsx`, `features/squad-spin/SquadSpinLive.tsx`,
  `features/mini-games/components/FinalThird.tsx` (Free Kicks, `live` prop) and `RoadToGoal.tsx` (`live` prop). Each imports its
  API singleton (`lib/repositories/{triviaMines,squadSpin,freeKicks,roadToGoal}.repo.ts`) and `useStoreWallet()`, runs a
  heartbeat, fetches stats for `LiveActivityStrip`/`RunsBoard`, invalidates the wallet query after settlement.
- Public pages currently run older prototypes (`mini-*` demo slugs) with "practice points", en/ka only, no result card.
- Backend rules (constants files): Mines 25 tiles / 4 defenders / 3 scouts, per-state fair step `unknown/(unknown-hidden)`,
  97% at cash-out, 12 s question window, stake 5–500, pot cap 50k. Free Kicks: zones open in fixed order BL,BR,TL,TR,BC,TC,
  payout by open count 1.86/1.42/1.28/1.21/1.18, stake 5–500. Road to Goal: 11 zones, stakes 10/25/50, multipliers
  1.03…4.00, difficulties easy×4/medium×4/hard×3, 15 s per question. Squad Spin: 3/4/5 reels, tiers t3e/t3m/t4/t5 with
  accuracy priors 70/55/45/35%, step = 1/p, margin at cash-out, max 10 spins, cap 40× stake, 15 s, stake 5–500.

## Design
1. **Client injection, not a second UI.** Each live screen takes an optional `client` (same method surface as its API
   object) and an optional `sample` config `{ bankroll, onLeave }`. In sample mode: no heartbeat, no stats fetch (the
   activity strip and runs board are hidden), no wallet query (the practice chip shows the bankroll), no query invalidation,
   `LiveActivityStrip`/`RunsBoard` replaced by a "Sneak peek · practice coins" chip.
2. **Sample engines** (`features/coin-samples/engines/*.ts`): pure TypeScript state machines returning the exact API state
   shapes, with the rules ported from the backend constants (same numbers, same rounding: milli-coin pots, basis-point
   steps, caps). Deterministic per session: defenders/keeper/reels drawn from a seeded PRNG so a round can be replayed;
   commit hash / proof fields filled with a visible `sample` marker (no fairness claim in a sample).
3. **Practice bankroll** (`usePracticeBankroll`): 1,000 practice coins per day per browser, stored in localStorage under a
   date key (Georgia day), spent and credited by the engines; when it cannot cover the minimum stake the result card shows
   "Out of practice coins — back tomorrow, or play for real coins".
4. **Fixed sample content, four languages.** MCQ banks for Mines / Free Kicks / Road to Goal generated from the staging pool
   by the existing generator approach (mcq_single, matched by id, es/tr required, ~40 per game, difficulty-tagged for
   Road to Goal's ladder). Squad Spin: a frozen set of ~12 combos with accepted answers exported from `squad_spin_players`
   (one script, checked in), names matched with the same normalizer as live. Same content every day; the sample banks are
   listed in a `sample_only` exclusion so they never appear in rewarded rounds.
5. **End screen.** The brand-blue result card (existing `DemoResultScreen`) with cup, stake/pot outcome, primary
   "Play for real coins" (sign-in for guests, `/trivia-mines` etc. for members), replay, exit. Page copy per game group:
   "Sneak peek · 1,000 practice coins" label, "Try the game" button, note "A fixed sample with practice coins, the same every
   day. Nothing is saved." Metadata untouched (it already describes practice points on these pages).
6. **Analytics.** Existing `game_start/complete/exit` with `session_kind: sample` plus `practice_coins_left` and
   `sample_stake` on completion.

## Not in scope
Any server change; any persistence beyond the browser; Squad Spin calibration (the sample uses the fixed priors).

## Open questions for the owner
- Practice bankroll: 1,000 per day (proposed) vs per visit.
- Squad Spin sample: 3-reel only, or 4- and 5-reel spins too (more content to freeze, higher variance in a 1,000-coin sample).

## v2 — after Codex's review of v1 (2026-09-14)
Codex's critique (scratchpad `codex-coin-plan-findings.md`) held on every point that mattered: the rules summary was
incomplete, the bankroll had no transaction model, the result contract was missing, `sample_only` did not exist, and
"same odds" cannot be literal for Squad Spin. Decisions (owner defaults unless overridden):

1. **Odds = a frozen, labelled snapshot** of the rules as of 2026-09-14 (Squad Spin: launch-haircut margin 87.3% and the
   tier priors +1,000 bp skill gap; Road to Goal: zone accuracy priors). The page says "sample odds".
2. **Bankroll = 1,000 practice coins per visit, in memory only.** No storage → nothing to reconcile across reload, midnight
   or tabs, and "nothing is saved" stays literally true. When the balance cannot cover the selected stake the card offers
   "Reset practice coins" and "Play for real coins". A round is debited at start and credited once at settlement.
3. **Content exposure accepted and documented:** 60 of ~9,000 published MCQs and 16 of ~25,000 combos are bundled; no
   backend exclusion (server changes are out of scope by decision).
4. **Squad Spin three reels only**, both tiers (10 × t3e, 6 × t3m), fresh seed per round, fixed content.

### Architecture (revised)
- **Trivia Mines and Squad Spin** (self-contained live screens, ~300–450 lines): the live component gains `client` (same
  surface as the API object) and `sample` (practice wallet + lifecycle callbacks). Sample mode: no heartbeat, no stats,
  no activity strip / runs board, wallet from the practice balance, no query invalidation, `settleOnce` analytics
  suppressed (public-game events carry the outcome instead), commit/reveal fields carry a `sample` marker and the
  fairness panel is hidden.
- **Free Kicks and Road to Goal** (1,700 / 1,500-line components with 92 / 67 `live` branches): injecting a client there
  is the riskiest change for members. Instead their existing non-live path becomes the sample: it already runs client-side
  rules (Free Kicks uses the live multiplier table; Road runs a survival roll), so the work is to align it with the live
  rules where it drifts (Free Kicks whole-coin flooring and 2-zone reset on wrong/late; Road: exact survival odds from the
  rules manifest and zone priors, 15 s window, decision auto-bank), replace its fabricated stadium activity with the
  practice chip, feed it the frozen four-language bank, and wire the practice bankroll and result card.
- **Rule fidelity fixtures:** for each game a table of (state → action → expected pot/multiplier/outcome) derived from the
  backend constants, checked by unit tests against the engines (Mines fair step and 97% at cash-out with milli-coin
  pots, 21-pick auto-bank; Free Kicks 1.86/1.42/1.28/1.21/1.18 with whole-coin floors, post_goal gating; Road ladder
  1.03…4.00 with hundredths, survival odds = targetSurvivalBpForZone with bounded correct/wrong odds; Squad step =
  1/(accuracy + 1,000 bp) capped at 99%, 40× cap before margin, 10-spin auto-bank).
- **Sample engines are deterministic per round** (seeded PRNG), never across rounds.
- **Content:** `features/coin-samples/data/sampleQuestions.ts` (60 MCQs: 24 easy / 24 medium / 12 hard, four locales,
  stable ids, one correct of four) and `sampleSquadSpin.ts` (16 combos with reels, answers, aliases and acceptance
  policies; matching = the web's grid normalizer + exact alias, typo tolerance only for `safe_typo` aliases). Squad reels
  render en/ka labels as live does; es/tr fall back to English labels (as the live game would).
- **Result contract:** the sample layer receives `{ stake, payout, refund, net, reason }` per settlement and shows the
  brand-blue card: outcome line, "Play for real coins" (sign-in, or the real game for members), replay, exit.
- **Copy:** label "Sneak peek · 1,000 practice coins", button "Try the game", note "A fixed sample with sample odds and
  practice coins. No account rewards; nothing is saved." Page metadata unchanged (it already says practice).
- **Analytics:** `game_start` on accepted stake, `game_complete` on any terminal settlement with outcome/stake/payout/
  practice balance, `game_exit` otherwise; `session_kind: sample`; the coin-game member events are not emitted in samples.

## As built (2026-09-14, branch `feat/coin-sneak-peeks`)

- `src/features/coin-samples/` — `practiceBankroll.ts` (1,000 coins, memory only), `rng.ts` (seeded), `questionBank.ts`,
  engines `triviaMines.ts` / `squadSpin.ts` (API-shaped clients injected into the live screens) and `roadToGoalOdds.ts`
  (rules manifest v3 port used by the Road to Goal sample path), `CoinSampleView.tsx` (wrapper: bankroll, engines, result
  screen, analytics), data generated from staging by `scripts/gen-coin-sample-questions.py` and `scripts/gen-squad-spin-sample.py`.
- Live screens: `TriviaMinesLive` / `SquadSpinLive` take `client?` + `sample?`; `FinalThird` / `RoadToGoal` take `sample?`
  (`CoinSampleMode`: questions + practice wallet + `onSettled`). With both undefined the member path is unchanged.
- Wiring: `DemoModeView` (`coinSample` prop, `COIN_SAMPLE_SLUGS`) ← `PublicGameEmbed` for `mini-*` slugs; `public-games.ts`
  marks the four slugs as event-emitting; `PublicGameScreen` shows the coin copy (`coinSample.*` keys in en/ka/es/tr).
- Tests: engine rule tests (Mines, Squad Spin, Road odds) + a smoke render of all four games asserting no `fetch`.

### Review round (Codex, 2026-09-14) — all 13 findings folded
1. Practice wallet: authoritative ref in integer hundredths, debits validated synchronously (double-spend + lost fractions).
2. Road to Goal late answers go through the wrong-answer survival roll and settle through the wrapper; an abandoned decision auto-banks after 5 min.
3. Free Kicks: no wallet query in sample mode, 50,000 pot cap, fabricated activity/leaderboard/percentages and the prototype footer hidden.
4. Replay recreates the engines from a fresh seed (Squad Spin no longer resumes the previous result); out-of-coins state offers reset independently of settlement.
5. Sample mode emits no member analytics (round-started/error, Road viewed/engagement/settlement); `game_complete` now carries outcome, stake, payout and practice balance.
6. Squad Spin sample portraits are null (no backend-hosted image requests); Trivia Mines text resolves Turkish.
7. Free Kicks keeper draw, Road survival roll and question order use the wrapper's seeded generator.
Tests added: wallet hook (double debit, fractions, reset), deterministic 21-pick auto-bank.
