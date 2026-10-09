# QuizBall word game mobile performance

The main loading defects have been corrected locally for Played for Both and Football Name Chain. Matched directly throttled mobile tests improved to a median performance score of 96 on two representative pages. The default simulated Lighthouse test still falls below 90, so this is a verified improvement, not a complete PageSpeed or production Core Web Vitals pass. Nothing has been deployed.

## Causes and implemented fixes

| Cause | Fix |
| --- | --- |
| The main illustration used lazy loading and a generic image size hint. | Load the hero eagerly with high fetch priority and a size hint matching its actual column. Keep related illustrations lazy. |
| The word game leaderboards imported their game engines and downloaded large avatar artwork before the visitor needed them. | Load the existing leaderboard and its scripts when its container enters view. Keep its existing data, language, account handling and daily calendar. |
| Launcher controls imported the full SEO catalogue. A server dynamic reference also brought unrelated FIFA artwork data into the loading path. | Extract the small launcher constants and defer the decorative FIFA artwork module until a FIFA tile mounts. |
| Related tiles requested images sized for a full mobile screen, despite their two or three column layout. | Supply image sizes matching the tile grid. |
| Links automatically fetched other game and sign in routes. | Disable prefetching on public game cards and account links; preserve destinations, click tracking and return paths. Navigating still fetches the destination normally. |
| The theme initialization script was blocked by the existing Content Security Policy. | Pass the request nonce to the theme provider. Do not weaken the policy. |
| White text on the green launch button and translucent text on blue cards failed contrast checks. | Use black launch text and solid white card descriptions. |

These image changes follow [Google's LCP guidance](https://web.dev/articles/optimize-lcp): the largest visible image should not be lazy loaded and should receive appropriate loading priority.

## Matched mobile measurements

Both versions were built from production commit `70a567a9`, served sequentially on the same `localhost:3000` origin and tested against the same production public API. The after version adds only this branch's changes. Public authentication configuration was supplied for both builds; local analytics had no production PostHog key. Tests used Chrome 154 and the same Lighthouse configuration for each before and after pair.

The following are medians of three runs per version using Lighthouse 13.0.1 with direct DevTools network and CPU throttling. MB means decimal megabytes. Downloads cover the audit navigation, not an entire gameplay session.

| Page | Performance before and after | LCP before and after | Blocking time before and after | Download before and after |
| --- | --- | --- | --- | --- |
| `/tr/futbol-oyunlari/ortak-futbolcu-oyunu` | 82 → 96 | 4.38 s → 2.25 s | 144 ms → 107 ms | 2.11 MB → 1.27 MB |
| `/en/football-games/football-name-chain` | 83 → 96 | 4.03 s → 2.34 s | 160 ms → 104 ms | 1.83 MB → 1.26 MB |

Accessibility improved from 96 to 100 and best practices from 92 to 100. The before runs recorded the blocked theme script; the after runs recorded no browser console errors. Initial-load layout shift stayed below 0.004 in these runs. This does not measure shifts during a whole scrolling or gameplay session.

### Default simulated Lighthouse remains below target

Lighthouse 13.5.0, the current registry release at verification time, was also tested with its default simulated mobile settings on the Turkish shared player page. One matched run per version returned performance 74 → 82, LCP 7.28 s → 4.57 s, accessibility 96 → 100 and best practices 92 → 100. A single run is not a stable benchmark.

After rebasing and rebuilding on `d629543e`, three more default simulated runs per representative page returned the following. These are final local after measurements, not a matched before and after comparison on that newer base.

| Final page | Performance median and range | LCP median | Blocking time median |
| --- | --- | --- | --- |
| Turkish shared player | 86, range 84–94 | 3.85 s | 144 ms |
| English Name Chain | 81, range 80–83 | 4.84 s | 73 ms |

Accessibility and best practices remained 100, with no console errors. The isolated score of 94 is not a consistent 90+ pass.

Earlier three-run simulated tests with Lighthouse 13.0.1 returned median performance 76 → 76 on the Turkish shared player page and 78 → 75 on English Name Chain. They did not establish a performance score improvement in that mode. After single-run simulated checks across all eight language variants ranged from 68 to 84, with accessibility and best practices both 100.

Direct throttling and simulated throttling are different measurement methods; the 96 score is not a prediction that PageSpeed Insights will show 96. [Google's Lighthouse documentation](https://github.com/GoogleChrome/lighthouse/blob/main/docs/throttling.md) explains the difference. The remaining initial payload includes shared application, authentication, analytics and all four language dictionaries. Further splitting needs regression review across account and language navigation, not removal of those features just to change a score.

## Verification

- 94 targeted regression tests passed in 17 files, including hero loading, deferred boards, all four locales, link tracking, signup return paths, runtime constants and the theme nonce.
- Changed TypeScript and TSX files passed lint; the standalone type check and production build passed. The build generated 277 pages.
- All eight local game URLs returned HTTP 200, one H1, the expected production canonical, high priority hero markup and no inline script missing its nonce. Local pages deliberately remain noindex; their local SEO score is not a production SEO assessment.
- Chrome checked English Name Chain and Turkish shared player launch and exit on desktop and at 390 by 844 pixels. Both loaded their localized guest intro without an account. Exit cleared the play query and closed the dialog. The deferred leaderboard appeared after entering view. The browser recorded no errors in these checks.
- No round was started or completed for verification. Authenticated gameplay, signup completion, every game mode and full-session layout stability are not certified by these checks.

## Release and remaining verification

The implementation is in the isolated `codex/word-games-mobile-performance` branch, rebased onto production `d629543e` after the Georgian naming update shipped during verification. Matched before and after measurements use the earlier `70a567a9` baseline; final rebased simulated checks are identified separately above. All 94 targeted tests and the production build passed again on the rebased version, and all eight HTML checks passed with the new Georgian name preserved. The original working checkout and its unrelated edits were left untouched. There are no database migrations, URL changes, indexing submissions or security policy relaxations in this fix.

Next gate: review and deploy through staging, repeat the public PageSpeed mobile tests on all eight pages, and check guest launch, leaderboard loading and account navigation before promotion. Production performance and real user Core Web Vitals remain unverified for this change. The previous origin level field assessment cannot be treated as page specific data or an immediate before and after test.
