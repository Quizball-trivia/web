# Football Grid launch asset pack

This directory is the canonical, versioned inventory for the Football Grid
launch universe. The game must never render an unresolved or blank criterion.

An entry is launch-safe only when it has:

- a stable canonical ID;
- English and Georgian labels;
- a primary visual and a deterministic Quizball fallback;
- source/provider and rights-review metadata for third-party visuals;
- generated coverage from `scripts/build-football-grid-assets.mjs` and a passing
  report from `scripts/validate-football-grid-assets.mjs`.
- a verified entry in `cdn-manifest.json`, published under the immutable
  `imgs/football-grid/v1` first-party CDN prefix.

Asset families:

- `clubs.json`: all 276 clubs in the shared club registry;
- `countries.json`: the complete `flag-icons` 4x3 package, including football
  home-nation flags and other package-specific flags;
- `players-summary.json`: the release-time database coverage contract. Player
  rows remain canonical in `football_players` and are not duplicated here;
- `managers.json`: 60 launch managers and portrait provenance;
- `leagues.json`: 15 launch leagues;
- `competitions.json`: 24 launch trophies/competitions;
- `wildcards.json`: 12 launch wildcard criteria;
- `coverage.json`: generated gate totals. Every `runtimeUnresolved` value must
  be zero and every `rightsCleared` value must equal its family total before
  launch.
- `cdn-manifest.json`: checksums and public CDN URLs for every packaged Grid
  image, icon, flag, fallback, and the `/play` card icon.

Third-party marks and portraits still require the applicable provider/trademark
review. When approval is absent or an image fails, the renderer must use the
recorded Quizball fallback; it must never hotlink an unknown replacement.

Runtime delivery policy:

- `npm run grid-assets:publish` uploads every packaged Grid asset to the public
  `imgs/football-grid/v1` Supabase CDN prefix and verifies every object. A
  publish reuses byte-identical objects and refuses to overwrite a changed file
  inside an immutable release; bump the release prefix for changed artwork;
- backend `npm run grid:cdn:players` downloads and normalizes player portraits,
  uploads them to that same prefix, records the original URL in provenance
  metadata, and commits database URLs in guarded batches;
- the frontend rejects any Grid image URL outside the Quizball Supabase public
  `imgs` bucket or the configured first-party Grid CDN origin.
