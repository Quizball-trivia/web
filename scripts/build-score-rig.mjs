/**
 * Builds the Score!/Free Kicks player assets from the CC0 Quaternius packs
 * (Universal Base Characters + Universal Animation Library, Unreal-Godot
 * flavour — both share the 65-bone UE skeleton).
 *
 *   node scripts/build-score-rig.mjs <ubc-godot-ue-dir> <ual1-unreal-godot-dir>
 *
 * Outputs into public/assets/demos/score/:
 *   player-body.glb  — Superhero_Male body + eyes/eyebrows, textures pruned
 *                      to the eye basecolor only (kits are shader-painted)
 *   player-hair.glb  — hair styles rigged to the head bone
 *   player-clips.glb — UAL locomotion clips (only used by the Score! Classics
 *                      prototype, which is NOT in this PR — Free Kicks doesn't
 *                      ship these clips; kept so Score! stays reproducible)
 */

import { Document, NodeIO } from '@gltf-transform/core';
import { dedup, mergeDocuments, prune, resample, unpartition } from '@gltf-transform/functions';
import path from 'node:path';

const HAIR_STYLES = ['Hair_Buzzed', 'Hair_SimpleParted', 'Hair_Long', 'Hair_Buns', 'Hair_Beard'];

const KEEP_CLIPS = [
  'Idle_Loop',
  'Jog_Fwd_Loop',
  'Sprint_Loop',
  'Crouch_Idle_Loop',
  'Jump_Loop',
  'Roll',
  'Walk_Loop',
];

const [ubcDir, ualDir, hairDir] = process.argv.slice(2);
if (!ubcDir || !ualDir) {
  console.error('usage: node scripts/build-score-rig.mjs <ubc-dir> <ual1-dir> [hair-dir]');
  process.exit(1);
}
const outDir = 'public/assets/demos/score';
const io = new NodeIO();

// ── body ──────────────────────────────────────────────────────────────
const body = await io.read(path.join(ubcDir, 'Superhero_Male_FullBody.gltf'));
for (const mat of body.getRoot().listMaterials()) {
  const name = mat.getName();
  if (name !== 'MI_Eyes') {
    mat.setBaseColorTexture(null);
  }
  mat.setNormalTexture(null);
  mat.setMetallicRoughnessTexture(null);
  mat.setOcclusionTexture(null);
  mat.setEmissiveTexture(null);
}
for (const tex of body.getRoot().listTextures()) {
  if (tex.listParents().filter((p) => p.propertyType !== 'Root').length === 0) tex.dispose();
}
await body.transform(prune(), dedup());
await io.write(path.join(outDir, 'player-body.glb'), body);

// ── clips ─────────────────────────────────────────────────────────────
const clips = await io.read(path.join(ualDir, 'UAL1_Standard.glb'));
for (const anim of clips.getRoot().listAnimations()) {
  if (!KEEP_CLIPS.includes(anim.getName())) {
    anim.dispose();
    continue;
  }
  // Finger poses come from a static curl baked at load time — dropping their
  // tracks keeps hands controllable and shrinks the file (30 of 65 bones).
  for (const channel of anim.listChannels()) {
    const target = channel.getTargetNode()?.getName() ?? '';
    if (/^(index|middle|ring|pinky|thumb)_\d\d(_leaf)?_(l|r)$/.test(target)) {
      channel.dispose();
    }
  }
}
// The clip file only needs the node hierarchy for track targets — drop meshes.
for (const mesh of clips.getRoot().listMeshes()) mesh.dispose();
for (const mat of clips.getRoot().listMaterials()) mat.dispose();
for (const tex of clips.getRoot().listTextures()) tex.dispose();
await clips.transform(resample(), prune(), dedup());
await io.write(path.join(outDir, 'player-clips.glb'), clips);

// ── hair ──────────────────────────────────────────────────────────────
// The "Rigged to Head Bone" styles ship skinned to the full skeleton with
// vertices in model space. We keep them as plain static meshes (verts in model
// space, no skinning) — the runtime rides them on the Head bone using the head
// bone's inverse *bind* matrix, which we also export so the fit matches the
// skinned body exactly (the bone's animated matrix ≠ its bind matrix, which is
// what made the hair float).
if (hairDir) {
  const hair = new Document();
  let headBindWritten = false;
  let headBindMat = null;
  for (const style of HAIR_STYLES) {
    const d = await io.read(path.join(hairDir, `${style}.gltf`));

    // Grab the Head joint's inverse bind matrix once (same skeleton for all).
    if (!headBindWritten) {
      for (const skin of d.getRoot().listSkins()) {
        const joints = skin.listJoints();
        const ibm = skin.getInverseBindMatrices();
        const hi = joints.findIndex((j) => j.getName() === 'Head');
        if (hi >= 0 && ibm) {
          headBindMat = Array.from(ibm.getArray().slice(hi * 16, hi * 16 + 16));
          headBindWritten = true;
        }
      }
    }

    for (const node of d.getRoot().listNodes()) {
      node.setSkin(null);
      if (node.getMesh()) node.setName(style);
    }
    for (const skin of d.getRoot().listSkins()) skin.dispose();
    for (const mesh of d.getRoot().listMeshes()) {
      for (const prim of mesh.listPrimitives()) {
        prim.setAttribute('JOINTS_0', null);
        prim.setAttribute('WEIGHTS_0', null);
        prim.setMaterial(null);
      }
    }
    mergeDocuments(hair, d);
  }
  const root = hair.getRoot();
  const scene = hair.createScene('hair');
  for (const node of root.listNodes()) {
    if (node.getMesh()) scene.addChild(node);
  }
  for (const s of root.listScenes()) {
    if (s !== scene) s.dispose();
  }
  root.setDefaultScene(scene);
  // Scene extras land on gltf.scene.userData via GLTFLoader — the runtime
  // reads the Head bind matrix from there.
  if (headBindMat) scene.setExtras({ headInverseBind: headBindMat });
  await hair.transform(prune(), dedup(), unpartition());
  await io.write(path.join(outDir, 'player-hair.glb'), hair);
}

console.log('done');
