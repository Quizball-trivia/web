# Guest "Play now" for Tic Tac Toe and Auction — plan (2026-09-16)

Owner decisions (2026-09-16):
- Scope is **Tic Tac Toe and Auction only**. Ranked is untouched: its hub modal, its sign-in gating, and the public Ranked page stay exactly as they are.
- Signed-out visitors who click the Auction or Tic Tac Toe card on the play hub go **straight to the public game page** (`/{locale}/football-games/auction`, `/{locale}/football-games/football-tic-tac-toe`). The mode modal only opens for signed-in members.
- On those two public pages: the hero card button becomes **"Play now"** = an anonymous match against the real smart bots (the same bots the matchmaking fallback uses when no human is queued). No rewards, no leaderboard, nothing saved. Both sides show **anonymous guest-style names** (the "Adjective Noun 1234" names guests already get); the visitor must not be told they are playing bots.
- The lower blue card becomes **"Play training"** (the existing scripted training).
- A **"Play ranked"** button sits above the Top 10 and opens the sign-up dialog (CTA: sign up to play for ranked points).
- Leaderboard names must not crop ("PLA…") on the public pages.

## What exists today (verified in code)

Backend (`staging-backend`):
- Guests are real `users` rows (`is_guest = true`) with a deterministic nickname from `guestNameCandidates(sessionId)` → `"${adjective} ${noun} ${1000-9999}"` (`src/modules/guest/guest-identity.ts`) and one of three default kits.
- Capabilities (`src/modules/users/capabilities.ts`): guests hold only `createFriendlyRoom`/`joinFriendlyRoom`. `grid:search_start` → `footballGridMatchmakingService.handleSearchStart` asserts `queueEntry`; `auction:start_ai_match` → `auctionRealtimeService.handleStartAiMatch` asserts `queueEntry`. Both refuse guests today.
- Grid bot fallback: `startBotPair(io, search)` + `deliverBotPair(io, result)` in `src/realtime/services/football-grid-matchmaking.service.ts` (synthetic-bot reservation, `footballGridService.createMatch({ origin: 'random', players: [human, bot] })`, `emitMatchFound`). It requires the search to still be in the Redis queue (`searchesStillExclusivelyQueued`) and a ranked profile for the human (`rankedService.ensureProfile`).
- Grid settlement already isolates guests: `football-grid-settlement.service.ts` writes an `ineligible/guest` eligibility row and pays nothing; grid leaderboard excludes `is_guest`.
- Grid opponent name reaches the client only through `grid:match_found` / rejoin payloads (`opponent.username = opponentUser?.nickname`, `football-grid-realtime.service.ts:638, :890`).
- Auction: `startAuctionMatchForHumans(io, { humanPlayers, formation, locale, sourceSocket }, { origin })` fills the empty seats with `generateAuctionBotProfiles(count)` (ranked-style usernames such as "lukaberidze" + generated avatars). `origin: 'lobby'` awards no AP. Human players carry `isGuest`, and the auction leaderboard excludes guests. A guest-hosted friendly auction room (1 human + 6 bots) is already allowed by `lobby-auction-start.service.ts`.
- Guest rate limits: `src/modules/guest/guest-rate-limit.ts` (`socket_admission`, `lobby_create` 5/h, `principal`).

Web (`friend-web`):
- Hub: `src/features/play/ModeSelectionScreen.tsx` opens `AuctionModeModal` / `FootballGridModeModal` on card click for everyone (guest gating happens inside the modal actions). `publicPageFor(modeId)` already resolves the public page path.
- Public page: `src/features/marketing/PublicGameScreen.tsx` — hero card = `PublicGameEmbed` (button `labels.start` = "Play training", note, PracticeLayer overlay with the scripted training); column 2 = art + `PublicTopTen`; bottom blue card = "Play online" + `SignInLink`. `PracticeLayer` is a fixed overlay, so where the launcher sits in the DOM does not matter.
- Leaderboard rows: `src/features/leaderboard/components/LeaderboardTable.tsx:135` — `truncate` on the username.
- Grid flow: `src/features/football-grid/FootballGridFlowScreen.tsx` — `source` query (`matchmaking` | `friend_lobby`), `autoStart` only for members; guests resolve a principal via `useEnsureGuestPrincipal`.
- Auction flow: `src/features/auction/AuctionFlowScreen.tsx` — guests only attach to an existing match (friend room); `useRealtimeAuctionMatch.startAiMatch` emits `auction:start_ai_match`.
- Guest principal helpers: `src/lib/realtime/realtime-principal.ts` (`ensureGuestPrincipal(locale)`, `useRealtimePrincipal`, `useEnsureGuestPrincipal`).

## Design

### 1. Hub: signed-out card click → public page
`ModeSelectionScreen.tsx`: the Auction and Tic Tac Toe card `onClick`/`onKeyDown` become `isGuest ? router.push(publicPageFor('auction'|'grid')) : setXModalOpen(true)`. The modals and their guest branches stay for members (no other change). Ranked untouched.

### 2. Public pages (grid + auction only)
`PublicGameScreen.tsx` gets a `botPlay` layout for `modeId === 'grid' | 'auction'`:
- **Hero card**: label "Guest practice" → "Play now"-style label ("Quick match"), button **"Play now"** (new `PlayNowLink`, client): guest → `ensureGuestPrincipal(locale)` then `router.push('/tic-tac-toe?source=practice_bot&pack=european')` / `router.push('/auction?source=practice_bot')`; member → `game.playPath` (normal online flow). Note text: "No account needed. A quick match, nothing is saved." (never mentions bots). If the guest principal is refused (provisioning off / rate limit) → open the sign-in dialog, as `useDirectFriendRoom` does.
- **Bottom blue card** (replaces "Play online" on these two pages): title **"Play training"**, text "Learn the rules in a short guided round.", and the existing `PublicGameEmbed` launcher (button label "Play training") — the scripted training, unchanged.
- **Above the Top 10**: **"Play ranked"** yellow button + one line "Sign up to play for ranked points and get on the leaderboard." → `SignInLink placement="game_page_ranked"` (opens the sign-up dialog for guests, `playPath` for members).
- Other pages (ranked, dailies, coin games) keep the current layout untouched.
- Copy in the four locales (en/ka/es/tr) in the `L` map.

### 3. Leaderboard names
`LeaderboardTable` gets a `wrapNames` prop (default false, app leaderboard unchanged). `PublicTopTen` passes it: username cell becomes `[overflow-wrap:anywhere] leading-tight` with a slightly smaller size on narrow columns instead of `truncate`.

### 4. Backend: guest bot matches
New guest capability: `practiceBotMatch` (guests + members hold it; the services also require `is_guest` so members keep their normal queues). Kill switch `GUEST_BOT_MATCHES_ENABLED` (default true, staging/prod env). Rate limit: new `GuestOperation` `'bot_match'` (limit 30/h per guest user id).

**Grid** — event `grid:practice_bot_start { locale, theme }` → `footballGridMatchmakingService.handlePracticeBotStart(io, socket, input)`:
1. Requires `socket.data.user.is_guest`, flags (`FOOTBALL_GRID_QUEUE_ENABLED`, `FOOTBALL_GRID_CONTENT_ENABLED`, `FOOTBALL_GRID_BOTS_ENABLED`, `GUEST_BOT_MATCHES_ENABLED`), rate limit; otherwise `grid:error` (`GRID_UNAVAILABLE` / `CAPABILITY_REQUIRED`).
2. Same active-match resume/sweep as `handleSearchStart` (a reload mid-match re-attaches instead of starting a second match), same `userSessionGuardService.prepareForQueueJoin` guard.
3. Builds a `QueuedGridSearch` (`searchId` = uuid, `queuedAt = fallbackAt = now`) and calls the bot pairing directly. `startBotPair` is refactored into `pairSearchWithBot(io, search, { requireQueued })`: the queue path keeps `requireQueued: true`; the practice path skips the Redis membership check (the search never enters the queue, so a human can never be paired with the guest). Everything else is the real fallback: synthetic-bot selection/reservation by strength, `createMatch({ origin: 'random' })`, `deliverBotPair` (match_found, metrics, analytics with `opponentType: 'bot'`).
4. Bot strength: `rankedService.ensureProfile` must not create a ranked profile for a guest — pass a fixed newcomer profile (the same tier/RP a brand-new member starts with) to `syntheticBotSelectionService.selectAndReserve`.
5. Names: in `emitMatchFound` and the rejoin path, when the viewer is a guest and the opponent is a bot, `username` = `guestNameCandidates(\`grid-bot:${matchId}\`)[0]` (deterministic per match, so reloads agree), `avatarUrl: null`, `avatarCustomization` = `guestKitFor(matchId)`; `rp` omitted. The guest's own name is already anonymous. Result/series payloads carry no names (verified: only these two spots read `nickname`).
6. Rewards: none for guests (existing settlement rule). The bot side is settled exactly as in the real fallback (bot RP/matches-today bookkeeping stays real, as the owner asked).
7. Rematch: unchanged (whatever bot rematch does today). Web "Play again" on a practice match re-issues `grid:practice_bot_start`.

**Auction** — event `auction:practice_bot_start { locale, formation? }` → `auctionRealtimeService.handleStartPracticeMatch`:
1. Same guards as above (guest only, flags, rate limit).
2. `startAuctionMatchForHumans(io, { humanPlayers: [{ userId, displayName: nickname, isGuest: true }], formation, locale, sourceSocket }, { origin: 'lobby', anonymousBots: true })` — `origin: 'lobby'` awards no AP; guests are excluded from the leaderboard already.
3. `anonymousBots`: `generateAuctionBotProfiles(count, { style: 'guest' })` draws distinct guest-style names from `guestNameCandidates(\`auction-bot:${seed}\`, 12)` (dedupe, skip names taken by real users like the current pool does) with default guest kits instead of generated avatars, so every seat looks like an anonymous guest.
4. The existing `auction:state` push + `attachUserSocketsToAuctionMatch` deliver the match; the web attaches like a friend-room guest does today.

Both new events are added to `socket.types.ts` (backend + web), the zod schemas, the handler files (`runLimited` like their siblings), and the capability table comment.

### 5. Web flows
- `FootballGridFlowScreen`: `source === 'practice_bot'` → when `principal.kind === 'guest'` and assets are ready, call `grid.actions.startPracticeBot()` (new action in `useRealtimeFootballGrid`, emits `grid:practice_bot_start`). Search states (`searching → matched`) render exactly as the real queue does. Members with `source=practice_bot` fall back to the normal member flow.
- `AuctionFlowScreen`: `source === 'practice_bot'` + guest principal → emit `auction:practice_bot_start` once (guard ref), then the existing match attach/rejoin handles the rest. The current "guest without a match → back to the public page" redirect must not fire while the start is pending.
- Results screens: guests already see the account CTA; no change.
- Analytics: `trackGameStart` with `sessionKind: 'bot_match'` from the Play-now click (PostHog), plus the backend's existing grid/auction match analytics.

### 6. Out of scope / untouched
Ranked (modal, page, AI sim), guest friend rooms, the app leaderboard, mobile app, prod promotion (this ships to staging only with the rest of the batch).

### 7. Tests
- Backend: `pairSearchWithBot` unit test for the `requireQueued: false` path; handler tests for capability/flag/rate-limit refusals; name anonymisation in `emitMatchFound` for guest viewer + bot opponent; auction bot profiles in guest style.
- Web: `ModeSelectionScreen` guest click → public page (no modal); `PublicGameScreen` grid/auction layout (Play now / Play training / Play ranked, ranked page unchanged); `LeaderboardTable` wrapNames; message parity (no new message keys — copy lives in the SEO `L` map).
- Manual on localhost:3000 + local backend: guest Play now for both games, reload mid-match, "Play again", sign-up CTA, member path unchanged.

## Open questions for the owner
- "Footechange quizzes" → "Football quizzes": the string does not exist in either repo (web has "Football Quizzes" in `home-copy.ts`). Need a screenshot of where it appears.


## Codex plan review (round 1) → what changed

Verdict was "revise" with 14 findings; the build folds in the ones that held up:

- **Practice searches can never enter the human queue.** `QueuedGridSearch.practice` is persisted in the pairing snapshot; `restoreSearch` refuses practice searches, so both the immediate failure path and stale-pairing recovery leave the guest idle (test: "never restores a practice search…").
- **Session exclusivity inside the pairing lock.** Skipping the Redis membership check no longer skips the session check: the practice path re-reads the session under the per-user lock (active match, open lobby, queued search → refuse), and the entry re-delivers a live match before starting a new one.
- **Auction admission** mirrors matchmaking: re-attach to a live seat, `runWithUserTransitionLock` + `prepareForQueueJoin('auction')`, blocked → `emitBlocked`. Origin is `'practice'` (new `AuctionMatchOrigin`, no AP like `'lobby'`, no lobby liveness coupling). **All** bot seats (persistent roster + ephemeral) are re-dressed after selection; persisted ephemeral users get a pool name because `users.lower(nickname)` is unique and guest-style names would collide with real guests.
- **Shared bot roster:** per-guest limit lowered to 12/h and a per-IP bucket (60/h) added; pool exhaustion answers with `GRID_BOT_UNAVAILABLE` (retry) instead of silence. Bot selection/daily counters stay shared on purpose (the owner asked for the real fallback bots); the grid **bot governor now ignores guest matches** so guest outcomes cannot move member difficulty. Practice matches are labelled `origin: practice` in the match metric and excluded from the queue-wait series.
- **"Nothing saved" softened** to "nothing counts toward the rankings": match rows are written like every other guest match (guest friend rooms already do this); rewards/AP/leaderboards stay guest-excluded by the existing rules.
- **Web:** the grid hook has one mode-aware start emitter (`startMode`), used by start, retry, auto-start and reconnect; the guest idle redirect and the "find new opponent" button account for `practice_bot`; the auction guest redirect skips practice; `wrapNames` is scoped to the Tic Tac Toe / Auction boards (Ranked's Top 10 unchanged); `SessionKind` gained `bot_match` and a `play_now_click` event.
- Corrected claims: `rankedService.ensureProfile` already returns an unsaved guest profile (450 RP); grid settlement excludes bots and guests from the reward loop, so "bot RP settlement" was never on this path.
- Not changed (judgement call): the grid state still carries `players[].isBot` — the client uses it only for analytics, never in the UI; devtools inspection is not the product concern.

## As built

Backend (`feat/guest-bot-play`): `config.GUEST_BOT_MATCHES_ENABLED` (default on), `guest-rate-limit` `bot_match` 12/h/guest + `bot_match_ip` 60/h/IP, events `grid:practice_bot_start` / `auction:practice_bot_start` (schemas, handlers, socket types), `footballGridMatchmakingService.handlePracticeBotStart` (+ `startBotPair` `requireQueued` option, `resumeActiveMatchOnStart` helper shared with `handleSearchStart`), `opponentIdentity` in `football-grid-realtime.service.ts` (anonymous guest-style bot for guest viewers on match_found and rejoin), `auctionRealtimeService.handleStartPracticeMatch` + `anonymousBots` option (`anonymizeAuctionBots`), `AuctionMatchOrigin` `'practice'`, persistence pool names for practice ephemeral bots, governor query excludes guests. Tests: `tests/football-grid/football-grid-practice-bot.test.ts`, `football-grid-opponent-identity.test.ts`, `tests/auction/auction-practice-bot.test.ts`, persistence practice case.

Web (`feat/guest-bot-play`): `ModeSelectionScreen` guest card click → public page; `PublicGameScreen` bot-play layout (hero `PlayNowLink` → `/tic-tac-toe?source=practice_bot&pack=european` / `/auction?source=practice_bot`, members → normal flow; bottom card = training with `PublicGameEmbed variant="inline"`; "Play ranked" `SignInLink` above `PublicTopTen`); `LeaderboardTable.wrapNames` via `PublicTopTen` (non-ranked only); `useRealtimeFootballGrid.startMode`, `FootballGridFlowScreen` `source=practice_bot`; `useRealtimeAuctionMatch` `matchmakingMode: 'practice'`, `AuctionFlowScreen` `source=practice_bot`; analytics `bot_match` / `play_now_click`. Tests: `PublicGameScreen.botPlay.test.tsx`, `LeaderboardTable.wrapNames.test.tsx`, grid hook practice case, AuctionFlowScreen practice cases.

Staging env: nothing new required (`GUEST_LOBBIES_PROVISIONING_ENABLED` / `GUEST_LOBBIES_RECONNECT_ENABLED` are already on; `GUEST_BOT_MATCHES_ENABLED` defaults on). Production has guest provisioning off, so the feature is inert there until the batch promotes.

## Codex diff review (round 2) → what changed

Verdict "fix-first", six findings:
- **Fixed:** the governor backlog query (`listUnobservedCompletedMatchIds`) now excludes guest matches too, so they can never occupy the oldest batch and starve member observations. Auction reconnect during a pending practice start re-emits `auction:practice_bot_start` (the server re-attaches to a table that did get created). A member opening `/tic-tac-toe?source=practice_bot` is normalised to the matchmaking flow (auto-start, find-new, analytics surface). `PlayNowLink` waits for auth to hydrate before acting, so a returning member is never mis-read as a refused guest (click tests added).
- **Reverted:** the persistence pool-name minting — the `lower(nickname)` unique index only covers `is_ai = false` users, so minted auction AI users cannot collide with guests.
- **Accepted, not changed:** bot user ids remain in grid state/opponent and in auction seats (the client keys turns and seats on them; friend-room guests see the same ids today). Correlating a roster account across matches needs devtools and reveals no name, avatar or RP. Cancelling an auction practice start in the ~1 s creation window can leave the guest seated at a table they left; the next "Play now" re-attaches them to it and the table finishes on its own timers.
