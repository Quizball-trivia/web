# Tic Tac Toe (Football Grid) training — scripted, guided mini match (plan v1, 2026-09-12)

Owner ask (2026-09-12): "do the same script training for tictactoe" — like the auction training: same matchmaking → showdown → match
feel, every mechanic explained with tooltips, fully scripted, short. Guests get it as the practice round on the public Tic Tac Toe page;
members from the Tic Tac Toe dialog ("Training") and as a one-time offer before "Find opponent".

## Reuse boundary
`src/features/football-grid/FootballGridFlowScreen.tsx` already EXPORTS the presentational pieces the live match is built from, all
prop-driven and socket-free: `SearchScreen`, `GridHud`, `MatchBoard`, `FootballGridTurnPanel`, `PhaseOverlay`, `DrawOfferPrompt`,
`ResultSampleGallery`, `GridRewardChips`, `FootballGridNoticeScreen`, plus `FOOTBALL_GRID_COPY`. `FootballGridDevPreview.tsx` proves they
render from a fabricated `FootballGridState` (the socket state shape). The showdown (`ShowdownScreen`) and kickoff gate
(`KickoffCountdownOverlay`) are shared components. Only `FootballGridFlowScreen()` itself and `realtime/useRealtimeFootballGrid.ts`
touch the socket — the training never mounts them. Timers: the live pieces take a `remaining` (ms) prop and ISO deadlines in state; the
training computes `remaining` itself and freezes it while a tooltip is open (no component change needed for clocks).

New: `src/features/grid-training/` — `GridTrainingScreen`, scripted engine `useGridTrainingMatch(isPaused)` (single pause-aware timer,
same pattern as the auction engine), fixtures (board + valid answers + typeahead roster), script, tooltip config; reuse
`TrainingTooltip` and the queued-tooltip hook pattern from auction training (generalised to a beat union).

## The scripted match (one game, no bo3; ≈ 2–3 minutes)
Board: rows Real Madrid CF / Manchester United / Juventus × columns Brazil / France / Argentina (registry ids `real-madrid-cf`,
`manchester-united`, `juventus`, `br`, `fr`, `ar` so the live crests/flags render; labels en/ka from the registry, es/tr on the view).
Valid answers per cell come from the mini-game fixture (`features/mini-games/data/footballGrid.ts` grid-1, 5 per cell, with accepted
spellings/transliterations); the typeahead roster is that list + a few decoys (Cristiano Ronaldo, Messi) so suggestions look real.
Seats: the player (opener) vs CoachBot (same outfit as the other trainings). 40 s turn clock; the guided turn never expires (re-arms).

| Turn | Who | Script | Teaches |
|---|---|---|---|
| 1 | you | guided: tap the CENTRE cell (Man Utd × France), type a name (suggestions), Submit — any valid answer accepted | cell = row × column; typeahead; submit |
| 2 | bot | claims Real Madrid × Brazil (Roberto Carlos) after 2.5 s | opponent turn, claimed cell colours |
| 3 | you | guided MISTAKE: Juventus × Argentina, type "Cristiano Ronaldo" → wrong | wrong answer = turn lost; each footballer once |
| 4 | bot | claims Real Madrid × Argentina (Di Stéfano) → two in row 0 | threat |
| 5 | you | guided block: Real Madrid × France (Benzema / Zidane / Mbappé…) | blocking |
| 6 | bot | claims Juventus × Brazil → now you have centre + cell 1: column 1 needs Juventus × France | — |
| 7 | you | guided win: Juventus × France (Platini / Zidane / Pogba if unused) → line 1-4-7 | three in a row wins |
Then results: title WIN, avatars, 3 : 3 claims score, "sample answers" gallery from the fixture (no fake XP/coins — rewards are
explained in a tooltip), buttons Finish training / Play again (guest: Sign up to play for real).
Also explained by tooltip (not used): Skip (pass, 3 idle turns forfeit), Request draw, dead board / full board = draw, best-of-3.

## Tooltip beats (queued, one at a time; keys `training.tipGrid*` ×4 locales)
matchmaking → showdown → kickoff/board build ("rows are clubs, columns countries") → your turn (tap centre) → answer (type + submit) →
claimed → opponent's turn → the scripted wrong answer (before) → wrong result (after) → threat (block him) → blocked → HUD skip/draw
→ win line → results (rewards, leaderboard, bo3 in real matches). Spotlights via `data-grid-anchor` attributes (board, guided cell, answer
input, submit, turn pill, timer, skip, draw).

## Additive props on live components (defaults keep live behaviour)
- `MatchBoard`: `selectableCells?: number[] | null` (only these cells are enabled and get a pulsing ring) + `data-grid-anchor`.
- `FootballGridTurnPanel`: `roster?: GridTypeaheadPreparedPlayer[]` (skips the network roster) + anchors on input/submit.
- `GridHud`: anchors only (skip/draw are disabled through the existing `pendingCommand` flag while the script holds the turn;
  the tooltip still spotlights them).
- Results: extract the live results hero (title/note/avatars/score) into an exported `GridResultHero` used by both screens.
- No changes to `useRealtimeFootballGrid`, the store, or the live flow's behaviour.

## Engine `useGridTrainingMatch`
State = a real `FootballGridState` (phase handoff → countdown → turn → terminal, ISO deadlines, claims, turnNumber, stateVersion) so
every reused component renders unchanged; `remaining` derived every 100 ms and frozen under `isPaused`; deadlines shifted on resume;
scripted bot moves on a think timer; human `submitAnswer(cell, text)` validated against the fixture (normalized text vs accepted list,
"already used" across the match) only for the scripted cell; `feedback` mimics the command result (`correct` / `wrong` / `already_used`).
Win detection = the 8 lines. Beats fired from state transitions with the same readiness rule as auction (explain once content is
visible; the kickoff gate's 5 s runs under the tooltip? — NO: gate is paused too, its display reads `remaining`).

## Entry / exit / completion
`FootballGridModeModal.onTraining` (replaces `demoHref`, same as auction): guest → public Tic Tac Toe page (its practice round becomes
this training, replacing the mini-game free play); member → `/game` with `config.trainingGame='grid'`. One-time offer modal
(`game="grid"`, grid art + red card colour) before "Find opponent". Completion key `quizball_training_grid_complete` (per-user map,
guest slot). Skip = own control + Escape; analytics `training_*` with `game: 'grid'`. Dev page `/dev/grid-training`.

## Tests
Script simulation (7 turns, feedback outcomes, once-only footballer rule, win line, timer re-arm, pause shifting), tooltip order,
board `selectableCells`, turn panel with injected roster, screen-level flow with real tooltips (matchmaking → first claim → Escape),
completion isolation (ranked / auction / grid), four-locale copy, i18n parity.

## v2 — as built after Codex plan review (2026-09-12)
- Answers resolve through the mini-game's fuzzy matcher over `[name, ...accepted]` (canonical names always match; aliases and
  transliterations too); the tooltips suggest Pogba / Benzema / Trezeguet (Platini is not on the board). Footballers are once per
  match across both seats (`already_used`).
- Deviation policy: on a required claim (turns 1, 5, 7) a wrong or reused name shows the verdict and KEEPS the turn ("retry"
  tooltip: a real match would have cost it); on the mistake turn a wrong name loses the turn as taught, a valid one is accepted —
  the board still ends 1-4-7 either way. Actions are refused while a tooltip is open.
- The verdict stays visible: the seat stays on the player for 1.4 s after a resolution (the turn panel only shows feedback on your
  turn), then the bot thinks 2.5 s. The winning line is lit via `MatchBoard.highlightCells` for 2.6 s before the results.
- No tooltip fires during the kickoff gate (its progress bar is not pausable); "board" + "your turn" fire at turn 1, when the board
  has built in. The search screen's elapsed clock keeps ticking under the first tooltip (cosmetic, accepted).
- Additive props: `MatchBoard.selectableCells` intersects the live rule (your turn + open cell; `[]` disables all, null = live),
  `MatchBoard.highlightCells`, `FootballGridTurnPanel.roster` (skips the roster fetch entirely), `data-grid-anchor` hooks; the live
  results hero is extracted as `GridResultHero` (same markup; `completionTitle`/`completionNote`/`GRID_BACKGROUND_STYLE` exported).
- Entry: `FootballGridModeModal.onTraining` (replaces `demoHref`), offer modal `game="grid"` (grid icon, dialog red) before "Find
  opponent" with the chosen pack preserved for Skip; `/game` with `trainingGame: 'grid'`; guests: public Tic Tac Toe page's practice
  round (`DemoGridTraining`, replacing the mini-game free play), practice locales en/ka/es/tr (auction too). Escape skips only when
  the answer sheet did not consume it. Completion key `quizball_training_grid_complete`; analytics `game: 'grid'`.
- Fixed on the way: Spanish and Turkish rule copy said 20 seconds (live turns are 40 s).
- Codex diff review (5 findings) folded in: engines keep pending work across StrictMode effect replay (auction too — it had the
  same latent bug), Escape that only closes suggestions no longer reaches the training's skip (`preventDefault` in the panel), the
  answer sheet closes during the mistake verdict hold, the "answer" tooltip waits 400 ms for the sheet to settle, Georgian roster
  names added for the hinted players (Pogba / Benzema / Trezeguet).
