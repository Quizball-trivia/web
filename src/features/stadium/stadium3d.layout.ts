/**
 * The 3D stadium's shape: the 2D playground's top-down bowl (geometry.ts, the crowd lattice in seats.ts) wrapped
 * round the zone match's pitch as tiered stands. Pure — three.js maths only.
 *
 * The 2D stage is mapped linearly onto the pitch (the 2D turf box → the 3D pitch, goals at ±GOAL_X), with the 2D
 * south stand — where the mosaics and tifos are — on the far side (−z), facing the match's touchline camera. Seats
 * are then pushed out and up from the track by how deep they sit in their stand, so the flat bowl becomes terraces.
 */

import { GOAL_X, PITCH_HALF_W } from '@/features/zone-match/zoneMatch3d.layout';
import { PITCH, STAGE_ASPECT, TRACK } from './geometry';
import { STANDS, type Crowd } from './crowd/seats';

/** 2D stage percent (x of the width, y of the height) → world x / z on the ground. */
const PITCH_CX = PITCH.left + PITCH.width / 2;
const PITCH_CY = PITCH.top + PITCH.height / 2;
const X_PER = (GOAL_X + 1) / (PITCH.width / 2);
const Z_PER = PITCH_HALF_W / (PITCH.height / 2);
export const toWorld = (x: number, y: number): [number, number] => [(x - PITCH_CX) * X_PER, -(y - PITCH_CY) * Z_PER];

/** The track's rounded rectangle, in world units (the stands start at its edge). */
export const TRACK_W = {
  hx: (TRACK.width / 2) * X_PER,
  hz: (TRACK.height / 2) * Z_PER,
  r: 4.5,
};

/** How the bowl is pulled out into terraces: depth gain, rise per unit of depth, the first row's setback and height. */
export const TERRACE = { gain: 1.75, rise: 0.56, setback: 1.6, base: 1.0, row: 1.03 };

/** The nearest point on the track's rounded edge to (x, z), and the outward normal there. */
export function trackEdge(x: number, z: number): { ex: number; ez: number; nx: number; nz: number; out: number } {
  const cx = TRACK_W.hx - TRACK_W.r;
  const cz = TRACK_W.hz - TRACK_W.r;
  const px = Math.max(-cx, Math.min(cx, x));
  const pz = Math.max(-cz, Math.min(cz, z));
  let vx = x - px;
  let vz = z - pz;
  let len = Math.hypot(vx, vz);
  if (len < 1e-6) {
    // Inside the core: push straight out along the nearer side.
    if (cx - Math.abs(x) < cz - Math.abs(z)) {
      vx = Math.sign(x) || 1;
      vz = 0;
    } else {
      vx = 0;
      vz = Math.sign(z) || 1;
    }
    len = 1;
  }
  const nx = vx / len;
  const nz = vz / len;
  return { ex: px + nx * TRACK_W.r, ez: pz + nz * TRACK_W.r, nx, nz, out: len - TRACK_W.r };
}

/** Where a seat at outward depth `d` (world units past the track edge, before the gain) sits in the terraces. */
export function terracePoint(ex: number, ez: number, nx: number, nz: number, d: number): [number, number, number] {
  const out = TERRACE.setback + Math.max(0, d) * TERRACE.gain;
  return [ex + nx * out, TERRACE.base + Math.max(0, d) * TERRACE.gain * TERRACE.rise, ez + nz * out];
}

/** Every fan's place in the stands: position (feet), the direction it faces (towards the pitch), its depth. */
export type FanPlaces = { x: Float32Array; y: Float32Array; z: Float32Array; yaw: Float32Array; depth: Float32Array; tx: Float32Array; tz: Float32Array; nz: Float32Array };

export function placeFans(crowd: Crowd): FanPlaces {
  const n = crowd.count;
  const places: FanPlaces = { x: new Float32Array(n), y: new Float32Array(n), z: new Float32Array(n), yaw: new Float32Array(n), depth: new Float32Array(n), tx: new Float32Array(n), tz: new Float32Array(n), nz: new Float32Array(n) };
  // The mosaic stand (2D south) is read top-down in 2D, its first row (nearest the pitch) the top of the picture; in 3D
  // that row is the bottom of the stand. So its rows are turned over: the 2D front row sits at the back, up top.
  const south = STANDS.indexOf('south');
  let southDeepest = 0;
  for (let i = 0; i < n; i += 1) {
    if (crowd.stand[i] !== south) continue;
    const [wx, wz] = toWorld(crowd.x[i], crowd.y[i]);
    southDeepest = Math.max(southDeepest, trackEdge(wx, wz).out);
  }
  for (let i = 0; i < n; i += 1) {
    const [wx, wz] = toWorld(crowd.x[i], crowd.y[i]);
    const e = trackEdge(wx, wz);
    const out = crowd.stand[i] === south ? southDeepest - e.out : e.out;
    // Snap to the terrace rows, so the fans stand on the steps.
    const d = Math.round(Math.max(0, out) / (TERRACE.row / TERRACE.gain)) * (TERRACE.row / TERRACE.gain);
    const [x, y, z] = terracePoint(e.ex, e.ez, e.nx, e.nz, d);
    places.x[i] = x;
    places.y[i] = y;
    places.z[i] = z;
    places.yaw[i] = Math.atan2(-e.nx, -e.nz);
    places.depth[i] = d;
    // The direction along the stand (for sideways offsets).
    places.tx[i] = -e.nz;
    places.tz[i] = e.nx;
    places.nz[i] = e.nz;
  }
  return places;
}

/** How deep the deepest seats sit (before the gain), for the terraces' size. */
export function deepestRow(crowd: Crowd): number {
  let max = 0;
  for (let i = 0; i < crowd.count; i += 1) {
    const [wx, wz] = toWorld(crowd.x[i], crowd.y[i]);
    max = Math.max(max, trackEdge(wx, wz).out);
  }
  return max;
}

/** 2D offsets are in stage-width percent: world units per percent along the stand, and of jump height. */
export const OFFSET_TO_WORLD = { along: X_PER, up: X_PER * 0.9, aspect: STAGE_ASPECT };
