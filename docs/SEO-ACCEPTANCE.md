# Public SEO acceptance crawl

Run the focused discovery check against the deployed staging app before promotion:

```sh
node scripts/seo-check.mjs https://staging.quizball.io --canonical-origin=https://staging.quizball.io --discovery-only
```

Repeat against production after an approved release:

```sh
node scripts/seo-check.mjs https://quizball.io --discovery-only
```

Omit `--discovery-only` for the full public catalogue, existing redirect/404 regressions, app-route noindex checks, and all hub game/campaign links. Local usage remains supported, e.g. `node scripts/seo-check.mjs http://localhost:3000`. The full crawl also tests country-specific root redirects; deployment proxies must forward the test country header for those two checks to be meaningful.

The focused check requires 24 clean URLs: Career Path, Minuto (guess-the-goal-minute), and Football Tenable in en, ka, es, tr, ru, pt, de, and fr. URL folders use `pt`; hreflang uses `pt-BR`. Fixtures in `scripts/lib/seo-acceptance.mjs` are checked against the application's route manifests by `src/lib/seo/__tests__/seo-acceptance.test.tsx`. Do not rename released URLs to make a crawler pass.

Every required page must return 200, contain exactly one H1 and one exact expected canonical, belong to the sitemap, and declare the same reciprocal eight-language cluster plus English x-default. Tracking queries must retain the clean canonical and cluster. The eight locale hubs must render the guest app shell and link to all three localized game pages; those links must resolve. Focus mode also verifies the old Spanish Minuto slug and the old Turkish Minuto/Tenable folder aliases still return 308 and preserve tracking queries. Unit tests also cover every source/target language-link combination and query preservation.

Staging, localhost, and `*.vercel.app` previews must carry noindex. Production and unknown hosts must be indexable. Canonicals, sitemap URLs, and hreflang destinations must exactly match the expected origin, which defaults to `https://quizball.io`. Current staging is configured to use `https://staging.quizball.io`, so its command explicitly selects that origin. Use the default for previews configured with production canonicals. The override must be an HTTP(S) origin without credentials, path, query, or fragment; production `quizball.io` cannot select a different canonical origin. Alternate members are always fetched from the selected crawl origin. There is intentionally no flag that suppresses unexpected production noindex. Keep each environment’s configuration distinct; do not change deployed URLs to satisfy an incorrectly configured crawl.

Other campaign quizzes are CMS-driven: the full crawl checks the editions actually listed in the sitemap and validates their declared reciprocity. It does not assume every campaign has eight published translations. Career Path is an explicit all-eight release acceptance requirement.

Focused regression tests:

```sh
npm test -- src/lib/seo/__tests__/seo-acceptance.test.tsx
```

This is HTTP/SSR SEO coverage, not a substitute for interactive gameplay or authenticated staging QA.
