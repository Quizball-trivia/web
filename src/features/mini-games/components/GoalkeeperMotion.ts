import * as THREE from 'three';
import type { KeeperSaveStyle } from '../lib/keeperSaves';
import { setJoint, type JointMap, type JointName } from './ScoreGoalsPlayer3D';

export const KEEPER_CONTACT_S = .45 + .78 * .88;
const smooth = (t: number) => { const u = THREE.MathUtils.clamp(t, 0, 1); return u * u * (3 - 2 * u); };
const a = new THREE.Vector3(), b = new THREE.Vector3(), c = new THREE.Vector3();
const direction = new THREE.Vector3(), bend = new THREE.Vector3(), elbow = new THREE.Vector3();
const delta = new THREE.Quaternion(), parent = new THREE.Quaternion();
const point = new THREE.Vector3(), centre = new THREE.Vector3(), handTarget = new THREE.Vector3();
const palmNormal = new THREE.Vector3(), fingers = new THREE.Vector3(), across = new THREE.Vector3();
const desiredWorld = new THREE.Quaternion(), desiredLocal = new THREE.Quaternion();
const orientation = new THREE.Matrix4();
interface FingerPose { bone: THREE.Bone; rest: THREE.Quaternion; axis: THREE.Vector3; sign: number; thumb: boolean }
const fingerRigs = new WeakMap<THREE.Object3D, FingerPose[]>();
function poseGloveFingers(root: THREE.Object3D, curl: number) {
  let rig = fingerRigs.get(root);
  if (!rig) {
    rig = [];
    let skeleton: THREE.Skeleton | undefined;
    root.traverse(node => { if (!skeleton && (node as THREE.SkinnedMesh).isSkinnedMesh) skeleton = (node as THREE.SkinnedMesh).skeleton; });
    if (skeleton) for (const [index, bone] of skeleton.bones.entries()) {
      if (!/^(index|middle|ring|pinky|thumb)_0[123]_[lr]$/.test(bone.name)) continue;
      const bind = skeleton.boneInverses[index].clone().invert();
      const world = new THREE.Quaternion().setFromRotationMatrix(bind);
      const parentIndex = skeleton.bones.indexOf(bone.parent as THREE.Bone);
      if (parentIndex >= 0) bind.premultiply(skeleton.boneInverses[parentIndex]);
      rig.push({ bone, rest: new THREE.Quaternion().setFromRotationMatrix(bind), axis: new THREE.Vector3(0, 1, 0).applyQuaternion(world.invert()), sign: bone.name.endsWith('_l') ? -1 : 1, thumb: bone.name.startsWith('thumb') });
    }
    fingerRigs.set(root, rig);
  }
  for (const finger of rig) finger.bone.quaternion.copy(finger.rest).multiply(delta.setFromAxisAngle(finger.axis, finger.sign * (finger.thumb ? .12 : curl)));
}
const rollAxis = new THREE.Vector3(0, 0, 1);
const supports: [JointName, number][] = [['ankleL', .065], ['ankleR', .065], ['kneeL', .09], ['kneeR', .09], ['pelvis', .16], ['torso', .16]];

function aimBone(bone: THREE.Object3D, child: THREE.Object3D, target: THREE.Vector3) {
  bone.getWorldPosition(a); child.getWorldPosition(b);
  b.sub(a).normalize(); c.copy(target).sub(a).normalize();
  delta.setFromUnitVectors(b, c);
  bone.parent!.getWorldQuaternion(parent);
  delta.premultiply(parent.clone().invert()).multiply(parent);
  bone.quaternion.premultiply(delta);
  bone.updateWorldMatrix(false, true);
}

/** Analytic two-bone reach. Elbows bend outside the torso instead of twisting
 * the shoulders until the palms happen to intersect the ball. */
export function reachArm(j: JointMap, side: 'L' | 'R', target: THREE.Vector3, bodyRotation?: THREE.Quaternion) {
  const shoulder = j[`sho${side}`]!, forearm = j[`elb${side}`]!, hand = j[`hand${side}`]!;
  shoulder.getWorldPosition(a); forearm.getWorldPosition(b); hand.getWorldPosition(c);
  const upper = a.distanceTo(b), lower = b.distanceTo(c);
  direction.copy(target).sub(a);
  const distance = THREE.MathUtils.clamp(direction.length(), .025, upper + lower - .001);
  direction.normalize();
  bend.set(side === 'L' ? .55 : -.55, -.45, bodyRotation ? -.65 : .85);
  if (bodyRotation) bend.applyQuaternion(bodyRotation);
  bend.addScaledVector(direction, -bend.dot(direction)).normalize();
  const along = (upper * upper - lower * lower + distance * distance) / (2 * distance);
  const height = Math.sqrt(Math.max(0, upper * upper - along * along));
  elbow.copy(a).addScaledVector(direction, along).addScaledVector(bend, height);
  aimBone(shoulder, forearm, elbow);
  aimBone(forearm, hand, target);
}

function groundKeeper(root: THREE.Object3D, j: JointMap, planted: boolean) {
  root.updateMatrixWorld(true);
  let minimum = Infinity;
  for (const [name, radius] of supports) if (j[name]) minimum = Math.min(minimum, j[name]!.getWorldPosition(point).y - radius);
  if (minimum < 0 || planted) { root.position.y -= minimum; root.updateMatrixWorld(true); }
}

function sampleGoalkeeperPose(root: THREE.Group, j: JointMap, target: readonly [number, number], time: number, saved: boolean, catchPoint: THREE.Vector3, style: KeeperSaveStyle = 'catch') {
  const side = Math.sign(target[0]), high = target[1] > 1.2;
  const reaction = saved ? .5 : .62;
  const reach = smooth((time - reaction) / (KEEPER_CONTACT_S - reaction));
  const land = smooth((time - KEEPER_CONTACT_S - .06) / .68);
  const gather = smooth((time - KEEPER_CONTACT_S) / (style === 'catch' ? .42 : .5));
  const deflect = style !== 'catch';
  const load = Math.sin(Math.PI * smooth((time - .18) / .38)) * (1 - reach);
  const lead = side >= 0 ? 'L' : 'R';
  const diveAngle = high ? 1.0 : 1.35;
  const extension = deflect ? 2.04 : 2.0;
  const x = target[0] - side * (saved ? Math.sin(diveAngle) * extension : 1.75);
  const lift = side ? target[1] - Math.cos(diveAngle) * extension : (high ? .25 : -.5);
  for (const joint of Object.values(j)) setJoint(joint, 0);
  root.position.set(x * reach + side * land * .16, (lift * reach + Math.sin(reach * Math.PI) * .28) * (1 - land), .18);
  root.quaternion.setFromAxisAngle(rollAxis, -side * reach * THREE.MathUtils.lerp(diveAngle, 1.46, land));
  setJoint(j.spine, .12 * (1 - reach) + land * .12 + (!side && !high ? .45 * reach : 0));
  setJoint(j.hipL, THREE.MathUtils.lerp(-.36 - load * .14, side ? .12 : high ? -.1 : -1.05, reach));
  setJoint(j.hipR, THREE.MathUtils.lerp(-.36 - load * .14, side ? -.15 : high ? -.1 : -1.05, reach));
  setJoint(j.kneeL, (.68 + load * .26) * (1 - reach) + reach * (side ? .35 + land * .4 : high ? .2 : 1.95));
  setJoint(j.kneeR, (.68 + load * .26) * (1 - reach) + reach * (side ? .75 + land * .3 : high ? .2 : 1.95));
  setJoint(j.shoL, -.55, 0, -.08); setJoint(j.shoR, -.55, 0, .08);
  setJoint(j.elbL, -.9); setJoint(j.elbR, -.9);
  setJoint(j.head, -.05, side * reach * .08);
  groundKeeper(root, j, reach === 0 || (!side && !high));

  // The target stays fixed through contact. Once caught, it follows the chest
  // as the keeper cushions the ball and lands; the ball uses this same point.
  centre.set(target[0] * (saved ? 1 : .72), target[1] - (saved ? 0 : .2), .42);
  if (gather > 0) {
    j.torso!.getWorldPosition(point);
    point.add(new THREE.Vector3(0, -.08, .32).applyQuaternion(root.quaternion));
    centre.lerp(point, gather);
  }
  poseGloveFingers(root, style === 'catch' ? .12 + gather * .18 : .06);
  for (const arm of ['L', 'R'] as const) {
    const hand = j[`hand${arm}`]!;
    hand.getWorldPosition(handTarget);
    const sign = arm === 'L' ? 1 : -1;
    const activeHand = !deflect || arm === lead;
    // A complete palm frame fixes the twist left undefined by a finger-only aim.
    // Fingers extend along local Y; the mirrored palms face local +/-X.
    const scoop = !side && !high;
    fingers.set(sign * .12, activeHand ? scoop ? -.8 : 1 : -1, scoop ? .6 : .08).applyQuaternion(root.quaternion).normalize();
    palmNormal.set(deflect ? 0 : -sign * .55, scoop ? .6 : 0, 1).applyQuaternion(root.quaternion);
    palmNormal.addScaledVector(fingers, -palmNormal.dot(fingers)).normalize();
    across.crossVectors(palmNormal, fingers).multiplyScalar(sign).normalize();
    orientation.makeBasis(point.copy(palmNormal).multiplyScalar(sign), fingers, across);
    desiredWorld.setFromRotationMatrix(orientation);
    point.copy(centre).addScaledVector(palmNormal, style === 'tip' ? -.015 : -.12).addScaledVector(fingers, style === 'tip' ? -.29 : -.08);
    if (!activeHand) {
      j.torso!.getWorldPosition(point);
      point.add(new THREE.Vector3(-sign * .24, -.16, .22).applyQuaternion(root.quaternion));
    }
    handTarget.lerp(point, reach);
    reachArm(j, arm, handTarget, root.quaternion);
    hand.parent!.getWorldQuaternion(parent);
    desiredLocal.copy(parent).invert().multiply(desiredWorld);
    hand.quaternion.slerp(desiredLocal, reach);
  }
  root.updateMatrixWorld(true);
  // Contact is the centre between the glove surfaces, not an offset from wrists.
  catchPoint.set(0, 0, 0);
  let contacts = 0;
  for (const arm of ['L', 'R'] as const) {
    if (deflect && arm !== lead) continue;
    const sign = arm === 'L' ? 1 : -1;
    point.set(sign * (style === 'tip' ? .015 : .12), style === 'tip' ? .29 : .08, 0);
    j[`hand${arm}`]!.localToWorld(point);
    catchPoint.add(point); contacts++;
  }
  catchPoint.multiplyScalar(1 / contacts);
}

/** Solve in pitch coordinates before restoring any rotated/scaled scene mount. */
export function sampleGoalkeeper(root: THREE.Group, j: JointMap, target: readonly [number, number], time: number, saved: boolean, catchPoint: THREE.Vector3, style: KeeperSaveStyle = 'catch') {
  const mount = root.parent;
  root.parent = null;
  try { sampleGoalkeeperPose(root, j, target, time, saved, catchPoint, style); }
  finally { root.parent = mount; }
  if (mount) { mount.updateWorldMatrix(true, false); catchPoint.applyMatrix4(mount.matrixWorld); }
  root.updateWorldMatrix(true, true);
}
