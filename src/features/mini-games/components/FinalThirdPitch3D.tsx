'use client';

/**
 * FINAL THIRD — compact three.js free-kick scene.
 *
 * The scene is deliberately asset-free: the footballers are articulated,
 * low-poly rigs with named joints, football proportions and kit details. The
 * joints are resolved from each group inside useFrame so React never reads a
 * ref during render (required by the React Compiler lint rules).
 *
 * Timeline after a zone is picked: 0–0.45s run-up/strike · 0.45s launch ·
 * 0.45–1.23s flight. The parent resolves the outcome at 1.35s.
 *
 * Shot style is derived from the zone (curl / drive / placed) so each pick
 * reads differently without changing the 0.45s launch or 0.78s flight budget.
 */

import { useMemo, useRef, useState, type RefObject } from 'react';
import { Canvas, useFrame, type ThreeEvent } from '@react-three/fiber';
import * as THREE from 'three';

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
const SHOOTER_IDLE = new THREE.Vector3(-0.95, 0, 10.65);
const SHOOTER_STRIKE = new THREE.Vector3(-0.18, 0, 9.38);
const KICK_LEAD_S = 0.45;
const FLIGHT_S = 0.78;
const SAVE_CONTACT_S = FLIGHT_S * 0.88;
const SKIN_DEFAULT = '#b9784f';

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

const REAR_ADS = [-7.3, -5.1, 5.1, 7.3] as const;
const SIDE_ADS = [-1, 1] as const;
const FLOODLIGHTS = [-8.4, 8.4] as const;
const GOAL_POSTS = [-3.72, 3.72] as const;

const lerp = THREE.MathUtils.lerp;
const clamp01 = (v: number) => Math.min(1, Math.max(0, v));
const easeInOut = (v: number) => {
  const t = clamp01(v);
  return t * t * (3 - 2 * t);
};
const easeOut = (v: number) => {
  const t = clamp01(v);
  return 1 - (1 - t) * (1 - t);
};

type ShotStyle = 'curl' | 'drive' | 'placed';

function shotStyleFromZone(id: string): ShotStyle {
  if (id === 'TL' || id === 'TR') return 'curl';
  if (id === 'TC') return 'drive';
  return 'placed';
}

function zoneSide(id: string): number {
  if (id.endsWith('L')) return 1;
  if (id.endsWith('R')) return -1;
  return 0;
}

function seeded(seed: number): () => number {
  let value = seed >>> 0;
  return () => {
    value = (value * 1664525 + 1013904223) >>> 0;
    return value / 4294967296;
  };
}

/* ── generated textures ───────────────────────────────────────────── */

function useGrassTexture(): THREE.Texture {
  return useMemo(() => {
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 512;
    const context = canvas.getContext('2d')!;
    for (let i = 0; i < 10; i += 1) {
      context.fillStyle = i % 2 ? '#176526' : '#1d7429';
      context.fillRect(0, (512 / 10) * i, 512, 512 / 10);
    }
    const random = seeded(42);
    for (let i = 0; i < 2600; i += 1) {
      const light = random() > 0.54;
      context.fillStyle = light
        ? `rgba(175,225,141,${0.018 + random() * 0.035})`
        : `rgba(0,18,4,${0.018 + random() * 0.04})`;
      context.fillRect(random() * 512, random() * 512, 1 + random() * 2, 1 + random() * 3);
    }
    const texture = new THREE.CanvasTexture(canvas);
    texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
    texture.repeat.set(2.2, 3.4);
    texture.anisotropy = 4;
    texture.colorSpace = THREE.SRGBColorSpace;
    return texture;
  }, []);
}

function useNetTexture(): THREE.Texture {
  return useMemo(() => {
    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 256;
    const context = canvas.getContext('2d')!;
    context.clearRect(0, 0, 256, 256);
    context.strokeStyle = 'rgba(240,248,255,0.8)';
    context.lineWidth = 2;
    for (let i = 0; i <= 256; i += 16) {
      context.beginPath();
      context.moveTo(i, 0);
      context.lineTo(i, 256);
      context.stroke();
      context.beginPath();
      context.moveTo(0, i);
      context.lineTo(256, i);
      context.stroke();
    }
    const texture = new THREE.CanvasTexture(canvas);
    texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
    return texture;
  }, []);
}

function useBallTexture(): THREE.Texture {
  return useMemo(() => {
    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 128;
    const context = canvas.getContext('2d')!;
    context.fillStyle = '#f5f5ef';
    context.fillRect(0, 0, 256, 128);
    context.fillStyle = '#172130';
    for (let i = 0; i < 12; i += 1) {
      const x = (i % 4) * 64 + 32 + (i % 2) * 10;
      const y = Math.floor(i / 4) * 42 + 22;
      context.beginPath();
      for (let k = 0; k < 5; k += 1) {
        const angle = (k / 5) * Math.PI * 2 - Math.PI / 2;
        const pointX = x + Math.cos(angle) * 13;
        const pointY = y + Math.sin(angle) * 13;
        if (k === 0) context.moveTo(pointX, pointY);
        else context.lineTo(pointX, pointY);
      }
      context.closePath();
      context.fill();
    }
    const texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    return texture;
  }, []);
}

function useCrowdTexture(): THREE.Texture {
  return useMemo(() => {
    const canvas = document.createElement('canvas');
    canvas.width = 1024;
    canvas.height = 384;
    const context = canvas.getContext('2d')!;
    const gradient = context.createLinearGradient(0, 0, 0, 384);
    gradient.addColorStop(0, '#111a2a');
    gradient.addColorStop(1, '#070d18');
    context.fillStyle = gradient;
    context.fillRect(0, 0, 1024, 384);

    const random = seeded(2026);
    const shirts = ['#f7f8fa', '#ffe500', '#1cb0f6', '#ff4b4b', '#58cc02', '#ff9600', '#a8b2c5'];
    const skins = ['#f0c49a', '#d99b68', '#aa6948', '#70452f'];
    for (let row = 0; row < 12; row += 1) {
      const y = 26 + row * 29;
      const offset = row % 2 === 0 ? 0 : 10;
      for (let col = 0; col < 53; col += 1) {
        const x = col * 20 + offset + (random() - 0.5) * 5;
        const bounce = (random() - 0.5) * 5;
        context.fillStyle = shirts[Math.floor(random() * shirts.length)];
        context.fillRect(x - 5, y + bounce + 7, 10, 11);
        context.fillStyle = skins[Math.floor(random() * skins.length)];
        context.beginPath();
        context.arc(x, y + bounce + 3, 4, 0, Math.PI * 2);
        context.fill();
        if (random() > 0.86) {
          context.strokeStyle = context.fillStyle;
          context.lineWidth = 3;
          context.beginPath();
          context.moveTo(x - 3, y + bounce + 10);
          context.lineTo(x - 8, y + bounce - 2);
          context.moveTo(x + 3, y + bounce + 10);
          context.lineTo(x + 8, y + bounce - 2);
          context.stroke();
        }
      }
    }
    const texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.anisotropy = 2;
    return texture;
  }, []);
}

function useAdTexture(): THREE.Texture {
  return useMemo(() => {
    const canvas = document.createElement('canvas');
    canvas.width = 1024;
    canvas.height = 128;
    const context = canvas.getContext('2d')!;
    context.fillStyle = '#071320';
    context.fillRect(0, 0, 1024, 128);
    context.fillStyle = '#58cc02';
    context.fillRect(0, 0, 340, 128);
    context.fillStyle = '#ffe500';
    context.fillRect(682, 0, 342, 128);
    context.textAlign = 'center';
    context.textBaseline = 'middle';
    context.font = '900 49px sans-serif';
    context.fillStyle = '#081221';
    context.fillText('FINAL THIRD', 170, 65);
    context.fillStyle = '#ffffff';
    context.fillText('PLAY BOLD', 511, 65);
    context.fillStyle = '#081221';
    context.fillText('MATCH NIGHT', 853, 65);
    const texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.anisotropy = 2;
    return texture;
  }, []);
}

/* ── articulated footballers ──────────────────────────────────────── */

const JOINT_NAMES = [
  'pelvis',
  'spine',
  'torso',
  'hipL',
  'hipR',
  'kneeL',
  'kneeR',
  'ankleL',
  'ankleR',
  'shoL',
  'shoR',
  'elbL',
  'elbR',
  'head',
] as const;
type JointName = (typeof JOINT_NAMES)[number];
type JointMap = Partial<Record<JointName, THREE.Object3D>>;

function resolveJoints(root: THREE.Group): JointMap {
  const joints: JointMap = {};
  for (const name of JOINT_NAMES) joints[name] = root.getObjectByName(name) ?? undefined;
  return joints;
}

function setJoint(joint: THREE.Object3D | undefined, x: number, y = 0, z = 0) {
  joint?.rotation.set(x, y, z);
}

function PlayerLeg({
  side,
  skin,
  sock,
  boot,
}: {
  side: 'L' | 'R';
  skin: string;
  sock: string;
  boot: string;
}) {
  const x = side === 'L' ? -0.115 : 0.115;
  return (
    <group name={`hip${side}`} position={[x, -0.07, 0]}>
      <mesh position={[0, -0.17, 0]} castShadow>
        <capsuleGeometry args={[0.08, 0.2, 4, 8]} />
        <meshStandardMaterial color={skin} roughness={0.82} flatShading />
      </mesh>
      <group name={`knee${side}`} position={[0, -0.36, 0]}>
        <mesh scale={[1.02, 0.86, 1]} castShadow>
          <sphereGeometry args={[0.077, 8, 8]} />
          <meshStandardMaterial color={skin} roughness={0.82} flatShading />
        </mesh>
        <mesh position={[0, -0.17, 0]} castShadow>
          <capsuleGeometry args={[0.066, 0.22, 4, 8]} />
          <meshStandardMaterial color={sock} roughness={0.76} flatShading />
        </mesh>
        <group name={`ankle${side}`} position={[0, -0.35, 0]}>
          <mesh position={[0, -0.02, 0.075]} rotation={[0.08, 0, 0]} castShadow>
            <boxGeometry args={[0.14, 0.09, 0.29]} />
            <meshStandardMaterial color={boot} roughness={0.62} flatShading />
          </mesh>
          <mesh position={[0, 0.025, 0.13]} rotation={[0.08, 0, 0]}>
            <boxGeometry args={[0.105, 0.012, 0.12]} />
            <meshStandardMaterial color="#edf3f8" roughness={0.7} />
          </mesh>
        </group>
      </group>
    </group>
  );
}

function PlayerArm({
  side,
  kit,
  skin,
  glove,
}: {
  side: 'L' | 'R';
  kit: string;
  skin: string;
  glove?: string;
}) {
  const x = side === 'L' ? -0.265 : 0.265;
  return (
    <group name={`sho${side}`} position={[x, 0.13, 0]}>
      <mesh castShadow>
        <sphereGeometry args={[0.092, 8, 8]} />
        <meshStandardMaterial color={kit} roughness={0.78} flatShading />
      </mesh>
      <mesh position={[0, -0.105, 0]} castShadow>
        <capsuleGeometry args={[0.064, 0.12, 4, 8]} />
        <meshStandardMaterial color={kit} roughness={0.78} flatShading />
      </mesh>
      <group name={`elb${side}`} position={[0, -0.25, 0]}>
        <mesh position={[0, -0.115, 0]} castShadow>
          <capsuleGeometry args={[0.052, 0.18, 4, 8]} />
          <meshStandardMaterial color={skin} roughness={0.82} flatShading />
        </mesh>
        <mesh position={[0, -0.265, 0]} scale={glove ? [1.35, 1.1, 0.72] : [1, 1, 0.8]} castShadow>
          <sphereGeometry args={[glove ? 0.073 : 0.062, 8, 8]} />
          <meshStandardMaterial color={glove ?? skin} roughness={0.72} flatShading />
        </mesh>
        {glove && (
          <mesh position={[0, -0.276, 0.045]} scale={[1.2, 0.72, 0.55]}>
            <boxGeometry args={[0.09, 0.1, 0.05]} />
            <meshStandardMaterial color="#071320" roughness={0.78} />
          </mesh>
        )}
      </group>
    </group>
  );
}

function ShirtNumber({ number, back = false }: { number: number; back?: boolean }) {
  const z = back ? -0.198 : 0.198;
  const rotationY = back ? Math.PI : 0;
  const bars = number % 2 === 0
    ? [
        [0, 0.07, 0, 0.1],
        [0.035, 0, Math.PI / 2, 0.075],
        [-0.035, -0.075, Math.PI / 2, 0.075],
      ]
    : [
        [0, 0.07, 0, 0.1],
        [0, -0.025, 0, 0.16],
        [-0.035, 0.015, Math.PI / 2, 0.07],
      ];
  return (
    <group position={[0, 0.025, z]} rotation={[0, rotationY, 0]}>
      {bars.map(([x, y, rotation, length], index) => (
        <mesh key={index} position={[x, y, 0]} rotation={[0, 0, rotation]}>
          <planeGeometry args={[0.024, length]} />
          <meshBasicMaterial color="#f8fbff" toneMapped={false} />
        </mesh>
      ))}
    </group>
  );
}

function PlayerHead({ skin, hair }: { skin: string; hair: string }) {
  return (
    <group name="head" position={[0, 0.5, 0]}>
      <mesh scale={[0.88, 1, 0.92]} castShadow>
        <sphereGeometry args={[0.15, 10, 10]} />
        <meshStandardMaterial color={skin} roughness={0.86} flatShading />
      </mesh>
      <mesh position={[0, 0.084, -0.012]} scale={[0.93, 0.54, 0.94]} castShadow>
        <sphereGeometry args={[0.153, 10, 10]} />
        <meshStandardMaterial color={hair} roughness={0.92} flatShading />
      </mesh>
      <mesh position={[0, 0.125, 0.025]} rotation={[0.2, 0, 0]} castShadow>
        <boxGeometry args={[0.18, 0.05, 0.18]} />
        <meshStandardMaterial color={hair} roughness={0.94} flatShading />
      </mesh>
      <mesh position={[-0.051, 0.015, 0.136]}>
        <sphereGeometry args={[0.012, 6, 6]} />
        <meshBasicMaterial color="#101820" />
      </mesh>
      <mesh position={[0.051, 0.015, 0.136]}>
        <sphereGeometry args={[0.012, 6, 6]} />
        <meshBasicMaterial color="#101820" />
      </mesh>
      <mesh position={[0, -0.018, 0.155]} rotation={[Math.PI / 2, 0, 0]}>
        <coneGeometry args={[0.018, 0.055, 6]} />
        <meshStandardMaterial color={skin} roughness={0.86} flatShading />
      </mesh>
    </group>
  );
}

function PlayerRig({
  kit,
  shorts,
  socks,
  skin = SKIN_DEFAULT,
  boot = '#101722',
  hair = '#1b120c',
  glove,
  number,
  accent = '#f8fbff',
}: {
  kit: string;
  shorts: string;
  socks: string;
  skin?: string;
  boot?: string;
  hair?: string;
  glove?: string;
  number: number;
  accent?: string;
}) {
  return (
    <group name="pelvis" position={[0, 0.93, 0]}>
      <PlayerLeg side="L" skin={skin} sock={socks} boot={boot} />
      <PlayerLeg side="R" skin={skin} sock={socks} boot={boot} />
      <mesh position={[0, -0.005, 0]} scale={[1, 0.82, 0.92]} castShadow>
        <boxGeometry args={[0.34, 0.22, 0.24]} />
        <meshStandardMaterial color={shorts} roughness={0.78} flatShading />
      </mesh>
      <mesh position={[-0.095, -0.12, 0]} castShadow>
        <cylinderGeometry args={[0.07, 0.086, 0.18, 8]} />
        <meshStandardMaterial color={shorts} roughness={0.78} flatShading />
      </mesh>
      <mesh position={[0.095, -0.12, 0]} castShadow>
        <cylinderGeometry args={[0.07, 0.086, 0.18, 8]} />
        <meshStandardMaterial color={shorts} roughness={0.78} flatShading />
      </mesh>
      <group name="spine" position={[0, 0.055, 0]}>
        <group name="torso" position={[0, 0.31, 0]}>
          <mesh castShadow>
            <cylinderGeometry args={[0.245, 0.19, 0.47, 8]} />
            <meshStandardMaterial color={kit} roughness={0.76} flatShading />
          </mesh>
          <mesh position={[-0.19, 0, 0.145]} rotation={[0, 0, -0.06]}>
            <boxGeometry args={[0.035, 0.4, 0.018]} />
            <meshStandardMaterial color={accent} roughness={0.75} />
          </mesh>
          <mesh position={[0.19, 0, 0.145]} rotation={[0, 0, 0.06]}>
            <boxGeometry args={[0.035, 0.4, 0.018]} />
            <meshStandardMaterial color={accent} roughness={0.75} />
          </mesh>
          <mesh position={[0, 0.225, 0]} rotation={[Math.PI / 2, 0, 0]}>
            <torusGeometry args={[0.072, 0.018, 6, 12]} />
            <meshStandardMaterial color={accent} roughness={0.72} flatShading />
          </mesh>
          <mesh position={[-0.105, 0.11, 0.215]}>
            <circleGeometry args={[0.025, 8]} />
            <meshBasicMaterial color="#ffe500" toneMapped={false} />
          </mesh>
          <ShirtNumber number={number} />
          <ShirtNumber number={number} back />
          <PlayerArm side="L" kit={kit} skin={skin} glove={glove} />
          <PlayerArm side="R" kit={kit} skin={skin} glove={glove} />
          <mesh position={[0, 0.315, 0]}>
            <cylinderGeometry args={[0.058, 0.068, 0.12, 8]} />
            <meshStandardMaterial color={skin} roughness={0.86} flatShading />
          </mesh>
          <PlayerHead skin={skin} hair={hair} />
        </group>
      </group>
    </group>
  );
}

interface Timeline {
  start: number | null;
}

function Shooter({
  tl,
  shotZone,
  settled,
  scored,
}: {
  tl: RefObject<Timeline>;
  shotZone: Zone | null;
  settled: boolean;
  scored: boolean | null;
}) {
  const root = useRef<THREE.Group>(null);
  const joints = useRef<JointMap | null>(null);

  useFrame((state) => {
    const player = root.current;
    if (!player) return;
    if (!joints.current) joints.current = resolveJoints(player);
    const joint = joints.current;
    const now = state.clock.elapsedTime;
    const start = tl.current?.start ?? null;
    const style = shotStyleFromZone(shotZone?.id ?? 'TC');
    const side = zoneSide(shotZone?.id ?? 'TC');

    if (start == null) {
      const breathe = Math.sin(now * 2.2);
      player.position.copy(SHOOTER_IDLE);
      player.position.y = 0.018 + breathe * 0.012;
      player.rotation.set(0, Math.PI + 0.13, -0.025);
      setJoint(joint.pelvis, 0, 0, breathe * 0.035);
      setJoint(joint.spine, 0.03, 0, -0.04);
      setJoint(joint.hipL, 0.08 + breathe * 0.025);
      setJoint(joint.hipR, -0.04 - breathe * 0.025);
      setJoint(joint.kneeL, 0.12);
      setJoint(joint.kneeR, 0.08);
      setJoint(joint.shoL, -0.08, 0, 0.13);
      setJoint(joint.shoR, 0.08, 0, -0.13);
      setJoint(joint.elbL, -0.42);
      setJoint(joint.elbR, -0.42);
      setJoint(joint.head, 0, -0.12, 0.02);
      return;
    }

    const phase = now - start;
    const strides = style === 'drive' ? 4.55 : style === 'curl' ? 3.45 : 2.7;
    const hop = style === 'drive' ? 0.09 : style === 'curl' ? 0.07 : 0.032;
    const weave = style === 'curl' ? 0.28 * (side || 1) : style === 'drive' ? 0.04 : 0.07;
    const yaw0 = style === 'curl' ? 0.22 * (side || 1) : style === 'drive' ? 0.06 : 0.16;
    const yaw1 = style === 'curl' ? 0.12 * (side || 1) : 0.02;

    if (!settled) {
      if (phase < 0.29) {
        const progress = easeOut(phase / 0.29);
        const stride = Math.sin(progress * Math.PI * strides);
        player.position.lerpVectors(SHOOTER_IDLE, SHOOTER_STRIKE, progress * 0.78);
        player.position.x -= Math.sin(progress * Math.PI) * weave;
        player.position.y = Math.abs(Math.sin(progress * Math.PI * (style === 'placed' ? 1.4 : 2.2))) * hop;
        player.rotation.set(0, Math.PI + lerp(yaw0, yaw1, progress), style === 'placed' ? -0.06 : -0.02);
        setJoint(joint.pelvis, 0, side * (style === 'curl' ? 0.12 : 0.04) * progress, -stride * 0.05);
        setJoint(joint.hipL, stride * (style === 'placed' ? 0.52 : 0.78));
        setJoint(joint.hipR, -stride * (style === 'placed' ? 0.52 : 0.78));
        setJoint(joint.kneeL, Math.max(0, -stride) * 0.98 + 0.12);
        setJoint(joint.kneeR, Math.max(0, stride) * 0.98 + 0.12);
        setJoint(joint.ankleL, -Math.max(0, -stride) * 0.26);
        setJoint(joint.ankleR, -Math.max(0, stride) * 0.26);
        setJoint(joint.shoL, -stride * 0.72, 0, 0.16);
        setJoint(joint.shoR, stride * 0.72, 0, -0.16);
        setJoint(joint.elbL, style === 'drive' ? -0.68 : -0.5);
        setJoint(joint.elbR, style === 'drive' ? -0.68 : -0.5);
        setJoint(joint.spine, style === 'placed' ? 0.08 : -0.14, side * (style === 'curl' ? 0.18 : 0.04), 0.02);
        setJoint(joint.head, 0.04, -0.08 + side * 0.06, 0);
      } else {
        const strike = easeInOut((phase - 0.29) / (KICK_LEAD_S - 0.29));
        const follow = easeOut(clamp01((phase - KICK_LEAD_S) / 0.42));
        const whip = style === 'drive' ? 1.18 : style === 'curl' ? 1 : 0.72;
        player.position.lerpVectors(SHOOTER_IDLE, SHOOTER_STRIKE, 0.78 + strike * 0.22);
        player.position.y = Math.sin(strike * Math.PI) * (style === 'placed' ? 0.012 : 0.034);
        player.rotation.set(
          0,
          Math.PI + lerp(yaw1, style === 'curl' ? -0.16 * (side || 1) : 0.02, strike),
          lerp(-0.05, style === 'drive' ? 0.18 : 0.1, strike),
        );
        const hipSnap = phase < KICK_LEAD_S
          ? lerp(0.88 * whip, -1.48 * whip, strike)
          : lerp(-1.48 * whip, style === 'placed' ? -0.42 : -0.62, follow);
        const kneeSnap = phase < KICK_LEAD_S
          ? lerp(style === 'placed' ? 0.92 : 1.22, style === 'placed' ? 0.28 : 0.1, strike)
          : lerp(style === 'placed' ? 0.28 : 0.1, 0.32, follow);
        setJoint(joint.pelvis, 0, lerp(-0.08, style === 'curl' ? 0.28 * (side || 1) : 0.16, strike), lerp(-0.04, 0.2, strike));
        setJoint(joint.hipR, hipSnap);
        setJoint(joint.kneeR, kneeSnap);
        setJoint(joint.ankleR, style === 'placed' ? lerp(0.18, -0.22, strike) : lerp(-0.22, 0.28, strike));
        setJoint(joint.hipL, lerp(-0.22, style === 'placed' ? 0.28 : 0.14, strike));
        setJoint(joint.kneeL, lerp(0.55, 0.26, strike));
        setJoint(joint.ankleL, -0.1);
        setJoint(joint.shoL, lerp(-0.72, 0.92 * whip, strike), 0, lerp(0.16, 0.62, strike));
        setJoint(joint.shoR, lerp(0.86, -0.82 * whip, strike), 0, lerp(-0.14, -0.52, strike));
        setJoint(joint.elbL, -0.46);
        setJoint(joint.elbR, -0.58);
        setJoint(joint.spine, lerp(0.14, style === 'drive' ? -0.32 : -0.18, strike), side * (style === 'curl' ? 0.22 : 0.05), lerp(-0.04, -0.2, strike));
        setJoint(joint.head, 0.1, 0.04 + side * 0.05, 0.05);
      }
      return;
    }

    player.position.copy(SHOOTER_STRIKE);
    player.rotation.set(0, Math.PI + 0.02, 0);
    if (scored) {
      const bounce = Math.abs(Math.sin(now * 6.2));
      player.position.y = bounce * 0.085;
      setJoint(joint.pelvis, 0, 0, Math.sin(now * 3.1) * 0.05);
      setJoint(joint.hipL, -0.06);
      setJoint(joint.hipR, 0.08);
      setJoint(joint.kneeL, 0.12);
      setJoint(joint.kneeR, 0.12);
      setJoint(joint.shoL, -2.78, 0, 0.22);
      setJoint(joint.shoR, -2.78, 0, -0.22);
      setJoint(joint.elbL, -0.12);
      setJoint(joint.elbR, -0.12);
      setJoint(joint.spine, -0.12);
      setJoint(joint.head, -0.12);
    } else {
      setJoint(joint.hipL, 0.02);
      setJoint(joint.hipR, 0.02);
      setJoint(joint.kneeL, 0.14);
      setJoint(joint.kneeR, 0.14);
      setJoint(joint.shoL, -2.32, 0, 0.62);
      setJoint(joint.shoR, -2.32, 0, -0.62);
      setJoint(joint.elbL, -1.78);
      setJoint(joint.elbR, -1.78);
      setJoint(joint.spine, 0.18);
      setJoint(joint.head, 0.2);
    }
  });

  return (
    <group ref={root} position={SHOOTER_IDLE.toArray()} rotation={[0, Math.PI + 0.13, 0]}>
      <PlayerRig
        kit="#ffe500"
        shorts="#10233e"
        socks="#f4f7fb"
        skin="#a96544"
        hair="#21140c"
        boot="#131a24"
        number={9}
        accent="#10233e"
      />
    </group>
  );
}

function KeeperPlayer({
  tl,
  shotZone,
  willSave,
}: {
  tl: RefObject<Timeline>;
  shotZone: Zone | null;
  willSave: boolean | null;
}) {
  const root = useRef<THREE.Group>(null);
  const joints = useRef<JointMap | null>(null);

  useFrame((state) => {
    const player = root.current;
    if (!player) return;
    if (!joints.current) joints.current = resolveJoints(player);
    const joint = joints.current;
    const now = state.clock.elapsedTime;
    const start = tl.current?.start ?? null;

    const shotTarget = shotZone ? ZONE_POS[shotZone.id] : null;
    const shotPhase = start == null ? -1 : now - start;
    const dive = clamp01((shotPhase - (KICK_LEAD_S + 0.06)) / 0.48);

    if (!shotTarget || willSave == null || dive <= 0) {
      const sway = Math.sin(now * 2.35) * 0.15;
      player.position.set(sway, -0.08 + Math.abs(Math.sin(now * 2.35)) * 0.018, 0.48);
      player.rotation.set(0, 0, 0);
      setJoint(joint.pelvis, -0.1, 0, -sway * 0.08);
      setJoint(joint.spine, 0.22);
      setJoint(joint.hipL, -0.48);
      setJoint(joint.hipR, -0.48);
      setJoint(joint.kneeL, 0.92);
      setJoint(joint.kneeR, 0.92);
      setJoint(joint.ankleL, -0.22);
      setJoint(joint.ankleR, -0.22);
      setJoint(joint.shoL, -0.55, 0, -0.68);
      setJoint(joint.shoR, -0.55, 0, 0.68);
      setJoint(joint.elbL, -0.74);
      setJoint(joint.elbR, -0.74);
      setJoint(joint.head, -0.12);
      return;
    }

    const saveSide = shotTarget[0] === 0 ? (shotZone?.id === 'TC' ? 1 : -1) : Math.sign(shotTarget[0]);
    const diveSide = willSave ? saveSide : -saveSide;
    const destinationX = willSave ? shotTarget[0] * 0.76 : diveSide * 1.7;
    const destinationY = willSave ? Math.max(0.08, shotTarget[1] - 0.62) : 0.34;
    const movement = easeInOut(dive);
    const lift = Math.sin(movement * Math.PI) * (willSave ? 0.42 : 0.3);

    player.position.set(lerp(0, destinationX, movement), lerp(-0.08, destinationY, movement) + lift, 0.48);
    player.rotation.set(0, 0, lerp(0, -diveSide * 1.32, movement));
    setJoint(joint.pelvis, lerp(-0.1, 0.05, movement), 0, lerp(0, diveSide * 0.1, movement));
    setJoint(joint.spine, lerp(0.22, -0.06, movement));
    const reach = diveSide * lerp(0.68, 1.72, movement);
    setJoint(joint.shoL, lerp(-0.55, -0.12, movement), 0, reach);
    setJoint(joint.shoR, lerp(-0.55, -0.12, movement), 0, reach);
    setJoint(joint.elbL, lerp(-0.74, -0.06, movement));
    setJoint(joint.elbR, lerp(-0.74, -0.06, movement));
    setJoint(joint.hipL, lerp(-0.48, 0.12, movement), 0, -diveSide * 0.12);
    setJoint(joint.hipR, lerp(-0.48, -0.24, movement), 0, diveSide * 0.16);
    setJoint(joint.kneeL, lerp(0.92, 0.28, movement));
    setJoint(joint.kneeR, lerp(0.92, 0.58, movement));
    setJoint(joint.ankleL, lerp(-0.22, 0.08, movement));
    setJoint(joint.ankleR, lerp(-0.22, -0.12, movement));
    setJoint(joint.head, 0, 0, -diveSide * lerp(0, 0.16, movement));
  });

  return (
    <group ref={root} position={[0, -0.08, 0.48]}>
      <PlayerRig
        kit="#58cc02"
        shorts="#071b18"
        socks="#58cc02"
        skin="#8f563b"
        hair="#17130e"
        glove="#f7fbff"
        boot="#101820"
        number={1}
        accent="#071b18"
      />
    </group>
  );
}

function WallPlayer({
  tl,
  x,
  delay,
  skin,
  hair,
  number,
}: {
  tl: RefObject<Timeline>;
  x: number;
  delay: number;
  skin: string;
  hair: string;
  number: number;
}) {
  const root = useRef<THREE.Group>(null);
  const joints = useRef<JointMap | null>(null);

  useFrame((state) => {
    const player = root.current;
    if (!player) return;
    if (!joints.current) joints.current = resolveJoints(player);
    const joint = joints.current;
    const now = state.clock.elapsedTime;
    const start = tl.current?.start ?? null;

    setJoint(joint.spine, 0.06);
    setJoint(joint.shoL, -0.6, 0, 0.45);
    setJoint(joint.shoR, -0.6, 0, -0.45);
    setJoint(joint.elbL, -1.82, 0, -0.18);
    setJoint(joint.elbR, -1.82, 0, 0.18);
    setJoint(joint.head, 0, -x * 0.035, 0);

    const jumpAt = start == null ? null : start + KICK_LEAD_S - 0.035 + delay;
    if (jumpAt != null && now >= jumpAt) {
      const jump = clamp01((now - jumpAt) / 0.55);
      const height = Math.sin(jump * Math.PI) * 0.47;
      player.position.set(x, height, 4.55);
      player.rotation.set(0, 0, Math.sin(jump * Math.PI) * (x + 1.5) * 0.025);
      const tuck = Math.sin(jump * Math.PI);
      setJoint(joint.hipL, -tuck * 0.42);
      setJoint(joint.hipR, -tuck * 0.42);
      setJoint(joint.kneeL, 0.1 + tuck * 0.82);
      setJoint(joint.kneeR, 0.1 + tuck * 0.82);
      setJoint(joint.ankleL, -tuck * 0.18);
      setJoint(joint.ankleR, -tuck * 0.18);
    } else {
      const breathe = Math.sin(now * 2.1 + x * 2.7);
      player.position.set(x, breathe * 0.012, 4.55);
      player.rotation.set(0, 0, 0);
      setJoint(joint.hipL, 0);
      setJoint(joint.hipR, 0);
      setJoint(joint.kneeL, 0.1);
      setJoint(joint.kneeR, 0.1);
      setJoint(joint.ankleL, 0);
      setJoint(joint.ankleR, 0);
    }
  });

  return (
    <group ref={root} position={[x, 0, 4.55]}>
      <PlayerRig
        kit="#1754d1"
        shorts="#f4f7fb"
        socks="#1754d1"
        skin={skin}
        hair={hair}
        boot="#111a26"
        number={number}
        accent="#8fd3ff"
      />
    </group>
  );
}

/* ── stadium ──────────────────────────────────────────────────────── */

function Floodlight({ x }: { x: number }) {
  return (
    <group position={[x, 0, -2.8]}>
      <mesh position={[0, 3.65, 0]}>
        <cylinderGeometry args={[0.045, 0.085, 7.3, 8]} />
        <meshStandardMaterial color="#5f6e7d" metalness={0.68} roughness={0.42} />
      </mesh>
      <mesh position={[0, 7.28, 0]}>
        <boxGeometry args={[1.4, 0.72, 0.18]} />
        <meshStandardMaterial color="#172231" metalness={0.45} roughness={0.46} />
      </mesh>
      {[-0.48, -0.16, 0.16, 0.48].map((offset) => (
        <mesh key={offset} position={[offset, 7.31, 0.105]}>
          <boxGeometry args={[0.23, 0.45, 0.04]} />
          <meshBasicMaterial color="#eff9ff" toneMapped={false} />
        </mesh>
      ))}
    </group>
  );
}

function Stadium({ crowd, ad }: { crowd: THREE.Texture; ad: THREE.Texture }) {
  return (
    <group>
      {/* packed end stand */}
      <mesh position={[0, 4.2, -5.9]}>
        <boxGeometry args={[20.8, 7.1, 1.2]} />
        <meshStandardMaterial color="#0a1220" roughness={0.96} />
      </mesh>
      <mesh position={[0, 4.15, -5.25]} rotation={[-0.055, 0, 0]}>
        <planeGeometry args={[19.7, 5.65]} />
        <meshBasicMaterial map={crowd} color="#dce8f5" toneMapped={false} />
      </mesh>
      {/* aisles split the texture into believable sections */}
      {[-6.4, -3.2, 3.2, 6.4].map((x) => (
        <mesh key={x} position={[x, 4.2, -5.16]} rotation={[0, 0, x * 0.002]}>
          <planeGeometry args={[0.16, 5.8]} />
          <meshBasicMaterial color="#7d8a99" />
        </mesh>
      ))}
      <mesh position={[0, 7.95, -4.85]}>
        <boxGeometry args={[22.4, 0.32, 3.7]} />
        <meshStandardMaterial color="#101a29" metalness={0.45} roughness={0.55} />
      </mesh>
      {[-8.7, -4.35, 0, 4.35, 8.7].map((x) => (
        <mesh key={x} position={[x, 5.95, -5.05]}>
          <boxGeometry args={[0.12, 4.1, 0.12]} />
          <meshStandardMaterial color="#536170" metalness={0.58} roughness={0.48} />
        </mesh>
      ))}

      {/* side bowls close the black void without adding dense geometry */}
      <mesh position={[-9.3, 3.65, 0.2]} rotation={[0, 0.42, 0]}>
        <planeGeometry args={[12, 5.5]} />
        <meshBasicMaterial map={crowd} color="#9eafc0" toneMapped={false} />
      </mesh>
      <mesh position={[9.3, 3.65, 0.2]} rotation={[0, -0.42, 0]}>
        <planeGeometry args={[12, 5.5]} />
        <meshBasicMaterial map={crowd} color="#9eafc0" toneMapped={false} />
      </mesh>

      {/* scoreboard and animated-ribbon-style adboards */}
      <mesh position={[0, 6.85, -5.02]}>
        <boxGeometry args={[3.3, 1.02, 0.18]} />
        <meshStandardMaterial color="#03070d" roughness={0.68} />
      </mesh>
      <mesh position={[-0.72, 6.85, -4.91]}>
        <boxGeometry args={[0.88, 0.24, 0.025]} />
        <meshBasicMaterial color="#58cc02" toneMapped={false} />
      </mesh>
      <mesh position={[0.72, 6.85, -4.91]}>
        <boxGeometry args={[0.88, 0.24, 0.025]} />
        <meshBasicMaterial color="#ffe500" toneMapped={false} />
      </mesh>
      {REAR_ADS.map((x) => (
        <group key={x} position={[x, 0.5, -0.45]}>
          <mesh>
            <boxGeometry args={[2, 0.72, 0.16]} />
            <meshStandardMaterial color="#071320" roughness={0.62} />
          </mesh>
          <mesh position={[0, 0, 0.086]}>
            <planeGeometry args={[1.92, 0.62]} />
            <meshBasicMaterial map={ad} toneMapped={false} />
          </mesh>
        </group>
      ))}
      {SIDE_ADS.map((side) => (
        <group key={side} position={[side * 6.15, 0.48, 5.6]} rotation={[0, side * Math.PI / 2, 0]}>
          <mesh>
            <boxGeometry args={[7.2, 0.68, 0.16]} />
            <meshStandardMaterial color="#071320" roughness={0.62} />
          </mesh>
          <mesh position={[0, 0, side * -0.086]} rotation={[0, side > 0 ? Math.PI : 0, 0]}>
            <planeGeometry args={[7.05, 0.58]} />
            <meshBasicMaterial map={ad} toneMapped={false} />
          </mesh>
        </group>
      ))}
      {FLOODLIGHTS.map((x) => <Floodlight key={x} x={x} />)}
    </group>
  );
}

/* ── scene ────────────────────────────────────────────────────────── */

interface SceneProps {
  picking: boolean;
  revealedSave: string | null;
  shotZone: Zone | null;
  willSave: boolean | null;
  resolving: boolean;
  settled: boolean;
  scored: boolean | null;
  onPick: (zone: Zone) => void;
  zones: Zone[];
}

function Scene({
  picking,
  revealedSave,
  shotZone,
  willSave,
  resolving,
  settled,
  scored,
  onPick,
  zones,
}: SceneProps) {
  const grass = useGrassTexture();
  const net = useNetTexture();
  const ballTexture = useBallTexture();
  const crowd = useCrowdTexture();
  const ad = useAdTexture();
  const ball = useRef<THREE.Mesh>(null);
  const ballShadow = useRef<THREE.Mesh>(null);
  const netBack = useRef<THREE.Mesh>(null);
  const [hover, setHover] = useState<string | null>(null);
  const timeline = useRef<Timeline>({ start: null });

  useFrame((state, delta) => {
    const now = state.clock.elapsedTime;
    if ((resolving || settled) && shotZone) {
      if (timeline.current.start == null) timeline.current.start = now;
    } else if (!shotZone) {
      timeline.current.start = null;
    }

    const ballMesh = ball.current;
    const shadowMesh = ballShadow.current;
    if (!ballMesh) return;

    const start = timeline.current.start;
    if (start == null || !shotZone) {
      ballMesh.position.copy(BALL_SPOT);
      ballMesh.rotation.x += delta * 0.4;
      if (shadowMesh) {
        shadowMesh.position.set(BALL_SPOT.x, 0.012, BALL_SPOT.z);
        shadowMesh.scale.setScalar(1);
      }
      return;
    }

    const launch = start + KICK_LEAD_S;
    const [destinationX, destinationY] = ZONE_POS[shotZone.id] ?? [0, 1];
    const destinationZ = 0.18;
    const flight = clamp01((now - launch) / FLIGHT_S);

    if (now < launch) {
      ballMesh.position.copy(BALL_SPOT);
    } else if (willSave === true && now >= launch + SAVE_CONTACT_S) {
      const parry = easeInOut((now - launch - SAVE_CONTACT_S) / 0.58);
      const side = destinationX === 0 ? (shotZone.id === 'TC' ? 1 : -1) : Math.sign(destinationX);
      const parryX = destinationX + side * 2.15;
      const parryZ = 3.8;
      ballMesh.position.set(
        lerp(destinationX, parryX, parry),
        lerp(destinationY, 0.13, parry) + Math.sin(parry * Math.PI) * 0.72,
        lerp(0.2, parryZ, parry),
      );
      ballMesh.rotation.x -= delta * 21;
      ballMesh.rotation.z += delta * side * 13;
    } else {
      const targetFlight = willSave === true ? clamp01(flight / 0.88) : flight;
      const style = shotStyleFromZone(shotZone.id);
      const side = shotZone.x === 50 ? 0 : shotZone.x < 50 ? 1 : -1;
      const curl = style === 'curl' ? side * 1.92 : style === 'placed' ? side * 0.68 : side * 0.18;
      const controlX = destinationX * (style === 'drive' ? 0.18 : 0.34) + curl;
      const controlY = style === 'drive'
        ? Math.max(destinationY, 1.18) + 0.42
        : style === 'placed'
          ? Math.max(destinationY, 1.05) + 0.78
          : Math.max(destinationY, 1.62) + 1.38;
      const controlZ = BALL_SPOT.z * (style === 'drive' ? 0.52 : 0.45);
      const oneMinus = 1 - targetFlight;
      ballMesh.position.set(
        oneMinus * oneMinus * BALL_SPOT.x + 2 * oneMinus * targetFlight * controlX + targetFlight * targetFlight * destinationX,
        oneMinus * oneMinus * BALL_SPOT.y + 2 * oneMinus * targetFlight * controlY + targetFlight * targetFlight * destinationY,
        oneMinus * oneMinus * BALL_SPOT.z + 2 * oneMinus * targetFlight * controlZ + targetFlight * targetFlight * destinationZ,
      );
      const spin = style === 'placed' ? 12 : style === 'curl' ? 21 : 19;
      ballMesh.rotation.x -= delta * spin;
      ballMesh.rotation.z += delta * curl * (style === 'curl' ? 3.4 : 1.6);

      if (willSave === false && flight >= 1) {
        const netTravel = easeInOut((now - launch - FLIGHT_S) / 0.34);
        ballMesh.position.x = lerp(destinationX, destinationX * 0.94, netTravel);
        ballMesh.position.y = lerp(destinationY, Math.max(0.18, destinationY - 0.34), netTravel);
        ballMesh.position.z = lerp(destinationZ, -1.08, netTravel);
      }
    }

    if (shadowMesh) {
      shadowMesh.position.set(ballMesh.position.x, 0.012, ballMesh.position.z);
      const height = Math.max(0, ballMesh.position.y - BALL_SPOT.y);
      const scale = 1 + Math.min(1.25, height * 0.32);
      shadowMesh.scale.set(scale, scale, 1);
      const material = shadowMesh.material;
      if (material instanceof THREE.MeshBasicMaterial) material.opacity = Math.max(0.08, 0.32 - height * 0.085);
    }

    if (netBack.current) {
      const afterHit = now - launch - FLIGHT_S;
      const strength = willSave === false && afterHit > 0 ? Math.max(0, 1 - afterHit / 0.7) : 0;
      netBack.current.position.z = -0.92 - Math.sin(afterHit * 25) * strength * 0.22;
      netBack.current.scale.x = 1 + Math.sin(afterHit * 18) * strength * 0.018;
    }
  });

  return (
    <>
      <hemisphereLight args={['#dceeff', '#174323', 1.05]} />
      <directionalLight position={[6, 12, 9]} intensity={1.75} color="#fff7df" />
      <directionalLight position={[-9, 8, 5]} intensity={0.9} color="#cce4ff" />
      <pointLight position={[-7, 7, 1]} intensity={15} distance={24} color="#d8f2ff" />
      <pointLight position={[7, 7, 1]} intensity={15} distance={24} color="#d8f2ff" />

      <Stadium crowd={crowd} ad={ad} />

      {/* striped pitch and markings */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 4]}>
        <planeGeometry args={[34, 30]} />
        <meshStandardMaterial map={grass} roughness={0.98} />
      </mesh>
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
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.009, 9]}>
        <circleGeometry args={[0.09, 16]} />
        <meshBasicMaterial color="#ffffff" transparent opacity={0.9} />
      </mesh>

      {/* regulation goal frame with depth */}
      {GOAL_POSTS.map((x) => (
        <group key={x}>
          <mesh position={[x, 1.28, 0]} castShadow>
            <cylinderGeometry args={[0.065, 0.065, 2.56, 12]} />
            <meshStandardMaterial color="#f5f8fb" metalness={0.32} roughness={0.32} />
          </mesh>
          <mesh position={[x, 1.25, -1.05]}>
            <cylinderGeometry args={[0.04, 0.04, 2.5, 10]} />
            <meshStandardMaterial color="#dfe7ed" metalness={0.25} roughness={0.42} />
          </mesh>
        </group>
      ))}
      <mesh position={[0, 2.5, 0]} rotation={[0, 0, Math.PI / 2]} castShadow>
        <cylinderGeometry args={[0.065, 0.065, 7.56, 12]} />
        <meshStandardMaterial color="#f5f8fb" metalness={0.32} roughness={0.32} />
      </mesh>
      <mesh ref={netBack} position={[0, 1.22, -0.92]}>
        <planeGeometry args={[7.44, 2.44]} />
        <meshBasicMaterial map={net} transparent opacity={0.5} side={THREE.DoubleSide} depthWrite={false} />
      </mesh>
      <mesh position={[0, 2.48, -0.51]} rotation={[-Math.PI / 2.42, 0, 0]}>
        <planeGeometry args={[7.44, 1.18]} />
        <meshBasicMaterial map={net} transparent opacity={0.46} side={THREE.DoubleSide} depthWrite={false} />
      </mesh>
      {GOAL_POSTS.map((x) => (
        <mesh key={`net-${x}`} position={[x, 1.22, -0.51]} rotation={[0, Math.PI / 2, 0]}>
          <planeGeometry args={[1.05, 2.44]} />
          <meshBasicMaterial map={net} transparent opacity={0.45} side={THREE.DoubleSide} depthWrite={false} />
        </mesh>
      ))}

      {/* players */}
      {WALL_PLAYERS.map((player) => (
        <WallPlayer key={player.x} tl={timeline} {...player} />
      ))}
      <KeeperPlayer tl={timeline} shotZone={shotZone} willSave={willSave} />
      <Shooter tl={timeline} shotZone={shotZone} settled={settled} scored={scored} />

      {/* generous invisible hit discs wrap crisp visible targets */}
      {zones.map((zone) => {
        const [x, y] = ZONE_POS[zone.id];
        const locked = zone.id === revealedSave;
        if (!picking && !locked) return null;
        const activeHover = hover === zone.id && !locked;
        return (
          <group key={zone.id} position={[x, y, 0.31]} renderOrder={20}>
            <mesh
              onClick={(event: ThreeEvent<MouseEvent>) => {
                event.stopPropagation();
                if (!locked && picking) onPick(zone);
              }}
              onPointerOver={() => {
                if (!locked && picking) {
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
                color={locked ? '#ff4b4b' : activeHover ? '#ffe500' : '#eaf6ff'}
                transparent
                opacity={locked ? 0.3 : activeHover ? 0.28 : 0.13}
                depthTest={false}
                depthWrite={false}
                toneMapped={false}
              />
            </mesh>
            <mesh>
              <ringGeometry args={[0.43, 0.5, 28]} />
              <meshBasicMaterial
                color={locked ? '#ff4b4b' : activeHover ? '#ffe500' : '#f4fbff'}
                transparent
                opacity={locked ? 0.95 : 0.86}
                depthTest={false}
                depthWrite={false}
                toneMapped={false}
              />
            </mesh>
            {!locked && (
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
      <mesh ref={ball} position={BALL_SPOT.toArray()} castShadow>
        <sphereGeometry args={[0.135, 18, 18]} />
        <meshStandardMaterial map={ballTexture} roughness={0.42} />
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
  revealedSave,
  scouting,
  shotZone,
  willSave,
  resolving,
  settled,
  scored,
  onPick,
}: {
  picking: boolean;
  revealedSave: string | null;
  scouting: boolean;
  shotZone: Zone | null;
  willSave: boolean | null;
  resolving: boolean;
  settled: boolean;
  scored: boolean | null;
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
  const showGoalFx = settled && scored === true;
  const showSaveFx = settled && scored === false;

  return (
    <div className="relative mx-auto aspect-[4/3] w-full touch-manipulation overflow-hidden rounded-[24px] border border-white/10 bg-surface-page shadow-[inset_0_1px_0_rgba(255,255,255,0.08)] sm:aspect-[16/10]">
      <Canvas
        dpr={[1, 1.5]}
        camera={{ position: [0.72, 2.25, 14.8], fov: 43, near: 0.1, far: 70 }}
        gl={{ antialias: true, alpha: false, powerPreference: 'high-performance' }}
        onCreated={({ camera }) => camera.lookAt(-0.08, 1.05, 0)}
      >
        <color attach="background" args={['#07111d']} />
        <fog attach="fog" args={['#07111d', 24, 48]} />
        <Scene
          picking={picking}
          revealedSave={revealedSave}
          shotZone={shotZone}
          willSave={willSave}
          resolving={resolving}
          settled={settled}
          scored={scored}
          onPick={onPick}
          zones={zones}
        />
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
          style={{ background: 'radial-gradient(circle at 50% 40%, rgba(88,204,2,0.42), transparent 58%)' }}
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
