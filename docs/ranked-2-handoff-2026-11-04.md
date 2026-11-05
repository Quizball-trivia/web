# Ranked 2.0 / Zone Match — interrupted work handoff

This is a work-in-progress preservation snapshot, not a release. The owner wants to continue on their server, starting with an invite-only human-vs-human online playtest; later work includes bots and matchmaking. Do not merge, deploy, apply migrations to a shared database, or switch live Ranked without the owner's separate approval.

## Repositories and starting points

- Web: `Quizball-trivia/web`, branch `feat/zone-match-animation-lab`. The commit containing this file includes the unfinished web room client, UI and shootout changes. Earlier commits on the branch include the 3D prototype and 28 playstyles.
- Backend: `Quizball-trivia/quizball-backend`, branch `feat/zone-match-room`, WIP commit `942ef8d5`. It starts from backend commit `2122f733` and adds the `zone_match` room engine, registration, seven migrations and tests.
- The web branch diverged from staging before later staging work. Fetch current staging, examine the merge base and the full diff, and integrate carefully before proposing a release. A raw comparison to today's staging includes unrelated differences and deletions; don't treat it as a ready-to-merge PR.
- The planning document is `docs/ranked-2-original-plan-2026-11-04.md`. It is a historical plan, not a verified implementation status; parts predate the latest code and its estimates and open questions are inconsistent in places. Inspect the actual work and owner decisions before relying on it.

## What is here

The web has a local prototype, 3D animations, a playstyle picker, stadium search, showdown and penalty shootout, plus an initial `ZoneMatchRoom` connected to the existing friend-room UI. The local entry route used during development was `/friend/room/new?room=zone_match`.

The backend has a server-run room adapter and game engine, per-seat views, a database-backed content deal, capability registration, and tests for engine play and hidden answers. The game uses two seats and does not yet establish a production Ranked switch. The initial implementation needs independent review, particularly hidden information and public APIs, command identity/deadlines, reconnect/outage/forfeit behavior, content exhaustion, compatibility, and agreement between the web and backend engine copies. Do not assume the two copies are byte-identical; verify the intended synchronization and imports.

The beta queue, socketless bot seat, persistent-bot reservation lifecycle, production settlement and RP integration are future work. Do not assume that the simulator bots implement the required server bot behavior.

## Last known verification and interruption

The previous Claude reported that web tests and lint passed, backend engine tests passed, and 47 room runtime integration tests passed against a locally migrated database. It also reported a football-grid test failing on the unchanged baseline. Those are prior-agent reports, not a fresh independent verification of the complete system. It was working through review findings, including redacting question IDs, when its API connection failed before the planned final two-browser end-to-end rerun and browser QA. Do not claim the match is ready or that this final rerun passed.

During handoff, the following were freshly rerun: web machine, shootout and seat-view suites (48 tests passed), backend zone engine suite (8 tests passed), and `git diff --check` in both worktrees. No complete browser flow or device test was rerun for this handoff.

Claude used an isolated local database and locally copied numeric items from another pool for development. This is not an approved staging seed: Ranked 2.0 needs its own private numeric pool, with no overlap with daily questions. The seven migrations are source files only; check actual environment state independently before any approved migration. Never copy production accounts or game history into staging.

## Next steps for the receiving agent

1. Read both diffs and the original plan, reconcile owner decisions and identify the current staging drift. Review the last implementation and remaining review findings independently.
2. Establish a safe local environment with invented fixtures or privately sourced content; real questions and answers must never be committed to the public repositories. Do not transfer local `.env` files or credentials through Git.
3. Rerun the relevant test suites and perform the interrupted two-browser friend-invite match from start to finish on the final code, including mobile-width UI, reconnect, leave/forfeit, idle timeouts and stale commands. Inspect for hidden-answer or question-ID leaks. Fix failures and repeat the affected tests.
4. Review UI/animation quality and confirm the requested flows and rules with the owner. Validate migrations and content inventory separately before proposing a staging playtest. No production release is authorized by this handoff.
5. Only after a sound human-vs-human playtest, plan and implement a server-driven bot seat and a separate beta queue, accounting for presence, durable timers and bot reservations. Preserve the existing live Ranked game until a separately reviewed switch is authorized.

Note: the WIP web registration adds `zone_match` to the general room-games list. Review feature gating and exposure before any shared deployment.
