# Football visual update

Worktree: `worktrees/football-3d-visuals`

Branch: `codex/football-3d-visuals`

Originally based on staging commit `2ee47863`.

## Review locally

Run `npm run dev -- --port 3097 --webpack`, then open
<http://localhost:3097/demos/football-visuals>.
This development-only preview mounts the actual game scenes without starting
paid runs or calling game APIs. It includes dribbles, tackles, zone progression,
goals, saves, player replacement, and a model studio with slow playback and an inspectable catch pose.
The normal `/demos/mini-road-to-goal` and `/demos/mini-final-third` routes share
these scenes.

## Model and animation

The remodeled Blender footballer is based on the existing CC0 Quaternius human.
It has continuous skinned shirts and shorts, socks, collar trim, shaped cleats,
laces, studs, and optional goalkeeper gloves. Kit colors and hairstyles remain
customizable. The hand meshes and finger skeletons were reduced together to
improve proportions. The lower shirt has a tapered waist, a fitted hip hem,
flatter front/back contours and denser spine-weighted sections. A smooth join
blends these sections into the existing chest surface.

The export now uses a neutral rest pose. Elbow flex uses the transverse axis
of the T-pose arm, rather than twisting along the forearm. The same correction
is applied to Blender clips and the runtime pose adapter. Thirty authored
clips remain in the asset library. Outfield players use the dribble, ready,
shuffle, six shooting styles and four signature-inspired celebrations. The shooter blends whole-body
clips and samples the strike against the shot clock, keeping contact synchronized
after a dropped frame. The old independent shoulder/jump celebration is removed.

Live goalkeeper saves use a single controller with two-bone arm IK. Both hands
reach ahead of the head at the selected arrival point, gather the ball toward the chest and follow
the landing. The model studio previews this controller too, with inspectable ready, push-off,
contact, gather and landing stages. Complete wrist frames orient the palms,
mirrored elbow guides follow body rotation, and finger curls blend from an
open save into a cushioned grip. Tip saves contact the extended fingers; the
spare hand stays tucked during deflections. The original baked
keeper clips remain available as animation references in the source library.

The tackle uses one shared clock: approach, cleat-to-shin contact at 0.34 seconds,
then reaction and landing. Contact uses the actual posed skeleton and works at
different zone spacings. The existing gameplay transition remains unchanged.

New action styles are original Blender-authored interpretations: Ronaldo-inspired
power/jump-turn, Ronaldinho-inspired toe-poke/samba, Messi-inspired left-foot
placement/sky-point, Beckham-inspired instep curl, Neymar-inspired whipped shots, and Mbappé-inspired folded
arms. Six distinct breathing stances vary leg spacing, weight distribution,
body angle and arm position before the strike. Long/bun hairstyles include a
fitted crown cap, and Ronaldinho has a fitted black headband. Hair attachments
use the current head inverse bind so they follow the remodeled skeleton. Foot contact is sampled from each clip's correct striking foot. Preview
selectors make styles and keeper responses directly reviewable. Ronaldo’s
wide stance and jump-turn are exclusive to his persona. Carlos has a separate
angled stance and left-foot power strike; Zidane, Kvaratskhelia and unknown
players use neutral defaults. Mbappé keeps folded arms with a relaxed stance.

The final Road to Goal zone now presents a goalkeeper. Winning triggers a timed
strike, missed dive, net impact, and a whole-body blend into celebration. Losing
triggers the same strike with a catch, parry or fingertip save; early-zone losses
still use tackles. The shot clock continues across transient/terminal phase
changes and resets for a new attempt. The final outcome UI says “Saved!” for a
loss, and both live/demo presentation delays allow the shot to finish. Server
outcomes and payouts are unchanged. Use “Final keeper” in the preview to test it.

## Ball and environment

Both games reuse `/assets/brand/goal-ball.webp`, projected onto the spherical
ball's hemispheres. Road to Goal rolls the ball according to ground distance,
with small dribble touches and no idle spin. Free-kick flight uses gravity and
player-specific curve, early lift/late dip and spin with exact endpoints and
arrival times. Power shots have a small low-spin flutter; left-foot shots bend
in the opposite direction. These are authored aerodynamic approximations. Caught balls use
the goalkeeper's shared catch point; parries and tips rebound away from goal
from the same contact time, with distinct lift and travel. Goals produce a damped net rebound and
successively smaller gravity-driven bounces, without ground penetration.

The Road goal now faces the attack and has an 8.5 × 3.2 scene-unit opening,
rounded posts, a deep gridded net, and an impact pocket. Penalty/goal boxes, the
penalty spot and arc replace the old guide line. A wider final camera shows the
shooter, keeper and goal on desktop and mobile. Both games use finer repeated
grass detail with separate, subtle mowing stripes.

Free Kicks retains the original Georgian stadium artwork with red-and-white
supporters (`final-third-stadium-georgia-v3.png`). Road to Goal uses a newly generated
panoramic Georgian-inspired grandstand (`road-to-goal-stadium-panorama-v4.png`), cropped
to its camera aspect without stretching the crowd. Its fixed pitch-side LED boards
scroll the actual Quizball logo over brand blue with yellow trim at 0.65 scene units
per second. Motion respects the system reduced-motion preference. The texture is
baked once and animates by UV offset, with no per-frame canvas redraws or React updates.
Generation prompt and provenance: `art/footballer/stadium-panorama-prompt.md`.
The actual Quizball logo also appears in the HUD. A compact multiplier strip shows
the current zone, nearby coefficients and cleared states. It sits below the
pitch on mobile so the players' feet and the ball remain visible.

## Resource handling and validation

Textures load from local assets under the existing CSP. The legacy body eye
image has been externalized without changing geometry or skeleton bytes;
`node scripts/externalize-score-textures.mjs` reproduces that conversion.
Both game scenes have an explicit Suspense boundary so asynchronous assets
load inside the mounted WebGL canvas.

- TypeScript and lint checks pass for changed source.
- 53 tests cover existing Road to Goal behavior, clip replay, tackle contact,
  elbow flex, all six keeper targets, catch/landing continuity, ball physics, final-zone outcome timing, transformed keeper contact, and distinct continuous player flight paths.
- `node scripts/check-footballer-assets.mjs` validates exported clips, skinning,
  textures, finite transforms, planted striking feet and the jump-turn landing.
- Browser review covers desktop/mobile framing, goals, saves and replay.
- The full repository test suite and a production Webpack build passed; GitHub CI also passed the default build with a clean dependency install. No physical-device GPU benchmark was performed.

Editable model, preview render, and rebuild notes: `art/footballer/`.
