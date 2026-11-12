# Mentalista: shared-room pilot

Status: implemented and locally tested on a staging-based candidate; not committed, published or deployed. The internal game ID is `mentalista`. Local candidate browser checks are complete within the fixture scope below; staging and release validation remain pending.

## Mechanic and rationale

A rotating chooser privately picks one option from a public football category. Other players predict that exact pick. A matching predictor earns two points; the chooser earns none. This is social prediction, not a trivia question with one correct answer.

The provisional mechanic was inspired by [412 Mentalista Futbolero](https://www.youtube.com/watch?v=X9qJzPVylmk). Showing a fixed list of legal options is an adaptation, not a claim to reproduce every rule in the video. Creator engagement does not establish search demand, retention or player enjoyment.

A catalogue review found no equivalent hidden-prediction game in Quizball. [KickOffGames Química Futbolera](https://www.kickoff-games.com/juegos/quimica-futbolera) describes a related category, secret-choice and reveal loop; its account-gated gameplay has not been verified. This is a possible Quizball catalogue gap, not a claim of market novelty. Player feedback is still needed. The title is provisional and requires naming review before publication; creator branding and assets must not be copied.

## Shared-room implementation

`RoomScreen` routes Mentalista to `MentalistaRoom`. The frontend mirrors the server contract in `mentalista.server.ts` and uses the existing room connection, ready gate, command retry, resync, reconnect and leave flows. The backend registers a versioned Mentalista engine in the shared room runtime and uses the existing room tables and socket events. There are no Mentalista-specific match tables or socket namespaces.

The server owns phases, deadlines, scoring and standings. The UI renders each seat-specific snapshot without running the prototype engine or recalculating scores. It reads deadlines against the room server clock, disables actions while disconnected, expired or pending, and retains the same command identity and payload while a retry can still matter.

### Rules and commands

- Start with 3–6 admitted seats and one complete chooser cycle. The schedule freezes when the ready gate closes.
- Phases are `choose`, `predict`, `reveal`, then the next round or `over`.
- Commands are `{ type: "choose", round, option }` and `{ type: "predict", round, option }`, where `round` and `option` are zero-based indices. The authenticated connection determines the actor; the payload never supplies a seat.
- Each chooser commits once and each predictor locks one final prediction. A replacement command cannot revise a locked value.
- Default clocks are 20 seconds to choose, 20 seconds to predict and 5 seconds to reveal. Optional backend settings are flat `chooseMs`, `predictMs`, `revealMs`; bounds are 5–60, 5–60 and 2–15 seconds respectively. The UI uses the received deadline rather than assuming these defaults.
- An uncommitted chooser timeout or withdrawal voids that round. A committed choice survives the chooser leaving.
- Away seats remain eligible and clocks continue; disconnect does not pause the game. A predictor withdrawn before reveal earns no points for that round. Later departures do not rewrite banked results.
- A withdrawn future chooser slot is voided, never reassigned. Play can continue with two non-withdrawn seats. With one survivor present the game ends; one away survivor waits under the shared terminal rules; no survivors cancels the game.

See the backend `docs/MENTALISTA-BACKEND-CONTRACT.md` for exact validation order, timing bounds, outage behavior, content schema and migration sequence.

### Privacy and content

Public options are independent of the secret choice. Before reveal, only the author sees their own choice or prediction. Other seats receive commitment booleans, not values. Reveals expose banked outcomes; terminal and cancelled views do not disclose unfinished secrets.

Checked-in fixtures use invented names and categories. Runtime content may use reviewed real football subjects, but real content packs, answers and aliases stay in private storage and the database, never in these public repositories. Empty or insufficient content must fail safely. Legacy clients without the required game capability remain gated.

## Separate playground prototype

The development-only `/dev/games` entry contains a local Mentalista simulation with invented content and simulated opponents. It is not an online room or a public staging entry point. It defaults to two chooser cycles, permits prediction revisions and uses local active/dropped statuses, so its rules are not the authoritative shared-room contract.

The simulation offers 3/4/5/6 seats and `roundCycles`, `botSkill`, `speed` controls. Static fixtures cover chooser, predictor, reveal, timeout, offline and results screens. These are inspection tools, not proof of multiplayer synchronization.

## Reproducible checks

From the frontend repository with its pinned dependencies installed:

```sh
npm run typecheck
npm run colors:check
npm run build
npx vitest run src/features/mentalista \
  src/features/playground/mentalistaScenarios.test.ts \
  src/lib/lobby/__tests__/lobbyModes.test.ts \
  src/features/room/__tests__ \
  src/__tests__/i18n-parity.test.ts \
  src/features/friend/components/__tests__/FriendLobbyScreen.test.tsx \
  src/features/friend/components/__tests__/FriendLobbyScreen.settings-race.test.tsx \
  src/lib/realtime/__tests__/clientGames.test.ts
```

The staging-based candidate passed these 139 tests, the full TypeScript check, brand-color audit and production build. Scoped lint had no errors and one hook-dependency warning in `MentalistaSim.tsx`. The build also reported existing Supabase package export warnings.

The backend provides `npx vitest run --config vitest.mentalista.config.ts` for 30 pure Mentalista tests. Its separate DB integration config requires the exact isolated rehearsal services and identity checks documented in the backend contract. DB tests are excluded from the ordinary parallel suite; do not point them at a shared, staging or production database. Backend typecheck/build and 32 additional OpenAPI, off-switch and client-capability tests passed on the candidate.

The backend OpenAPI snapshot adds Mentalista. Regenerating the full exported schema and frontend API types also refreshes preexisting contract drift. To reproduce the frontend artifact, use `OPENAPI_URL=/path/to/reviewed/openapi.json npm run api:sync:local`, then the same file with `npm run api:check`. Review the broader generated changes separately from the game itself.

Local candidate browser checks used a private fixture with real game matches in English, Spanish and Georgian. Both observed matches finished with correct results; reconnect restored the open round, clocks continued during disconnect, and chooser/predictor timeouts scored correctly. Long Georgian options and reveal content wrapped at 320px. The fixture toolbar obscured the mobile header, so the entire mobile header and accessibility were not verified.

This fixture coverage excludes normal login, profile, lobby and return-navigation flows, and does not validate staging. It does not establish production readiness, complete browser/socket coverage, load behavior or comprehensive security. Consult the backend contract for specific integration-test exclusions and remaining coverage gaps.

## Release dependencies

1. Review and apply the seven additive whitelist migrations in order, then deploy backend support to every replica before enabling frontend entry points.
2. Validate and load reviewed environment-local private content separately. Git does not copy database content.
3. Verify the shared-room flow on staging, including minimum-seat admission, capability gating, secrecy, reconnect and departure behavior, against the exact deployed commits.
4. Review the entire staging-to-main release diff, including unrelated staging work, migrations and the content manifest. Do not treat this pilot as authorization to promote everything on staging.

No staging or production deployment has been performed for this candidate. The existing room-game off-switch must remain effective throughout rollout.
