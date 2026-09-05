'use client';

import { Component, Suspense, useCallback, useEffect, useMemo, useRef, type ReactNode, type RefObject } from 'react';
import { Canvas, useFrame, useLoader } from '@react-three/fiber';
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { buildPlayerObject, disposeBuiltObject, resolveJoints, jointsAttached, setJoint, SCORE_BODY_URL, SCORE_HAIR_URL, type JointMap, type HairStyleName } from './ScoreGoalsPlayer3D';
import { RoadTackle, ROAD_TACKLE_CONTACT, type RoadTackleClock } from './RoadTackle';
import Image from 'next/image';
import { FootballClipPlayer } from './FootballClipPlayer';
import { bounceHeight } from '../lib/ballPhysics';
import { ROAD_GOAL_X, ROAD_SHOT_X, ROAD_GOAL_IMPACT, sampleRoadShot, updateRoadFinish, type RoadFinishState } from '../lib/roadFinish';
import type { KeeperSaveStyle } from '../lib/keeperSaves';
import { FOOTBALL_STYLES, type FootballStyle } from '../lib/footballActions';
import { RoadGoal, RoadKeeper } from './RoadGoal';
import { RoadAdvertisingBoards } from './RoadAdvertisingBoards';
import { useMatchBallTexture, useMatchBallGeometry, usePitchTurf, useStadiumArtwork } from './footballVisuals';

/** WebGL/three failures must degrade to the 2D fallback (via onFailure), not
 *  crash the game route — R3F throws outward when context creation fails. */
class CanvasFailureBoundary extends Component<
  { onFailure?: () => void; children: ReactNode },
  { failed: boolean }
> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  componentDidCatch() {
    this.props.onFailure?.();
  }
  render() {
    return this.state.failed ? null : this.props.children;
  }
}

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
  actionStyle?: FootballStyle;
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
const START_X = -1.7;
const FIRST_ZONE_X = 1.5;
const ZONE_GAP = 3.25;
const GOAL_X = ROAD_GOAL_X;
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
  if (progress >= MULTIPLIERS.length - 1) return ROAD_SHOT_X;
  return zoneX(progress - 1) + 0.9;
}

type HairStyle = 'headband' | 'crop' | 'cornrows' | 'wave';
const ROAD_HAIR: Record<HairStyle, HairStyleName> = {
  headband: 'Hair_SimpleParted', crop: 'Hair_Buzzed', cornrows: 'Hair_Buzzed', wave: 'Hair_SimpleParted',
};

interface RoadMotion { name: string | null; time: number; loop: boolean }

function PlayerRig({ look, motion, actionStyle = 'power' }: { look: PlayerLook; motion: RefObject<RoadMotion>; actionStyle?: FootballStyle }) {
  const body = useLoader(GLTFLoader, SCORE_BODY_URL);
  const hair = useLoader(GLTFLoader, SCORE_HAIR_URL);
  const { obj, clips } = useMemo(() => {
    const obj = buildPlayerObject(body.scene, {
    shirt: look.kit, shorts: look.shorts, socks: look.socks, accent: look.accent, boots: look.boots,
  }, `road-${look.number}`, look.number, look.accent, {
    skin: look.skin, hair: hair.scene, hairColor: look.hair, hairStyle: ROAD_HAIR[look.hairStyle],
  });
    const player = new FootballClipPlayer(obj, body.animations);
    if (look === RUNNER_LOOK) {
      const style = FOOTBALL_STYLES[actionStyle];
      player.sample(style.shot, .8);
      obj.updateMatrixWorld(true);
      const foot = obj.getObjectByName(`foot_${style.foot}`) as THREE.Bone | undefined;
      const contact = new THREE.Vector3(style.foot === 'l' ? .1143 : -.1143, .07, .15);
      let bound = false;
      obj.traverse(child => {
        const mesh = child as THREE.SkinnedMesh;
        if (!mesh.isSkinnedMesh || !foot || bound) return;
        const index = mesh.skeleton.bones.indexOf(foot);
        if (index >= 0) { contact.applyMatrix4(mesh.skeleton.boneInverses[index]).applyMatrix4(foot.matrixWorld); bound = true; }
      });
      obj.userData.roadKickContact = contact;
      player.stop();
    }
    return { obj, clips: player };
  }, [body, hair, look, actionStyle]);
  useEffect(() => () => { clips.stop(); disposeBuiltObject(obj); }, [obj, clips]);
  useFrame(() => {
    const state = motion.current;
    if (state.name) clips.sample(state.name, state.time, state.loop, state.name.startsWith('celebrate') ? .35 : 0);
    else clips.stop();
  }, -1);
  return <primitive object={obj} />;
}

function poseIdle(joint: JointMap, now: number, offset = 0) {
  const breathe = Math.sin(now * 2.2 + offset);
  setJoint(joint.ankleL, 0);
  setJoint(joint.ankleR, 0);
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

function Runner({ progress, phase, finish, actionStyle, onReady }: { actionStyle: FootballStyle; progress: number; phase: RoadPitchPhase; finish: RefObject<RoadFinishState>; onReady: (root: THREE.Group | null) => void }) {
  const root = useRef<THREE.Group>(null);
  useEffect(() => { onReady(root.current); return () => onReady(null); }, [onReady]);
  const motion = useRef<RoadMotion>({ name: 'outfield_idle', time: 0, loop: true });
  const joints = useRef<JointMap | null>(null);
  const previousPhase = useRef<RoadPitchPhase>(phase);
  const dribbleStart = useRef<number | null>(null);
  const dribbleOrigin = useRef(START_X);
  const strideDistance = useRef(0);
  const lastX = useRef(START_X);
  const phaseStart = useRef(0);

  useFrame((state, delta) => {
    const player = root.current;
    if (!player) return;
    if (!joints.current || !jointsAttached(player, joints.current)) joints.current = resolveJoints(player);
    const joint = joints.current;
    if (!joint) return;
    const now = state.clock.elapsedTime;
    motion.current.name = 'outfield_idle';
    motion.current.time = now;
    motion.current.loop = true;
    strideDistance.current += Math.abs(player.position.x - lastX.current);
    lastX.current = player.position.x;
    const strideTime = strideDistance.current * 0.55;
    const targetX = runnerTargetX(progress);
    const tackling = phase === 'tackle' || phase === 'tackled';
    if (phase === 'correct' && previousPhase.current !== 'correct') {
      dribbleStart.current = now;
      dribbleOrigin.current = player.position.x;
    }
    if (phase === 'idle' || phase === 'question') {
      dribbleStart.current = null;
    }
    if (previousPhase.current !== phase) phaseStart.current = now;
    previousPhase.current = phase;

    if (progress >= 10) {
      const shotTime = finish.current.elapsed ?? 0;
      const yaw = Math.PI / 2 - .25;
      const contact = player.children[0]?.userData.roadKickContact as THREE.Vector3 | undefined;
      const offsetX = contact ? 1.75 * (contact.x * Math.cos(yaw) + contact.z * Math.sin(yaw)) : .65;
      const offsetZ = contact ? 1.75 * (-contact.x * Math.sin(yaw) + contact.z * Math.cos(yaw)) : .03;
      player.position.set(ROAD_SHOT_X + .65 - offsetX, 0, 1.28 - offsetZ);
      player.rotation.set(0, yaw, 0);
      motion.current.name = FOOTBALL_STYLES[actionStyle].stance;
      if (finish.current.elapsed === null) return;
      motion.current.name = shotTime < ROAD_GOAL_IMPACT + .2 ? FOOTBALL_STYLES[actionStyle].shot : finish.current.saved ? 'outfield_idle' : FOOTBALL_STYLES[actionStyle].celebration;
      motion.current.time = shotTime < ROAD_GOAL_IMPACT + .2 ? Math.min(shotTime * .8 / .45, 1.5) : shotTime - ROAD_GOAL_IMPACT - .2;
      motion.current.loop = finish.current.saved && shotTime >= ROAD_GOAL_IMPACT + .2;
      return;
    }
    if (tackling) {
      motion.current.name = null;
      return;
    }

    if (phase === 'correct' && dribbleStart.current != null && progress < MULTIPLIERS.length - 1) {
      const t = clamp01((now - dribbleStart.current) / 1.05);
      motion.current.name = 'dribble';
      motion.current.time = t * 1.25;
      const drive = easeInOut(t);
      const arc = Math.sin(t * Math.PI);
      const touches = Math.sin(t * Math.PI * 6);
      player.position.x = THREE.MathUtils.lerp(dribbleOrigin.current, zoneX(progress) + 0.9, drive);
      player.position.y = Math.abs(Math.sin(t * Math.PI * 3)) * 0.065;
      player.position.z = PLAYER_Z + arc * 0.72 + touches * 0.055;
      player.rotation.y = Math.PI / 2 - arc * 0.18;
      player.rotation.z = -Math.sin(t * Math.PI * 2) * 0.12;
      poseRun(joint, strideTime, Math.sin(t * Math.PI) * 0.65 + 0.35);
      setJoint(joint.spine, 0.16, -arc * 0.08, -touches * 0.08);
      setJoint(joint.head, -0.04, -arc * 0.24, touches * 0.025);
      return;
    }

    const distance = targetX - player.position.x;
    const moving = Math.abs(distance) > 0.025;
    player.position.x = THREE.MathUtils.damp(player.position.x, targetX, moving ? 5.2 : 8, delta);
    player.position.z = THREE.MathUtils.damp(player.position.z, PLAYER_Z, 8, delta);
    player.rotation.z = THREE.MathUtils.damp(player.rotation.z, 0, 9, delta);
    if (moving) {
      motion.current.name = 'dribble';
      motion.current.time = strideDistance.current * 0.36;
      const intensity = Math.min(1, 0.5 + Math.abs(distance) * 0.35);
      poseRun(joint, strideTime, intensity);
      player.position.y = Math.abs(Math.sin(strideTime * 10.5)) * 0.045 * intensity;
      player.rotation.y = THREE.MathUtils.damp(player.rotation.y, Math.PI / 2, 6, delta);
    } else {
      player.position.y = Math.sin(now * 2.2) * 0.012;
      player.rotation.y = THREE.MathUtils.damp(player.rotation.y, progress >= 10 ? Math.PI / 2 - .25 : 0, 7, delta);
      poseIdle(joint, now);
    }
  }, -2);
  return <group ref={root} position={[START_X, 0, PLAYER_Z]} scale={1.75}><PlayerRig look={RUNNER_LOOK} motion={motion} actionStyle={actionStyle} /></group>;
}

function Defender({ index, active, cleared, tackling, beaten, onReady }: { index: number; active: boolean; cleared: boolean; tackling: boolean; beaten: boolean; onReady: (root: THREE.Group | null) => void }) {
  const root = useRef<THREE.Group>(null);
  useEffect(() => { if (active) { onReady(root.current); return () => onReady(null); } }, [active, onReady]);
  const motion = useRef<RoadMotion>({ name: 'outfield_idle', time: 0, loop: true });
  const joints = useRef<JointMap | null>(null);
  const wasBeaten = useRef(false);
  const beatenStart = useRef<number | null>(null);
  const homeX = zoneX(index);
  const look = DEFENDER_LOOKS[index % DEFENDER_LOOKS.length];

  useFrame((state, delta) => {
    const player = root.current;
    if (!player) return;
    if (!joints.current || !jointsAttached(player, joints.current)) joints.current = resolveJoints(player);
    const joint = joints.current;
    if (!joint) return;
    const now = state.clock.elapsedTime;
    motion.current.name = 'outfield_idle';
    motion.current.time = now;
    motion.current.loop = true;
    if (beaten && !wasBeaten.current) beatenStart.current = now;
    if (!beaten) beatenStart.current = null;
    wasBeaten.current = beaten;
    if (tackling && active) {
      motion.current.name = null;
      player.visible = true;
      return;
    }
    if (beaten && active && beatenStart.current != null) {
      motion.current.name = null;
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
      motion.current.name = 'jockey';
      motion.current.time = now + index * 0.13;
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
  }, -2);
  return <group ref={root} position={[homeX, 0, DEFENDER_Z]} scale={active ? 1.67 : 1.58}><PlayerRig look={look} motion={motion} /></group>;
}

function MatchBall({ progress, phase, finish, saveStyle, actionStyle, tackleClock }: { actionStyle: FootballStyle; saveStyle: KeeperSaveStyle; progress: number; phase: RoadPitchPhase; finish: RefObject<RoadFinishState>; tackleClock: RefObject<RoadTackleClock> }) {
  const root = useRef<THREE.Mesh>(null);
  const shadow = useRef<THREE.Mesh>(null);
  const previousPhase = useRef<RoadPitchPhase>(phase);
  const tackleStart = useRef<number | null>(null);
  const tackleOrigin = useRef(START_X + 0.5);
  const dribbleStart = useRef<number | null>(null);
  const dribbleOrigin = useRef(START_X + 0.5);
  const previousBall = useRef(new THREE.Vector3(START_X + .5, .17, PLAYER_Z));
  const rollAxis = useMemo(() => new THREE.Vector3(), []);
  const map = useMatchBallTexture();
  const geometry = useMatchBallGeometry(0.17);
  useFrame((state, delta) => {
    const ball = root.current;
    if (!ball) return;
    const now = state.clock.elapsedTime;
    const target = runnerTargetX(progress) + 0.48;
    if ((phase === 'tackle' || phase === 'tackled') && previousPhase.current !== 'tackle' && previousPhase.current !== 'tackled') {
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
    if (finish.current.elapsed !== null) {
      sampleRoadShot(ball.position, finish.current.elapsed, finish.current.saved, finish.current.catchPoint, saveStyle, actionStyle);
    } else if ((phase === 'tackle' || phase === 'tackled') && tackleStart.current != null) {
      const t = clamp01(((tackleClock.current.elapsed ?? 0) - ROAD_TACKLE_CONTACT) / 0.72);
      ball.position.x = tackleOrigin.current + easeOut(t) * 3.1;
      ball.position.y = bounceHeight(.17, 1.1, t * .72, .17);
      ball.position.z = PLAYER_Z + Math.sin(t * Math.PI) * 0.28;

    } else if (phase === 'correct' && dribbleStart.current != null && progress < MULTIPLIERS.length - 1) {
      const t = clamp01((now - dribbleStart.current) / 1.05);
      const drive = easeInOut(t);
      const arc = Math.sin(t * Math.PI);
      const touch = Math.sin(t * Math.PI * 3);
      ball.position.x = THREE.MathUtils.lerp(dribbleOrigin.current, zoneX(progress) + 1.38, drive);
      ball.position.y = 0.17 + Math.abs(touch) * 0.025;
      ball.position.z = PLAYER_Z + 0.03 + arc * 0.72 + touch * 0.17;

    } else {
      const distance = target - ball.position.x;
      ball.position.x = THREE.MathUtils.damp(ball.position.x, target, 6.4, delta);
      const dribbling = Math.abs(distance) > 0.035;
      ball.position.y = 0.17 + (dribbling ? Math.abs(Math.sin(now * 12.5)) * 0.025 : 0);
      ball.position.z = PLAYER_Z + 0.03;

    }
    const dx = ball.position.x - previousBall.current.x, dz = ball.position.z - previousBall.current.z;
    const distanceRolled = Math.hypot(dx, dz);
    if (distanceRolled > .00001) {
      rollAxis.set(dz, 0, -dx).normalize();
      ball.rotateOnWorldAxis(rollAxis, distanceRolled / .17);
    }
    previousBall.current.copy(ball.position);
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
      <mesh ref={root} geometry={geometry} position={[START_X + 0.5, 0.17, PLAYER_Z]} castShadow><meshStandardMaterial map={map} roughness={0.62} metalness={0.02} /></mesh>
    </>
  );
}

function ZoneCardRail({ progress, labels }: { progress: number; labels: RoadPitchState['labels'] }) {
  const start = Math.max(0, Math.min(progress - 1, MULTIPLIERS.length - 4));
  return <ol aria-label="Zone multipliers" className="relative z-10 mx-3 my-3 flex gap-1.5 rounded-2xl border border-white/20 bg-brand-blue p-1.5 backdrop-blur-md sm:absolute sm:bottom-3 sm:inset-x-auto sm:mx-0 sm:my-0 sm:left-1/2 sm:w-[min(620px,85%)] sm:-translate-x-1/2 sm:gap-2 sm:p-2">
    {MULTIPLIERS.slice(start, start + 4).map((multiplier, offset) => {
      const index = start + offset, cleared = index < progress, active = index === progress;
      return <li key={index} aria-current={active ? 'step' : undefined} className={`min-w-0 flex-1 rounded-xl px-2 py-2 sm:px-4 ${active ? 'bg-brand-yellow text-black' : 'text-white'}`}>
        <div className={`mb-1 flex items-center justify-between text-[8px] font-semibold uppercase tracking-wider sm:text-[10px] ${active ? 'text-black/70' : 'text-white/80'}`}><span>Zone {String(index + 1).padStart(2, '0')}</span>{cleared && <span aria-label={labels.safe}>✓</span>}</div>
        <div className="font-poppins text-base font-bold leading-none tabular-nums sm:text-xl">{multiplier.toFixed(2)}<span className="ml-0.5 text-xs opacity-60">×</span></div>
        {active && <div className="mt-1 hidden truncate text-[8px] font-semibold uppercase tracking-wider sm:block">{index === 10 ? 'Goalkeeper' : labels.target}</div>}
      </li>;
    })}
  </ol>;
}

function Stadium() {
  const root = useRef<THREE.Group>(null);
  const viewDirection = useMemo(() => new THREE.Vector3(), []);
  const backdrop = useStadiumArtwork('/assets/demos/road-to-goal-stadium-panorama-v4.png', 65 / 14);
  useFrame(({ camera }) => {
    camera.getWorldDirection(viewDirection);
    // Keep the grandstand centered where the camera sees it, including the angled final shot.
    if (root.current && viewDirection.z < -.01) {
      root.current.position.x = camera.position.x + viewDirection.x * (-12 - camera.position.z) / viewDirection.z;
    }
  });
  return <>
    <group ref={root}>
      <mesh position={[0, 6.5, -12]}><planeGeometry args={[65, 14]} /><meshBasicMaterial map={backdrop} toneMapped={false} fog={false} /></mesh>
    </group>
    <RoadAdvertisingBoards />
  </>;
}

function Pitch() {
  const { map, bumpMap } = usePitchTurf(12, 3);
  return (
    <group>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[GOAL_X / 2, -0.025, 0.8]} receiveShadow>
        <planeGeometry args={[90, 26]} />
        <meshStandardMaterial map={map} bumpMap={bumpMap} bumpScale={0.006} roughness={0.94} metalness={0} />
      </mesh>
      {Array.from({ length: 15 }, (_, index) => <mesh key={index} rotation={[-Math.PI / 2, 0, 0]} position={[-8 + index * 4, -.02, .8]} receiveShadow><planeGeometry args={[4, 18]} /><meshStandardMaterial color={index % 2 ? '#bedb9f' : '#102c1b'} transparent opacity={.045} depthWrite={false} roughness={1} /></mesh>)}
      {[
        [GOAL_X / 2, -8.2, 76, .065], [GOAL_X / 2, 9.8, 76, .065],
        [0, .8, .065, 18], [GOAL_X, .8, .065, 18],
        [GOAL_X - 7, .8, .065, 14], [GOAL_X - 3.5, -6.2, 7, .065], [GOAL_X - 3.5, 7.8, 7, .065],
        [GOAL_X - 2.5, .8, .065, 9.8], [GOAL_X - 1.25, -4.1, 2.5, .065], [GOAL_X - 1.25, 5.7, 2.5, .065],
      ].map(([x, z, width, depth], index) => <mesh key={index} rotation={[-Math.PI / 2, 0, 0]} position={[x, .004, z]}><planeGeometry args={[width, depth]} /><meshBasicMaterial color="#e6efdf" transparent opacity={.78} depthWrite={false} /></mesh>)}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, .006, .8]}><ringGeometry args={[2.8, 2.86, 80]} /><meshBasicMaterial color="#e6efdf" transparent opacity={.78} /></mesh>
      {[0, GOAL_X - 5].map(x => <mesh key={x} rotation={[-Math.PI / 2, 0, 0]} position={[x, .006, .8]}><circleGeometry args={[.09, 20]} /><meshBasicMaterial color="#e6efdf" /></mesh>)}
      <mesh rotation={[-Math.PI / 2, 0, Math.PI / 2]} position={[GOAL_X - 5, .006, .8]}><ringGeometry args={[2.8, 2.86, 40, 1, .79, Math.PI - 1.58]} /><meshBasicMaterial color="#e6efdf" transparent opacity={.78} /></mesh>
    </group>
  );
}

function CameraRig({ progress, phase }: { progress: number; phase: RoadPitchPhase }) {
  const lookAt = useRef(new THREE.Vector3(0, 2.1, 0));
  useFrame((state, delta) => {
    const runnerX = runnerTargetX(progress);
    const extra = phase === 'tackle' || phase === 'tackled' ? 0.8 : 0;
    const correctFocus = phase === 'correct' && progress < MULTIPLIERS.length ? zoneX(progress) + 1.2 : null;
    const final = progress >= 10;
    const focusX = final ? (ROAD_SHOT_X + GOAL_X) / 2 : correctFocus ?? runnerX + 1.05 + extra;
    state.camera.position.x = THREE.MathUtils.damp(state.camera.position.x, focusX - (final ? 5.5 : 0), 4.8, delta);
    state.camera.position.y = THREE.MathUtils.damp(state.camera.position.y, final ? 7 : 4.9, 5, delta);
    state.camera.position.z = THREE.MathUtils.damp(state.camera.position.z, final ? 16 : 12.2, 5, delta);
    lookAt.current.x = THREE.MathUtils.damp(lookAt.current.x, focusX, 5.2, delta);
    lookAt.current.y = THREE.MathUtils.damp(lookAt.current.y, 2.05, 5.2, delta);
    state.camera.lookAt(lookAt.current);
  });
  return null;
}

function RoadScene({ progress, phase, actionStyle }: Omit<RoadPitchState, 'labels'> & { actionStyle: FootballStyle }) {
  const finish = useRef<RoadFinishState>({ started: null, elapsed: null, saved: false, catchPoint: new THREE.Vector3() });
  useFrame(({ clock }) => updateRoadFinish(finish.current, progress, phase, clock.elapsedTime), -3);
  const runnerRoot = useRef<THREE.Group>(null);
  const defenderRoot = useRef<THREE.Group>(null);
  const tackleClock = useRef<RoadTackleClock>({ elapsed: null });
  const registerRunner = useCallback((root: THREE.Group | null) => { runnerRoot.current = root; }, []);
  const registerDefender = useCallback((root: THREE.Group | null) => { defenderRoot.current = root; }, []);
  const updateTackleClock = useCallback((elapsed: number | null) => { tackleClock.current.elapsed = elapsed; }, []);
  const shadowTarget = useMemo(() => new THREE.Object3D(), []);
  const runnerX = runnerTargetX(progress);
  const tackling = phase === 'tackle' || phase === 'tackled';
  const dribblingPast = phase === 'correct';
  return (
    <>
      <color attach="background" args={['#06101C']} />
      <fog attach="fog" args={['#07111D', 22, 42]} />
      <ambientLight intensity={0.3} color="#C7DBFF" />
      <hemisphereLight args={['#EAF5FF', '#163b2d', 1.05]} />
      <directionalLight position={[runnerX + 4, 11, 8]} target={shadowTarget} intensity={2.7} color="#FFF8DF" castShadow shadow-mapSize-width={2048} shadow-mapSize-height={2048} shadow-camera-left={-11} shadow-camera-right={11} shadow-camera-top={10} shadow-camera-bottom={-7} shadow-normalBias={0.025} shadow-bias={-0.0001} />
      <directionalLight position={[-8, 7, 4]} intensity={1.3} color="#9FC8FF" />
      <directionalLight position={[runnerX - 3, 8, -5]} intensity={2} color="#bbdeff" />
      <primitive object={shadowTarget} position={[runnerX, 0, 0]} />
      <Suspense fallback={null}><Stadium /></Suspense>
      <Pitch />
      <RoadGoal finish={finish} />
      <Suspense fallback={null}>
      {MULTIPLIERS.map((_, index) => index < 10 && Math.abs(index - progress) <= 3 && <Defender key={`defender-${index}`} index={index} active={index === progress && progress < MULTIPLIERS.length} cleared={index < progress} tackling={tackling} beaten={dribblingPast && index === progress} onReady={registerDefender} />)}
      <RoadKeeper finish={finish} saveStyle={FOOTBALL_STYLES[actionStyle].keeper} />
      <Runner progress={progress} phase={phase} finish={finish} actionStyle={actionStyle} onReady={registerRunner} />
      <RoadTackle active={tackling && progress < 10} runner={runnerRoot} defender={defenderRoot} onElapsed={updateTackleClock} />
      <MatchBall actionStyle={actionStyle} progress={progress} phase={phase} finish={finish} saveStyle={FOOTBALL_STYLES[actionStyle].keeper} tackleClock={tackleClock} />
      </Suspense>
      <CameraRig progress={progress} phase={phase} />
    </>
  );
}

export function RoadToGoalPitch({ progress, phase, labels, onFailure, actionStyle = 'power' }: RoadToGoalPitchProps) {
  return (
    <div className="relative w-full overflow-hidden rounded-[16px] border border-white/10 bg-[#040B09] shadow-[inset_0_1px_0_rgba(255,255,255,0.08),0_16px_36px_rgba(0,0,0,0.3)] sm:rounded-[20px] lg:rounded-[26px] lg:shadow-[inset_0_1px_0_rgba(255,255,255,0.08),0_24px_60px_rgba(0,0,0,0.32)]">
      <div className="relative aspect-[4/3] sm:aspect-[16/9]">
      <CanvasFailureBoundary onFailure={onFailure}>
        <Canvas dpr={[1, 1.6]} shadows={{ type: THREE.PCFShadowMap }} camera={{ position: [-0.6, 4.9, 12.2], fov: 40, near: 0.1, far: 80 }} gl={{ antialias: true, alpha: false, powerPreference: 'high-performance' }} onCreated={({ camera }) => camera.lookAt(0, 2.05, 0)}>
          <Suspense fallback={null}><RoadScene progress={progress} phase={phase} actionStyle={actionStyle} /></Suspense>
        </Canvas>
      </CanvasFailureBoundary>
      <div className="pointer-events-none absolute inset-x-3 top-3 z-20 flex items-center justify-between sm:inset-x-5 sm:top-4">
        <div className="flex items-center gap-3"><Image src="/assets/brand/quizball-logo.webp" alt="Quizball" width={179} height={148} className="h-8 w-auto" /><span className="hidden h-7 w-px bg-white/20 sm:block" /><span className="font-poppins text-xs font-semibold text-white sm:text-sm">Road to Goal</span></div>
        <span className="rounded-full border border-white/15 bg-[#081724]/75 px-3 py-1.5 text-[10px] font-semibold tabular-nums text-slate-200">{Math.min(progress + 1, 11)} / 11</span>
      </div>
      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-10 bg-gradient-to-t from-[#020805]/65 to-transparent sm:h-12 lg:h-16" />
      </div>
      <ZoneCardRail progress={progress} labels={labels} />
    </div>
  );
}
