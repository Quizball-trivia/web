# Weekend League

A weekly, synchronized tournament mode. Players claim a free entry Friday night,
everyone plays the **same qualifier at the same time on Saturday**, and the
**top 24 return for a live knockout on Sunday**. The champion takes the headline
prize.

> **Status: frontend-only prototype.** Everything here runs on **mock data** so
> the whole idea can be seen and tested before the backend exists. No API calls,
> no persistence. See [Backend integration](#backend-integration) for the seam.

---

## The format

| Stage | When (Georgian time, UTC+4) | What happens |
|---|---|---|
| **Entry** | Friday **21:00** → Saturday 14:00 | Claim one free entry. One per player, per week. |
| **Qualifier** | Saturday **14:00** | Everyone plays the same questions at once. Ranked on a leaderboard by score. |
| **Playoffs** | Sunday **14:00** | The **top 24** return for a single-elimination knockout. Win it to be champion. |

The cutoff is `PLAYOFF_CUTOFF = 24` (`constants.ts`). Schedule times are computed
as the next real occurrence of each weekday/hour in Georgian time via
`nextGeorgianOccurrence()`, so the countdowns are live.

---

## Phases

The screen is a state machine over `LeaguePhase` (`types.ts`), driven by the
`useWeekendLeague` hook. Six phases:

| Phase | Player sees |
|---|---|
| `upcoming` | Entry not open yet. Countdown to Friday, how-it-works, prize ladder. |
| `entry_open` | "Claim your free entry" (or "You're in!" once claimed) + countdown to Saturday. |
| `qualifier_live` | "Qualifier is LIVE / Play now" + the live standings. (Or a spectator note if you didn't enter.) |
| `qualifier_done` | Your result (qualified / missed the cut), the full leaderboard with the top-24 line, and a countdown to Sunday. |
| `playoffs_live` | The knockout bracket, your match highlighted, live ties badged. |
| `completed` | Champion banner + final standings. |

Two independent flags refine the scenario: `hasEntered` and `qualified` (made the
top 24). The demo `PhaseSwitcher` exposes both as toggles.

---

## Prize ladder

Defined in `mock-data.ts` (`PRIZES`). Football-themed digital prizes:

| Rank | Reward |
|---|---|
| 1st — Champion | 6 months Setanta Sports + EA FC 26 |
| 2nd — Runner-up | 3 months Setanta + FC Points |
| 3rd | 1 month Setanta + FC Points |
| 4th–8th — Semi-finalists | FotMob Premium + 5,000 coins |
| 9th–24th — Playoff qualifiers | Finalist badge + 2,000 coins |

`prizeForRank(rank)` maps a rank to its band; the leaderboard shows the icon on
paying ranks and `PrizesPanel` highlights the viewer's band.

---

## How to see & test it

Two routes render the same `WeekendLeagueScreen`:

- **`/dev/weekend-league`** — dev preview, **viewable logged-out** (the `/dev/*`
  path bypasses the app auth gate in development). Use this to demo.
- **`/weekend-league`** — the in-app placement, behind the normal auth gate.

On the dev route, the **purple "Preview control"** bar walks the whole week:

1. Tap the phase buttons (Upcoming → … → Completed) to jump to any moment.
2. Toggle **Entered** / **Qualified (top 24)** to see the different situations
   (e.g. Qualified-off + Qualifier-done = the "finished #41, missed the cut" view).
3. Some actions are interactive: **Claim free entry** flips you to entered,
   **Play now** advances to results, and the bracket scrolls sideways → to the Final.

Designed mobile-first (built at 430px). On desktop, use DevTools device mode
(`Cmd+Shift+M`, width ~430) to see the real phone layout.

---

## Gameplay (mock quiz)

Both the Saturday qualifier and the Sunday playoff matches are playable end to
end with mock MC questions:

1. **Kickoff** — a 10-second "everyone starts together" countdown (`KickoffCountdown`),
   standing in for the synchronized 14:00 start.
2. **Quiz** — 6 multiple-choice questions (`QuizPlay`), each on a 12-second timer.
   Scoring: `POINTS_PER_CORRECT` (100) per correct answer + the seconds remaining
   as a speed bonus.
3. **Results**:
   - **Qualifier** (`QualifierResult`) — your points, your final rank (mapped from
     correct count via `rankForQuiz`, ~4/6 is the top-24 cut-off), and a qualify /
     miss verdict, over the standings where you landed.
   - **Playoff** (`PlayoffResult`) — head-to-head vs the seeded opponent; win to
     advance, lose and you're out. The playoff **loops** Quarter-final → Semi-final
     → Final until you're champion or knocked out. Opponent target scores rise each
     round (`PLAYOFF_ROUNDS`).

Orchestrated by `WeekendLeagueGame` (kickoff → quiz → result state machine). It's
launched from the screen's **Play now** (qualifier) / **Play your match** (playoff)
buttons, takes over full-screen while `session` is set, and reports back through
`finishQualifier` / `finishPlayoff` on the hook. A real qualifier result overrides
the demo leaderboard (`playedRank`); winning the Final flips the phase to
`completed`; losing shows the knocked-out state.

## Architecture

Self-contained under `src/features/weekend-league/`:

```
types.ts               Domain types (phases, players, prizes, bracket)
constants.ts           poppins style, PLAYOFF_CUTOFF, accent maps, nextGeorgianOccurrence()
mock-data.ts           Players, prizes, schedule, curated bracket — ALL FAKE
use-weekend-league.ts  useWeekendLeague() — the state + derivation hook
WeekendLeagueScreen.tsx Main screen + PhaseContent router
components/
  LeagueHeader.tsx        Wordmark + tagline + prize hook
  ScheduleTimeline.tsx    Fri → Sat → Sun stage rail
  YourStatusCard.tsx      Phase-aware "where do I stand" line
  EntryPanel.tsx          Claim-entry card (locked / open / entered)
  HowItWorks.tsx          3-step explainer
  PrizesPanel.tsx         Prize ladder (optional rank highlight)
  QualifierLeaderboard.tsx Podium + rows + top-24 cutoff + pinned "you" row
  PlayoffBracket.tsx      Horizontally-scrollable knockout rounds
  LeagueCountdown.tsx     Segmented D:H:M:S countdown to a target
  LiveBadge.tsx           Pulsing LIVE pill
  PhaseSwitcher.tsx       DEMO-ONLY preview control
  game/
    WeekendLeagueGame.tsx Kickoff → quiz → result orchestrator (+ playoff loop)
    KickoffCountdown.tsx  10s "everyone starts together" countdown
    QuizPlay.tsx          MC quiz: timer, tap-to-answer, reveal, scoring
    QualifierResult.tsx   Score + rank + qualify/miss + standings
    PlayoffResult.tsx     Head-to-head + advance/eliminated/champion
```

Routes: `src/app/(fullscreen)/dev/weekend-league/page.tsx` and
`src/app/(app)/weekend-league/page.tsx`.

Reuses app primitives: `TierFrameAvatar` / `AvatarDisplay`, brand color tokens,
`motion/react`, the Poppins/`font-fun` type system.

---

## Data model (key types)

- **`LeaguePlayer`** — `{ id, username, avatar, tier, country, score, isYou? }`.
  Leaderboard rank is the array index + 1.
- **`PrizeTier`** — a rank band (`rankFrom`/`rankTo`) → reward + icon + accent.
- **`Milestone`** — a scheduled stage with an absolute `targetMs` for countdowns.
- **`Bracket`** — `{ rounds, championId, championName }`; each `BracketRound` has
  `BracketMatch`es (`a`/`b` players, scores, `winnerId`, `live`, `isYours`, `isBye`).
- **`WeekendLeagueState`** — `{ phase, hasEntered, qualified }`, the whole scenario.

---

## State & the hook

`useWeekendLeague(initial?)` owns the scenario and derives everything the screen
needs:

- **state**: `phase`, `hasEntered`, `qualified` (+ setters: `setPhase`,
  `setEntered`, `setQualified`, `enterLeague`).
- **derived**: `milestones` (the three schedule targets), `activeMilestone` (what
  this phase counts toward), `leaderboard` (48 players with "You" inserted at rank
  7 if qualified, else 41), `yourRank`, `bracket` (built for live/completed
  phases), `registered`.

This hook is the **single seam** between UI and data — components take plain
props, so swapping mock data for real API responses happens here and nowhere else.

---

## What's mock (and how it's kept honest)

- 48 fake players (`HANDLES` in `mock-data.ts`), deterministic scores/tiers — no
  `Math.random`, no module-load `Date.now`, so SSR and client render identically.
- The **bracket is curated** (`buildBracket`): fixed pairings and winners.
  Seed 7 = "You", who wins it all when `qualified` (a satisfying demo run); when
  not qualified, seed 7 is a stand-in and you're a spectator.
- Copy is **hardcoded English** — intentionally not wired through i18n (`t()`)
  yet, since this is a prototype.

---

## Backend integration

When the real backend lands, the tournament entity + weekly leaderboard + prize
slots (see the Weekend Cup / Betsson "Collect Points" plans) drive it:

1. Replace the mock derivations inside **`use-weekend-league.ts`** with real
   queries — the `phase` should come from the server (schedule-driven), and
   `leaderboard` / `bracket` / `registered` from the tournament API.
2. Wire real actions: `enterLeague` → claim-entry endpoint (enforce one-per-week
   server-side); "Play now" → launch the actual qualifier match.
3. Render **`<WeekendLeagueScreen showControls={false} />`** to hide the demo
   phase switcher.

The components need no changes — they already take data via props.

---

## Design notes

- Palette leans gold + blue for a "premium weekend event" feel, distinct from
  ranked green. Uses brand tokens (`brand-gold`, `brand-cyan`, `brand-green`,
  `surface-card-deep`, …), not inline hex.
- Countdowns render a stable placeholder until mount, so there's no SSR/client
  hydration mismatch on the ticking numbers.
- Fully responsive; the bracket scrolls horizontally by round on narrow screens.
