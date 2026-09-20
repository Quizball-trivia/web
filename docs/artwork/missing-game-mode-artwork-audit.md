# Game artwork audit — 5 September 2026

Branch: `codex/missing-game-mode-artwork`. Base: `origin/staging` at `3eddd07a`.

Audited all 46 entries in the demo catalogue, including hidden daily challenges and minigames. Added 12 illustrations covering 13 missing entries; daily and minigame FIFA Cards share one file. All 32 existing illustrations remain unchanged. Ranked / 1v1 Match, Auction, and Football Tic Tac Toe remain untouched. The hidden-mode lists, release visibility, routes, and gameplay are unchanged.

New assets live in `public/assets/demos/game-modes/` and are served locally even when remote storage is configured. The shared `DemoModeArt` component supplies the demos hub, Play cards, and daily lobby.

All new images are 1600 × 900 WebP, quality 86, 1551 KB combined. Generated with the built-in image generation tool using existing Quizball illustrations as style references. The complete prompt set is in [missing-game-mode-artwork-prompts.json](missing-game-mode-artwork-prompts.json); final original PNG locations are in [generated-sources.json](generated-sources.json).

## Verification

- TypeScript check and targeted ESLint: passed.
- With and without remote storage configured: all 32 original image URLs are identical to the base; all 13 additions resolve to local images; FIFA Cards aliases resolve to the same file.
- Every new asset decoded as 1600 × 900 WebP.
- Desktop demo hub (1440 px): all 38 visible game-card images decoded successfully; no runtime error overlay or page overflow.
- Mobile demo hub (390 px): zero broken images, no runtime error overlay or page overflow; artwork visually inspected.
- Mobile Play page: Who Am I?, FIFA Cards, and Missing XI decoded from the new local assets; visually inspected.
- Preview ran locally with public staging auth configuration and analytics disabled. Local backend-dependent content was not part of this artwork check.
- No commit, push, merge, storage upload, or deployment performed.

## Catalogue

| Mode | Slug | Demo hub | Artwork |
| --- | --- | --- | --- |
| Weekend League | `weekend-league` | Shown | Existing image unchanged |
| Auction | `auction` | Shown | Protected — existing image unchanged |
| Free Kicks | `mini-final-third` | Shown | Existing image unchanged |
| Road to Goal | `mini-road-to-goal` | Shown | Existing image unchanged |
| Squad Spin | `mini-squad-spin` | Shown | Existing image unchanged |
| Pass Chain | `mini-pass-chain` | Shown | Existing image unchanged |
| Accumulator | `mini-accumulator` | Shown | Existing image unchanged |
| Squad Collection | `mini-squad-collection` | Shown | Existing image unchanged |
| Cash Out Ladder | `mini-cash-out-ladder` | Shown | Existing image unchanged |
| Bet Slip Booster | `mini-bet-slip-booster` | Shown | Existing image unchanged |
| Half-Time Trivia | `mini-half-time-trivia` | Shown | Existing image unchanged |
| Odds Board | `mini-odds-board` | Shown | Existing image unchanged |
| Football Tic Tac Toe | `mini-football-grid` | Shown | Protected — existing image unchanged |
| Hi-Lo Ride | `mini-hi-lo-ride` | Shown | Existing image unchanged |
| Trivia Mines | `mini-trivia-mines` | Shown | Existing image unchanged |
| Quiz Board | `mini-quiz-board` | Shown | Existing image unchanged |
| Last One Standing | `mini-last-one-standing` | Shown | Existing image unchanged |
| Career Race | `mini-career-race` | Shown | Existing image unchanged |
| Guess the Goal | `mini-guess-the-goal` | Shown | Existing image unchanged |
| FIFA Cards | `mini-guess-fifa-card` | Shown | New — shares daily-fifaCards.webp |
| Stat Sniper | `mini-stat-sniper` | Shown | Existing image unchanged |
| Own Goal | `lab-own-goal` | Shown | New — lab-own-goal.webp |
| Say It With Memes | `lab-say-it-with-memes` | Shown | New — lab-say-it-with-memes.webp |
| Draft Battle | `lab-draft-battle` | Shown | New — lab-draft-battle.webp |
| Top 10 Knockout | `lab-top-10-knockout` | Shown | New — lab-top-10-knockout.webp |
| Missing XI | `lab-missing-xi` | Shown | New — lab-missing-xi.webp |
| Ball Knowledge | `lab-ball-knowledge` | Shown | New — lab-ball-knowledge.webp |
| Bingo Battle | `lab-bingo-battle` | Shown | New — lab-bingo-battle.webp |
| Connections Race | `lab-connections-race` | Shown | New — lab-connections-race.webp |
| Stat 501 | `lab-stat-501` | Shown | New — lab-stat-501.webp |
| Money Drop | `daily-moneyDrop` | Shown | Existing image unchanged |
| True or False | `daily-trueFalse` | Shown | Existing image unchanged |
| Countdown | `daily-countdown` | Shown | Existing image unchanged |
| Imposter | `daily-imposter` | Shown | Existing image unchanged |
| Career Path | `daily-careerPath` | Shown | Existing image unchanged |
| Higher or Lower | `daily-highLow` | Shown | Existing image unchanged |
| Football Logic | `daily-footballLogic` | Shown | Existing image unchanged |
| FIFA Cards | `daily-fifaCards` | Shown | New — daily-fifaCards.webp |
| 1v1 Match | `match` | Hidden (unchanged) | Protected — existing glyph unchanged |
| Trivia Spin | `mini-trivia-spin` | Hidden (unchanged) | Existing image unchanged |
| Penalty Shootout | `mini-penalty-shootout` | Hidden (unchanged) | Existing image unchanged |
| Daily Jackpot | `mini-daily-jackpot` | Hidden (unchanged) | Existing image unchanged |
| Survivor | `mini-survivor` | Hidden (unchanged) | Existing image unchanged |
| Golden Goal | `mini-golden-goal` | Hidden (unchanged) | Existing image unchanged |
| Who Am I? | `daily-clues` | Hidden (unchanged) | New — daily-clues.webp |
| Put In Order | `daily-putInOrder` | Hidden (unchanged) | New — daily-putInOrder.webp |
