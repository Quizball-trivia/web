/**
 * Where everything stands in the ორშაბათობა studio, in metres.
 *
 * +Y is up, the camera looks down -Z at the back wall, Tato sits on the
 * left (-X) and Kala on the right (+X) — the same framing as the show's
 * main camera. The desk is a shallow crescent: its front edge is an arc
 * whose centre lies behind the wall, so it bows toward the viewer.
 */

export const STUDIO_FONT_FAMILY = 'OrshabatobaSign';
export const STUDIO_FONT_URL = '/assets/orshabatoba/fonts/noto-sans-georgian-900.woff2';
export const BETSSON_WHITE_URL = '/assets/betsson/5.png';

export const STUDIO_COLORS = {
  background: '#050403',
  slat: '#3a2415',
  slatBacking: '#0d0805',
  desk: '#5a3b23',
  deskFascia: '#3b2617',
  concrete: '#121211',
  turf: '#2f6a1e',
  neonWhite: '#fff8ec',
  neonYellow: '#ffd21f',
  chair: '#3a3b3e',
  mic: '#141414',
} as const;

export const WALL = {
  z: -2.6,
  halfWidth: 7,
  height: 7,
  /** The plaster panel behind the sign, standing proud of the slats. */
  panelHalfWidth: 1.05,
  panelZ: -2.5,
  shelfY: 1.62,
  shelfDepth: 0.28,
};

export const DESK = {
  /** Centre of the front arc (behind the wall). */
  centerZ: -3.564,
  outerRadius: 4.464,
  depth: 0.95,
  /** ≈1.9 m either side of centre. */
  halfAngle: 0.44,
  topY: 0.77,
  thickness: 0.05,
};

export type HostId = 'tato' | 'kala';

export interface HostSeat {
  id: HostId;
  /** Hips over this floor point. */
  position: readonly [number, number, number];
  /** Yaw: both turn in toward each other. */
  yaw: number;
  /** -1 for Tato (left), +1 for Kala (right): which way is "outboard". */
  side: -1 | 1;
}

/** Bodies turn this far in; necks and heads turn the rest of the way (see StudioHost). */
export const HOST_YAW = (60 * Math.PI) / 180;

export const SEATS: Record<HostId, HostSeat> = {
  tato: { id: 'tato', position: [-1.42, 0, -0.12], yaw: HOST_YAW, side: -1 },
  kala: { id: 'kala', position: [1.42, 0, -0.12], yaw: -HOST_YAW, side: 1 },
};

/** Head bone height once seated (both hosts land within 2 cm of it), for mics and camera aims. */
export const SEATED_HEAD_Y = 1.19;

export interface HostModel {
  lod0: string;
  lod1: string;
  clip: string;
  /**
   * Drop that puts the seated feet on the floor: the clip keeps the hips at
   * their standing height, so the feet hang at a height set by leg length.
   */
  floorOffset: number;
}

export const HOST_MODELS: Record<HostId, HostModel> = {
  // The Table Derby demo's left-seat guest.
  tato: {
    lod0: '/assets/orshabatoba/characters/tato/lod0-m/tato.gltf',
    lod1: '/assets/orshabatoba/characters/tato/lod1-m/tato.gltf',
    clip: 'SeatedIdle',
    floorOffset: -0.3,
  },
  // His body from a generated character sheet, his head from a separate
  // head sculpt painted from his photos; rigged on Tato's skeleton (same bone
  // names and rest orientations, his own joint positions), so the same clip
  // and head turn drive him.
  kala: {
    lod0: '/assets/orshabatoba/characters/kala/lod0-m/kala.gltf',
    lod1: '/assets/orshabatoba/characters/kala/lod1-m/kala.gltf',
    clip: 'SeatedIdle',
    floorOffset: -0.203,
  },
};

export type StudioShot = 'wide' | 'tato' | 'kala' | 'desk' | 'tato-desk' | 'show' | 'tato-smash';

export interface ShotSpec {
  /** What the camera looks at. */
  target: readonly [number, number, number];
  /** Direction from the target to the camera (normalised on use). */
  from: readonly [number, number, number];
  /** Width and height (m) that must stay in frame at the target's depth. */
  fit: readonly [number, number];
  fov: number;
}

export const SHOTS: Record<StudioShot, ShotSpec> = {
  wide: { target: [0, 1.32, -0.9], from: [0, 0.08, 1], fit: [5.6, 2.6], fov: 36 },
  tato: { target: [-1.3, 1.12, -0.1], from: [0.75, 0.12, 1], fit: [1.3, 1.0], fov: 32 },
  kala: { target: [1.3, 1.12, -0.1], from: [-0.75, 0.12, 1], fit: [1.3, 1.0], fov: 32 },
  desk: { target: [0, 0.85, 0.4], from: [0, 0.55, 1], fit: [3.0, 1.4], fov: 36 },
  /** Tato with his laptop and the desk in front of him: for the smash. */
  'tato-desk': { target: [-0.95, 1.0, 0.0], from: [0.45, 0.3, 1], fit: [2.2, 1.5], fov: 34 },
  /** Live Show: a host at each edge of a 16:9 frame, the middle left free for the question panel. */
  show: { target: [0, 1.12, -0.3], from: [0, 0.1, 1], fit: [3.8, 1.9], fov: 36 },
  /** Live Show: Tato and his laptop in the left half of the frame, the panel docked on the right. */
  'tato-smash': { target: [-0.3, 1.0, 0.0], from: [0.45, 0.3, 1], fit: [2.2, 1.5], fov: 34 },
};

/** Point on the desk's front arc at angle θ (radians, 0 = facing the camera). */
export function deskArcPoint(radius: number, theta: number): [number, number] {
  return [radius * Math.sin(theta), DESK.centerZ + radius * Math.cos(theta)];
}
