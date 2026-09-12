# Auction training — scripted, guided mini auction (plan v1, 2026-09-12)

Owner ask: like the ranked training but for Auction — same "finding opponent" + showdown feel, every mechanic explained with
tooltips, fully scripted, and SHORT (a few minutes, not the full auction).

## Reuse boundary (from the exploration)
The auction UI under `src/features/auction/components` is prop-driven and socket-free; only `AuctionFlowScreen` (live branch) and
`realtime/useRealtimeAuctionMatch.ts` touch the socket/stores. `DemoAuction.tsx` already mounts `AuctionShowdownScreen` →
`AuctionGameScreen` → `AuctionResultsScreen` on top of the local engine `hooks/useAuctionGame.ts`. The training does the same, with a
SCRIPTED engine and the training tooltip layer (`TrainingTooltip`, `useTrainingTooltips` generalised to take a definitions array).
Render live, unmodified: `AuctionShowdownScreen`, `AuctionGameScreen` (formation reveal, clue reveal, bidding, reveal, solo pick),
`AuctionResultsScreen`. New: `src/features/auction-training/` (screen, provider, scripted engine, script, tooltip config).

## The scripted match (target ≈ 3 minutes)
Seats: the player + 2 bots (CoachBot + one more, fixed names/avatars). Budget $350M. **3 lots**, squad of 3 slots (FWD, MID, GK) —
the tutorial says "in the real auction you fill 7". Fixed roster (3 authored lots with clues in en/ka/es/tr), fixed formation,
no randomness anywhere.

| Lot | Beat | Script |
|---|---|---|
| 1 | Clues + starting price + bid | Clues reveal in pairs on a fixed cadence; guided: press "+10M" once at your turn; bots fold; you win at starting price + 10M. Reveal: hidden value > paid → profit tooltip. |
| 2 | Being outbid + fold | Bot A opens, bot B raises, guided "+10M" once, bot A raises again; guided **Fold** ("don't overpay: max bid keeps $20M per empty slot"). Bot A wins; reveal shows he overpaid (loss). |
| 3 | Chemistry + win | Same club as lot 1; guided bid, bots fold; reveal → chemistry link lights up (club threshold 2) → chemistry tooltip. |
Then the squad is complete (3/3) → results: profit × chemistry multiplier, AP explained; CTA per surface (member: main menu; guest: sign up).

Timers: the scripted engine owns ALL clocks (clue cadence, turn deadline, bot think) and takes `isPaused`; while a tooltip is open the
absolute deadlines (`turnEndsAt`, `biddingStartsAt`) are shifted forward by the paused duration so the children's countdowns freeze.
Guided actions: only the scripted control is enabled (`+10M` or `Fold`) with the same "Tap X" banner pattern as ranked; the turn
timer does not expire during a guided step.

## Tooltip beats (`data/auctionTooltipConfig.ts`, keys `training.tipAuction*` ×4 locales, short one-liners)
matchmaking → showdown (opponents, budget) → formation (slots to fill) → clues (pairs, 5 stats + 2 hints) → starting price (past
market value; current value hidden until the hammer) → your turn (+10M / fold, turn clock) → outbid → fold (reserve rule) → won lot
(hidden value → profit) → chemistry (club/league/nation, ×1.0–×3.1) → results (profit × chemistry, AP). Spotlight anchors: add
`data-*` attributes to the lot card, `TurnControls`, budget readout, timer, `AllSquads`/chemistry panel — additive, both layouts.

## Entry points
- Hub Auction dialog "Training": member → `AuctionTrainingScreen` in the full-screen practice layer (in place); guest → public
  Auction page, whose playable element becomes this training (replaces `DemoAuction` as the `auction` practice engine).
- First-time members: same offer/skip gate as ranked, per mode (`useTrainingCompletion` keyed by mode: ranked | auction).
- Exit: the screen's own "Skip training" (layer exit hidden, as ranked); completion marks the mode done.
- Analytics: training_started / skipped / completed with `mode: 'auction'`.

## Out of scope
Tic Tac Toe training (next), changes to the live auction engine, bots' real AI.

## Tests
Script simulation (lot outcomes, budgets, chemistry, final score), engine pause shifting deadlines, guided control gating, a
render test of the three stages with the scripted state, completion per mode. Existing auction tests untouched.

## v2 — after Codex plan review (2026-09-12)
- **Four lots, 3-slot squad (FWD, MID, GK), the player finishes 3/3.** L1 FWD: player OPENS at the starting price (the first bid
  equals the starting price), bots fold → win. L2 MID: bot A opens, bot B raises, player guided "+10M", bot A raises, player guided
  FOLD → bot A wins and overpays (reveal explains the loss; reserve rule = $20M per slot still empty after the purchase). L3 MID,
  same club as L1: bot A opens, player guided raise, bots fold → win → club chemistry lights. L4 GK: player opens, bots fold → 3/3.
  Bots end incomplete; results rank by adjusted profit with a formation-aware completion helper. Solo pick is EXCLUDED from the
  tutorial (documented in copy: "later in a real auction a solo pick can appear").
- **Fixtures are canonical**: 4 footballers with 5 stat-step entries + 2 localized hints, snapshots (scoring uses the last
  snapshot value), club/league/nation identities fixed; expected budgets, profits, chemistry (max 9 → ×1.9 for three players; copy
  says ×3.1 is the full-squad maximum) and final placings asserted by a simulation test.
- **Additive props on live components (defaults keep live behaviour)**: `squadSize` on AllSquads / StadiumBoard progress dots and
  the chemistry panel denominator; `isTeamComplete(team, size?)`; `clockPausedAt` threaded through AuctionGameScreen → both bidding
  layouts → CountdownTimer / StudyCountdown (numbers and bar freeze at the paused instant; engine shifts `turnEndsAt` /
  `biddingStartsAt` on resume); `allowedAction` ({kind:'bid', amount} | {kind:'fold'} | null) through AuctionGameScreen → bidding
  screens → TurnControls (only that control enabled, custom bid input hidden, Enter ignored, duplicate/stale clicks rejected in the
  engine by step id); `controlledTransitions` for Showdown readiness, RoundIntro, RevealScreen acknowledgement and FormationReveal so
  the script advances them (live defaults unchanged); results screen gets optional `actions` (training: main menu / sign up) and
  never a fake AP — AP is explained in a tooltip only. `data-auction-*` anchors on lot card, controls, budget, timer, squads.
- **Scripted engine** `useAuctionTrainingMatch(isPaused)`: same `AuctionGameState` shape, fixed step list, its own timers, pause
  shifts deadlines, guided gate stays active after the explanatory tooltip closes, one step id per action.
- **Tooltips**: explicit beat ids in order (matchmaking, showdown, formation, clues, starting price, your turn, outbid, fold/reserve,
  won lot → profit, chemistry, squad progress, results/AP), queued (an event never replaces an open tooltip), "Got it" separate from
  the guided action, shown-ids reset on replay; selectors scoped to the human seat; explanations start only once the intro/reveal
  content is visible.
- **Completion**: ranked keeps `quizball_training_complete`; auction gets `quizball_training_auction_complete` with the same
  per-user map (guest = browser flag); settings reset clears both; auction completion never affects ranked.
- **Entry/exit**: `AuctionModeModal` gains `onTraining`; member → in-place layer (exit control hidden, Escape routes to the
  training's skip), guest → public Auction page (its practice engine becomes this training); first-time member offer before
  "Find opponents" in the Auction dialog, skippable; distinct `training_skipped` / `training_completed` (mode) events.
- **i18n**: parameterize the "/7" squad strings where the training renders them (all four locales), offer modal copy/art per mode,
  guidance banners, result actions, AP example.
- **Tests**: script simulation, engine pause > every deadline, guided gating incl. custom/Enter/duplicates, both layouts, 3-slot
  progress/results, tooltip order, replay cleanup, storage isolation ranked vs auction and user vs guest, four locales, member/guest/
  Escape exits; plus the existing auction and ranked suites.
