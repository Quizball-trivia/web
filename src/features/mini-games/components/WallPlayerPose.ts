import * as THREE from 'three';
import type { JointMap } from './ScoreGoalsPlayer3D';
import { reachArm } from './GoalkeeperMotion';

const centre = new THREE.Vector3(), target = new THREE.Vector3();
const normal = new THREE.Vector3(), fingers = new THREE.Vector3(), across = new THREE.Vector3();
const body = new THREE.Quaternion(), parent = new THREE.Quaternion(), wrist = new THREE.Quaternion();
const frame = new THREE.Matrix4();

/** A low protective hold: wrists stay on their own sides, palms face the body,
 * and the hands overlap vertically instead of crossing the forearms. */
export function poseWallHands(root: THREE.Object3D, joints: JointMap) {
  root.updateWorldMatrix(true, true);
  root.getWorldQuaternion(body);
  joints.pelvis!.getWorldPosition(centre);
  for (const side of ['L', 'R'] as const) {
    const sign = side === 'L' ? 1 : -1;
    target.set(sign * .07, side === 'L' ? .045 : .09, side === 'L' ? .25 : .275)
      .applyQuaternion(body).add(centre);
    reachArm(joints, side, target, body);
    // The hand rig's fingers run along +Y and its mirrored palm normals +/-X.
    normal.set(0, 0, -sign).applyQuaternion(body);
    fingers.set(-sign * .38, -.925, 0).normalize().applyQuaternion(body);
    across.crossVectors(normal, fingers).normalize();
    frame.makeBasis(normal, fingers, across);
    wrist.setFromRotationMatrix(frame);
    const hand = joints[`hand${side}`]!;
    hand.parent!.getWorldQuaternion(parent);
    hand.quaternion.copy(parent.invert()).multiply(wrist);
  }
  root.updateWorldMatrix(false, true);
}
