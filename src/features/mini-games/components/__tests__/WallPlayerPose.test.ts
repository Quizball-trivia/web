import fs from 'node:fs';
import { beforeAll, describe, expect, it } from 'vitest';
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { clone } from 'three/examples/jsm/utils/SkeletonUtils.js';
import { resolveJoints, setJoint } from '../ScoreGoalsPlayer3D';
import { poseWallHands } from '../WallPlayerPose';
let model: THREE.Group;
beforeAll(async () => {
  const dir = 'public/assets/demos/score/footballer/';
  const json = JSON.parse(fs.readFileSync(dir + 'footballer.gltf', 'utf8'));
  delete json.images; delete json.textures;
  for (const material of json.materials) if (material.pbrMetallicRoughness) delete material.pbrMetallicRoughness.baseColorTexture;
  json.buffers[0].uri = 'data:application/octet-stream;base64,' + fs.readFileSync(dir + 'footballer.bin').toString('base64');
  model = (await new GLTFLoader().parseAsync(JSON.stringify(json), '')).scene;
});
describe('wall protective hand pose', () => {
  it.each([0, .47])('keeps wrists uncrossed and palms toward the body at jump height %s', height => {
    const root = clone(model) as THREE.Group;
    const joints = resolveJoints(root)!;
    root.position.set(-1.4, height, 4.55);
    root.rotation.z = height ? .12 : 0;
    setJoint(joints.spine, .08);
    poseWallHands(root, joints);
    const pelvis = root.worldToLocal(joints.pelvis!.getWorldPosition(new THREE.Vector3()));
    for (const side of ['L', 'R'] as const) {
      const sign = side === 'L' ? 1 : -1, hand = joints[`hand${side}`]!;
      const position = root.worldToLocal(hand.getWorldPosition(new THREE.Vector3())).sub(pelvis);
      expect(position.x * sign).toBeGreaterThan(.045);
      expect(position.z).toBeGreaterThan(.20);
      expect(position.z).toBeLessThan(.31);
      const palm = new THREE.Vector3(sign, 0, 0).applyQuaternion(hand.getWorldQuaternion(new THREE.Quaternion()));
      expect(palm.z).toBeLessThan(-.99);
      const before = hand.getWorldQuaternion(new THREE.Quaternion());
      poseWallHands(root, joints);
      expect(hand.getWorldQuaternion(new THREE.Quaternion()).angleTo(before)).toBeLessThan(.001);
    }
  });
});
