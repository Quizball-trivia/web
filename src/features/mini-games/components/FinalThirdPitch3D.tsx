'use client';

/**
 * FINAL THIRD — compact three.js free-kick scene.
 *
 * Shared skinned footballers use detailed kits and motion capture. The
 * joints are resolved from each group inside useFrame so React never reads a
 * ref during render (required by the React Compiler lint rules).
 *
 * Timeline after a zone is picked: 0–0.45s run-up/strike · 0.45s launch ·
 * 0.45–1.23s flight. Saved shots then gather and land before resolution.
 *
 * Shot style is derived from the zone (curl / drive / placed) so each pick
 * reads differently without changing the 0.45s launch or 0.78s flight budget.
 */

import { Suspense, useEffect, useMemo, useRef, useState, type RefObject } from 'react';
import { Canvas, useFrame, useLoader, type ThreeEvent } from '@react-three/fiber';
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { sampleSavedBall, type KeeperSaveStyle } from '../lib/keeperSaves';
import { sampleGoalkeeper } from './GoalkeeperMotion';
import { poseWallHands } from './WallPlayerPose';
import { netRebound } from '../lib/ballPhysics';
import { footballStyleForPlayer } from '../lib/footballActions';
import { sampleStyledShot, SHOT_PROFILES } from '../lib/playerShotPhysics';
import { useMatchBallTexture, useMatchBallGeometry, usePitchTurf, useStadiumArtwork } from './footballVisuals';
import { MocapTaker } from './MocapTaker';
import {
  buildPlayerObject,
  disposeBuiltObject,
  jointsAttached,
  resolveJoints,
  setJoint,
  SCORE_BODY_URL,
  SCORE_HAIR_URL,
  type HairStyleName,
  type JointMap,
} from './ScoreGoalsPlayer3D';

interface Zone {
  id: string;
  x: number;
  y: number;
}

/** Goal-mouth coordinates in metres (goal is 7.32 × 2.44m). */
const ZONE_POS: Record<string, [number, number]> = {
  TL: [-2.45, 1.84],
  TC: [0, 1.9],
  TR: [2.45, 1.84],
  BL: [-2.45, 0.64],
  BC: [0, 0.56],
  BR: [2.45, 0.64],
};

const BALL_SPOT = new THREE.Vector3(0, 0.13, 9);
const _ball = new THREE.Vector3();
const KICK_LEAD_S = 0.45;
const FLIGHT_S = 0.78;
const SAVE_CONTACT_S = FLIGHT_S * 0.88;

const PITCH_LINES = [
  { position: [0, 0.007, 5.55] as const, size: [11.2, 0.085] as const, rotation: 0 },
  { position: [-5.56, 0.007, 2.8] as const, size: [5.65, 0.085] as const, rotation: Math.PI / 2 },
  { position: [5.56, 0.007, 2.8] as const, size: [5.65, 0.085] as const, rotation: Math.PI / 2 },
  { position: [0, 0.007, 0.01] as const, size: [24, 0.1] as const, rotation: 0 },
];

const WALL_PLAYERS = [
  { x: -2.15, delay: 0, skin: '#8f563b', hair: '#17100c', number: 4 },
  { x: -1.5, delay: 0.035, skin: '#d69a6d', hair: '#472816', number: 5 },
  { x: -0.85, delay: 0.07, skin: '#aa6948', hair: '#201712', number: 8 },
] as const;

const GOAL_HALF = 3.66;
const GOAL_H = 2.44;
const GOAL_D = 1.82;
const POST_R = 0.058;
const GOAL_POSTS = [-GOAL_HALF, GOAL_HALF] as const;

/** Pitch-side LED hoarding: a U that meets at the corners (thickness included). */
const HOARD_H = 0.84;
const HOARD_T = 0.14;
const HOARD_INNER = 8.02;
const HOARD_REAR_Z = -2.48;
const HOARD_SIDE_END_Z = 8.45;
const HOARD_REAR_W = HOARD_INNER * 2 + HOARD_T;
const HOARD_SIDE_LEN = HOARD_SIDE_END_Z - (HOARD_REAR_Z - HOARD_T / 2);
const HOARD_SIDE_Z = HOARD_REAR_Z - HOARD_T / 2 + HOARD_SIDE_LEN / 2;
const HOARD_Y = HOARD_H / 2 + 0.02;

const lerp = THREE.MathUtils.lerp;
const clamp01 = (v: number) => Math.min(1, Math.max(0, v));
type TakerId =
  | 'ronaldo'
  | 'messi'
  | 'beckham'
  | 'carlos'
  | 'ronaldinho'
  | 'neymar'
  | 'zidane'
  | 'juninho'
  | 'mbappe'
  | 'kvara';

interface KickSetup {
  id: TakerId;
  ball: readonly [number, number, number];
  idle: readonly [number, number];
  strike: readonly [number, number];
  wall: number;
  yaw: number;
  strides: number;
  hop: number;
  weave: number;
  stutter: number;
  whip: number;
  curlBias: number;
  heightBias: number;
  spin: number;
  knuckle: number;
}

/** Famous free-kick shapes — positions stay inside the camera frustum. */
const KICK_SETUPS: readonly KickSetup[] = [
  {
    id: 'ronaldo',
    ball: [0.18, 0.13, 9.85],
    idle: [-0.22, 12.05],
    strike: [-0.04, 10.12],
    wall: 0.08,
    yaw: 0.04,
    strides: 3.1,
    hop: 0.045,
    weave: 0.04,
    stutter: 0.72,
    whip: 1.28,
    curlBias: 0.12,
    heightBias: 0.42,
    spin: 10,
    knuckle: 1.5,
  },
  {
    id: 'messi',
    ball: [-2.05, 0.13, 8.05],
    idle: [-2.88, 9.28],
    strike: [-2.18, 8.32],
    wall: -0.95,
    yaw: 0.38,
    strides: 2.35,
    hop: 0.03,
    weave: 0.1,
    stutter: 0,
    whip: 0.82,
    curlBias: 1.95,
    heightBias: 0.85,
    spin: 26,
    knuckle: 0,
  },
  {
    id: 'beckham',
    ball: [2.22, 0.13, 8.48],
    idle: [3.18, 9.92],
    strike: [2.38, 8.72],
    wall: 1.05,
    yaw: -0.4,
    strides: 3.9,
    hop: 0.055,
    weave: 0.2,
    stutter: 0.12,
    whip: 1.05,
    curlBias: 1.42,
    heightBias: 0.95,
    spin: 24,
    knuckle: 0.15,
  },
  {
    id: 'carlos',
    ball: [-2.48, 0.13, 10.35],
    idle: [-3.62, 12.15],
    strike: [-2.62, 10.62],
    wall: -1.22,
    yaw: 0.44,
    strides: 5.15,
    hop: 0.1,
    weave: 0.16,
    stutter: 0,
    whip: 1.32,
    curlBias: 2.35,
    heightBias: -0.18,
    spin: 30,
    knuckle: 0.35,
  },
  {
    id: 'ronaldinho',
    // Signature side-on approach from the left, curling the ball right around
    // the wall — a wide angled run-up, heavy inside-boot curl and topspin dip.
    ball: [1.18, 0.13, 7.55],
    idle: [-0.55, 8.62],
    strike: [1.02, 7.82],
    wall: 0.48,
    yaw: -0.42,
    strides: 1.85,
    hop: 0.08,
    weave: 0.22,
    stutter: 0.24,
    whip: 0.7,
    curlBias: 1.35,
    heightBias: 1.18,
    spin: 13,
    knuckle: 0.2,
  },
  {
    id: 'neymar',
    ball: [-1.22, 0.13, 7.72],
    idle: [-1.92, 8.95],
    strike: [-1.38, 8.02],
    wall: -0.52,
    yaw: 0.2,
    strides: 3.25,
    hop: 0.12,
    weave: 0.22,
    stutter: 0.28,
    whip: 0.9,
    curlBias: 0.95,
    heightBias: 0.48,
    spin: 18,
    knuckle: 0.25,
  },
  {
    // Elegant short approach, side-foot placement over the wall.
    id: 'zidane',
    ball: [0.65, 0.13, 8.3],
    idle: [1.45, 9.4],
    strike: [0.82, 8.55],
    wall: 0.3,
    yaw: -0.12,
    strides: 2.6,
    hop: 0.03,
    weave: 0.06,
    stutter: 0,
    whip: 0.95,
    curlBias: 1.1,
    heightBias: 0.7,
    spin: 19,
    knuckle: 0,
  },
  {
    // The knuckleball original — straight run, almost no spin, max wobble.
    id: 'juninho',
    ball: [-0.7, 0.13, 9.6],
    idle: [-1.5, 11.2],
    strike: [-0.9, 9.85],
    wall: -0.3,
    yaw: 0.14,
    strides: 3.4,
    hop: 0.05,
    weave: 0.05,
    stutter: 0.1,
    whip: 1.15,
    curlBias: 0.3,
    heightBias: 0.7,
    spin: 6,
    knuckle: 1.9,
  },
  {
    // Explosive sprint-up, low driven strike.
    id: 'mbappe',
    ball: [1.8, 0.13, 9.1],
    idle: [2.7, 10.6],
    strike: [1.95, 9.35],
    wall: 0.85,
    yaw: -0.3,
    strides: 4.4,
    hop: 0.07,
    weave: 0.1,
    stutter: 0,
    whip: 1.25,
    curlBias: 0.55,
    heightBias: 0.25,
    spin: 20,
    knuckle: 0.3,
  },
  {
    // Left-footed flair — stuttered approach, whipped curl.
    id: 'kvara',
    ball: [-1.7, 0.13, 8.6],
    idle: [-2.5, 9.9],
    strike: [-1.85, 8.85],
    wall: -0.75,
    yaw: 0.3,
    strides: 3,
    hop: 0.09,
    weave: 0.18,
    stutter: 0.22,
    whip: 0.88,
    curlBias: 1.3,
    heightBias: 0.6,
    spin: 21,
    knuckle: 0.15,
  },
];

function kickFromSeed(seed: number): KickSetup {
  const index = ((seed % KICK_SETUPS.length) + KICK_SETUPS.length) % KICK_SETUPS.length;
  return KICK_SETUPS[index];
}

const TAKER_LOOK: Record<TakerId, { kit: string; shorts: string; socks: string; hair: string; number: number; skin: string; accent: string; hairStyle?: HairStyle; beard?: boolean }> = {
  ronaldo: { kit: '#f4f7fb', shorts: '#10233e', socks: '#f4f7fb', hair: '#1a120c', number: 7, skin: '#c48a62', accent: '#10233e', hairStyle: 'crop' },
  messi: { kit: '#6bb3ff', shorts: '#0b2a6b', socks: '#6bb3ff', hair: '#3a2414', number: 10, skin: '#c9a07a', accent: '#0b2a6b', hairStyle: 'mop', beard: true },
  beckham: { kit: '#da1f26', shorts: '#f4f7fb', socks: '#da1f26', hair: '#8a6b3c', number: 7, skin: '#d4a07a', accent: '#f4f7fb', hairStyle: 'fauxhawk' },
  carlos: { kit: '#fde100', shorts: '#1b3d8f', socks: '#fde100', hair: '#120c08', number: 6, skin: '#5c3824', accent: '#1b3d8f', hairStyle: 'bald' },
  // Barça blaugrana — the flat kit shader can't stripe, so the claret shirt
  // reads the colour, blue shorts, blue-claret socks, gold #10.
  ronaldinho: { kit: '#8b1a3a', shorts: '#141d5c', socks: '#1a2a7a', hair: '#160f0a', number: 10, skin: '#8a5a38', accent: '#f4c430', hairStyle: 'long' },
  neymar: { kit: '#ffe500', shorts: '#1a3a1a', socks: '#ffe500', hair: '#24160e', number: 11, skin: '#c9a070', accent: '#1a3a1a', hairStyle: 'mop' },
  zidane: { kit: '#1c3f94', shorts: '#f4f7fb', socks: '#c8102e', hair: '#2b211a', number: 10, skin: '#d4a07a', accent: '#f4f7fb', hairStyle: 'balding' },
  juninho: { kit: '#f4f7fb', shorts: '#f4f7fb', socks: '#f4f7fb', hair: '#17110b', number: 8, skin: '#c9a07a', accent: '#1b3d8f', hairStyle: 'short' },
  mbappe: { kit: '#10224e', shorts: '#10224e', socks: '#10224e', hair: '#100b08', number: 7, skin: '#8a5a38', accent: '#da1f26', hairStyle: 'crop' },
  kvara: { kit: '#f4f7fb', shorts: '#f4f7fb', socks: '#c8102e', hair: '#1a120c', number: 7, skin: '#d4a07a', accent: '#c8102e', hairStyle: 'short', beard: true },
};

function CameraRig({ kick, shotZone, flying }: { kick: KickSetup; shotZone: Zone | null; flying: boolean }) {
  const look = useRef(new THREE.Vector3(-0.08, 1.05, 0));
  useFrame((state, delta) => {
    const blend = 1 - Math.exp(-5.6 * Math.min(delta, 0.1));
    const bx = kick.ball[0];
    const bz = kick.ball[2];
    // Narrow viewports (phones, tall panels) lose horizontal FOV and crop the
    // taker out of frame — pull the camera back to compensate. No-op at the
    // 16/10 aspect the framing was tuned for.
    const aspect =
      (state.camera as THREE.PerspectiveCamera).aspect && (state.camera as THREE.PerspectiveCamera).isPerspectiveCamera
        ? (state.camera as THREE.PerspectiveCamera).aspect
        : 1.6;
    const back = Math.max(0, 1.6 / Math.min(1.6, Math.max(0.55, aspect)) - 1);
    const aimX = flying && shotZone ? (ZONE_POS[shotZone.id]?.[0] ?? 0) * 0.18 + bx * 0.12 : bx;
    look.current.x = lerp(look.current.x, aimX * 0.48, blend);
    look.current.y = lerp(look.current.y, 1.08, blend);
    look.current.z = lerp(look.current.z, 0.12, blend);
    state.camera.position.x = lerp(state.camera.position.x, 0.48 + bx * 0.46, blend);
    state.camera.position.y = lerp(state.camera.position.y, 2.2 + (bz - 9) * 0.06 + back * 0.9, blend);
    state.camera.position.z = lerp(state.camera.position.z, 15.1 + (bz - 8.4) * 0.58 + back * 6.2 - (flying ? 0.45 : 0), blend);
    state.camera.lookAt(look.current);
  });
  return null;
}

/* ── generated textures ───────────────────────────────────────────── */

function useNetTexture(): THREE.Texture {
  return useMemo(() => {
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 512;
    const context = canvas.getContext('2d')!;
    context.clearRect(0, 0, 512, 512);
    // Two passes per cord — a dark under-stroke and a bright line — so the
    // mesh reads as twine with depth instead of a flat hatch.
    const drawDiagonals = (offset: number, style: string, width: number) => {
      context.strokeStyle = style;
      context.lineWidth = width;
      for (let i = -512; i <= 1024; i += 26) {
        context.beginPath();
        context.moveTo(i + offset, 0);
        context.lineTo(i + offset + 512, 512);
        context.stroke();
        context.beginPath();
        context.moveTo(i + offset, 512);
        context.lineTo(i + offset + 512, 0);
        context.stroke();
      }
    };
    drawDiagonals(1.4, 'rgba(8, 14, 22, 0.55)', 3.4);
    drawDiagonals(0, 'rgba(244, 249, 254, 0.95)', 1.9);
    const texture = new THREE.CanvasTexture(canvas);
    texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
    texture.repeat.set(6, 3);
    texture.anisotropy = 8;
    return texture;
  }, []);
}

function useHoardingMap(metres: number): THREE.Texture {
  const logo = useLoader(THREE.TextureLoader, '/assets/brand/quizball-logo.webp');
  const map = useMemo(() => {
    const canvas = document.createElement('canvas'); canvas.width = 256; canvas.height = 128;
    const ctx = canvas.getContext('2d')!;
    ctx.fillStyle = '#10243b'; ctx.fillRect(0, 0, 256, 128);
    ctx.fillStyle = '#b4f345'; ctx.fillRect(0, 0, 256, 3);
    const height = 104, width = height * (logo.image.width / logo.image.height);
    ctx.drawImage(logo.image, (256 - width) / 2, 12, width, height);
    const texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace; texture.wrapS = THREE.RepeatWrapping;
    texture.repeat.set(Math.max(1, Math.round(metres / 1.6)), 1); texture.anisotropy = 4;
    return texture;
  }, [logo, metres]);
  useEffect(() => () => map.dispose(), [map]);
  return map;
}

/* ── articulated footballers ──────────────────────────────────────── */



type HairStyle = 'short' | 'crop' | 'mop' | 'long' | 'bald' | 'balding' | 'fauxhawk';

/** Old hand-rig hairstyle names → bundled hair meshes. */
const HAIR_MESH: Record<HairStyle, HairStyleName | null> = {
  short: 'Hair_SimpleParted',
  crop: 'Hair_Buzzed',
  mop: 'Hair_SimpleParted',
  long: 'Hair_Long',
  bald: null,
  balding: 'Hair_Buzzed',
  fauxhawk: 'Hair_Buns',
};

function GLBPlayerRig({
  kit,
  shorts,
  socks,
  skin,
  number,
  accent,
  hair = '#17100c',
  hairStyle = 'short',
  beard = false,
}: {
  kit: string;
  shorts: string;
  socks: string;
  skin: string;
  number: number;
  accent: string;
  hair?: string;
  hairStyle?: HairStyle;
  beard?: boolean;
}) {
  const gltf = useLoader(GLTFLoader, SCORE_BODY_URL);
  const hairLib = useLoader(GLTFLoader, SCORE_HAIR_URL);
  const obj = useMemo(
    () =>
      buildPlayerObject(
        gltf.scene,
        { shirt: kit, shorts, accent, socks },
        `${kit}-${shorts}-${number}`,
        number,
        accent,
        {
          skin,
          hair: hairLib.scene,
          hairColor: hair,
          hairStyle: HAIR_MESH[hairStyle],
          beard,
        },
      ),
    [gltf, hairLib, kit, shorts, socks, skin, number, accent, hair, hairStyle, beard],
  );
  useEffect(() => () => disposeBuiltObject(obj), [obj]);
  // The UBC body natively faces +Z, matching the hand-rig convention.
  return <primitive object={obj} />;
}

/** Signature pre-kick stances, posed over the ball while the player decides.
 * Hands: 'free' uses the arm fields; 'hips' plants both hands on the hips;
 * 'hipR' just the right hand. Arm z: + raises the left arm laterally
 * (mirrored for the right); elbow x: - bends the forearm up/forward. */

interface Timeline {
  start: number | null;
}



function WallPlayer({
  tl,
  x,
  delay,
  skin,
  hair,
  number,
  shift,
}: {
  tl: RefObject<Timeline>;
  x: number;
  delay: number;
  skin: string;
  hair: string;
  number: number;
  shift: number;
}) {
  const root = useRef<THREE.Group>(null);
  const joints = useRef<JointMap | null>(null);

  useFrame((state) => {
    const player = root.current;
    if (!player) return;
    if (!joints.current || !jointsAttached(player, joints.current)) {
      joints.current = resolveJoints(player);
    }
    const joint = joints.current;
    if (!joint) return;
    const now = state.clock.elapsedTime;
    const start = tl.current?.start ?? null;
    const px = x + shift;

    // Classic wall pose: upper arms angled down-forward, forearms folded in so
    // the hands meet clasped low in front.
    setJoint(joint.spine, 0.08);
    setJoint(joint.shoL, -0.32, 0, 0.1);
    setJoint(joint.shoR, -0.32, 0, -0.1);
    setJoint(joint.elbL, -.5);
    setJoint(joint.elbR, -.5);
    setJoint(joint.handL, 0);
    setJoint(joint.handR, 0);
    setJoint(joint.head, 0, -px * 0.035, 0);

    const jumpAt = start == null ? null : start + KICK_LEAD_S - 0.035 + delay;
    if (jumpAt != null && now >= jumpAt) {
      const jump = clamp01((now - jumpAt) / 0.55);
      const height = Math.sin(jump * Math.PI) * 0.47;
      player.position.set(px, height, 4.55);
      player.rotation.set(0, 0, Math.sin(jump * Math.PI) * (px + 1.5) * 0.025);
      const tuck = Math.sin(jump * Math.PI);
      setJoint(joint.hipL, -tuck * 0.42);
      setJoint(joint.hipR, -tuck * 0.42);
      setJoint(joint.kneeL, 0.1 + tuck * 0.82);
      setJoint(joint.kneeR, 0.1 + tuck * 0.82);
      setJoint(joint.ankleL, -tuck * 0.18);
      setJoint(joint.ankleR, -tuck * 0.18);
    } else {
      const breathe = Math.sin(now * 2.1 + x * 2.7);
      player.position.set(px, breathe * 0.012, 4.55);
      player.rotation.set(0, 0, 0);
      setJoint(joint.hipL, 0);
      setJoint(joint.hipR, 0);
      setJoint(joint.kneeL, 0.1);
      setJoint(joint.kneeR, 0.1);
      setJoint(joint.ankleL, 0);
      setJoint(joint.ankleR, 0);
    }
    poseWallHands(player, joint);
  });

  return (
    <group ref={root} position={[x, 0, 4.55]}>
      <Suspense fallback={null}>
        <GLBPlayerRig
          kit="#1754d1"
          shorts="#f4f7fb"
          socks="#1754d1"
          skin={skin}
          number={number}
          accent="#8fd3ff"
          hair={hair}
          hairStyle={number % 2 === 0 ? 'crop' : 'short'}
        />
      </Suspense>
    </group>
  );
}


function KeeperBody({ tl, shotZone, willSave, catchPoint, saveStyle }: {
  tl: RefObject<Timeline>; shotZone: Zone | null; willSave: boolean | null;
  saveStyle: KeeperSaveStyle; settled: boolean; scored: boolean | null; taker: TakerId; catchPoint: RefObject<THREE.Vector3>;
}) {
  const gltf = useLoader(GLTFLoader, SCORE_BODY_URL);
  const hair = useLoader(GLTFLoader, SCORE_HAIR_URL);
  const obj = useMemo(() => buildPlayerObject(gltf.scene,
    { shirt: '#e58732', shorts: '#152333', accent: '#eff2df', socks: '#e58732', gloves: '#f3f7ed' },
    'keeper', 1, '#eff2df', { skin: '#8f563b', hair: hair.scene, hairColor: '#17130e', hairStyle: 'Hair_SimpleParted', beard: false }), [gltf, hair]);
  const root = useRef<THREE.Group>(null);
  const joints = useRef<JointMap | null>(null);
  useEffect(() => () => disposeBuiltObject(obj), [obj]);
  useFrame(({ clock }) => {
    const player = root.current;
    if (!player) return;
    if (!joints.current || !jointsAttached(player, joints.current)) joints.current = resolveJoints(player);
    if (!joints.current) return;
    const start = tl.current?.start;
    sampleGoalkeeper(player, joints.current, shotZone ? ZONE_POS[shotZone.id] : [0, 1.1], start == null ? 0 : clock.elapsedTime - start, willSave === true, catchPoint.current, saveStyle);
  }, -1);
  return <group ref={root}><primitive object={obj} /></group>;
}

function KeeperPlayer(props: {
  tl: RefObject<Timeline>;
  shotZone: Zone | null;
  willSave: boolean | null;
  settled: boolean;
  scored: boolean | null;
  taker: TakerId;
  catchPoint: RefObject<THREE.Vector3>;
  saveStyle: KeeperSaveStyle;
}) {
  return (
    <Suspense fallback={null}>
      <KeeperBody {...props} />
    </Suspense>
  );
}

/* ── stadium ──────────────────────────────────────────────────────── */

function PostBar({
  position,
  rotation = [0, 0, 0],
  args,
}: {
  position: [number, number, number];
  rotation?: [number, number, number];
  args: [number, number, number, number?];
}) {
  return (
    <mesh position={position} rotation={rotation} castShadow>
      <cylinderGeometry args={args} />
      <meshStandardMaterial color="#f4f8fb" metalness={0.62} roughness={0.2} />
    </mesh>
  );
}

function GoalFrame() {
  const rear = -GOAL_D;
  return (
    <group>
      {GOAL_POSTS.map((x) => (
        <group key={x}>
          <PostBar position={[x, GOAL_H / 2, 0]} args={[POST_R, POST_R, GOAL_H, 14]} />
          <PostBar position={[x, GOAL_H / 2, rear]} args={[POST_R * 0.82, POST_R * 0.82, GOAL_H, 12]} />
          <PostBar
            position={[x, GOAL_H, rear / 2]}
            rotation={[Math.PI / 2, 0, 0]}
            args={[POST_R * 0.72, POST_R * 0.72, GOAL_D, 10]}
          />
          <PostBar
            position={[x, POST_R, rear / 2]}
            rotation={[Math.PI / 2, 0, 0]}
            args={[POST_R * 0.62, POST_R * 0.62, GOAL_D, 10]}
          />
          <mesh position={[x, GOAL_H, 0]}>
            <sphereGeometry args={[POST_R * 1.05, 10, 10]} />
            <meshStandardMaterial color="#f7fbff" metalness={0.64} roughness={0.18} />
          </mesh>
        </group>
      ))}
      <PostBar
        position={[0, GOAL_H, 0]}
        rotation={[0, 0, Math.PI / 2]}
        args={[POST_R, POST_R, GOAL_HALF * 2 + POST_R * 2, 16]}
      />
      <PostBar
        position={[0, GOAL_H, rear]}
        rotation={[0, 0, Math.PI / 2]}
        args={[POST_R * 0.72, POST_R * 0.72, GOAL_HALF * 2, 12]}
      />
      <PostBar
        position={[0, POST_R, rear]}
        rotation={[0, 0, Math.PI / 2]}
        args={[POST_R * 0.62, POST_R * 0.62, GOAL_HALF * 2, 12]}
      />
    </group>
  );
}

interface NetHit {
  time: number;
  x: number;
  y: number;
  power: number;
}

function makeBagNet(
  width: number,
  height: number,
  segmentsW: number,
  segmentsH: number,
  bag: (x: number, y: number) => number,
) {
  const geometry = new THREE.PlaneGeometry(width, height, segmentsW, segmentsH);
  const position = geometry.attributes.position;
  const rest = new Float32Array(position.count);
  for (let i = 0; i < position.count; i += 1) {
    const depth = bag(position.getX(i), position.getY(i));
    position.setZ(i, depth);
    rest[i] = depth;
  }
  geometry.userData.rest = rest;
  geometry.userData.vel = new Float32Array(position.count);
  geometry.computeVertexNormals();
  return geometry;
}

function stepCloth(geometry: THREE.BufferGeometry, hit: NetHit | null, now: number, scale = 1) {
  const position = geometry.attributes.position;
  const rest = geometry.userData.rest as Float32Array | undefined;
  const vel = geometry.userData.vel as Float32Array | undefined;
  if (!rest || !vel) return;
  const elapsed = hit ? Math.max(0, now - hit.time) : 99;
  const live = hit && elapsed < 2.05 ? hit.power * scale * Math.exp(-elapsed * 2.5) : 0;
  for (let i = 0; i < position.count; i += 1) {
    const x = position.getX(i);
    const y = position.getY(i);
    let target = rest[i];
    if (live > 0.01 && hit) {
      const dist = Math.hypot(x - hit.x, y - hit.y);
      // A deep pocket where the ball lands, clamped so the cloth never spikes,
      // plus a low-frequency wave so the whole panel billows and settles.
      const push = live * Math.exp(-dist * dist * 0.7) * (1 + Math.sin(elapsed * 22 - dist * 3.4) * 0.35);
      target += -Math.min(1.05, push) - live * 0.1 * Math.sin(elapsed * 6.5 + y * 1.4);
    }
    const current = position.getZ(i);
    vel[i] = vel[i] * 0.86 + (target - current) * 0.22;
    position.setZ(i, current + vel[i]);
  }
  position.needsUpdate = true;
}

function GoalNets({
  map,
  hit,
}: {
  map: THREE.Texture;
  hit: RefObject<NetHit | null>;
}) {
  const back = useRef<THREE.Mesh>(null);
  const top = useRef<THREE.Mesh>(null);
  const left = useRef<THREE.Mesh>(null);
  const right = useRef<THREE.Mesh>(null);
  const backGeo = useMemo(
    () => makeBagNet(GOAL_HALF * 2, GOAL_H, 22, 14, (x, y) => {
      const nx = x / GOAL_HALF;
      const ny = (y + GOAL_H / 2) / GOAL_H;
      return -(0.14 + (1 - nx * nx) * (0.4 + 0.5 * (1 - ny)));
    }),
    [],
  );
  const topGeo = useMemo(
    () => makeBagNet(GOAL_HALF * 2, GOAL_D, 20, 8, (x, y) => {
      const nx = x / GOAL_HALF;
      const along = (y + GOAL_D / 2) / GOAL_D;
      return -(0.05 + (1 - nx * nx) * along * 0.26);
    }),
    [],
  );
  const leftGeo = useMemo(
    () => makeBagNet(GOAL_D, GOAL_H, 10, 14, (_x, y) => 0.08 + (1 - (y + GOAL_H / 2) / GOAL_H) * 0.22),
    [],
  );
  const rightGeo = useMemo(
    () => makeBagNet(GOAL_D, GOAL_H, 10, 14, (_x, y) => 0.08 + (1 - (y + GOAL_H / 2) / GOAL_H) * 0.22),
    [],
  );

  useFrame((state) => {
    const impulse = hit.current;
    const now = state.clock.elapsedTime;
    // The ball hits the BACK net — side/top panels only catch a faint shiver
    // (their local coordinates don't match the goal-mouth hit point anyway).
    if (back.current) stepCloth(back.current.geometry, impulse, now, 1.2);
    if (top.current) stepCloth(top.current.geometry, impulse, now, 0.2);
    if (left.current) stepCloth(left.current.geometry, impulse, now, 0.15);
    if (right.current) stepCloth(right.current.geometry, impulse, now, 0.15);
  });

  const netMat = (
    <meshBasicMaterial map={map} transparent opacity={0.55} side={THREE.DoubleSide} depthWrite={false} />
  );

  return (
    <group>
      <mesh ref={back} geometry={backGeo} position={[0, GOAL_H / 2, -GOAL_D + 0.04]}>
        {netMat}
      </mesh>
      <mesh ref={top} geometry={topGeo} position={[0, GOAL_H - 0.02, -GOAL_D / 2]} rotation={[-Math.PI / 2.08, 0, 0]}>
        {netMat}
      </mesh>
      <mesh ref={left} geometry={leftGeo} position={[-GOAL_HALF + 0.02, GOAL_H / 2, -GOAL_D / 2]} rotation={[0, Math.PI / 2, 0]}>
        {netMat}
      </mesh>
      <mesh ref={right} geometry={rightGeo} position={[GOAL_HALF - 0.02, GOAL_H / 2, -GOAL_D / 2]} rotation={[0, -Math.PI / 2, 0]}>
        {netMat}
      </mesh>
    </group>
  );
}

function HoardingFace({
  map,
  width,
  height,
}: {
  map: THREE.Texture;
  width: number;
  height: number;
}) {
  return (
    <mesh position={[0, 0, HOARD_T / 2 + 0.004]}>
      <planeGeometry args={[width - 0.08, height - 0.14]} />
      <meshBasicMaterial map={map} toneMapped={false} />
    </mesh>
  );
}

/** Static crowd plane — no bobbing; the crowd reads as a painted backdrop. */
function CrowdDeck({
  map,
  position,
  rotation,
  size,
  tint,
}: {
  map: THREE.Texture;
  position: [number, number, number];
  rotation: [number, number, number];
  size: [number, number];
  tint: string;
}) {
  return (
    <mesh position={position} rotation={rotation}>
      <planeGeometry args={size} />
      <meshBasicMaterial map={map} color={tint} toneMapped={false} />
    </mesh>
  );
}

function Stadium({ crowd, showStructure = true }: { crowd?: THREE.Texture; showStructure?: boolean }) {
  const rearMap = useHoardingMap(HOARD_REAR_W);
  const sideMap = useHoardingMap(HOARD_SIDE_LEN);

  return (
    <group>
      {showStructure && crowd && (
        <>
          <mesh position={[0, 7.55, -4.55]}>
            <boxGeometry args={[23.6, 0.28, 4.2]} />
            <meshStandardMaterial color="#101820" metalness={0.42} roughness={0.52} />
          </mesh>
          {[-8.4, -4.2, 0, 4.2, 8.4].map((x) => (
            <mesh key={x} position={[x, 7.42, -3.85]}>
              <boxGeometry args={[2.05, 0.16, 0.5]} />
              <meshBasicMaterial color="#eef6ff" toneMapped={false} />
            </mesh>
          ))}

          <CrowdDeck map={crowd} position={[0, 1.72, -3.12]} rotation={[-0.18, 0, 0]} size={[17.6, 2.15]} tint="#6a7684" />
          <CrowdDeck map={crowd} position={[0, 3.28, -3.98]} rotation={[-0.14, 0, 0]} size={[19.2, 2.55]} tint="#5d6976" />
          <CrowdDeck map={crowd} position={[0, 5.15, -4.92]} rotation={[-0.1, 0, 0]} size={[21.4, 3.05]} tint="#525e6b" />
        </>
      )}

      <group position={[0, HOARD_Y, HOARD_REAR_Z]}>
        <mesh>
          <boxGeometry args={[HOARD_REAR_W, HOARD_H, HOARD_T]} />
          <meshStandardMaterial color="#0a0a0a" roughness={0.48} metalness={0.22} />
        </mesh>
        <mesh position={[0, HOARD_H / 2 - 0.03, HOARD_T / 2 + 0.002]}>
          <boxGeometry args={[HOARD_REAR_W, 0.045, 0.02]} />
          <meshBasicMaterial color="#FFE500" toneMapped={false} />
        </mesh>
        <HoardingFace map={rearMap} width={HOARD_REAR_W} height={HOARD_H} />
      </group>
      {([-1, 1] as const).map((side) => (
        <group
          key={side}
          position={[side * HOARD_INNER, HOARD_Y, HOARD_SIDE_Z]}
          rotation={[0, side * -Math.PI / 2, 0]}
        >
          <mesh>
            <boxGeometry args={[HOARD_SIDE_LEN, HOARD_H, HOARD_T]} />
            <meshStandardMaterial color="#0a0a0a" roughness={0.48} metalness={0.22} />
          </mesh>
          <mesh position={[0, HOARD_H / 2 - 0.03, HOARD_T / 2 + 0.002]}>
            <boxGeometry args={[HOARD_SIDE_LEN, 0.045, 0.02]} />
            <meshBasicMaterial color="#FFE500" toneMapped={false} />
          </mesh>
          <HoardingFace map={sideMap} width={HOARD_SIDE_LEN} height={HOARD_H} />
        </group>
      ))}
      {([-1, 1] as const).map((side) => (
        <mesh
          key={`corner-${side}`}
          position={[side * HOARD_INNER, HOARD_Y, HOARD_REAR_Z]}
        >
          <boxGeometry args={[HOARD_T + 0.04, HOARD_H + 0.04, HOARD_T + 0.04]} />
          <meshStandardMaterial color="#141414" roughness={0.4} metalness={0.35} />
        </mesh>
      ))}
    </group>
  );
}

/* ── scene ────────────────────────────────────────────────────────── */

interface SceneProps {
  picking: boolean;
  /** Render zone markers even when not yet clickable (decide/question). */
  showZones: boolean;
  revealedSave: string | null;
  /** Zone ids currently unlocked (Option C); null = all zones open. */
  openZones: string[] | null;
  shotZone: Zone | null;
  willSave: boolean | null;
  resolving: boolean;
  settled: boolean;
  scored: boolean | null;
  onPick: (zone: Zone) => void;
  zones: Zone[];
  kick: KickSetup;
  saveStyle: KeeperSaveStyle;
}

function Scene({
  picking,
  showZones,
  revealedSave,
  openZones,
  shotZone,
  willSave,
  resolving,
  settled,
  scored,
  onPick,
  zones,
  kick,
  saveStyle,
}: SceneProps) {
  const { map: grass, bumpMap: grassBump } = usePitchTurf();
  const net = useNetTexture();
  const ballTexture = useMatchBallTexture();
  const ballGeometry = useMatchBallGeometry(0.13);
  const stadiumBackdrop = useStadiumArtwork();
  const ball = useRef<THREE.Mesh>(null);
  const ballShadow = useRef<THREE.Mesh>(null);
  const netHit = useRef<NetHit | null>(null);
  const keeperCatch = useRef(new THREE.Vector3(0, 1.15, 0.38));
  const [hover, setHover] = useState<string | null>(null);
  const timeline = useRef<Timeline>({ start: null });

  useFrame((state, delta) => {
    const now = state.clock.elapsedTime;
    if ((resolving || settled) && shotZone) {
      if (timeline.current.start == null) timeline.current.start = now;
    } else if (!shotZone) {
      timeline.current.start = null;
      netHit.current = null;
    }

    const ballMesh = ball.current;
    const shadowMesh = ballShadow.current;
    if (!ballMesh) return;
    // Physical sphere rotation makes the panels readable through the flight.
    const spinBall = (amount: number) => {
      ballMesh.rotation.x -= amount;
      ballMesh.rotation.z += amount * 0.35;
    };

    const start = timeline.current.start;
    _ball.set(kick.ball[0], kick.ball[1], kick.ball[2]);
    if (start == null || !shotZone) {
      ballMesh.position.copy(_ball);
      if (shadowMesh) {
        shadowMesh.position.set(_ball.x, 0.012, _ball.z);
        shadowMesh.scale.setScalar(1);
      }
      return;
    }

    const style = footballStyleForPlayer(kick.id);
    const launch = start + KICK_LEAD_S;
    const [destinationX, destinationY] = ZONE_POS[shotZone.id] ?? [0, 1];
    const duration = willSave ? SAVE_CONTACT_S : FLIGHT_S;
    const age = now - launch;
    const target = new THREE.Vector3(destinationX, destinationY, willSave ? .42 : .18);
    if (age < 0) {
      ballMesh.position.copy(_ball);
    } else if (willSave && age >= duration) {
      // The keeper solves his hands to this exact arrival point, then carries
      // the ball through the gather and landing. No independent ball lerp.
      sampleSavedBall(ballMesh.position, target, keeperCatch.current, age - duration, saveStyle);
      if (saveStyle !== 'catch') spinBall(delta * 4);
    } else if (!willSave && age >= duration) {
      netRebound(ballMesh.position, target, age - duration);
      spinBall(delta * SHOT_PROFILES[style].spin * Math.exp(-(age - duration) * 5));
      if (!netHit.current) netHit.current = { time: launch + duration, x: destinationX, y: destinationY - GOAL_H / 2, power: .9 };
    } else {
      sampleStyledShot(ballMesh.position, _ball, target, age, duration, style);
      spinBall(delta * SHOT_PROFILES[style].spin);
    }

    if (shadowMesh) {
      shadowMesh.position.set(ballMesh.position.x, 0.012, ballMesh.position.z);
      const height = Math.max(0, ballMesh.position.y - _ball.y);
      const scale = 1 + Math.min(1.25, height * 0.32);
      shadowMesh.scale.set(scale, scale, 1);
      const material = shadowMesh.material;
      if (material instanceof THREE.MeshBasicMaterial) material.opacity = Math.max(0.08, 0.32 - height * 0.085);
    }
  });

  return (
    <>
      <hemisphereLight args={['#dceeff', '#174323', 1.05]} />
      <directionalLight position={[6, 12, 9]} intensity={2.5} color="#fff7df" castShadow shadow-mapSize={[2048, 2048]} shadow-camera-left={-12} shadow-camera-right={12} shadow-camera-top={14} shadow-camera-bottom={-12} shadow-normalBias={0.025} shadow-bias={-0.0001} />
      <directionalLight position={[-9, 8, 5]} intensity={0.9} color="#cce4ff" />
      <directionalLight position={[-7, 7, -4]} intensity={1.8} color="#a6d7ff" />

      <mesh position={[0, 5.4, -7.2]} renderOrder={-2}>
        <planeGeometry args={[34, 11.5]} />
        <meshBasicMaterial map={stadiumBackdrop} color="#bdcbd9" toneMapped={false} fog={false} />
      </mesh>
      <Stadium showStructure={false} />

      {/* striped pitch and markings */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 4]} receiveShadow>
        <planeGeometry args={[34, 30]} />
        <meshStandardMaterial map={grass} bumpMap={grassBump} bumpScale={0.009} roughness={0.94} />
      </mesh>
      {Array.from({ length: 8 }, (_, index) => <mesh key={`mow-${index}`} rotation={[-Math.PI / 2, 0, 0]} position={[0, .001, -9 + index * 4]} receiveShadow><planeGeometry args={[34, 4]} /><meshStandardMaterial color={index % 2 ? '#bbd896' : '#0c2b1c'} transparent opacity={.05} roughness={1} depthWrite={false} /></mesh>)}
      {PITCH_LINES.map((line) => (
        <mesh
          key={`${line.position[0]}-${line.position[2]}`}
          rotation={[-Math.PI / 2, 0, line.rotation]}
          position={line.position}
        >
          <planeGeometry args={line.size} />
          <meshBasicMaterial color="#f3f7f4" transparent opacity={0.74} />
        </mesh>
      ))}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[kick.ball[0], 0.009, kick.ball[2]]}>
        <circleGeometry args={[0.09, 16]} />
        <meshBasicMaterial color="#ffffff" transparent opacity={0.9} />
      </mesh>

      <GoalFrame />
      <GoalNets map={net} hit={netHit} />

      {/* players */}
      {WALL_PLAYERS.map((player) => (
        <WallPlayer key={player.x} tl={timeline} {...player} shift={kick.wall} />
      ))}
      <CameraRig kick={kick} shotZone={shotZone} flying={resolving || settled} />
      <KeeperPlayer
        tl={timeline}
        shotZone={shotZone}
        willSave={willSave}
        settled={settled}
        scored={scored}
        taker={kick.id}
        catchPoint={keeperCatch}
        saveStyle={saveStyle}
      />
      <Suspense fallback={null}>
        <MocapTaker
          key={kick.id}
          tl={timeline}
          celebrating={settled && scored === true}
          ball={kick.ball}
          aimX={shotZone ? (ZONE_POS[shotZone.id]?.[0] ?? 0) : 0}
          id={kick.id}
          number={TAKER_LOOK[kick.id].number}
          kit={TAKER_LOOK[kick.id].kit}
          shorts={TAKER_LOOK[kick.id].shorts}
          socks={TAKER_LOOK[kick.id].socks}
          skin={TAKER_LOOK[kick.id].skin}
          accent={TAKER_LOOK[kick.id].accent}
          hairColor={TAKER_LOOK[kick.id].hair}
          hairStyle={HAIR_MESH[TAKER_LOOK[kick.id].hairStyle ?? 'short']}
          beard={TAKER_LOOK[kick.id].beard ?? false}
        />
      </Suspense>

      {/* generous invisible hit discs wrap crisp visible targets */}
      {zones.map((zone) => {
        const [x, y] = ZONE_POS[zone.id];
        const locked = zone.id === revealedSave;
        const closed = !!openZones && !openZones.includes(zone.id);
        if (!picking && !showZones && !locked) return null;
        const clickable = picking && !locked && !closed;
        const activeHover = hover === zone.id && clickable;
        return (
          <group key={zone.id} position={[x, y, 0.31]} renderOrder={20}>
            <mesh
              onClick={(event: ThreeEvent<MouseEvent>) => {
                event.stopPropagation();
                if (clickable) onPick(zone);
              }}
              onPointerOver={() => {
                if (clickable) {
                  setHover(zone.id);
                  document.body.style.cursor = 'pointer';
                }
              }}
              onPointerOut={() => {
                setHover(null);
                document.body.style.cursor = 'auto';
              }}
            >
              <circleGeometry args={[0.67, 28]} />
              <meshBasicMaterial transparent opacity={0} depthTest={false} depthWrite={false} />
            </mesh>
            <mesh>
              <circleGeometry args={[0.49, 28]} />
              <meshBasicMaterial
                color={locked ? '#ff4b4b' : closed ? '#5b6a7c' : activeHover ? '#ffe500' : '#eaf6ff'}
                transparent
                opacity={locked ? 0.3 : closed ? 0.06 : activeHover ? 0.28 : 0.13}
                depthTest={false}
                depthWrite={false}
                toneMapped={false}
              />
            </mesh>
            <mesh>
              <ringGeometry args={[0.43, 0.5, 28]} />
              <meshBasicMaterial
                color={locked ? '#ff4b4b' : closed ? '#5b6a7c' : activeHover ? '#ffe500' : '#f4fbff'}
                transparent
                opacity={locked ? 0.95 : closed ? 0.24 : 0.86}
                depthTest={false}
                depthWrite={false}
                toneMapped={false}
              />
            </mesh>
            {!locked && !closed && (
              <>
                <mesh>
                  <planeGeometry args={[0.035, 0.7]} />
                  <meshBasicMaterial color="#f4fbff" transparent opacity={0.42} depthTest={false} depthWrite={false} />
                </mesh>
                <mesh rotation={[0, 0, Math.PI / 2]}>
                  <planeGeometry args={[0.035, 0.7]} />
                  <meshBasicMaterial color="#f4fbff" transparent opacity={0.42} depthTest={false} depthWrite={false} />
                </mesh>
              </>
            )}
            {locked && (
              <>
                <mesh rotation={[0, 0, Math.PI / 4]}>
                  <planeGeometry args={[0.62, 0.1]} />
                  <meshBasicMaterial color="#ff4b4b" toneMapped={false} depthTest={false} depthWrite={false} />
                </mesh>
                <mesh rotation={[0, 0, -Math.PI / 4]}>
                  <planeGeometry args={[0.62, 0.1]} />
                  <meshBasicMaterial color="#ff4b4b" toneMapped={false} depthTest={false} depthWrite={false} />
                </mesh>
              </>
            )}
          </group>
        );
      })}

      {/* ball and a height-aware ground shadow */}
      <mesh ref={ball} geometry={ballGeometry} position={BALL_SPOT.toArray()} castShadow>
        <meshStandardMaterial map={ballTexture} roughness={0.48} metalness={0.03} />
      </mesh>
      <mesh ref={ballShadow} rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.012, 9]}>
        <circleGeometry args={[0.17, 16]} />
        <meshBasicMaterial color="#020906" transparent opacity={0.32} depthWrite={false} />
      </mesh>
    </>
  );
}

export function FinalThirdPitch3D({
  picking,
  showZones,
  revealedSave,
  scouting,
  openZones = null,
  shotZone,
  willSave,
  resolving,
  settled,
  scored,
  kickSeed,
  saveStyle,
  onPick,
}: {
  picking: boolean;
  showZones?: boolean;
  revealedSave: string | null;
  scouting: boolean;
  openZones?: string[] | null;
  shotZone: Zone | null;
  willSave: boolean | null;
  resolving: boolean;
  settled: boolean;
  scored: boolean | null;
  kickSeed: number;
  saveStyle?: KeeperSaveStyle;
  onPick: (zone: Zone) => void;
}) {
  const zones: Zone[] = useMemo(
    () => [
      { id: 'TL', x: 22, y: 24 },
      { id: 'TC', x: 50, y: 22 },
      { id: 'TR', x: 78, y: 24 },
      { id: 'BL', x: 22, y: 52 },
      { id: 'BC', x: 50, y: 54 },
      { id: 'BR', x: 78, y: 52 },
    ],
    [],
  );
  const kick = useMemo(() => kickFromSeed(kickSeed), [kickSeed]);
  const showGoalFx = settled && scored === true;
  const showSaveFx = settled && scored === false;

  return (
    <div className="relative mx-auto aspect-[4/3] w-full touch-manipulation overflow-hidden rounded-[24px] border border-white/10 bg-surface-page shadow-[inset_0_1px_0_rgba(255,255,255,0.08)] sm:aspect-[16/10]">
      <Canvas
        shadows={{ type: THREE.PCFShadowMap }}
        dpr={[1, 1.5]}
        camera={{ position: [0.72, 2.25, 14.8], fov: 43, near: 0.1, far: 70 }}
        gl={{ antialias: true, alpha: false, powerPreference: 'high-performance' }}
        onCreated={({ camera }) => camera.lookAt(-0.08, 1.05, 0)}
      >
        <color attach="background" args={['#07111d']} />
        <fog attach="fog" args={['#07111d', 24, 48]} />
        <Suspense fallback={null}><Scene
          key={kick.id}
          picking={picking}
          showZones={showZones ?? picking}
          revealedSave={revealedSave}
          openZones={openZones}
          shotZone={shotZone}
          willSave={willSave}
          resolving={resolving}
          settled={settled}
          scored={scored}
          onPick={onPick}
          zones={zones}
          kick={kick}
          saveStyle={saveStyle ?? (['catch', 'parry', 'tip'] as const)[Math.abs(kickSeed) % 3]}
        /></Suspense>
      </Canvas>

      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_42%,transparent_45%,rgba(1,6,12,0.34)_100%)]"
      />
      {scouting && (
        <div
          className="pointer-events-none absolute inset-y-[4%] z-30 w-10"
          style={{
            background:
              'linear-gradient(90deg, transparent, rgba(88,204,2,0.5), rgba(255,255,255,0.65), rgba(88,204,2,0.5), transparent)',
            animation: 'ft3d-sweep 0.9s ease-in-out forwards',
          }}
        />
      )}
      {showGoalFx && (
        <div
          className="pointer-events-none absolute inset-0 animate-pulse"
          style={{
            background:
              kick.id === 'ronaldo'
                ? 'radial-gradient(circle at 50% 40%, rgba(255,229,0,0.38), transparent 58%)'
                : kick.id === 'messi'
                  ? 'radial-gradient(circle at 38% 42%, rgba(80,170,255,0.42), transparent 58%)'
                  : kick.id === 'beckham'
                    ? 'radial-gradient(circle at 62% 40%, rgba(218,31,38,0.4), transparent 58%)'
                    : kick.id === 'carlos'
                      ? 'radial-gradient(circle at 32% 44%, rgba(253,225,0,0.4), transparent 58%)'
                      : kick.id === 'ronaldinho'
                        ? 'radial-gradient(circle at 58% 38%, rgba(40,180,90,0.42), transparent 58%)'
                        : 'radial-gradient(circle at 42% 40%, rgba(88,204,2,0.42), transparent 58%)',
          }}
        />
      )}
      {showSaveFx && (
        <div
          className="pointer-events-none absolute inset-0"
          style={{ background: 'radial-gradient(circle at 50% 40%, rgba(255,75,75,0.34), transparent 58%)' }}
        />
      )}
      <style>{`@keyframes ft3d-sweep { from { left: -12%; opacity: 0; } 30% { opacity: 0.9; } to { left: 104%; opacity: 0; } }`}</style>
    </div>
  );
}
