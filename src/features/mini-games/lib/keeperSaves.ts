import * as THREE from 'three';
import { bounceHeight } from './ballPhysics';
export type KeeperSaveStyle = 'catch' | 'parry' | 'tip';
export function sampleSavedBall(out: THREE.Vector3, contact: THREE.Vector3, held: THREE.Vector3, elapsed: number, style: KeeperSaveStyle, radius = .13) {
  if (style === 'catch') return out.copy(held);
  const t = Math.max(0, elapsed), tip = style === 'tip';
  const travel = (1 - Math.exp(-t * .85)) / .85;
  return out.set(contact.x + (Math.sign(contact.x) || 1) * (tip ? 1.6 : 3.1) * travel, bounceHeight(contact.y, tip ? 3.5 : 1.1, t, radius), contact.z + (tip ? 3.2 : 4.6) * travel);
}
