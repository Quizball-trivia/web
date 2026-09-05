'use client';

import { useRef, type RefObject } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { jointsAttached, resolveJoints, setJoint, type JointMap, type JointName } from './ScoreGoalsPlayer3D';

export const ROAD_TACKLE_CONTACT = 0.34;
export interface RoadTackleClock { elapsed: number | null }
export interface TackleOrigins { runner: THREE.Vector3; defender: THREE.Vector3; runnerYaw: number; defenderYaw: number }
const clamp = (t: number) => THREE.MathUtils.clamp(t, 0, 1);
const smooth = (t: number) => { const u = clamp(t); return u * u * (3 - 2 * u); };
const point = new THREE.Vector3();
const target = new THREE.Vector3();
const toe = new THREE.Vector3();
const yaw = new THREE.Quaternion();
const up = new THREE.Vector3(0, 1, 0);
const forward = new THREE.Vector3(0, 0, 1);

function orient(root: THREE.Object3D, angle: number, roll: number) {
  root.quaternion.setFromAxisAngle(forward, roll).multiply(yaw.setFromAxisAngle(up, angle));
}

function ground(root: THREE.Object3D, joints: JointMap) {
  root.updateMatrixWorld(true);
  let floor = Infinity;
  const supports: [JointName, number][] = [['ankleL', .09], ['ankleR', .09], ['kneeL', .13], ['kneeR', .13], ['pelvis', .24], ['torso', .24], ['handL', .07], ['handR', .07]];
  for (const [name, radius] of supports) {
    const bone = joints[name];
    if (bone) floor = Math.min(floor, bone.getWorldPosition(point).y - radius);
  }
  if (Number.isFinite(floor)) root.position.y -= floor;
  root.updateMatrixWorld(true);
}

/** A marker on the actual leading cleat, transformed with its skinned bone. */
export function tackleBootPoint(root: THREE.Object3D, foot: THREE.Object3D, out: THREE.Vector3) {
  let marker = foot.userData.roadTackleToe as THREE.Vector3 | undefined;
  if (!marker) {
    root.traverse(child => {
      const mesh = child as THREE.SkinnedMesh;
      if (!mesh.isSkinnedMesh || marker) return;
      const index = mesh.skeleton.bones.indexOf(foot as THREE.Bone);
      if (index >= 0) marker = new THREE.Vector3(.1143, .065, .175).applyMatrix4(mesh.skeleton.boneInverses[index]);
    });
    foot.userData.roadTackleToe = marker ?? new THREE.Vector3();
  }
  return out.copy(marker ?? foot.userData.roadTackleToe).applyMatrix4(foot.matrixWorld);
}

export function tackleShinPoint(joints: JointMap, out: THREE.Vector3) {
  joints.kneeL!.getWorldPosition(out);
  joints.ankleL!.getWorldPosition(point);
  return out.lerp(point, .86);
}

/** One deterministic timeline for approach, cleat-to-shin contact and reaction.
 * The contact correction uses the real posed bones, independent of zone spacing. */
export function sampleRoadTackle(runner: THREE.Group, defender: THREE.Group, r: JointMap, d: JointMap, origin: TackleOrigins, elapsed: number) {
  const approach = smooth(elapsed / ROAD_TACKLE_CONTACT);
  const fall = smooth((elapsed - ROAD_TACKLE_CONTACT - .035) / .62);
  const slide = smooth(elapsed / .75);
  const settle = smooth((elapsed - .75) / .32);
  for (const joints of [r, d]) for (const joint of Object.values(joints)) setJoint(joint, 0);

  runner.position.copy(origin.runner);
  runner.position.x += fall * 1.18;
  runner.position.z += fall * .32;
  orient(runner, THREE.MathUtils.lerp(origin.runnerYaw, Math.PI / 2, approach), -fall * (1.43 + .12 * settle));
  setJoint(r.spine, (.07 + fall * .24) * (1 - settle) + .04 * settle);
  setJoint(r.hipL, (-.08 + fall * .23) * (1 - settle));
  setJoint(r.hipR, (.08 - fall * .15) * (1 - settle));
  setJoint(r.kneeL, (.12 + fall * .18) * (1 - settle) + .08 * settle);
  setJoint(r.kneeR, (.15 + fall * .15) * (1 - settle) + .08 * settle);
  setJoint(r.ankleL, -.06);
  setJoint(r.shoL, (-.12 - fall * 1.4) * (1 - settle) - 2.8 * settle, 0, .12 + fall * .5);
  setJoint(r.shoR, (-.12 - fall * 1.1) * (1 - settle) - 2.7 * settle, 0, -.12 - fall * .38);
  setJoint(r.elbL, (-.32 - fall * .5) * (1 - settle) - .65 * settle);
  setJoint(r.elbR, (-.32 - fall * .7) * (1 - settle) - .65 * settle);
  setJoint(r.head, -.08 - fall * .1);
  ground(runner, r);

  defender.position.copy(origin.defender).lerp(target.set(origin.runner.x + 1.3 - smooth((elapsed - .46) / .5), 0, origin.runner.z - .3), slide);
  orient(defender, THREE.MathUtils.lerp(origin.defenderYaw, -Math.PI / 2, approach), -approach * .24);
  setJoint(d.spine, .12 + approach * .12);
  setJoint(d.hipL, -.22 - approach * .95);
  setJoint(d.kneeL, .4 - approach * .32);
  setJoint(d.ankleL, 1.25 * approach);
  setJoint(d.hipR, -.22 - approach * 1.33);
  setJoint(d.kneeR, .43 + approach * 1.87);
  setJoint(d.shoL, -.3 + approach * .65, 0, .33 + approach * .35);
  setJoint(d.shoR, -.3 - approach * .4, 0, -.33 - approach * .45);
  setJoint(d.elbL, -.65);
  setJoint(d.elbR, -.8);
  setJoint(d.head, -.1);
  ground(defender, d);

  // Hold the contact briefly, then let the runner travel over the challenge.
  const contactWeight = approach * (1 - smooth((elapsed - .46) / .28));
  if (contactWeight > 0 && d.ankleL && r.ankleL && r.kneeL) {
    tackleShinPoint(r, target);
    tackleBootPoint(defender, d.ankleL, toe);
    defender.position.addScaledVector(target.sub(toe), contactWeight);
    defender.updateMatrixWorld(true);
  }
}

export function RoadTackle({ active, runner, defender, onElapsed }: { active: boolean; runner: RefObject<THREE.Group | null>; defender: RefObject<THREE.Group | null>; onElapsed: (elapsed: number | null) => void }) {
  const state = useRef<{ start: number; origin: TackleOrigins; r: JointMap; d: JointMap } | null>(null);
  useFrame(({ clock: frameClock }) => {
    if (!active) { state.current = null; onElapsed(null); return; }
    const a = runner.current, b = defender.current;
    if (!a || !b) return;
    if (!state.current || !jointsAttached(a, state.current.r) || !jointsAttached(b, state.current.d)) {
      const r = resolveJoints(a), d = resolveJoints(b);
      if (!r || !d) return;
      state.current = { start: frameClock.elapsedTime, r, d, origin: { runner: a.position.clone(), defender: b.position.clone(), runnerYaw: a.rotation.y, defenderYaw: b.rotation.y } };
    }
    const { start, r, d, origin } = state.current;
    const elapsed = frameClock.elapsedTime - start;
    onElapsed(elapsed);
    sampleRoadTackle(a, b, r, d, origin, elapsed);
  }, -.5);
  return null;
}
