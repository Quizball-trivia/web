# Guest friend lobbies — staging test brief (2026-09-13)

## Where we are
- Backend merged to staging: Quizball-trivia/quizball-backend#677 (squash `e1edc8c9`). Web: Quizball-trivia/web#533 (this branch).
- Both are OFF by default. To test on staging turn on:
  - Railway `quizball-backend`, environment **staging**: `GUEST_LOBBIES_PROVISIONING_ENABLED=true`, `GUEST_LOBBIES_RECONNECT_ENABLED=true`
  - Vercel `quizball-web`, staging/preview env: `NEXT_PUBLIC_GUEST_LOBBIES=true` (needs a redeploy; it is a build-time public var)
- Rollback = flags off (drain: provisioning off first, reconnect off last). No data migration to undo; guest rows stay (tombstoned by the sweeper after 45 idle days).

## What it is
A visitor with no account can host or join a friend room (link or code) and play **Tic Tac Toe (football_grid), Auction and Ranked sim** with friends. Party quiz and Friendly match are locked in a room that has a guest and open sign-up. Max 3 guests per room. Guests get a random name ("Mystery Mezzala 8373") and a default jersey, hold no coins/tickets/XP/RP, never appear on leaderboards or public profiles, and sign-up creates a fresh account (nothing carries over). Ranked stays training-only for guests.

## How it works (for a tester who reads code)
- Guest token (`guest_sessions`, minted by the public pages) → `POST /api/v1/guest/principal` creates/returns a real `users` row with `is_guest=true` and zero balances → the socket connects with that token (`GuestAuthProvider`).
- Every entry service checks capabilities (`modules/users/capabilities.ts`); refusals are `CAPABILITY_REQUIRED` (403 / socket result), which the web maps to the sign-up dialog.
- Every reward writer excludes guests; grid writes a durable `ineligible/guest` eligibility row so result delivery never stalls the member.
- Lobby invariants (`realtime/services/lobby-guest-rules.ts`) are validated under the lobby lock on create/join/settings/ready/host-start and re-validated inside `startDraft`.
- Web: `src/lib/realtime/realtime-principal.ts` (member session, else resolved guest); identity-scoped state clears when a different identity connects.

## Test matrix (one browser per guest: incognito, Safari, second Chrome profile)
1. Logged out `/play`: friendly card and the Auction / Tic Tac Toe dialogs offer "Play with a friend"; Ranked offers training only.
2. Guest creates a room: random name, jersey, guest badge, room opens in Tic Tac Toe.
3. Second browser joins by code. Settings: Friendly match / Party quiz are locked (lock icon, tap → sign-up); Auction and Ranked sim work.
4. Auction: third guest joins; fourth is refused with the guest-limit message.
5. Play Tic Tac Toe and an Auction to the end: results show the sign-up CTA; guest has no coins/XP/leaderboard row; a logged-in member opponent gets normal rewards.
6. Ranked sim in a guest room: plays; guest gets no RP/profile; member gets XP/stats as usual.
7. Guest sign-in mid-room: guest identity drops, member session takes over, no leftover room/match state.
8. Direct `/auction` or `/tic-tac-toe` as a guest with no room: no matchmaking; back to the friend hub.
9. Flags off on the backend: `/guest/principal` 401, guest sockets refused, members unaffected. Provisioning off only: existing guests can rejoin/finish, no new rooms/joins.
10. Abuse: >5 rooms/hour per guest → RATE_LIMITED; hammering `/guest/principal` from one IP → 429.

## Known gaps (documented in GUEST-FRIEND-LOBBY-IMPLEMENTATION.md)
Member coin-farming cap for friendly auction (members still earn per match), durable per-recipient auction awards (pre-existing), `/game` reload bootstrap (pre-existing), analytics `access_type`, single connection owner. CodeRabbit left 6 backend + 12 web comments on the PRs, not yet folded (notable: Redis-down fallback for the shared limiter, `is_guest` null should fail closed, `ranked_sim` start shape in LobbySettings, `isJoining` reset in FriendPlayModal).
