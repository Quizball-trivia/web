import * as THREE from 'three';
import { shotFlight } from './ballPhysics';
import type { FootballStyle } from './footballActions';

/** Authored aerodynamic accents over gravity; all styles share exact contact times. */
export const SHOT_PROFILES = {
  power: { curve: .09, lift: 0, flutter: .035, spin: 5 },
  samba: { curve: .28, lift: .12, flutter: 0, spin: 13 },
  left: { curve: -.50, lift: .22, flutter: 0, spin: 26 },
  curl: { curve: .58, lift: .32, flutter: 0, spin: 24 },
  neymar: { curve: .38, lift: .18, flutter: 0, spin: 18 },
  carlos: { curve: -.68, lift: .10, flutter: 0, spin: 30 },
  neutral: { curve: .12, lift: .08, flutter: 0, spin: 15 },
  composed: { curve: .16, lift: .06, flutter: 0, spin: 20 },
} satisfies Record<FootballStyle, { curve: number; lift: number; flutter: number; spin: number }>;

export function sampleStyledShot(out: THREE.Vector3, origin: THREE.Vector3, target: THREE.Vector3, elapsed: number, duration: number, style: FootballStyle, lateralAxis: 'x' | 'z' = 'x') {
  shotFlight(out, origin, target, elapsed, duration);
  const u = THREE.MathUtils.clamp(elapsed / duration, 0, 1);
  const profile = SHOT_PROFILES[style];
  const envelope = 4 * u * (1 - u);
  out[lateralAxis] += profile.curve * envelope + profile.flutter * Math.sin(2 * Math.PI * u) * envelope * envelope;
  // Extra early lift falls away toward contact, giving the curled shots a late dip.
  out.y += profile.lift * 16 * u * (1 - u) * (1 - u);
  return out;
}
