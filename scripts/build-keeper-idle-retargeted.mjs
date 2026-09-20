/**
 * Retargets ONLY the Mixamo goalkeeper `idle` clip from keeper.glb onto our
 * nice UBC body, so the keeper can play the real mocap ready-stance idle while
 * he waits — the hand-authored dive/catch save poses still drive the same UBC
 * skeleton procedurally once a shot is taken.
 *
 *   node scripts/build-keeper-idle-retargeted.mjs
 *
 * Output: public/assets/demos/score/keeper-idle.glb (UBC body + one `idle`
 * clip retargeted from the Mixamo skeleton via SkeletonUtils.retargetClip).
 */

import { readFileSync, writeFileSync } from 'node:fs';

// Browser-global polyfills the three loaders/exporters reach for under Node.
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
const { NodeIO } = await import('@gltf-transform/core');
const { prune, dedup } = await import('@gltf-transform/functions');

// UBC/UE bone → Mixamo bone.
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

const loader = new GLTFLoader();
function loadGLB(buf) {
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

// retargetClip fails to load textures under Node, so strip them from both bodies
// first (we only need the skeletons + geometry, not the pixels).
async function stripTextures(path) {
  const io = new NodeIO();
  const doc = await io.read(path);
  await doc.transform(prune(), dedup());
  for (const tex of doc.getRoot().listTextures()) tex.dispose();
  return Buffer.from(await io.writeBinary(doc));
}

const [ubcBuf, keeperBuf] = await Promise.all([
  stripTextures('public/assets/demos/score/player-body.glb'),
  stripTextures('public/assets/demos/score/keeper.glb'),
]);

const [ubc, src] = await Promise.all([loadGLB(ubcBuf), loadGLB(keeperBuf)]);

const targetMesh = findSkinned(ubc.scene);
const srcMesh = findSkinned(src.scene);
src.scene.updateMatrixWorld(true);
targetMesh.pose();

const idleSrc = src.animations.find((c) => c.name === 'idle');
if (!idleSrc) throw new Error('keeper.glb has no idle clip');

const idle = retargetClip(targetMesh, srcMesh, idleSrc, { names: NAMES, fps: 30 });
idle.name = 'idle';
// retargetClip emits ".bones[boneName].prop"; GLTFExporter needs "boneName.prop".
for (const track of idle.tracks) {
  const m = /^\.bones\[([^\]]+)\]\.(.+)$/.exec(track.name);
  if (m) track.name = `${m[1]}.${m[2]}`;
}
// Hold the keeper in place — pin pelvis X/Z at frame 0 (idle shouldn't wander).
const pos = idle.tracks.find((t) => t.name === 'pelvis.position');
if (pos) {
  const v = pos.values;
  const x0 = v[0];
  const z0 = v[2];
  for (let i = 0; i < v.length; i += 3) {
    v[i] = x0;
    v[i + 2] = z0;
  }
}

const exporter = new GLTFExporter();
const glb = await new Promise((res, rej) =>
  exporter.parse(ubc.scene, res, rej, { binary: true, animations: [idle] }),
);
writeFileSync('public/assets/demos/score/keeper-idle.glb', Buffer.from(glb));
console.log(`keeper idle retargeted: ${idle.tracks.length} tracks, ${idle.duration.toFixed(2)}s`);
