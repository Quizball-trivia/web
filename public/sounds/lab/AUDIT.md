# Quizball game-mode sound audit

Date: 2026-09-05. Scope: active web checkout `grid-parity-web` (branch `feat/grid-bo3-web`), including live routes, shared variants, hidden but reachable demos, and all concept-lab modes. This is a source audit and audition proposal, not a claim that all new cues are integrated.

52 mode/variant entries, 517 action mappings. 29 original effects, 8 imported CC0 alternatives, 17 existing comparisons. Counts include shared variants and demo/live versions, not 52 distinct production game engines.

## Findings

- Possession/ranked: explicit answer, whistle, kick and pass cues.
- Daily: nine games have result feedback, directly or through useResultSplash. Imposter deliberately suppresses duplicate splash sound.
- Auction: the active checkout has seven dedicated cues; the older canonical checkout did not. Current auction conductor is the source of truth.
- Football Grid: confirmed command verdicts and kickoff whistle; additional turn/claim/results cues proposed.
- Free Kicks: crowdAudio handles ambience, cheer, kick and cashout.
- Party, training, campaign and most mini/concept controllers have no explicit SFX calls. Weekend League has board-specific Money Drop feedback.
- Existing file provenance varies. New CC0 assets retain their actual bundled license; existing tracks are not relabelled free.

## Reuse and timing

The reusable cue catalog covers selection, submission, verdicts, urgency, transitions, clues, goal contact, auction decisions, cashout, terminal results and rewards. Event rows specify where to bind each cue. Sample flows are illustrative successful sequences, not recordings of real server timing. Mutually exclusive outcomes remain individually playable.

Native mobile was checked for shared mode structure, but the detailed audit and implementation in this change target the active web checkout. Port the exported event map separately.

## Ranked possession

Group: Match modes. Source: `src/features/possession/hooks/usePossessionMatchSounds.ts`.

Shared possession controller: answer verdicts, passes, kick contact and phase whistles already have cues. Goals, saves, selection and end results need dedicated feedback.

| Action | Proposed cue | Current explicit cue | Timing |
| --- | --- | --- | --- |
| Match found | `found` | Not mapped here | Once when the match becomes ready; do not repeat during reconnect. |
| Ban category | `lock` | Not mapped here | When the category ban is accepted, once per draft action. |
| Start round | `ready` | Not mapped here | When the countdown hands over to active play, after audio is unlocked. |
| Select an answer | `select` | Not mapped here | On a committed selection; never on hover or every keystroke. |
| Lock in | `lock` | Not mapped here | Once a valid submission is accepted; disable while pending. |
| Correct answer | `correct` | `correctRanked` | On the confirmed result, once per question or command ID. |
| Wrong answer | `wrong` | `wrongAnswer` | On confirmed incorrect result. Never also play the timeout cue. |
| Last 3 seconds | `tick` | Not mapped here | One tick at each whole second: 3, 2, 1. Stop on answer, pause or end. |
| Time runs out | `timeout` | Not mapped here | Once when the active turn expires. Replaces wrong-answer feedback for no answer. |
| Pass completed | `pass` | `pass` | At the ball transfer or chain link animation; throttle rapid repeats. |
| Take the shot | `kick` | `kick` | At visible ball contact, not immediately on the shoot button. |
| Goal scored | `goal` | Not mapped here | At goal impact / score reveal, after the kick. |
| Keeper saves | `save` | Not mapped here | At glove contact or confirmed miss; no victory sting. |
| Half / phase ends | `whistle` | `whistle` | On halftime, shootout transition or final whistle; once per phase. |
| Streak milestone | `streak` | Not mapped here | At a meaningful confirmed milestone; replace or follow the regular correct cue. |
| Next question | `transition` | Not mapped here | At the visible question transition, not on data prefetch. |
| Win / complete | `win` | Not mapped here | When the final outcome is visible. Wait for the answer sound to finish. |
| Lose / eliminated | `lose` | Not mapped here | On the terminal loss, once. Do not layer on top of the wrong answer. |
| Draw | `draw` | Not mapped here | When the authoritative result is a draw. |
| Collect reward | `coins` | Not mapped here | When a reward is confirmed and visibly added; one cue per award. |
| Play resumes | `reconnect` | Not mapped here | Once when the paused match actually resumes. |

Audition flow: found → ready → select → correct → pass → kick → goal → win.

## Kickoff / solo

Group: Match modes. Source: `src/features/possession/hooks/usePossessionMatchSounds.ts`.

Shared possession controller: answer verdicts, passes, kick contact and phase whistles already have cues. Goals, saves, selection and end results need dedicated feedback.

| Action | Proposed cue | Current explicit cue | Timing |
| --- | --- | --- | --- |
| Match found | `found` | Not mapped here | Once when the match becomes ready; do not repeat during reconnect. |
| Ban category | `lock` | Not mapped here | When the category ban is accepted, once per draft action. |
| Start round | `ready` | Not mapped here | When the countdown hands over to active play, after audio is unlocked. |
| Select an answer | `select` | Not mapped here | On a committed selection; never on hover or every keystroke. |
| Lock in | `lock` | Not mapped here | Once a valid submission is accepted; disable while pending. |
| Correct answer | `correct` | `correctRanked` | On the confirmed result, once per question or command ID. |
| Wrong answer | `wrong` | `wrongAnswer` | On confirmed incorrect result. Never also play the timeout cue. |
| Last 3 seconds | `tick` | Not mapped here | One tick at each whole second: 3, 2, 1. Stop on answer, pause or end. |
| Time runs out | `timeout` | Not mapped here | Once when the active turn expires. Replaces wrong-answer feedback for no answer. |
| Pass completed | `pass` | `pass` | At the ball transfer or chain link animation; throttle rapid repeats. |
| Take the shot | `kick` | `kick` | At visible ball contact, not immediately on the shoot button. |
| Goal scored | `goal` | Not mapped here | At goal impact / score reveal, after the kick. |
| Keeper saves | `save` | Not mapped here | At glove contact or confirmed miss; no victory sting. |
| Half / phase ends | `whistle` | `whistle` | On halftime, shootout transition or final whistle; once per phase. |
| Streak milestone | `streak` | Not mapped here | At a meaningful confirmed milestone; replace or follow the regular correct cue. |
| Next question | `transition` | Not mapped here | At the visible question transition, not on data prefetch. |
| Win / complete | `win` | Not mapped here | When the final outcome is visible. Wait for the answer sound to finish. |
| Lose / eliminated | `lose` | Not mapped here | On the terminal loss, once. Do not layer on top of the wrong answer. |
| Draw | `draw` | Not mapped here | When the authoritative result is a draw. |
| Collect reward | `coins` | Not mapped here | When a reward is confirmed and visibly added; one cue per award. |
| Play resumes | `reconnect` | Not mapped here | Once when the paused match actually resumes. |

Audition flow: found → ready → select → correct → pass → kick → goal → win.

## Friendly possession

Group: Match modes. Source: `src/features/possession/hooks/usePossessionMatchSounds.ts`.

Shared possession controller: answer verdicts, passes, kick contact and phase whistles already have cues. Goals, saves, selection and end results need dedicated feedback.

| Action | Proposed cue | Current explicit cue | Timing |
| --- | --- | --- | --- |
| Match found | `found` | Not mapped here | Once when the match becomes ready; do not repeat during reconnect. |
| Ban category | `lock` | Not mapped here | When the category ban is accepted, once per draft action. |
| Start round | `ready` | Not mapped here | When the countdown hands over to active play, after audio is unlocked. |
| Select an answer | `select` | Not mapped here | On a committed selection; never on hover or every keystroke. |
| Lock in | `lock` | Not mapped here | Once a valid submission is accepted; disable while pending. |
| Correct answer | `correct` | `correctRanked` | On the confirmed result, once per question or command ID. |
| Wrong answer | `wrong` | `wrongAnswer` | On confirmed incorrect result. Never also play the timeout cue. |
| Last 3 seconds | `tick` | Not mapped here | One tick at each whole second: 3, 2, 1. Stop on answer, pause or end. |
| Time runs out | `timeout` | Not mapped here | Once when the active turn expires. Replaces wrong-answer feedback for no answer. |
| Pass completed | `pass` | `pass` | At the ball transfer or chain link animation; throttle rapid repeats. |
| Take the shot | `kick` | `kick` | At visible ball contact, not immediately on the shoot button. |
| Goal scored | `goal` | Not mapped here | At goal impact / score reveal, after the kick. |
| Keeper saves | `save` | Not mapped here | At glove contact or confirmed miss; no victory sting. |
| Half / phase ends | `whistle` | `whistle` | On halftime, shootout transition or final whistle; once per phase. |
| Streak milestone | `streak` | Not mapped here | At a meaningful confirmed milestone; replace or follow the regular correct cue. |
| Next question | `transition` | Not mapped here | At the visible question transition, not on data prefetch. |
| Win / complete | `win` | Not mapped here | When the final outcome is visible. Wait for the answer sound to finish. |
| Lose / eliminated | `lose` | Not mapped here | On the terminal loss, once. Do not layer on top of the wrong answer. |
| Draw | `draw` | Not mapped here | When the authoritative result is a draw. |
| Collect reward | `coins` | Not mapped here | When a reward is confirmed and visibly added; one cue per award. |
| Play resumes | `reconnect` | Not mapped here | Once when the paused match actually resumes. |

Audition flow: found → ready → select → correct → pass → kick → goal → win.

## Ranked penalties

Group: Match modes. Source: `src/features/possession/hooks/usePossessionMatchSounds.ts`.

Shootout is a possession phase, not a separate top-level game. Preserve animation-aligned kick timing.

| Action | Proposed cue | Current explicit cue | Timing |
| --- | --- | --- | --- |
| Half / phase ends | `whistle` | `whistle` | On halftime, shootout transition or final whistle; once per phase. |
| Start round | `ready` | Not mapped here | When the countdown hands over to active play, after audio is unlocked. |
| Select an answer | `select` | Not mapped here | On a committed selection; never on hover or every keystroke. |
| Lock in | `lock` | Not mapped here | Once a valid submission is accepted; disable while pending. |
| Correct answer | `correct` | `correctRanked` | On the confirmed result, once per question or command ID. |
| Wrong answer | `wrong` | `wrongAnswer` | On confirmed incorrect result. Never also play the timeout cue. |
| Last 3 seconds | `tick` | Not mapped here | One tick at each whole second: 3, 2, 1. Stop on answer, pause or end. |
| Time runs out | `timeout` | Not mapped here | Once when the active turn expires. Replaces wrong-answer feedback for no answer. |
| Take the shot | `kick` | `kick` | At visible ball contact, not immediately on the shoot button. |
| Goal scored | `goal` | Not mapped here | At goal impact / score reveal, after the kick. |
| Keeper saves | `save` | Not mapped here | At glove contact or confirmed miss; no victory sting. |
| Win / complete | `win` | Not mapped here | When the final outcome is visible. Wait for the answer sound to finish. |
| Lose / eliminated | `lose` | Not mapped here | On the terminal loss, once. Do not layer on top of the wrong answer. |

Audition flow: whistle → ready → select → kick → goal → win.

## Party Quiz

Group: Match modes. Source: `src/features/party/realtime/useRealtimePartyQuizViewModel.ts`.

The view model exposes music and mute controls but does not call playSfx. Use local-player verdicts; avoid a sound for every participant.

| Action | Proposed cue | Current explicit cue | Timing |
| --- | --- | --- | --- |
| Match found | `found` | Not mapped here | Once when the match becomes ready; do not repeat during reconnect. |
| Start round | `ready` | Not mapped here | When the countdown hands over to active play, after audio is unlocked. |
| Select an answer | `select` | Not mapped here | On a committed selection; never on hover or every keystroke. |
| Lock in | `lock` | Not mapped here | Once a valid submission is accepted; disable while pending. |
| Correct answer | `correct` | Not mapped here | On the confirmed result, once per question or command ID. |
| Wrong answer | `wrong` | Not mapped here | On confirmed incorrect result. Never also play the timeout cue. |
| Last 3 seconds | `tick` | Not mapped here | One tick at each whole second: 3, 2, 1. Stop on answer, pause or end. |
| Time runs out | `timeout` | Not mapped here | Once when the active turn expires. Replaces wrong-answer feedback for no answer. |
| Next question | `transition` | Not mapped here | At the visible question transition, not on data prefetch. |
| Streak milestone | `streak` | Not mapped here | At a meaningful confirmed milestone; replace or follow the regular correct cue. |
| Win / complete | `win` | Not mapped here | When the final outcome is visible. Wait for the answer sound to finish. |
| Lose / eliminated | `lose` | Not mapped here | On the terminal loss, once. Do not layer on top of the wrong answer. |
| Draw | `draw` | Not mapped here | When the authoritative result is a draw. |
| Collect reward | `coins` | Not mapped here | When a reward is confirmed and visibly added; one cue per award. |
| Play resumes | `reconnect` | Not mapped here | Once when the paused match actually resumes. |

Audition flow: found → ready → select → lock → correct → next → win.

## Auction

Group: Match modes. Source: `src/features/auction/hooks/useAuctionAudio.ts`.

Existing conductor covers clue, bid, fold, reveal, win, warning and finish. Add selection and targeted outbid feedback; distinguish personal results. auctionFinished already plays when the match reaches results.

| Action | Proposed cue | Current explicit cue | Timing |
| --- | --- | --- | --- |
| Match found | `found` | Not mapped here | Once when the match becomes ready; do not repeat during reconnect. |
| Start round | `ready` | Not mapped here | When the countdown hands over to active play, after audio is unlocked. |
| Place / reorder | `tap` | Not mapped here | When a tile or card lands in a new valid position, not during drag. |
| Reveal clue | `reveal` | `auctionClue` | When a new clue becomes visible; one cue per reveal. |
| Place a bid | `bid` | `auctionBid` | When your bid is accepted, not on each amount adjustment. |
| You are outbid | `outbid` | Not mapped here | Only when your leading bid is overtaken; avoid every rival update. |
| Fold / pass turn | `back` | `auctionFold` | When your fold is accepted; no sound for repeated clicks. |
| Last 3 seconds | `tick` | `auctionWarning` | One tick at each whole second: 3, 2, 1. Stop on answer, pause or end. |
| Player sold | `sold` | `auctionReveal` | When the winner and price are revealed; delay a personal win flourish. |
| Win / complete | `win` | `auctionWon` | When the final outcome is visible. Wait for the answer sound to finish. |
| Lose / eliminated | `lose` | Not mapped here | On the terminal loss, once. Do not layer on top of the wrong answer. |
| Collect reward | `coins` | Not mapped here | When a reward is confirmed and visibly added; one cue per award. |
| Play resumes | `reconnect` | Not mapped here | Once when the paused match actually resumes. |

Audition flow: found → reveal → bid → sold → win → coins.

## Football Tic Tac Toe · live

Group: Match modes. Source: `src/features/football-grid/hooks/useFootballGridAudio.ts`.

Correct/wrong command results and kickoff whistle are wired. Extend to square selection, claim, turn timeout and best-of-three outcome.

| Action | Proposed cue | Current explicit cue | Timing |
| --- | --- | --- | --- |
| Match found | `found` | Not mapped here | Once when the match becomes ready; do not repeat during reconnect. |
| Start round | `ready` | `whistle` | When the countdown hands over to active play, after audio is unlocked. |
| Select an answer | `select` | Not mapped here | On a committed selection; never on hover or every keystroke. |
| Lock in | `lock` | Not mapped here | Once a valid submission is accepted; disable while pending. |
| Correct answer | `correct` | `correctRanked` | On the confirmed result, once per question or command ID. |
| Wrong answer | `wrong` | `wrongAnswer` | On confirmed incorrect result. Never also play the timeout cue. |
| Place / reorder | `tap` | Not mapped here | When a tile or card lands in a new valid position, not during drag. |
| Last 3 seconds | `tick` | Not mapped here | One tick at each whole second: 3, 2, 1. Stop on answer, pause or end. |
| Time runs out | `timeout` | Not mapped here | Once when the active turn expires. Replaces wrong-answer feedback for no answer. |
| Next question | `transition` | Not mapped here | At the visible question transition, not on data prefetch. |
| Win / complete | `win` | Not mapped here | When the final outcome is visible. Wait for the answer sound to finish. |
| Lose / eliminated | `lose` | Not mapped here | On the terminal loss, once. Do not layer on top of the wrong answer. |
| Draw | `draw` | Not mapped here | When the authoritative result is a draw. |
| Play resumes | `reconnect` | Not mapped here | Once when the paused match actually resumes. |

Audition flow: found → ready → select → lock → correct → place → win.

## Weekend League

Group: Match modes. Source: `src/features/weekend-league/gauntlet/RoundViews.tsx`.

Gauntlet has several board types; MoneyDropBoard has explicit verdict SFX. Share answer/timer events across boards and add qualification, elimination and finish feedback. Existing Money Drop correct/wrong coverage is board-specific, so shared rows remain marked as gaps.

| Action | Proposed cue | Current explicit cue | Timing |
| --- | --- | --- | --- |
| Start round | `ready` | Not mapped here | When the countdown hands over to active play, after audio is unlocked. |
| Select an answer | `select` | Not mapped here | On a committed selection; never on hover or every keystroke. |
| Place / reorder | `tap` | Not mapped here | When a tile or card lands in a new valid position, not during drag. |
| Lock in | `lock` | Not mapped here | Once a valid submission is accepted; disable while pending. |
| Correct answer | `correct` | Not mapped here | On the confirmed result, once per question or command ID. |
| Wrong answer | `wrong` | Not mapped here | On confirmed incorrect result. Never also play the timeout cue. |
| Reveal clue | `reveal` | Not mapped here | When a new clue becomes visible; one cue per reveal. |
| Use a lifeline | `power` | Not mapped here | When a lifeline is successfully consumed, not when its dialog opens. |
| Money drops | `drop` | Not mapped here | On the falling-money animation, after the answer verdict. |
| Last 3 seconds | `tick` | Not mapped here | One tick at each whole second: 3, 2, 1. Stop on answer, pause or end. |
| Time runs out | `timeout` | Not mapped here | Once when the active turn expires. Replaces wrong-answer feedback for no answer. |
| Next question | `transition` | Not mapped here | At the visible question transition, not on data prefetch. |
| Win / complete | `win` | Not mapped here | When the final outcome is visible. Wait for the answer sound to finish. |
| Lose / eliminated | `lose` | Not mapped here | On the terminal loss, once. Do not layer on top of the wrong answer. |
| Collect reward | `coins` | Not mapped here | When a reward is confirmed and visibly added; one cue per award. |

Audition flow: ready → select → lock → correct → next → win.

## Training match

Group: Match modes. Source: `src/features/training/hooks/useTrainingMatch.ts`.

Local training mirrors possession phases but has no explicit SFX calls in its state controller. Keep tutorials audible only after a user gesture.

| Action | Proposed cue | Current explicit cue | Timing |
| --- | --- | --- | --- |
| Ban category | `lock` | Not mapped here | When the category ban is accepted, once per draft action. |
| Start round | `ready` | Not mapped here | When the countdown hands over to active play, after audio is unlocked. |
| Select an answer | `select` | Not mapped here | On a committed selection; never on hover or every keystroke. |
| Correct answer | `correct` | Not mapped here | On the confirmed result, once per question or command ID. |
| Wrong answer | `wrong` | Not mapped here | On confirmed incorrect result. Never also play the timeout cue. |
| Last 3 seconds | `tick` | Not mapped here | One tick at each whole second: 3, 2, 1. Stop on answer, pause or end. |
| Time runs out | `timeout` | Not mapped here | Once when the active turn expires. Replaces wrong-answer feedback for no answer. |
| Pass completed | `pass` | Not mapped here | At the ball transfer or chain link animation; throttle rapid repeats. |
| Take the shot | `kick` | Not mapped here | At visible ball contact, not immediately on the shoot button. |
| Goal scored | `goal` | Not mapped here | At goal impact / score reveal, after the kick. |
| Keeper saves | `save` | Not mapped here | At glove contact or confirmed miss; no victory sting. |
| Half / phase ends | `whistle` | Not mapped here | On halftime, shootout transition or final whistle; once per phase. |
| Next question | `transition` | Not mapped here | At the visible question transition, not on data prefetch. |
| Win / complete | `win` | Not mapped here | When the final outcome is visible. Wait for the answer sound to finish. |
| Lose / eliminated | `lose` | Not mapped here | On the terminal loss, once. Do not layer on top of the wrong answer. |

Audition flow: ban → ready → select → correct → kick → goal → win.

## Public football quiz

Group: Match modes. Source: `src/features/campaign-quiz/CampaignQuizGame.tsx`.

Public campaign quiz is silent. Play verdicts after the answer API succeeds, with optional soft next-question and completion cues.

| Action | Proposed cue | Current explicit cue | Timing |
| --- | --- | --- | --- |
| Select an answer | `select` | Not mapped here | On a committed selection; never on hover or every keystroke. |
| Lock in | `lock` | Not mapped here | Once a valid submission is accepted; disable while pending. |
| Correct answer | `correct` | Not mapped here | On the confirmed result, once per question or command ID. |
| Wrong answer | `wrong` | Not mapped here | On confirmed incorrect result. Never also play the timeout cue. |
| Next question | `transition` | Not mapped here | At the visible question transition, not on data prefetch. |
| Win / complete | `win` | Not mapped here | When the final outcome is visible. Wait for the answer sound to finish. |
| Back / dismiss | `back` | Not mapped here | On deliberate dismissal or cancellation. Quit confirmation stays distinct. |

Audition flow: select → lock → correct → next → win.

## True or False

Group: Daily games. Source: `src/features/daily/TrueFalseGame.tsx`.

Two answer buttons share useResultSplash verdict audio.

| Action | Proposed cue | Current explicit cue | Timing |
| --- | --- | --- | --- |
| Select an answer | `select` | Not mapped here | On a committed selection; never on hover or every keystroke. |
| Correct answer | `correct` | `dailyCorrect` | On the confirmed result, once per question or command ID. |
| Wrong answer | `wrong` | `wrongAnswer` | On confirmed incorrect result. Never also play the timeout cue. |
| Last 3 seconds | `tick` | Not mapped here | One tick at each whole second: 3, 2, 1. Stop on answer, pause or end. |
| Time runs out | `timeout` | Not mapped here | Once when the active turn expires. Replaces wrong-answer feedback for no answer. |
| Next question | `transition` | Not mapped here | At the visible question transition, not on data prefetch. |
| Win / complete | `win` | Not mapped here | When the final outcome is visible. Wait for the answer sound to finish. |

Audition flow: select → correct → next → win.

## Higher or Lower

Group: Daily games. Source: `src/features/daily/HighLowGame.tsx`.

Left/right picks share useResultSplash verdict audio.

| Action | Proposed cue | Current explicit cue | Timing |
| --- | --- | --- | --- |
| Select an answer | `select` | Not mapped here | On a committed selection; never on hover or every keystroke. |
| Correct answer | `correct` | `dailyCorrect` | On the confirmed result, once per question or command ID. |
| Wrong answer | `wrong` | `wrongAnswer` | On confirmed incorrect result. Never also play the timeout cue. |
| Reveal clue | `reveal` | Not mapped here | When a new clue becomes visible; one cue per reveal. |
| Next question | `transition` | Not mapped here | At the visible question transition, not on data prefetch. |
| Win / complete | `win` | Not mapped here | When the final outcome is visible. Wait for the answer sound to finish. |

Audition flow: select → correct → next → win.

## Career Path

Group: Daily games. Source: `src/features/daily/CareerPathGame.tsx`.

Text submission shares useResultSplash. Club trail is static; do not invent repeated reveal ticks.

| Action | Proposed cue | Current explicit cue | Timing |
| --- | --- | --- | --- |
| Lock in | `lock` | Not mapped here | Once a valid submission is accepted; disable while pending. |
| Correct answer | `correct` | `dailyCorrect` | On the confirmed result, once per question or command ID. |
| Wrong answer | `wrong` | `wrongAnswer` | On confirmed incorrect result. Never also play the timeout cue. |
| Last 3 seconds | `tick` | Not mapped here | One tick at each whole second: 3, 2, 1. Stop on answer, pause or end. |
| Time runs out | `timeout` | Not mapped here | Once when the active turn expires. Replaces wrong-answer feedback for no answer. |
| Next question | `transition` | Not mapped here | At the visible question transition, not on data prefetch. |
| Win / complete | `win` | Not mapped here | When the final outcome is visible. Wait for the answer sound to finish. |

Audition flow: lock → correct → next → win.

## Clues

Group: Daily games. Source: `src/features/daily/ClueGame.tsx`.

Progressive clue reveals are silent; correct answer and failed guesses already sound.

| Action | Proposed cue | Current explicit cue | Timing |
| --- | --- | --- | --- |
| Reveal clue | `reveal` | Not mapped here | When a new clue becomes visible; one cue per reveal. |
| Lock in | `lock` | Not mapped here | Once a valid submission is accepted; disable while pending. |
| Correct answer | `correct` | `dailyCorrect` | On the confirmed result, once per question or command ID. |
| Wrong answer | `wrong` | `wrongAnswer` | On confirmed incorrect result. Never also play the timeout cue. |
| Last 3 seconds | `tick` | Not mapped here | One tick at each whole second: 3, 2, 1. Stop on answer, pause or end. |
| Time runs out | `timeout` | Not mapped here | Once when the active turn expires. Replaces wrong-answer feedback for no answer. |
| Fold / pass turn | `back` | Not mapped here | When your fold is accepted; no sound for repeated clicks. |
| Next question | `transition` | Not mapped here | At the visible question transition, not on data prefetch. |
| Win / complete | `win` | Not mapped here | When the final outcome is visible. Wait for the answer sound to finish. |

Audition flow: reveal → lock → correct → next → win.

## Countdown

Group: Daily games. Source: `src/features/daily/CountdownGame.tsx`.

Automatic matching and explicit submissions already play result audio. Failed text changes should remain silent.

| Action | Proposed cue | Current explicit cue | Timing |
| --- | --- | --- | --- |
| Lock in | `lock` | Not mapped here | Once a valid submission is accepted; disable while pending. |
| Correct answer | `correct` | `dailyCorrect` | On the confirmed result, once per question or command ID. |
| Wrong answer | `wrong` | `wrongAnswer` | On confirmed incorrect result. Never also play the timeout cue. |
| Last 3 seconds | `tick` | Not mapped here | One tick at each whole second: 3, 2, 1. Stop on answer, pause or end. |
| Time runs out | `timeout` | Not mapped here | Once when the active turn expires. Replaces wrong-answer feedback for no answer. |
| Fold / pass turn | `back` | Not mapped here | When your fold is accepted; no sound for repeated clicks. |
| Next question | `transition` | Not mapped here | At the visible question transition, not on data prefetch. |
| Win / complete | `win` | Not mapped here | When the final outcome is visible. Wait for the answer sound to finish. |

Audition flow: lock → correct → next → win.

## Put in Order

Group: Daily games. Source: `src/features/daily/PutInOrderGame.tsx`.

Verdict plays on Check order. Drag-end placement and next-round transitions need cues.

| Action | Proposed cue | Current explicit cue | Timing |
| --- | --- | --- | --- |
| Place / reorder | `tap` | Not mapped here | When a tile or card lands in a new valid position, not during drag. |
| Lock in | `lock` | Not mapped here | Once a valid submission is accepted; disable while pending. |
| Correct answer | `correct` | `dailyCorrect` | On the confirmed result, once per question or command ID. |
| Wrong answer | `wrong` | `wrongAnswer` | On confirmed incorrect result. Never also play the timeout cue. |
| Next question | `transition` | Not mapped here | At the visible question transition, not on data prefetch. |
| Win / complete | `win` | Not mapped here | When the final outcome is visible. Wait for the answer sound to finish. |

Audition flow: place → lock → correct → next → win.

## Imposter

Group: Daily games. Source: `src/features/daily/ImposterGame.tsx`.

Selection is silent; reveal sting exists with silent splash to avoid duplicates.

| Action | Proposed cue | Current explicit cue | Timing |
| --- | --- | --- | --- |
| Select an answer | `select` | Not mapped here | On a committed selection; never on hover or every keystroke. |
| Lock in | `lock` | Not mapped here | Once a valid submission is accepted; disable while pending. |
| Imposter exposed | `imposter` | `imposterReveal` | On the identity reveal. Avoid stacking the wrong-answer buzzer. |
| Correct answer | `correct` | `dailyCorrect` | On the confirmed result, once per question or command ID. |
| Wrong answer | `wrong` | Not mapped here | On confirmed incorrect result. Never also play the timeout cue. |
| Last 3 seconds | `tick` | Not mapped here | One tick at each whole second: 3, 2, 1. Stop on answer, pause or end. |
| Time runs out | `timeout` | Not mapped here | Once when the active turn expires. Replaces wrong-answer feedback for no answer. |
| Next question | `transition` | Not mapped here | At the visible question transition, not on data prefetch. |
| Win / complete | `win` | Not mapped here | When the final outcome is visible. Wait for the answer sound to finish. |

Audition flow: select → lock → imposter → correct → next → win.

## Football Logic

Group: Daily games. Source: `src/features/daily/FootballLogicGame.tsx`.

Image puzzle has explicit correct/wrong submission cues.

| Action | Proposed cue | Current explicit cue | Timing |
| --- | --- | --- | --- |
| Lock in | `lock` | Not mapped here | Once a valid submission is accepted; disable while pending. |
| Correct answer | `correct` | `dailyCorrect` | On the confirmed result, once per question or command ID. |
| Wrong answer | `wrong` | `wrongAnswer` | On confirmed incorrect result. Never also play the timeout cue. |
| Last 3 seconds | `tick` | Not mapped here | One tick at each whole second: 3, 2, 1. Stop on answer, pause or end. |
| Time runs out | `timeout` | Not mapped here | Once when the active turn expires. Replaces wrong-answer feedback for no answer. |
| Next question | `transition` | Not mapped here | At the visible question transition, not on data prefetch. |
| Win / complete | `win` | Not mapped here | When the final outcome is visible. Wait for the answer sound to finish. |

Audition flow: lock → correct → next → win.

## Money Drop

Group: Daily games. Source: `src/features/daily/MoneyDropGame.tsx`.

Correct/wrong checks money retained, not a single selected answer. Cue sliders on commit only; protect verdict/drop sequencing.

| Action | Proposed cue | Current explicit cue | Timing |
| --- | --- | --- | --- |
| Place / reorder | `tap` | Not mapped here | When a tile or card lands in a new valid position, not during drag. |
| Lock in | `lock` | Not mapped here | Once a valid submission is accepted; disable while pending. |
| Correct answer | `correct` | `dailyCorrect` | On the confirmed result, once per question or command ID. |
| Wrong answer | `wrong` | `wrongAnswer` | On confirmed incorrect result. Never also play the timeout cue. |
| Money drops | `drop` | Not mapped here | On the falling-money animation, after the answer verdict. |
| Use a lifeline | `power` | Not mapped here | When a lifeline is successfully consumed, not when its dialog opens. |
| Reveal clue | `reveal` | Not mapped here | When a new clue becomes visible; one cue per reveal. |
| Last 3 seconds | `tick` | Not mapped here | One tick at each whole second: 3, 2, 1. Stop on answer, pause or end. |
| Time runs out | `timeout` | Not mapped here | Once when the active turn expires. Replaces wrong-answer feedback for no answer. |
| Next question | `transition` | Not mapped here | At the visible question transition, not on data prefetch. |
| Win / complete | `win` | Not mapped here | When the final outcome is visible. Wait for the answer sound to finish. |
| Collect reward | `coins` | Not mapped here | When a reward is confirmed and visibly added; one cue per award. |

Audition flow: place → lock → correct → drop → next → win.

## Free Kicks

Group: Mini-games. Source: `src/features/mini-games/components/FinalThird.tsx`.

Live + demo. Existing crowdAudio handles kick, cheer and cashout; new cues fill quiz decisions and saves.

| Action | Proposed cue | Current explicit cue | Timing |
| --- | --- | --- | --- |
| Start round | `ready` | Not mapped here | When the countdown hands over to active play, after audio is unlocked. |
| Select an answer | `select` | Not mapped here | On a committed selection; never on hover or every keystroke. |
| Lock in | `lock` | Not mapped here | Once a valid submission is accepted; disable while pending. |
| Correct answer | `correct` | Not mapped here | On the confirmed result, once per question or command ID. |
| Wrong answer | `wrong` | Not mapped here | On confirmed incorrect result. Never also play the timeout cue. |
| Reveal clue | `reveal` | Not mapped here | When a new clue becomes visible; one cue per reveal. |
| Use a lifeline | `power` | Not mapped here | When a lifeline is successfully consumed, not when its dialog opens. |
| Take the shot | `kick` | `freeKick` | At visible ball contact, not immediately on the shoot button. |
| Goal scored | `goal` | `crowdGoal` | At goal impact / score reveal, after the kick. |
| Keeper saves | `save` | Not mapped here | At glove contact or confirmed miss; no victory sting. |
| Cash out | `coins` | `cashOut` | Only after cashout is confirmed, never for a pending or rejected request. |
| Next question | `transition` | Not mapped here | At the visible question transition, not on data prefetch. |
| Lose / eliminated | `lose` | Not mapped here | On the terminal loss, once. Do not layer on top of the wrong answer. |

Audition flow: ready → select → correct → kick → goal → cash.

## Road to Goal

Group: Mini-games. Source: `src/features/mini-games/components/RoadToGoal.tsx`.

Feature-gated live + demo. Answer defenders, advance zones, continue or cash out. Trigger rewards only after confirmed settlement.

| Action | Proposed cue | Current explicit cue | Timing |
| --- | --- | --- | --- |
| Start round | `ready` | Not mapped here | When the countdown hands over to active play, after audio is unlocked. |
| Select an answer | `select` | Not mapped here | On a committed selection; never on hover or every keystroke. |
| Lock in | `lock` | Not mapped here | Once a valid submission is accepted; disable while pending. |
| Correct answer | `correct` | Not mapped here | On the confirmed result, once per question or command ID. |
| Wrong answer | `wrong` | Not mapped here | On confirmed incorrect result. Never also play the timeout cue. |
| Pass completed | `pass` | Not mapped here | At the ball transfer or chain link animation; throttle rapid repeats. |
| Streak milestone | `streak` | Not mapped here | At a meaningful confirmed milestone; replace or follow the regular correct cue. |
| Cash out | `coins` | Not mapped here | Only after cashout is confirmed, never for a pending or rejected request. |
| Next question | `transition` | Not mapped here | At the visible question transition, not on data prefetch. |
| Lose / eliminated | `lose` | Not mapped here | On the terminal loss, once. Do not layer on top of the wrong answer. |

Audition flow: ready → select → correct → pass → streak → cash.

## Guess the Goal

Group: Mini-games. Source: `src/features/mini-games/components/GuessTheGoalLive.tsx`.

Live and demo variants. Tactics replay reveals an iconic goal; guess, answer bonus, then advance. No per-frame replay sounds.

| Action | Proposed cue | Current explicit cue | Timing |
| --- | --- | --- | --- |
| Start round | `ready` | Not mapped here | When the countdown hands over to active play, after audio is unlocked. |
| Reveal clue | `reveal` | Not mapped here | When a new clue becomes visible; one cue per reveal. |
| Select an answer | `select` | Not mapped here | On a committed selection; never on hover or every keystroke. |
| Lock in | `lock` | Not mapped here | Once a valid submission is accepted; disable while pending. |
| Correct answer | `correct` | Not mapped here | On the confirmed result, once per question or command ID. |
| Wrong answer | `wrong` | Not mapped here | On confirmed incorrect result. Never also play the timeout cue. |
| Use a lifeline | `power` | Not mapped here | When a lifeline is successfully consumed, not when its dialog opens. |
| Next question | `transition` | Not mapped here | At the visible question transition, not on data prefetch. |
| Win / complete | `win` | Not mapped here | When the final outcome is visible. Wait for the answer sound to finish. |

Audition flow: ready → reveal → select → lock → correct → next → win.

## FIFA Cards / Guess the Card

Group: Mini-games. Source: `src/features/mini-games/components/GuessFifaCard.tsx`.

Daily route and demo reuse this card puzzle. Reveal identity clues, submit a name, advance cards.

| Action | Proposed cue | Current explicit cue | Timing |
| --- | --- | --- | --- |
| Start round | `ready` | Not mapped here | When the countdown hands over to active play, after audio is unlocked. |
| Reveal clue | `reveal` | Not mapped here | When a new clue becomes visible; one cue per reveal. |
| Lock in | `lock` | Not mapped here | Once a valid submission is accepted; disable while pending. |
| Correct answer | `correct` | Not mapped here | On the confirmed result, once per question or command ID. |
| Wrong answer | `wrong` | Not mapped here | On confirmed incorrect result. Never also play the timeout cue. |
| Last 3 seconds | `tick` | Not mapped here | One tick at each whole second: 3, 2, 1. Stop on answer, pause or end. |
| Time runs out | `timeout` | Not mapped here | Once when the active turn expires. Replaces wrong-answer feedback for no answer. |
| Next question | `transition` | Not mapped here | At the visible question transition, not on data prefetch. |
| Win / complete | `win` | Not mapped here | When the final outcome is visible. Wait for the answer sound to finish. |

Audition flow: ready → reveal → lock → correct → next → win.

## Squad Spin

Group: Mini-games. Source: `src/features/mini-games/components/SquadSpin.tsx`.

Spin club, nation and position; submit a matching footballer.

| Action | Proposed cue | Current explicit cue | Timing |
| --- | --- | --- | --- |
| Spin starts | `transition` | Not mapped here | One short start sweep; no continuous wheel-tick loop. |
| Wheel stops | `reveal` | Not mapped here | When the result settles, before any reward chime. |
| Lock in | `lock` | Not mapped here | Once a valid submission is accepted; disable while pending. |
| Correct answer | `correct` | Not mapped here | On the confirmed result, once per question or command ID. |
| Wrong answer | `wrong` | Not mapped here | On confirmed incorrect result. Never also play the timeout cue. |
| Next question | `transition` | Not mapped here | At the visible question transition, not on data prefetch. |
| Win / complete | `win` | Not mapped here | When the final outcome is visible. Wait for the answer sound to finish. |

Audition flow: spin → spinStop → lock → correct → win.

## Trivia Spin

Group: Mini-games. Source: `src/features/mini-games/components/TriviaSpin.tsx`.

Hidden demo. Answer questions to earn a spin, then reveal the wheel payout.

| Action | Proposed cue | Current explicit cue | Timing |
| --- | --- | --- | --- |
| Select an answer | `select` | Not mapped here | On a committed selection; never on hover or every keystroke. |
| Correct answer | `correct` | Not mapped here | On the confirmed result, once per question or command ID. |
| Wrong answer | `wrong` | Not mapped here | On confirmed incorrect result. Never also play the timeout cue. |
| Next question | `transition` | Not mapped here | At the visible question transition, not on data prefetch. |
| Spin starts | `transition` | Not mapped here | One short start sweep; no continuous wheel-tick loop. |
| Wheel stops | `reveal` | Not mapped here | When the result settles, before any reward chime. |
| Collect reward | `coins` | Not mapped here | When a reward is confirmed and visibly added; one cue per award. |

Audition flow: select → correct → spin → spinStop → coins.

## Penalty Shootout · demo

Group: Mini-games. Source: `src/features/mini-games/components/PenaltyShootout.tsx`.

Hidden demo. Trivia earns a shot; choose shooter or keeper zone across five rounds.

| Action | Proposed cue | Current explicit cue | Timing |
| --- | --- | --- | --- |
| Start round | `ready` | Not mapped here | When the countdown hands over to active play, after audio is unlocked. |
| Select an answer | `select` | Not mapped here | On a committed selection; never on hover or every keystroke. |
| Correct answer | `correct` | Not mapped here | On the confirmed result, once per question or command ID. |
| Wrong answer | `wrong` | Not mapped here | On confirmed incorrect result. Never also play the timeout cue. |
| Take the shot | `kick` | Not mapped here | At visible ball contact, not immediately on the shoot button. |
| Goal scored | `goal` | Not mapped here | At goal impact / score reveal, after the kick. |
| Keeper saves | `save` | Not mapped here | At glove contact or confirmed miss; no victory sting. |
| Next question | `transition` | Not mapped here | At the visible question transition, not on data prefetch. |
| Win / complete | `win` | Not mapped here | When the final outcome is visible. Wait for the answer sound to finish. |
| Lose / eliminated | `lose` | Not mapped here | On the terminal loss, once. Do not layer on top of the wrong answer. |
| Draw | `draw` | Not mapped here | When the authoritative result is a draw. |

Audition flow: ready → select → correct → kick → goal → win.

## Daily Jackpot

Group: Mini-games. Source: `src/features/mini-games/components/DailyJackpot.tsx`.

Hidden demo. One difficult answer resolves the shared pot.

| Action | Proposed cue | Current explicit cue | Timing |
| --- | --- | --- | --- |
| Lock in | `lock` | Not mapped here | Once a valid submission is accepted; disable while pending. |
| Correct answer | `correct` | Not mapped here | On the confirmed result, once per question or command ID. |
| Wrong answer | `wrong` | Not mapped here | On confirmed incorrect result. Never also play the timeout cue. |
| Win / complete | `win` | Not mapped here | When the final outcome is visible. Wait for the answer sound to finish. |
| Collect reward | `coins` | Not mapped here | When a reward is confirmed and visibly added; one cue per award. |

Audition flow: lock → correct → win → coins.

## Pass Chain

Group: Mini-games. Source: `src/features/mini-games/components/PassChain.tsx`.

Submit footballers connected by a shared club; score a completed chain.

| Action | Proposed cue | Current explicit cue | Timing |
| --- | --- | --- | --- |
| Lock in | `lock` | Not mapped here | Once a valid submission is accepted; disable while pending. |
| Correct answer | `correct` | Not mapped here | On the confirmed result, once per question or command ID. |
| Wrong answer | `wrong` | Not mapped here | On confirmed incorrect result. Never also play the timeout cue. |
| Pass completed | `pass` | Not mapped here | At the ball transfer or chain link animation; throttle rapid repeats. |
| Back / dismiss | `back` | Not mapped here | On deliberate dismissal or cancellation. Quit confirmation stays distinct. |
| Next question | `transition` | Not mapped here | At the visible question transition, not on data prefetch. |
| Win / complete | `win` | Not mapped here | When the final outcome is visible. Wait for the answer sound to finish. |

Audition flow: lock → correct → pass → win.

## Accumulator

Group: Mini-games. Source: `src/features/mini-games/components/Accumulator.tsx`.

Select legs, lock the slip, resolve each leg and optionally cash out.

| Action | Proposed cue | Current explicit cue | Timing |
| --- | --- | --- | --- |
| Select an answer | `select` | Not mapped here | On a committed selection; never on hover or every keystroke. |
| Lock in | `lock` | Not mapped here | Once a valid submission is accepted; disable while pending. |
| Correct answer | `correct` | Not mapped here | On the confirmed result, once per question or command ID. |
| Wrong answer | `wrong` | Not mapped here | On confirmed incorrect result. Never also play the timeout cue. |
| Next question | `transition` | Not mapped here | At the visible question transition, not on data prefetch. |
| Cash out | `coins` | Not mapped here | Only after cashout is confirmed, never for a pending or rejected request. |
| Win / complete | `win` | Not mapped here | When the final outcome is visible. Wait for the answer sound to finish. |
| Lose / eliminated | `lose` | Not mapped here | On the terminal loss, once. Do not layer on top of the wrong answer. |

Audition flow: select → lock → correct → next → cash.

## Squad Collection

Group: Mini-games. Source: `src/features/mini-games/components/SquadCollection.tsx`.

Answer trivia, reveal a footballer card, place it in the formation.

| Action | Proposed cue | Current explicit cue | Timing |
| --- | --- | --- | --- |
| Select an answer | `select` | Not mapped here | On a committed selection; never on hover or every keystroke. |
| Correct answer | `correct` | Not mapped here | On the confirmed result, once per question or command ID. |
| Wrong answer | `wrong` | Not mapped here | On confirmed incorrect result. Never also play the timeout cue. |
| Reveal clue | `reveal` | Not mapped here | When a new clue becomes visible; one cue per reveal. |
| Place / reorder | `tap` | Not mapped here | When a tile or card lands in a new valid position, not during drag. |
| Next question | `transition` | Not mapped here | At the visible question transition, not on data prefetch. |
| Win / complete | `win` | Not mapped here | When the final outcome is visible. Wait for the answer sound to finish. |

Audition flow: select → correct → reveal → place → win.

## Cash Out Ladder

Group: Mini-games. Source: `src/features/mini-games/components/CashOutLadder.tsx`.

Answer to climb the multiplier ladder; bank or risk the next question.

| Action | Proposed cue | Current explicit cue | Timing |
| --- | --- | --- | --- |
| Start round | `ready` | Not mapped here | When the countdown hands over to active play, after audio is unlocked. |
| Select an answer | `select` | Not mapped here | On a committed selection; never on hover or every keystroke. |
| Correct answer | `correct` | Not mapped here | On the confirmed result, once per question or command ID. |
| Wrong answer | `wrong` | Not mapped here | On confirmed incorrect result. Never also play the timeout cue. |
| Streak milestone | `streak` | Not mapped here | At a meaningful confirmed milestone; replace or follow the regular correct cue. |
| Next question | `transition` | Not mapped here | At the visible question transition, not on data prefetch. |
| Cash out | `coins` | Not mapped here | Only after cashout is confirmed, never for a pending or rejected request. |
| Lose / eliminated | `lose` | Not mapped here | On the terminal loss, once. Do not layer on top of the wrong answer. |

Audition flow: ready → select → correct → streak → cash.

## Bet Slip Booster

Group: Mini-games. Source: `src/features/mini-games/components/BetSlipBooster.tsx`.

Answer club questions to boost individual legs and reveal the slip outcome.

| Action | Proposed cue | Current explicit cue | Timing |
| --- | --- | --- | --- |
| Select an answer | `select` | Not mapped here | On a committed selection; never on hover or every keystroke. |
| Lock in | `lock` | Not mapped here | Once a valid submission is accepted; disable while pending. |
| Correct answer | `correct` | Not mapped here | On the confirmed result, once per question or command ID. |
| Wrong answer | `wrong` | Not mapped here | On confirmed incorrect result. Never also play the timeout cue. |
| Use a lifeline | `power` | Not mapped here | When a lifeline is successfully consumed, not when its dialog opens. |
| Next question | `transition` | Not mapped here | At the visible question transition, not on data prefetch. |
| Win / complete | `win` | Not mapped here | When the final outcome is visible. Wait for the answer sound to finish. |
| Lose / eliminated | `lose` | Not mapped here | On the terminal loss, once. Do not layer on top of the wrong answer. |

Audition flow: select → correct → power → next → win.

## Half-Time Trivia

Group: Mini-games. Source: `src/features/mini-games/components/HalfTimeTrivia.tsx`.

A 60-second quiz: verdicts, final-three-second ticks and completion.

| Action | Proposed cue | Current explicit cue | Timing |
| --- | --- | --- | --- |
| Start round | `ready` | Not mapped here | When the countdown hands over to active play, after audio is unlocked. |
| Select an answer | `select` | Not mapped here | On a committed selection; never on hover or every keystroke. |
| Correct answer | `correct` | Not mapped here | On the confirmed result, once per question or command ID. |
| Wrong answer | `wrong` | Not mapped here | On confirmed incorrect result. Never also play the timeout cue. |
| Last 3 seconds | `tick` | Not mapped here | One tick at each whole second: 3, 2, 1. Stop on answer, pause or end. |
| Time runs out | `timeout` | Not mapped here | Once when the active turn expires. Replaces wrong-answer feedback for no answer. |
| Next question | `transition` | Not mapped here | At the visible question transition, not on data prefetch. |
| Win / complete | `win` | Not mapped here | When the final outcome is visible. Wait for the answer sound to finish. |

Audition flow: ready → select → correct → next → win.

## Odds Board

Group: Mini-games. Source: `src/features/mini-games/components/OddsBoard.tsx`.

Choose a priced answer, commit the stake, resolve and show return.

| Action | Proposed cue | Current explicit cue | Timing |
| --- | --- | --- | --- |
| Select an answer | `select` | Not mapped here | On a committed selection; never on hover or every keystroke. |
| Lock in | `lock` | Not mapped here | Once a valid submission is accepted; disable while pending. |
| Correct answer | `correct` | Not mapped here | On the confirmed result, once per question or command ID. |
| Wrong answer | `wrong` | Not mapped here | On confirmed incorrect result. Never also play the timeout cue. |
| Collect reward | `coins` | Not mapped here | When a reward is confirmed and visibly added; one cue per award. |
| Next question | `transition` | Not mapped here | At the visible question transition, not on data prefetch. |
| Lose / eliminated | `lose` | Not mapped here | On the terminal loss, once. Do not layer on top of the wrong answer. |

Audition flow: select → lock → correct → coins.

## Football Tic Tac Toe · demo

Group: Mini-games. Source: `src/features/mini-games/components/FootballGrid.tsx`.

Local prototype board. Select a square, name a qualifying player, claim a cell and form a line.

| Action | Proposed cue | Current explicit cue | Timing |
| --- | --- | --- | --- |
| Start round | `ready` | Not mapped here | When the countdown hands over to active play, after audio is unlocked. |
| Select an answer | `select` | Not mapped here | On a committed selection; never on hover or every keystroke. |
| Lock in | `lock` | Not mapped here | Once a valid submission is accepted; disable while pending. |
| Correct answer | `correct` | Not mapped here | On the confirmed result, once per question or command ID. |
| Wrong answer | `wrong` | Not mapped here | On confirmed incorrect result. Never also play the timeout cue. |
| Place / reorder | `tap` | Not mapped here | When a tile or card lands in a new valid position, not during drag. |
| Next question | `transition` | Not mapped here | At the visible question transition, not on data prefetch. |
| Win / complete | `win` | Not mapped here | When the final outcome is visible. Wait for the answer sound to finish. |
| Lose / eliminated | `lose` | Not mapped here | On the terminal loss, once. Do not layer on top of the wrong answer. |
| Draw | `draw` | Not mapped here | When the authoritative result is a draw. |

Audition flow: ready → select → lock → correct → place → win.

## Survivor

Group: Mini-games. Source: `src/features/mini-games/components/Survivor.tsx`.

Hidden demo. Increasing question difficulty; first wrong answer ends the run.

| Action | Proposed cue | Current explicit cue | Timing |
| --- | --- | --- | --- |
| Start round | `ready` | Not mapped here | When the countdown hands over to active play, after audio is unlocked. |
| Select an answer | `select` | Not mapped here | On a committed selection; never on hover or every keystroke. |
| Correct answer | `correct` | Not mapped here | On the confirmed result, once per question or command ID. |
| Wrong answer | `wrong` | Not mapped here | On confirmed incorrect result. Never also play the timeout cue. |
| Streak milestone | `streak` | Not mapped here | At a meaningful confirmed milestone; replace or follow the regular correct cue. |
| Next question | `transition` | Not mapped here | At the visible question transition, not on data prefetch. |
| Lose / eliminated | `lose` | Not mapped here | On the terminal loss, once. Do not layer on top of the wrong answer. |
| Win / complete | `win` | Not mapped here | When the final outcome is visible. Wait for the answer sound to finish. |

Audition flow: ready → select → correct → streak → next → win.

## Hi-Lo Ride

Group: Mini-games. Source: `src/features/mini-games/components/HiLoRide.tsx`.

Make a higher/lower stat call, reveal the comparison, bank or continue.

| Action | Proposed cue | Current explicit cue | Timing |
| --- | --- | --- | --- |
| Select an answer | `select` | Not mapped here | On a committed selection; never on hover or every keystroke. |
| Reveal clue | `reveal` | Not mapped here | When a new clue becomes visible; one cue per reveal. |
| Correct answer | `correct` | Not mapped here | On the confirmed result, once per question or command ID. |
| Wrong answer | `wrong` | Not mapped here | On confirmed incorrect result. Never also play the timeout cue. |
| Streak milestone | `streak` | Not mapped here | At a meaningful confirmed milestone; replace or follow the regular correct cue. |
| Cash out | `coins` | Not mapped here | Only after cashout is confirmed, never for a pending or rejected request. |
| Next question | `transition` | Not mapped here | At the visible question transition, not on data prefetch. |
| Lose / eliminated | `lose` | Not mapped here | On the terminal loss, once. Do not layer on top of the wrong answer. |

Audition flow: select → reveal → correct → streak → cash.

## Trivia Mines

Group: Mini-games. Source: `src/features/mini-games/components/TriviaMines.tsx`.

Choose a tile, reveal a defender or safe path; scout with trivia and cash out.

| Action | Proposed cue | Current explicit cue | Timing |
| --- | --- | --- | --- |
| Start round | `ready` | Not mapped here | When the countdown hands over to active play, after audio is unlocked. |
| Select an answer | `select` | Not mapped here | On a committed selection; never on hover or every keystroke. |
| Reveal clue | `reveal` | Not mapped here | When a new clue becomes visible; one cue per reveal. |
| Correct answer | `correct` | Not mapped here | On the confirmed result, once per question or command ID. |
| Wrong answer | `wrong` | Not mapped here | On confirmed incorrect result. Never also play the timeout cue. |
| Use a lifeline | `power` | Not mapped here | When a lifeline is successfully consumed, not when its dialog opens. |
| Pass completed | `pass` | Not mapped here | At the ball transfer or chain link animation; throttle rapid repeats. |
| Cash out | `coins` | Not mapped here | Only after cashout is confirmed, never for a pending or rejected request. |
| Lose / eliminated | `lose` | Not mapped here | On the terminal loss, once. Do not layer on top of the wrong answer. |

Audition flow: ready → select → reveal → pass → cash.

## Quiz Board

Group: Mini-games. Source: `src/features/mini-games/components/QuizBoard.tsx`.

Select category/value tiles, answer, steal opportunities and reveal scores.

| Action | Proposed cue | Current explicit cue | Timing |
| --- | --- | --- | --- |
| Start round | `ready` | Not mapped here | When the countdown hands over to active play, after audio is unlocked. |
| Select an answer | `select` | Not mapped here | On a committed selection; never on hover or every keystroke. |
| Reveal clue | `reveal` | Not mapped here | When a new clue becomes visible; one cue per reveal. |
| Lock in | `lock` | Not mapped here | Once a valid submission is accepted; disable while pending. |
| Correct answer | `correct` | Not mapped here | On the confirmed result, once per question or command ID. |
| Wrong answer | `wrong` | Not mapped here | On confirmed incorrect result. Never also play the timeout cue. |
| Next question | `transition` | Not mapped here | At the visible question transition, not on data prefetch. |
| Win / complete | `win` | Not mapped here | When the final outcome is visible. Wait for the answer sound to finish. |
| Lose / eliminated | `lose` | Not mapped here | On the terminal loss, once. Do not layer on top of the wrong answer. |
| Draw | `draw` | Not mapped here | When the authoritative result is a draw. |

Audition flow: ready → select → reveal → lock → correct → win.

## Last One Standing

Group: Mini-games. Source: `src/features/mini-games/components/LastOneStanding.tsx`.

Demo elimination cuts after each question; use a single local survival/elimination cue.

| Action | Proposed cue | Current explicit cue | Timing |
| --- | --- | --- | --- |
| Start round | `ready` | Not mapped here | When the countdown hands over to active play, after audio is unlocked. |
| Select an answer | `select` | Not mapped here | On a committed selection; never on hover or every keystroke. |
| Correct answer | `correct` | Not mapped here | On the confirmed result, once per question or command ID. |
| Wrong answer | `wrong` | Not mapped here | On confirmed incorrect result. Never also play the timeout cue. |
| Last 3 seconds | `tick` | Not mapped here | One tick at each whole second: 3, 2, 1. Stop on answer, pause or end. |
| Time runs out | `timeout` | Not mapped here | Once when the active turn expires. Replaces wrong-answer feedback for no answer. |
| Next question | `transition` | Not mapped here | At the visible question transition, not on data prefetch. |
| Streak milestone | `streak` | Not mapped here | At a meaningful confirmed milestone; replace or follow the regular correct cue. |
| Lose / eliminated | `lose` | Not mapped here | On the terminal loss, once. Do not layer on top of the wrong answer. |
| Win / complete | `win` | Not mapped here | When the final outcome is visible. Wait for the answer sound to finish. |

Audition flow: ready → select → correct → next → streak → win.

## Golden Goal

Group: Mini-games. Source: `src/features/mini-games/components/GoldenGoal.tsx`.

Hidden demo. Speed and accuracy move the ball; the first goal ends the duel.

| Action | Proposed cue | Current explicit cue | Timing |
| --- | --- | --- | --- |
| Start round | `ready` | Not mapped here | When the countdown hands over to active play, after audio is unlocked. |
| Select an answer | `select` | Not mapped here | On a committed selection; never on hover or every keystroke. |
| Correct answer | `correct` | Not mapped here | On the confirmed result, once per question or command ID. |
| Wrong answer | `wrong` | Not mapped here | On confirmed incorrect result. Never also play the timeout cue. |
| Pass completed | `pass` | Not mapped here | At the ball transfer or chain link animation; throttle rapid repeats. |
| Goal scored | `goal` | Not mapped here | At goal impact / score reveal, after the kick. |
| Lose / eliminated | `lose` | Not mapped here | On the terminal loss, once. Do not layer on top of the wrong answer. |

Audition flow: ready → select → correct → pass → goal.

## Career Race

Group: Mini-games. Source: `src/features/mini-games/components/CareerRace.tsx`.

Club-by-club trail, buzz in before the rival and submit a guess.

| Action | Proposed cue | Current explicit cue | Timing |
| --- | --- | --- | --- |
| Start round | `ready` | Not mapped here | When the countdown hands over to active play, after audio is unlocked. |
| Reveal clue | `reveal` | Not mapped here | When a new clue becomes visible; one cue per reveal. |
| Buzz in | `lock` | Not mapped here | When the player wins the buzzer / turn, not on rejected input. |
| Lock in | `lock` | Not mapped here | Once a valid submission is accepted; disable while pending. |
| Correct answer | `correct` | Not mapped here | On the confirmed result, once per question or command ID. |
| Wrong answer | `wrong` | Not mapped here | On confirmed incorrect result. Never also play the timeout cue. |
| Next question | `transition` | Not mapped here | At the visible question transition, not on data prefetch. |
| Win / complete | `win` | Not mapped here | When the final outcome is visible. Wait for the answer sound to finish. |
| Lose / eliminated | `lose` | Not mapped here | On the terminal loss, once. Do not layer on top of the wrong answer. |

Audition flow: ready → reveal → buzz → lock → correct → win.

## Stat Sniper

Group: Mini-games. Source: `src/features/mini-games/components/StatSniper.tsx`.

Slider commits a numeric estimate. Use accuracy tiers, not an incorrect cue for every near miss.

| Action | Proposed cue | Current explicit cue | Timing |
| --- | --- | --- | --- |
| Place / reorder | `tap` | Not mapped here | When a tile or card lands in a new valid position, not during drag. |
| Lock in | `lock` | Not mapped here | Once a valid submission is accepted; disable while pending. |
| Reveal clue | `reveal` | Not mapped here | When a new clue becomes visible; one cue per reveal. |
| Correct answer | `correct` | Not mapped here | On the confirmed result, once per question or command ID. |
| Wrong answer | `wrong` | Not mapped here | On confirmed incorrect result. Never also play the timeout cue. |
| Next question | `transition` | Not mapped here | At the visible question transition, not on data prefetch. |
| Win / complete | `win` | Not mapped here | When the final outcome is visible. Wait for the answer sound to finish. |

Audition flow: place → lock → reveal → correct → win.

## Top 10 Knockout

Group: Concept lab. Source: `src/features/game-mode-lab/modes/Top10KnockoutGame.tsx`.

Naming a hidden list entry reveals it; wrong or repeated names cost a life. Client-only prototype; no explicit SFX calls found.

| Action | Proposed cue | Current explicit cue | Timing |
| --- | --- | --- | --- |
| Start round | `ready` | Not mapped here | When the countdown hands over to active play, after audio is unlocked. |
| Lock in | `lock` | Not mapped here | Once a valid submission is accepted; disable while pending. |
| Correct answer | `correct` | Not mapped here | On the confirmed result, once per question or command ID. |
| Wrong answer | `wrong` | Not mapped here | On confirmed incorrect result. Never also play the timeout cue. |
| Reveal clue | `reveal` | Not mapped here | When a new clue becomes visible; one cue per reveal. |
| Next question | `transition` | Not mapped here | At the visible question transition, not on data prefetch. |
| Lose / eliminated | `lose` | Not mapped here | On the terminal loss, once. Do not layer on top of the wrong answer. |
| Win / complete | `win` | Not mapped here | When the final outcome is visible. Wait for the answer sound to finish. |

Audition flow: ready → lock → correct → reveal → win.

## Missing XI

Group: Concept lab. Source: `src/features/game-mode-lab/modes/MissingXIGame.tsx`.

Pick an empty shirt, name the starter and claim that position. Client-only prototype; no explicit SFX calls found.

| Action | Proposed cue | Current explicit cue | Timing |
| --- | --- | --- | --- |
| Start round | `ready` | Not mapped here | When the countdown hands over to active play, after audio is unlocked. |
| Select an answer | `select` | Not mapped here | On a committed selection; never on hover or every keystroke. |
| Lock in | `lock` | Not mapped here | Once a valid submission is accepted; disable while pending. |
| Correct answer | `correct` | Not mapped here | On the confirmed result, once per question or command ID. |
| Wrong answer | `wrong` | Not mapped here | On confirmed incorrect result. Never also play the timeout cue. |
| Place / reorder | `tap` | Not mapped here | When a tile or card lands in a new valid position, not during drag. |
| Next question | `transition` | Not mapped here | At the visible question transition, not on data prefetch. |
| Win / complete | `win` | Not mapped here | When the final outcome is visible. Wait for the answer sound to finish. |
| Lose / eliminated | `lose` | Not mapped here | On the terminal loss, once. Do not layer on top of the wrong answer. |
| Draw | `draw` | Not mapped here | When the authoritative result is a draw. |

Audition flow: ready → select → lock → correct → place → win.

## Ball Knowledge

Group: Concept lab. Source: `src/features/game-mode-lab/modes/BallKnowledgeGame.tsx`.

Submit valid players and reveal rarity points. Reserve the flourish for rare-answer milestones. Client-only prototype; no explicit SFX calls found.

| Action | Proposed cue | Current explicit cue | Timing |
| --- | --- | --- | --- |
| Start round | `ready` | Not mapped here | When the countdown hands over to active play, after audio is unlocked. |
| Lock in | `lock` | Not mapped here | Once a valid submission is accepted; disable while pending. |
| Correct answer | `correct` | Not mapped here | On the confirmed result, once per question or command ID. |
| Wrong answer | `wrong` | Not mapped here | On confirmed incorrect result. Never also play the timeout cue. |
| Reveal clue | `reveal` | Not mapped here | When a new clue becomes visible; one cue per reveal. |
| Streak milestone | `streak` | Not mapped here | At a meaningful confirmed milestone; replace or follow the regular correct cue. |
| Next question | `transition` | Not mapped here | At the visible question transition, not on data prefetch. |
| Win / complete | `win` | Not mapped here | When the final outcome is visible. Wait for the answer sound to finish. |
| Lose / eliminated | `lose` | Not mapped here | On the terminal loss, once. Do not layer on top of the wrong answer. |
| Draw | `draw` | Not mapped here | When the authoritative result is a draw. |

Audition flow: ready → lock → correct → reveal → streak → win.

## Bingo Battle

Group: Concept lab. Source: `src/features/game-mode-lab/modes/BingoBattleGame.tsx`.

Place a matching player on a category square or skip; the first line wins. Client-only prototype; no explicit SFX calls found.

| Action | Proposed cue | Current explicit cue | Timing |
| --- | --- | --- | --- |
| Start round | `ready` | Not mapped here | When the countdown hands over to active play, after audio is unlocked. |
| Reveal clue | `reveal` | Not mapped here | When a new clue becomes visible; one cue per reveal. |
| Select an answer | `select` | Not mapped here | On a committed selection; never on hover or every keystroke. |
| Place / reorder | `tap` | Not mapped here | When a tile or card lands in a new valid position, not during drag. |
| Correct answer | `correct` | Not mapped here | On the confirmed result, once per question or command ID. |
| Wrong answer | `wrong` | Not mapped here | On confirmed incorrect result. Never also play the timeout cue. |
| Fold / pass turn | `back` | Not mapped here | When your fold is accepted; no sound for repeated clicks. |
| Win / complete | `win` | Not mapped here | When the final outcome is visible. Wait for the answer sound to finish. |
| Lose / eliminated | `lose` | Not mapped here | On the terminal loss, once. Do not layer on top of the wrong answer. |

Audition flow: ready → reveal → select → place → correct → win.

## Draft Battle

Group: Concept lab. Source: `src/features/game-mode-lab/modes/DraftBattleGame.tsx`.

Spin a legendary squad, draft positions, answer form trivia, choose a manager and simulate cup rounds. Client-only prototype; no explicit SFX calls found.

| Action | Proposed cue | Current explicit cue | Timing |
| --- | --- | --- | --- |
| Spin starts | `transition` | Not mapped here | One short start sweep; no continuous wheel-tick loop. |
| Wheel stops | `reveal` | Not mapped here | When the result settles, before any reward chime. |
| Select an answer | `select` | Not mapped here | On a committed selection; never on hover or every keystroke. |
| Place / reorder | `tap` | Not mapped here | When a tile or card lands in a new valid position, not during drag. |
| Correct answer | `correct` | Not mapped here | On the confirmed result, once per question or command ID. |
| Wrong answer | `wrong` | Not mapped here | On confirmed incorrect result. Never also play the timeout cue. |
| Use a lifeline | `power` | Not mapped here | When a lifeline is successfully consumed, not when its dialog opens. |
| Next question | `transition` | Not mapped here | At the visible question transition, not on data prefetch. |
| Take the shot | `kick` | Not mapped here | At visible ball contact, not immediately on the shoot button. |
| Goal scored | `goal` | Not mapped here | At goal impact / score reveal, after the kick. |
| Keeper saves | `save` | Not mapped here | At glove contact or confirmed miss; no victory sting. |
| Win / complete | `win` | Not mapped here | When the final outcome is visible. Wait for the answer sound to finish. |
| Lose / eliminated | `lose` | Not mapped here | On the terminal loss, once. Do not layer on top of the wrong answer. |

Audition flow: spin → spinStop → select → place → correct → goal → win.

## Connections Race

Group: Concept lab. Source: `src/features/game-mode-lab/modes/ConnectionsRaceGame.tsx`.

Select four names; a correct group locks into place, a failed group stays editable. Client-only prototype; no explicit SFX calls found.

| Action | Proposed cue | Current explicit cue | Timing |
| --- | --- | --- | --- |
| Start round | `ready` | Not mapped here | When the countdown hands over to active play, after audio is unlocked. |
| Select an answer | `select` | Not mapped here | On a committed selection; never on hover or every keystroke. |
| Lock in | `lock` | Not mapped here | Once a valid submission is accepted; disable while pending. |
| Correct answer | `correct` | Not mapped here | On the confirmed result, once per question or command ID. |
| Wrong answer | `wrong` | Not mapped here | On confirmed incorrect result. Never also play the timeout cue. |
| Place / reorder | `tap` | Not mapped here | When a tile or card lands in a new valid position, not during drag. |
| Next question | `transition` | Not mapped here | At the visible question transition, not on data prefetch. |
| Win / complete | `win` | Not mapped here | When the final outcome is visible. Wait for the answer sound to finish. |
| Lose / eliminated | `lose` | Not mapped here | On the terminal loss, once. Do not layer on top of the wrong answer. |
| Draw | `draw` | Not mapped here | When the authoritative result is a draw. |

Audition flow: ready → select → lock → correct → place → win.

## Stat 501

Group: Concept lab. Source: `src/features/game-mode-lab/modes/Stat501Game.tsx`.

Submit a player to subtract stats. Bust restores the prior total; a legal finish wins. Client-only prototype; no explicit SFX calls found.

| Action | Proposed cue | Current explicit cue | Timing |
| --- | --- | --- | --- |
| Start round | `ready` | Not mapped here | When the countdown hands over to active play, after audio is unlocked. |
| Lock in | `lock` | Not mapped here | Once a valid submission is accepted; disable while pending. |
| Reveal clue | `reveal` | Not mapped here | When a new clue becomes visible; one cue per reveal. |
| Correct answer | `correct` | Not mapped here | On the confirmed result, once per question or command ID. |
| Wrong answer | `wrong` | Not mapped here | On confirmed incorrect result. Never also play the timeout cue. |
| Next question | `transition` | Not mapped here | At the visible question transition, not on data prefetch. |
| Win / complete | `win` | Not mapped here | When the final outcome is visible. Wait for the answer sound to finish. |
| Lose / eliminated | `lose` | Not mapped here | On the terminal loss, once. Do not layer on top of the wrong answer. |

Audition flow: ready → lock → reveal → correct → win.

## Own Goal

Group: Concept lab. Source: `src/features/game-mode-lab/modes/OwnGoalGame.tsx`.

Scout reveals a clue, teammates flip cards. Rival/neutral cards end the turn; Own Goal ends the match. Client-only prototype; no explicit SFX calls found.

| Action | Proposed cue | Current explicit cue | Timing |
| --- | --- | --- | --- |
| Start round | `ready` | Not mapped here | When the countdown hands over to active play, after audio is unlocked. |
| Reveal clue | `reveal` | Not mapped here | When a new clue becomes visible; one cue per reveal. |
| Select an answer | `select` | Not mapped here | On a committed selection; never on hover or every keystroke. |
| Correct answer | `correct` | Not mapped here | On the confirmed result, once per question or command ID. |
| Wrong answer | `wrong` | Not mapped here | On confirmed incorrect result. Never also play the timeout cue. |
| Imposter exposed | `imposter` | Not mapped here | On the identity reveal. Avoid stacking the wrong-answer buzzer. |
| Fold / pass turn | `back` | Not mapped here | When your fold is accepted; no sound for repeated clicks. |
| Next question | `transition` | Not mapped here | At the visible question transition, not on data prefetch. |
| Win / complete | `win` | Not mapped here | When the final outcome is visible. Wait for the answer sound to finish. |
| Lose / eliminated | `lose` | Not mapped here | On the terminal loss, once. Do not layer on top of the wrong answer. |

Audition flow: ready → reveal → select → correct → next → win.

## Say It With Memes

Group: Concept lab. Source: `src/features/game-mode-lab/modes/SayItWithMemesGame.tsx`.

Pick signal cards, request extra cards, guess a player and swap roles. Client-only prototype; no explicit SFX calls found.

| Action | Proposed cue | Current explicit cue | Timing |
| --- | --- | --- | --- |
| Start round | `ready` | Not mapped here | When the countdown hands over to active play, after audio is unlocked. |
| Select an answer | `select` | Not mapped here | On a committed selection; never on hover or every keystroke. |
| Place / reorder | `tap` | Not mapped here | When a tile or card lands in a new valid position, not during drag. |
| Reveal clue | `reveal` | Not mapped here | When a new clue becomes visible; one cue per reveal. |
| Lock in | `lock` | Not mapped here | Once a valid submission is accepted; disable while pending. |
| Correct answer | `correct` | Not mapped here | On the confirmed result, once per question or command ID. |
| Wrong answer | `wrong` | Not mapped here | On confirmed incorrect result. Never also play the timeout cue. |
| Next question | `transition` | Not mapped here | At the visible question transition, not on data prefetch. |
| Win / complete | `win` | Not mapped here | When the final outcome is visible. Wait for the answer sound to finish. |
| Lose / eliminated | `lose` | Not mapped here | On the terminal loss, once. Do not layer on top of the wrong answer. |
| Draw | `draw` | Not mapped here | When the authoritative result is a draw. |

Audition flow: ready → select → place → reveal → lock → correct → win.
