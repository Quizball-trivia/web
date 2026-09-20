# Blender footballer and animation library

`footballer.blend` is the editable Blender 5.2 source. Select the `Footballer`
armature and an action in the Action Editor to inspect or edit motion. NLA
tracks are muted so multiple actions do not play over one another.

The model uses the existing CC0 Quaternius Universal Base Characters human
foundation. The football clothing was remodeled in Blender: continuous skinned
jersey and shorts, socks, shaped cleats, laces, studs, and optional fitted gloves.
The jersey has a narrower waist, restrained hip flare and more deformation
sections, blended into the chest to avoid a cylindrical abdomen or a hard seam.
The source scene also includes lighting, camera, floor and a sample hair style
for inspection. The game chooses hair and kit colors independently. Hands and finger bones
were resized together. Elbows flex around the transverse axis, and the runtime
export uses a neutral rest pose. The action variants are original authored,
stylized interpretations of familiar football movements, not athlete motion capture.

## Authored actions

- `outfield_idle`, `dribble`, `strike`, `jockey`, `celebrate`
- `strike_power`, `strike_curl`, `strike_toe`, `strike_left`, `strike_whip`, `strike_left_power` (right-foot power, instep curl, compact toe-poke, mirrored left-foot placement, compact whipped instep, Carlos left-foot power)
- `stance_power`, `stance_samba`, `stance_left`, `stance_curl`, `stance_neymar`, `stance_carlos` (six breathing pre-kick postures)
- `celebrate_siu`, `celebrate_samba`, `celebrate_sky`, `celebrate_fold` (jump-turn, samba, sky-point, folded arms)
- `keeper_idle`
- `keeper_low_left`, `keeper_low_right`, `keeper_high_left`, `keeper_high_right`
- Four corresponding `*_full` goalkeeper clips containing the complete dive
  translation and roll, retained as independent animation references in Blender.

The game and Model studio now use `GoalkeeperMotion.ts` for saves: one
controller aligns the gloves to the ball with two-bone IK. Catches gather
and land; parries and fingertip saves use the leading hand and a separate
physical rebound. Palm orientation and finger curls are controlled separately
from the arm reach, with a longer cushioning and landing phase. Central scoop/overhead catches and left/right dives are
selectable in Model studio. The baked keeper clips remain available as animation references.

Animations are baked at 24 fps. The free-kick strike's authored contact is at
0.8 seconds; the game retimes this to its existing 0.45-second ball launch.
The dribble loop is 20 frames. Foot grounding is checked on the exported asset.

The original bundled Mixamo `idle` and `kick` actions are retained in the
editable .blend as references, under their existing license. They are excluded
from the optimized runtime export. See the existing asset attribution at
`public/assets/demos/score/LICENSE.txt` for original sources.

## Runtime export

Keep these three files together:

- `public/assets/demos/score/footballer/footballer.gltf`
- `public/assets/demos/score/footballer/footballer.bin`
- The adjacent eye PNG referenced by the glTF file.

The runtime uses 30 authored clips. Model studio includes the shot and
celebration variations plus the live keeper controller. Free Kicks maps styles
to its existing player personas. Road to Goal exposes a style selector in the
preview; its default power style uses the jump-turn celebration and parry save.

## Rebuild and verify

From the repository root:

The checked-in `player-body.glb` already references its authoritative external eye PNG.
If rebuilding the base rig from the Quaternius source packs, first run
`node scripts/build-score-rig.mjs <ubc-dir> <ual1-dir> [hair-dir]`, then
`node scripts/externalize-score-textures.mjs`. The externalizer requires that
generated `player-body.glb`. Blender reads the eye material's exact image URI from
that GLB, so stale hash-named PNGs cannot change which texture is baked.

```sh
/Applications/Blender.app/Contents/MacOS/Blender --background --python scripts/blender/build-footballer.py
node scripts/optimize-footballer.mjs
node scripts/check-footballer-assets.mjs
```

`scripts/blender/football-actions.py` contains the extra authored actions and
is loaded by the main build script. Folded arms use a baked two-bone reach;
the jump-turn has explicit airborne root translation and rotation.

The Blender build is procedural and overwrites the generated .blend and runtime
export. Save manual edits to a separate .blend before rebuilding.

Local review: `http://localhost:3097/demos/football-visuals` → Model studio.
Rotate the view, select an action, or slow playback to inspect the motion.
For keeper saves, use the save-moment selector to inspect contact and landing.
