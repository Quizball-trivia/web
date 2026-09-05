# Expanded collection

See [the current collection guide](../store-collection/README.md) for the 58 additional items and new equipment slots.

# Local store and avatar examples

Worktree branch: `codex/store-avatar-examples`.

Run `npm run dev -- --webpack --port 3198`, then open `http://localhost:3198/dev/store-examples`.

This development-only page reuses StoreScreen, ItemCard, PurchaseConfirmModal, AvatarPicker, AvatarPreview and AvatarDisplay. It starts with 2,000,000 test coins. Purchases, ownership and the equipped outfit persist in this browser under `quizball:store-examples:v1`. Reset test restores the starting balance and default outfit. No login is required.

The new items are Celtic (30,000), Short Twists (20,000), and Blue Sport glasses (15,000). They appear first in their respective categories. The regular avatar editor supports skin changes, removing parts, replacing parts and buying items with the local test balance. Closing the editor discards an unsaved draft; Save commits it.

The local adapter disables store API reads and intercepts purchases/equips before the live API. New parts are development-only and filtered out of the ordinary store and profile editor. This branch does not add backend catalog entries or enable purchases/saves for these new IDs on live accounts. Production integration requires backend ID validation, catalog/inventory entries, pricing and an API schema sync.

Generated concepts and original prompts are in `source/` and `generation-prompts.md`. The built-in image generator was also asked to remove the backgrounds; it returned opaque images again. `scripts/store-examples/prepare-assets.cjs` prepares transparent, cropped WebP overlays from the original concepts, protecting the ivory jersey panels. The jersey is normalized to the existing jersey proportions. Final assets are in `public/assets/store/` and positioning is in `src/lib/avatars/parts.ts`.

Verification:
- 16 tests passed across local purchase/persistence validation and the existing purchase modal tests.
- Targeted ESLint and git diff whitespace checks passed.
- Browser verified all three purchases, combined outfit rendering, ownership and persistence after reload. Store requests are disabled in local mode; no broken loaded images.
- Full repository typecheck reports an existing unrelated Spanish locale mismatch in `src/features/welcome/useWelcomeAuthController.ts:334`. No type errors in the changed files.
