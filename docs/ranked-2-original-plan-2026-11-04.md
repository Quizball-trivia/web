# Ranked 2.0 (Zone match) — rollout plan and removal of the old possession ranked

Status 2026-11-02: client-only prototype on web branch `feat/zone-match-animation-lab`. This plan: playtest it with real
players first, switch ranked to it, then delete the old possession ranked.

The rules are NOT final. Playtest settings live in one place (`src/features/zone-match/zoneMatch.playtest.ts`): every
playstyle unlocked, categories dealt at random, card windows, energy budget and loadout size all expected to change.
The build must make those easy to change, not lock them in.

## Principle: keep ranked's outer shell, replace the game inside

| Old ranked layer | Fate |
|---|---|
| Queue + pairing (Redis/Lua), tickets, 10 s bot fallback, persistent bots | **Keep** |
| Match rows, history, RP settlement, seasons, placement, leaderboards, WL points | **Keep** (fed by a settlement bridge) |
| Possession game loop: tug bar, 12 fixed questions, halftime ban, penalties, `possession-*.ts`, `possession-ai.ts`, question dispatch | **Replace**, then delete |
| Category ban draft (`draft:*`) | Replace by zone match's own category step, then delete |

The new game loop runs on the **room runtime** (what Darts 501 and Conexiones use): per-seat hidden views, deadlines that
survive restarts (= sweeper), reconnect, ready gate, kill switch, client version gate. A finished room match writes
nothing to RP/WL/achievements, so playtests cannot break live ranked.

## No tickets — the ticket system goes (owner, 2026-11-02)

Ranked 2.0 is free and unlimited, and the whole wallet-ticket system is removed. Wallet tickets only ever gated
ranked (checked 2026-11-02): auction (friendly path consumes none), Tic Tac Toe (its "ticket" is a signed board
token), daily challenges (only echo the wallet) and the Weekend League entry claim (its own QP-based "ticket",
`wl-week.ts` — kept) do not use them. This also removes a GPT-review blocker (the ticket is charged inside the old
ban draft, with refunds on abort — nothing to move once tickets are gone).

- **Playtest (Phases 2–3):** the beta never touches tickets.
- **At the switch (Phase 4):** the ranked queue stops checking/charging tickets (queue preflight in
  `ranked.handler.ts` / `ranked-matchmaking.service.ts`, `consumeRankedTicketsWithConflictRetry` in the draft,
  refunds in `possession-completion.ts`, bot-reservation `abort_start_for_tickets`); partner ranked's ticket-like
  entry check is reviewed with partner ranked. Web drops the ticket count/cost on the Ranked card, Ranked/confirm
  dialogs (`ModeConfirmModal` `entryCost`), matchmaking and "out of tickets" screens. Anti-abuse instead of tickets:
  queue rate limits, one search or match per user, RP bot-farming rules.
- **Ticket system removal (with the switch, then cleanup):** store ticket packs and purchase cooldowns
  (`src/modules/store/*`, store routes/openapi), `ticket-refill.service.ts` and its job, "tickets refilled" mobile
  push, the `tickets` field in wallet/user/capabilities APIs and in web (sidebar/header counts, store, Play card),
  ticket analytics events, ticket error codes. Order: stop selling/refilling and hide the UI first; keep the API
  field returning a harmless value until old app versions are gone; drop the DB column last (additive-then-drop
  migration). Any tickets players bought: owner decides (refund to coins or let them lapse) before the store stops.

## Question content

- **MCQ duels:** the existing ranked-eligible question bank (`match-questions.repo` random by category, seen-history).
- **Number tiebreak: a separate ranked pool**, in the database only (per environment), never in a repo. Not the daily
  Stat Sniper questions: a question used in ranked must not spoil a daily and vice versa. Seed ~300 numeric items for
  the playtest (transfer fees, goals, caps, years…, en/es/ka/de/pt/ru/tr), tagged for zone match, same review flow as
  other content; staging first, prod via a reviewed additive script.
- **Repos stay public (owner, 2026-11-02): no questions or answers in code, ever** (workspace CLAUDE.md rule). The zone
  match prototype's `sampleNumericQuestions.ts` (31 real Stat Sniper questions with answers, web staging only) is
  replaced by invented practice items; dev pages and tests use invented fixtures; the engine gets all real content
  from the DB at match start, and answers reach a client only at the reveal.
- The wider audit (2026-11-02) found ~5k answered items already in backend `scripts/` + 3 migrations and ~200 in web
  demos/mini-games — a separate cleanup task, not part of this plan.

## Smart bots (playtests now, ranked fallback later)

Bots must feel like real opponents at the player's level, play the cards sensibly, and be calibrated from data — not
scripted. Build on what ranked already has instead of starting over:

**Reuse (backend, already live for possession ranked):** the persistent roster (1,000 bots with real profiles, avatars,
RP, history; `synthetic_player_profiles`), and the calibrated answer model `src/realtime/persistent-bot-gameplay.ts`
+ `src/modules/bots/calibration/*` — per-bot skill (theta) vs each question's human difficulty stats, human timing
priors (answer-time distributions, wrong-vs-right speed), hard caps so bots stay below the real top cohort, and the
win-rate governor (closed loop steering human win rate vs bots into 40–45%). Deterministic per (bot, match, question).

**New for zone match (in the shared engine, pure + seeded):**
1. **MCQ answers** — the existing calibrated model as the starting prior, adjusted for zone cards (50/50, Second
   Ball, sabotage change the odds), with its own zone calibration and governor state (not shared with possession).
2. **Number tiebreak guesses** — fitted per question kind from human guesses (years, heights, fees, attendances
   behave differently; handle exact hits, bounds, zero and no-answer), lock-in time from human priors.
3. **Category pick** — each bot gets per-category strengths (a skill vector from its theta + noise, stable per bot);
   picks its stronger categories with some randomness, like a human.
4. **Loadout** — archetypes (attacker / defender / trickster / balanced) choosing playstyles within the budget,
   weighted by the playtest card win-rate data, so loadouts look human and vary.
5. **In-match card play** — sees only what its seat can see (never the human's hidden card or a Dummy Run's truth;
   tested). Rules first (Golden Boot only on a shot, Gloves when defending at goal, Long Ball from own
   half, sabotage when behind or on a dangerous attack, save reactions for VAR/Shin Pads moments), then a 1-ply
   look-ahead using the engine on its own view (value for winning the match, incl. saving a card for later), with skill-scaled mistakes and human-like
   decision delays. Weaker bots waste cards more.
6. **Difficulty** — one knob (the bot's theta/RP) drives all of the above, so "same RP as you" means the same
   strength everywhere. Dev/playtest rooms can pick easy / normal / hard.

**Calibration loop:**
- **Offline:** a simulation harness runs the engine bot-vs-bot (tens of thousands of seeded matches) → card win
  rates, attacker win %, goals per match, match length by ruleset; used both to balance cards before playtests and
  to check bots of equal theta win ~50% against each other.
- **Online:** every duel is logged with human/bot tags; a weekly report compares bots to humans of the same RP band
  (accuracy, answer time, numeric distance, card choices, win rate) and the existing governor keeps human win rate
  vs bots in band. Bot params are versioned and frozen per release (as today); changes go through review.
- **Guardrails:** bots never read the human's answer; never above the top-cohort cap; never used to farm RP
  (existing ranked bot settlement rules apply); bots tagged in all analytics so balance data isn't skewed.

**Where it lands:** simple bot policy with the engine (Phase 1–2), simulation harness in Phase 2, solo-vs-bot
playtests in Phase 3 **after** human-vs-human data exists, calibrated roster bots as the ranked fallback in Phase 4.
The governor's 40–45% human win target vs "equal RP = equal strength" needs one explicit rule (owner call).
"Easy / normal / hard" are provisional labels until calibrated on zone data.

## Phases

### Phase 0 — now (S)
1. Replace the zone match answers file with invented practice items. 2. Commit the UI work on the branch (search screen, keeper, offside, arms,
celebrations, Champions League cup, net, balls). 3. Owner answers the open questions below.

### Phase 1 — shared engine + first real human match (L, ~1–1.5 weeks)
- Rewrite `zoneMatch.machine.ts` into a pure engine: seats 0/1, server time passed in, seeded RNG (no `Math.random`),
  content frozen at the start, codes instead of English text, ruleset options (window mode, budget, deck size,
  unlocked set, category dealing) read from the room options = the playtest knobs.
- `rules/cards/numeric/engine/bot` files byte-identical in web and backend (the aproximado convention); golden replay
  tests in both repos (seed + commands → state hash) catch drift.
- Per-seat view: hidden blind cards / Dummy Run / answers until reveal; correct option and numeric value only at reveal.
- The local prototype and the animation lab run on the same engine (so the 3D animations stay as they are).
- Every command carries its identity (phase, duel, question instance, attempt) and is checked server-side against the
  deadline, the seat's role and the option keys — a late answer for a replaced question (Substitution) or a stale
  reaction is rejected. Adversarial tests: delayed answers, retries, double acks, reactions after the window.
- Engine version + ruleset + content + RNG state frozen per match; supported engine versions listed explicitly
  (room registry); a CI check that the web and backend engine files hash the same.
- **Exit gate:** one server-run human-vs-human match plays through to the end, including a reconnect and a forfeit,
  on staging (vertical slice) — before any bot or ranked work. Re-estimate the rest after this.

### Phase 2 — backend playtest game (M–L, ~1 week)
- Room game `zone_match` (2 seats): deal (categories, MCQs + spares, numeric items), commands (pick category, choose
  card, react, play live card, answer by option key, guess, ack), deadlines per step, acks only shorten a step.
- Numeric pool table/tag + seed script (staging). Migrations in the Darts 501 pattern (one table per file).
- **Content check first:** count valid MCQs per category and locale; derive how many a match can need (10 attacks,
  variable duels, Substitution spares) and define what happens when a category runs out (no silent fallback to
  another category or repeats). Numeric pool: private import only, clients can't read it, no overlap with dailies,
  none of the items already exposed in the public repos.
- **Leaving / disconnects, defined per case:** ready-gate cancel (no result), intentional leave (= loss), reconnect
  expired, AFK, server outage (hold, not void). "Both away" must not let a losing player erase a match by
  coordinating a disconnect.
- **Timing:** the server reads the clock after taking the match lock, behind a per-replica limiter — so
  "who locked in first" needs an explicit ingress timestamp, and command-to-screen latency must be benchmarked under
  mixed room-game load before anything competitive depends on it (or drop "faster wins" for a coin flip).
- Per-duel log (ruleset/engine/bot versions; cards offered, equipped, legal, played and their context; correct/time;
  numeric distance; phase timings; disconnects; content shortfalls; rejected commands; human/bot) + SQL report: card
  pick and win rates *by situation* (not just overall), attacker win %, goals by zone, match length, timeouts. The
  room runtime deletes content/command rows after 30 days — export the playtest log before that. 3 PostHog events per match
  (started/completed/abandoned). Feedback button with match id. Kill switch.
- Solo vs bot: keep two engine seats; the bot seat gets server-controlled readiness and presence (the runtime's ready
  gate and presence sweep assume a socket per seat) and durable bot deadlines — opt-in for zone match only, without
  changing the 9 live room games. Bot-vs-bot simulation harness for balance.

### Phase 3 — web client + playtests on staging (M, ~1 week)
- `ZoneMatchRoom` maps the server view onto the existing Stage + 3D view. Flow: Pick playstyles → stadium search →
  showdown → kick-off.
- Entry "Ranked 2.0 (Beta)": **invite link first, human vs human**; solo vs bot once human data exists. Weekly
  playtest rounds with a target sample (e.g. 200+ human matches per ruleset) and written acceptance gates (match
  length, attacker win %, no dominant card, disconnect rate), read the report, tune the knobs, repeat.
- Move every tunable (timings, budget, deck size, windows, category dealing) into the ruleset options — today only two
  live in `zoneMatch.playtest.ts`. Codex + CodeRabbit before each merge; staging → prod beta only with the owner's OK.

### Contracts to design before Phase 4 (from the GPT review)
- **Persistence:** `ranked_zone` is rejected today by the `matches` variant constraints (incl. for `mode='ranked'`) —
  migration + types; seat mapping 0/1 → match seats; question counts, goals, timestamps, placement, decision method.
- **Tickets:** none in Ranked 2.0 (see "No tickets") — the queue just stops checking and charging; nothing to refund.
- **Completion:** room terminal state and legacy settlement commit separately today — persist completion, a unique
  room→match id and a durable settlement job atomically; retry without clients; release bot reservations only after
  settlement commits.
- **Everything completion feeds, not just RP:** XP, achievements, objectives (category objectives, lightning),
  mode statistics, seen-history, bot calibration (reads `match_answers`) — each gets the facts it needs (incl.
  numeric answers and retries).
- **Season economics:** the RP formula rewards draws and goal margins — simulate RP earned per match under zone
  scoring; fence the switch at a season boundary or drain old-engine matches before a reset.
- **Client capability:** check zone-match capability at queue join (before pairing, opponent reveal or charging) —
  stale web tabs, the mobile app (still sends possession-era ranked joins) and partner clients.

### Phase 4 — Ranked switches to zone match (L, ~2 weeks)
- Server switch `RANKED_ENGINE = possession | zone`, read at queue join, separate queue keys per engine (searches store
  the engine); running matches finish on their own engine. Rollback rehearsed on staging, incl. queued searches,
  pending starts, reconnects and mixed backend versions during a deploy.
- Ranked queue pairs as today, then opens a `zone_match` game with ranked context instead of the ban draft.
- Bot fallback: persistent roster bots as real seats, driven by the shared bot policy + the existing calibrated
  answer model and win-rate governor (see Smart bots).
- Settlement bridge: on finish, write the normal `matches` row (`mode='ranked'`, variant `ranked_zone`) +
  `match_players` in one transaction, then the existing `settleCompletedRankedMatch` → RP, seasons, placement,
  leaderboards, WL points unchanged. Leave = forfeit, both away = no contest.
- Map objectives/achievements that count ranked matches to the new mode; retire possession-only ones
  (penalties, halftime). Possibly start a new season at the switch.

### Phase 5 — delete the old possession ranked (M, after preconditions)
Preconditions (all): ranked on `zone` for a full season with no rollback; partner ranked moved or retired (it needs
its own settlement/protocol work; Weekend League already runs its own engine, `wl-live-engine.ts` — separate scope); old mobile-app versions that speak possession sockets cut off by the version gate;
no possession match started for 30 days.

Retire dependency by dependency (not a wildcard delete) — possession code is shared beyond ranked:
- **Still uses it:** friendly matches (possession), training (imports possession components), question content
  validation (`question-content-validation.ts`), partner dailies and bot calibration (import `possession-*` utils).
  First move shared utilities out, then migrate or explicitly keep friendly and training.
- **Then remove:** the ranked ticket checks/charging/refunds and their UI and logging; `src/realtime/possession-*.ts` / `possession-ai.ts` / `possession-question-dispatch.ts`, possession
  paths in `match.handler.ts` / `match-cache.ts`, the ban draft (once tickets moved), possession timers,
  `RANKED_ENGINE`; web `src/features/possession/*`, `RealtimePossessionMatchScreen`, possession parts of
  `stores/realtime-match`, possession socket handlers/types, ranked ban screens, the old matchmaking map.
- Keep replay/audit evidence the room runtime would delete after 30 days, before removing the old engine.
- Database: keep all history rows. Drop only possession-only columns/constraints later, in additive-then-drop
  migrations after an archive; never drop `matches`.
- One PR per repo, Codex + CodeRabbit, staging soak, then prod.

## Open questions for the owner
1. Card windows: once per round or before every question? (Both exist — can be a playtest switch.)
2. Can a ranked match end in a draw, or a tiebreak/shootout?
3. Beta entry: visible to everyone as "Beta", or invite link only?
4. Languages for the beta (card texts are English only today).
5. At the switch: new season / RP reset?
6. Weekend League and partner ranked: move to zone match or stay on possession for now?
7. Old mobile-app versions: still reaching ranked?
8. Bot strength during playtests.

## Rough timeline
Phase 0 now · first server-run human match ≈ 1–1.5 weeks · human playtests on staging ≈ 3–4 weeks (re-estimate
after the first match) · bots + contracts + Phase 4 ≈ 2–3 weeks after the rules settle · Phase 5 ≈ one season later.


## 2026-11-04 refresh — fastest path to real online playtests (friends + bots)

Owner goal: play the new game online with sockets, like today's ranked — match a friend by invite to test it, and get a
real opponent or a bot from a queue. What changed since 2026-11-02: 28 playstyles (Nutmeg, Bicycle Kick = close-range
comeback card, High Press, Time Wasting, Super Sub, Feint, Poker Face, Screamer added); rule switches in
`zoneMatch.playtest.ts` (`counters`, `downsides`, `attackerWinsTies`, `energy`, `hiddenLoadouts` all off;
`bicycle: 'comeback'`); bluffs generalised (`BLUFF_FAKES`); Bicycle Kick 'faster' variant needs answer timestamps
(`mcq.answeredAt`); showdown duets (both avatars play each card) in `zoneMatch.duets.ts`; balance simulator with smart
bots in `__sim__` (draws ~25%, every card 43–57% when forced into a loadout).

**Backend as of origin/staging `2122f733` (surveyed):** room runtime `src/modules/room/` (engine interface in
`room.engine.ts`: `deal/start/tick/afterOutage/seatsChanged/apply/terminal/standings/view`, optional
`parseOptions/versionFor/hydrate/refusal/absence`; registry `room.registry.ts` with versioned `ENGINES` and
`clientCanPlay`; 9 games incl. darts501, conexiones; kill switch `ROOM_GAMES_DISABLED`); socket `room.handler.ts`
(`room:ready/command/resync/leave/report/pointer`). Friend play already exists through lobbies
(`lobby:create` → invite code, `lobby:join_by_code`, `lobby:room_options`, `lobby:start`, `lobby:challenge*`). Ranked
queue `ranked-matchmaking.service.ts` (10 s → `startRankedAiForUser`), persistent bots behind
`PERSISTENT_BOTS_ENABLED` (off). No zone code on the backend yet. Deadlines advance lazily on load — check that a
timed zone step advances with nobody acting (needs a tick/sweeper, as `feedback_game_mode_sweepers` requires).

### Step A — shared engine (≈3–4 days)
Turn `zoneMatch.machine.ts` + `cards/rules/reveal/playtest` into a pure, seeded engine: seats 0/1, server time in,
seeded RNG, content frozen at deal, text as codes, `RULES` + timings as room options. Same files byte-identical in web
and backend (aproximado convention) with a CI hash check and golden replays (seed + commands → state hash). The web
prototype and the duets/animation labs run on it unchanged. Per-seat view hides the other's blind card / bluff truth /
answers until reveal; correct option and number only at reveal.

### Step B — backend room game `zone_match` (≈4–5 days)
- Engine adapter on the room runtime: `deal` (5 random categories per side from ranked-eligible categories with enough
  questions; MCQs via `match-questions.repo` with seen-history + spares for Substitution; number tiebreak items from a
  **new private zone numeric pool**, not Stat Sniper's daily rows — and note `scripts/stat-sniper-content/questions.json`
  in the public backend repo is exactly the kind of file the answers rule forbids, to clean up separately), `apply`
  (choose loadout, pick category, choose/react/live card, answer by option key, guess, ack), `tick` deadlines per step,
  `view` per seat, `terminal`/`standings`, `absence` (leave = loss, both away = no result).
- Migrations in the darts501 pattern (ROOM_GAMES/check constraints, numeric pool table). Seed the numeric pool on
  staging from `~/dev/quizball-private` only.
- Server-authoritative answer timestamps (ingress time) for Bicycle Kick 'faster' and any "faster wins".
- Kill switch + client capability (`clientCanPlay` lists `zone_match`).

### Step C — friends online on staging (≈2–3 days, the first playable milestone)
Web `ZoneMatchRoom`: lobby create/join by code (reuse the existing room-lobby UI) → playstyle picker (F) → showdown →
playstyle reveal (duets) → coin toss → categories → match → full time, all driven by `room:state` views and sent as
`room:command`. Reconnect via `room:resync`. Entry on staging only: "Ranked 2.0 (Beta) · play a friend". Exit gate:
two people on two phones finish a match, with a reconnect and a leave tested.

### Step D — quick match with real players or bots (≈4–5 days)
- A separate beta queue (zone queue keys, reusing the ranked Lua pairing) — no RP, no tickets, no ranked writes.
- Bot seat after 10 s: the room runtime needs a server-driven seat (ready/presence/deadlines without a socket) —
  opt-in for zone_match only. Bot brain = the simulator's smart policy (card values per situation, bluff/VAR logic)
  + the existing calibrated answer model (`persistent-bot-gameplay.ts`) for MCQ accuracy/timing and a fitted
  numeric-guess model; roster bots (names/avatars/RP) as opponents. Sees only its own seat's view (tested).
- Per-duel logging + 3 PostHog events + feedback button, so playtests produce balance data.


### GPT review of the refresh (2026-11-04, Codex gpt-6.1-sol xhigh, vs backend `2122f733`) — folded in
**Verdict:** the room runtime fits; A–D understated the server-authority rewrite and the bot seat.
- **Correction:** deadlines do NOT advance lazily — `deliver()` arms `room_phase` timers and a 1 s Postgres recovery
  poll expires overdue rooms (`room-realtime.service.ts`). Zone needs a deadline default for every step, no new sweeper.
- **Blocker — command contract (A):** prototype actions carry `side`/`now`/`content` from the client; answers, guesses and
  card commands lack phase/duel/question-instance identity. Server derives seat, time and content; every command
  names its phase, duel and question instance with bounded option keys / numeric values; stale commands are rejected
  (UUID idempotency alone doesn't catch a fresh stale command).
- **Blocker — no socketless seat (D):** lobby room-start rejects `is_ai` members; the ready gate needs two ready seats;
  presence sweep checks sockets. Needs persisted server-controlled seats, auto-ready, presence exemption and durable,
  fenced bot-action deadlines — zone_match only.
- **Blocker — bot reservations:** the reservation sweeper checks legacy `matches`; a reservation for a room match can be
  freed mid-game. Needs room ownership, heartbeat, recovery and terminal release.
- **Single-player assumptions in the prototype:** Home Advantage only lets `player` choose; `RULES` is process-global
  mutable state; RNG everywhere incl. a random-comparator shuffle. Freeze rules/content per match, persist RNG state,
  use a defined shuffle.
- **Views:** raw state holds answers, numeric values, both picks and bluff truth; `played/used/events/feed` leak too.
  Allow-listed seat views + tests that hidden states are indistinguishable. The simulator's bot reads hidden data —
  the server bot must use the seat view only.
- **Timing:** "faster wins" needs defined acceptance/order across expiry and replicas; numeric equal-distance ties
  already use speed (`numericDuel.ts:57`) — decide explicitly.
- **Content/history:** room matches don't update `match_players/match_questions` seen-history; zone needs its own history
  and pack selection, and a worst-case question budget (Substitution + Super Sub).
- **Friend lobbies do start room games** (`createFromLobby`); zone also needs `ROOM_GAMES`, both registries, DB
  constraints, max seats 2, frontend routing and **`GATED_ROOM_GAMES`** (broadcast filter).
- **Queue:** the pairing Lua is reusable; the ranked orchestration (tickets, lobbies, drafts) is not — beta keys need
  session exclusivity, cancel, disconnect and recovery (the session guard knows only ranked/auction/grid).
- Minor: room options allow 8 flat scalar fields (need a ruleset blob/version); `room_commands` stores hashes, not
  replayable commands; move minimal logging into C.

**Corrected order:** (1) freeze beta rules, inventory content, define commands/views/timing → (2) one thin A+B+C
invite-only human match incl. logs, idle completion, reconnect, leave, outage and stale-command tests → (3) direct
"play a bot" with socketless seats and reservation recovery → (4) quick-match pairing with bot fallback.
**Re-estimate:** A 5–7 d · B 5–8 d · C 3–5 d · D 8–15 d → **~3–4 weeks to friends online, +2–3 weeks for robust bots and
the queue**. A fitted numeric-guess model needs human data first.

### Step E — then the original Phase 4/5 (ranked switch, settlement bridge, possession removal) unchanged.

### Owner decisions still open
1. Draws (~25% today): allow, or decide by golden goal / number penalty?
2. Rule switches for the playtest: hidden loadouts on/off; counters/downsides on/off.
3. Bicycle Kick: 'comeback' (default) or 'faster'.
4. Beta visibility on prod later: invite-only or a public "Beta" card.

Rough timeline: A+B+C ≈ 2 weeks to friends playing online on staging; D ≈ +1 week for quick match with bots.

## Review log
- 2026-11-02: owner — no tickets in Ranked 2.0 (free, unlimited) and the whole wallet-ticket system (store packs,
  refill, push, UI) goes; checked: only ranked used wallet tickets. Ranked 2.0 must look good on mobile (phone web).
- 2026-11-02: plan reviewed by GPT (Codex gpt-6.1-sol, xhigh) against web + backend staging. 4 blockers (settlement
  variant constraint, ticket charging lives in the draft, completion/settlement not atomic, possession code shared
  beyond ranked) and 12 majors folded in above.
