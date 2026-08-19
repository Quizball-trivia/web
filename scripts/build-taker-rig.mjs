/**
 * INTERMEDIATE step, superseded by build-taker-retargeted.mjs. Builds a native
 * Mixamo X-Bot taker GLB (X Bot skinned mesh + Soccer Penalty Kick + offensive
 * idle, converted FBX→GLB) whose clips are then RETARGETED onto the nice UBC
 * body by build-taker-retargeted.mjs to produce the shipped taker.glb. Do not
 * run this alone expecting the shipped asset — its output is the X-Bot source,
 * not the UBC runtime body.
 *
 *   node scripts/build-taker-rig.mjs <glb-dir>
 *
 * The penalty-kick clip carries root motion — the Hips translate ~3.5m forward
 * through the strike. We strip the horizontal (X/Z) component of the Hips
 * translation track so the taker plants and kicks in place instead of walking
 * off the ball spot; the vertical bob is kept.
 */

import { NodeIO } from '@gltf-transform/core';
import { dedup, prune, resample, unpartition } from '@gltf-transform/functions';
import path from 'node:path';

const CLIPS = [
  ['offensive_idle', 'idle'],
  ['soccer_penalty_kick', 'kick'],
];
const ROOT_MOTION_CLIPS = new Set(['kick']);

const [glbDir] = process.argv.slice(2);
if (!glbDir) {
  console.error('usage: node scripts/build-taker-rig.mjs <glb-dir>');
  process.exit(1);
}
const io = new NodeIO();

const base = await io.read(path.join(glbDir, 'X_Bot.glb'));
for (const anim of base.getRoot().listAnimations()) anim.dispose();
for (const mesh of base.getRoot().listMeshes()) {
  if (mesh.getName() === 'Beta_Joints') {
    for (const node of mesh.listParents()) {
      if (node.propertyType === 'Node') node.setMesh(null);
    }
    mesh.dispose();
  }
}
const baseNodes = new Map(base.getRoot().listNodes().map((n) => [n.getName(), n]));
const baseBuffer = base.getRoot().listBuffers()[0];

function copyAccessor(srcAcc) {
  const acc = base
    .createAccessor()
    .setType(srcAcc.getType())
    .setBuffer(baseBuffer)
    .setNormalized(srcAcc.getNormalized());
  acc.setArray(srcAcc.getArray().slice());
  return acc;
}

for (const [file, label] of CLIPS) {
  const src = await io.read(path.join(glbDir, `${file}.glb`));
  await src.transform(resample());
  const srcAnim = src.getRoot().listAnimations()[0];
  if (!srcAnim) continue;

  const anim = base.createAnimation(label);
  const samplerMap = new Map();
  for (const ch of srcAnim.listChannels()) {
    const target = ch.getTargetNode();
    const boneName = target?.getName();
    const bone = boneName ? baseNodes.get(boneName) : null;
    if (!bone) continue;

    const srcSampler = ch.getSampler();
    let sampler = samplerMap.get(srcSampler);
    if (!sampler) {
      const output = copyAccessor(srcSampler.getOutput());
      // Strip root-motion drift: on the Hips translation of a root-motion clip,
      // hold X/Z at their first-frame value (in-place), keep Y (vertical bob).
      if (
        ROOT_MOTION_CLIPS.has(label) &&
        ch.getTargetPath() === 'translation' &&
        /Hips$/.test(boneName ?? '')
      ) {
        const arr = output.getArray().slice();
        const x0 = arr[0];
        const z0 = arr[2];
        for (let i = 0; i < arr.length; i += 3) {
          arr[i] = x0;
          arr[i + 2] = z0;
        }
        output.setArray(arr);
      }
      sampler = base
        .createAnimationSampler()
        .setInterpolation(srcSampler.getInterpolation())
        .setInput(copyAccessor(srcSampler.getInput()))
        .setOutput(output);
      anim.addSampler(sampler);
      samplerMap.set(srcSampler, sampler);
    }
    const channel = base
      .createAnimationChannel()
      .setTargetNode(bone)
      .setTargetPath(ch.getTargetPath())
      .setSampler(sampler);
    anim.addChannel(channel);
  }
}

await base.transform(prune({ keepLeaves: false }), dedup(), unpartition());
await io.write('public/assets/demos/score/taker.glb', base);
console.log(
  'taker clips:',
  base.getRoot().listAnimations().map((a) => `${a.getName()}(${a.listChannels().length})`),
);
