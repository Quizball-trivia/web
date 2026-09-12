# Guest friend lobbies — play with a friend without an account (plan v1, 2026-09-12)

Owner decisions (2026-09-12): guests may CREATE and JOIN friend rooms (share link or code); playable modes for a room with any guest
are Tic Tac Toe (`football_grid`), Auction (`auction`) and Ranked sim (`ranked_sim`); Friendly match (`friendly_possession`) and
Party quiz (`friendly_party_quiz`) are locked → sign-up dialog; ranked stays training-only for guests; sign-up creates a FRESH account
(no claim of the guest's history); at most 3 guests in a room (auction has 3 seats); two guests may play each other with no member.
Guests get a random funny name ("Anonymous Cantona", "Mystery Keeper 4821") and a default kit (green / yellow / blue jersey).
Everything else stays gated as today: ranked matchmaking, Find opponent(s), Weekend League, coins/tickets/RP/XP/streaks, leaderboards.

## Why this shape
- The friendly lobby already accepts exactly these game modes server-side
  (`backend-node/src/realtime/schemas/lobby.schemas.ts` → `lobbyUpdateSettingsSchema.gameMode`).
- Every lobby / match / seat table has a foreign key to `public.users` (`lobbies.host_user_id`, `lobby_members.user_id`,
  `football_grid_*` seat columns incl. `bot_user_id`, auction seats, `matches`). Bots are already real `users` rows (`is_ai`).
  So the cheapest correct model is: a guest becomes a real `users` row, flagged, with no reward paths — every engine stays unchanged.
- Socket auth is pluggable: `src/realtime/socket-auth.ts` → `getAuthProvider().verifyToken(token)` → `AuthIdentity {provider, subject}`
  → `usersService.getOrCreateFromIdentity(identity)` (`src/modules/auth/auth.provider.ts`, `supabase-auth-provider.ts`).
- Guests already have a server identity for the public pages: `src/modules/guest/guest.service.ts` (opaque 64-hex token, sha256 stored
  in `guest_sessions`, 30-day idle expiry, 45-day purge, keyed ip/device hashes; daily-set completions only).

## Backend
1. **Guest auth provider.** In `socket-auth.ts`, a token matching `GUEST_TOKEN_SHAPE` is resolved through `guestService.resolve`
   (touches `last_seen_at`) into `AuthIdentity { provider: 'guest', subject: guestSession.id, name: <assigned name> }`; anything else
   goes to the Supabase provider as now. `getOrCreateFromIdentity` creates `users` + `user_identities(provider='guest', subject)` on
   first socket use (public-page-only guests never get a `users` row). HTTP routes keep `optionalAuthMiddleware`; only the endpoints a
   lobby needs (lobby REST if any, avatar/profile read of room members) learn the guest token.
2. **Flag + gating.** `users.is_guest boolean not null default false` (mirrors `is_ai`), set at creation. Gate on it: wallet /
   tickets / RP / XP / streak / objective writes, leaderboard rows and reads (add `AND NOT is_guest` beside `NOT is_ai`), WL entry,
   friend requests, ranked/auction/grid matchmaking (`search_start` handlers reject guests with a typed error the client maps to the
   sign-up dialog), daily-coin claims. Match history rows are still written (the room needs results) but stats aggregation skips guests.
3. **Identity.** Name assigned once at `users` creation from a curated list × numeric suffix, unique per `nickname` (nickname
   uniqueness rules already exist); `avatar_customization` from a 3-kit pool by `hash(guestId) % 3`; country from IP as today.
   Nickname-change and avatar-store endpoints reject guests.
4. **Lobby rules.** In the lobby settings handler: if any member `is_guest`, `gameMode ∉ {football_grid, auction, ranked_sim}` →
   reject (`LOBBY_MODE_REQUIRES_ACCOUNT`); when a guest joins a lobby already set to a locked mode, the lobby falls back to
   `football_grid` and broadcasts the settings. Join rejects when the room already has 3 guests (`LOBBY_GUEST_LIMIT`). Guests can host.
   Invitations to friends (`lobby_challenge_invitations`) are member-only (guests have no friends).
5. **Abuse guardrails.** Rate limits per IP hash and per guest: guest session creation (existing), lobby creation (5 / hour),
   socket connects (existing connection health limits). Guest rooms inherit the stranded-lobby sweeper and lobby retention. The
   45-day guest purge must also delete the `users` row and its dependants (or anonymise) — extend the existing sweeper; matches
   referencing the guest keep working through ON DELETE rules to verify per table (grid seats are `ON DELETE RESTRICT` → anonymise
   instead of delete, or purge match rows first).
6. **Rewards for members in mixed rooms.** Friendly rooms already pay nothing ranked-wise; confirm coins/XP for a member who beats a
   guest follow the existing friendly rules (no change intended). Ranked sim in a room never touches RP (verify).

## Web
1. **Guest sockets.** `useRealtimeConnection` currently returns null unless `status === 'authenticated'`; connect with the guest
   token when there is no Supabase session and the surface is a lobby/room (`/friend`, `/game` from a lobby), not on the hub or
   public pages (their polling stays off). Guest token creation reuses the public-page client (the one `GuestDailyPlay` uses).
2. **Routing.** `guestNavGuard` / `isGuestAllowedPath` gain `/friend` and `/game`; `/friend?code=ABCD` with no account creates a
   guest session and joins. Share sheet (Web Share API + copy) on the lobby.
3. **Lobby UI.** Mode picker shows all five; Friendly match and Party quiz greyed with a lock for rooms containing a guest (host guest
   or any guest member); tapping opens the sign-up dialog. Guest members get a "guest" badge next to the random name; the results
   screens of the three modes end with "Sign up to keep your results / play ranked" for guests (fresh account — the copy must not
   promise carrying anything over).
4. **Hub dialogs.** Auction / Tic Tac Toe dialogs gain "Play with a friend" for everyone (create room / enter code); ranked keeps
   Find opponents → sign-up and Training. Party quiz card → sign-up for guests (unchanged).
5. **Analytics.** Guest id as distinct id (already); events tagged `access: guest`; DAU / retention dashboards split guests out.

## Rollout
Behind `GUEST_LOBBIES_ENABLED` (backend) + web flag; localhost first, then staging with the 500-player lobby chaos harness including
guest seats, then prod cherry-pick. Prod DB migration: `is_guest` column + index (no CONCURRENTLY).

## Tests
Socket auth with guest token / expired token / banned IP; identity creation once per guest; lobby mode enforcement (host guest, guest
joins locked room, 4th guest rejected); reward gating per path; leaderboard exclusion; purge of a guest with match history; web: guest
socket only on room surfaces, deep-link join, greyed modes → sign-up dialog, results CTA.

## Open questions for review
- Should guest `users` rows exist at all vs a parallel `guest_participants` table? (chosen: real rows, fewer engine changes).
- Ranked sim exact semantics in a room (does it write anything ranked-shaped?).
- Country detection for guests: keep (flag on the seat) or blank.

## v2 — after Codex plan review (2026-09-12, 14 findings, all verified against the code)
Verdict: the real-`users`-row model holds (a separate participant table would need far broader FK/engine changes), but the plan
understated the work. Corrections:
1. **Capabilities, not handler gates.** A server-side `guestCapabilities` check enforced at every entry service, not only
   `search_start`: `lobby:create` with `mode='ranked'` calls `startRankedAiForUser` directly (lobby-commands.service.ts:124) and would
   create a ranked profile. Guests may only create/join `mode='friendly'` rooms whose final mode ∈ {football_grid, auction, ranked_sim};
   WL, queue entry, invitations, friend requests (both directions), user search/discovery are member-only.
2. **Atomic guest insert.** `createWithIdentity` inherits DB defaults of 500 coins and 5 tickets. Guests are inserted in one statement
   with `is_guest=true`, zero balances, assigned nickname and kit — never "create then flag".
3. **Every reward writer, enumerated.** Friendly auction pays coins to every non-bot seat and the reconnect replay rebuilds those
   rewards from placement (auction-persistence.service.ts:150, auction-disconnect.service.ts:539); grid grants XP directly
   (football-grid-settlement.service.ts:272) and disables coins/TP only after XP; possession completion runs XP + achievements +
   objectives (possession-completion.ts:415/500); shared completion writes `user_mode_match_stats` for every participant
   (matches.service.ts:1018); lobby warmup persists personal/pair scores (warmup-realtime.service.ts:207). Each gets an explicit
   guest-recipient guard; guests stay in participant lists (scoring, opponent lookup, replay). Persisted award outcomes are replayed
   instead of recomputed.
4. **Lobby invariants under the lock.** Friendly/ranked-sim rooms can hold six; grid and ranked sim play two; join-time sync promotes
   >2-member rooms to party quiz (lobby-commands.service.ts:327/564). Validate membership AND the final normalized mode on join,
   settings, ready/autostart and host start; a guest join that would leave an unplayable or locked room is rejected (no silent
   fallback); readiness resets on any mode change; an already-present guest is exempt from the 3-guest cap so rejoin is idempotent.
5. **Ranked sim semantics (documented):** `variant='ranked_sim'` with the lobby's friendly mode → no RP, but friendly XP /
   achievements / objectives / stats (gated per item 3); it autostarts when both are ready and rejects host start — keep that UX.
6. **Web principal.** One realtime principal `{kind: member|guest, userId, token}`; the guest bootstrap must return the server-issued
   `users.id` (the guest client currently discards `guestId`); one connection-ownership policy (AppShell's `useRealtimeConnection`
   disables/clears for anonymous visitors today and would fight a lobby-level connection); every token acquisition/recovery path in
   socket-client.ts learns the guest token; identity switch (sign-up mid-match, logout) disconnects and clears match/auction/grid/query
   state. Guests are never marked `authenticated` (AppAuthGate would send them to onboarding).
7. **Routes as they are:** create `/play/friend?tab=create`, join `/friend/room/:code`, play `/auction`, `/tic-tac-toe?source=friend_lobby`,
   `/game` — all three game screens currently require an authenticated user and must accept the guest principal; `source=` never
   authorises matchmaking; room/match membership is restored on reload before gameplay.
8. **Abuse controls, real ones:** guest-mint limits are a per-process MemoryStore; add shared (Redis) per-IP limits before the costly
   handshake work, per-principal connection/command limits, proxy-aware IP bucketing, a revocation policy, explicit multi-tab/replay
   behaviour. Stored ip/device hashes are analytics, not token binding. Coin farming by members against disposable guests must be
   bounded (friendly coin rules per match, not per room creation).
9. **Eligibility abstractions:** `isRankedSettleEligible` and the ranked SQL deliberately include persistent bots; add a third notion
   (human participant / member eligible for progression / publicly discoverable) rather than sprinkling `NOT is_guest`; cover
   leaderboard entries, "me", rank counts, country variants, cached public projections, user search.
10. **Lifecycle = tombstone.** Grid claims/pairs/series winners and core lobby/match FKs are RESTRICT or no-action; purging deletes
    members' shared history. Idle guests are anonymised (credentials, nickname, identifying fields removed; `is_guest` kept; caches
    invalidated; active sessions ended) — never deleted. `user_identities.subject` is text: the guest-session purge must also revoke
    the identity mapping.
11. **Nickname allocation:** bounded retries on the uniqueness constraint (case-insensitive, shared namespace), large suffix space,
    reserved/profanity list, atomic persistence.
12. **Analytics:** suppress `account_created` for guest provisioning; use `access_type` (existing property); guest distinct id
    consistent between browser and server.
13. **Rollout order:** schema (is_guest, no CONCURRENTLY) → guest-aware readers/writers/workers on every replica → admission flag on.
    Flag-off does not remove rows or drain live games: keep exclusions active on rollback. Never provision a guest while auth
    bootstrap is still loading. Tests: cross-replica reconnect, sign-up mid-match, host transfer, forfeit replay, third-member mode
    change, BO3 continuation, flag-off draining; the 500-player harness covers load, not authorization/reward isolation.
Effort (revised): 3–4 weeks cross-stack — backend ~2 (principal + capabilities, atomic insert, reward guards, lobby invariants,
abuse limits, tombstone purge, migration) + web ~1.5 (principal, routes, three game screens, lobby UI, sign-up prompts) + rollout.
Suggested cut: ship Tic Tac Toe + Auction rooms first; add Ranked sim once item 3 is proven on the other two.
