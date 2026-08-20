# Football Grid launch asset pack

This directory is the canonical, versioned inventory for the Football Grid
launch universe. The game must never render an unresolved or blank criterion.

An entry is launch-safe only when it has:

- a stable canonical ID;
- English and Georgian labels;
- a primary visual and a deterministic Quizball fallback;
- source/provider and rights-review metadata for third-party visuals;
- a validation status produced by `scripts/build-football-grid-assets.mjs`.

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
- `coverage.json`: generated gate totals. Every `runtime_unresolved` value must
  be zero before launch.

Third-party marks and portraits still require the applicable provider/trademark
review. When approval is absent or an image fails, the renderer must use the
recorded Quizball fallback; it must never hotlink an unknown replacement.
