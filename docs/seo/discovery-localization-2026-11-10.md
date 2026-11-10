# Existing-game discovery improvements (2026-11-10)

## Why these changes

The production audit found all 24 Career Path, Minuto and Tenable pages already published in eight languages, with self canonicals, reciprocal hreflang and sitemap membership. Preserve those established URLs rather than splitting their intent across new landing pages.

- **Turkish Career Path:** replace the vague discovery name “Kariyer Yolu” with the descriptive “Kariyerden Futbolcu Tahmin Etme” already used by the campaign landing page. The card continues to the existing campaign quiz, not a new daily-game URL.
- **Argentina Minuto:** clarify before play that previous days are free without an account. Today's challenge and ranking still require sign-in. Existing Argentine Spanish and the Argentina-time reset are preserved.
- **UK Tenable:** recommend the already-published Football Darts 501, Football Connections and Football Clues rather than promoting the retired-from-Play Last Answer Standing experience. Minuto recommends Clues, Minesweeper and Tic Tac Toe. No old public route is deleted or deindexed.
- **All eight languages:** full daily games should be labeled daily games, not sample practice rounds. Campaign quizzes have a quiz label; genuine practice rounds and account-required entries retain their existing distinctions.
- **Trustworthy acceptance tests:** replace the stale four-language crawler assumptions with tested eight-language fixtures, including pt-BR, x-default, campaign paths, clean canonicals for tracking links and language-switch query preservation. Staging/preview noindex protection is expected, while production noindex is a failure.

These are accuracy and discoverability improvements. No new keyword-volume or ranking claim is made; conversion or ranking gains require measurement after a separately approved release. Landing-page translation does not by itself prove that every backend question/list is translated.

## Verified production URL inventory

### career-path

- en: https://quizball.io/en/football-quiz/career-path
- ka: https://quizball.io/ka/football-quiz/career-path
- es: https://quizball.io/es/quiz-de-futbol/trayectoria-del-jugador
- tr: https://quizball.io/tr/futbol-bilgi-yarismasi/kariyerden-futbolcu-tahmin-etme
- ru: https://quizball.io/ru/futbolnaya-viktorina/ugaday-futbolista-po-karere
- pt-BR: https://quizball.io/pt/quiz-de-futebol/adivinhe-o-jogador-pela-carreira
- de: https://quizball.io/de/fussball-quiz/karrierestationen-erraten
- fr: https://quizball.io/fr/quiz-foot/devine-le-joueur-avec-les-clubs

### guess-the-goal-minute

- en: https://quizball.io/en/football-games/guess-the-goal-minute
- ka: https://quizball.io/ka/football-games/guess-the-goal-minute
- es: https://quizball.io/es/juegos-de-futbol/adivina-el-minuto-exacto-del-gol
- tr: https://quizball.io/tr/futbol-oyunlari/gol-dakikasi-tahmin-oyunu
- ru: https://quizball.io/ru/futbolnye-igry/na-kakoy-minute-gol
- pt-BR: https://quizball.io/pt/jogos-de-futebol/em-que-minuto-foi-o-gol
- de: https://quizball.io/de/fussballspiele/in-welcher-minute-fiel-das-tor
- fr: https://quizball.io/fr/jeux-de-foot/a-quelle-minute

### football-tenable

- en: https://quizball.io/en/football-games/football-tenable
- ka: https://quizball.io/ka/football-games/football-tenable
- es: https://quizball.io/es/juegos-de-futbol/adivina-el-top-10
- tr: https://quizball.io/tr/futbol-oyunlari/futbol-top-10
- ru: https://quizball.io/ru/futbolnye-igry/ugaday-top-10
- pt-BR: https://quizball.io/pt/jogos-de-futebol/acerte-o-top-10
- de: https://quizball.io/de/fussballspiele/top-10-erraten
- fr: https://quizball.io/fr/jeux-de-foot/quiz-top-10-foot

## Verification and rollout

Run the repository typecheck, lint, full test suite and build on the final combined code. See [SEO acceptance](../SEO-ACCEPTANCE.md) for the focused 24-page and full crawls.

On the actual staging deployment, verify the changed labels on mobile and desktop, card destinations, switching language, guest archive entry, return after dismissed sign-in, result sharing and retained query context. For staging, use its own API/configuration, never production credentials or copied production data. Review the full staging-versus-main diff before any eventual production promotion. This task does not authorize a production merge.

## Local verification result

- TypeScript: passed (`npx tsc --noEmit --incremental false`).
- ESLint: passed with 0 errors and 64 existing repository warnings.
- Full test suite: 3,859 passed, 13 skipped (`npm test -- --maxWorkers=4`).
- Production build: passed, including generation of 703 static pages.
- Focused HTTP acceptance on the currently deployed baseline: production 225/225 and staging 225/225. The staging crawl explicitly expected its configured staging canonical origin. These baseline crawls do not certify deployment of this change.
- Deployment verification of these edits must be repeated after the staging merge.
