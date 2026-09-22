# Football Grid clue artwork

Clue headers share `CriterionAsset` in the match screen and the local clue gallery.
League logos use the existing bundled originals before remote storage. The optical
bounds in `src/data/football-grid/logo-viewboxes.json` describe the non-transparent
pixels of those originals; SVG viewports remove transparent padding without editing
the source images. The visible artwork has a 32–44px height, with the full header
width available to landscape logos. League originals have a white contrast backing.

All published trophy clues have original Quizball SVG illustrations in
`CriterionFallbackArt.tsx`. Their distinct trophy silhouettes replace the old
initials shields and do not depend on environment-specific competition buckets.
These are custom illustrations, not official competition logos. Existing custom
special-rule illustrations, real player portraits, flags and club crests remain.
Legacy generated initials shields are excluded from image fallback candidates.

The following existing crests were copied unchanged on 22 September 2026 because
the staging objects existed but the corresponding production objects returned 400:

| Bundled file under `public/assets/football-grid/clubs/` | Existing source object |
| --- | --- |
| `locomotive-tbilisi.png` | `imgs/club-logos/locomotive-tbilisi.png` |
| `saburtalo-tbilisi.png` | `imgs/club-logos/saburtalo-tbilisi.png` |
| `san-lorenzo.png` | `imgs/club-logos/san-lorenzo.png` |

Source storage origin: `https://nsdfiprfmhdqhbfxfwpv.supabase.co/storage/v1/object/public/`.
These are the already-selected club assets; this change does not introduce new
club identity matching or imply a new licensing review. The launch registry and
its recorded owner decision remain the provenance for using the original crests.

Validation: all Football Grid component tests, TypeScript and scoped lint; browser
checks of all 12 trophy forms and 10 league clues in EN/KA/ES/TR at the narrow
78px header width, plus normal/wide previews. Header explanations remain available
by tapping the clue. Content eligibility and answer lists are unchanged.
