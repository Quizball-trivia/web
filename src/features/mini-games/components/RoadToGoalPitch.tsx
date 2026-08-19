'use client';

import { useEffect, useMemo, useRef } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import * as THREE from 'three';

export type RoadPitchPhase = 'idle' | 'question' | 'correct' | 'decision' | 'tackle' | 'tackled' | 'cashed' | 'complete';

interface RoadPitchState {
  progress: number;
  phase: RoadPitchPhase;
  labels: {
    liveRoute: string;
    safe: string;
    target: string;
  };
}

interface RoadToGoalPitchProps extends RoadPitchState {
  onFailure?: () => void;
}

interface PlayerLook {
  kit: string;
  kitLight: string;
  shorts: string;
  socks: string;
  boots: string;
  skin: string;
  hair: string;
  hairStyle: HairStyle;
  number: number;
  accent: string;
}

const MULTIPLIERS = [1.03, 1.08, 1.15, 1.24, 1.36, 1.52, 1.72, 1.98, 2.35, 2.9, 4] as const;
const ZONE_COLORS = ['#58CC02', '#1CB0F6', '#FFE500', '#FF9600'] as const;
const START_X = -1.7;
const FIRST_ZONE_X = 1.5;
const ZONE_GAP = 3.25;
const GOAL_X = FIRST_ZONE_X + MULTIPLIERS.length * ZONE_GAP + 1.9;
const PLAYER_Z = 1.25;
const DEFENDER_Z = 0.15;

const RUNNER_LOOK: PlayerLook = {
  kit: '#39C80B',
  kitLight: '#70E53C',
  shorts: '#102C55',
  socks: '#F7FBFF',
  boots: '#FFE500',
  skin: '#79421F',
  hair: '#211713',
  hairStyle: 'headband',
  number: 10,
  accent: '#FFFFFF',
};

const DEFENDER_LOOKS: PlayerLook[] = [
  { kit: '#1645FF', kitLight: '#4D72FF', shorts: '#0A215A', socks: '#F7FBFF', boots: '#111927', skin: '#D69A70', hair: '#1D1714', hairStyle: 'crop', number: 4, accent: '#FFFFFF' },
  { kit: '#FFE500', kitLight: '#FFF06A', shorts: '#153E75', socks: '#FFE500', boots: '#FF6C0A', skin: '#8B5030', hair: '#2A1C15', hairStyle: 'cornrows', number: 6, accent: '#153E75' },
  { kit: '#607485', kitLight: '#90A3B1', shorts: '#24384F', socks: '#607485', boots: '#111927', skin: '#E2B28B', hair: '#4D3B31', hairStyle: 'wave', number: 8, accent: '#D8F2FF' },
];

const clamp01 = (value: number) => Math.max(0, Math.min(1, value));
const easeOut = (value: number) => 1 - Math.pow(1 - clamp01(value), 3);
const easeInOut = (value: number) => {
  const t = clamp01(value);
  return t * t * (3 - 2 * t);
};

function zoneX(index: number) {
  return FIRST_ZONE_X + index * ZONE_GAP;
}

function runnerTargetX(progress: number) {
  if (progress <= 0) return START_X;
  if (progress >= MULTIPLIERS.length) return GOAL_X - 1.2;
  return zoneX(progress - 1) + 0.9;
}

const JOINT_NAMES = ['pelvis', 'spine', 'torso', 'hipL', 'hipR', 'kneeL', 'kneeR', 'ankleL', 'ankleR', 'shoL', 'shoR', 'elbL', 'elbR', 'head'] as const;
type JointName = (typeof JOINT_NAMES)[number];
type JointMap = Partial<Record<JointName, THREE.Object3D>>;
type HairStyle = 'headband' | 'crop' | 'cornrows' | 'wave';

function resolveJoints(root: THREE.Group): JointMap {
  const joints: JointMap = {};
  for (const name of JOINT_NAMES) joints[name] = root.getObjectByName(name) ?? undefined;
  return joints;
}

function setJoint(joint: THREE.Object3D | undefined, x: number, y = 0, z = 0) {
  joint?.rotation.set(x, y, z);
}

function LimbMaterial({ color }: { color: string }) {
  return <meshStandardMaterial color={color} roughness={0.72} metalness={0.02} />;
}

function PlayerLeg({ side, look }: { side: 'L' | 'R'; look: PlayerLook }) {
  const x = side === 'L' ? -0.13 : 0.13;
  return (
    <group name={`hip${side}`} position={[x, -0.08, 0]}>
      <mesh position={[0, -0.18, 0]} castShadow>
        <capsuleGeometry args={[0.09, 0.2, 6, 12]} />
        <LimbMaterial color={look.skin} />
      </mesh>
      <group name={`knee${side}`} position={[0, -0.38, 0]}>
        <mesh scale={[1, 0.88, 1]} castShadow>
          <sphereGeometry args={[0.082, 12, 10]} />
          <LimbMaterial color={look.skin} />
        </mesh>
        <mesh position={[0, -0.18, 0]} castShadow>
          <capsuleGeometry args={[0.07, 0.23, 6, 12]} />
          <LimbMaterial color={look.socks} />
        </mesh>
        <group name={`ankle${side}`} position={[0, -0.37, 0]}>
          <mesh position={[0, -0.02, 0.08]} rotation={[Math.PI / 2 + 0.08, 0, 0]} scale={[1.18, 1.08, 0.8]} castShadow>
            <capsuleGeometry args={[0.07, 0.17, 5, 12]} />
            <meshStandardMaterial color={look.boots} roughness={0.52} metalness={0.08} />
          </mesh>
          <mesh position={[0, -0.07, 0.095]} rotation={[Math.PI / 2, 0, 0]} scale={[1.1, 1, 0.6]}>
            <capsuleGeometry args={[0.071, 0.18, 4, 10]} />
            <meshStandardMaterial color="#070D16" roughness={0.76} />
          </mesh>
        </group>
      </group>
    </group>
  );
}

function PlayerArm({ side, look }: { side: 'L' | 'R'; look: PlayerLook }) {
  const x = side === 'L' ? -0.25 : 0.25;
  return (
    <group name={`sho${side}`} position={[x, 0.17, 0]}>
      <mesh castShadow>
        <sphereGeometry args={[0.11, 14, 12]} />
        <meshStandardMaterial color={look.kitLight} roughness={0.7} />
      </mesh>
      <mesh position={[0, -0.12, 0]} castShadow>
        <capsuleGeometry args={[0.067, 0.14, 5, 10]} />
        <LimbMaterial color={look.kit} />
      </mesh>
      <group name={`elb${side}`} position={[0, -0.28, 0]}>
        <mesh position={[0, -0.12, 0]} castShadow>
          <capsuleGeometry args={[0.055, 0.2, 5, 10]} />
          <LimbMaterial color={look.skin} />
        </mesh>
        <mesh position={[0, -0.29, 0]} scale={[1, 1, 0.84]} castShadow>
          <sphereGeometry args={[0.066, 12, 10]} />
          <LimbMaterial color={look.skin} />
        </mesh>
      </group>
    </group>
  );
}

function useNumberTexture(number: number, accent: string) {
  const texture = useMemo(() => {
    const canvas = document.createElement('canvas');
    canvas.width = 128;
    canvas.height = 128;
    const ctx = canvas.getContext('2d')!;
    ctx.clearRect(0, 0, 128, 128);
    ctx.font = '900 88px Poppins, Arial Black, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.lineWidth = 12;
    ctx.lineJoin = 'round';
    ctx.strokeStyle = 'rgba(4,10,19,.72)';
    ctx.strokeText(String(number), 64, 70);
    ctx.fillStyle = accent;
    ctx.fillText(String(number), 64, 70);
    const map = new THREE.CanvasTexture(canvas);
    map.colorSpace = THREE.SRGBColorSpace;
    map.anisotropy = 8;
    return map;
  }, [number, accent]);
  useEffect(() => () => texture.dispose(), [texture]);
  return texture;
}

function ShirtNumber({ number, accent }: { number: number; accent: string }) {
  const map = useNumberTexture(number, accent);
  return (
    <mesh position={[0, 0.08, 0.222]}>
      <planeGeometry args={[0.18, 0.18]} />
      <meshBasicMaterial map={map} transparent toneMapped={false} depthWrite={false} />
    </mesh>
  );
}

function PlayerHead({ look }: { look: PlayerLook }) {
  return (
    <group name="head" position={[0, 0.55, 0]}>
      <mesh scale={[0.9, 1, 0.94]} castShadow>
        <sphereGeometry args={[0.17, 20, 16]} />
        <meshStandardMaterial color={look.skin} roughness={0.8} />
      </mesh>
      <mesh position={[-0.155, 0, 0]} scale={[0.42, 0.68, 0.3]}><sphereGeometry args={[0.06, 10, 8]} /><LimbMaterial color={look.skin} /></mesh>
      <mesh position={[0.155, 0, 0]} scale={[0.42, 0.68, 0.3]}><sphereGeometry args={[0.06, 10, 8]} /><LimbMaterial color={look.skin} /></mesh>
      {look.hairStyle === 'headband' && (
        <>
          <mesh position={[0, 0.098, -0.01]} scale={[0.95, 0.56, 0.96]} castShadow><sphereGeometry args={[0.17, 18, 12]} /><meshStandardMaterial color={look.hair} roughness={0.9} /></mesh>
          <mesh position={[0, 0.072, 0.01]} rotation={[Math.PI / 2 + 0.08, 0, 0]}><torusGeometry args={[0.158, 0.014, 8, 28]} /><meshStandardMaterial color="#FFFFFF" roughness={0.58} /></mesh>
        </>
      )}
      {look.hairStyle === 'crop' && <mesh position={[0, 0.11, -0.006]} scale={[0.94, 0.46, 0.95]} castShadow><sphereGeometry args={[0.17, 18, 12]} /><meshStandardMaterial color={look.hair} roughness={0.92} /></mesh>}
      {look.hairStyle === 'cornrows' && (
        <>
          <mesh position={[0, 0.105, -0.01]} scale={[0.92, 0.5, 0.94]} castShadow><sphereGeometry args={[0.168, 18, 12]} /><meshStandardMaterial color={look.hair} roughness={0.93} /></mesh>
          {[-0.09, -0.045, 0, 0.045, 0.09].map((x) => <mesh key={x} position={[x, 0.145, 0.08]} rotation={[0.05, 0, 0]}><capsuleGeometry args={[0.012, 0.12, 3, 8]} /><meshStandardMaterial color="#5A3B28" roughness={0.95} /></mesh>)}
        </>
      )}
      {look.hairStyle === 'wave' && (
        <>
          <mesh position={[0, 0.095, -0.012]} scale={[0.96, 0.62, 0.98]} castShadow><sphereGeometry args={[0.17, 18, 12]} /><meshStandardMaterial color={look.hair} roughness={0.93} /></mesh>
          {[-0.11, -0.055, 0, 0.055, 0.11].map((x, index) => <mesh key={x} position={[x, 0.17 + (index % 2) * 0.018, 0.04]} castShadow><sphereGeometry args={[0.052, 10, 8]} /><meshStandardMaterial color={look.hair} roughness={0.94} /></mesh>)}
        </>
      )}
      <mesh position={[-0.058, 0.018, 0.155]}><sphereGeometry args={[0.014, 8, 8]} /><meshBasicMaterial color="#08101D" /></mesh>
      <mesh position={[0.058, 0.018, 0.155]}><sphereGeometry args={[0.014, 8, 8]} /><meshBasicMaterial color="#08101D" /></mesh>
      <mesh position={[-0.053, 0.024, 0.167]}><sphereGeometry args={[0.004, 6, 6]} /><meshBasicMaterial color="#FFFFFF" /></mesh>
      <mesh position={[0.063, 0.024, 0.167]}><sphereGeometry args={[0.004, 6, 6]} /><meshBasicMaterial color="#FFFFFF" /></mesh>
      <mesh position={[0, -0.02, 0.174]} rotation={[Math.PI / 2, 0, 0]}><coneGeometry args={[0.018, 0.058, 8]} /><meshStandardMaterial color={look.skin} roughness={0.82} /></mesh>
      <mesh position={[0, -0.075, 0.156]} rotation={[0.08, 0, 0]} scale={[1.2, 0.45, 0.28]}><torusGeometry args={[0.038, 0.009, 6, 16, Math.PI]} /><meshBasicMaterial color="#36180F" /></mesh>
    </group>
  );
}

function PlayerRig({ look }: { look: PlayerLook }) {
  return (
    <group name="pelvis" position={[0, 0.98, 0]}>
      <PlayerLeg side="L" look={look} />
      <PlayerLeg side="R" look={look} />
      <mesh position={[0, 0.02, 0]} castShadow><boxGeometry args={[0.4, 0.18, 0.3]} /><meshStandardMaterial color={look.shorts} roughness={0.72} /></mesh>
      <mesh position={[-0.12, -0.085, 0]} rotation={[0, 0, 0.05]} castShadow><boxGeometry args={[0.2, 0.17, 0.28]} /><meshStandardMaterial color={look.shorts} roughness={0.72} /></mesh>
      <mesh position={[0.12, -0.085, 0]} rotation={[0, 0, -0.05]} castShadow><boxGeometry args={[0.2, 0.17, 0.28]} /><meshStandardMaterial color={look.shorts} roughness={0.72} /></mesh>
      <group name="spine" position={[0, 0.07, 0]}>
        <group name="torso" position={[0, 0.33, 0]}>
          <mesh scale={[1.1, 1, 0.86]} castShadow><capsuleGeometry args={[0.21, 0.18, 10, 20]} /><meshStandardMaterial color={look.kit} roughness={0.66} /></mesh>
          <mesh position={[-0.09, 0.07, 0.19]} scale={[0.8, 1.2, 0.2]}><sphereGeometry args={[0.12, 12, 10]} /><meshStandardMaterial color={look.kitLight} transparent opacity={0.38} roughness={0.6} /></mesh>
          <mesh position={[0, 0.24, 0]} rotation={[Math.PI / 2, 0, 0]}><torusGeometry args={[0.077, 0.019, 8, 16]} /><meshStandardMaterial color={look.accent} roughness={0.62} /></mesh>
          <mesh position={[-0.115, 0.12, 0.2]}><circleGeometry args={[0.027, 12]} /><meshBasicMaterial color="#FFE500" toneMapped={false} /></mesh>
          <ShirtNumber number={look.number} accent={look.accent} />
          <PlayerArm side="L" look={look} />
          <PlayerArm side="R" look={look} />
          <mesh position={[0, 0.34, 0]}><cylinderGeometry args={[0.062, 0.072, 0.13, 12]} /><LimbMaterial color={look.skin} /></mesh>
          <PlayerHead look={look} />
        </group>
      </group>
    </group>
  );
}

function poseIdle(joint: JointMap, now: number, offset = 0) {
  const breathe = Math.sin(now * 2.2 + offset);
  setJoint(joint.spine, 0.02 + breathe * 0.018);
  setJoint(joint.hipL, -0.04);
  setJoint(joint.hipR, 0.04);
  setJoint(joint.kneeL, 0.08);
  setJoint(joint.kneeR, 0.08);
  setJoint(joint.shoL, -0.12, 0, 0.2 + breathe * 0.03);
  setJoint(joint.shoR, -0.12, 0, -0.2 - breathe * 0.03);
  setJoint(joint.elbL, -0.28);
  setJoint(joint.elbR, -0.28);
  setJoint(joint.head, 0, Math.sin(now * 0.8 + offset) * 0.035, 0);
}

function poseRun(joint: JointMap, now: number, intensity: number) {
  const stride = Math.sin(now * 10.5) * intensity;
  const liftL = Math.max(0, -stride);
  const liftR = Math.max(0, stride);
  setJoint(joint.spine, 0.14, 0, -0.04 * stride);
  setJoint(joint.hipL, stride * 0.82);
  setJoint(joint.hipR, -stride * 0.82);
  setJoint(joint.kneeL, 0.08 + liftL * 1.05);
  setJoint(joint.kneeR, 0.08 + liftR * 1.05);
  setJoint(joint.ankleL, -liftL * 0.32);
  setJoint(joint.ankleR, -liftR * 0.32);
  setJoint(joint.shoL, -stride * 0.72, 0, 0.08);
  setJoint(joint.shoR, stride * 0.72, 0, -0.08);
  setJoint(joint.elbL, -0.58);
  setJoint(joint.elbR, -0.58);
  setJoint(joint.head, -0.04, 0, 0.025 * stride);
}

function Runner({ progress, phase }: { progress: number; phase: RoadPitchPhase }) {
  const root = useRef<THREE.Group>(null);
  const joints = useRef<JointMap | null>(null);
  const previousPhase = useRef<RoadPitchPhase>(phase);
  const tackleStart = useRef<number | null>(null);
  const dribbleStart = useRef<number | null>(null);
  const dribbleOrigin = useRef(START_X);

  useFrame((state, delta) => {
    const player = root.current;
    if (!player) return;
    if (!joints.current) joints.current = resolveJoints(player);
    const joint = joints.current;
    const now = state.clock.elapsedTime;
    const targetX = runnerTargetX(progress);
    const tackling = phase === 'tackle' || phase === 'tackled';
    if (phase === 'tackle' && previousPhase.current !== 'tackle') tackleStart.current = now;
    if (phase === 'correct' && previousPhase.current !== 'correct') {
      dribbleStart.current = now;
      dribbleOrigin.current = player.position.x;
    }
    if (phase === 'idle' || phase === 'question') {
      if (previousPhase.current === 'tackled' || previousPhase.current === 'tackle') tackleStart.current = null;
      dribbleStart.current = null;
    }
    previousPhase.current = phase;

    if (tackling && tackleStart.current != null) {
      const t = clamp01((now - tackleStart.current) / 0.78);
      const fall = easeInOut(t);
      player.position.x = THREE.MathUtils.damp(player.position.x, targetX + 0.48, 8, delta);
      player.position.y = Math.sin(t * Math.PI) * 0.17 + fall * 0.08;
      player.position.z = PLAYER_Z + fall * 0.22;
      player.rotation.y = THREE.MathUtils.damp(player.rotation.y, 0.4, 7, delta);
      player.rotation.z = -fall * 1.28;
      setJoint(joint.spine, 0.25 + fall * 0.4, 0, -0.2);
      setJoint(joint.hipL, 0.25 + fall * 0.7);
      setJoint(joint.hipR, -0.18);
      setJoint(joint.kneeL, 0.42);
      setJoint(joint.kneeR, 0.16);
      setJoint(joint.shoL, -1.1, 0, 0.45);
      setJoint(joint.shoR, 0.6, 0, -0.7);
      setJoint(joint.elbL, -0.7);
      setJoint(joint.elbR, -0.45);
      return;
    }

    if (phase === 'correct' && dribbleStart.current != null && progress < MULTIPLIERS.length) {
      const t = clamp01((now - dribbleStart.current) / 1.05);
      const drive = easeInOut(t);
      const arc = Math.sin(t * Math.PI);
      const touches = Math.sin(t * Math.PI * 6);
      player.position.x = THREE.MathUtils.lerp(dribbleOrigin.current, zoneX(progress) + 0.9, drive);
      player.position.y = Math.abs(Math.sin(t * Math.PI * 7)) * 0.065;
      player.position.z = PLAYER_Z + arc * 0.72 + touches * 0.055;
      player.rotation.y = Math.PI / 2 - arc * 0.18;
      player.rotation.z = -Math.sin(t * Math.PI * 2) * 0.12;
      poseRun(joint, now, 1);
      setJoint(joint.spine, 0.16, -arc * 0.08, -touches * 0.08);
      setJoint(joint.head, -0.04, -arc * 0.24, touches * 0.025);
      return;
    }

    const distance = targetX - player.position.x;
    const moving = Math.abs(distance) > 0.025;
    player.position.x = THREE.MathUtils.damp(player.position.x, targetX, moving ? 5.2 : 8, delta);
    player.position.z = THREE.MathUtils.damp(player.position.z, PLAYER_Z, 8, delta);
    player.rotation.z = THREE.MathUtils.damp(player.rotation.z, 0, 9, delta);
    const celebrate = phase === 'complete';
    if (moving) {
      const intensity = Math.min(1, 0.5 + Math.abs(distance) * 0.35);
      poseRun(joint, now, intensity);
      player.position.y = Math.abs(Math.sin(now * 10.5)) * 0.07 * intensity;
      player.rotation.y = THREE.MathUtils.damp(player.rotation.y, Math.PI / 2, 6, delta);
    } else if (celebrate) {
      const jump = Math.abs(Math.sin(now * 4.8));
      player.position.y = jump * 0.16;
      player.rotation.y = THREE.MathUtils.damp(player.rotation.y, 0, 6, delta);
      setJoint(joint.spine, -0.08);
      setJoint(joint.shoL, -2.25, 0, 0.28);
      setJoint(joint.shoR, -2.25, 0, -0.28);
      setJoint(joint.elbL, -0.28);
      setJoint(joint.elbR, -0.28);
      setJoint(joint.hipL, jump * 0.2);
      setJoint(joint.hipR, -jump * 0.2);
      setJoint(joint.kneeL, 0.16);
      setJoint(joint.kneeR, 0.16);
    } else {
      player.position.y = Math.sin(now * 2.2) * 0.012;
      player.rotation.y = THREE.MathUtils.damp(player.rotation.y, 0, 7, delta);
      poseIdle(joint, now);
    }
  });
  return <group ref={root} position={[START_X, 0, PLAYER_Z]} scale={1.58}><PlayerRig look={RUNNER_LOOK} /></group>;
}

function Defender({ index, active, cleared, tackling, beaten, runnerX }: { index: number; active: boolean; cleared: boolean; tackling: boolean; beaten: boolean; runnerX: number }) {
  const root = useRef<THREE.Group>(null);
  const joints = useRef<JointMap | null>(null);
  const wasTackling = useRef(false);
  const tackleStart = useRef<number | null>(null);
  const wasBeaten = useRef(false);
  const beatenStart = useRef<number | null>(null);
  const homeX = zoneX(index);
  const look = DEFENDER_LOOKS[index % DEFENDER_LOOKS.length];

  useFrame((state, delta) => {
    const player = root.current;
    if (!player) return;
    if (!joints.current) joints.current = resolveJoints(player);
    const joint = joints.current;
    const now = state.clock.elapsedTime;
    if (tackling && !wasTackling.current) tackleStart.current = now;
    if (!tackling) tackleStart.current = null;
    wasTackling.current = tackling;
    if (beaten && !wasBeaten.current) beatenStart.current = now;
    if (!beaten) beatenStart.current = null;
    wasBeaten.current = beaten;
    if (tackling && active && tackleStart.current != null) {
      const t = clamp01((now - tackleStart.current) / 0.68);
      const drive = easeOut(t);
      player.visible = true;
      player.position.x = THREE.MathUtils.lerp(homeX, runnerX + 0.3, drive);
      player.position.y = Math.sin(t * Math.PI) * 0.22 + drive * 0.08;
      player.position.z = THREE.MathUtils.lerp(DEFENDER_Z, PLAYER_Z + 0.12, drive);
      player.rotation.y = -Math.PI / 2 + drive * 0.25;
      player.rotation.z = drive * 1.08;
      setJoint(joint.spine, 0.5, 0, 0.12);
      setJoint(joint.hipL, -1.1);
      setJoint(joint.kneeL, 0.06);
      setJoint(joint.ankleL, 0.2);
      setJoint(joint.hipR, 0.45);
      setJoint(joint.kneeR, 1.1);
      setJoint(joint.shoL, 0.9, 0, 0.7);
      setJoint(joint.shoR, -1.15, 0, -0.5);
      setJoint(joint.elbL, -0.45);
      setJoint(joint.elbR, -0.5);
      return;
    }
    if (beaten && active && beatenStart.current != null) {
      const t = clamp01((now - beatenStart.current) / 1.05);
      const wrongFoot = Math.sin(t * Math.PI);
      const recover = easeOut(Math.max(0, (t - 0.48) / 0.52));
      player.visible = true;
      player.position.x = THREE.MathUtils.lerp(homeX, homeX - 0.28, wrongFoot);
      player.position.y = Math.sin(t * Math.PI * 2) * 0.035;
      player.position.z = DEFENDER_Z - wrongFoot * 0.24;
      player.rotation.y = -wrongFoot * 0.82 + recover * 0.24;
      player.rotation.z = wrongFoot * (index % 2 === 0 ? -0.2 : 0.2);
      setJoint(joint.spine, 0.12 + wrongFoot * 0.18, wrongFoot * 0.22, -player.rotation.z * 0.55);
      setJoint(joint.hipL, -0.24 + wrongFoot * 0.5);
      setJoint(joint.hipR, -0.24 - wrongFoot * 0.2);
      setJoint(joint.kneeL, 0.38 + wrongFoot * 0.4);
      setJoint(joint.kneeR, 0.38 - wrongFoot * 0.12);
      setJoint(joint.shoL, -0.2, 0, 0.62 + wrongFoot * 0.3);
      setJoint(joint.shoR, -0.2, 0, -0.62 - wrongFoot * 0.3);
      setJoint(joint.elbL, -0.48);
      setJoint(joint.elbR, -0.48);
      setJoint(joint.head, 0, -wrongFoot * 0.7, player.rotation.z * -0.5);
      return;
    }
    player.visible = !cleared;
    player.position.z = THREE.MathUtils.damp(player.position.z, DEFENDER_Z, 8, delta);
    player.rotation.z = THREE.MathUtils.damp(player.rotation.z, 0, 9, delta);
    player.rotation.y = THREE.MathUtils.damp(player.rotation.y, 0, 8, delta);
    if (active) {
      const jockey = Math.sin(now * 3.6 + index * 0.7);
      player.position.x = THREE.MathUtils.damp(player.position.x, homeX + jockey * 0.12, 8, delta);
      player.position.y = Math.abs(Math.sin(now * 3.6 + index)) * 0.035;
      setJoint(joint.spine, 0.13, 0, jockey * 0.04);
      setJoint(joint.hipL, -0.18 + jockey * 0.08);
      setJoint(joint.hipR, -0.18 - jockey * 0.08);
      setJoint(joint.kneeL, 0.38);
      setJoint(joint.kneeR, 0.38);
      setJoint(joint.shoL, -0.35, 0, 0.48);
      setJoint(joint.shoR, -0.35, 0, -0.48);
      setJoint(joint.elbL, -0.55);
      setJoint(joint.elbR, -0.55);
      setJoint(joint.head, 0, -jockey * 0.08, 0);
    } else {
      player.position.x = THREE.MathUtils.damp(player.position.x, homeX, 8, delta);
      player.position.y = Math.sin(now * 1.8 + index) * 0.008;
      poseIdle(joint, now, index * 0.8);
    }
  });
  return <group ref={root} position={[homeX, 0, DEFENDER_Z]} scale={active ? 1.5 : 1.4}><PlayerRig look={look} /></group>;
}

function useBallTexture() {
  const texture = useMemo(() => {
    const map = new THREE.TextureLoader().load('/assets/brand/goal-ball.webp');
    map.colorSpace = THREE.SRGBColorSpace;
    map.anisotropy = 8;
    return map;
  }, []);
  useEffect(() => () => texture.dispose(), [texture]);
  return texture;
}

function MatchBall({ progress, phase }: { progress: number; phase: RoadPitchPhase }) {
  const root = useRef<THREE.Mesh>(null);
  const shadow = useRef<THREE.Mesh>(null);
  const previousPhase = useRef<RoadPitchPhase>(phase);
  const tackleStart = useRef<number | null>(null);
  const tackleOrigin = useRef(START_X + 0.5);
  const dribbleStart = useRef<number | null>(null);
  const dribbleOrigin = useRef(START_X + 0.5);
  const map = useBallTexture();
  useFrame((state, delta) => {
    const ball = root.current;
    if (!ball) return;
    const now = state.clock.elapsedTime;
    const target = runnerTargetX(progress) + 0.48;
    if (phase === 'tackle' && previousPhase.current !== 'tackle') {
      tackleStart.current = now;
      tackleOrigin.current = ball.position.x;
    }
    if (phase === 'correct' && previousPhase.current !== 'correct') {
      dribbleStart.current = now;
      dribbleOrigin.current = ball.position.x;
    }
    if (phase === 'idle' || phase === 'question') {
      tackleStart.current = null;
      dribbleStart.current = null;
    }
    previousPhase.current = phase;
    if ((phase === 'tackle' || phase === 'tackled') && tackleStart.current != null) {
      const t = clamp01((now - tackleStart.current) / 0.78);
      ball.position.x = tackleOrigin.current + easeOut(t) * 3.1;
      ball.position.y = 0.17 + Math.sin(t * Math.PI) * 0.72;
      ball.position.z = PLAYER_Z + Math.sin(t * Math.PI) * 0.28;
      ball.rotation.x += delta * 15;
      ball.rotation.z -= delta * 9;
    } else if (phase === 'correct' && dribbleStart.current != null && progress < MULTIPLIERS.length) {
      const t = clamp01((now - dribbleStart.current) / 1.05);
      const drive = easeInOut(t);
      const arc = Math.sin(t * Math.PI);
      const touch = Math.sin(t * Math.PI * 6);
      ball.position.x = THREE.MathUtils.lerp(dribbleOrigin.current, zoneX(progress) + 1.38, drive);
      ball.position.y = 0.17 + Math.abs(touch) * 0.09 + arc * 0.035;
      ball.position.z = PLAYER_Z + 0.03 + arc * 0.72 + touch * 0.17;
      ball.rotation.x += delta * 18;
      ball.rotation.z -= delta * (12 + Math.abs(touch) * 5);
    } else if (phase === 'complete') {
      ball.position.x = THREE.MathUtils.damp(ball.position.x, GOAL_X + 0.15, 3.8, delta);
      ball.position.y = THREE.MathUtils.damp(ball.position.y, 0.7, 4, delta);
      ball.position.z = THREE.MathUtils.damp(ball.position.z, -0.25, 4, delta);
      ball.rotation.x += delta * 12;
    } else {
      const distance = target - ball.position.x;
      ball.position.x = THREE.MathUtils.damp(ball.position.x, target, 6.4, delta);
      const dribbling = Math.abs(distance) > 0.035;
      ball.position.y = 0.17 + (dribbling ? Math.abs(Math.sin(now * 12.5)) * 0.16 : 0);
      ball.position.z = PLAYER_Z + 0.03;
      ball.rotation.x += delta * (dribbling ? 12 : 0.8);
      ball.rotation.z -= delta * (dribbling ? 7 : 0.3);
    }
    if (shadow.current) {
      shadow.current.position.x = ball.position.x;
      shadow.current.position.z = ball.position.z;
      const height = Math.max(0, ball.position.y - 0.17);
      shadow.current.scale.setScalar(1 + height * 0.45);
      const material = shadow.current.material;
      if (material instanceof THREE.MeshBasicMaterial) material.opacity = Math.max(0.06, 0.28 - height * 0.14);
    }
  });
  return (
    <>
      <mesh ref={shadow} rotation={[-Math.PI / 2, 0, 0]} position={[START_X + 0.5, 0.012, PLAYER_Z]}><circleGeometry args={[0.22, 24]} /><meshBasicMaterial color="#020805" transparent opacity={0.28} depthWrite={false} /></mesh>
      <mesh ref={root} position={[START_X + 0.5, 0.17, PLAYER_Z]} castShadow><sphereGeometry args={[0.17, 28, 20]} /><meshStandardMaterial map={map} roughness={0.62} metalness={0.02} /></mesh>
    </>
  );
}

function ZoneCardRail({ progress, labels }: { progress: number; labels: RoadPitchState['labels'] }) {
  return (
    <div className="pointer-events-none absolute inset-0 z-10 overflow-hidden" aria-hidden="true">
      {MULTIPLIERS.map((multiplier, index) => {
        const cleared = index < progress;
        const active = index === progress && progress < MULTIPLIERS.length;
        const color = ZONE_COLORS[index % ZONE_COLORS.length];
        const relativeIndex = index - progress;
        const status = cleared ? labels.safe : active ? labels.target : `ZONE ${String(index + 1).padStart(2, '0')}`;
        return (
          <div
            key={multiplier}
            className="absolute top-[17%] w-[14%] min-w-[68px] max-w-[96px] -translate-x-1/2 transition-[left,opacity,transform] duration-700 ease-out sm:top-[19%] sm:min-w-[78px] sm:max-w-[108px] lg:top-[22%] lg:min-w-[90px] lg:max-w-[126px]"
            style={{
              left: `${70 + relativeIndex * 20}%`,
              opacity: relativeIndex < -2 || relativeIndex > 3 ? 0 : cleared ? 0.72 : 1,
              transform: `translateX(-50%) scale(${active ? 1.03 : 1})`,
            }}
          >
            <div
              className="rounded-[8px] border bg-[#02080D]/95 p-0.5 shadow-[0_5px_0_rgba(0,0,0,.62),0_10px_16px_rgba(0,0,0,.3)] sm:rounded-[9px] sm:p-[3px] lg:rounded-[11px] lg:p-1 lg:shadow-[0_8px_0_rgba(0,0,0,.62),0_14px_22px_rgba(0,0,0,.34)]"
              style={{
                borderColor: active || cleared ? color : 'rgba(154,176,166,.42)',
                boxShadow: active
                  ? `0 0 0 2px ${color}55, 0 0 18px ${color}88, 0 8px 0 rgba(0,0,0,.62)`
                  : '0 8px 0 rgba(0,0,0,.62), 0 14px 22px rgba(0,0,0,.34)',
              }}
            >
              <div
                className="relative flex aspect-[1.82/1] flex-col items-center justify-center overflow-hidden rounded-[6px] border bg-gradient-to-b from-[#0C1D22] to-[#03090D] px-1 sm:rounded-[7px] sm:border-2 sm:px-1.5 lg:rounded-[8px] lg:px-2"
                style={{
                  borderColor: active || cleared ? color : '#61746B',
                  background: cleared ? color : 'linear-gradient(to bottom, #0C1D22, #03090D)',
                }}
              >
                <span className="absolute inset-x-1.5 top-1 h-px rounded-full opacity-75 sm:inset-x-2 sm:h-0.5" style={{ backgroundColor: active || cleared ? color : '#708078' }} />
                <span className="absolute right-1.5 top-1.5 font-poppins text-[4px] font-black text-white/80 sm:right-2 sm:top-2 sm:text-[5px] lg:text-[6px]">{String(index + 1).padStart(2, '0')}</span>
                <span className="font-poppins text-[12px] font-black leading-none sm:text-[15px] lg:text-[clamp(15px,2vw,25px)]" style={{ color: cleared ? '#07110D' : active ? color : '#B8C7C0' }}>
                  {multiplier.toFixed(2)}×
                </span>
                <span className="mt-0.5 max-w-full truncate font-poppins text-[4px] font-black uppercase tracking-[0.1em] sm:text-[5px] sm:tracking-[0.14em] lg:mt-1 lg:text-[clamp(5px,.7vw,8px)] lg:tracking-[0.16em]" style={{ color: cleared ? '#163019' : active ? '#FFFFFF' : '#82948B' }}>
                  {status}
                </span>
              </div>
            </div>
            <div className="mx-auto mt-1 h-1 w-[68%] rounded-full shadow-[0_2px_4px_rgba(0,0,0,.4)] sm:mt-1.5 lg:mt-2 lg:h-1.5 lg:w-[72%]" style={{ backgroundColor: active || cleared ? color : '#16231F' }} />
          </div>
        );
      })}
    </div>
  );
}

function useGrassTexture() {
  const texture = useMemo(() => {
    const canvas = document.createElement('canvas');
    canvas.width = 1024;
    canvas.height = 512;
    const ctx = canvas.getContext('2d')!;
    ctx.fillStyle = '#149447';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    for (let stripe = 0; stripe < 16; stripe += 1) {
      ctx.fillStyle = stripe % 2 === 0 ? '#199D4B' : '#128A40';
      ctx.fillRect(stripe * 64, 0, 64, canvas.height);
    }
    for (let index = 0; index < 900; index += 1) {
      const x = (index * 83) % canvas.width;
      const y = (index * 137) % canvas.height;
      ctx.fillStyle = index % 3 === 0 ? 'rgba(255,255,255,.025)' : 'rgba(0,40,20,.035)';
      ctx.fillRect(x, y, 2, 7);
    }
    const map = new THREE.CanvasTexture(canvas);
    map.colorSpace = THREE.SRGBColorSpace;
    map.anisotropy = 8;
    return map;
  }, []);
  useEffect(() => () => texture.dispose(), [texture]);
  return texture;
}

function CrowdTier({ y, z, rows, columns, width }: { y: number; z: number; rows: number; columns: number; width: number }) {
  const crowd = useRef<THREE.InstancedMesh>(null);
  const colors = useMemo(() => ['#F7FBFF', '#58CC02', '#FFE500', '#1645FF', '#D8E2DA', '#FF4040'], []);

  useEffect(() => {
    if (!crowd.current) return;
    const dummy = new THREE.Object3D();
    const color = new THREE.Color();
    let instance = 0;
    for (let row = 0; row < rows; row += 1) {
      for (let column = 0; column < columns; column += 1) {
        const stagger = row % 2 === 0 ? 0 : width / columns / 2;
        dummy.position.set(
          -width / 2 + (column / Math.max(1, columns - 1)) * width + stagger,
          y + row * 0.34 + ((column * 7 + row * 3) % 5) * 0.018,
          z - row * 0.29,
        );
        const size = 0.82 + ((column * 13 + row * 5) % 7) * 0.035;
        dummy.scale.set(size, size, size);
        dummy.rotation.y = ((column + row) % 5 - 2) * 0.05;
        dummy.updateMatrix();
        crowd.current.setMatrixAt(instance, dummy.matrix);
        color.set(colors[(column * 3 + row * 5) % colors.length]);
        crowd.current.setColorAt(instance, color);
        instance += 1;
      }
    }
    crowd.current.instanceMatrix.needsUpdate = true;
    if (crowd.current.instanceColor) crowd.current.instanceColor.needsUpdate = true;
  }, [colors, columns, rows, width, y, z]);

  return (
    <instancedMesh ref={crowd} args={[undefined, undefined, rows * columns]} frustumCulled={false}>
      <capsuleGeometry args={[0.085, 0.13, 3, 6]} />
      <meshStandardMaterial roughness={0.88} metalness={0} />
    </instancedMesh>
  );
}

function Stadium() {
  const root = useRef<THREE.Group>(null);
  useFrame((state) => {
    if (root.current) root.current.position.x = state.camera.position.x;
  });
  return (
    <group ref={root} position={[0, 0, 0]}>
      <mesh position={[0, 4.9, -8.1]} receiveShadow>
        <boxGeometry args={[31, 8.8, 0.8]} />
        <meshStandardMaterial color="#071426" roughness={0.92} />
      </mesh>
      <mesh position={[0, 2.15, -6.85]} rotation={[-0.2, 0, 0]} receiveShadow>
        <boxGeometry args={[31, 3.5, 1.6]} />
        <meshStandardMaterial color="#0E2740" roughness={0.9} />
      </mesh>
      <mesh position={[0, 5.35, -7.25]} rotation={[-0.16, 0, 0]} receiveShadow>
        <boxGeometry args={[31, 3.15, 1.5]} />
        <meshStandardMaterial color="#0A2037" roughness={0.9} />
      </mesh>
      <CrowdTier y={1.25} z={-5.85} rows={6} columns={52} width={29} />
      <CrowdTier y={4.35} z={-6.35} rows={6} columns={52} width={29} />
      <mesh position={[0, 3.72, -5.55]}>
        <boxGeometry args={[30, 0.24, 0.34]} />
        <meshStandardMaterial color="#1645FF" emissive="#1645FF" emissiveIntensity={1.8} toneMapped={false} />
      </mesh>
      <mesh position={[0, 0.76, -4.95]}>
        <boxGeometry args={[30, 1.02, 0.45]} />
        <meshStandardMaterial color="#061426" roughness={0.52} metalness={0.18} />
      </mesh>
      {Array.from({ length: 12 }, (_, index) => (
        <mesh key={`led-${index}`} position={[-13.75 + index * 2.5, 0.79, -4.69]}>
          <boxGeometry args={[1.72, 0.16, 0.03]} />
          <meshBasicMaterial color={ZONE_COLORS[index % ZONE_COLORS.length]} toneMapped={false} />
        </mesh>
      ))}
      <mesh position={[0, 8.1, -7.15]} rotation={[0.06, 0, 0]}>
        <boxGeometry args={[32, 0.42, 4.7]} />
        <meshStandardMaterial color="#030B18" roughness={0.76} metalness={0.28} />
      </mesh>
      {[-11.5, -5.75, 0, 5.75, 11.5].map((x) => (
        <group key={`lights-${x}`} position={[x, 7.15, -5.45]}>
          <mesh><boxGeometry args={[2.2, 0.56, 0.24]} /><meshStandardMaterial color="#D9F3FF" emissive="#B8DEFF" emissiveIntensity={3.2} toneMapped={false} /></mesh>
          {[-0.72, 0, 0.72].map((lampX) => <pointLight key={lampX} position={[lampX, -0.1, 0.7]} intensity={1.3} distance={7} color="#E7F5FF" />)}
        </group>
      ))}
    </group>
  );
}

function Pitch() {
  const map = useGrassTexture();
  return (
    <group>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[GOAL_X / 2, -0.025, 0.8]} receiveShadow>
        <planeGeometry args={[76, 13]} />
        <meshStandardMaterial map={map} roughness={0.98} metalness={0} />
      </mesh>
      <mesh position={[GOAL_X / 2, 0.012, -5.65]}><boxGeometry args={[76, 0.035, 0.065]} /><meshBasicMaterial color="#F4FFF3" transparent opacity={0.9} /></mesh>
      <mesh position={[GOAL_X / 2, 0.012, 7.25]}><boxGeometry args={[76, 0.035, 0.065]} /><meshBasicMaterial color="#F4FFF3" transparent opacity={0.9} /></mesh>
      <mesh position={[0, 0.014, 0.8]}><boxGeometry args={[0.065, 0.04, 12.9]} /><meshBasicMaterial color="#F4FFF3" transparent opacity={0.88} /></mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.018, 0.8]}>
        <ringGeometry args={[1.75, 1.82, 64]} />
        <meshBasicMaterial color="#F4FFF3" transparent opacity={0.86} side={THREE.DoubleSide} />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.02, 0.8]}><circleGeometry args={[0.09, 20]} /><meshBasicMaterial color="#F4FFF3" /></mesh>
      <mesh position={[GOAL_X - 4.25, 0.014, 0.8]}><boxGeometry args={[0.065, 0.04, 7.4]} /><meshBasicMaterial color="#F4FFF3" transparent opacity={0.8} /></mesh>
      <mesh position={[GOAL_X - 2.1, 0.014, -2.9]}><boxGeometry args={[4.3, 0.04, 0.065]} /><meshBasicMaterial color="#F4FFF3" transparent opacity={0.8} /></mesh>
      <mesh position={[GOAL_X - 2.1, 0.014, 4.5]}><boxGeometry args={[4.3, 0.04, 0.065]} /><meshBasicMaterial color="#F4FFF3" transparent opacity={0.8} /></mesh>
      <mesh position={[(START_X + GOAL_X) / 2, 0.02, 0.72]}><boxGeometry args={[GOAL_X - START_X - 1.3, 0.045, 0.035]} /><meshBasicMaterial color="#8BE7FF" transparent opacity={0.34} /></mesh>
    </group>
  );
}

function Goal() {
  return (
    <group position={[GOAL_X, 0, -0.15]}>
      <mesh position={[-1.25, 1.25, 0]} castShadow><cylinderGeometry args={[0.055, 0.055, 2.5, 16]} /><meshStandardMaterial color="#F7FBFF" roughness={0.42} metalness={0.16} /></mesh>
      <mesh position={[1.25, 1.25, 0]} castShadow><cylinderGeometry args={[0.055, 0.055, 2.5, 16]} /><meshStandardMaterial color="#F7FBFF" roughness={0.42} metalness={0.16} /></mesh>
      <mesh position={[0, 2.5, 0]} rotation={[0, 0, Math.PI / 2]} castShadow><cylinderGeometry args={[0.055, 0.055, 2.5, 16]} /><meshStandardMaterial color="#F7FBFF" roughness={0.42} metalness={0.16} /></mesh>
      {Array.from({ length: 9 }, (_, index) => <mesh key={`v-${index}`} position={[-1.2 + index * 0.3, 1.25, -0.08]}><boxGeometry args={[0.012, 2.38, 0.012]} /><meshBasicMaterial color="#DDF5FF" transparent opacity={0.3} /></mesh>)}
      {Array.from({ length: 7 }, (_, index) => <mesh key={`h-${index}`} position={[0, 0.12 + index * 0.36, -0.08]}><boxGeometry args={[2.4, 0.012, 0.012]} /><meshBasicMaterial color="#DDF5FF" transparent opacity={0.3} /></mesh>)}
    </group>
  );
}

function CameraRig({ progress, phase }: { progress: number; phase: RoadPitchPhase }) {
  const lookAt = useRef(new THREE.Vector3(0, 2.1, 0));
  useFrame((state, delta) => {
    const runnerX = runnerTargetX(progress);
    const extra = phase === 'tackle' || phase === 'tackled' ? 0.8 : 0;
    const correctFocus = phase === 'correct' && progress < MULTIPLIERS.length ? zoneX(progress) + 1.2 : null;
    const focusX = progress >= MULTIPLIERS.length ? GOAL_X - 1.2 : correctFocus ?? runnerX + 1.05 + extra;
    state.camera.position.x = THREE.MathUtils.damp(state.camera.position.x, focusX, 4.8, delta);
    state.camera.position.y = THREE.MathUtils.damp(state.camera.position.y, 4.9, 5, delta);
    state.camera.position.z = THREE.MathUtils.damp(state.camera.position.z, 12.2, 5, delta);
    lookAt.current.x = THREE.MathUtils.damp(lookAt.current.x, focusX, 5.2, delta);
    lookAt.current.y = THREE.MathUtils.damp(lookAt.current.y, 2.05, 5.2, delta);
    state.camera.lookAt(lookAt.current);
  });
  return null;
}

function RoadScene({ progress, phase }: Omit<RoadPitchState, 'labels'>) {
  const runnerX = runnerTargetX(progress);
  const tackling = phase === 'tackle' || phase === 'tackled';
  const dribblingPast = phase === 'correct';
  return (
    <>
      <color attach="background" args={['#06101C']} />
      <fog attach="fog" args={['#07111D', 22, 42]} />
      <ambientLight intensity={0.75} color="#C7DBFF" />
      <hemisphereLight args={['#EAF5FF', '#0C3A22', 1.35]} />
      <directionalLight position={[4, 11, 8]} intensity={2.4} color="#FFF8DF" castShadow shadow-mapSize-width={2048} shadow-mapSize-height={2048} shadow-camera-left={-11} shadow-camera-right={11} shadow-camera-top={10} shadow-camera-bottom={-5} />
      <directionalLight position={[-8, 7, 4]} intensity={1.3} color="#9FC8FF" />
      <Stadium />
      <Pitch />
      <Goal />
      {MULTIPLIERS.map((_, index) => <Defender key={`defender-${index}`} index={index} active={index === progress && progress < MULTIPLIERS.length} cleared={index < progress} tackling={tackling} beaten={dribblingPast && index === progress} runnerX={runnerX} />)}
      <Runner progress={progress} phase={phase} />
      <MatchBall progress={progress} phase={phase} />
      <CameraRig progress={progress} phase={phase} />
    </>
  );
}

export function RoadToGoalPitch({ progress, phase, labels }: RoadToGoalPitchProps) {
  return (
    <div className="relative aspect-[16/9] w-full overflow-hidden rounded-[16px] border border-white/10 bg-[#040B09] shadow-[inset_0_1px_0_rgba(255,255,255,0.08),0_16px_36px_rgba(0,0,0,0.3)] sm:rounded-[20px] lg:rounded-[26px] lg:shadow-[inset_0_1px_0_rgba(255,255,255,0.08),0_24px_60px_rgba(0,0,0,0.32)]">
      <Canvas dpr={[1, 1.6]} shadows camera={{ position: [-0.6, 4.9, 12.2], fov: 40, near: 0.1, far: 80 }} gl={{ antialias: true, alpha: false, powerPreference: 'high-performance' }} onCreated={({ camera }) => camera.lookAt(0, 2.05, 0)}>
        <RoadScene progress={progress} phase={phase} />
      </Canvas>
      <ZoneCardRail progress={progress} labels={labels} />
      <div className="pointer-events-none absolute left-2 top-2 z-20 rounded-lg border border-[#6685FF]/45 bg-[#061128]/88 px-2.5 py-1.5 shadow-[0_7px_18px_rgba(0,0,0,.28)] backdrop-blur-sm sm:left-3 sm:top-3 lg:left-4 lg:top-4 lg:rounded-xl lg:px-4 lg:py-2 lg:shadow-[0_10px_28px_rgba(0,0,0,.3)]">
        <div className="flex items-center gap-1.5 font-poppins text-[8px] font-black tracking-[0.12em] text-white sm:text-[9px] lg:gap-2 lg:text-[11px] lg:tracking-[0.16em]"><span className="h-3.5 w-1 rounded-full bg-[#1645FF] shadow-[0_0_8px_#1645FF] lg:h-5 lg:w-1.5 lg:shadow-[0_0_12px_#1645FF]" />QUIZBALL</div>
        <div className="mt-0.5 hidden pl-2.5 font-poppins text-[6px] font-extrabold uppercase tracking-[0.14em] text-[#9BB0FF] lg:block lg:pl-3.5 lg:text-[7px] lg:tracking-[0.18em]">11 zones · one run</div>
      </div>
      <div className="pointer-events-none absolute right-2.5 top-2.5 z-20 font-poppins text-[9px] font-black uppercase tracking-[0.12em] text-[#FFE500] drop-shadow-[0_2px_0_rgba(0,0,0,.55)] sm:right-3 sm:top-3 sm:text-[11px] lg:right-5 lg:top-5 lg:text-base lg:tracking-[0.2em]">Road to Goal</div>
      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-10 bg-gradient-to-t from-[#020805]/65 to-transparent sm:h-12 lg:h-16" />
    </div>
  );
}
