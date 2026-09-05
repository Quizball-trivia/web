# Expanded local avatar wardrobe

Open http://localhost:3198/dev/store-examples in development. The original three examples remain; this collection adds **58 generated pieces**:

- 22 jerseys: 10 clubs, 8 countries, 4 special designs.
- 16 hairstyles: 8 iconic player looks and 8 general styles.
- 6 headwear items, including Čech's padded headguard.
- 4 glasses, 4 facial hair styles, and 6 accessories.
- Six hair colour settings: natural, platinum blonde, ginger, silver, blue tips and pink streaks.

Use the category buttons and search to browse. Search ignores accents (for example `cech` finds `Čech`). Reset test gives 2,000,000 local test coins. Existing browser saves are retained until reset. Use Edit avatar to mix slots, change skin/colour, remove pieces and save the complete look. Headgear covers hair without discarding the selected style; removing it restores that hair. Headphones are layered behind the face so the earcups do not obscure facial features.

## Local scope

This remains a development-only experiment in branch `codex/store-avatar-examples`. No backend products, inventory records or live account changes are created. The normal store and avatar editor exclude the local-only parts. The new fields and IDs need backend catalog/schema work before any production release.

## Assets and implementation

The built-in image generation tool created one raster asset per item using the original Quizball artwork as style references. Each source PNG and its exact prompt are saved in `source/`. `manifest.json` records the generation brief; `src/lib/avatars/collection.ts` contains the final tuned equipment positions.

`node scripts/store-examples/prepare-collection.cjs` imports the reserved magenta background as transparency, crops the artwork and exports WebP into `public/assets/store/collection/`. Jerseys use the existing canonical dimensions. `contact-sheet.cjs` produces a visual catalog. `/dev/store-examples/fit` is a development-only fit gallery, filterable with `?slot=hair`, `?slot=jersey` or `?slot=extras`.

All avatar surfaces now reuse AvatarLayers and resolveAvatarCustomization, so the new slots, hair colours and helmet compatibility behave consistently. Additional slots: headwear, earwear, armwear, wristwear and facePaint. These fields survive the existing qb-avatar encoding used by the editor and local browser storage.

## Verification

- 58/58 generated sources imported; every final image has alpha transparency.
- All jersey artwork inspected; player hairstyles, headwear, glasses, facial hair and accessories checked on the actual avatar in the fit gallery.
- 16 tests pass, covering purchases, duplicate purchase prevention, insufficient balance, persisted outfits, invalid IDs/slots, headgear compatibility, hair colour rendering and explicit removal.
- Targeted ESLint and whitespace checks pass.
- The full project typecheck still reports the pre-existing Spanish locale mismatch in `src/features/welcome/useWelcomeAuthController.ts:334`; no new type errors were introduced.

## Manual fit adjustments

Open `/dev/jerseys` on the same origin as the store preview (port 3198). All new items are available across nine categories. Select an item, then use arrows, width controls or exact numeric fields. Adjustments save automatically to this browser's `dev-part-tuner-overrides` storage and update real avatar previews, including purchase modals and other open tabs. Use “store card” for the separate mannequin geometry used by hair, glasses and facial hair. The other categories use the real avatar renderer, including headgear visibility and headphones front/back layers.

Use “reset” to undo the selected item's current view adjustment. “Copy overrides” exports both geometry sets for incorporation into the asset registry; browser adjustments do not modify source files and are ignored in production. “New collection only” includes the 58-item collection and the original three examples.

Light Stubble (`facial_stubble`) and Boxed Beard (`facial_boxed`) were removed from the active collection at user request. Their source artwork remains archived; they are unavailable in the store, avatar picker and tuner.

Headphones (`earwear_headphones`) were also removed from the active collection at user request; source artwork remains archived.

Captain’s Armband, Wristbands and Face Paint were removed from the active collection at user request. Empty equipment categories are hidden in the tuner and avatar picker.

Clear Glasses, Square Sunglasses, Heart Shades and Future Visor were removed from the active collection at user request. Blue Sport remains available.

Backwards Cap, Bucket Hat and Beanie were removed from the active collection at user request.

Sweatband and Bandana were removed from the active collection for now at user request.
