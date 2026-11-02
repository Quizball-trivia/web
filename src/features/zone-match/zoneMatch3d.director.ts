/**
 * Zone match 3D view: the choreography. Every frame the director places both players, the ball and the camera from
 * the match state:
 *
 * - idle (cards / question): each player jogs to their duel spot (`duelSpots`) and waits there — the attacker on the
 *   ball, the defender jockeying, or in goal as the keeper when the attacker is shooting;
 * - bullet time (number tiebreak): both frozen shoulder to shoulder while the camera orbits;
 * - sky shot (the tiebreak's reveal): side by side facing the camera, both kick a ball up into the sky (the balls, the
 *   number scale and the answer line are the screen's overlay, ZoneMatchSkyShot);
 * - outcome: a short timed script per result (dribble past, tackle, shot + keeper dive/save, loose ball, block), then
 *   the same "settle" as idle carries everyone to the next duel's spots.
 *
 * The players are cut-outs of their real avatar art on drawn legs (AvatarFullBody, placed by ZoneMatch3DCutouts from
 * `poseOf`): run cycles, the kick's plant / wind-up / follow-through, the slide tackle with the leg out, the keeper's
 * stretched dive, the sprawl, a celebration jump with the knees up. Clip names in the scripts name those moves.
 */

import * as THREE from 'three';
import { bounceHeight, shotFlight } from '@/features/mini-games/lib/ballPhysics';
import { sampleSavedBall, type KeeperSaveStyle } from '@/features/mini-games/lib/keeperSaves';
import { GLOVES_SAVE_NOTE } from './zoneMatch.machine';
import { otherZoneSide, type BattleOutcome, type Possession, type ZoneSide } from './zoneMatch.rules';
import { NO_CARDS, hasResult, type ScriptCards } from './zoneMatch3d.fx';
import {
  STAND,
  celebratePose,
  divePose,
  idlePose,
  jockeyPose,
  keeperSetPose,
  runPose,
  slidePose,
  sprawlPose,
  strikePose,
  FULL_GROUND,
  FULL_H,
  FULL_W,
  type FullBodyPose,
} from './zoneMatch.fullBody';
import {
  BALL_R,
  GOAL_X,
  PITCH_HALF_W,
  PLAYER_SCALE,
  columnAt,
  duelSpots,
  keeperLocalToWorld,
  netPocket,
  yawToward,
  zoneIndex,
  type DuelSpots,
} from './zoneMatch3d.layout';

export type DirectorMode = 'idle' | 'bullet' | 'sky' | 'outcome';

/** Sky shot: seconds from the mode's start to the boots meeting the balls (the overlay launches them then). */
export const SKY_KICK_AT = 0.75;

export interface DirectorInput {
  mode: DirectorMode;
  /** idle / bullet: the duel being played; outcome: where the ball goes next (MatchState.possession). */
  possession: Possession;
  /** outcome only: where the duel was played (MatchState.outcomeFrom). */
  from: Possession | null;
  outcome: BattleOutcome | null;
  /** Changes whenever a new duel / step starts; an outcome script restarts when it changes. */
  key: string;
  /** Picks the celebration. */
  seed: number;
  /** Cards that shape the outcome animation. */
  cards: ScriptCards;
}

type ClipName = string;
interface MoveFrame {
  kind: 'move';
  x: number;
  z: number;
  yaw?: number;
  /** 'run' = the dribble cycle synced to ground speed. */
  clip: ClipName | 'run';
  time?: number;
  loop?: boolean;
  blend?: number;
  /** Place the rig so its striking boot meets the ball at this point. */
  alignKick?: { x: number; z: number };
  /** Ease towards the frame instead of jumping (bullet time). */
  glide?: boolean;
}
interface KeeperFrame {
  kind: 'keeper';
  x: number;
  z: number;
  yaw: number;
  time: number;
  target: [number, number];
  style: KeeperSaveStyle;
}
type ActorFrame = MoveFrame | KeeperFrame | { kind: 'tackle' } | { kind: 'hold' } | { kind: 'settle' };
type BallFrame =
  | { kind: 'feet'; side: ZoneSide }
  | { kind: 'at'; x: number; y: number; z: number; glide?: boolean }
  | { kind: 'catch'; side: ZoneSide }
  | { kind: 'loose' }
  | { kind: 'settle' };
interface CamHint {
  focus: { x: number; z: number };
  span: number;
  /** Bullet time: circle the focus, centred on this yaw (0 = the +z touchline camera). */
  orbit?: number;
  /** A fixed camera position looking at the focus (at `lookY`), instead of the touchline framing. */
  from?: { x: number; y: number; z: number };
  lookY?: number;
}
interface TackleSpec {
  start: number;
  end: number;
  runner: ZoneSide;
  origin: { x: number; z: number };
  theta: number;
  /** Start spots in the tackle's frame (runner attacking +x from `origin`). */
  canon: { runner: { x: number; z: number }; defender: { x: number; z: number } };
}
interface Script {
  kind: string;
  /** After this every actor and the ball settle; Infinity = hold until the next step (a goal). */
  end: number;
  actor(side: ZoneSide, t: number): ActorFrame;
  ball(t: number): BallFrame;
  lit(t: number): ZoneSide;
  cam?(t: number): CamHint | null;
  net?(t: number): number;
  tackle?: TackleSpec;
  /** Card effects on top (keeps running after `end`, while the outcome lasts). */
  fx?(t: number): ScriptFx;
}

const clamp01 = (t: number) => Math.min(1, Math.max(0, t));
const seg = (t: number, t0: number, t1: number) => clamp01((t - t0) / (t1 - t0));
const smooth = (t: number) => { const u = clamp01(t); return u * u * (3 - 2 * u); };
const easeInOut = (t: number) => { const u = clamp01(t); return u < 0.5 ? 2 * u * u : 1 - (-2 * u + 2) ** 2 / 2; };
const lerp = THREE.MathUtils.lerp;
const bump = (x: number, centre: number, width: number) => Math.exp(-(((x - centre) / width) ** 2));
const GRAVITY = 15;
const BLEND_IN = 0.35;
/** The broadcast lens (the Canvas camera's fov). */
export const BASE_FOV = 36;

/**
 * "Card between the players" (desktop steps): the players stand apart, one each side of the screen, with the step's
 * card floating between them. The camera faces them square on, so a world x maps straight to a screen x.
 */
/** Half the visible height the framing keeps: the figure (≈3.35) plus its nameplate, around SPLIT_LOOK_Y. */
const SPLIT_HALF_HEIGHT = 2.6;
const SPLIT_LOOK_Y = 2.05;
/** A figure's half-width on the pitch (arms out a little), and the gap kept clear of the card. */
const SPLIT_FIGURE_HALF = 1.15;
const SPLIT_CLEAR = 0.25;
/** The share of the half-width a figure's outer edge may reach (a little margin at the screen edge). */
const SPLIT_EDGE = 0.95;
/** A card this wide (share of the half-width) or wider still leaves the figures this much room to fit into. */
const SPLIT_MIN_ROOM = 0.12;
const CELEBRATIONS = ['celebrate_siu', 'celebrate_sky', 'celebrate_samba', 'celebrate', 'celebrate_fold'];
/** Strike clips are sampled faster than authored; boot meets ball at clip time 0.8 (as in Road to Goal). */
const STRIKE_RATE = 0.8 / 0.45;
/** Sky shot: each player this far either side of the duel's ball, a step towards the camera. */
const SKY_GAP = 2.3;
const SKY_Z = 1.2;
const STRIKE_CONTACT = 0.45;

function angleLerp(a: number, b: number, t: number): number {
  const d = Math.atan2(Math.sin(b - a), Math.cos(b - a));
  return a + d * t;
}
function angleDamp(a: number, b: number, lambda: number, dt: number): number {
  return angleLerp(a, b, 1 - Math.exp(-lambda * dt));
}

/* ── scripts ─────────────────────────────────────────────────────────── */

function idleFrame(spots: DuelSpots, role: 'attacker' | 'defender'): MoveFrame {
  const spot = spots[role];
  if (role === 'attacker') return { kind: 'move', x: spot.x, z: spot.z, yaw: spot.yaw, clip: spots.keeper ? 'stance_power' : 'outfield_idle' };
  return { kind: 'move', x: spot.x, z: spot.z, yaw: spot.yaw, clip: spots.keeper ? 'keeper_idle' : 'jockey' };
}

/** A translucent "ghost" player (Tiki-Taka teammate, Park the Bus wall, Dummy Run decoy) in `side`'s colours. */
export interface GhostFx {
  side: ZoneSide;
  x: number;
  y: number;
  z: number;
  yaw: number;
  clip: string;
  time: number;
  opacity: number;
  /** Dummy Run's decoy: wears a "?" and dissolves as the bluff is revealed. */
  bluff?: boolean;
}

/** What an outcome script adds on top of the players and the ball (drawn by ZoneMatch3DEffects). */
export interface ScriptFx {
  ghosts: GhostFx[];
  /** Players leaving a speed trail. */
  trail: ZoneSide[];
  /** The ball's trail: Golden Boot's gold, or the arc of a Long Ball. */
  ballTrail: 'gold' | 'white' | null;
  /** Golden Boot: whose boots glow (0–1 strength). */
  goldBoots: { side: ZoneSide; glow: number } | null;
  /** Goalkeeper Gloves in use this outcome (the save, or beaten by a Golden Boot), and a flash at the touch. */
  gloves: { side: ZoneSide; flash: number; beaten: boolean } | null;
  /** Offside Trap: the linesman's flag on the far touchline (up 0–1). */
  flag: { x: number; up: number } | null;
  /** Camera rush / speed lines, 0–1. */
  rush: number;
  /** Park the Bus: the bus parked across the attack at (x, z) facing `dir`; `burst` 0–1 knocks it aside (Golden Boot). */
  bus: { x: number; z: number; dir: number; burst: number } | null;
  /** Long Ball: its dotted trajectory, drawn from (x0, z0) to (x1, z1) peaking at `height`. */
  arc: { x0: number; z0: number; x1: number; z1: number; height: number; fade: number } | null;
}

export const NO_FX: ScriptFx = { ghosts: [], trail: [], ballTrail: null, goldBoots: null, gloves: null, flag: null, rush: 0, bus: null, arc: null };
const fx = (patch: Partial<ScriptFx>): ScriptFx => ({ ...NO_FX, ...patch });

/** Park the Bus: the bus across the attack at `x` (pushed aside from `burstAt`, by a Golden Boot). */
function busAt(x: number, z: number, dir: number, t: number, burstAt = Infinity): ScriptFx['bus'] {
  return { x, z, dir, burst: Number.isFinite(burstAt) ? seg(t, burstAt, burstAt + 0.45) : 0 };
}

const ramp = (t: number, t0: number, t1: number, fadeIn = 0.25, fadeOut = 0.35) => smooth(seg(t, t0, t0 + fadeIn)) * (1 - smooth(seg(t, t1 - fadeOut, t1)));

interface AdvanceOpts {
  /** Captain's Armband moved it two zones: sprint burst. */
  sprint: boolean;
  /** Tiki-Taka: a one-two with a ghost teammate on the way. */
  tiki: boolean;
  /** First Touch: a crisp flick over the defender instead of the dribble round. */
  flick?: boolean;
}

/** Attacker wins: dribble round the defender into the next zone (or two); the defender is wrong-footed and chases back. */
function advanceScript(from: Possession, next: Possession, opts: AdvanceOpts = { sprint: false, tiki: false }): Script {
  const A = from.attacker;
  const s0 = duelSpots(from);
  const s1 = duelSpots(next);
  const d = s0.dir;
  const steps = Math.max(1, zoneIndex(next.zone) - zoneIndex(from.zone));
  const runEnd = 0.3 + 0.9 + (opts.sprint ? 0.5 : 0.75) * steps;
  const defX = s0.defender.x;
  const lungeX = defX - d * 0.9;
  const lungeZ = s0.defender.z + 1.1;
  const lungeEnd = 0.95;
  const chaseDist = Math.hypot(s1.defender.x - lungeX, s1.defender.z - lungeZ);
  const chaseEnd = Math.min(3.15, Math.max(runEnd + 0.35, lungeEnd + 0.3 + chaseDist / 12));
  // Tiki-Taka goes round the defender with a pass, so the run stays straight.
  const swerve = opts.tiki ? 0.4 : 1.8;
  const attackerAt = (t: number) => {
    const k = easeInOut(seg(t, 0, runEnd));
    const x = lerp(s0.attacker.x, s1.attacker.x, k);
    return { x, z: lerp(s0.attacker.z, s1.attacker.z, k) + swerve * bump(x, defX - d * 0.4, 3.4) };
  };
  // Tiki-Taka one-two: pass to a ghost teammate wide and ahead, who plays it back into the runner's path.
  const passOut = 0.45;
  const ghostHit = 0.9;
  const backAt = 1.4;
  const ghost = { x: defX + d * 1.5, z: s0.defender.z + 3.6 };
  const passFrom = (() => {
    const a = attackerAt(passOut);
    return { x: a.x + d * 0.8, z: a.z };
  })();
  const passTo = (() => {
    const a = attackerAt(backAt);
    return { x: a.x + d * 0.85, z: a.z };
  })();
  return {
    kind: 'advance',
    end: 3.3,
    actor(side, t) {
      if (side === A) {
        if (t < runEnd) return { kind: 'move', ...attackerAt(t), clip: 'run' };
        return { kind: 'settle' };
      }
      const a = attackerAt(t);
      if (t < 0.45) {
        const x = defX - d * 0.3 * smooth(t / 0.45);
        return { kind: 'move', x, z: s0.defender.z, yaw: yawToward(a.x - x, a.z - s0.defender.z), clip: 'jockey', time: t * 1.4 };
      }
      if (t < lungeEnd) {
        const k = smooth(seg(t, 0.45, lungeEnd));
        const x = lerp(defX - d * 0.3, lungeX, k);
        const z = lerp(s0.defender.z, lungeZ, k);
        return { kind: 'move', x, z, yaw: yawToward(a.x - x, a.z - z), clip: 'jockey', time: 0.63 + k * 0.4, loop: false };
      }
      if (t < chaseEnd) {
        const k = easeInOut(seg(t, lungeEnd + 0.12, chaseEnd));
        return { kind: 'move', x: lerp(lungeX, s1.defender.x, k), z: lerp(lungeZ, s1.defender.z, k), clip: 'run' };
      }
      return { kind: 'settle' };
    },
    ball(t) {
      if (opts.flick && t > 0.35 && t < 1.0) {
        // Flicked up and over the defender, collected beyond them.
        const k = seg(t, 0.35, 1.0);
        const a = attackerAt(0.35);
        const b = attackerAt(1.0);
        return { kind: 'at', x: lerp(a.x + d * 0.8, b.x + d * 0.9, k), y: BALL_R + 4 * 1.9 * k * (1 - k), z: lerp(a.z, b.z, k) };
      }
      if (!opts.tiki || t < passOut) return { kind: 'feet', side: A };
      if (t < ghostHit) {
        const k = seg(t, passOut, ghostHit);
        return { kind: 'at', x: lerp(passFrom.x, ghost.x - d * 0.2, k), y: BALL_R, z: lerp(passFrom.z, ghost.z - 0.5, k) };
      }
      if (t < backAt) {
        const k = seg(t, ghostHit, backAt);
        return { kind: 'at', x: lerp(ghost.x - d * 0.2, passTo.x, k), y: BALL_R, z: lerp(ghost.z - 0.5, passTo.z, k) };
      }
      return { kind: 'feet', side: A };
    },
    lit: () => A,
    fx(t) {
      const rush = opts.sprint ? ramp(t, 0.25, runEnd, 0.3, 0.45) : 0;
      const ghosts: GhostFx[] = opts.tiki && t < 2.1
        ? [{
            side: A,
            x: ghost.x,
            y: 0,
            z: ghost.z,
            yaw: t < ghostHit ? yawToward(passFrom.x - ghost.x, passFrom.z - ghost.z) : yawToward(passTo.x - ghost.x, passTo.z - ghost.z),
            clip: t < ghostHit - 0.5 ? 'outfield_idle' : 'strike',
            time: t < ghostHit - 0.5 ? t : (t - (ghostHit - 0.45)) * STRIKE_RATE,
            opacity: 0.55 * ramp(t, 0.15, 2.1, 0.3, 0.5),
          }]
        : [];
      return fx({ rush, trail: opts.sprint && t < runEnd + 0.2 ? [A] : [], ghosts });
    },
    // Stay with the runner (the defender is left behind).
    cam: (t) => (t > 0.3 && t < runEnd ? { focus: attackerAt(t + 0.25), span: opts.sprint ? 6 : 7.5 } : null),
  };
}

interface ShotOpts {
  /** Hold the shot back (seconds), e.g. while a card's activation still covers the screen. */
  lead?: number;
  /** Golden Boot: gold boots and a golden trail. */
  golden?: boolean;
  /** Golden Boot beats Park the Bus: the ball goes through a ghost wall. */
  throughBus?: boolean;
  /** Golden Boot beats Goalkeeper Gloves: the keeper gets glowing gloves to it, and it goes in anyway. */
  throughGloves?: boolean;
  /** Long Ball: a lob straight in from where the attacker stands. */
  lob?: boolean;
  /** Captain's Armband: sprint before the long-range strike. */
  sprint?: boolean;
  /** Park the Bus at a shot: a ghost wall blocks it instead of the keeper. */
  wall?: boolean;
  /** Goalkeeper Gloves make the save. */
  gloves?: boolean;
}

/** A shot (or, from further out, a dribble then a long-range strike): goal, keeper save, parry or block. */
function shotScript(from: Possession, result: 'goal' | 'save' | 'parry' | 'block', seed: number, opts: ShotOpts = {}): Script {
  const lead = opts.lead ?? 0;
  const A = from.attacker;
  const D = otherZoneSide(A);
  const s0 = duelSpots(from);
  const d = s0.dir;
  const keeper = s0.keeper;
  const runEnd = keeper || opts.lob ? lead : 0.8;
  const ballX0 = keeper || opts.lob ? s0.ball.x : s0.ball.x + d * 5.6;
  const ballZ0 = keeper || opts.lob ? s0.ball.z : s0.ball.z + 1.3;
  const strikeT = runEnd + 0.3;
  const contactT = strikeT + STRIKE_CONTACT;
  const ball0 = new THREE.Vector3(ballX0, BALL_R, ballZ0);
  const wallX = ballX0 + d * 3.6;
  const keeperTarget: [number, number] =
    result === 'goal' ? (opts.throughGloves ? [1.55, 1.15] : [-1.8, 1.3]) : result === 'save' ? [1.5, 1.25] : [1.5, 0.95];
  const saveStyle: KeeperSaveStyle = result === 'save' ? 'catch' : 'parry';
  const contactLocal = new THREE.Vector3(keeperTarget[0], keeperTarget[1], 0.42);
  const pocket = netPocket(A);
  const target =
    result === 'goal'
      ? new THREE.Vector3(pocket.x, pocket.y, pocket.z)
      : result === 'block' && opts.wall
        ? new THREE.Vector3(wallX - d * 0.4, 1.1, ballZ0)
        : (() => {
            const w = keeperLocalToWorld(A, keeperTarget[0], keeperTarget[1], 0.42);
            return new THREE.Vector3(w.x, w.y, w.z);
          })();
  const dist = ball0.distanceTo(target);
  const flight = opts.lob ? 1.7 : THREE.MathUtils.clamp(dist / 19, 0.35, 1.0);
  const arrival = contactT + flight;
  // The keeper's clock: a save meets the ball at KEEPER_CONTACT_S; a beaten keeper commits a beat after the strike.
  const keeperT0 = result === 'goal' && !opts.throughGloves ? contactT - 0.55 : arrival - KEEPER_CONTACT_S - (opts.throughGloves ? 0.08 : 0);
  // Golden Boot through the gloves: the moment the ball passes the keeper's hands.
  const glovesTouch = arrival - flight * 0.12;
  const wallPass = contactT + flight * Math.min(1, 3.6 / Math.max(dist, 1));
  const shotYaw = yawToward(target.x - ballX0, target.z - ballZ0);
  const strikeEnd = strikeT + 0.95;
  const celebrateFrom = { x: ballX0 - d * 0.8, z: ballZ0 };
  const celebrateTo = keeper ? { x: ballX0 + d * 1.2, z: Math.min(PITCH_HALF_W - 3, ballZ0 + 5) } : { x: ballX0 + d * 4, z: Math.min(PITCH_HALF_W - 3, ballZ0 + 3) };
  const celebrateAt = strikeEnd + (keeper ? 0.75 : 0.45);
  const celebration = CELEBRATIONS[Math.abs(seed) % CELEBRATIONS.length];
  const tmp = new THREE.Vector3();
  const reboundTo = { x: s0.ball.x, z: s0.ball.z };
  const end = result === 'goal' ? Infinity : (result === 'save' ? 2.75 : 2.5) + lead;
  const keeperActs = keeper && !(result === 'block' && opts.wall);
  return {
    kind: `shot-${result}`,
    end,
    actor(side, t) {
      if (side === A) {
        if (!keeper && !opts.lob && t < runEnd) {
          const k = easeInOut(t / runEnd);
          const x = lerp(s0.attacker.x, ballX0 - d * 0.8, k);
          return { kind: 'move', x, z: lerp(s0.attacker.z, ballZ0, k) + 0.9 * bump(x, s0.defender.x, 2.6), clip: 'run' };
        }
        if (t < strikeT) return { kind: 'move', x: 0, z: 0, yaw: shotYaw, clip: 'stance_power', time: t, alignKick: { x: ballX0, z: ballZ0 }, blend: 0.15 };
        if (t < strikeEnd) {
          return { kind: 'move', x: 0, z: 0, yaw: shotYaw, clip: 'strike_power', time: (t - strikeT) * STRIKE_RATE, loop: false, alignKick: { x: ballX0, z: ballZ0 }, blend: 0.08 };
        }
        if (result === 'goal') {
          if (t < celebrateAt) {
            const k = easeInOut(seg(t, strikeEnd, celebrateAt));
            return { kind: 'move', x: lerp(celebrateFrom.x, celebrateTo.x, k), z: lerp(celebrateFrom.z, celebrateTo.z, k), clip: 'run' };
          }
          return { kind: 'move', ...celebrateTo, yaw: 0, clip: celebration, time: t - celebrateAt, loop: false, blend: 0.35 };
        }
        if (t < end) return { kind: 'move', x: 0, z: 0, yaw: shotYaw, clip: 'outfield_idle', time: t, alignKick: { x: ballX0, z: ballZ0 } };
        return { kind: 'settle' };
      }
      // Defender.
      if (keeper) {
        if (!keeperActs || t < keeperT0 - 0.05) {
          return t < end ? { kind: 'move', x: s0.defender.x, z: s0.defender.z, yaw: s0.defender.yaw, clip: 'keeper_idle' } : { kind: 'settle' };
        }
        if (t < Math.min(end, arrival + 1.3)) {
          return { kind: 'keeper', x: s0.defender.x, z: s0.defender.z, yaw: s0.defender.yaw, time: Math.max(0, t - keeperT0), target: keeperTarget, style: saveStyle };
        }
        return t < end ? { kind: 'hold' } : { kind: 'settle' };
      }
      // Long range: the outfield defender is beaten, then turns to watch it fly in.
      const def = s0.defender;
      if (t < 0.85) {
        const k = smooth(seg(t, 0.3, 0.85));
        const x = def.x - d * 0.6 * k;
        const z = def.z + 1.0 * k;
        return { kind: 'move', x, z, yaw: yawToward(-d, 0.6), clip: 'jockey', time: t * 1.3 };
      }
      if (t < 2.3) {
        const k = easeInOut(seg(t, 0.95, 2.3));
        return { kind: 'move', x: def.x - d * 0.6 + d * 4 * k, z: def.z + 1.0 - 0.6 * k, clip: 'run' };
      }
      return { kind: 'move', x: def.x + d * 3.4, z: def.z + 0.4, yaw: yawToward(d, 0.2), clip: 'outfield_idle', time: t };
    },
    ball(t) {
      if (!keeper && !opts.lob && t < runEnd) return { kind: 'feet', side: A };
      if (t < contactT) return { kind: 'at', x: ballX0, y: BALL_R, z: ballZ0, glide: t < runEnd + 0.2 };
      if (t < arrival) {
        if (opts.lob) {
          // A high lofted ball dropping in under the bar.
          const k = (t - contactT) / flight;
          return { kind: 'at', x: lerp(ballX0, target.x, k), y: lerp(BALL_R, target.y, k) + 4 * 7 * k * (1 - k), z: lerp(ballZ0, target.z, k) };
        }
        shotFlight(tmp, ball0, target, t - contactT, flight, result === 'goal' ? -d * 0.35 : 0);
        return { kind: 'at', x: tmp.x, y: tmp.y, z: tmp.z };
      }
      const after = t - arrival;
      if (result === 'goal') {
        const e = 1 - Math.exp(-after * 3);
        return { kind: 'at', x: target.x - d * 0.55 * e, y: bounceHeight(target.y, -0.4, after, BALL_R), z: target.z };
      }
      if (result === 'save') return t < end ? { kind: 'catch', side: D } : { kind: 'settle' };
      if (result === 'block') {
        // Back to the shooter's feet, off the keeper's hands or the wall.
        const k = seg(after, 0, 0.9);
        const y = Math.max(BALL_R, lerp(target.y, BALL_R, k) + 2.2 * k * (1 - k));
        return after < 0.9 ? { kind: 'at', x: lerp(target.x, reboundTo.x, easeInOut(k)), y, z: lerp(target.z, reboundTo.z, easeInOut(k)) } : { kind: 'settle' };
      }
      if (after > 1.25) return { kind: 'loose' };
      sampleSavedBall(tmp, contactLocal, contactLocal, after, 'parry', BALL_R / PLAYER_SCALE);
      const w = keeperLocalToWorld(A, tmp.x, tmp.y, tmp.z);
      return { kind: 'at', x: w.x, y: Math.max(BALL_R, w.y), z: w.z };
    },
    lit: (t) => (result === 'goal' || result === 'block' || t < arrival ? A : D),
    cam(t) {
      if (result === 'goal' && t > arrival + 0.25) return { focus: { x: celebrateTo.x, z: celebrateTo.z - 0.5 }, span: 5 };
      if (opts.sprint && t > 0.15 && t < runEnd) return { focus: { x: ballX0, z: ballZ0 }, span: 6 };
      // Long range or a lob: from behind the shooter, down the pitch as the ball flies into the net.
      if ((!keeper || opts.lob) && t > contactT + 0.1) {
        return { focus: { x: d * (GOAL_X - 1), z: target.z * 0.5 }, span: 9, from: { x: ballX0 - d * 2.5, y: 3.8 + (opts.lob ? 2 : 0), z: ballZ0 + 10 }, lookY: opts.lob ? 2.6 : 1.6 };
      }
      return null;
    },
    net: (t) => (result === 'goal' ? t - arrival : -1),
    fx(t) {
      // The bus parked across the shot: the ball cannons off it, or a Golden Boot blasts it aside.
      const bus = opts.throughBus ? busAt(wallX, ballZ0, d, t, wallPass) : opts.wall ? busAt(wallX, ballZ0, d, t) : null;
      const goldBoots = opts.golden && t < strikeEnd + 0.4 ? { side: A, glow: 0.45 + 0.55 * ramp(t, strikeT - 0.3, strikeEnd + 0.4, 0.3, 0.4) } : null;
      const gloves =
        opts.throughGloves ? { side: D, flash: ramp(t, glovesTouch - 0.1, glovesTouch + 0.35, 0.1, 0.25), beaten: t > glovesTouch }
        : opts.gloves ? { side: D, flash: ramp(t, arrival - 0.1, arrival + 0.5, 0.1, 0.3), beaten: false }
        : null;
      return fx({
        bus,
        goldBoots,
        ballTrail: opts.golden && t > contactT && t < arrival + 0.5 ? 'gold' : opts.lob && t > contactT && t < arrival + 0.3 ? 'white' : null,
        gloves,
        trail: opts.sprint && t < runEnd + 0.1 ? [A] : [],
        rush: opts.sprint ? ramp(t, 0.1, runEnd + 0.1, 0.25, 0.3) : opts.golden ? 0.5 * ramp(t, contactT, arrival, 0.08, 0.2) : 0,
      });
    },
  };
}

interface TackleOpts {
  /** Counter-Attack: the tackler breaks away with a speed trail. */
  counter: boolean;
}

/** Defender wins away from goal: a sliding tackle, the ball runs loose to the tackler. */
function tackleScript(from: Possession, opts: TackleOpts = { counter: false }): Script {
  const A = from.attacker;
  const D = otherZoneSide(A);
  const s0 = duelSpots(from);
  const d = s0.dir;
  const theta = d > 0 ? 0 : Math.PI;
  const origin = { x: s0.attacker.x, z: s0.attacker.z };
  // World ↔ the tackle's canonical frame (runner attacks +x).
  const toWorld = (cx: number, cz: number) => ({ x: origin.x + d * cx, z: origin.z + d * cz });
  const defCanon = { x: d * (s0.defender.x - origin.x) - 0.45, z: d * (s0.defender.z - origin.z) };
  const start = 0.35;
  const end = start + 1.1;
  const contact = start + TACKLE_CONTACT;
  const runner = toWorld(0.5, 0);
  const defStart = toWorld(defCanon.x, defCanon.z);
  const pop0 = toWorld(0.5 + 0.85, 0);
  const pop1 = toWorld(-0.8, -1.7);
  return {
    kind: 'tackle',
    end: 2.2,
    tackle: {
      start,
      end,
      runner: A,
      origin,
      theta,
      canon: { runner: { x: 0.5, z: 0 }, defender: { x: defCanon.x, z: defCanon.z } },
    },
    actor(side, t) {
      if (t < start) {
        const k = smooth(t / start);
        if (side === A) return { kind: 'move', x: lerp(s0.attacker.x, runner.x, k), z: lerp(s0.attacker.z, runner.z, k), yaw: yawToward(d, 0), clip: 'run' };
        return { kind: 'move', x: lerp(s0.defender.x, defStart.x, k), z: lerp(s0.defender.z, defStart.z, k), yaw: yawToward(-d, 0), clip: 'jockey', time: t * 1.5 };
      }
      if (t < end) return { kind: 'tackle' };
      if (side === A && t < 2.2) return { kind: 'hold' };
      return { kind: 'settle' };
    },
    ball(t) {
      if (t < contact) return { kind: 'feet', side: A };
      const k = seg(t, contact, contact + 0.8);
      if (k < 1) {
        const e = 1 - (1 - k) ** 2;
        return { kind: 'at', x: lerp(pop0.x, pop1.x, e), y: bounceHeight(BALL_R + 0.1, 3.2, k * 0.8, BALL_R, 0.4), z: lerp(pop0.z, pop1.z, e) };
      }
      return { kind: 'loose' };
    },
    lit: (t) => (t < contact ? A : D),
    // The break runs on in the settle after the script: the trail and rush outlast it.
    fx: opts.counter ? (t) => fx({ trail: t > end && t < 3.3 ? [D] : [], rush: 0.7 * ramp(t, end, 3.1, 0.3, 0.6) }) : undefined,
  };
}

/** Both wrong: a heavy touch cannons off the defender, then off the attacker, and drops loose between them. */
function looseBallScript(from: Possession): Script {
  const A = from.attacker;
  const D = otherZoneSide(A);
  const s0 = duelSpots(from);
  const d = s0.dir;
  const aEnd = { x: s0.attacker.x + d * 0.7, z: s0.attacker.z };
  const p0 = { x: s0.ball.x, z: s0.ball.z };
  const p1 = { x: s0.defender.x - d * 0.75, z: s0.defender.z + 0.15 };
  const p2 = { x: aEnd.x + d * 0.75, z: aEnd.z + 0.5 };
  const p3 = { x: (aEnd.x + s0.defender.x) / 2, z: s0.ball.z - 2.2 };
  const tmp = { x: 0, z: 0 };
  const at = (a: { x: number; z: number }, b: { x: number; z: number }, k: number) => {
    tmp.x = lerp(a.x, b.x, k);
    tmp.z = lerp(a.z, b.z, k);
    return tmp;
  };
  const ballAt = (t: number) => {
    if (t < 0.55) {
      const p = at(p0, p1, easeInOut(t / 0.55));
      return { x: p.x, y: BALL_R, z: p.z };
    }
    if (t < 1.0) {
      const k = seg(t, 0.55, 1.0);
      const p = at(p1, p2, k);
      return { x: p.x, y: BALL_R + 1.4 * 4 * k * (1 - k), z: p.z };
    }
    const k = seg(t, 1.0, 1.85);
    const p = at(p2, p3, k);
    return { x: p.x, y: BALL_R + 2.8 * 4 * k * (1 - k), z: p.z };
  };
  return {
    kind: 'loose',
    end: 2.1,
    actor(side, t) {
      const b = ballAt(Math.min(t, 1.85));
      if (side === A) {
        if (t < 0.55) {
          const k = smooth(t / 0.55);
          return { kind: 'move', x: lerp(s0.attacker.x, aEnd.x, k), z: aEnd.z, yaw: yawToward(d, 0), clip: 'run' };
        }
        if (t < 2.0) return { kind: 'move', ...aEnd, yaw: yawToward(b.x - aEnd.x, b.z - aEnd.z), clip: 'outfield_idle', time: t };
        return { kind: 'settle' };
      }
      if (t < 1.5) {
        const x = s0.defender.x - d * 0.3 * smooth(t / 0.5);
        return { kind: 'move', x, z: s0.defender.z, yaw: yawToward(b.x - x, b.z - s0.defender.z), clip: 'jockey', time: t * 1.2 };
      }
      return { kind: 'settle' };
    },
    ball(t) {
      if (t >= 1.85) return { kind: 'loose' };
      const b = ballAt(t);
      return { kind: 'at', ...b, glide: t < 0.15 };
    },
    lit: (t) => (t < 1.0 ? A : D),
  };
}

/** Park the Bus: the attacker drives at the parked bus, the ball cannons back off it and the attacker resets. */
function blockedScript(from: Possession): Script {
  const A = from.attacker;
  const s0 = duelSpots(from);
  const d = s0.dir;
  const push = { x: s0.attacker.x + d * 1.0, z: s0.attacker.z };
  const wallX = s0.attacker.x + d * 2.9;
  const hit = { x: wallX - d * 0.45, z: push.z };
  return {
    kind: 'blocked',
    end: 2.2,
    actor(side, t) {
      if (side === A) {
        if (t < 0.6) {
          const k = easeInOut(t / 0.6);
          return { kind: 'move', x: lerp(s0.attacker.x, push.x, k), z: push.z, yaw: yawToward(d, 0), clip: 'run' };
        }
        if (t < 1.0) return { kind: 'move', ...push, yaw: yawToward(d, 0), clip: 'outfield_idle', time: t };
        if (t < 1.9) {
          const k = easeInOut(seg(t, 1.0, 1.9));
          return { kind: 'move', x: lerp(push.x, s0.attacker.x, k), z: push.z, yaw: yawToward(d, 0), clip: 'jockey', time: t * 1.2 };
        }
        return { kind: 'settle' };
      }
      if (t < 1.6) return { kind: 'move', x: s0.defender.x, z: s0.defender.z, yaw: s0.defender.yaw, clip: 'jockey', time: t * 1.6 };
      return { kind: 'settle' };
    },
    ball(t) {
      if (t < 0.5) return { kind: 'feet', side: A };
      if (t < 0.68) {
        const k = seg(t, 0.5, 0.68);
        return { kind: 'at', x: lerp(push.x + d * 0.8, hit.x, k), y: BALL_R, z: lerp(push.z, hit.z, k) };
      }
      if (t < 1.2) {
        const k = seg(t, 0.68, 1.2);
        return { kind: 'at', x: lerp(hit.x, push.x + d * 0.7, k), y: BALL_R + 0.9 * 4 * k * (1 - k), z: lerp(hit.z, push.z, k) };
      }
      return { kind: 'feet', side: A };
    },
    lit: () => A,
    fx: (t) => fx({ bus: busAt(wallX, push.z, d, t) }),
  };
}

/** Long Ball: a lofted ball over the defender — the attacker runs onto it, or the defender cuts it out. */
function longBallScript(from: Possession, next: Possession, lands: boolean): Script {
  const A = from.attacker;
  const D = otherZoneSide(A);
  const s0 = duelSpots(from);
  const s1 = duelSpots(next);
  const d = s0.dir;
  const strikeEnd = 0.75;
  const contactT = STRIKE_CONTACT;
  const shotYaw = yawToward(d, 0);
  const land = lands ? { x: s1.ball.x, z: s1.ball.z } : { x: s0.defender.x - d * 0.5, z: s0.defender.z };
  const flight = lands ? 1.55 : 0.75;
  const arrival = contactT + flight;
  const height = lands ? 6.5 : 2.2;
  const runTo = lands ? s1.attacker : s0.attacker;
  const ballAt = (t: number) => {
    const k = seg(t, contactT, arrival);
    return { x: lerp(s0.ball.x, land.x, k), y: lerp(BALL_R, lands ? BALL_R : 1.3, k) + 4 * height * k * (1 - k), z: lerp(s0.ball.z, land.z, k) };
  };
  return {
    kind: lands ? 'long-ball' : 'long-ball-cut',
    end: lands ? 3.2 : 2.0,
    actor(side, t) {
      if (side === A) {
        if (t < strikeEnd) return { kind: 'move', x: 0, z: 0, yaw: shotYaw, clip: 'strike', time: t * STRIKE_RATE, loop: false, alignKick: s0.ball, blend: 0.1 };
        if (lands && t < arrival + 0.25) {
          const k = easeInOut(seg(t, strikeEnd, arrival + 0.25));
          return { kind: 'move', x: lerp(s0.attacker.x, runTo.x, k), z: lerp(s0.attacker.z, runTo.z, k), clip: 'run' };
        }
        if (!lands && t < 1.6) return { kind: 'move', x: s0.attacker.x + d * 0.6, z: s0.attacker.z, yaw: shotYaw, clip: 'outfield_idle', time: t };
        return { kind: 'settle' };
      }
      const b = ballAt(t);
      if (lands) {
        // Watches it sail over, then turns and chases back.
        if (t < 1.1) return { kind: 'move', x: s0.defender.x, z: s0.defender.z, yaw: yawToward(b.x - s0.defender.x, b.z - s0.defender.z), clip: 'jockey', time: t };
        if (t < 2.9) {
          const k = easeInOut(seg(t, 1.1, 2.9));
          return { kind: 'move', x: lerp(s0.defender.x, s1.defender.x, k), z: lerp(s0.defender.z, s1.defender.z, k), clip: 'run' };
        }
        return { kind: 'settle' };
      }
      // Steps under it and takes it down.
      if (t < arrival) {
        const k = smooth(seg(t, contactT, arrival));
        return { kind: 'move', x: lerp(s0.defender.x, land.x + d * 0.6, k), z: lerp(s0.defender.z, land.z, k), yaw: s0.defender.yaw, clip: 'jockey', time: t };
      }
      return { kind: 'settle' };
    },
    ball(t) {
      if (t < contactT) return { kind: 'at', x: s0.ball.x, y: BALL_R, z: s0.ball.z, glide: t < 0.2 };
      if (t < arrival) return { kind: 'at', ...ballAt(t) };
      if (lands) return t < arrival + 0.3 ? { kind: 'at', x: land.x, y: bounceHeight(BALL_R, 2.5, t - arrival, BALL_R), z: land.z } : { kind: 'feet', side: A };
      return { kind: 'settle' };
    },
    lit: (t) => (lands || t < arrival ? A : D),
    // Ride along under the ball as it sails over.
    cam: (t) => {
      if (t < contactT || t > arrival + 0.2) return null;
      const b = ballAt(Math.min(t + 0.15, arrival));
      return { focus: { x: b.x, z: b.z * 0.5 }, span: 9, lookY: 1.3 + b.y * 0.55 };
    },
    fx: (t) =>
      fx({
        ballTrail: t > contactT && t < arrival + 0.2 ? 'white' : null,
        // The whole flight path, dotted, from the strike until just after it lands.
        arc: t > contactT - 0.15 && t < arrival + 0.6 ? { x0: s0.ball.x, z0: s0.ball.z, x1: land.x, z1: land.z, height, fade: 1 - seg(t, arrival + 0.2, arrival + 0.6) } : null,
      }),
  };
}

/** Offside Trap: the linesman's flag goes up, the attacker freezes, and the defender takes the ball. */
function offsideScript(from: Possession): Script {
  const A = from.attacker;
  const D = otherZoneSide(A);
  const s0 = duelSpots(from);
  const d = s0.dir;
  const stop = { x: s0.attacker.x + d * (s0.keeper ? 0 : 1.4), z: s0.attacker.z };
  const rollTo = { x: stop.x + d * 2.4, z: stop.z - 0.3 };
  return {
    kind: 'offside',
    end: 2.3,
    actor(side, t) {
      if (side === A) {
        if (t < 0.55 && !s0.keeper) {
          const k = easeInOut(t / 0.55);
          return { kind: 'move', x: lerp(s0.attacker.x, stop.x, k), z: stop.z, yaw: yawToward(d, 0), clip: 'run' };
        }
        // Frozen mid-stride while the flag stays up.
        return t < 2.1 ? { kind: 'hold' } : { kind: 'settle' };
      }
      if (t < 1.1) return { kind: 'move', x: s0.defender.x, z: s0.defender.z, yaw: s0.defender.yaw, clip: s0.keeper ? 'keeper_idle' : 'jockey', time: t };
      return { kind: 'settle' };
    },
    ball(t) {
      if (t < 0.5) return { kind: 'feet', side: A };
      if (t < 1.2) {
        const k = 1 - (1 - seg(t, 0.5, 1.2)) ** 2;
        return { kind: 'at', x: lerp(stop.x + d * 0.8, rollTo.x, k), y: BALL_R, z: lerp(stop.z, rollTo.z, k) };
      }
      return { kind: 'settle' };
    },
    lit: (t) => (t < 0.6 ? A : D),
    cam: (t) => (t < 2.1 ? { focus: { x: stop.x + d * 1.2, z: -4 }, span: 9 } : null),
    fx: (t) => fx({ flag: t < 2.4 ? { x: stop.x, up: ramp(t, 0.3, 2.4, 0.25, 0.3) } : null }),
  };
}

/**
 * A clean steal near the attacker's own goal: the slide tackle, then the tackler gets straight up, lines up the loose
 * ball and fires it into the net the attacker was defending; celebration while the tackled attacker gets up.
 */
function stealScoreScript(from: Possession, seed: number): Script {
  const base = tackleScript(from);
  const tackle = base.tackle!;
  const A = from.attacker;
  const D = otherZoneSide(A);
  const d = duelSpots(from).dir;
  const origin = tackle.origin;
  // Where the tackle pops the ball (tackleScript's pop1), towards the goal the stealer now attacks.
  const ball0 = new THREE.Vector3(origin.x + d * -0.8, BALL_R, origin.z + d * -1.7);
  const pocket = netPocket(D);
  const target = new THREE.Vector3(pocket.x, pocket.y, pocket.z);
  const strikeT = 1.95;
  const contactT = strikeT + STRIKE_CONTACT;
  const flight = THREE.MathUtils.clamp(ball0.distanceTo(target) / 19, 0.4, 1.0);
  const arrival = contactT + flight;
  const strikeEnd = strikeT + 0.95;
  const shotYaw = yawToward(target.x - ball0.x, target.z - ball0.z);
  const celebrateFrom = { x: ball0.x + d * 0.6, z: ball0.z };
  const celebrateTo = { x: ball0.x - d * 2.5, z: Math.min(PITCH_HALF_W - 3, ball0.z + 4) };
  const celebrateAt = strikeEnd + 0.4;
  const celebration = CELEBRATIONS[Math.abs(seed) % CELEBRATIONS.length];
  const tmp = new THREE.Vector3();
  const tackleContact = tackle.start + TACKLE_CONTACT;
  return {
    ...base,
    kind: 'steal-score',
    end: Infinity,
    actor(side, t) {
      if (t < tackle.end) return base.actor(side, t);
      if (side === A) return t < 2.9 ? { kind: 'hold' } : { kind: 'settle' };
      if (t < strikeT) return { kind: 'move', x: 0, z: 0, yaw: shotYaw, clip: 'run', alignKick: { x: ball0.x, z: ball0.z }, glide: true };
      if (t < strikeEnd) return { kind: 'move', x: 0, z: 0, yaw: shotYaw, clip: 'strike_power', time: (t - strikeT) * STRIKE_RATE, loop: false, alignKick: { x: ball0.x, z: ball0.z }, blend: 0.08 };
      if (t < celebrateAt) {
        const k = easeInOut(seg(t, strikeEnd, celebrateAt));
        return { kind: 'move', x: lerp(celebrateFrom.x, celebrateTo.x, k), z: lerp(celebrateFrom.z, celebrateTo.z, k), clip: 'run' };
      }
      return { kind: 'move', ...celebrateTo, yaw: 0, clip: celebration, time: t - celebrateAt, loop: false, blend: 0.35 };
    },
    ball(t) {
      if (t < tackle.end) return base.ball(t);
      if (t < contactT) return { kind: 'at', x: ball0.x, y: BALL_R, z: ball0.z, glide: true };
      if (t < arrival) {
        shotFlight(tmp, ball0, target, t - contactT, flight, d * 0.3);
        return { kind: 'at', x: tmp.x, y: tmp.y, z: tmp.z };
      }
      const after = t - arrival;
      const e = 1 - Math.exp(-after * 3);
      return { kind: 'at', x: target.x + d * 0.55 * e, y: bounceHeight(target.y, -0.4, after, BALL_R), z: target.z };
    },
    lit: (t) => (t < tackleContact ? A : D),
    cam(t) {
      if (t > arrival + 0.25) return { focus: { x: celebrateTo.x, z: celebrateTo.z - 0.5 }, span: 5 };
      if (t > contactT - 0.1) return { focus: { x: (ball0.x + target.x) / 2, z: target.z * 0.5 }, span: Math.abs(target.x - ball0.x) + 4 };
      return null;
    },
    net: (t) => t - arrival,
    fx: undefined,
  };
}

/** Goalkeeper Gloves fires its card at the reveal and the save follows at once: let the card moment clear first. */
const GLOVES_LEAD = 1.2;

export function buildScript(from: Possession, outcome: BattleOutcome, seed: number, cards: ScriptCards = NO_CARDS): Script {
  const shot = from.zone === 'opponent';
  const A = from.attacker;
  const D = otherZoneSide(A);
  const glovesSave = cards.note === GLOVES_SAVE_NOTE;
  switch (outcome.kind) {
    case 'advance':
      if (cards.note === 'Long Ball lands') return longBallScript(from, outcome.next, true);
      return advanceScript(from, outcome.next, {
        sprint: hasResult(cards, 'captains-armband', A) !== null,
        flick: cards.note === 'First Touch',
        tiki: hasResult(cards, 'tiki-taka', A) !== null,
      });
    case 'goal': {
      if (outcome.stolen) return stealScoreScript(from, seed);
      const golden = hasResult(cards, 'golden-boot', A);
      return shotScript(from, 'goal', seed, {
        golden: golden !== null || cards.goldenBoot,
        throughBus: golden?.against === 'park-the-bus',
        throughGloves: (golden !== null || cards.goldenBoot) && cards.keeperGloves && shot,
        lob: cards.note === 'Long Ball lands',
        sprint: !shot && hasResult(cards, 'captains-armband', A) !== null,
      });
    }
    case 'turnover':
      if (cards.note === 'Offside trap!') return offsideScript(from);
      if (cards.note === 'Long Ball cut out') return longBallScript(from, outcome.next, false);
      if (shot) return shotScript(from, 'save', seed, { lead: glovesSave ? GLOVES_LEAD : 0, gloves: glovesSave || cards.keeperGloves });
      return tackleScript(from, { counter: hasResult(cards, 'counter-attack', D) !== null });
    case 'bothWrong':
      return shot ? shotScript(from, 'parry', seed) : looseBallScript(from);
    case 'held':
      return shot ? shotScript(from, 'block', seed, { wall: hasResult(cards, 'park-the-bus', D) !== null }) : blockedScript(from);
  }
}

/* ── director ────────────────────────────────────────────────────────── */

const _v = new THREE.Vector3();
const _v2 = new THREE.Vector3();
const UP = new THREE.Vector3(0, 1, 0);

/** World height of the full-body avatar's frame (AvatarFullBody); the soles stand on CUTOUT_BASE of it. */
export const CUTOUT_H = 3.35;
export const CUTOUT_BASE = FULL_GROUND;
/** The full-body frame's aspect. */
export const CUTOUT_ASPECT = FULL_W / FULL_H;

/**
 * A paper cut-out's pose, in world terms: the avatar art standing on the pitch (ZoneMatch3D projects it). The figure
 * stands on (x, y, z) and leans along `up`; squash & stretch, a spin, a blur and a celebration on top.
 */
export interface CutoutPose {
  x: number;
  y: number;
  z: number;
  /** Unit direction from the figure's base to its top (straight up when standing). */
  up: THREE.Vector3;
  sx: number;
  sy: number;
  /** +1: the art as drawn (running towards +x), −1 mirrored. */
  face: 1 | -1;
  /** A spin about the vertical (radians), for celebrations. */
  spin: number;
  /** Motion blur 0–1 (sprints, slides). */
  blur: number;
  /** When a celebration started (performance clock, s), else 0: confetti. */
  party: number;
  /** The legs and the upper body's lean (AvatarFullBody joints). */
  body: FullBodyPose;
}

export function blankPose(): CutoutPose {
  return { x: 0, y: 0, z: 0, up: UP.clone(), sx: 1, sy: 1, face: 1, spin: 0, blur: 0, party: 0, body: { ...STAND } };
}

/** Lean `out.up` from vertical towards world direction (dx, dz) by `angle` radians. */
function lean(out: CutoutPose, dx: number, dz: number, angle: number) {
  const len = Math.hypot(dx, dz) || 1;
  const s = Math.sin(angle);
  out.up.set((dx / len) * s, Math.cos(angle), (dz / len) * s);
}

/**
 * The cut-out pose for a (formerly skeletal) clip name: runs hop and lean in with squash & stretch, stances bob,
 * jockeying crouches, strikes wind up and lunge, celebrations jump and spin. Pure: ghosts use it too.
 */
export function clipPose(out: CutoutPose, clip: string, time: number, yaw: number, now: number, phase: number, speed = 0): CutoutPose {
  const fx = Math.sin(yaw);
  const fz = Math.cos(yaw);
  if (Math.abs(fx) > 0.2) out.face = fx > 0 ? 1 : -1;
  out.up.copy(UP);
  out.y = 0;
  out.sx = 1;
  out.sy = 1;
  out.spin = 0;
  out.blur = 0;
  if (clip === 'dribble' || clip === 'run') {
    // Alternating strides; a small hop on each footfall.
    const k = Math.min(1, speed / 9);
    Object.assign(out.body, runPose(time * 1.2, 0.4 + k));
    out.y = 0.08 * Math.abs(Math.sin(time * Math.PI * 2.4)) * (0.4 + k);
    lean(out, fx, fz, 0.05 + 0.06 * k);
    out.blur = THREE.MathUtils.clamp((speed - 9) / 8, 0, 0.6);
  } else if (clip === 'jockey') {
    Object.assign(out.body, jockeyPose(time, phase));
  } else if (clip === 'keeper_idle') {
    Object.assign(out.body, keeperSetPose(time, phase));
  } else if (clip.startsWith('strike')) {
    // Plant, wind up, through the ball, follow through.
    Object.assign(out.body, strikePose(time));
  } else if (clip.startsWith('celebrate')) {
    // Jumps with the knees up, a spin on the first.
    Object.assign(out.body, celebratePose(time));
    const c = (time % 0.85) / 0.85;
    out.y = time < 2.6 ? 0.9 * Math.sin(Math.PI * THREE.MathUtils.clamp((c - 0.2) / 0.65, 0, 1)) : 0;
    out.spin = time < 0.9 ? Math.PI * 2 * THREE.MathUtils.smoothstep(time, 0, 0.9) : 0;
    out.party = now - time;
  } else {
    // Stances and idles: weight shifting from foot to foot.
    Object.assign(out.body, idlePose(now, phase));
  }
  return out;
}

interface Actor {
  side: ZoneSide;
  x: number;
  z: number;
  yaw: number;
  speed: number;
  runClock: number;
  phase: number;
  /** keeper / tackle: posed by the script; hold: frozen as it is. */
  proc: 'none' | 'keeper' | 'tackle' | 'hold';
  /** Bouncing back up after a dive or a tackle: from this lean. */
  recover: { start: number; up: THREE.Vector3; y: number } | null;
  capture: { x: number; z: number; yaw: number } | null;
  catchPoint: THREE.Vector3;
  pose: CutoutPose;
  clip: string;
}

/** The keeper's dive meets the ball at this point of its clock (as GoalkeeperMotion's KEEPER_CONTACT_S). */
const KEEPER_CONTACT_S = 0.45 + 0.78 * 0.88;
const TACKLE_CONTACT = 0.34;
/** An elastic 0→1, for bouncing back up. */
const elastic = (t: number) => (t >= 1 ? 1 : 1 - Math.cos(t * Math.PI * 2.4) * Math.exp(-5 * t));

export class DuelDirector {
  private actors: Record<ZoneSide, Actor>;
  private ballMesh: THREE.Object3D | null = null;
  private ball = new THREE.Vector3(0, BALL_R, 0.45);
  private ballPrev = new THREE.Vector3(0, BALL_R, 0.45);
  private ballVel = new THREE.Vector3();
  private ballLoose = false;
  private script: Script | null = null;
  private scriptKey = '';
  private scriptStart = 0;
  private needsCut = true;
  private bulletStart = 0;
  private skyStart = 0;
  /** The card-between-the-players framing is on (desktop steps). */
  private splitting = false;
  private lastMode: DirectorMode = 'idle';
  private camPos = new THREE.Vector3(0, 6, 14);
  private camLook = new THREE.Vector3(0, 1.3, 0);
  private snapCamera = true;
  private camSettled = false;

  /** Outputs read by the scene each frame. */
  readonly focus = new THREE.Vector3();
  lit: { column: 0 | 1 | 2; side: ZoneSide } = { column: 1, side: 'player' };
  netAge: Record<1 | -1, number> = { 1: -1, [-1]: -1 };
  /** The running outcome script's card effects. */
  scriptFx: ScriptFx = NO_FX;
  /** The side standing in goal right now (a shot is on), or null: the keeper puts gloves on for it. */
  keeper: ZoneSide | null = null;
  /** Where the duel on screen is played (the duel just settled, during its result). */
  spots: DuelSpots = duelSpots({ attacker: 'player', zone: 'centre' });
  wantFps = 60;
  /** Effects ask for full frame rate until this time (seconds, performance clock). */
  private busyUntil = 0;
  private rush = 0;

  constructor() {
    const make = (side: ZoneSide, phase: number): Actor => ({
      side,
      x: 0,
      z: 0,
      yaw: 0,
      speed: 0,
      runClock: 0,
      phase,
      proc: 'none',
      recover: null,
      capture: null,
      catchPoint: new THREE.Vector3(),
      pose: blankPose(),
      clip: 'outfield_idle',
    });
    this.actors = { player: make('player', 0), opponent: make('opponent', 1.7) };
  }

  /** Keep the full frame rate while an effect animates (performance clock, seconds). */
  keepBusy(until: number) {
    this.busyUntil = Math.max(this.busyUntil, until);
  }

  /** Camera rush, 0–1 (speed lines follow it). */
  rushLevel(): number {
    return this.rush;
  }

  /** A player's cut-out pose this frame. */
  poseOf(side: ZoneSide): CutoutPose {
    return this.actors[side].pose;
  }

  /** Ground position and facing of a player. */
  placeOf(side: ZoneSide): { x: number; z: number; yaw: number } | null {
    const a = this.actors[side];
    return { x: a.x, z: a.z, yaw: a.yaw };
  }

  attachBall(mesh: THREE.Object3D | null) {
    this.ballMesh = mesh;
  }

  /** The middle of the figure (for the ring, trails and the camera). */
  pelvisOf(side: ZoneSide, out: THREE.Vector3): THREE.Vector3 | null {
    const p = this.actors[side].pose;
    return out.set(p.x, p.y, p.z).addScaledVector(p.up, CUTOUT_H * 0.45 * p.sy);
  }

  /** The top of the head (nameplates, card pop-ups). */
  headOf(side: ZoneSide, out: THREE.Vector3): THREE.Vector3 | null {
    const p = this.actors[side].pose;
    return out.set(p.x, p.y, p.z).addScaledVector(p.up, CUTOUT_H * (CUTOUT_BASE - 0.03) * p.sy);
  }

  /**
   * @param split desktop's step card: the distance from the screen centre to the card's edge plus a gap, as a share of
   *   the half-width; 0 (or a result playing) frames the duel as usual.
   * @param both between results, frame both players whole (phone: they share a band above the step card).
   */
  update(input: DirectorInput, now: number, rawDt: number, camera: THREE.PerspectiveCamera, aspect: number, split = 0, both = false) {
    const dt = Math.min(Math.max(rawDt, 1e-4), 0.1);
    const duel = duelSpots(input.possession);

    // A new outcome starts its script; leaving a goal cuts straight to the kick-off positions.
    if (input.key !== this.scriptKey) {
      const wasGoal = this.script?.kind === 'shot-goal' || this.script?.kind === 'steal-score';
      this.scriptKey = input.key;
      this.script = input.mode === 'outcome' && input.from && input.outcome ? buildScript(input.from, input.outcome, input.seed, input.cards) : null;
      this.scriptStart = now;
      if (wasGoal && !this.script) this.needsCut = true;
      for (const a of Object.values(this.actors)) a.capture = { x: a.x, z: a.z, yaw: a.yaw };
    }
    if (input.mode === 'bullet' && this.lastMode !== 'bullet') this.bulletStart = now;
    if (input.mode === 'sky' && this.lastMode !== 'sky') this.skyStart = now;
    this.lastMode = input.mode;

    const script = this.script;
    const t = now - this.scriptStart;
    const active = script && t < script.end ? script : null;
    const blendIn = active && t < BLEND_IN ? smooth(t / BLEND_IN) : null;
    // Between results on desktop: the players step apart either side of the card (the ball waits between them).
    const splitting = split > 0 && !active && input.mode !== 'outcome';
    const splitFit = splitting ? this.splitFit(duel, split, aspect) : null;
    const spots = splitFit ? splitFit.spots : duel;
    this.splitting = splitFit !== null;
    if (this.needsCut) this.cut(spots, input.possession.attacker, now);

    // Players.
    const tackle = active?.tackle && t >= active.tackle.start && t < active.tackle.end ? active.tackle : null;
    if (tackle) this.runTackle(tackle, t - tackle.start);
    for (const side of ['player', 'opponent'] as const) {
      const a = this.actors[side];
      const frame: ActorFrame = active
        ? active.actor(side, t)
        : input.mode === 'sky'
          ? this.skyFrame(side, duel, now)
          : input.mode === 'bullet' && !splitFit
          ? this.bulletFrame(side, spots, input.possession.attacker, now)
          : { kind: 'settle' };
      const prevX = a.x;
      const prevZ = a.z;
      if (frame.kind === 'tackle') {
        // Posed by runTackle.
      } else if (frame.kind === 'hold') {
        if (a.proc === 'none') a.proc = 'hold';
      } else if (frame.kind === 'keeper') {
        this.applyKeeper(a, frame);
      } else if (frame.kind === 'move') {
        this.applyMove(a, frame, dt, now, blendIn);
      } else {
        this.settle(a, spots, input.possession.attacker, dt, now, splitFit !== null);
      }
      a.speed = Math.hypot(a.x - prevX, a.z - prevZ) / dt;
    }

    // Ball.
    const ballFrame: BallFrame = active
      ? active.ball(t)
      : splitFit
        ? { kind: 'at', x: duel.ball.x, y: BALL_R, z: duel.ball.z, glide: true }
        : input.mode === 'bullet'
          ? this.bulletBall(spots, now)
          : input.mode === 'sky'
            ? // The overlay's two balls fly instead: the match ball drops out of sight under the pitch.
              { kind: 'at', x: duel.ball.x, y: -3, z: duel.ball.z }
            : { kind: 'settle' };
    this.updateBall(ballFrame, input.possession.attacker, dt);

    // Zone light, nets, camera.
    const litSide = active ? active.lit(t) : input.possession.attacker;
    this.lit = { column: columnAt(this.ball.x), side: litSide };
    const age = script?.net ? script.net(t) : -1;
    // The net that ripples: the scorer's target (a steal-and-score goes the other way).
    const scorer = input.outcome?.kind === 'goal' ? input.outcome.scorer : input.from?.attacker;
    const goalDir = script && scorer ? (scorer === 'player' ? 1 : -1) : 1;
    this.netAge = goalDir > 0 ? { 1: age, [-1]: -1 } : { 1: -1, [-1]: age };
    this.scriptFx = script?.fx ? script.fx(t) : NO_FX;
    this.spots = input.mode === 'outcome' && input.from ? duelSpots(input.from) : duel;
    // In goal while a shot is coming (and through the save); the gloves come off once the result has played out.
    this.keeper = active
      ? input.from && input.from.zone === 'opponent' ? otherZoneSide(input.from.attacker) : null
      : input.mode !== 'outcome' && duel.keeper ? otherZoneSide(input.possession.attacker) : null;
    this.rush = THREE.MathUtils.damp(this.rush, this.scriptFx.rush, 6, dt);
    const framed = both && !active && input.mode !== 'outcome' ? this.bothCam() : null;
    const hint =
      active?.cam?.(t) ??
      (input.mode === 'sky' ? this.skyCam(duel) : null) ??
      splitFit?.cam ??
      framed ??
      (input.mode === 'bullet' && !active ? this.bulletCam(spots) : null);
    this.updateCamera(camera, aspect, dt, hint ?? this.defaultCam(), input.mode === 'bullet' && !active && !splitFit ? now - this.bulletStart : 0);

    const moving = Object.values(this.actors).some((a) => a.speed > 0.05 || a.recover !== null) || this.ballVel.lengthSq() > 0.01;
    this.wantFps = input.mode !== 'idle' || active || moving || !this.camSettled || now < this.busyUntil ? 60 : 30;
  }

  /* ── players ── */

  private cut(spots: DuelSpots, attacker: ZoneSide, now: number) {
    this.needsCut = false;
    for (const a of Object.values(this.actors)) {
      const role = a.side === attacker ? 'attacker' : 'defender';
      const spot = spots[role];
      a.x = spot.x;
      a.z = spot.z;
      a.yaw = spot.yaw;
      a.proc = 'none';
      a.recover = null;
      const f = idleFrame(spots, role);
      this.pose(a, f.clip, now + a.phase, now);
    }
    this.feetOf(this.actors[attacker], this.ball);
    this.ballPrev.copy(this.ball);
    this.ballVel.set(0, 0, 0);
    this.ballLoose = false;
    this.snapCamera = true;
  }

  /** Pose the cut-out from a clip, bouncing back up if it was down. */
  private pose(a: Actor, clip: string, time: number, now: number) {
    a.clip = clip;
    clipPose(a.pose, clip, time, a.yaw, now, a.phase, a.speed);
    a.pose.x = a.x;
    a.pose.z = a.z;
    const r = a.recover;
    if (r) {
      const k = Math.min(1, (now - r.start) / 0.6);
      const e = elastic(k);
      _v.copy(r.up).lerp(a.pose.up, e).normalize();
      a.pose.up.copy(_v);
      a.pose.y = THREE.MathUtils.lerp(r.y, a.pose.y, Math.min(1, e));
      if (k >= 1) a.recover = null;
    }
  }

  /** Leave a scripted pose (dive, tackle, hold): bounce back up from it. */
  private exitProc(a: Actor, now: number) {
    if (a.proc === 'none') return;
    a.recover = { start: now, up: a.pose.up.clone(), y: a.pose.y };
    a.pose.blur = 0;
    a.proc = 'none';
  }

  private applyMove(a: Actor, f: MoveFrame, dt: number, now: number, blendIn: number | null) {
    let x = f.x;
    let z = f.z;
    let yaw = f.yaw;
    if (f.alignKick) {
      // Stand behind the ball, so the swinging boot meets it at the contact frame.
      const y = yaw ?? a.yaw;
      x = f.alignKick.x - Math.sin(y) * 0.65;
      z = f.alignKick.z - Math.cos(y) * 0.65 - 0.3;
    }
    if (f.glide) {
      const k = 1 - Math.exp(-5 * dt);
      x = lerp(a.x, x, k);
      z = lerp(a.z, z, k);
      if (yaw !== undefined) yaw = angleLerp(a.yaw, yaw, k);
    } else if (blendIn !== null && a.capture) {
      x = lerp(a.capture.x, x, blendIn);
      z = lerp(a.capture.z, z, blendIn);
      if (yaw !== undefined) yaw = angleLerp(a.capture.yaw, yaw, blendIn);
    }
    const dx = x - a.x;
    const dz = z - a.z;
    const moved = Math.hypot(dx, dz);
    if (yaw === undefined) yaw = moved > 0.004 ? angleDamp(a.yaw, Math.atan2(dx, dz), 12, dt) : a.yaw;
    this.exitProc(a, now);
    a.x = x;
    a.z = z;
    a.yaw = yaw;
    a.speed = moved / dt;
    if (f.clip === 'run') {
      a.runClock += dt * (0.75 + 0.07 * Math.min(moved / dt, 20));
      this.pose(a, 'run', a.runClock, now);
    } else {
      this.pose(a, f.clip, f.time ?? now + a.phase, now);
    }
  }

  /** Keeper: crouch, then spring and stretch towards the ball (or the wrong corner), land and lie there. */
  private applyKeeper(a: Actor, f: KeeperFrame) {
    a.proc = 'keeper';
    a.recover = null;
    a.x = f.x;
    a.z = f.z;
    a.yaw = f.yaw;
    const p = a.pose;
    const cos = Math.cos(f.yaw);
    const sin = Math.sin(f.yaw);
    // The target in world space (keeper-local x across the goal, y up, 0.42 out of it; rig units).
    const lx = f.target[0] * PLAYER_SCALE;
    const ly = f.target[1] * PLAYER_SCALE;
    const lz = 0.42 * PLAYER_SCALE;
    const tx = f.x + lx * cos + lz * sin;
    const tz = f.z - lx * sin + lz * cos;
    const reach = smooth((f.time - 0.5) / (KEEPER_CONTACT_S - 0.5));
    const land = smooth((f.time - KEEPER_CONTACT_S - 0.08) / 0.55);
    const load = Math.sin(Math.PI * smooth((f.time - 0.15) / 0.4)) * (1 - reach);
    if (Math.abs(Math.sin(f.yaw)) > 0.2) p.face = Math.sin(f.yaw) > 0 ? 1 : -1;
    p.x = lerp(f.x, tx, 0.55 * reach);
    p.z = lerp(f.z, tz, 0.55 * reach);
    p.y = Math.max(0, (ly * 0.45) * reach * (1 - land) + Math.sin(reach * Math.PI) * 0.3);
    // Lean towards the ball as the dive extends; nearly flat once landed.
    const angle = reach * (1.05 + 0.4 * land);
    lean(p, tx - f.x, tz - f.z, angle);
    p.sy = 1;
    p.sx = 1;
    // Crouched, pushing off, then both legs stretched out behind.
    Object.assign(p.body, reach > 0 ? divePose(reach) : keeperSetPose(f.time, a.phase));
    if (load > 0 && reach === 0) p.body.bodyY += 20 * load;
    p.spin = 0;
    p.blur = reach * (1 - reach) * 1.6;
    // Hands at the top corner of the figure, on the side it dives to.
    a.catchPoint.set(p.x, p.y, p.z).addScaledVector(p.up, CUTOUT_H * CUTOUT_BASE * p.sy * 0.95);
  }

  /** The slide tackle: the defender dashes in low, the runner tips over backwards. */
  private runTackle(spec: TackleSpec, elapsed: number) {
    const runner = this.actors[spec.runner];
    const defender = this.actors[otherZoneSide(spec.runner)];
    const d = spec.theta === 0 ? 1 : -1;
    const at = (c: { x: number; z: number }) => ({ x: spec.origin.x + d * c.x, z: spec.origin.z + d * c.z });
    const r0 = at(spec.canon.runner);
    const d0 = at(spec.canon.defender);
    const e = Math.min(elapsed, 1.1);
    runner.proc = 'tackle';
    defender.proc = 'tackle';
    runner.recover = null;
    defender.recover = null;

    // Defender: a quick low slide into the runner's feet, then up on one knee.
    const dash = 1 - (1 - smooth(e / TACKLE_CONTACT)) ** 2;
    const dp = defender.pose;
    defender.x = lerp(d0.x, r0.x + d * 0.35, dash);
    // Slides in on the camera side of the runner, so the slide reads in front of the fall.
    defender.z = lerp(d0.z, r0.z + 0.9, dash);
    dp.x = defender.x;
    dp.z = defender.z;
    dp.y = 0;
    dp.face = d > 0 ? -1 : 1;
    const rise = smooth((e - 0.6) / 0.4);
    // Down on the grass, leaning back, the leading leg shot out at the ball; then up again.
    lean(dp, d, 0, 0.5 * dash * (1 - rise));
    Object.assign(dp.body, slidePose(dash * (1 - rise)));
    dp.body.bodyY = 210 * dash * (1 - rise);
    dp.sy = 1;
    dp.sx = 1;
    dp.spin = 0;
    dp.blur = dash * (1 - smooth((e - TACKLE_CONTACT) / 0.2)) * 0.9;

    // Runner: caught mid-stride, tips over backwards and bounces once on the grass.
    const fall = smooth((e - TACKLE_CONTACT) / 0.35);
    const rp = runner.pose;
    runner.x = r0.x + d * fall * 0.9;
    runner.z = r0.z;
    rp.x = runner.x;
    rp.z = runner.z;
    rp.face = d > 0 ? 1 : -1;
    const bounce = e > TACKLE_CONTACT + 0.35 ? Math.abs(Math.sin((e - TACKLE_CONTACT - 0.35) * 9)) * Math.exp(-(e - TACKLE_CONTACT - 0.35) * 6) : 0;
    rp.y = 0.25 * Math.sin(fall * Math.PI) + 0.2 * bounce;
    lean(rp, -d, 0, 1.4 * fall - 0.15 * bounce);
    Object.assign(rp.body, sprawlPose(fall, e));
    rp.sy = 1;
    rp.sx = 1;
    rp.spin = 0;
    rp.blur = 0;
  }

  private feetOf(a: Actor, out: THREE.Vector3): THREE.Vector3 {
    const running = a.speed > 1.2;
    const reach = running ? 0.95 + 0.18 * Math.sin(a.runClock * 7.6) : 0.9;
    return out.set(a.x + Math.sin(a.yaw) * reach, BALL_R, a.z + Math.cos(a.yaw) * reach + 0.3);
  }

  /** Jog to the duel spot (or, as the new attacker, to a loose ball first), then hold the duel stance. */
  /** @param hurry sprint (the step card is coming in: get out from behind it). */
  private settle(a: Actor, spots: DuelSpots, attacker: ZoneSide, dt: number, now: number, hurry = false) {
    const role = a.side === attacker ? 'attacker' : 'defender';
    const idle = idleFrame(spots, role);
    let tx = idle.x;
    let tz = idle.z;
    const chasing = role === 'attacker' && this.ballLoose;
    if (chasing) {
      _v.set(this.ball.x - a.x, 0, this.ball.z - a.z);
      const len = _v.length();
      if (len > 0.01) _v.multiplyScalar(1 / len);
      tx = this.ball.x - _v.x * 0.9;
      tz = this.ball.z - _v.z * 0.9;
    }
    const dx = tx - a.x;
    const dz = tz - a.z;
    const dist = Math.hypot(dx, dz);
    this.exitProc(a, now);
    if (dist > 0.35 || chasing) {
      const speed = hurry ? THREE.MathUtils.clamp(dist * 5, 8, 18) : THREE.MathUtils.clamp(dist * 2.4, 3.5, 10.5);
      const step = Math.min(dist, speed * dt);
      if (dist > 1e-4) {
        a.x += (dx / dist) * step;
        a.z += (dz / dist) * step;
        a.yaw = angleDamp(a.yaw, Math.atan2(dx, dz), 10, dt);
      }
      a.speed = step / dt;
      a.runClock += dt * (0.75 + 0.07 * Math.min(step / dt, 20));
      if (step / dt > 0.8) this.pose(a, 'run', a.runClock, now);
      else this.pose(a, idle.clip, now + a.phase, now);
    } else {
      a.x = THREE.MathUtils.damp(a.x, tx, 6, dt);
      a.z = THREE.MathUtils.damp(a.z, tz, 6, dt);
      a.yaw = angleDamp(a.yaw, idle.yaw ?? a.yaw, 6, dt);
      this.pose(a, idle.clip as string, now + a.phase, now);
    }
  }

  /** Number tiebreak: frozen mid-challenge, shoulder to shoulder (a shot: the shooter over the ball, keeper set). */
  private bulletFrame(side: ZoneSide, spots: DuelSpots, attacker: ZoneSide, now: number): ActorFrame {
    const drift = (now - this.bulletStart) * 0.015;
    const d = spots.dir;
    if (spots.keeper) {
      if (side === attacker) return { kind: 'move', x: spots.attacker.x, z: spots.attacker.z, yaw: spots.attacker.yaw, clip: 'strike_power', time: 0.45 + drift, loop: false, blend: 0, glide: true };
      return { kind: 'move', x: spots.defender.x, z: spots.defender.z, yaw: spots.defender.yaw, clip: 'keeper_idle', time: 0.9 + drift, loop: false, blend: 0, glide: true };
    }
    const bx = spots.ball.x;
    const bz = spots.ball.z;
    if (side === attacker) return { kind: 'move', x: bx - d * 0.9, z: bz + 0.9, yaw: yawToward(d, -0.18), clip: 'dribble', time: 0.12 + drift, loop: false, blend: 0, glide: true };
    return { kind: 'move', x: bx + d * 0.2, z: bz - 0.9, yaw: yawToward(d, 0.3), clip: 'dribble', time: 0.3 + drift, loop: false, blend: 0, glide: true };
  }

  /**
   * Desktop steps: the duel spots pulled apart so that, from a square-on camera that fits a figure's height, each player
   * stands clear of the card (`split` of the half-width from the centre), one each side, facing each other.
   */
  private splitFit(spots: DuelSpots, split: number, aspect: number): { spots: DuelSpots; cam: CamHint } {
    const tanV = Math.tan(THREE.MathUtils.degToRad(BASE_FOV) / 2);
    const tanH = tanV * aspect;
    // Far enough back for a figure's height, and for both figures to fit between the card and the screen edges: at
    // `dist` the half-width spans dist·tanH, the card reaches split of it, each figure needs its width plus the gap.
    const fitHeight = SPLIT_HALF_HEIGHT / tanV;
    const fitWidth = (2 * SPLIT_FIGURE_HALF + SPLIT_CLEAR) / (tanH * Math.max(SPLIT_MIN_ROOM, SPLIT_EDGE - split));
    const dist = Math.max(fitHeight, fitWidth);
    const half = dist * tanH * split + SPLIT_FIGURE_HALF + SPLIT_CLEAR;
    const cx = (spots.attacker.x + spots.defender.x) / 2;
    const dir = Math.sign(spots.defender.x - spots.attacker.x) || spots.dir;
    const z = 0.2;
    return {
      spots: {
        ...spots,
        attacker: { x: cx - dir * half, z, yaw: yawToward(dir, 0.15) },
        defender: { x: cx + dir * half, z, yaw: yawToward(-dir, 0.15) },
      },
      cam: { focus: { x: cx, z }, span: half * 2, from: { x: cx, y: SPLIT_LOOK_Y + 0.25, z: z + dist }, lookY: SPLIT_LOOK_Y },
    };
  }

  /**
   * Sky shot: you on the left, them on the right (as in the HUD), side by side facing the camera; a power stance, then
   * both strike at SKY_KICK_AT and follow through.
   */
  private skyFrame(side: ZoneSide, spots: DuelSpots, now: number): ActorFrame {
    const t = now - this.skyStart;
    const cx = spots.ball.x;
    const x = side === 'player' ? cx - SKY_GAP : cx + SKY_GAP;
    const yaw = side === 'player' ? 0.5 : -0.5;
    // strikePose meets the ball 0.45 s (STRIKE_RATE) into the strike.
    const strikeAt = SKY_KICK_AT - 0.45;
    if (t < strikeAt) return { kind: 'move', x, z: SKY_Z, yaw, clip: 'stance_power', time: t, loop: false, blend: 0.1, glide: true };
    if (t < strikeAt + 1.3) return { kind: 'move', x, z: SKY_Z, yaw, clip: 'strike', time: (t - strikeAt) * STRIKE_RATE, loop: false, blend: 0.06, glide: true };
    return { kind: 'move', x, z: SKY_Z, yaw, clip: 'outfield_idle', loop: true, blend: 0.2, glide: true };
  }

  /** Sky shot: square on and low, so the players stand at the foot of the open area and the sky fills the rest. */
  private skyCam(spots: DuelSpots): CamHint {
    return { focus: { x: spots.ball.x, z: SKY_Z }, span: SKY_GAP * 2 + 3.2 };
  }

  private bulletBall(spots: DuelSpots, now: number): BallFrame {
    const d = spots.dir;
    if (spots.keeper) return { kind: 'at', x: spots.ball.x, y: BALL_R, z: spots.ball.z, glide: true };
    return { kind: 'at', x: spots.ball.x + d * 0.4, y: 0.55 + Math.sin((now - this.bulletStart) * 0.6) * 0.03, z: spots.ball.z + 0.9, glide: true };
  }

  private bulletCam(spots: DuelSpots): CamHint {
    if (spots.keeper) return { focus: { x: (spots.attacker.x + spots.defender.x) / 2, z: 0.4 }, span: Math.abs(spots.defender.x - spots.attacker.x) + 1, orbit: -spots.dir * 0.35 };
    // Swing round in front of the pair so both faces show.
    return { focus: { x: spots.ball.x, z: spots.ball.z }, span: 4.4, orbit: spots.dir * 0.6 };
  }

  /* ── ball ── */

  private updateBall(frame: BallFrame, owner: ZoneSide, dt: number) {
    this.ballPrev.copy(this.ball);
    let kind = frame.kind;
    if (kind === 'loose') this.ballLoose = true;
    if (kind === 'settle') kind = this.ballLoose ? 'loose' : 'feet';
    if (kind === 'feet') {
      this.ballLoose = false;
      const side = frame.kind === 'feet' ? frame.side : owner;
      const a = this.actors[side];
      if (a) {
        this.feetOf(a, _v2);
        const k = 1 - Math.exp(-16 * dt);
        this.ball.x = lerp(this.ball.x, _v2.x, k);
        this.ball.z = lerp(this.ball.z, _v2.z, k);
        if (this.ball.y > BALL_R + 0.02) {
          this.ballVel.y -= GRAVITY * dt;
          this.ball.y = Math.max(BALL_R, this.ball.y + this.ballVel.y * dt);
        } else this.ball.y = BALL_R;
      }
    } else if (frame.kind === 'at') {
      this.ballLoose = false;
      if (frame.glide) {
        const k = 1 - Math.exp(-10 * dt);
        this.ball.set(lerp(this.ball.x, frame.x, k), lerp(this.ball.y, frame.y, k), lerp(this.ball.z, frame.z, k));
      } else this.ball.set(frame.x, frame.y, frame.z);
    } else if (frame.kind === 'catch') {
      this.ballLoose = false;
      const a = this.actors[frame.side];
      if (a) this.ball.copy(a.catchPoint);
    } else {
      // Loose: free physics from the last frame's velocity.
      this.ballVel.y -= GRAVITY * dt;
      this.ball.addScaledVector(this.ballVel, dt);
      if (this.ball.y < BALL_R) {
        this.ball.y = BALL_R;
        this.ballVel.y = this.ballVel.y < -0.8 ? -this.ballVel.y * 0.42 : 0;
      }
      const grip = Math.exp(-dt * (this.ball.y <= BALL_R + 0.01 ? 1.8 : 0.15));
      this.ballVel.x *= grip;
      this.ballVel.z *= grip;
      this.ball.x = THREE.MathUtils.clamp(this.ball.x, -GOAL_X + 0.5, GOAL_X - 0.5);
      this.ball.z = THREE.MathUtils.clamp(this.ball.z, -PITCH_HALF_W + 1, PITCH_HALF_W - 1);
      const taker = this.actors[owner];
      if (frame.kind === 'settle' && taker && Math.hypot(taker.x - this.ball.x, taker.z - this.ball.z) < 1.05 && this.ball.y < 0.6) this.ballLoose = false;
      if (this.ballMesh) this.roll();
      return;
    }
    // Keep a velocity estimate so a ball that turns loose carries on naturally.
    if (frame.kind !== 'feet' && !(frame.kind === 'settle')) this.ballVel.subVectors(this.ball, this.ballPrev).multiplyScalar(1 / dt);
    else if (this.ball.y <= BALL_R) this.ballVel.set(0, 0, 0);
    if (this.ballMesh) this.roll();
  }

  private roll() {
    const mesh = this.ballMesh!;
    mesh.position.copy(this.ball);
    const dx = this.ball.x - this.ballPrev.x;
    const dz = this.ball.z - this.ballPrev.z;
    const dist = Math.hypot(dx, dz);
    if (dist > 1e-5 && dist < 5) {
      _v.set(dz, 0, -dx).normalize();
      mesh.rotateOnWorldAxis(_v, dist / BALL_R);
    }
  }

  ballPosition(): THREE.Vector3 {
    return this.ball;
  }

  /* ── camera ── */

  /** Both players whole, centred between them (the ball wherever it is): a shot's keeper included. */
  private bothCam(): CamHint {
    const a = this.actors.player;
    const b = this.actors.opponent;
    const mx = ((a?.x ?? 0) + (b?.x ?? 0)) / 2;
    const mz = ((a?.z ?? 0) + (b?.z ?? 0)) / 2;
    const span = Math.max(5.5, Math.hypot((a?.x ?? 0) - (b?.x ?? 0), (a?.z ?? 0) - (b?.z ?? 0)) + 2.6);
    return { focus: { x: mx, z: mz * 0.6 }, span: Math.min(span, 16) };
  }

  private defaultCam(): CamHint {
    // Ground positions, not the animated pelvis: idle loops must not keep the camera (and the frame rate) busy.
    const a = this.actors.player;
    const b = this.actors.opponent;
    const ax = a?.x ?? 0;
    const az = a?.z ?? 0;
    const bx = b?.x ?? 0;
    const bz = b?.z ?? 0;
    const mx = (ax + bx) / 2;
    const mz = (az + bz) / 2;
    const span = Math.max(5.5, Math.hypot(ax - bx, az - bz) + 1.6, Math.hypot(this.ball.x - mx, this.ball.z - mz) * 2 + 1.5);
    return { focus: { x: mx * 0.5 + this.ball.x * 0.5, z: (mz * 0.5 + this.ball.z * 0.5) * 0.6 }, span: Math.min(span, 16) };
  }

  private updateCamera(camera: THREE.PerspectiveCamera, aspect: number, dt: number, hint: CamHint, orbitTime: number) {
    const tanV = Math.tan(THREE.MathUtils.degToRad(BASE_FOV) / 2);
    const tanH = tanV * aspect;
    // Camera rush (sprints, breaks): widen the lens a touch and chase harder.
    const fov = BASE_FOV + 11 * this.rush;
    if (Math.abs(camera.fov - fov) > 0.01) {
      camera.fov = fov;
      camera.updateProjectionMatrix();
    }
    const fx = hint.focus.x;
    const fz = hint.focus.z;
    this.focus.set(fx, 0, fz);
    // Full-body figures (≈3.3 tall) plus room over the heads for nameplates, marks and card icons.
    const fit = Math.max((hint.span / 2 + 1.4) / tanH, 3.3 / tanV, 8);
    let px: number;
    let py: number;
    let pz: number;
    let lx = fx;
    if (hint.from) {
      px = hint.from.x;
      py = hint.from.y;
      pz = hint.from.z;
    } else if (hint.orbit !== undefined) {
      const r = Math.min(fit, 24) * 0.92;
      const angle = hint.orbit + 0.5 * Math.sin(orbitTime * 0.3);
      px = fx + Math.sin(angle) * r;
      pz = fz + Math.cos(angle) * r;
      py = 1.4 + r * 0.22;
    } else {
      const k = THREE.MathUtils.clamp((Math.abs(fx) - 6) / 14, 0, 1);
      const dist = Math.min(fit, 30) * (1 - 0.12 * k);
      const side = Math.sign(fx) || 1;
      px = fx - side * k * dist * 0.36;
      py = 0.9 + dist * 0.38;
      pz = fz + dist * (1 - 0.1 * k);
      lx = fx + side * k * 1.2;
    }
    const target = _v.set(px, py, pz);
    const look = _v2.set(lx, hint.lookY ?? 1.75, fz);
    if (this.snapCamera) {
      this.camPos.copy(target);
      this.camLook.copy(look);
      this.snapCamera = false;
    } else {
      // The desktop card-between-the-players framing swings in quickly, with the card fading in.
      const kp = 1 - Math.exp(-(this.splitting ? 7 : hint.orbit !== undefined ? 2 : 2.6 + 3 * this.rush) * dt);
      const kl = 1 - Math.exp(-(this.splitting ? 7 : 3.4) * dt);
      this.camPos.lerp(target, kp);
      this.camLook.lerp(look, kl);
    }
    this.camSettled = this.camPos.distanceToSquared(target) < 0.0025 && this.camLook.distanceToSquared(look) < 0.0025;
    camera.position.copy(this.camPos);
    camera.lookAt(this.camLook);
  }
}
