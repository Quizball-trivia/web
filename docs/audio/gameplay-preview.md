# QuizUp gameplay audition

Open `/dev/sounds/play`, or use **Play with QuizUp sounds** in the sound library.

- Ranked: `/dev/animations`. Enable the mixer, reset the match, then answer within the timer. Use Next question or the existing scenario controls for goals, saves, penalties and final results. The MCQ stub now acknowledges real answer submissions, preserves the clicked option and prevents repeat scoring.
- Tic Tac Toe: `/dev/football-tic-tac-toe`. Enable the mixer and start the local practice match. It reuses the live board and answer panel, accepts the small displayed answer key, and plays against a deterministic rival. Invalid guesses and timeouts spend a turn. Restart clears pending callbacks. The existing UI scenarios are available from the top switch.
- Auction: `/dev/auction-play`. The existing playable mock Auction runs unchanged. Its event conductor routes scouting reveal, solo-pick urgency and match finish through QuizUp clips; bid, fold, sold and lot-win effects retain their existing assets.

The mixer shows recent game cues, offers per-action sound choices (including silence), volume and stop, and persists each mode independently on this device. It starts muted, collapses after enable, cancels audio on navigation or tab hiding, and suppresses background music during audition. Ranked's own mute button controls this same audition player. Auction's saved sound preference still applies to its conductor; keep sound effects enabled in Auction settings.

`src/lib/sounds/dev/profiles.ts` contains proposed mappings. Cue numbers are reference recording segments, not verified QuizUp event names. The recordings have no verified release permission. These assets are for comparison; this change does not activate them in live matches.

A thin optional React context adapts existing game sound calls only within development providers. Production callers retain their original functions. The ranked viewport emits optional goal/save cues at the visible result transition so desktop and mobile layouts do not double-play them. No new backend endpoints or match submissions are used by these harnesses.

## Verification (2026-09-05)

- TypeScript check passed; scoped ESLint checks passed. The ranked viewport retains its pre-existing Next `<img>` warning.
- 11 tests passed across sound asset integrity/player cancellation, dev adapter isolation/mapping integrity, and ranked penalty-kick deduplication.
- Browser: ranked real France answer emitted submit + correct once; a subsequent wrong scenario emitted the wrong cue. Existing pass sound remained active. Timer emitted the final three ticks and one expiry cue.
- Browser: Tic Tac Toe accepted Henry, Jesus and Cazorla, alternated scripted rival turns, completed a top-row win, and emitted selection/correct/reveal/turn/win in order. Inspected the completed board at 390 × 844; no horizontal clipping.
- Browser: Auction emitted four clue reveal cues, original bid coins, fold and sold bell during a real mock round. No browser runtime errors reported in this session.
- Release rights and original QuizUp event names remain unverified; no live-game rollout performed.

## Sound desk editor

`/dev/sounds/play` now provides all 32 wired events in the three dev games and all 81 library sounds. Drag a sound onto an event, or select a sound then activate an event by touch/keyboard. Both event and library rows have preview buttons; silence, source filtering, search and per-mode reset are included.

The editor and floating game mixer share validated v2 assignments with same-tab and cross-tab notifications. Old defaults migrate: wrong answer becomes Cue 15; submit and new question become silent. Other customized assignments are retained. Goal celebration remains Cue 01. Cue 06 and Cue 08 remain available in the library for manual selection.

Verified native mouse dragging, persistence into the actual ranked harness, mobile select/assign at 390px without overflow, default migration and isolated per-game settings. Shared mix tests pass alongside existing sound tests.
