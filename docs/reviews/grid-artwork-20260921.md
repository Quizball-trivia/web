# Tic Tac Toe artwork review — 21 September 2026

Local working changes only. No pull request, push, database edit, storage upload or deployment.

## Clues

Checked all 617 unique clue definitions from content releases 2026092101 and 2026092102: 334 club clues, 154 teammate clues, 50 country clues, 43 manager clues, 10 leagues, 12 trophies/awards and 14 illustrated special rules.

The final image audit fetched and decoded every selected image, or verified its bundled file. All 603 image-based clues resolve; the 14 special rules intentionally use the custom inline illustrations. This is a check of these release snapshots, not a guarantee for future content or third-party service availability.

- Added artwork for 115 previously unresolved club clues.
- Removed ambiguous club-name suffix matching, which conflated Nacional and Atlético Nacional. Added exact reviewed mappings and a regression test.
- Bundled 117 reviewed club mappings, including the two separate Nacional identities. Sources and image hashes accompany the images in `public/assets/football-grid/reviewed-clubs/sources.json`.
- Prefer already-bundled manager photographs and country flags; reuse Toulouse's existing packaged crest.
- Browser-verified both Nacional crests and Gasperini's photograph in the real gallery, in both header orientations.

## Answer players

Inspected the 5,134 player records across the two release snapshots for shared placeholder assets. Found 297 using repeated silhouettes or the shared unknown image. This does not establish that every other photo depicts the correct person; it identifies the known placeholder problem.

Recovered and locally bundled 203 individual player photographs. Photos are linked by player UUID and recorded source identity, never selected by an ambiguous display name. Provenance and hashes are in `public/assets/football-grid/reviewed-players/sources.json`. Claimed cells, answer reveals and teammate clues share the portrait resolver. Failed-image state resets when a component displays another player.

**94 records remain unresolved.** See `grid-player-image-gaps-20260921.json`. Five alternate provider pages offered no photograph; 89 returned HTTP 403. Source-only silhouettes, a stamp, an unclear group picture and other unsuitable pictures were not counted as completed portraits. The same 98 initially outstanding UUIDs were also checked in the production public roster-image path; none had an image there. Four were subsequently recovered from verified provider identities. No players or valid answers were removed because a photo was unavailable.

An existing content identity discrepancy also needs review: player UUID `000de446-3e87-4445-a629-0fdbad8b242c` is named `Alison` with provider ID `1364574`, but its Georgian name says `ალისონ ბეკერი`. The artwork follows the recorded provider identity; this local artwork change does not rewrite player names or memberships.

## Validation

- Full selected-image audit: 617 clues, zero missing or generic placeholder results among image-based clues.
- 31 focused tests passed, covering asset resolution, exact club identity, portrait failure/recovery, file coverage, clue presentation and board HUD.
- TypeScript checks passed.
- Final targeted lint and whitespace checks passed.

Local preview: http://localhost:55522/dev/tic-tac-toe/clues
