# Ranked 2.0 / Zone Match — status after the queue build (2026-11-04, evening)

Continuation notes for whoever picks this up. Everything below is on `feat/zone-match-animation-lab` (web) and
`feat/zone-match-room` (backend), verified on a local stack, **nothing merged or deployed, no shared database touched**.
All new behavior is flag-gated and OFF by default.

## What works now (all verified live, end to end, in real browsers)

1. **Invite-only human vs human** — friend room → Ranked 2.0 (beta) → both ready → full match. Desktop + mobile widths.
2. **Play vs bot from a friend room** — a host alone sees "Play vs bot" (flag `ZONE_MATCH_BOT_ENABLED` +
   `NEXT_PUBLIC_ZONE_BOT=1`); the server bot (fresh `is_ai`/`ai_kind='ephemeral'` user per match, ~62% answer accuracy,
   human-ish delays) plays a complete match through the ordinary room command path.
3. **The beta matchmaking queue** — Play screen → Ranked card (`NEXT_PUBLIC_RANKED_V2=1`) → `/ranked2` → pick loadout →
   Find match. Two searching humans pair (verified: same match in ~5 s, 0 bots). A lone searcher gets the bot after a
   **random 10–20 s** (`ZONE_MATCH_BOT_FALLBACK_MIN/MAX_MS`; verified 14–15 s). Flag `ZONE_MATCH_QUEUE_ENABLED`.
   The queue mints a synthetic lobby (`mode='ranked'`, `game_mode='room_game'`, no invite code) so the room runtime,
   web handoff and reconnect pointer work unchanged; `roomRepo.finish` closes those lobbies, legacy ranked draft
   recovery skips them. The picked deck rides `sessionStorage['zone-queue-deck']` and `ZoneMatchRoom` submits it at the
   loadout phase.

## Security/correctness fixes shipped since the morning handoff (all codex-verified)

- **P1:** ranked MCQs now deal exclusively from the private pool (`room_pool`, game `zone_match`, tags `mcq`/`numeric`;
  `zoneMcqPoolItemSchema` embeds the category) — the public questions API could previously be used as an answer oracle.
  Seed with `scripts/room-seed-pool.ts --game zone_match` (kinds may be seeded in separate files).
- Second Ball no longer leaks opponent wrongness mid-question (the card event is minted at the reveal, so there is no
  event *and no event-id gap* while the question is open).
- Live cards respect the seat's effective answer deadline; outage recovery restores the exact question window after a
  Substitution; connected-idle seats forfeit (`IDLE_FORFEIT_MS` 150 s, clock reset at kick-off); penalty sudden death
  is capped (`SHOOTOUT_MAX_KICKS` 20); content exhaustion never replays a revealed answer (any-unused MCQ tier;
  numeric exhaustion draws lots). Numeric question ids are masked in views.
- **Engine parity guard:** the backend's engine copies must stay byte-identical to the web's (import paths apart).
  `scripts/zone-engine-parity.ts --web <web-repo> --write` regenerates `PARITY.json` in BOTH repos; a vitest in each
  repo fails on drift. Regenerate both whenever an engine file changes.

## Codex review history

Three substantive passes on the morning work (6 findings → 4 follow-ups → READY) and three on the queue
(6 → 3 → 1 → READY). Final verdicts: **READY for a flag-gated staging PR** in both cases. Reports live at
/tmp/codex-zone-*.md on the build machine (not committed).

## Known accepted limitations (beta)

- The bot driver is process-local: a backend restart orphans its match and the idle forfeit ends it (bot loses).
  Port it onto `scheduleRealtimeTimer` (like `football_grid_bot_action`) for durability.
- Ephemeral bot users accumulate one row per bot match; the existing 7-day `ai_kind='ephemeral'` cleanup covers them.
  At real volume, switch to `syntheticBotSelectionService.selectAndReserve` (roster bots, RP-banded).
- A bot fallback firing in the same instant a second human joins gives both players bot matches (both matched promptly;
  old ranked shares this boundary).
- A paired human who never reaches `/sala/<matchId>` lets the 20 s ready gate cancel the room; the survivor lands back
  at `/ranked2` (not requeued automatically).
- No RP, no settlement, no tickets: finishing a beta match writes nothing to live ranked (by design, per the plan).

## Local stack cheat sheet

Backend env (`/tmp/zone-local.env` on the build machine): local PG 5433 (`zonematch` db) + Redis 6379 + dummy Supabase
vars + `GUEST_HTTP_ENABLED`, `GUEST_LOBBIES_PROVISIONING_ENABLED`, `GUEST_LOBBIES_RECONNECT_ENABLED`,
`ZONE_MATCH_BOT_ENABLED`, `ZONE_MATCH_QUEUE_ENABLED` all true. Web: `NEXT_PUBLIC_API_URL=http://localhost:8010`,
`NEXT_PUBLIC_GUEST_LOBBIES=1`, `NEXT_PUBLIC_RANKED_V2=1`, `NEXT_PUBLIC_ZONE_BOT=1` (+ dummy Supabase).
Content: invented only — 14 fake clubs × 24 MCQs + 132 numerics in `room_pool`. **Real questions never go in these
public repos.** Tests: backend `npx vitest run tests/room` (308), web `npx vitest run src/features/zone-match` (140).

## Next steps (unchanged from the plan)

Staging PR (flags OFF) → owner-approved staging playtest with a real private content pool → durable bot driver /
roster bots → RP settlement bridge → the ranked switch (Phase 4). Do not merge, deploy, migrate shared databases or
switch live Ranked without the owner's separate approval.
