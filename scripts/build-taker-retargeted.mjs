/**
 * Retargets the Mixamo penalty-kick clip onto our nice UBC body so the taker
 * uses the real mocap strike on the good-looking mesh (not the gray X-Bot).
 *
 *   node scripts/build-taker-retargeted.mjs <mixamo-glb-dir>
 *
 * Uses three's SkeletonUtils.retargetClip (samples the Mixamo skeleton's world
 * pose each frame and writes it onto the UBC skeleton via a bone-name map).
 * Root motion is stripped afterwards (Hips X/Z held) so he kicks in place.
 * Output: public/assets/demos/score/taker.glb (UBC body + kick + idle clips).
 */

// Minimal browser-global polyfills the three exporters/loaders reach for when
// run under Node (FileReader for the binary GLB blob, self.URL for textures).
import { readFileSync, writeFileSync } from 'node:fs';

globalThis.self = globalThis;
if (typeof globalThis.FileReader === 'undefined') {
  globalThis.FileReader = class {
    readAsArrayBuffer(blob) {
      blob
        .arrayBuffer()
        .then((buf) => {
          this.result = buf;
          this.onloadend?.();
        })
        .catch((e) => {
          this.error = e;
          this.onerror?.(e);
        });
    }
  };
}

const { GLTFLoader } = await import('three/examples/jsm/loaders/GLTFLoader.js');
const { retargetClip } = await import('three/examples/jsm/utils/SkeletonUtils.js');
const { GLTFExporter } = await import('three/examples/jsm/exporters/GLTFExporter.js');

// Mixamo bone → UBC/UE bone.
const NAMES = {
  pelvis: 'mixamorigHips',
  spine_01: 'mixamorigSpine',
  spine_02: 'mixamorigSpine1',
  spine_03: 'mixamorigSpine2',
  neck_01: 'mixamorigNeck',
  Head: 'mixamorigHead',
  clavicle_l: 'mixamorigLeftShoulder',
  upperarm_l: 'mixamorigLeftArm',
  lowerarm_l: 'mixamorigLeftForeArm',
  hand_l: 'mixamorigLeftHand',
  clavicle_r: 'mixamorigRightShoulder',
  upperarm_r: 'mixamorigRightArm',
  lowerarm_r: 'mixamorigRightForeArm',
  hand_r: 'mixamorigRightHand',
  thigh_l: 'mixamorigLeftUpLeg',
  calf_l: 'mixamorigLeftLeg',
  foot_l: 'mixamorigLeftFoot',
  ball_l: 'mixamorigLeftToeBase',
  thigh_r: 'mixamorigRightUpLeg',
  calf_r: 'mixamorigRightLeg',
  foot_r: 'mixamorigRightFoot',
  ball_r: 'mixamorigRightToeBase',
};

const [glbDir] = process.argv.slice(2);
if (!glbDir) {
  console.error('usage: node scripts/build-taker-retargeted.mjs <mixamo-glb-dir>');
  process.exit(1);
}

const loader = new GLTFLoader();
function loadGLB(file) {
  const buf = readFileSync(file);
  return new Promise((res, rej) =>
    loader.parse(buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength), '', res, rej),
  );
}

function findSkinned(root) {
  let sm = null;
  root.traverse((o) => {
    if (o.isSkinnedMesh && !sm) sm = o;
  });
  return sm;
}

/** Strip root translation drift on the retargeted Hips/pelvis track. */
function stripRoot(clip, rootBoneName) {
  const track = clip.tracks.find(
    (t) => t.name === `${rootBoneName}.position` || t.name.endsWith(`${rootBoneName}.position`),
  );
  if (!track) return;
  const v = track.values; // [x,y,z, x,y,z, ...]
  const x0 = v[0];
  const z0 = v[2];
  for (let i = 0; i < v.length; i += 3) {
    v[i] = x0;
    v[i + 2] = z0;
  }
}

// Source = the X-Bot body that already carries the kick+idle clips on the
// Mixamo skeleton; target = our UBC body.
const [ubc, src] = await Promise.all([
  loadGLB('public/assets/demos/score/player-body_notex.glb'),
  loadGLB('/tmp/tk/xbot_taker_notex.glb'),
]);

const targetMesh = findSkinned(ubc.scene);
const srcMesh = findSkinned(src.scene);
src.scene.updateMatrixWorld(true);
targetMesh.pose();

const clips = [];
for (const srcClip of src.animations) {
  const label = srcClip.name;
  const retargeted = retargetClip(targetMesh, srcMesh, srcClip, { names: NAMES, fps: 30 });
  retargeted.name = label;
  // retargetClip emits tracks as ".bones[boneName].prop"; the GLTFExporter
  // needs node-name paths ("boneName.prop"). Rewrite them.
  for (const track of retargeted.tracks) {
    const m = /^\.bones\[([^\]]+)\]\.(.+)$/.exec(track.name);
    if (m) track.name = `${m[1]}.${m[2]}`;
  }
  if (label === 'kick') stripRoot(retargeted, 'pelvis');
  clips.push(retargeted);
  targetMesh.pose();
}

// Export the UBC body with the retargeted clips.
const exporter = new GLTFExporter();
const glb = await new Promise((res, rej) =>
  exporter.parse(ubc.scene, res, rej, { binary: true, animations: clips }),
);
writeFileSync('public/assets/demos/score/taker.glb', Buffer.from(glb));
console.log('retargeted taker clips:', clips.map((c) => `${c.name}(${c.tracks.length}tr, ${c.duration.toFixed(2)}s)`));
