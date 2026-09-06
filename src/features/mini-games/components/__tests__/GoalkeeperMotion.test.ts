import fs from 'node:fs';
import { beforeAll, describe, expect, it } from 'vitest';
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { clone } from 'three/examples/jsm/utils/SkeletonUtils.js';
import { resolveJoints, setJoint } from '../ScoreGoalsPlayer3D';
import { sampleGoalkeeper, KEEPER_CONTACT_S } from '../GoalkeeperMotion';
let model: THREE.Group;
beforeAll(async () => {
  const dir = 'public/assets/demos/score/footballer/';
  const json = JSON.parse(fs.readFileSync(dir + 'footballer.gltf', 'utf8'));
  delete json.images; delete json.textures;
  for (const material of json.materials) if (material.pbrMetallicRoughness) delete material.pbrMetallicRoughness.baseColorTexture;
  json.buffers[0].uri = 'data:application/octet-stream;base64,' + fs.readFileSync(dir + 'footballer.bin').toString('base64');
  model = (await new GLTFLoader().parseAsync(JSON.stringify(json), '')).scene;
});
describe('keeper contact with the exported rig', () => {
  it('presents both palms to the ball with clearance from the face', () => {
    for (const x of [-2.45, 2.45]) for (const y of [.64, 1.84]) {
      const root = clone(model) as THREE.Group, joints = resolveJoints(root)!;
      const ball = new THREE.Vector3();
      sampleGoalkeeper(root, joints, [x, y], KEEPER_CONTACT_S, true, ball);
      for (const side of ['L', 'R'] as const) {
        const hand = joints[`hand${side}`]!, sign = side === 'L' ? 1 : -1;
        const centre = hand.localToWorld(new THREE.Vector3(sign * .12, .08, 0));
        expect(centre.distanceTo(new THREE.Vector3(x, y, .42))).toBeLessThan(.10);
        const normal = new THREE.Vector3(sign, 0, 0).applyQuaternion(hand.getWorldQuaternion(new THREE.Quaternion()));
        expect(normal.z).toBeGreaterThan(.8);
      }
      expect(ball.distanceTo(joints.head!.getWorldPosition(new THREE.Vector3()))).toBeGreaterThan(.35);
    }
  });
  it('keeps wrists and ball continuous through the reach, grip and landing', () => {
    for (const style of ['catch', 'parry', 'tip'] as const) {
      const root = clone(model) as THREE.Group, joints = resolveJoints(root)!;
      const ball = new THREE.Vector3(), previous = new THREE.Quaternion();
      for (let frame = 0; frame <= 270; frame++) {
        sampleGoalkeeper(root, joints, [2.45, 1.84], frame / 120, true, ball, style);
        const current = joints.handL!.getWorldQuaternion(new THREE.Quaternion());
        if (frame) expect(current.angleTo(previous)).toBeLessThan(.22);
        previous.copy(current);
      }
    }
  });
  it('reaches the same catch point under the rotated and scaled Road goal', () => {
    const mount = new THREE.Group(); mount.position.set(39.15, 0, .8); mount.rotation.y = -Math.PI / 2; mount.scale.setScalar(1.75);
    const root = clone(model) as THREE.Group; mount.add(root); mount.updateMatrixWorld(true);
    const joints = resolveJoints(root)!;
    const ball = new THREE.Vector3();
    sampleGoalkeeper(root, joints, [1.85, 1.45], KEEPER_CONTACT_S, true, ball);
    const target = new THREE.Vector3(1.85, 1.45, .42).applyMatrix4(mount.matrixWorld);
    expect(ball.distanceTo(target)).toBeLessThan(.12);
    expect(root.parent).toBe(mount);
  });
  it.each(['parry', 'tip'] as const)('%s touches the ball with the leading glove', style => {
    for (const x of [-2.45, 0, 2.45]) for (const y of [.64, 1.84]) {
      const root = clone(model) as THREE.Group;
      const ball = new THREE.Vector3();
      sampleGoalkeeper(root, resolveJoints(root)!, [x, y], KEEPER_CONTACT_S, true, ball, style);
      expect(ball.distanceTo(new THREE.Vector3(x, y, .42))).toBeLessThan(.13);
    }
  });
  it.each(['L', 'R'] as const)('bends the %s elbow rather than twisting the forearm', side => {
    const root = new THREE.Group(); root.add(clone(model));
    const joints = resolveJoints(root)!;
    const elbow = joints[`elb${side}`]!, hand = joints[`hand${side}`]!;
    setJoint(joints[`sho${side}`], 0); setJoint(elbow, 0); root.updateMatrixWorld(true);
    const base = hand.getWorldPosition(new THREE.Vector3()).sub(elbow.getWorldPosition(new THREE.Vector3()));
    setJoint(elbow, -.9); root.updateMatrixWorld(true);
    const bent = hand.getWorldPosition(new THREE.Vector3()).sub(elbow.getWorldPosition(new THREE.Vector3()));
    expect(base.angleTo(bent)).toBeGreaterThan(.7);
    expect(Math.abs(base.length() - bent.length())).toBeLessThan(.001);
  });
  it.each([[-2.45, 1.84], [0, 1.9], [2.45, 1.84], [-2.45, .64], [0, .56], [2.45, .64]])('meets the ball at %s/%s and holds it through landing', (x, y) => {
    const root = new THREE.Group(); root.add(clone(model));
    const joints = resolveJoints(root)!;
    const ball = new THREE.Vector3();
    sampleGoalkeeper(root, joints, [x, y], KEEPER_CONTACT_S, true, ball);
    expect(ball.distanceTo(new THREE.Vector3(x, y, .42))).toBeLessThan(.065);
    if (x !== 0) expect(ball.distanceTo(joints.head!.getWorldPosition(new THREE.Vector3()))).toBeGreaterThan(.2);
    const previous = ball.clone();
    for (let frame = 1; frame <= 90; frame++) {
      sampleGoalkeeper(root, joints, [x, y], KEEPER_CONTACT_S + frame / 120, true, ball);
      expect(ball.distanceTo(previous)).toBeLessThan(.09);
      expect(ball.y).toBeGreaterThan(.08);
      previous.copy(ball);
    }
  });
});
