/**
 * Zone match 3D view: pitch geometry and where the two players stand for a duel. Pure numbers, no three.js.
 *
 * World axes: x runs along the pitch with the player's goal on the left (−x) and the opponent's on the right (+x),
 * matching `pitchColumn` and the 2D ball strip; the broadcast camera sits on the +z touchline; y is up.
 * Players are avatar cut-outs (≈2.3 units tall figures); PLAYER_SCALE is the scale of the keeper-dive frame below.
 */

import type { AttackZone, Possession, ZoneSide } from './zoneMatch.rules';

/** Length of one zone; the centre zone is [-ZONE_LEN/2, ZONE_LEN/2]. */
export const ZONE_LEN = 14;
/** Goal lines at ±GOAL_X; the outer zones run from ±ZONE_LEN/2 to the goal line. */
export const GOAL_X = 25;
/** Touchlines at ±PITCH_HALF_W. */
export const PITCH_HALF_W = 15;
export const PLAYER_SCALE = 1.75;
export const BALL_R = 0.17;
/** Where the ball sits for a shot (attack frame: distance from the halfway line towards the target goal). */
export const SHOT_U = 16.5;
/** The defending keeper's mount, just off the goal line. */
export const KEEPER_U = GOAL_X - 0.45;
/** The goal net's ripple pocket (RoadGoal's net), as seen from the attacker: back of the net, near the far post. */
export const NET_POCKET = { depth: 1.63, height: 2.15, lateral: 3.15 } as const;

export const SIDE_COLOR: Record<ZoneSide, string> = { player: '#1CB0F6', opponent: '#FF4B4B' };

const ZONE_U: Record<AttackZone, number> = { own: -ZONE_LEN, centre: 0, opponent: ZONE_LEN };
const ZONE_INDEX: Record<AttackZone, number> = { own: 0, centre: 1, opponent: 2 };

/** +1 when the side attacks the right-hand goal (the player), −1 for the opponent. */
export const attackDir = (side: ZoneSide): 1 | -1 => (side === 'player' ? 1 : -1);
export const zoneIndex = (zone: AttackZone): number => ZONE_INDEX[zone];

/** Yaw (rotation about +y) that turns the rig's +z forward towards (dx, dz). */
export const yawToward = (dx: number, dz: number): number => Math.atan2(dx, dz);

/** Which zone column (0 = player's side … 2 = opponent's side) holds world x. */
export function columnAt(x: number): 0 | 1 | 2 {
  return x < -ZONE_LEN / 2 ? 0 : x > ZONE_LEN / 2 ? 2 : 1;
}

/** World x of a zone column's centre. */
export const columnX = (column: number): number => (column - 1) * ZONE_LEN;

export interface Spot {
  x: number;
  z: number;
  yaw: number;
}

export interface DuelSpots {
  attacker: Spot;
  defender: Spot;
  ball: { x: number; z: number };
  /** A shot: the defender stands in goal as the keeper. */
  keeper: boolean;
  /** Attack direction along x (+1 towards the opponent's goal). */
  dir: 1 | -1;
}

/** Where the attacker, the defender and the ball are for a duel at `possession`. */
export function duelSpots(possession: Possession): DuelSpots {
  const dir = attackDir(possession.attacker);
  if (possession.zone === 'opponent') {
    const ballZ = dir * 0.8;
    return {
      dir,
      keeper: true,
      ball: { x: dir * SHOT_U, z: ballZ },
      attacker: { x: dir * (SHOT_U - 0.8), z: ballZ - dir * 0.15, yaw: yawToward(dir, 0.08 * dir) },
      defender: { x: dir * KEEPER_U, z: 0, yaw: yawToward(-dir, 0) },
    };
  }
  const u = ZONE_U[possession.zone];
  return {
    dir,
    keeper: false,
    ball: { x: dir * u, z: 0.45 },
    attacker: { x: dir * (u - 0.8), z: 0.45, yaw: yawToward(dir, 0) },
    defender: { x: dir * (u + 2.7), z: -0.25, yaw: yawToward(-dir, 0.1) },
  };
}

/** Back-of-the-net point a goal hits, for the goal that `attacker` shoots at. */
export function netPocket(attacker: ZoneSide): { x: number; y: number; z: number } {
  const dir = attackDir(attacker);
  return { x: dir * (GOAL_X + NET_POCKET.depth), y: NET_POCKET.height, z: dir * NET_POCKET.lateral };
}

/**
 * A keeper-local point (the GoalkeeperMotion frame: x across the goal, y up, z out of the goal, in rig units) in
 * world space, for the keeper defending against `attacker`. Positive x is the side of the net pocket.
 */
export function keeperLocalToWorld(attacker: ZoneSide, x: number, y: number, z: number): { x: number; y: number; z: number } {
  const dir = attackDir(attacker);
  // The keeper faces −dir: rig +z → world −dir·x̂, rig +x → world dir·ẑ.
  return { x: dir * KEEPER_U - dir * z * PLAYER_SCALE, y: y * PLAYER_SCALE, z: dir * x * PLAYER_SCALE };
}
