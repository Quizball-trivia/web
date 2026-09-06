# Sound lab verification

2026-09-05 — active grid-parity-web checkout.

- Focused Vitest suite: 7 tests passed (asset/mapping coverage, complete demo registry coverage, saved-preset validation, playback cancellation, errors, time caps and volume isolation).
- ESLint: new sound lab page and sound modules passed.
- Full web TypeScript check: passed, no diagnostics.
- Chromium: /dev/sounds renders without a framework error overlay or page errors.
- Browser decoded all 54 catalog assets successfully.
- Desktop 1280px and mobile 390px: document width equals viewport; no horizontal overflow.
- Saved a custom Kenney selection, reloaded, and confirmed the selection persisted.
- Downloaded the exported preset: 52 modes, 517 actions and the custom selection preserved.
- Kenney filter shows exactly eight alternatives.
- The eight-cue ranked sample flow plays every clip through to its ended event sequentially, then returns to idle.
- Served sound-pack download returns HTTP 200; ZIP integrity check passed.
- All 37 new WAVs: mono 44.1 kHz, 16-bit PCM, peak no greater than approximately 0.6 full scale.

These checks establish technical playback and UI correctness. Final aesthetic listening on real headphones/speakers and Safari/native mobile device testing remain separate. New maps are audition proposals, not live mode integrations.
