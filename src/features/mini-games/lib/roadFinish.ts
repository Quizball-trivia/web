import * as THREE from 'three';
import { sampleSavedBall, type KeeperSaveStyle } from './keeperSaves';
import { bounceHeight } from './ballPhysics';
import { sampleStyledShot } from './playerShotPhysics';
import type { FootballStyle } from './footballActions';

export const ROAD_GOAL_X = 1.5 + 11 * 3.25 + 1.9;
export const ROAD_SHOT_X = 1.5 + 9 * 3.25 + .9;
export const ROAD_SHOT_RELEASE = .45;
export const ROAD_SHOT_CONTACT = .45 + .78 * .88;
export const ROAD_GOAL_IMPACT = 1.35;
export interface RoadFinishState { started: number | null; elapsed: number | null; saved: boolean; catchPoint: THREE.Vector3 }
export function updateRoadFinish(state: RoadFinishState, progress: number, phase: string, now: number) {
  const active = progress >= 10 && ['correct', 'complete', 'tackle', 'tackled'].includes(phase);
  if (!active) { state.started = null; state.elapsed = null; return; }
  if (state.started === null) { state.started = now; state.saved = phase === 'tackle' || phase === 'tackled'; }
  state.elapsed = now - state.started;
}
const origin = new THREE.Vector3(ROAD_SHOT_X + .65, .17, 1.28);
const impact = new THREE.Vector3(ROAD_GOAL_X + 1.63, 2.15, 3.95);
const localSave = new THREE.Vector3(1.85, 1.45, .42);
const save = new THREE.Vector3(ROAD_GOAL_X - .735, 2.5375, 4.0375);
export function sampleRoadShot(out: THREE.Vector3, elapsed: number, saved: boolean, catchPoint: THREE.Vector3, style: KeeperSaveStyle = 'catch', playerStyle: FootballStyle = 'power') {
  const arrival = saved ? ROAD_SHOT_CONTACT : ROAD_GOAL_IMPACT;
  if (elapsed < arrival) return sampleStyledShot(out, origin, saved ? save : impact, elapsed - ROAD_SHOT_RELEASE, arrival - ROAD_SHOT_RELEASE, playerStyle, 'z');
  if (saved) {
    if (style === 'catch') return out.copy(catchPoint);
    sampleSavedBall(out, localSave, catchPoint, elapsed - arrival, style, .17 / 1.75);
    return out.set(ROAD_GOAL_X - out.z * 1.75, out.y * 1.75, .8 + out.x * 1.75);
  }
  const t = elapsed - arrival;
  return out.set(impact.x - .55 * (1 - Math.exp(-t * 3)), bounceHeight(impact.y, -.4, t, .17), impact.z - .15 * (1 - Math.exp(-t * 3)));
}
