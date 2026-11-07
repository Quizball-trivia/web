# FR game-page naming research (2026-11-06)

Scope: names (in-game name, H1/title) and URL slugs for a new French edition (`/fr/...`, one edition for France, Belgium, Switzerland,
Quebec, Morocco, Senegal and Côte d'Ivoire) of the public game pages, the folder, the daily collection, the quiz hub and the campaign
quiz pattern. Game list = all 34 `LOCALIZED_SLUGS` keys in `src/lib/seo/game-pages.ts`, joined to `PUBLIC_GAME_META` in
`src/lib/seo/public-games.ts`, read from the `locale-gaps-web` worktree (branch `chore/locale-gaps`, 414d7b5a); 29 campaign pages from
`GERMAN_PUBLIC_SLUGS` in `src/features/campaign-quiz/campaignQuiz.routes.ts`. Research only: no repo file changed, no database touched.
Same method and shape as `docs/SEO-GAME-NAMING-DE-2026-10-23.md` and `docs/SEO-GAME-NAMING-PT-2026-10-21.md`.

## Decisions at a glance

| Item | Recommendation |
|---|---|
| Games folder | **`/fr/jeux-de-foot/`** |
| Daily collection | **`/fr/jeux-de-foot/jeux-quotidiens`** |
| Quiz hub | **`/fr/quiz-foot`** |
| Campaign pattern | **`quiz-<club>`** (word order is the reverse of German): `quiz-arsenal`, `quiz-fc-barcelone`, `quiz-premier-league`; national teams `quiz-argentine-foot`, `quiz-espagne-foot` |
| Address form | **tu**, confirmed |
| Spelling | **quiz**, not quizz; **foot** in slugs and H1, "football" once in the title or meta |
| Locale tags | hreflang `fr`, `og:locale` `fr_FR`, `<html lang="fr">` |
| Final table | §9 (table) and §10 (JSON) |

**Owner choices** (details in §6 and §7):

1. **Codenames:** keep the brand word ("Codenames foot", `codenames-foot`), or use the fallback ("Noms de code foot", `noms-de-code-foot`). I
   recommend the brand word, consistent with es, tr, pt and de. It is a trademark call.
2. **French campaign pages:** none of the 29 published quiz pages is a French club, the French team, Ligue 1, the World Cup or the Ballon
   d'Or, and those are the French searches. The hub launches without its main demand unless content is added (§4).
3. **"Money Drop":** the show is coming back on M6, so I recommend keeping the name off the page even though "money drop jeu en ligne" is searched. es and tr use the name, so
   this breaks with them.
4. **Folder risk:** `jeux-de-foot` is the natural name, but its head query is mostly video-game intent. The narrower `jeux-culture-foot` matches better and
   is searched far less. I recommend `jeux-de-foot`.

## 1. Method and caveats

- **Suggest, 2,417 Google calls on 2026-11-06** (`client=firefox&hl=fr`): 1,825 calls on `gl=fr` in round 1 (1,824 queries), 116 in round 2 (open questions and competitors), 72 heads on each of `gl=be,ch,ca,ma,sn,ci` = 432, and 44 heads on YouTube Suggest (`ds=yt`). 134 of the France queries returned nothing.
- **YouTube: 118 French phrases, two flat searches each (`ytsearch50:`; `youtube:lang=fr` for titles, the default run for view counts), 6,694 unique videos** (4,297 in the fr run). 1 phrase stayed empty after a retry ("devine la carte fut"). Real counts for 651 fr-only videos whose titles matched a format were fetched one by one.
- **Suggest proves demand; no Suggest does not prove absence** (es precedent: "buscaminas futbolero" had 1,211 GSC clicks and no Suggest).
  Rows marked "no demand" mean the mechanic has no searched French name, not that nobody would play it.
- **Padded tails are not demand.** French Suggest often returns the query plus a filler word: "football", "gratuit", "en ligne", "quizlet",
  "quizz biz", "jeune" and "jeudi" (from the prefix "jeu"). A row that shows only these is treated as no demand, even if it counts as G2 or G3.
  Google also expands "quiz" to synonyms ("test", "game", "trivia", "questionnaire"), which inflates G10 counts on quiz rows.
- **Google Suggest IP leak: not seen this time.** No Georgian tails appeared (0 hits for Tbilisi, Saburtalo, Vake, Kazbegi or Géorgie in
  the France rounds), unlike the de and pt runs. The requests still came from a Mac in Georgia, so country signals are weak (next point).
- **The `gl=` regional spot check is weak evidence.** 72 heads on be, ch, ca, ma, sn and ci returned almost the same lists as France. Only a few
  tails moved (§8). I cannot tell whether those markets really match France or whether `gl` barely changes results from this IP. Treat it as
  "nothing contradicts one edition", not as proof.
- **YouTube view-count trap: HIT in French.** The `youtube:lang=fr` run returns wrong counts, apparently because yt-dlp misparses French abbreviations such as "14 M de vues"
  (a video with 14,642,316 real views read as 14). On the 1,983 ids in both runs, 1,610 differ by more than 5%. Every count in this document comes from the default run or a per-video fetch
  (`missing_views.tsv`), never from the fr run (default-run counts matched per-video fetches on a spot check of 5 videos). The pt and de joiners fall back to the language-run count; `ytfr.py` and `ytnat.py` here do not. Anyone re-running this
  for French must not reuse `ytjoin.py`.
- **Translated-title trap, as in de.** The fr run shows machine-translated titles for foreign videos (Total Football Quiz, The Best Football
  Quiz, Foot Énigmes and LukePingu "MORPION FOOTBALL" all look French). `ytnat.py` keeps only titles that are identical in both runs and contain French
  words, and even that lets some through. Evidence below cites native French creators only: Hero Quiz Football, Hero Quiz, Le Quiz du Foot, Quiz Foot Club, Lexity, YoMax,
  AF5, Zone Foot, Panenka, Pitch Addict, Passe D, Michou, Squeezie, Adem&Bilal, Best Of du Grenier, mistermv, Ludovox, Winamax Sport, OM, PSG.
  Sums show which names creators use, not market size.
- **SERP: mostly unverified.** WebSearch is a US engine (15 queries, `serp.txt`). renderfoot.com, lequipe.fr, jetpunk.com, quizz.biz and sofoot.com
  blocked curl or fetch, so **RenderFoot's French names and L'Équipe Jeux are known only from search titles and one third-party article**, not from reading
  the pages. google.fr itself was not checked (by-hand list in §11). Google Trends was tried once and returned HTTP 429, so there are no volumes.
- **Raw data** is in `locale-gaps-work/seo-fr-raw-2026-11-06/`: `sugg.tsv` and `suggb.tsv` (round 1, two workers), `sugg2.tsv` (round 2), `sugg_reg.tsv`
  (regional), `sugg_yt.tsv` (YouTube Suggest), `yt.tsv` (fr titles), `yt_en.tsv` (default run), `missing_views.tsv`, `yt_stats.txt`, `tuvous.txt`, `serp.txt`; query lists
  `q1.txt`, `q2.txt`, `q_reg.txt`, `q_yt.txt`, `ytq.txt`; scripts `sugg.py`, `yt.sh`, `ytfr.py`, `ytnat.py`, `ytall.py`, `tuvous.py`, `names.py`. Every request used the generic Firefox
  UA from `sugg.py`; no email or personal data was sent.

Notation as in de: "G10" = Google returned 10 completions, the relevant ones quoted; "echo" = only the query comes back; "0" = nothing; "YT Suggest" = `ds=yt`.

## 2. Slug style: French words, lowercase ASCII, accents stripped

**Mechanical rule, in this order:** é è ê ë → e · à â → a · î ï → i · ô → o · ù û ü → u · ç → c · œ → oe; **apostrophe → hyphen**
(`trouve-l-intrus-foot`, `quiz-ballon-d-or`); drop "?" and "!"; spaces → one hyphen; 2-6 words.

- **Accents are stripped nearly everywhere** (hrefs on section pages, curl 2026-11-06): 0 accented paths on rmcsport, footmercato, onzemondial, foot01, lefigaro, 20minutes, rts.ch. Exceptions:
  goal.com/fr (29 percent-encoded), rtbf.be (2), journaldemontreal (1).
- **Apostrophes: hyphen is the majority among large sites.** Hyphen: rmcsport 63 (`/football/ballon-d-or/`, `/football/supercoupe-d-espagne/`), lefigaro 97, goal.com/fr 90,
  rtbf 36, lematin.ch 11, rts.ch 8, plus francefootball.fr `/ballon-d-or/`. Joined: footmercato 19-27 (`quil`), onzemondial 17 (`ballon-dor`), foot01 8 (`lom`), dhnet 6. Both work; hyphen
  keeps the words readable and gives `-l-om-`, not `-lom-`.
- **Google treats the stripped form as the accented one:** "demineur foot" and "démineur foot" return the same list; "rebus foot" and "rébus foot" too; "ballon d or" and "ballon d'or".
- **Engineering reason, same as ru, pt, de:** ASCII avoids NFC and percent-encoding mismatches in the `middleware.ts` redirect map, the sitemap, hreflang and canonicals. All slugs pass
  `CAMPAIGN_SLUG_PATTERN`, and `jeux-de-foot` fits the middleware's folder regex `[a-z-]+`.
- **English stays where the French type it in English:** `higher-or-lower` (§3), Codenames, Connections, Top 10.
- **Word order:** the French drop the article and put "foot" last: "morpion foot" G10, "démineur foot", "rébus foot", "roue foot", "quiz foot". Slugs follow it; a preposition stays only where the phrase needs it (`roue-du-foot`, `jeu-de-coup-franc`).
- **The H1 and title carry the ranking,** as in es, ru, pt, de: put the exact accented phrase first.
- **French typography:** a space comes before `?`, `!`, `:` and `;` ("Qui suis-je ?"). Use a non-breaking space (U+00A0) so the mark never wraps alone onto a new line on mobile.

**Locale tags.** One French edition for every market.
- **hreflang `fr`** (generic), so `HTML_LANG.fr = "fr"`, the same pattern as `ru`, `es` and `de`. `fr-FR` alone would declare it a France page, which is wrong for Morocco, Senegal, Côte d'Ivoire, Belgium, Switzerland and Quebec.
- **`og:locale` `fr_FR`**, `<html lang="fr">`, Intl `fr-FR`. `CAMPAIGN_HREFLANG.fr = 'fr'`.
- Copy: never "en France" only. Numbers as digits avoid the septante/nonante split between France and Belgium/Switzerland.

## 3. Page names

Conf. = confidence in the name. Every slug is new (no `/fr/` URLs yet), so there is no GSC gate. Get the names right before launch. Rows marked † have `page: false` today (card only or no page), but the slug is still needed for `LOCALIZED_SLUGS`.

### Daily games

| Page (key) | In-game name | Recommended H1 (title starts with it) | Slug | Evidence: Suggest (FR) · YouTube | Meta angle | Conf. |
|---|---|---|---|---|---|---|
| who-am-i † | Qui suis-je ? | **Qui suis-je ? Devine le joueur de foot en 5 indices** | `qui-suis-je-foot` | "qui suis je foot" G10 (footballeur, difficile, **version foot, jeu football**) · "quiz qui suis je football" and "devinette foot qui suis je" in tails · **"qui suis je jeu" G10 = party game** (enfant, adulte, Disney), so keep "foot" in the slug · YT: thin for football; MichouOff "QUI SUIS-JE ?" 906k is generic. **Who Are Ya** is the competitor name ("who are ya foot" G10); leave the head "devine le joueur" to the hub (§4) | 5 indices, moins d'indices = plus de points, nouveau joueur chaque jour | Med-High |
| money-drop | Répartis tes pièces | **Répartis tes pièces : le quiz foot** (descriptive) | `repartis-tes-pieces` | **No demand for any French name:** "répartis tes pièces" 0, "place tes pièces" 0, "mise tes pièces" → "pièces détachées" · **"money drop" G10 = the TV show, back on M6** (money drop m6, olivier minne, casting 2026, jeu de société, **jeu en ligne**) · "quiz pour gagner de l'argent" G10, "quiz qui rapporte" G3 = earn-money intent · YT: none. Natural name, no searched term | Répartir ses pièces sur les réponses; only in-game coins, never money | Low |
| true-or-false-football | Vrai ou faux | **Vrai ou faux foot : le quiz** | `vrai-ou-faux-foot` | "vrai ou faux foot" G10, **but many tails are fake-shirt checks** ("vrai ou faux maillot foot", "footdealer / footshop vrai ou faux") · "quiz vrai ou faux" G10 · "quiz foot vrai ou faux", "question vrai ou faux football" in tails · **"vrai ou faux" G10 includes franceinfo's programme** · YT: Pitch Addict "Anecdotes Foot vs Abonnés (Vrai ou Faux)" 151k + 89k, the closest format. Put "quiz" in the title to steer away from shirts | Une affirmation, 15 secondes | Med |
| countdown | Cite le plus de joueurs | **Cite le plus de joueurs possible avant la fin du chrono** | `cite-le-plus-de-joueurs` | "cite le plus de joueurs" G2 (de foot, du monde) · YT Suggest "cite le plus de joueurs du psg" · **"cite moi des joueurs" G10, "cite moi 5 joueurs du psg / du barça" = voice-assistant list requests, so expect lookup intent** · "quiz foot chrono" padded, "quiz chrono" G10 generic · **"contre la montre" = cycling and watches**, "compte à rebours" = escape games · "countdown foot" = English footage. Weak, but the most natural phrase | Une catégorie, un chrono | Low-Med |
| career-path † | Parcours du joueur | **Devine le joueur avec les clubs : retrouve-le grâce à son parcours** | `devine-le-joueur-avec-les-clubs` | **Head "devine le joueur" G10: "…de foot avec les clubs" is its 2nd completion**, then "…pro" (another format), "…avec son parcours", "…carrière", "…photo", "…transfert" · "devine le joueur avec" G10 (les clubs, sa carrière, son parcours, les transferts) · "trouve le joueur avec ses transferts", "trouver le joueur avec ses clubs" · YT: ZIVA Quiz Joueurs "DEVINE LE FOOTBALLEUR D'APRÈS SES TRANSFERTS" 963k, Hero Quiz Football "Devine les TRANSFERTS du FOOTBALLEUR" 535k. Same slug in both folders, as pt and de | clubs, transferts, parcours, carrière: all four words | Med-High |
| higher-or-lower | Higher or Lower | **Higher or Lower foot : qui vaut le plus cher ?** | `higher-or-lower` (English, as ru, pt, de) | "higher or lower" G10 (game, **français**, football) · "higher or lower transfermarkt" G10 · "higher or lower foot" G10 · "higher or lower français" G8 ("more or less jeu francais") · **"plus ou moins foot" G10 = betting** (plus ou moins 2.5 buts, parions sport, pronostic) · "plus haut plus bas" G9 = drinking game · "qui vaut le plus cher" G10, "quel joueur vaut le plus cher" G10 = lookups, usable in the H1 · YT: no French title (0 for "plus ou moins" or "higher" in native titles). **Never "Plus ou moins"** | valeur marchande, buts, stats | Med |
| imposter | Trouve l'intrus | **Trouve l'intrus : le quiz foot** | `trouve-l-intrus-foot` | "trouve l'intrus" G10 + "trouver l'intrus", "cherche l'intrus", "cherchez l'intrus" G10 each (school and word lists) · "trouve l'intrus foot" G2 · YT: **Hero Quiz Football "Trouve l'INTRUS...! Spécial FOOTBALL" 1.8M**, Le Quiz du Foot "Devine le joueur intrus !" 155k; "intrus" 40 native titles, 15.8M; YT Suggest "trouve l'intrus foot" · **"imposteur foot" G10 (jeu, en ligne, joueur de foot) and "undercover football" G10 = the party game**, keep both off this page (§7) | Sélectionne seulement les intrus | **High** |
| closest-wins (key `stat-sniper`) | Au plus proche | **Au plus proche : devine les chiffres du foot** | `au-plus-proche-foot` | "au plus proche" G10 (jeu; also crosswords) · "quiz au plus proche" G3, "questions au plus proche" G8 · **"le plus proche gagne" G10 = a boxed quiz game sold at Cultura and Leclerc**, so not that name · "juste prix foot" G3 + OM "LE JUSTE PRIX" 115k, Foot Mercato FC 43k, **but "Le Juste Prix" is an M6 show** ("juste prix m6" G10) · "question d'estimation" G8 mostly "évaluation" · "devine le chiffre foot" padded. No searched football name | transferts, affluences, buts; le plus proche gagne la manche (lowercase, in the body) | Med-Low |
| pass-chain | Relie les joueurs | **Relie les joueurs : de coéquipier en coéquipier** | `relie-les-joueurs` | **No demand:** "relie les joueurs" 0, "relier deux joueurs" → "relier deux personnes", "chaîne de passes" 0, "chaîne de coéquipiers" 0, "six degrés foot" = English · "[X] et [Y] ont-ils joué ensemble" G9-10 = real pair lookups, useful for the FAQ · YT: none. Natural name, no searched term | ont-ils joué ensemble ? (FAQ) | Low |
| missing-xi | Devine le 11 | **Devine le 11 : retrouve les compos de légende** | `devine-le-11` | **The digit beats the word:** "devine le 11" G8 (foot, en ligne) vs "devine le onze" G1 · "trouve le 11 foot" in a G10 tail, "trouver le 11 football" · "devine la compo" G3 (foot), YT Suggest "devine la compo om" · "quiz composition foot" G3 · "11 de légende" G10 (OM, FC 26) · "compo france 98" G10 and "compo finale coupe du monde" G10 = lookups, so name famous line-ups in the intro · **"onze de départ" G8 and "11 de départ" G10 = today's team news**, avoid · YT: Zone Foot and Panenka "COMPOSE TON XI" 184k, 166k, 130k, 123k (a different format, build your XI) | compos, onze de légende, finales | Med |
| football-logic | Rébus foot | **Rébus foot : 2 images, 1 joueur** | `rebus-foot` | "rébus foot" G10 (joueur de foot, devinette foot, avec réponse) · "rébus joueur de foot" G10 · "devinette foot" G10 · "2 images 1 joueur" G1 padded · **"4 images 1 mot foot" G10 = solutions for the app** · **"logique foot" G9 = "logic football prediction" (betting tips), never "logique"** · YT: FOOT XIX "Rébus football - Devine le Footballeur" 7.7k, The Crackito 945; emoji versions are bigger (PSG "Emojis Challenge" 2.1M, Hero Quiz Football 395k) but a different medium | devinette, images | Med |
| football-timeline † | Frise du foot | **Frise chronologique du foot : remets les événements dans l'ordre** | `frise-chronologique-foot` | "frise chronologique football" G4 (sport) · "frise chronologique jeu" G10 · **"timeline jeu" G10 and "jeu timeline" G10 = the Asmodee card game** · "hitster" G10 = music · "qu'est-ce qui est arrivé en premier" G7 = chicken and egg · "remets dans l'ordre foot" G3 padded · YT: none. School word, as in de | histoire du foot, ordre | Low |
| card-detective | Devine la carte | **Devine la carte : quel joueur se cache derrière ?** | `devine-la-carte-foot` | "devine la carte" G10 (**fifa, fut**, Clash Royale, Pokémon) · "devine la carte fut" G4, "devine la carte fifa" G3 · "quiz carte fut" G5 · "carte de joueur" G10 ("…de foot") · "devine le joueur par sa carte" 0 · "foot" in the slug avoids Clash Royale and Pokémon · YT: Foot Énigmes "DEVINEZ LA CARTE" is translated. Keep FIFA, FUT and EA FC out of the name (German precedent) | carte de joueur, indices payants | Med-Low |

### Game modes

| Page (key) | In-game name | Recommended H1 | Slug | Evidence: Suggest (FR) · YouTube | Meta angle | Conf. |
|---|---|---|---|---|---|---|
| ranked | Duel classé | **Quiz foot 1v1 : le duel en ligne** | `quiz-foot-1v1` | "quiz foot 1v1" G9 (duel, football quiz 1v1, pvp) · "quiz foot duel" G9 · "duel quiz foot" G10 · "1v1 foot" G10 · **"Duel Quiz" G10 = an app** (avis, ne fonctionne plus, triche; YT metasmash "toujours gagner à duel quiz" 33k), so never that word order alone · "qui connaît le mieux le foot" 0 · **"duel foot" and "duel football" G10 slide to "match foot ce soir"** · "quiz classé" 0, "quiz foot ranked" noise, so "classé" stays in-game only · "partie classée" is the usual French gaming term (background knowledge) | adversaire réel, possession, classement | Med |
| auction | Enchères foot | **Enchères foot : recrute ton équipe de rêve** | `encheres-foot` | "enchères foot" G10 ("enchere foot jeu"; also shirts, cards) · "jeu d'enchères foot" G2, "jeu enchère foot" G4 · "enchères de joueurs" G3 (tennis, de foot) · YT: **Zone Foot "QUI aura le MEILLEUR XI aux ENCHERES ?!" 160k and 117k, "Compose ton XI LDC aux Enchères" 119k** = the French creator format · **"mercato mpg" G10 / "mon petit gazon" G10: French fantasy fans already know auctions** through MPG (brand) · "draft foot" G10 (en ligne, jeu, 26) = picking, not bidding; meta only · "jeu mercato" G10 = Mercato Master, keep "mercato" as a meta word | draft, mercato, équipe de rêve, budget | Med |
| friendly † | Entre amis | **Quiz foot entre amis** | `quiz-foot-entre-amis` | "quiz foot entre amis" G3 and in all 6 regions · "quiz entre amis" G10 (en ligne, qui est le plus) · "quiz foot en ligne multijoueur" in the "quiz foot en ligne" G10 tail · "jeu foot entre amis en ligne" G1-3 · **"match amical" G10 = real friendlies** (OM, PSG, France, ce soir), same trap as es `partido-amistoso` and pt "amistoso": never "amical" · "potes" is natural in body copy: Tout Pile Foot uses "Défie tes potes" | salon privé, lien d'invitation, sans inscription | Med |
| football-tic-tac-toe | Morpion foot | **Morpion foot en ligne** | `morpion-foot` | **"morpion foot" G10 (en ligne, jeu, football, 1v1, gratuit, quiz, tic tac toe, application) and in all 6 regions** · "morpion foot en ligne" G4, "morpion joueur de foot" G3, "morpion foot quiz" G5, "morpion foot site" G3 · "morpion foot ligue 1" padded · "tic tac toe football" G10 (English tails) · "tiki taka toe" G9 (foot, bingo, basket) = competitor brand · **"morpion foot entrainement / exercice" = a drill** (Focus Ultimate 137k) · **"grille foot" G10 = also Loto Foot** ("grille foot 15", winamax, fdj, l'équipe) · YT: thin in French (DemoTV "foot morpion" 50k, Lexity "MORPION FOOT" 3.3k; "Morpion Foot : concept de @Panenkagames") · SERP: RenderFoot already uses "Morpion Foot". Add a Ligue 1 grid section | Ligue 1, tic tac toe, 1v1 | **High** |
| free-kicks | Coups francs | **Jeu de coup franc : réponds juste, puis tire** | `jeu-de-coup-franc` | "jeu de coup franc" G10 (foot, en ligne, gratuit, **Baggio**) · "jeu coup franc" G10 · "coup franc jeu" G10 includes **hors-jeu rules** · YT: physical (VINSKY 1.8M, Le Terrier 421k) · Arcade intent (the old Baggio game, Poki `/fr/coup+franc`), so expect bounces as in es and pt · **"jeu penalty" G10 = "jeu penalty argent", "penalty casino" G10: keep "penalty" and "tir au but" out** | répondre pour ouvrir une zone du but | Med |
| road-to-goal | Direction le but | **Direction le but : réponds et avance** (descriptive) | `direction-le-but` | **No demand:** "en route vers le but" 0, "direction le but" → "direction but", "vers le but" G10 → **BUT store in Sevran and "tir vers le but 1xbet"**, "chemin du but" = street names · **"but" also means the BUT furniture chain and the French university diploma** ("emploi du temps but", "quel but après un bac"), so write "but" next to foot words · "quitte ou double" G10 = RTL radio show, avoid · Copy: "sécurise tes pièces", never "encaisse" | avancer le ballon, sécuriser ses pièces | Low |
| guess-the-goal | Devine le but | **Devine le but : reconnais le but de légende** | `devine-le-but` | "devine le but" G10 is mostly English prefix noise (Devine Butchers) · YT Suggest "devine le but", "devine le but football", "devine le buteur" · "devine le but foot" padded · "but mythique" G8, "buts de légende" G3 · "qui a marqué ce but" G10 · YT: Njajaan "Devine le but (Edition Sénégal)" 653 | buts mythiques, tableau tactique | Low-Med |
| football-minesweeper | Démineur foot | **Démineur foot** | `demineur-foot` | "démineur" G10 (Google, en ligne, gratuit) · "démineur foot" G4 (football, **en ligne**, minesweeper football), same in all 6 regions · **"minesweeper foot" G4 returns "démineur foot"**, so Google links them · YT Suggest "démineur football" · "minesweeper français" G4 → "démineur français" · SERP: no French football minesweeper found · **Gambling: "mines casino" G10, "jeu mines argent telegram", "mines stake" G10 → never "Mines"**, and "champ de mines" belongs to neither | 16 joueurs, 1 indice, 4 mines | Med-High |
| football-clues | Devine le joueur | **Devine le joueur avec 10 indices** | `devine-le-joueur-avec-des-indices` | "devine le joueur avec des indices" G2 (anime noise), "deviner joueur indices" G2, "10 indices 1 joueur" G2 padded, "jeu indice joueur" G1 · **"indice" alone = stock index and UEFA coefficient** ("indice footsie", "indice uefa") · YT: Quiz Foot Club "DEVINE LE JOUEUR AVEC 3 INDICES" 358, Football IQ "en 5 indices" 38. Low but natural, under the strong head "devine le joueur". No number in the slug, in case the count changes | indices du plus dur au plus facile, 10 joueurs par jour | Med-Low |
| guess-the-goal-minute | À quelle minute ? | **À quelle minute ? Devine la minute du but** | `a-quelle-minute` | "à quelle minute" G10 (a film scene, cooling break, "le premier but sera-t-il marqué") · "à quelle minute a été marqué le but" G2 · "devine la minute du but" → "butin" (0 real) · **"a quelle minute le premier but sera t il marqué" and "temps du premier but" are betting markets: keep "premier but" out** · YT: none. Short slug because the folder supplies the football context | buts célèbres, Coupe du monde, Ligue des champions | Low |
| football-horserace | Course des nations | **Course des nations : choisis la stat, fais avancer ton drapeau** (descriptive) | `course-des-nations` | **"course de chevaux" G10 = PMU races and a drinking game** ("aujourd'hui", "jeu d'alcool", Deauville) · "course des nations" G6 = Motocross des Nations, a small collision · "course des sélections" 0, "course de drapeaux" 0 · **"course de billes" G10 and "marble race" G10 (winamax) = a different format** (Marble Race King 559k), do not borrow · No searched term. es keeps "caballos" from a LatAm format; de and pt renamed, and fr should too | stats, nations, tournois | Low |
| football-codenames | Codenames foot | **Codenames foot : cartes images, un indice, deux équipes** | `codenames-foot` | "codenames" G10 in all 6 regions (duo, en ligne, jeu, images, Harry Potter) · "codenames foot" G10 but many tails = **"code name football apk", a separate mobile game** · "codenames en ligne français" G3, "codenames images" G10 (our mechanic) · YT Suggest "codenames football fr", "codenames jdg / antoine daniel / inoxtag / ponce" · YT: 11 native titles, 1.85M (Best Of du Grenier 1.5M, Ludovox 240k): a known streamer game · "nom de code jeu de société" G2, "jeu nom de code" G5 are thin. Sold in France as Codenames by Iello (retail listings; "Nom de Code" names the cards in the French rules). Trademark: owner call (§6) | jeu de société version foot, avec des amis | Med (demand) · trademark flag |
| trivia-mines | Terrain miné | **Terrain miné : le quiz foot aux défenseurs cachés** (descriptive) | `quiz-terrain-mine` | **No demand:** "terrain miné quiz" G3 padded, "champ de mines quiz" padded, "quiz démineur" G2 · **"champ de mines" G10 = real landmines** (Maroc, Mauritanie), a bad tone for a game · Keep "démineur" off this page (the minesweeper owns it, same rule as es, ru, pt). "terrain" also means pitch, so the idiom works · Copy: "sécurise tes pièces", never "cagnotte" | 25 cases, 4 défenseurs | Low |
| squad-spin | La roue du foot | **La roue du foot : tourne et cite le bon joueur** | `roue-du-foot` | "roue foot" G10 (**footballeur, aléatoire, club, pays, championnat, poste**, loto foot) · "roue de foot" G10 · "roue du foot" G4 ("roue du hasard foot") · "roue aléatoire foot" G6 · YT: **AF5 "LA ROUE DÉCIDE DE L'AVENIR DU PSG !!" 620k, "…DE L'ÉQUIPE DE FRANCE" 418k**, Coach YoMax "la ROUE décide de mon ÉQUIPE" 22k; YT Suggest "la roue decide de l avenir du psg" · **"roulette foot" G10 = Zidane's move + casino ("roulette foot casino")** → never · **"roue de la fortune" G10 = the TV show, "roue de la fortune parions sport"** → never · "machine à sous foot", "slot foot" → never | club, poste, nation; la roue décide | Med-High |

### Word games

| Page (key) | In-game name | Recommended H1 | Slug | Evidence: Suggest (FR) · YouTube | Meta angle | Conf. |
|---|---|---|---|---|---|---|
| last-answer-standing | Cite-les tous ! | **Cite-les tous ! Les listes du foot contre la montre** | `cite-les-tous` | "cite tous les joueurs" G10 ("citez tous les joueurs du real madrid"), "cite tous les vainqueurs de la ligue des champions" G1, "cite tous les joueurs de france 98" G3 padded · "cite tous les" G10 = countries and maths, so the name needs "foot" next to it · **"jetpunk foot" G10 (coupe du monde, ballon d'or, ligue des champions, top 10)** = the closed-list quiz competitor · "dernier debout" G10 = Destiny 2 · **"petit bac foot" G7 (version foot, joueur de foot, jetpunk) = a different mechanic**, do not borrow (§7) · Keep it distinct from Countdown: "le plus de" for the open list, "tous" for the closed list | listes fermées, chrono qui raccourcit | Low-Med |
| played-for-both-clubs | Joueur en commun | **Joueur en commun : qui a joué dans les deux clubs ?** | `joueur-en-commun` | **"joueur ayant joué au / à" G10, "joueurs ayant joué au" G10, "joueur passé par" G10, "joueurs passés par" G10, every completion a club pair, same in all 6 regions:** PSG et OM, Barça et Real, PSG et Arsenal, PSG et Monaco, Lyon et Marseille, OM et Barça, Lens et Auxerre, Lille et Monaco, Nice et Rennes, Bordeaux et Strasbourg, Saint-Étienne et Nice, Real et Atlético, Liverpool et Manchester United · every club stem tested returned G10 (Marseille, Lyon, Saint-Étienne, Lens, Lille, Nantes, Bordeaux, Monaco; Anderlecht G6) · "joueur commun" G10 (lille monaco, strasbourg monaco; **also "joueur commun fc 25"** = EA squad objectives) · the generic form misses: "joueur ayant joué pour les deux clubs" 0 · YT: no French format · **The strongest French pattern and a pair-page opportunity**, like pt, de and ru. Same name family as es and pt | Exact phrase "joueur ayant joué" in the meta; pair pages (§7) | **High** (demand) · Med-High (H1) |
| football-name-chain | La dernière lettre | **Le jeu de la dernière lettre : enchaîne les joueurs de foot** | `jeu-de-la-derniere-lettre` | "joueur de foot commençant par" G10, "joueur de foot avec la lettre" G10, "joueur de foot qui commence par" G10, "footballeur commençant par" G10 = people looking up answers (likely for Petit Bac) · "jeu de la dernière lettre" G2, "jeu dernière lettre" G3 (with Last Message noise) · YT: Hero Quiz Football "Trouve un JOUEUR qui COMMENCE par..." 195k (alphabet format) · **"chaîne" is taken: "chaîne de foot" and "chaîne foot" G10 = TV channels** ("quelle chaîne foot ce soir") → do not copy es "Cadena" · **"marabout bout de ficelle" G10 is the French chain game, but "marabout foot" G9 = betting tips and fortune tellers ("marabout pronostic foot")** → not that name | "joueur de foot commençant par la lettre…" in intro and FAQ | Low-Med |
| football-tenable | Devine le top 10 | **Quiz top 10 foot : devine le classement caché** | `quiz-top-10-foot` | "quiz top 10 foot" G7, "top 10 quiz foot" G10, "top 10 foot quiz" G10, "top 10 quiz" G10 (football, foot) · "quiz top 10 ballon d'or" G8 · **"top 10 foot" G10 = listicles** (mieux payés, plus riche), so "quiz" matters · "devine le top 10" G3 ("jeu devine le top 10") is weaker · **"jeu top 10 foot" G7 (règle du jeu, jeu de carte) looks like a physical game; not identified** · **"tenable" G10 = Tenable Nessus and the French adjective**, never · **"top ten jeu" G10 = the Top Ten party game** (Cultura), so write digits · YT: no French format · SERP: RenderFoot "Quiz Foot Top 10" | buteurs, transferts, trois erreurs | Med |
| football-odd-one-out | Trouve le faux | **Trouve le faux : quelle info foot est fausse ?** | `trouve-le-faux` | "2 vérités 1 mensonge" G10 and "deux vérités un mensonge" G10 (jeu, exemple; also a film and a book) · "2 vérités 1 mensonge foot" padded · "quelle affirmation est fausse" G5 · "laquelle est fausse" G10 · "trouve le faux" G5 is noisy (faux-filet) · YT: **Adem&Bilal "2 VÉRITÉS, 1 MENSONGE !" 2.8M**, YT Suggest "2 vérités 1 mensonge mastu" = a known format, but not in football · **Do not translate es "Dato falso" or use "Trouve l'erreur"** (spot-the-difference and spelling, G10) · "Trouve l'intox" 0. Mention "2 vérités, 1 mensonge" in the intro | Quatre vraies, une fausse, 30 secondes | Low-Med |
| football-connections | Connections foot | **Connections foot : trouve les 4 groupes de joueurs** | `connections-foot` | "connections foot" G10 (football 11, edition, game, quiz) · "football connections" G10 · "jeu connections en français" in the "jeu connections" G7 tail, "connections nyt français" G6 · **"connexions foot" G10 and "connexion foot" G10 = club logins ("connexion footclub", "footclubs connexion fff") and Foot Locker** → the French spelling is the trap, so not "Connexions" · "trouve le point commun" G5 (jeu) with YT **MichouOff "TROUVE LE POINT COMMUN" 1.8M, 797k** = a French format, not football: use it in the meta · "point commun joueurs" 0 · Competitors: Futbol 11 "connections", App Store Coneko · NYT owns Connections as a game name: precedent tr and de use it | 16 joueurs, 4 groupes, trouve le point commun | Med |
| football-darts-501 | Fléchettes foot 501 | **Fléchettes foot 501** | `flechettes-foot-501` | Owner brief: every name keeps the word for darts · "fléchettes 501" G10 · "fléchettes foot" G10 tails are English ("football darts 501", "dart foot") · "football darts 501" G10 (online, quiz, **top bins**) · "501 foot" G10 (501 football game, quiz) · **"flechette football gonflable" G4 (decathlon) = the inflatable physical game** · YT: Generation Football "Football 501®" (the ® is in the title, translated run; check this mark before using "Football 501" alone) · No French term for this exact game; "fléchettes" is the word in every French darts query | 501, joueurs par catégorie, finir à 0 | Med-Low |

## 4. Folder, daily collection, quiz hub, campaign pages and "guess the player"

| Item | Recommendation | Evidence | Conf. |
|---|---|---|---|
| Folder (`football-games`) | **`/fr/jeux-de-foot/`**; hub H1 "Jeux de foot en ligne : quiz et défis de culture foot" (meta: "gratuit, sans inscription") | "jeux de foot" G10 (gratuits, **fifa, ps5, switch**, en ligne) in FR and all 6 regions · "jeu de foot" G10 (gratuit, en ligne, switch) · "jeux de foot en ligne" G10 (gratuit multijoueur, **penalty**, a 2 joueurs) · "jeux de foot quiz" G4, "jeu foot en ligne quiz" G5, "jeux culture foot" G9, "jeu culture foot en ligne" G2 · "jeux de football" G10 adds "américain", "konami" · **Caveat: unlike de and pt, the word does not mean today's matches. It means video games and arcade portals** (Poki, CrazyGames, EA). Expect bounces; always put "quiz" or "culture foot" in H1 and title · Portal H1s: Poki "Jeux de Foot", CrazyGames "Jeux de Football", RenderFoot "Jeux de football" · `jeux-culture-foot` fits the intent but is far smaller (owner choice 4) | Med-High |
| Daily collection (`daily-challenges`) | **"Jeux quotidiens de foot"**, slug **`jeux-quotidiens`** (`/fr/jeux-de-foot/jeux-quotidiens`) | "jeux quotidiens" G9 (en ligne, gratuits, **linkedin**) · "jeu quotidien" G10 (film, geographie, wikipedia, mot) = the habit exists · "jeu quotidien foot" G2-3 (gratuit, en ligne) · **"défi du jour" G10 = school maths and Clash Royale; "défi quotidien" G10 = Forza and GTA** · **"jeux du jour" G10 = Ouest-France, Cdiscount, Epic Games** · "quiz foot du jour" G3 ("quiz foot journalier"), "onze mondial quiz du jour" · "devine le joueur du jour" G4 · French Wordle names: **"sutom foot" G4, "tusmo foot" G4, "wordle foot" G10** · Say "comme Wordle, Sutom ou Tusmo" in the body only, never in the title | Med-Low |
| Quiz hub | H1 **"Quiz foot : teste ta culture foot"**; slug **`quiz-foot`** (`/fr/quiz-foot`) | **"quiz foot" G10 and "quiz football" G10 lead every list** (difficile, avec réponse, joueur, gratuit, enfant, 2026, culture générale) in FR and all 6 regions · "quizz foot" G10 · "quiz de foot" G10 · "culture foot quiz" G10, "quiz culture foot" and "test culture foot" G10 · "quiz foot en ligne" G10 (multijoueur) · YT Suggest "quiz football", "quiz foot zack nani" · YT: "quiz" 233 native titles. **`quiz-foot` not `quiz-de-foot`: French drops the preposition**, unlike es and pt · **Note FFF school and youth tails:** "quiz culture foot u13", "quizz culture foot u11", "quiz foot enfant 10 ans", "quiz foot avec réponse pdf" (§7) | **High** |
| Campaign pattern | **`quiz-<club>`**, the French prefix order | "quiz psg" G10, "quiz real madrid" G10, "quiz liverpool" G10, "quiz arsenal" G10, "quiz chelsea" G10, "quiz premier league" G10, "quiz ligue 1" G10, "quiz ligue des champions" G10 · **Bare city names are bars:** "quiz lyon", "quiz nice", "quiz nantes", "quiz lille", "quiz marseille", "quiz rennes", "quiz strasbourg" all return **Quiz Room venues** ("quiz room" G10) or local bars. "quiz leeds", "quiz newcastle", "quiz brighton" return English pub quizzes. So use full names (`quiz-leeds-united`, `quiz-newcastle-united`) and write "foot" in every H1 · **"quiz om" G10 collides with omegaverse tests and "quiz om sverige"; "quiz ol" with Olivia Rodrigo**, so French clubs need full names (list below) | Med-High |
| National teams | **`quiz-argentine-foot`, `quiz-espagne-foot`**; later `quiz-equipe-de-france` | "quiz espagne" G10 = geography (region, carte) and "quiz argentine" G5 is mostly English, so the country alone fails · "quiz espagne foot" G7, "quiz argentine foot" G3 · "quiz équipe d'espagne" and "quiz équipe d'argentine" G1 padded · **"quiz équipe de france" G10 (2026, 1998, 2018, sporcle, jetpunk; also rugby)** · "quiz les bleus" 0, "quiz bleus" 0: fans do not type "les Bleus" here · Also "quiz maroc foot" G10, "quiz sénégal foot" G4, "quiz côte d'ivoire foot" G3, "quiz belgique foot" G3, "quiz suisse foot" G5, "quiz algérie foot" G4 (pattern `quiz-<pays>-foot`). "quiz lions de l'atlas" 0, "quiz diables rouges" G1 | Med |
| Leagues and competitions | `quiz-premier-league`, `quiz-la-liga`; later `quiz-ligue-1`, `quiz-ligue-des-champions`, `quiz-coupe-du-monde`, `quiz-ballon-d-or` | "quiz la liga" G10 but **"quiz liga" = "test ligament"** → keep "la" · "quiz ligue des champions" G10 vs "quiz champions league" G10 (**"league of legends"**, English) → French name · "quiz coupe du monde" G10 (2026, 1998, 2018, **winamax**), "quiz cdm" G10 · **"quiz mondial" = "quiz mondialisation"** → not "mondial" · "quiz ballon d'or" G10 (top 3, top 10, jetpunk) | Med-High |
| "Guess the player" (`guess-the-player`) | **`devine-le-joueur`** (`/fr/quiz-foot/devine-le-joueur`), H1 "Devine le joueur : quel footballeur se cache derrière ?" | **"devine le joueur" G10 in FR and all 6 regions**, with "de foot", "avec les clubs", "avec son parcours", "carrière", "photo", "transfert" · "devine le joueur de foot" G9 · "trouve le joueur" G8, "trouver le joueur de foot" G10 · "qui est ce joueur" G10 · "devine le footballeur" G4 (weaker than "joueur") · **"devinez" returns "devine" lists** · YT: Hero Quiz Football, JuniorTV Life "DEVINE LE FOOTBALLEUR" 1.2M · **"devine le joueur pro" in YT Suggest is a different format** (spot the pro among amateurs: Le Z "TROUVE QUI EST LE JOUEUR PRO !" 426k) | **High** |
| Club badges (`club-badges`) | **`quiz-logo-foot`**, H1 "Quiz logo foot : devine le club" | **"quiz logo foot" G10 (difficile, facile, ligue 1, france, jetpunk)** · **Google rewrites "quiz écusson foot" and "quiz blason foot" to "quiz logo foot"**: logo is the word, not écusson · "quiz logo club de foot" G10 · "devine le club" G8, "devine le logo" G10 · YT: Hero Quiz Football "Devine le vrai LOGO" 1.8M, "Devine le CLUB de FOOTBALL en 3 SECONDES" 1.2M | **High** |
| Career path (`career-path`) | Reuse **`devine-le-joueur-avec-les-clubs`** | Same reuse as pt and de: that game has no page of its own and links here | Med-High |

**French clubs, for later pages** (not in the 29 published): `quiz-psg` (G10), `quiz-olympique-de-marseille` (G3; "quiz om" collides, and fans will still reach it through the title "Quiz OM"), `quiz-olympique-lyonnais` (G6), `quiz-rc-lens` (G4), `quiz-losc` (G6), `quiz-as-monaco` (G4), `quiz-asse` (G10: "quiz asse fr question pour un chaudron" is a fan quiz), `quiz-fc-nantes` (G3), `quiz-stade-rennais` (G6), `quiz-girondins-de-bordeaux` (G3), `quiz-ogc-nice` (G6). Belgium: `quiz-anderlecht` (G6), `quiz-standard-de-liege`. Switzerland: `quiz-servette-fc`. Morocco: `quiz-wydad-casablanca`, `quiz-botola` (G6). Barça: **`quiz-fc-barcelone`** (G8), since "quiz barca" G10 is mostly English match tails and "quiz barcelone" G10 includes F1 tests.

**All 29 published campaign slugs are in §9.** The backend's Search Console mapping (`campaign-quiz-search-console.service.ts`) mirrors this table and needs the same entries.

## 5. `tutoiement` vs `vous`: use **tu**

The assumption holds. French football games and quiz content speak to the player as "tu"; "vous" appears mainly on institutional and news-style surfaces.

| Surface | Form | Evidence (`tuvous.txt`, read 2026-11-06 unless marked) |
|---|---|---|
| Poki `/fr/foot` | tu | "où tu marques des buts", "Incarne…", "Vise bien"; no "vous" |
| CrazyGames `/fr/t/football` | tu | title "Joue sur CrazyGames", 29 tu / 0 vous |
| RenderFoot `/fr` | tu | search snippets only: "Devine le footballeur du jour", "Trouve le joueur mystère" |
| Football Quiz - Qui est ce ? (App Store FR) | tu | "Tu es un vrai fan de Foot", "Trouveras tu tous les joueurs" |
| Quiz Foot : Devine le Joueur (App Store listing) | tu | "Défie tes amis" |
| Tout Pile Foot (App Store FR) | **mixed** | "Défie tes potes", but also "Montrez à vos potes": mainly tu |
| Devinez le joueur de football (App Store, 2016) | vous | title; an old app |
| Quizypedia | vous | "Jouez en un contre un", "Serez-vous le champion du jour" (general culture, older audience) |
| JeuxGratuits.net, L'Étudiant, Made in Foot | vous | a general portal, an education magazine, a news app, not football games |
| L'Équipe Jeux | **unverified** | viralmag's launch article says "Testez vos connaissances", but that is the article's voice; lequipe.fr was blocked |
| YouTube, native French titles | tu | imperatives in tu (devine, trouve, cite, teste, choisis, compose) 207 titles, 92.6M views; in vous (devinez, trouvez, citez, testez, choisissez, composez) 30 titles, 5.9M. "devine" 144 vs "devinez" 23; "trouve" 53 vs "trouvez" 2. The "vous" titles are mostly multi-language quiz channels (Total Football Quiz, The Best Football Quiz). Pronouns are closer (tu/ton/tes 43 titles, 29.8M; vous/votre/vos 45 titles, 9.8M), because they also catch news and how-to videos |
| Suggest | tu | "quel joueur es-tu" G10 vs "quel joueur êtes-vous" G8 (includes a book) · "quiz quel footballeur es tu" · "es-tu un footix" · "teste ta culture foot" G2 = "testez votre culture foot" G2. "testez vos connaissances" G10 is the driving-test site (SAAQ). Mixed, with no case for vous |

Also: "t'es un footix" and "footix" (a mild insult for a bandwagon fan: "footix insulte", "test footix" G4) is a ready-made voice for a playful quiz page, but only with "tu". Use it in copy, not as a game name. The `pt` precedent (você) does not apply: French informal is "tu".

## 6. Naming traps

**quiz vs quizz: use "quiz".** Both are searched, and the heads tie ("quiz foot" G10, "quizz foot" G10), so Suggest does not show that "quizz" lacks demand. Three measurements favour "quiz":
- **Tails are thinner:** across 37 paired queries, quiz returned 336 completions against 254 for quizz ("quiz foot gratuit" G8 vs "quizz foot gratuit" G3; "quiz foot 1v1" G9 vs "quizz foot 1v1" G2).
- **Google corrects it:** "quizz" queries often return "quiz" (of 254 completions, 102 are spelled "quiz"). "quizz ballon d'or", "quizz logo foot" and "quizz top 10" are almost all rewritten. YT Suggest gives the same list for "quizz foot" as for "quiz foot".
- **Creators use "quiz":** 236 native French titles (68.0M views) contain "quiz", 8 contain "quizz" (121k). "quizz" survives largely as the brand **Quizz.biz** ("jeux de foot quizz biz", "qui suis je quizz biz").

So: "quiz" in every slug and H1, and "quizz" nowhere that needs to look correct. Since Google links them, there is no need to chase it; one mention in a hub FAQ is the most it needs.

**foot vs football: "foot" in slugs and H1, "football" once in the title or meta.** Google expands "foot" into "football" in most lists, so they behave as one family. Across 70 paired queries, "foot" had more completions in 22, "football" in 8, and 40 tied (533 vs 484). "morpion foot" G10 vs "morpion football" G5, "roue foot" G10 vs G6, "wordle foot" G10 vs G5. French fans type the short word; RenderFoot uses it in most names. Honest limits:
- YouTube titles lean the other way: "quiz football" 72 native titles (10.7M) vs "quiz foot" 42 (1.4M); "football" alone 205 vs "foot" alone 210, which is a tie but half the search phrases contained "foot". Creators write "Quiz Football" as a formula, so the title should contain both words.
- "football" pulls in **"football américain"** (25 completions), but so does "foot" because Google expands it (17 of the 25). It is not a clean argument either way.
- "foot" has English noise of its own: "footage", "foot locker", "foot = 30.48 cm". Shows up in lists, harmless on a French page.
- Quebec says "soccer": "jeux de soccer" G10 and "quiz soccer" G10 (with "quiz soccer français") exist, but "morpion soccer" is echo only. Put "soccer" once in the hub meta; no separate slugs.

**Ligue 1.** Write "Ligue 1". Do not write the sponsor form: "quiz ligue 1 mcdonald's" and "quiz ligue 1 uber eats" both appear in tails, which shows how sponsor names date (McDonald's replaced Uber Eats in 2024, for three seasons per sportcal). "Ligue 1+" is the league's streaming service ("ligue 1+ abonnement" G10), so avoid the plus sign. "L1" is ambiguous (l11, l17). `quiz-ligue-1` keeps the digit.

**Coupe du monde.** Write it in full, lowercase m and d, in slugs and H1. "Mondial" collides with "mondialisation" ("quiz mondial" G10), "CDM" is fan shorthand fine in body copy only ("quiz cdm" G10). **"quiz coupe du monde winamax"** in the tails means a licensed betting operator already runs a quiz on this term, so expect a gambling neighbour in results. Keep "FIFA" out of the name (trademark), and write "de foot" where rugby might intrude ("coupe du monde rugby 2027" G10).

**Ballon d'Or.** Spelled "Ballon d'Or" with both capitals (France Football's title and trademark; background knowledge, not checked on a register). Generic editorial use is common, and "quiz ballon d'or" G10 is real, but do not put a logo on it or imply a link. Slug **`quiz-ballon-d-or`**: rmcsport and francefootball both use `ballon-d-or`. **Note the prefix trap:** "ballon d'or jeu" returns "ballon d'or jeune" (the youth award).

**Codenames.** Owner decision. Czech Games Edition's trademark, sold in France by Iello as Codenames (retail listings; some catalogues write "Code Names"). "Nom de Code" is what the French rules call the cards, not the box name, per Ludovox's rules PDF. Demand sits on the English word: "codenames" G10 against "jeu nom de code" G5. es, tr, pt and de all use the brand word (ru: "Кодовые имена"), and the de and pt docs left the trademark as an open owner decision too. **Fallback:** "Noms de code foot", `noms-de-code-foot` ("nom de code foot" padded, so no demand). Another trap: **"code name football" is a separate mobile game** ("code name football apk" G8+), and Google rewrites "codenames foot" toward it.

**Other trademarks and brands, keep out of titles and H1:** FIFA, EA FC, FUT (card, auction and spin pages are the risky ones) · **Money Drop** (M6 relaunch with Olivier Minne per ozap's headline of 2026-06-29; Suggest confirms "money drop m6", "casting 2026"; original TF1 2011, Endemol) · **Le Juste Prix** (M6) · **La Roue de la Fortune** (TV format) · **Le plus proche gagne** (boxed quiz game) · **Top Ten** (party game; "Top 10" with digits as a generic phrase is fine) · **Tenable** (ITV format; in French search the security company and an adjective) · **Timeline** (Asmodee), **Hitster** · **Undercover** (party-game app) · **Duel Quiz** (app) · **Quiz Room** (bar chain) · **Mon Petit Gazon / MPG** (fantasy) · **Sutom, Tusmo, Wordle** (body only) · **Who Are Ya, Tiki-Taka-Toe** (competitors; meta at most) · **Transfermarkt** (data source in copy, not a title) · **Football 501®** (check before use) · **Connections** (NYT; precedent tr and de) · **Tout Pile** (app) · **Question pour un champion** (TV; "qui suis je question pour un champion").

**Gambling words.** France regulates online betting through the ANJ (background; not re-verified), and search is full of it. Seen in Suggest: **"plus ou moins 2.5 buts", "parions sport", "pronostic foot" G10, "pari foot" G10, "cote foot" G10, "grille foot" (Loto Foot 15, winamax, fdj), "roue loto foot", "cagnotte foot" ("loto foot cagnotte"), "mise foot" ("mise loto foot"), "jeu d'argent foot" ("penalty"), "jeu penalty argent", "penalty casino" G10, "mines casino" G10, "jeu mines argent telegram", "roulette foot casino", "casino foot" G10, "quitte ou double jeu" G10 ("jeu a gratter"), "marabout pronostic foot", "tirs vers le but 1xbet", "gagner de l'argent foot", "quiz pour gagner de l'argent" G10, "logic football prediction", "premier but minute".**

Rules: never use **mise / miser, pari / parier, cote, pronostic, grille, cagnotte, jackpot, gains, encaisser, quitte ou double, roulette, machine à sous, slot, Mines, penalty (as a game name), premier but, "gagner de l'argent"**; "roue" only as "roue du foot"; coins are "pièces" (in-game), never "argent" or "euros". Note "indices" is the clue word and is safe; there is no German-style "Tipp" double meaning, but do not use "tuyaux" or "pronos" for clues.

**Other word collisions:**
- **chaîne** = TV channel ("quelle chaîne foot ce soir"): no "Chaîne de joueurs".
- **but** = BUT store and the BUT university diploma ("quel but après un bac"): always next to a football word.
- **carte** = also a map ("devine la carte du monde") and Clash Royale.
- **connexion** = login page ("connexion footclub").
- **vrai ou faux** + foot = fake shirts ("footdealer vrai ou faux").
- **match amical** = real friendlies; **jeu** as a prefix pulls "jeudi" and "jeune".
- **marabout** in West Africa also touches religion and paid fortune-telling (background knowledge), a further reason to avoid it.

## 7. Competitors and product notes

**Competitors worth noting:**
- **RenderFoot `renderfoot.com/fr`**: the direct competitor, already in French on English slugs. Titles seen: "Jeux de football", "Morpion Football", "Morpion Foot en ligne", "Morpion Foot Quotidien par Championnat", "Ligue 1 Morpion Foot", "Premier League Morpion Foot", "Devine le Joueur (Who Are Ya?)", "Who Are Ya Course", "Wordle Foot", "Bingo Foot", "Grille Foot", "Quiz Foot Top 10". It uses "tu" and promises "gratuit, sans compte". Blocked for direct reading.
- **Futbol 11 / Football 11**: "football 11" G10 (grid, bingo, top 10, connections, legacy), "futbol 11" G10 (pyramid), "futbol 11 francais", "foot11 quiz". Its name appears inside French tails ("quiz football 11", "wordle football 11"). No French site confirmed.
- **Closed lists:** JetPunk ("jetpunk foot" G10; user quizzes "devine le joueur de foot 7") and Sporcle ("sporcle foot france"); Quizz.biz.
- **Grids:** Tiki-Taka-Toe / Play Football ("playfootball.games" G10), Box2Box ("box2box football grid"), footy tic tac toe.
- **L'Équipe Jeux** (per viralmag; lequipe.fr blocked): "Dix sur Dix" (daily 10 questions) and "Numéro 9" (daily 9-player grid); "grille foot l'équipe", "l'équipe quiz" in tails. **The one big French media brand in this space; check by hand.**
- **Apps:** Tout Pile Foot (French, party quiz), FC Quiz ("fc quiz trouver le joueur"), Duel Quiz, FootIQ, Coneko (French Connections).
- **Creators and unknowns:** Hero Quiz Football, Le Quiz du Foot (quiz video); Zone Foot, Panenka (Compose ton XI); AF5 (la roue décide); Panenka Games ("Morpion Foot : concept de @Panenkagames"), not found as a site. **"trouve le joueur yomax site" G2-4 suggests a YoMax game; not found.**
- **Portals:** Poki and CrazyGames own "jeux de foot" (arcade). **Winamax Sport** runs "le quiz du WFC" and a World Cup quiz.
- **I found no French football minesweeper, no football Codenames site, no auction game and no "joueur en commun" game.** Those slots look open, on a US search engine only.

**Product notes surfaced by the data:**
1. **Campaign pages miss French demand (owner choice 2).** The 29 published pages are mostly English clubs (Coventry, Hull, Ipswich…). French fans search "quiz psg", "quiz équipe de france", "quiz ligue 1", "quiz coupe du monde", "quiz ballon d'or", "quiz logo foot". The slug work is done above; the content is the cost. English-club pages can still ship: "quiz liverpool", "quiz arsenal" and "quiz chelsea" are G10, but with mostly English tails.
2. **"Qui est l'imposteur" is big in French:** Squeezie "QUI EST L'IMPOSTEUR ?" 23M, 19M, 19M; football versions by Passe D "QUI EST L'IMPOSTEUR VERSION FOOT" 57k, 33k; Suggest "imposteur foot" G10, "jeu de l'imposteur" G10 (en ligne), "undercover football" G10. If that mode is built, its French name is "Imposteur foot", never the `/imposter` daily ("Trouve l'intrus").
3. **Pair pages:** "Joueurs ayant joué au X et à Y": PSG/OM, Barça/Real, PSG/Arsenal, Lyon/Marseille, OM/Barça, Lille/Monaco, Lens/Auxerre; slug `joueurs-ayant-joue-au-psg-et-a-l-om`, H1 with the exact phrase. Clearest long-tail win, as in pt, de, ru.
4. **Printable and youth intent is large:** "quiz foot enfant 10 ans", "quiz foot avec réponse pdf", "quiz foot à imprimer", "quiz culture foot u13", and FFF district PDFs rank in the US SERP. A printable per quiz would capture it; note the FFF's education programme ("culture foot pef"). It would need real questions, so it must come from the database, not from code.
5. **"Petit bac foot"** (Suggest G7, "jetpunk petit bac foot", Jowan Tv) is a French format with no Quizball equivalent, like pt "Stop do futebol" and de "Stadt Land Fluss".
6. **"Compose ton XI"** (Zone Foot, Panenka, 120-180k each) and **"la roue décide"** (AF5, 400-600k) are the French creator formats nearest to Auction and Squad Spin, and possible creator targets. Bingo ("bingo foot" G10, "bingo football français") and blind test ("blind test foot" G9) are other searched French formats we do not have.
7. **"sans inscription"** appears across "en ligne gratuit" tails; say guest play in the meta.

## 8. France vs Belgium, Switzerland, Quebec, Morocco, Senegal, Côte d'Ivoire

72 heads × 6 regions = 432 calls, `hl=fr` with `gl=be,ch,ca,ma,sn,ci`. Lists match France on every head that matters ("quiz foot", "devine le joueur", "morpion foot", "joueur ayant joué", "codenames", "démineur foot"). **Read with the §1 caveat: `gl` from this IP may be doing very little.** Differences seen:
- **ca:** "quiz football americain", "top 10 football universitaire canadien", "higher or lower nhl", "quiz canadiens de montréal". "foot" is not the Quebec word (background knowledge); "jeux de soccer" and "quiz soccer" exist everywhere tested.
- **be:** "joueur ayant joué" pairs with no Belgian clubs; "joueurs ayant joué à anderlecht et" G6 in the France round; "quiz diables rouges" G1-3 thin; "quiz jupiler pro league" G3.
- **ch:** "quiz foot suisse" G5, "quiz servette fc", and "qui suis je dans le foot" variants. No Swiss football vocabulary appeared.
- **ma:** "quiz maroc foot" G10, "test football maroc 2026" (= real trials, "test de football au maroc": **"test" in French-speaking Africa often means a club trial**, so lead with "quiz", as pt did with "teste"), "codenames arabic", "quiz botola" G5-6.
- **sn / ci:** "jeux de football dream league", "2012 konami" (mobile games), "quiz foot avec réponse pdf", "quiz football avec réponse". "jeux pour gagner de l'argent en fcfa" appeared in the France round, so keep earn-money words out. "quiz lions de la teranga" 0, "quiz éléphants foot" padded.

One `fr` edition is enough. Add African, Belgian and Swiss clubs and national teams to the campaign list over time; do not fork the edition.

## 9. Final table (drop into code)

`folder` = `PUBLIC_GAMES_FOLDER.fr`. Route: `default` = `(hub)/(default-shell)/jeux-de-foot/[slug]`; `word` = its own static folder under `(hub)/(word-shell)/jeux-de-foot/<slug>`, and also listed in `word-landing-sources.css` (and in `word-game-critical-assets.ts` where the German page is).

| Game id (`modeId`) | Copy key (`LOCALIZED_SLUGS`) | French name | Slug | Folder | Route |
|---|---|---|---|---|---|
| `clues` | `who-am-i` | Qui suis-je ? | `qui-suis-je-foot` | `jeux-de-foot` | default |
| `moneyDrop` | `money-drop` | Répartis tes pièces | `repartis-tes-pieces` | `jeux-de-foot` | default |
| `trueFalse` | `true-or-false-football` | Vrai ou faux | `vrai-ou-faux-foot` | `jeux-de-foot` | default |
| `countdown` | `countdown` | Cite le plus de joueurs | `cite-le-plus-de-joueurs` | `jeux-de-foot` | default |
| `careerPath` | `career-path` | Parcours du joueur | `devine-le-joueur-avec-les-clubs` | `jeux-de-foot` | default |
| `highLow` | `higher-or-lower` | Higher or Lower | `higher-or-lower` | `jeux-de-foot` | default |
| `imposter` | `imposter` | Trouve l'intrus | `trouve-l-intrus-foot` | `jeux-de-foot` | default |
| `statSniper` | `stat-sniper` | Au plus proche | `au-plus-proche-foot` | `jeux-de-foot` | default |
| `passChain` | `pass-chain` | Relie les joueurs | `relie-les-joueurs` | `jeux-de-foot` | default |
| `missingXi` | `missing-xi` | Devine le 11 | `devine-le-11` | `jeux-de-foot` | default |
| `footballLogic` | `football-logic` | Rébus foot | `rebus-foot` | `jeux-de-foot` | default |
| `putInOrder` | `football-timeline` | Frise du foot | `frise-chronologique-foot` | `jeux-de-foot` | default |
| `cardDetective` | `card-detective` | Devine la carte | `devine-la-carte-foot` | `jeux-de-foot` | default |
| `ranked` | `ranked` | Duel classé | `quiz-foot-1v1` | `jeux-de-foot` | default |
| `auction` | `auction` | Enchères foot | `encheres-foot` | `jeux-de-foot` | default |
| `friendly` | `friendly` | Entre amis | `quiz-foot-entre-amis` | `jeux-de-foot` | default |
| `grid` | `football-tic-tac-toe` | Morpion foot | `morpion-foot` | `jeux-de-foot` | default |
| `freeKicks` | `free-kicks` | Coups francs | `jeu-de-coup-franc` | `jeux-de-foot` | default |
| `roadToGoal` | `road-to-goal` | Direction le but | `direction-le-but` | `jeux-de-foot` | default |
| `guessTheGoal` | `guess-the-goal` | Devine le but | `devine-le-but` | `jeux-de-foot` | default |
| `buscaminas` | `football-minesweeper` | Démineur foot | `demineur-foot` | `jeux-de-foot` | default |
| `pistas` | `football-clues` | Devine le joueur | `devine-le-joueur-avec-des-indices` | `jeux-de-foot` | default |
| `minuto` | `guess-the-goal-minute` | À quelle minute ? | `a-quelle-minute` | `jeux-de-foot` | default |
| `footballRace` | `football-horserace` | Course des nations | `course-des-nations` | `jeux-de-foot` | word |
| `codenames` | `football-codenames` | Codenames foot | `codenames-foot` | `jeux-de-foot` | word |
| `triviaMines` | `trivia-mines` | Terrain miné | `quiz-terrain-mine` | `jeux-de-foot` | default |
| `squadSpin` | `squad-spin` | La roue du foot | `roue-du-foot` | `jeux-de-foot` | default |
| `ultimo` | `last-answer-standing` | Cite-les tous ! | `cite-les-tous` | `jeux-de-foot` | default |
| `sharedPlayer` | `played-for-both-clubs` | Joueur en commun | `joueur-en-commun` | `jeux-de-foot` | word |
| `nameChain` | `football-name-chain` | La dernière lettre | `jeu-de-la-derniere-lettre` | `jeux-de-foot` | word |
| `tenable` | `football-tenable` | Devine le top 10 | `quiz-top-10-foot` | `jeux-de-foot` | default |
| `datoFalso` | `football-odd-one-out` | Trouve le faux | `trouve-le-faux` | `jeux-de-foot` | word |
| `conexiones` | `football-connections` | Connections foot | `connections-foot` | `jeux-de-foot` | word |
| `darts501` | `football-darts-501` | Fléchettes foot 501 | `flechettes-foot-501` | `jeux-de-foot` | word |

Games with `page: false` today: `who-am-i`, `career-path`, `friendly`, `football-timeline` (slug reserved; the first two link to the quiz hub).

**Paths**

| Constant | Value |
|---|---|
| `PUBLIC_GAMES_FOLDER.fr` | `jeux-de-foot` |
| `DAILY_COLLECTION_SLUG.fr` | `jeux-quotidiens` |
| `CAMPAIGN_HUB_FOLDER.fr` | `quiz-foot` |
| `CAMPAIGN_HREFLANG.fr` / `HTML_LANG.fr` | `fr` |
| `OG_LOCALE.fr` | `fr_FR` |
| `cta.fr` | `Jouer maintenant` |

**Campaign slugs** (`FRENCH_PUBLIC_SLUGS`)

| Source slug | French public slug | Source slug | French public slug |
|---|---|---|---|
| `career-path` | `devine-le-joueur-avec-les-clubs` | `hull-city` | `quiz-hull-city` |
| `guess-the-player` | `devine-le-joueur` | `ipswich-town` | `quiz-ipswich-town` |
| `club-badges` | `quiz-logo-foot` | `leeds-united` | `quiz-leeds-united` |
| `premier-league` | `quiz-premier-league` | `liverpool` | `quiz-liverpool` |
| `la-liga` | `quiz-la-liga` | `manchester-city` | `quiz-manchester-city` |
| `arsenal` | `quiz-arsenal` | `manchester-united` | `quiz-manchester-united` |
| `aston-villa` | `quiz-aston-villa` | `newcastle-united` | `quiz-newcastle-united` |
| `bournemouth` | `quiz-bournemouth` | `nottingham-forest` | `quiz-nottingham-forest` |
| `brentford` | `quiz-brentford` | `sunderland` | `quiz-sunderland` |
| `brighton` | `quiz-brighton` | `tottenham` | `quiz-tottenham` |
| `chelsea` | `quiz-chelsea` | `real-madrid` | `quiz-real-madrid` |
| `coventry-city` | `quiz-coventry-city` | `barcelona` | `quiz-fc-barcelone` |
| `crystal-palace` | `quiz-crystal-palace` | `argentina` | `quiz-argentine-foot` |
| `everton` | `quiz-everton` | `spain` | `quiz-espagne-foot` |
| `fulham` | `quiz-fulham` | | |

**Lobby labels without a page of their own** (not searched; for `fr.json`): Classic → "Classique" · Ranked Sim → "Simulation classée" · Ranked 2.0 (beta) → "Classé 2.0 (bêta)" · duel tabs: Minesweeper → "Démineur", Clues → "Indices", Last Answer Standing → "Cite-les tous !", What Minute? → "À quelle minute ?" · room tabs use the in-game names above. Brand words that stay: QuizBall, Party Quiz, Weekend League.

**How French sits with the other locales' names**

| Game | es | pt | de | tr | ru | **fr** |
|---|---|---|---|---|---|---|
| grid | Tic Tac Toe futbolero | Jogo da velha | Fußball Tic Tac Toe | Futbol XOX | Крестики-нолики | **Morpion foot** |
| minesweeper | Buscaminas futbolero | Campo minado | Fußball-Minesweeper | Futbol Mayın Tarlası | Футбольный сапёр | **Démineur foot** |
| imposter | Impostor | Encontre o intruso | Wer passt nicht? | Futbol Sahtekârı | Найди лишнего | **Trouve l'intrus** |
| played for both | Jugador en común | Jogador em comum | Spieler für beide Vereine | Ortak Futbolcu | Игравшие за оба клуба | **Joueur en commun** |
| name chain | Cadena de futbolistas | Jogo da última letra | Fußballer-Wortkette | Son Harfle Futbolcu | На последнюю букву | **La dernière lettre** |
| tenable | Adivina el Top 10 | Acerte o top 10 | Top 10 erraten | Futbol Top 10 | Угадай топ-10 | **Devine le top 10** |
| horserace | Carrera de caballos futbolera | Corrida das seleções | Nationen-Rennen | Futbol At Yarışı | Футбольные скачки | **Course des nations** |
| codenames | Codenames Futbolero | Codenames de futebol | Fußball-Codenames | Futbol Codenames | Кодовые имена | **Codenames foot** |
| connections | Conexiones futboleras | Conexões do futebol | Fußball Connections | Futbol Connections | Футбольные связи | **Connections foot** |
| darts | Dardos futboleros 501 | Dardos de futebol 501 | Fußball-Darts 501 | Futbol Dart Oyunu 501 | Футбольный дартс 501 | **Fléchettes foot 501** |
| squad spin | Ruleta futbolera | Roleta de futebol | Fußball-Glücksrad | Futbol Çarkı | Футбольная рулетка | **La roue du foot** |

French reads as a set through two patterns: **an imperative in the tu form** ("Devine…", "Trouve…", "Cite…", "Relie…", "Répartis…", matching es "Adivina", pt "Adivinhe", ru "Угадай") and **"[noun] foot"** ("Morpion foot", "Démineur foot", "Rébus foot", matching es "…futbolero", tr "Futbol …", de "Fußball-…"). **Do not carry over "Roulette" (es, pt, ru), a chain name such as "Chaîne" (es "Cadena"), "Course de chevaux" (es, tr, ru) or a literal "Faux fait" (es, ru).**

## 10. Machine-readable summary

```json
{
  "locale": "fr",
  "hreflang": "fr",
  "ogLocale": "fr_FR",
  "htmlLang": "fr",
  "intl": "fr-FR",
  "address": "tu",
  "slugRule": "é è ê ë→e, à â→a, î ï→i, ô→o, ù û ü→u, ç→c, œ→oe, apostrophe→hyphen, then lowercase ASCII, hyphens",
  "folder": {
    "slug": "jeux-de-foot",
    "h1": "Jeux de foot en ligne : quiz et défis de culture foot"
  },
  "daily": {
    "slug": "jeux-quotidiens",
    "h1": "Jeux quotidiens de foot"
  },
  "quizHub": {
    "slug": "quiz-foot",
    "h1": "Quiz foot : teste ta culture foot"
  },
  "quizHubPattern": {
    "club": "quiz-<club>",
    "nationalTeam": "quiz-<pays>-foot",
    "examples": [
      "quiz-arsenal",
      "quiz-fc-barcelone",
      "quiz-premier-league",
      "quiz-argentine-foot"
    ],
    "laterFrenchPages": [
      "quiz-psg",
      "quiz-olympique-de-marseille",
      "quiz-olympique-lyonnais",
      "quiz-equipe-de-france",
      "quiz-ligue-1",
      "quiz-ligue-des-champions",
      "quiz-coupe-du-monde",
      "quiz-ballon-d-or"
    ]
  },
  "campaignSlugs": {
    "career-path": "devine-le-joueur-avec-les-clubs",
    "guess-the-player": "devine-le-joueur",
    "club-badges": "quiz-logo-foot",
    "premier-league": "quiz-premier-league",
    "la-liga": "quiz-la-liga",
    "arsenal": "quiz-arsenal",
    "aston-villa": "quiz-aston-villa",
    "bournemouth": "quiz-bournemouth",
    "brentford": "quiz-brentford",
    "brighton": "quiz-brighton",
    "chelsea": "quiz-chelsea",
    "coventry-city": "quiz-coventry-city",
    "crystal-palace": "quiz-crystal-palace",
    "everton": "quiz-everton",
    "fulham": "quiz-fulham",
    "hull-city": "quiz-hull-city",
    "ipswich-town": "quiz-ipswich-town",
    "leeds-united": "quiz-leeds-united",
    "liverpool": "quiz-liverpool",
    "manchester-city": "quiz-manchester-city",
    "manchester-united": "quiz-manchester-united",
    "newcastle-united": "quiz-newcastle-united",
    "nottingham-forest": "quiz-nottingham-forest",
    "sunderland": "quiz-sunderland",
    "tottenham": "quiz-tottenham",
    "real-madrid": "quiz-real-madrid",
    "barcelona": "quiz-fc-barcelone",
    "argentina": "quiz-argentine-foot",
    "spain": "quiz-espagne-foot"
  },
  "pages": {
    "who-am-i": {
      "modeId": "clues",
      "name": "Qui suis-je ?",
      "slug": "qui-suis-je-foot",
      "route": "default",
      "h1": "Qui suis-je ? Devine le joueur de foot en 5 indices",
      "conf": "Med-High"
    },
    "money-drop": {
      "modeId": "moneyDrop",
      "name": "Répartis tes pièces",
      "slug": "repartis-tes-pieces",
      "route": "default",
      "h1": "Répartis tes pièces : le quiz foot",
      "conf": "Low"
    },
    "true-or-false-football": {
      "modeId": "trueFalse",
      "name": "Vrai ou faux",
      "slug": "vrai-ou-faux-foot",
      "route": "default",
      "h1": "Vrai ou faux foot : le quiz",
      "conf": "Med"
    },
    "countdown": {
      "modeId": "countdown",
      "name": "Cite le plus de joueurs",
      "slug": "cite-le-plus-de-joueurs",
      "route": "default",
      "h1": "Cite le plus de joueurs possible avant la fin du chrono",
      "conf": "Low-Med"
    },
    "career-path": {
      "modeId": "careerPath",
      "name": "Parcours du joueur",
      "slug": "devine-le-joueur-avec-les-clubs",
      "route": "default",
      "h1": "Devine le joueur avec les clubs : retrouve-le grâce à son parcours",
      "conf": "Med-High"
    },
    "higher-or-lower": {
      "modeId": "highLow",
      "name": "Higher or Lower",
      "slug": "higher-or-lower",
      "route": "default",
      "h1": "Higher or Lower foot : qui vaut le plus cher ?",
      "conf": "Med"
    },
    "imposter": {
      "modeId": "imposter",
      "name": "Trouve l'intrus",
      "slug": "trouve-l-intrus-foot",
      "route": "default",
      "h1": "Trouve l'intrus : le quiz foot",
      "conf": "High"
    },
    "stat-sniper": {
      "modeId": "statSniper",
      "name": "Au plus proche",
      "slug": "au-plus-proche-foot",
      "route": "default",
      "h1": "Au plus proche : devine les chiffres du foot",
      "conf": "Med-Low"
    },
    "pass-chain": {
      "modeId": "passChain",
      "name": "Relie les joueurs",
      "slug": "relie-les-joueurs",
      "route": "default",
      "h1": "Relie les joueurs : de coéquipier en coéquipier",
      "conf": "Low"
    },
    "missing-xi": {
      "modeId": "missingXi",
      "name": "Devine le 11",
      "slug": "devine-le-11",
      "route": "default",
      "h1": "Devine le 11 : retrouve les compos de légende",
      "conf": "Med"
    },
    "football-logic": {
      "modeId": "footballLogic",
      "name": "Rébus foot",
      "slug": "rebus-foot",
      "route": "default",
      "h1": "Rébus foot : 2 images, 1 joueur",
      "conf": "Med"
    },
    "football-timeline": {
      "modeId": "putInOrder",
      "name": "Frise du foot",
      "slug": "frise-chronologique-foot",
      "route": "default",
      "h1": "Frise chronologique du foot : remets les événements dans l'ordre",
      "conf": "Low"
    },
    "card-detective": {
      "modeId": "cardDetective",
      "name": "Devine la carte",
      "slug": "devine-la-carte-foot",
      "route": "default",
      "h1": "Devine la carte : quel joueur se cache derrière ?",
      "conf": "Med-Low"
    },
    "ranked": {
      "modeId": "ranked",
      "name": "Duel classé",
      "slug": "quiz-foot-1v1",
      "route": "default",
      "h1": "Quiz foot 1v1 : le duel en ligne",
      "conf": "Med"
    },
    "auction": {
      "modeId": "auction",
      "name": "Enchères foot",
      "slug": "encheres-foot",
      "route": "default",
      "h1": "Enchères foot : recrute ton équipe de rêve",
      "conf": "Med"
    },
    "friendly": {
      "modeId": "friendly",
      "name": "Entre amis",
      "slug": "quiz-foot-entre-amis",
      "route": "default",
      "h1": "Quiz foot entre amis",
      "conf": "Med"
    },
    "football-tic-tac-toe": {
      "modeId": "grid",
      "name": "Morpion foot",
      "slug": "morpion-foot",
      "route": "default",
      "h1": "Morpion foot en ligne",
      "conf": "High"
    },
    "free-kicks": {
      "modeId": "freeKicks",
      "name": "Coups francs",
      "slug": "jeu-de-coup-franc",
      "route": "default",
      "h1": "Jeu de coup franc : réponds juste, puis tire",
      "conf": "Med"
    },
    "road-to-goal": {
      "modeId": "roadToGoal",
      "name": "Direction le but",
      "slug": "direction-le-but",
      "route": "default",
      "h1": "Direction le but : réponds et avance",
      "conf": "Low"
    },
    "guess-the-goal": {
      "modeId": "guessTheGoal",
      "name": "Devine le but",
      "slug": "devine-le-but",
      "route": "default",
      "h1": "Devine le but : reconnais le but de légende",
      "conf": "Low-Med"
    },
    "football-minesweeper": {
      "modeId": "buscaminas",
      "name": "Démineur foot",
      "slug": "demineur-foot",
      "route": "default",
      "h1": "Démineur foot",
      "conf": "Med-High"
    },
    "football-clues": {
      "modeId": "pistas",
      "name": "Devine le joueur",
      "slug": "devine-le-joueur-avec-des-indices",
      "route": "default",
      "h1": "Devine le joueur avec 10 indices",
      "conf": "Med-Low"
    },
    "guess-the-goal-minute": {
      "modeId": "minuto",
      "name": "À quelle minute ?",
      "slug": "a-quelle-minute",
      "route": "default",
      "h1": "À quelle minute ? Devine la minute du but",
      "conf": "Low"
    },
    "football-horserace": {
      "modeId": "footballRace",
      "name": "Course des nations",
      "slug": "course-des-nations",
      "route": "word",
      "h1": "Course des nations : choisis la stat, fais avancer ton drapeau",
      "conf": "Low"
    },
    "football-codenames": {
      "modeId": "codenames",
      "name": "Codenames foot",
      "slug": "codenames-foot",
      "route": "word",
      "h1": "Codenames foot : cartes images, un indice, deux équipes",
      "conf": "Med"
    },
    "trivia-mines": {
      "modeId": "triviaMines",
      "name": "Terrain miné",
      "slug": "quiz-terrain-mine",
      "route": "default",
      "h1": "Terrain miné : le quiz foot aux défenseurs cachés",
      "conf": "Low"
    },
    "squad-spin": {
      "modeId": "squadSpin",
      "name": "La roue du foot",
      "slug": "roue-du-foot",
      "route": "default",
      "h1": "La roue du foot : tourne et cite le bon joueur",
      "conf": "Med-High"
    },
    "last-answer-standing": {
      "modeId": "ultimo",
      "name": "Cite-les tous !",
      "slug": "cite-les-tous",
      "route": "default",
      "h1": "Cite-les tous ! Les listes du foot contre la montre",
      "conf": "Low-Med"
    },
    "played-for-both-clubs": {
      "modeId": "sharedPlayer",
      "name": "Joueur en commun",
      "slug": "joueur-en-commun",
      "route": "word",
      "h1": "Joueur en commun : qui a joué dans les deux clubs ?",
      "conf": "High"
    },
    "football-name-chain": {
      "modeId": "nameChain",
      "name": "La dernière lettre",
      "slug": "jeu-de-la-derniere-lettre",
      "route": "word",
      "h1": "Le jeu de la dernière lettre : enchaîne les joueurs de foot",
      "conf": "Low-Med"
    },
    "football-tenable": {
      "modeId": "tenable",
      "name": "Devine le top 10",
      "slug": "quiz-top-10-foot",
      "route": "default",
      "h1": "Quiz top 10 foot : devine le classement caché",
      "conf": "Med"
    },
    "football-odd-one-out": {
      "modeId": "datoFalso",
      "name": "Trouve le faux",
      "slug": "trouve-le-faux",
      "route": "word",
      "h1": "Trouve le faux : quelle info foot est fausse ?",
      "conf": "Low-Med"
    },
    "football-connections": {
      "modeId": "conexiones",
      "name": "Connections foot",
      "slug": "connections-foot",
      "route": "word",
      "h1": "Connections foot : trouve les 4 groupes de joueurs",
      "conf": "Med"
    },
    "football-darts-501": {
      "modeId": "darts501",
      "name": "Fléchettes foot 501",
      "slug": "flechettes-foot-501",
      "route": "word",
      "h1": "Fléchettes foot 501",
      "conf": "Med-Low"
    }
  },
  "notes": {
    "stat-sniper": "en slug closest-wins; LOCALIZED_SLUGS key is stat-sniper",
    "football-codenames": "trademark: owner decision; fallback name Noms de code foot, slug noms-de-code-foot",
    "money-drop": "Money Drop kept off the page: M6 relaunch; owner decision"
  }
}
```

## 11. By-hand checks (google.fr, incognito, ideally from a French IP/VPN; note ranks 1-5 and whether video, apps, RenderFoot, JetPunk or portals dominate)

`morpion foot` · `morpion foot en ligne` · `joueur ayant joué au psg et à l'om` · `joueurs passés par l'om et le psg` · `devine le joueur` · `devine le joueur avec les clubs` · `qui suis je foot` · `quiz foot` · `quizz foot` · `quiz logo foot` · `jeux de foot en ligne` (arcade share) · `jeu foot en ligne quiz` · `jeux quotidiens foot` · `démineur foot` · `trouve l'intrus foot` · `rébus foot` · `quiz foot 1v1` · `quiz foot entre amis` · `enchères foot` · `roue foot` (casino and Loto Foot share) · `grille foot` (Loto Foot share) · `quiz top 10 foot` and `jeu top 10 foot` (identify the card game) · `codenames foot` · `connections foot` · `fléchettes 501` · `imposteur foot` (party-game share) · `quiz coupe du monde` (Winamax share). Also open **lequipe.fr/jeux, renderfoot.com/fr/games and sofoot.com** in a real browser: they blocked automated reading, and L'Équipe's tu/vous and game names are unverified. Spot-check google.be, google.ch, google.ca, google.co.ma and google.sn for `quiz foot` and `devine le joueur`, because `gl` from this IP proves little. After launch: GSC for `/fr/` filtered by country. Google Ads Keyword Planner (France) would give real monthly volumes; it is the one tool that would raise the Low/Med rows and settle `quiz` vs `quizz`.
