/** Check the exported skeleton, clip library, and planted-foot continuity. */
import fs from 'node:fs';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';

const directory = 'public/assets/demos/score/footballer/';
const json = JSON.parse(fs.readFileSync(directory + 'footballer.gltf'));
for (const image of json.images ?? []) assert.ok(fs.existsSync(directory + image.uri), `Missing ${image.uri}`);
// Load the same mesh/animation bytes without browser-only image decoding.
for (const material of json.materials) {
  if (material.pbrMetallicRoughness) delete material.pbrMetallicRoughness.baseColorTexture;
}
delete json.images;
delete json.textures;
delete json.buffers[0].uri;
const binarySource = fs.readFileSync(directory + 'footballer.bin');
const raw = Buffer.from(JSON.stringify(json));
const jsonChunk = Buffer.alloc(Math.ceil(raw.length / 4) * 4, 32);
raw.copy(jsonChunk);
const binary = Buffer.alloc(Math.ceil(binarySource.length / 4) * 4);
binarySource.copy(binary);
const packed = Buffer.alloc(28 + jsonChunk.length + binary.length);
packed.writeUInt32LE(0x46546c67, 0);
packed.writeUInt32LE(2, 4);
packed.writeUInt32LE(packed.length, 8);
packed.writeUInt32LE(jsonChunk.length, 12);
packed.writeUInt32LE(0x4e4f534a, 16);
jsonChunk.copy(packed, 20);
packed.writeUInt32LE(binary.length, 20 + jsonChunk.length);
packed.writeUInt32LE(0x004e4942, 24 + jsonChunk.length);
binary.copy(packed, 28 + jsonChunk.length);
const gltf = await new GLTFLoader().parseAsync(packed.buffer.slice(packed.byteOffset, packed.byteOffset + packed.length), '');
const names = new Set(gltf.animations.map(clip => clip.name));
const expected = ['stance_carlos', 'strike_left_power', 'stance_power', 'stance_samba', 'stance_left', 'stance_curl', 'stance_neymar', 'strike_whip', 'strike_power', 'strike_curl', 'strike_toe', 'strike_left', 'celebrate_siu', 'celebrate_samba', 'celebrate_sky', 'celebrate_fold', 'outfield_idle', 'dribble', 'strike', 'jockey', 'celebrate', 'keeper_idle'];
for (const height of ['high', 'low']) for (const side of ['left', 'right']) {
  expected.push(`keeper_${height}_${side}`, `keeper_${height}_${side}_full`);
}
for (const name of expected) assert.ok(names.has(name), `Missing ${name}`);
for (const clip of gltf.animations) {
  assert.ok(clip.duration > 0, `${clip.name}: zero duration`);
  for (const track of clip.tracks) assert.ok(track.values.every(Number.isFinite), `${clip.name}: non-finite transform`);
}
let skin;
gltf.scene.traverse(object => { if (object.isSkinnedMesh && !skin) skin = object; });
assert.ok(skin, 'Missing skinned model');
// The shirt must retain a waist instead of regressing to constant-radius rings.
const shirtPositions = [];
gltf.scene.traverse(object => {
  if (object.isMesh && object.material.name === 'Football_Jersey') shirtPositions.push(object.geometry.attributes.position);
});
assert.ok(shirtPositions.length, 'Missing tailored jersey');
const shirtWidth = height => {
  let min = Infinity, max = -Infinity;
  for (const positions of shirtPositions) for (let i = 0; i < positions.count; i++) {
    if (Math.abs(positions.getY(i) - height) > .009) continue;
    min = Math.min(min, positions.getX(i)); max = Math.max(max, positions.getX(i));
  }
  assert.ok(Number.isFinite(min + max), `Missing shirt section at ${height}`);
  return max - min;
};
const chest = shirtWidth(1.265), waist = shirtWidth(1.08), hem = shirtWidth(.986);
console.log(`Shirt chest/waist/hem: ${[chest, waist, hem].map(width => (width * 100).toFixed(1)).join('/')}cm`);
assert.ok(waist < chest * .9, 'Shirt has lost its chest-to-waist taper');
assert.ok(hem > waist * 1.03 && hem < chest, 'Shirt hem does not fit between waist and chest widths');
const mixer = new THREE.AnimationMixer(gltf.scene);
for (const name of ['stance_carlos', 'strike_left_power', 'stance_power', 'stance_samba', 'stance_left', 'stance_curl', 'stance_neymar', 'strike_whip', 'outfield_idle', 'dribble', 'strike', 'strike_power', 'strike_curl', 'strike_toe', 'strike_left', 'celebrate_samba', 'celebrate_sky', 'celebrate_fold', 'keeper_idle']) {
  const clip = gltf.animations.find(animation => animation.name === name);
  const action = mixer.clipAction(clip).play();
  let minimum = Infinity, maximum = -Infinity;
  for (let frame = 0; frame < 60; frame++) {
    mixer.setTime(clip.duration * frame / 60);
    gltf.scene.updateMatrixWorld(true);
    let lowest = Infinity;
    for (const side of name.startsWith('strike_left') ? ['r'] : name.startsWith('strike') ? ['l'] : ['l', 'r']) {
      const foot = gltf.scene.getObjectByName(`foot_${side}`);
      const inverse = skin.skeleton.boneInverses[skin.skeleton.bones.indexOf(foot)];
      for (const z of [0.12, -0.085]) {
        const point = new THREE.Vector3(side === 'l' ? 0.1143 : -0.1143, 0.004, z)
          .applyMatrix4(inverse).applyMatrix4(foot.matrixWorld);
        lowest = Math.min(lowest, point.y);
      }
    }
    minimum = Math.min(minimum, lowest);
    maximum = Math.max(maximum, lowest);
    assert.ok(lowest > -0.015 && lowest < 0.02, `${name}: planted foot outside ground tolerance (${lowest})`);
  }
  action.stop();
  console.log(`${name}: foot height ${minimum.toFixed(4)}–${maximum.toFixed(4)}m`);
}
// The jump-turn must leave the ground and settle again, without floor penetration.
{
  const clip = gltf.animations.find(animation => animation.name === 'celebrate_siu');
  const action = mixer.clipAction(clip).play();
  let peak = 0;
  for (let frame = 0; frame <= 120; frame++) {
    const time = clip.duration * frame / 120;
    mixer.setTime(time); gltf.scene.updateMatrixWorld(true);
    let lowest = Infinity;
    for (const side of ['l', 'r']) {
      const foot = gltf.scene.getObjectByName(`foot_${side}`);
      const inverse = skin.skeleton.boneInverses[skin.skeleton.bones.indexOf(foot)];
      for (const z of [.12, -.085]) lowest = Math.min(lowest, new THREE.Vector3(side === 'l' ? .1143 : -.1143, .004, z).applyMatrix4(inverse).applyMatrix4(foot.matrixWorld).y);
    }
    assert.ok(lowest > -.02, `jump-turn: floor penetration at ${time}`);
    if (time > 1.4) assert.ok(lowest < .025, `jump-turn: floating after landing at ${time}`);
    peak = Math.max(peak, lowest);
  }
  assert.ok(peak > .4 && peak < .6, `jump-turn: incorrect jump height ${peak}`);
  action.stop();
  console.log(`Jump-turn: ${(peak * 100).toFixed(0)}cm lift and planted landing.`);
}
console.log(`Validated ${gltf.animations.length} clips, skinned model, textures, and planted feet.`);
