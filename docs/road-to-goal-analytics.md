# Road to Goal analytics

Road to Goal analytics are production-only. Browser capture requires the
dedicated `NEXT_PUBLIC_ROAD_TO_GOAL_ANALYTICS_ENABLED=true` opt-in; it remains
false or unset on staging even if a shared PostHog key is present. The backend
additionally requires `NODE_ENV=prod` before emitting any Road to Goal event.
The gameplay feature flags remain independent of analytics.

## Event contract

| Event | Source | Purpose |
| --- | --- | --- |
| `road_to_goal_card_viewed` | Browser | Unique people shown the game card on the mini-games hub. |
| `road_to_goal_card_clicked` | Browser | Hub click-through and live-versus-demo destination. |
| `road_to_goal_viewed` | Browser | Unique game-page viewers, locale, mode, and launch availability. |
| `road_to_goal_resume_checked` | Browser | Active/terminal recovery success and resume errors. |
| `road_to_goal_start_requested` | Browser | Start intent by stake and auto-cashout choice. |
| `road_to_goal_run_started` | Backend for live; browser for demo | Authoritative live players and completed stake debit. |
| `road_to_goal_question_resolved` | Backend for live; browser for demo | Zone, difficulty, correctness, timeout, survival, response time, and committed odds. |
| `road_to_goal_run_settled` | Backend for live; browser for demo | Result, payout, net coins, cleared zones, settlement reason, and total run duration. |
| `road_to_goal_proof_verified` | Browser | Whether the client independently verified the terminal fairness proof. |
| `road_to_goal_error` | Browser | Failed action and HTTP/error class without message text or payloads. |
| `road_to_goal_engagement_ended` | Browser | Wall-clock and foreground-active page duration, furthest zone, and exit phase. |

Live economy and RTP reporting must use the backend events. Browser events are
for discovery, UI reliability, and engagement; ad blockers and page termination
mean they are not an accounting source. Deterministic `$insert_id` values make
run, question, settlement, and proof events safe against request retries.

No prompt text, answer text, selected option, seed, commitment salt, email, or
nickname is sent. Opaque round and question IDs are retained for debugging and
question-quality breakdowns.

## Recommended production dashboard

1. Reach: unique users of `road_to_goal_card_viewed` and
   `road_to_goal_viewed`.
2. Funnel: card viewed → card clicked → game viewed → start requested → run
   started → run settled.
3. Start reliability: `run_started / start_requested`, broken down by stake and
   `road_to_goal_error.action`.
4. Play depth: median and p90 `cleared_zones`, plus survival rate by `zone`,
   `difficulty`, and `answered_correctly`.
5. Question quality: answer accuracy and median `answer_duration_ms` by
   `question_id`; flag high-time, low-accuracy outliers for editorial review.
6. Engagement: median/p90 `active_duration_ms` and `run_duration_ms`, separated
   into viewers, starters, cash-outs, losses, and completions.
7. Economy: sum of `stake_coins`, `payout_coins`, and `net_coins`; realized RTP
   is `sum(payout_coins) / sum(stake_coins)` over a sufficiently large window.
8. Strategy: result and realized RTP by stake, auto-cashout choice, cleared
   zones, and answer correctness. This monitors the population model; it is not
   a promise of 98% RTP for every player or strategy.
9. Fairness health: count and rate of `verified=false`, plus proof-load errors.

Create the dashboard only after production has ingested the first events so the
event/property schema can be verified against real data.
