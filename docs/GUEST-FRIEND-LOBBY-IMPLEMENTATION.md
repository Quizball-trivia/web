# Guest friend lobbies — implementation plan v1 (2026-09-12)

Source of decisions and risks: `docs/GUEST-FRIEND-LOBBY-PLAN.md` (v2). Scope of this document: the order of work, the PRs, the
files each touches, what proves each step, and the rollout gates. Backend worktree `grid-bo3-backend` (feat branch off staging),
web worktree `training-mode-web`. Everything ships behind `GUEST_LOBBIES_ENABLED` (backend config, default false) and
`NEXT_PUBLIC_GUEST_LOBBIES` (web). Six PRs to staging, in this order; each is independently reviewable and safe with the flag off.

## PR 1 — backend: schema + guest identity + capabilities (no admission yet)
Migration `users.is_guest boolean not null default false` + partial index `(id) where is_guest` (no CONCURRENTLY).
- `src/modules/users/users.repo.ts`: `createGuestWithIdentity(tx, {nickname, avatarCustomization, country})` — ONE insert with
  `is_guest=true, coins=0, tickets=0` (do not rely on defaults), `user_identities(provider='guest', subject=guestSessionId)`;
  bounded nickname retries (unique violation → next suffix, 5 attempts); no `account_created` analytics for guests
  (`users.service.ts:447` branch on provider).
- `src/modules/guest/guest-names.ts`: curated adjective/legend list × 4-digit suffix; reserved/profanity check via the existing
  nickname validator. `guest-kits.ts`: three avatar customizations (green / yellow / blue jersey), chosen by `hash(guestId) % 3`.
- `src/modules/auth/guest-auth-provider.ts`: `verifyToken(token)` for `GUEST_TOKEN_SHAPE` → `guestService.resolve` → identity
  `{provider:'guest', subject: session.id, name: assigned}`; `socket-auth.ts` routes 64-hex tokens here, everything else to Supabase.
  Admission is refused (`Authentication required`) unless `GUEST_LOBBIES_ENABLED`.
- `src/modules/users/capabilities.ts`: `capabilitiesFor(user)` → `{ createFriendlyRoom, joinFriendlyRoom, rankedEntry, queueEntry,
  weekendLeague, social, progression, wallet, discoverable }`; members all true, guests `{createFriendlyRoom, joinFriendlyRoom}` only.
  `ai-classification.ts`: add `isProgressionEligible(user) = !is_ai && !is_guest` next to `isRankedSettleEligible` (bots rule preserved).
- Tests: provider (valid / expired / malformed token), atomic insert with zero balances, nickname collision retries, capabilities table,
  flag-off refusal. Proof: `npm test`, plus a migration dry run against the local Postgres.

## PR 2 — backend: capability enforcement + reward guards
- Entry points (each checks capabilities and throws a typed `CAPABILITY_REQUIRED` error the web maps to the sign-up dialog):
  `lobby-commands.service.ts:124` (`lobby:create` ranked → `startRankedAiForUser`), ranked/auction/grid `search_start` handlers,
  WL enter/checkin, friends/invitations (`lobby_challenge_invitations`, friend requests to or from guests), user search
  (`users.repo.ts:428` excludes guests), nickname/avatar-store endpoints, daily-coin claims.
- Reward writers, each gated on `isProgressionEligible(recipient)` while keeping guests in participant lists:
  `auction-persistence.service.ts:150` coin payout + `auction-disconnect.service.ts:539` replay (replay persisted outcomes),
  `football-grid-settlement.service.ts:272/343` XP + TP/coins, `possession-completion.ts:415/500` XP/achievements/objectives,
  `matches.service.ts:1018` `user_mode_match_stats`, `warmup-realtime.service.ts:207` warmup scores, progression/objectives services.
- Leaderboard + public read surfaces: ranked/auction/grid leaderboards (entries, "me", rank counts, country variants),
  `public-standings.service.ts`, WL standings — `AND NOT is_guest` via the shared eligibility helper.
- Tests: one test per writer proving a guest recipient gets nothing and a member in the same match gets the normal amount; replay
  after reconnect shows persisted awards; leaderboard queries never return guests. Proof: `npm test` + the auction/grid/possession
  realtime suites.

## PR 3 — backend: lobby invariants, limits, lifecycle
- `lobby-commands.service.ts` (join / settings / ready / host start, under the lobby lock): if any member is a guest, the final
  normalized mode must be in {football_grid, auction, ranked_sim}; joins that would break capacity for that mode, exceed 3 guests
  (already-present guest exempt), or land in a locked mode are rejected with `LOBBY_GUEST_LIMIT` / `LOBBY_MODE_REQUIRES_ACCOUNT`;
  readiness resets on any mode change; ranked sim keeps its ready-driven autostart.
- Limits: Redis-backed per-IP (proxy-aware) buckets for guest mint + socket admission before identity/geo work; per-guest command
  and connection caps; lobby creation 5/hour per guest; revocation = delete the guest session row (socket auth fails on next
  handshake) + `disconnectSockets(userId)`.
- Lifecycle: `guest.sweeper.ts` tombstones idle guests (nickname → "Guest", identifying fields cleared, `user_identities` row and
  `guest_sessions` row deleted, `is_guest` kept, caches invalidated) — never deletes `users`. Existing lobby sweepers cover rooms.
- Tests: lobby scenario suite (host guest, guest joins party room, 4th guest, mode switch attempts, rejoin), limit buckets, tombstone
  with grid/auction history intact. Proof: `npm test` + the lobby lifecycle chaos harness with guest seats (local 500-player run).

## PR 4 — web: realtime principal + routes
- `src/lib/realtime/socket-client.ts` + `useRealtimeConnection.ts` + `useAppShellViewModel.ts:92`: one `RealtimePrincipal
  {kind:'member'|'guest', userId, token}` resolved by a `usePrincipal()` hook; the guest bootstrap (`lib/guest/guestSession.ts`)
  keeps `guestId` and receives the server `users.id` from a `guest:hello` ack after the socket connects; connection ownership: the
  shell owns the connection for members, the room/game surfaces own it for guests (never both); every token acquisition/recovery
  path uses the principal; identity switch (sign-up, logout) disconnects and clears match/auction/grid/query stores.
- Routes: `guestNavGuard` / `isGuestAllowedPath` gain `/play/friend`, `/friend/room/:code`, `/auction`, `/tic-tac-toe`, `/game`;
  the three game screens (`AuctionFlowScreen.tsx:195`, `FootballGridFlowScreen.tsx:1620`, GameStageRouter) accept the guest
  principal; `source=friend_lobby` never enables matchmaking; room/match membership restored on reload before gameplay.
- Guests are never `status: authenticated` (AppAuthGate); no guest provisioning while auth bootstrap is loading.
- Tests: principal resolution, ownership policy, route guards, reload restoration. Proof: `vitest`, typecheck, lint.

## PR 5 — web: lobby + dialog UI
- `FriendPlayModal` / `useFriendLobbyLogic`: create + join by code for guests; invite link with Web Share + copy; mode picker greys
  Friendly match and Party quiz when the room has a guest (host or member) and taps open the sign-up dialog; guest badge on members;
  server errors `LOBBY_GUEST_LIMIT` / `LOBBY_MODE_REQUIRES_ACCOUNT` / `CAPABILITY_REQUIRED` mapped to copy in en/ka/es/tr.
- Hub: Auction and Tic Tac Toe dialogs get "Play with a friend" for everyone; results screens of the three modes end with "Sign up to
  keep your results" for guests (fresh account — no promise of carry-over).
- Analytics: `access_type: guest` on lobby/match events, guest distinct id shared between browser and server.
- Tests: dialog gating, error mapping, results CTA, four locales. Proof: `vitest`, seo-check unchanged (public pages untouched).

## PR 6 — rollout
1. Staging: PRs 1–3 merged with the flag OFF → all replicas guest-aware. 2. Flag ON on staging; web PRs 4–5 with
   `NEXT_PUBLIC_GUEST_LOBBIES` on; owner + friends playtest (guest host, member host, mixed rooms, sign-up mid-match, reload,
   forfeit). 3. Chaos harness run with guest seats. 4. Prod: cherry-pick bundles off `main` (schema first, then code, flag OFF; flag
   ON last), with a fresh change-specific OK. Rollback = flag OFF (existing guest rows stay tombstone-able; exclusions stay active).
Monitoring: guest mint rate, socket admission rejects, lobby creation per guest, rooms by mode, sign-ups from guest sessions.

## Effort
Backend PR1 3d, PR2 4d, PR3 4d; web PR4 4d, PR5 3d; rollout + playtest 3d ≈ 4 weeks elapsed with reviews (Codex + CodeRabbit
on every PR). Cut option: ship with `ranked_sim` excluded from the allowed set and add it after PR2's guards are proven live.

## v2 — after Codex review of v1 (2026-09-12, 13 findings, all verified against the code)
Verdict on v1: not safely separable as written. Corrections below re-cut the PRs; each fix names the code it answers.

**Re-sequenced PRs**
- **PR 0 — backend contract (new, flag-agnostic).** Everything other PRs depend on and that is safe with the flag off:
  `is_guest` migration; `lobbies.repo.ts:365` member queries select `is_guest` and the lobby snapshot serializer + web payload types
  carry it; ranked entry inventory by EVENT (`ranked:queue_join`, `auction:start_ai_match` → `handleStartAiMatch`, auction/grid
  `search_start`, WL enter/checkin, `lobby:create` ranked) mapped to its entry service; capability errors survive each transport
  adapter (auction swallows into `auction_search_failed` at `auction.handler.ts:160`, ranked has a generic catch) — add a
  `CAPABILITY_REQUIRED` passthrough. Bootstrap contract: `POST /guest/session` (existing mint, response `{token, guest_id}`) gains a
  scoped **`POST /guest/principal`** that resolves or creates the `users` row for a token and returns `{userId, nickname, kit}` BEFORE
  the socket connects — no `guest:hello` ack, no circular bootstrap; returning visitors with only a stored token call it on load.
- **PR 1 — identity.** `createGuestWithIdentity` keeps the existing provider/subject advisory lock + identity recheck
  (`users.repo.ts:226–242`); nickname retries run as separate transactions (or savepoints) on the specific nickname constraint;
  reserved-name check is `users.service.ts:716/733`, not the validator; atomic insert with zero balances; `account_created` suppressed;
  guest auth provider; capabilities table. Admission flag semantics split in two: `GUEST_PROVISIONING_ENABLED` (new guests / new rooms)
  and `GUEST_RECONNECT_ENABLED` (existing guest principals may reconnect and finish) — rollback turns off provisioning first and
  drains; live games are never orphaned by a flag flip.
- **PR 2 — enforcement.** Preserve each writer's bot policy: persistent bots keep XP (`progression.service.ts:52`,
  `ai-classification.ts:36`); guest exclusion is added per writer, and match semantics (head-to-head, forfeit rewards at
  `progression.service.ts:64`) are computed from PARTICIPANTS before recipient filtering. Ranked-profile creation is prohibited
  centrally for guests: `rankedService.ensureProfile` calls from auction enrichment (`auction-realtime.service.ts:359`) and grid
  handoff/rejoin (`football-grid-realtime.service.ts:597/881`) become read-only for guests with ranked identity omitted from their
  payloads (test: no `ranked_profiles` row after play + reconnect in both modes). Auction awards get a durable, idempotent
  **award outcome keyed by (match, recipient)** written in the same transaction as the wallet mutation; replay
  (`auction-disconnect.service.ts:539`) reads it; pre-migration matches keep the recompute path; test a failure between recipients +
  retry. Member coin-farming rule: friendly-room coin payouts per member are capped per rolling window and count rooms with replaced
  guest identities (per-IP hash + per-member), applied at settlement.
- **PR 3 — lobby invariants.** `lobby:create` picks a guest-compatible initial mode atomically (repo default is
  `friendly_possession`, `lobbies.repo.ts:58`) honoring `FOOTBALL_GRID_LOBBY_ENABLED`; the invariant lives in one function called from
  create / join / leave (`:1008` normalization) / settings / ready / host start / series continuation; settings re-reads lobby,
  ownership, status and member classes INSIDE the lock (today it validates before locking, `:470–487`); rate limits + revocation as
  v1; tombstone = `nickname = NULL` with display fallback (the claimable-name unique index at
  `20260727150200_ai_kind_indexes.sql:26` would reject a second "Guest"), identity revoked transactionally before the session row is
  deleted (today `purgeIdle` deletes sessions first), connected guests tracked for activity, cluster-wide disconnect on tombstone.
- **PR 4 — web connection coordinator.** One coordinator owns the socket; ALL consumers move in this PR: shell
  (`useAppShellViewModel.ts:92/127` — lobby membership no longer keyed on `authUser.id`), `useFriendLobbyLogic.ts:131`,
  `FriendMatchHubPage.tsx:29`, auction/grid realtime hooks, `useGameStageState.ts:116`, and `useRealtimeMatchSocket`'s
  `getSocket()` fallback when disabled (`useRealtimeConnection.ts:86`). Non-owners consume without disconnecting. Principal comes from
  `POST /guest/principal` (PR 0) so `useRealtimeConnection`'s `selfUserId` requirement (`:30`) is satisfied before connecting. Identity
  change cancels pending token/principal/reconnect work and clears stores. Member flows verified with the web flag off.
- **PR 5 — UI** unchanged from v1, now consuming `is_guest` from the snapshot (PR 0).
- **PR 6 — rollout** with the two-flag drain: provisioning off → wait for guest rooms to finish (monitor) → reconnect off. Minimum
  guest-aware backend version pinned before any guest row exists; already-open web clients handle backend refusal with the sign-up
  dialog, not a crash.

**Proof that actually proves it (added to PR 2/3/4):** a serial DB+Redis isolation suite (the default `npm test` excludes the real-DB
match scenarios, `vitest.config.ts:8`) asserting the ABSENCE of wallet, XP, ranked-profile, objective and stats writes for guests
through completion, forfeit, replay, BO3 and forbidden direct events, plus unchanged member and persistent-bot rewards and the
mixed-match forfeit case; web tests that mount the shell + route with a real coordinator (existing lobby tests mock the hooks);
the chaos harness (`scripts/chaos/lobby-lifecycle.ts`) learns guest credentials; cross-replica first-connect race test.

**Effort (re-estimated):** PR0 3d, PR1 3d, PR2 6d, PR3 5d, PR4 6d, PR5 3d, PR6 4d = 30 working days ≈ 6 weeks elapsed with Codex +
CodeRabbit on each PR. Dropping `ranked_sim` saves little (auction/grid carry the hard parts). A smaller first release is
**grid-only rooms** (no auction award persistence, no coin-farming rule): PR0–PR1 + grid subset of PR2–PR5 ≈ 4 weeks.

## As built (2026-09-12) — local commits, not pushed
Backend `feat/guest-lobbies` (worktree grid-bo3-backend, off origin/staging): PR0+PR1 dc2585e6, PR2 8aee419f, PR3 e61f6042.
Web `feat/training-mode` (worktree training-mode-web): PR4+PR5 e167257a (on top of the auction/grid training commits).
Verified locally with both flags on: unit/integration suites (backend 355 files green bar the 8 pre-existing env failures; web 197
files green), plus a socket-level smoke against the running backend (`scratchpad/guest-lobby-smoke.mjs`): 4 guests provisioned,
ranked create → CAPABILITY_REQUIRED, guest room opens in Tic Tac Toe, Friendly match refused / Auction allowed, 4th guest refused
(LOBBY_GUEST_LIMIT), auction/grid/ranked matchmaking refused. Not yet built from the plan: chaos-harness guest credentials, the
member coin-farming cap (friendly auction still pays members per match — flagged for the owner), PR6 rollout itself.

## Implementation review round (2026-09-12) — Codex on the built diffs, 25 findings, each verified in code

**Fixed (backend):**
- Global ticket cron paid guests (and tombstones): new migration `20260912130000_ticket_refill_excludes_guests.sql` adds
  `is_guest = false` to `refill_tickets_global()` and zeroes any guest already topped up; integration test runs the real function.
- Grid result replay could defer the member's results forever: guests now get a durable `football_grid_reward_eligibility`
  row (`ineligible`/`guest`), so settled reads and lost-ACK / BO3 replays carry every human.
- Banned/deleted guests could re-authenticate: `getOrCreateGuest` runs `assertUserAccountActive` on every return path.
- Socket admission trusted `X-Forwarded-For`: `socketIpBucket` now mirrors `http/client-ip.ts` (local = transport address,
  deployed = `X-Real-IP` only, mapped IPv4 normalized); exported + unit-tested.
- Achievement isolation failed open on a lookup error: unresolved players are skipped (fail closed).
- Sweeper deleted the identity before tombstoning: `guestRepo.retireSession` does tombstone + identity revoke + session delete
  in ONE transaction; sweep drains in 500-row batches (max 200) and stops on an all-failed batch. Integration-tested.
- Dev `dev:quick_match` admitted guests to ranked; ranked settlement classified guests as settle-eligible: dev handler refuses
  guests, settlement uses `isProgressionEligible` (no guest profile, member rated against the anchor RP). Unit-tested.
- `completeMatch` did a pooled `usersRepo.getByIds` inside its transaction (pool-exhaustion risk): now through `tx`.
- Drain semantics were incoherent: provisioning off now also refuses NEW guest rooms and NEW guest memberships (rejoin allowed);
  reconnect off refuses every guest token on both the HTTP principal and the socket (documented in `config.ts`). Unit-tested.
- `/guest/principal` skipped the shared Redis budget and persisted no country: wired `allowGuestOperation(ip, 'principal')`
  (429) and detects the country once at provisioning.
- Play Again created a `friendly_possession` rematch room for guests: guests get `CAPABILITY_REQUIRED` on `match:play_again`.
- Ready/autostart used the pre-lock lobby read; `startDraft` re-checks only status: ready now re-reads the lobby under the lock
  (status + current mode) and `startDraft({expectWaiting})` re-validates the guest invariant under its own lock (`guest_rules`).
- Guests were publicly resolvable: `getPublicProfile`, `assertPublicUserVisible` and nickname resolution exclude guests.
- Mixed-room warmup dropped the member's personal best too: personal rows for members only, pair row only for two members.

**Fixed (web):**
- Principal switches leaked state: `useRealtimeConnection` clears game session, auction active match, the auction rejoin
  sessionStorage key and the query cache on identity change/sign-out (`clearIdentityScopedState`).
- Guest acquisition raced auth: only a POSITIVELY anonymous visitor resolves a guest, and an in-flight resolution is discarded
  if the visitor signed in meanwhile.
- Direct links issued lobby commands before the principal existed: the create/join effect waits for `principal.kind !== 'none'`;
  a refused guest gets the sign-up prompt once.
- `/auction` auto-searched for guests: matchmaking autostart is member-only; a guest with no room match (and no rejoin key)
  is sent back to `/play/friend`.
- Copy promised carry-over ("keep your results"): now "save your next results" in en/ka/es/tr; the CTA also renders on the
  ranked-sim results screen; a non-host guest can tap a locked mode to reach sign-up.

**Deferred (documented, not blocking a flags-off merge):**
- Member coin-farming cap for friendly auction and transactional per-recipient auction award outcomes (pre-existing partial
  settlement defect) — owner decision on the cap; separate PR.
- `/game` reload cannot bootstrap realtime before the idle redirect — pre-existing member weakness, separate fix.
- Single connection owner / guest surface policy (architecture), per-principal concurrent-socket cap, command-family budgets,
  Redis-outage policy for the shared limiter.
- Session activity touch from live socket traffic (today: every handshake touches; a 30-day-long single connection is the
  only gap), analytics `access_type`/guest analytics id, admin adjustment target checks for guest rows.
