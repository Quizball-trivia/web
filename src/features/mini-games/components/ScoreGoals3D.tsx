'use client';

/**
 * SCORE! — 3D broadcast-style view (three.js via @react-three/fiber).
 *
 * World space = the shared pitch-metre system (data/scoreGoals.ts): goal line
 * at z=0 centred on x=0, +z into the pitch, y up. Players are CC0 Quaternius
 * mannequins (ScoreGoalsPlayer3D) driven by real animation clips — the scene
 * crossfades idle/jog/sprint by measured speed, plays a crouching keeper, and
 * layers procedural bone overrides for the kick strike, keeper dive and
 * beaten-defender stumble AFTER mixer.update. Swipes are drawn paths whose
 * bend and speed carry into the ball (Score! World Goals style); the actor
 * winds up during KICK_LEAD before the ball leaves. All ref access happens
 * inside useFrame / event handlers (React Compiler rule).
 */

import { Suspense, useCallback, useMemo, useRef, useState } from 'react';
import { Canvas, useFrame, type ThreeEvent } from '@react-three/fiber';
import * as THREE from 'three';
import { GOAL_HALF_W, GOAL_HEIGHT, type GoalPlayer } from '../data/scoreGoals';
import {
  drawnCurveOf,
  easeInOut01,
  flightPos,
  type Flight,
  type ScoreGoalsViewProps,
  type ViewPhase,
} from '../lib/scoreGoalsFlight';
import {
  AnimatedPlayer,
  jointsAttached,
  resolveJoints,
  setJoint,
  type ClipKey,
  type PlayerHandle,
} from './ScoreGoalsPlayer3D';

const ACCENT = '#FFE500';
const POST_R = 0.06;
const NET_D = 1.7;
const KICK_LEAD = 0.34;

const _v1 = new THREE.Vector3();
const _v2 = new THREE.Vector3();

const clamp01 = (v: number) => Math.min(1, Math.max(0, v));
const easeOut = (v: number) => 1 - (1 - clamp01(v)) * (1 - clamp01(v));

function lerpAngle(a: number, b: number, t: number): number {
  let d = (b - a) % (Math.PI * 2);
  if (d > Math.PI) d -= Math.PI * 2;
  if (d < -Math.PI) d += Math.PI * 2;
  return a + d * t;
}

function Goalframe() {
  const netMat = (
    <meshBasicMaterial color="#ffffff" wireframe transparent opacity={0.28} />
  );
  return (
    <group>
      {[-GOAL_HALF_W, GOAL_HALF_W].map((x) => (
        <mesh key={x} position={[x, GOAL_HEIGHT / 2, 0]}>
          <cylinderGeometry args={[POST_R, POST_R, GOAL_HEIGHT, 10]} />
          <meshStandardMaterial color="#f5f5f5" roughness={0.35} />
        </mesh>
      ))}
      <mesh position={[0, GOAL_HEIGHT, 0]} rotation={[0, 0, Math.PI / 2]}>
        <cylinderGeometry args={[POST_R, POST_R, GOAL_HALF_W * 2 + POST_R * 2, 10]} />
        <meshStandardMaterial color="#f5f5f5" roughness={0.35} />
      </mesh>
      <mesh position={[0, GOAL_HEIGHT / 2, -NET_D]}>
        <planeGeometry args={[GOAL_HALF_W * 2, GOAL_HEIGHT, 26, 9]} />
        {netMat}
      </mesh>
      {[-GOAL_HALF_W, GOAL_HALF_W].map((x) => (
        <mesh key={`side-${x}`} position={[x, GOAL_HEIGHT / 2, -NET_D / 2]} rotation={[0, Math.PI / 2, 0]}>
          <planeGeometry args={[NET_D, GOAL_HEIGHT, 7, 9]} />
          {netMat}
        </mesh>
      ))}
      <mesh position={[0, GOAL_HEIGHT, -NET_D / 2]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[GOAL_HALF_W * 2, NET_D, 26, 7]} />
        {netMat}
      </mesh>
    </group>
  );
}

function Pitch({ depth }: { depth: number }) {
  const stripes = useMemo(() => {
    const arr: number[] = [];
    for (let z = 0; z < depth + 14; z += 8) arr.push(z + 2);
    return arr;
  }, [depth]);
  return (
    <group>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 24]}>
        <planeGeometry args={[110, 130]} />
        <meshStandardMaterial color="#0e6132" roughness={1} />
      </mesh>
      {stripes.map((z) => (
        <mesh key={z} rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.004, z + 2]}>
          <planeGeometry args={[110, 4]} />
          <meshStandardMaterial color="#0b5029" roughness={1} />
        </mesh>
      ))}
      {[
        { p: [0, 0.01, 0] as const, s: [68, 0.14] as const, r: 0 },
        { p: [0, 0.01, 16.5] as const, s: [40.32, 0.14] as const, r: 0 },
        { p: [-20.16, 0.01, 8.25] as const, s: [16.5, 0.14] as const, r: Math.PI / 2 },
        { p: [20.16, 0.01, 8.25] as const, s: [16.5, 0.14] as const, r: Math.PI / 2 },
        { p: [0, 0.01, 5.5] as const, s: [18.32, 0.12] as const, r: 0 },
        { p: [-9.16, 0.01, 2.75] as const, s: [5.5, 0.12] as const, r: Math.PI / 2 },
        { p: [9.16, 0.01, 2.75] as const, s: [5.5, 0.12] as const, r: Math.PI / 2 },
      ].map((l, i) => (
        <mesh key={i} rotation={[-Math.PI / 2, 0, l.r]} position={[l.p[0], l.p[1], l.p[2]]}>
          <planeGeometry args={[l.s[0], l.s[1]]} />
          <meshBasicMaterial color="#e8f2e8" transparent opacity={0.8} />
        </mesh>
      ))}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.01, 11]}>
        <circleGeometry args={[0.22, 12]} />
        <meshBasicMaterial color="#e8f2e8" transparent opacity={0.8} />
      </mesh>
      <mesh position={[0, 0.5, -4.4]}>
        <boxGeometry args={[52, 1, 0.25]} />
        <meshStandardMaterial color="#0d1f2d" roughness={0.7} />
      </mesh>
      <mesh position={[0, 0.62, -4.25]}>
        <planeGeometry args={[52, 0.55]} />
        <meshBasicMaterial color="#12324a" />
      </mesh>
      <mesh position={[0, 7, -16]}>
        <planeGeometry args={[300, 18]} />
        <meshBasicMaterial color="#16283c" />
      </mesh>
      <mesh position={[0, 40, -34]}>
        <planeGeometry args={[340, 70]} />
        <meshBasicMaterial color="#0a1420" />
      </mesh>
    </group>
  );
}

function useBallTexture(): THREE.CanvasTexture {
  return useMemo(() => {
    const canvas = document.createElement('canvas');
    canvas.width = 128;
    canvas.height = 64;
    const ctx = canvas.getContext('2d')!;
    ctx.fillStyle = '#f4f4f2';
    ctx.fillRect(0, 0, 128, 64);
    ctx.fillStyle = '#15181d';
    for (let i = 0; i < 8; i++) {
      const x = (i % 4) * 32 + (i > 3 ? 16 : 0) + 8;
      const y = i > 3 ? 44 : 12;
      ctx.beginPath();
      ctx.arc(x, y, 7, 0, Math.PI * 2);
      ctx.fill();
    }
    const tex = new THREE.CanvasTexture(canvas);
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
    return tex;
  }, []);
}

type Mode = 'idle' | 'kick' | 'dribble' | 'run' | 'stumble' | 'dive';

interface SceneProps extends ScoreGoalsViewProps {
  dragPath: [number, number][] | null;
}

function Scene({
  goal,
  stepIndex,
  positions,
  phase,
  flight,
  showHint,
  onFlightEnd,
  dragPath,
}: SceneProps) {
  const step = goal.steps[stepIndex];
  const ballRef = useRef<THREE.Mesh | null>(null);
  const hintRef = useRef<THREE.Mesh | null>(null);
  const actorRingRef = useRef<THREE.Mesh | null>(null);
  const outers = useRef(new Map<string, THREE.Group>());
  const handles = useRef(new Map<string, PlayerHandle>());
  const flightStart = useRef<number | null>(null);
  const ended = useRef(false);
  const prevFlight = useRef<Flight | null>(null);
  const prevPhase = useRef<ViewPhase>('aim');
  const ballTex = useBallTexture();

  const onReady = useCallback((id: string, handle: PlayerHandle | null) => {
    if (handle) handles.current.set(id, handle);
    else handles.current.delete(id);
  }, []);

  const hintTarget = useMemo<[number, number]>(() => {
    if (step.kind === 'shot') return [step.shotTarget?.[0] ?? 0, 0.4];
    return step.to;
  }, [step]);

  useFrame(({ camera, clock }, delta) => {
    const now = clock.getElapsedTime();
    const dt = Math.min(delta, 0.12);

    if (flight !== prevFlight.current || phase !== prevPhase.current) {
      if (phase === 'fly') {
        flightStart.current = now;
        ended.current = false;
      }
      prevFlight.current = flight;
      prevPhase.current = phase;
    }

    const lead = flight && flight.kind !== 'dribble' ? KICK_LEAD : 0;
    const elapsed = phase === 'fly' && flightStart.current !== null ? now - flightStart.current : 0;
    let tBall = 0;
    if (phase === 'done') tBall = 1;
    else if (phase === 'fly' && flight) {
      tBall = clamp01((elapsed - lead) / flight.duration);
      if (tBall >= 1 && !ended.current) {
        ended.current = true;
        onFlightEnd();
      }
    }

    const sample = flight && (phase === 'fly' || phase === 'done') ? flightPos(flight, tBall) : null;
    const bx = sample ? sample.x : step.from[0];
    const bz = sample ? sample.z : step.from[1];
    const bh = sample ? sample.h : 0.11;
    if (ballRef.current) {
      ballRef.current.position.set(bx, bh, bz);
      if (sample && tBall < 1) ballRef.current.rotation.x -= dt * 22;
    }

    const flying = phase === 'fly' || phase === 'done';
    const overall = flight
      ? easeInOut01(phase === 'done' ? 1 : elapsed / (lead + (flight?.duration ?? 1)))
      : 0;

    const intent: [number, number] = step.kind === 'shot' ? [step.shotTarget?.[0] ?? 0, 0] : step.to;
    let dirX = intent[0] - step.from[0];
    let dirZ = intent[1] - step.from[1];
    const dirLen = Math.hypot(dirX, dirZ) || 1;
    dirX /= dirLen;
    dirZ /= dirLen;
    const behindX = step.from[0] - dirX * 0.9;
    const behindZ = step.from[1] - dirZ * 0.9;

    for (const p of goal.players) {
      const outer = outers.current.get(p.id);
      const h = handles.current.get(p.id);
      if (!outer || !h) continue;

      if (!h.started) {
        for (const key of Object.keys(h.actions) as ClipKey[]) {
          const a = h.actions[key];
          if (!a) continue;
          a.play();
          a.setEffectiveWeight(key === (p.team === 'gk' ? 'crouch' : 'idle') ? 1 : 0);
        }
        h.started = true;
      }

      const base = positions[p.id] ?? p.pos;
      let px = base[0];
      let pz = base[1];
      let faceX = bx;
      let faceZ = bz;
      let mode: Mode = 'idle';
      let modeU = 0;
      let diveSide = 1;
      let diveHigh = false;

      const isActor = p.id === step.actorId;
      const nudge = flight?.success ? step.nudges?.find((n) => n.id === p.id) : undefined;

      if (isActor && step.kind === 'dribble' && flying && flight) {
        const tx = flight.end[0] - flight.from[0];
        const tz = flight.end[1] - flight.from[1];
        const tl = Math.hypot(tx, tz) || 1;
        px = bx - (tx / tl) * 0.35;
        pz = bz - (tz / tl) * 0.35;
        faceX = bx + tx;
        faceZ = bz + tz;
        mode = 'dribble';
      } else if (isActor && flying && flight) {
        const u = lead > 0 ? Math.min(1, elapsed / lead + (phase === 'done' ? 1 : 0)) : 1;
        px = THREE.MathUtils.lerp(behindX, step.from[0] - dirX * 0.34, easeInOut01(u));
        pz = THREE.MathUtils.lerp(behindZ, step.from[1] - dirZ * 0.34, easeInOut01(u));
        faceX = px + dirX;
        faceZ = pz + dirZ;
        mode = 'kick';
        modeU = u;
      } else if (isActor && phase === 'aim') {
        px = behindX;
        pz = behindZ;
        faceX = px + dirX;
        faceZ = pz + dirZ;
      } else if (flying && flight?.success && step.kind === 'pass' && step.receiverId === p.id) {
        px = THREE.MathUtils.lerp(base[0], step.to[0], overall);
        pz = THREE.MathUtils.lerp(base[1], step.to[1], overall);
        mode = 'run';
      } else if (flying && nudge) {
        px = THREE.MathUtils.lerp(base[0], nudge.to[0], easeInOut01(tBall));
        pz = THREE.MathUtils.lerp(base[1], nudge.to[1], easeInOut01(tBall));
        mode = 'stumble';
        modeU = tBall;
      } else if (p.team === 'gk' && flying && flight && flight.kind === 'shot') {
        mode = 'dive';
        modeU = clamp01((tBall - 0.1) / 0.55);
        diveSide = (Math.sign(flight.end[0] - base[0]) || 1) as number;
        diveHigh = flight.gy > 1.3;
        faceX = bx;
        faceZ = bz + 4;
      }

      if (!h.init) {
        h.prevX = px;
        h.prevZ = pz;
        h.init = true;
      }
      const moved = Math.hypot(px - h.prevX, pz - h.prevZ);
      const speed = dt > 0 ? moved / dt : 0;
      if (moved > 0.005 && mode === 'idle') mode = 'run';
      h.prevX = px;
      h.prevZ = pz;

      // Locomotion clip weights.
      const targets: Record<ClipKey, number> = {
        idle: 0,
        jog: 0,
        sprint: 0,
        crouch: 0,
        jump: 0,
        roll: 0,
      };
      if (mode === 'run' || mode === 'dribble') {
        const arriving =
          mode === 'run' && flight?.lofted && step.receiverId === p.id && tBall > 0.72;
        if (arriving) targets.jump = 1;
        else if (speed > 4.2) targets.sprint = 1;
        else if (speed > 0.25) targets.jog = 1;
        else targets.idle = 1;
      } else if (mode === 'dive') {
        targets.crouch = 1;
      } else if (mode === 'kick' || mode === 'stumble') {
        targets.idle = 1;
      } else {
        if (p.team === 'gk') targets.crouch = 1;
        else targets.idle = 1;
      }
      for (const key of Object.keys(targets) as ClipKey[]) {
        const a = h.actions[key];
        if (!a) continue;
        const w = a.getEffectiveWeight();
        a.setEffectiveWeight(w + (targets[key] - w) * Math.min(1, dt * 9));
        if (key === 'jog') a.setEffectiveTimeScale(THREE.MathUtils.clamp(speed / 2.6, 0.7, 1.8));
        if (key === 'sprint') a.setEffectiveTimeScale(THREE.MathUtils.clamp(speed / 5.5, 0.8, 1.6));
      }
      h.mixer.update(dt);

      // Procedural overrides on top of the clips (char-space setJoint).
      h.obj.position.set(0, 0, 0);
      h.obj.rotation.set(0, 0, 0);
      if (!h.joints || !jointsAttached(h.obj, h.joints)) h.joints = resolveJoints(h.obj);
      const j = h.joints;
      if (mode === 'kick' && j) {
        const windup = easeInOut01(clamp01(modeU / 0.55));
        const strike = easeOut(clamp01((modeU - 0.55) / 0.45));
        setJoint(j.hipR, windup * 0.95 - strike * 2.3);
        setJoint(j.kneeR, 0.1 + windup * 1.25 - strike * 1.1);
        setJoint(j.ankleR, -0.2 + strike * 0.5);
        setJoint(j.hipL, -windup * 0.25 + strike * 0.3);
        setJoint(j.kneeL, 0.2 + windup * 0.35);
        setJoint(j.shoL, -windup * 0.5 + strike * 1.2, 0, 0.2);
        setJoint(j.shoR, windup * 0.7 - strike * 1.3, 0, -0.2);
        setJoint(j.elbL, -0.5);
        setJoint(j.elbR, -0.55);
        setJoint(j.spine, windup * 0.15 - strike * 0.35, 0, -strike * 0.15);
        h.obj.rotation.z = strike * 0.12;
      } else if (mode === 'stumble' && j) {
        const fall = Math.sin(clamp01(modeU) * Math.PI);
        const side = Math.sign((nudge?.to[0] ?? 0) - base[0]) || 1;
        h.obj.rotation.set(fall * 0.22, 0, side * fall * 0.45);
        h.obj.position.y = -fall * 0.1;
        setJoint(j.shoL, -fall * 0.6, 0, 0.15 + fall * 0.9);
        setJoint(j.shoR, fall * 0.35, 0, -0.15 - fall * 0.9);
        setJoint(j.elbL, -0.35);
        setJoint(j.elbR, -0.35);
        setJoint(j.spine, fall * 0.22, side * fall * 0.35, 0);
      } else if (mode === 'dive' && j) {
        const m = easeOut(modeU);
        const s = diveSide;
        const lift = Math.sin(m * Math.PI) * (diveHigh ? 0.75 : 0.25);
        h.obj.position.set(s * 1.4 * m, lift + (diveHigh ? 0.25 * m : -0.15 * m), 0);
        h.obj.rotation.set(0.05, 0, -s * (diveHigh ? 1.15 : 1.45) * m);
        const lerp = THREE.MathUtils.lerp;
        setJoint(j.shoL, lerp(-0.72, s > 0 ? -0.35 : -2.7, m), 0, lerp(-0.82, s > 0 ? -1.55 : 0.55, m));
        setJoint(j.shoR, lerp(-0.72, s < 0 ? -0.35 : -2.7, m), 0, lerp(0.82, s < 0 ? 1.55 : -0.55, m));
        setJoint(j.elbL, lerp(-0.82, -0.08, m));
        setJoint(j.elbR, lerp(-0.82, -0.08, m));
        setJoint(j.hipL, lerp(-0.62, diveHigh ? 0.35 : 0.85, m), 0, -s * 0.18);
        setJoint(j.hipR, lerp(-0.62, diveHigh ? -0.15 : 0.2, m), 0, s * 0.22);
        setJoint(j.kneeL, lerp(1.08, diveHigh ? 0.42 : 0.95, m));
        setJoint(j.kneeR, lerp(1.08, diveHigh ? 0.62 : 0.55, m));
        setJoint(j.spine, 0.1, 0, -s * m * 0.25);
        setJoint(j.head, 0, 0, -s * 0.22 * m);
      }

      outer.position.set(px, 0, pz);
      const dx = faceX - px;
      const dz = faceZ - pz;
      if (dx * dx + dz * dz > 0.02) {
        outer.rotation.y = lerpAngle(outer.rotation.y, Math.atan2(dx, dz), Math.min(1, dt * 10));
      }
    }

    if (hintRef.current) {
      const mat = hintRef.current.material as THREE.MeshBasicMaterial;
      const vis = showHint && phase === 'aim';
      hintRef.current.visible = vis;
      if (vis) {
        hintRef.current.position.set(hintTarget[0], 0.03, step.kind === 'shot' ? 0.4 : hintTarget[1]);
        const pulse = 0.5 + Math.sin(now * 4.4) * 0.35;
        mat.opacity = Math.max(0.15, pulse);
        const s = 1 + Math.sin(now * 4.4) * 0.18;
        hintRef.current.scale.set(s, s, s);
      }
    }
    if (actorRingRef.current) {
      actorRingRef.current.visible = phase === 'aim';
      actorRingRef.current.position.set(step.from[0], 0.02, step.from[1]);
      const mat = actorRingRef.current.material as THREE.MeshBasicMaterial;
      mat.opacity = 0.55 + Math.sin(now * 3) * 0.2;
    }

    // Broadcast follow-cam: hang behind the ball, look toward goal.
    const camY = 6.4 + bz * 0.14;
    const camZ = bz + 11 + bz * 0.13;
    _v1.set(bx * 0.72, camY, camZ);
    camera.position.lerp(_v1, 0.045);
    _v2.set(bx * 0.35, 0.2, bz * 0.24);
    camera.lookAt(_v2);
  });

  const pathDots = useMemo(() => {
    if (!dragPath || dragPath.length < 2 || phase !== 'aim') return null;
    const dots: [number, number][] = [];
    let acc = 0;
    let prev = dragPath[0];
    for (let i = 1; i < dragPath.length; i++) {
      const pt = dragPath[i];
      acc += Math.hypot(pt[0] - prev[0], pt[1] - prev[1]);
      if (acc >= 1.1) {
        dots.push(pt);
        acc = 0;
      }
      prev = pt;
    }
    return dots.slice(-24);
  }, [dragPath, phase]);

  const kitFor = (p: GoalPlayer) =>
    p.team === 'atk' ? goal.atkKit : p.team === 'gk' ? goal.gkKit : goal.defKit;

  return (
    <group>
      <ambientLight intensity={0.85} />
      <directionalLight position={[14, 24, 18]} intensity={1.5} color="#fff6e0" />
      <directionalLight position={[-18, 14, -8]} intensity={0.4} color="#bcd6ff" />
      <fog attach="fog" args={['#07130b', 55, 120]} />

      <Pitch depth={goal.depth} />
      <Goalframe />

      <Suspense fallback={null}>
        {goal.players.map((p) => (
          <group
            key={p.id}
            ref={(g) => {
              if (g) outers.current.set(p.id, g);
            }}
            position={[p.pos[0], 0, p.pos[1]]}
          >
            <AnimatedPlayer id={p.id} kit={kitFor(p)} number={p.number} onReady={onReady} />
          </group>
        ))}
      </Suspense>

      {/* ball */}
      <mesh ref={ballRef} position={[step.from[0], 0.11, step.from[1]]}>
        <sphereGeometry args={[0.11, 16, 12]} />
        <meshStandardMaterial map={ballTex} roughness={0.4} />
      </mesh>

      {/* actor ring */}
      <mesh ref={actorRingRef} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[0.5, 0.62, 28]} />
        <meshBasicMaterial color={ACCENT} transparent opacity={0.6} depthWrite={false} />
      </mesh>

      {/* hint ring */}
      <mesh ref={hintRef} rotation={[-Math.PI / 2, 0, 0]} visible={false}>
        <ringGeometry args={[1.1, 1.45, 32]} />
        <meshBasicMaterial color={ACCENT} transparent opacity={0.5} depthWrite={false} />
      </mesh>

      {/* drawn swipe path */}
      {pathDots?.map((p, i) => (
        <mesh key={i} rotation={[-Math.PI / 2, 0, 0]} position={[p[0], 0.03, p[1]]}>
          <circleGeometry args={[0.16, 10]} />
          <meshBasicMaterial color={ACCENT} transparent opacity={0.85} depthWrite={false} />
        </mesh>
      ))}
      {dragPath && dragPath.length > 0 && phase === 'aim' && (
        <mesh
          rotation={[-Math.PI / 2, 0, 0]}
          position={[dragPath[dragPath.length - 1][0], 0.035, dragPath[dragPath.length - 1][1]]}
        >
          <ringGeometry args={[0.45, 0.6, 24]} />
          <meshBasicMaterial color={ACCENT} transparent opacity={0.9} depthWrite={false} />
        </mesh>
      )}
    </group>
  );
}

export function ScoreGoals3D(props: ScoreGoalsViewProps) {
  const [dragPath, setDragPath] = useState<[number, number][] | null>(null);
  const pathRef = useRef<[number, number][] | null>(null);
  const downTimeRef = useRef(0);
  const { phase, onAim, goal, stepIndex } = props;
  const step = goal.steps[stepIndex];

  const setPath = (p: [number, number][] | null) => {
    pathRef.current = p;
    setDragPath(p);
  };
  const handleDown = (e: ThreeEvent<PointerEvent>) => {
    if (phase !== 'aim') return;
    (e.target as Element & { setPointerCapture?: (id: number) => void }).setPointerCapture?.(
      e.pointerId,
    );
    downTimeRef.current = performance.now();
    setPath([[e.point.x, e.point.z]]);
  };
  const handleMove = (e: ThreeEvent<PointerEvent>) => {
    if (phase !== 'aim' || !pathRef.current) return;
    const path = pathRef.current;
    const last = path[path.length - 1];
    const pt: [number, number] = [e.point.x, e.point.z];
    if (Math.hypot(pt[0] - last[0], pt[1] - last[1]) < 0.45) return;
    setPath([...path.slice(-63), pt]);
  };
  const handleUp = () => {
    if (phase !== 'aim' || !pathRef.current) return;
    const path = pathRef.current;
    setPath(null);
    const aim = path[path.length - 1];
    if (!aim || Math.hypot(aim[0] - step.from[0], aim[1] - step.from[1]) < 1.5) return;
    onAim(aim, drawnCurveOf(path), performance.now() - downTimeRef.current);
  };

  return (
    <div className="absolute inset-0 touch-none">
      <Canvas
        dpr={[1, 2]}
        camera={{ position: [0, 8, goal.depth + 14], fov: 44, near: 0.1, far: 240 }}
      >
        <color attach="background" args={['#07130b']} />
        <Scene {...props} dragPath={dragPath} />
        <mesh
          rotation={[-Math.PI / 2, 0, 0]}
          position={[0, 0.001, 25]}
          onPointerDown={handleDown}
          onPointerMove={handleMove}
          onPointerUp={handleUp}
          onPointerLeave={() => setPath(null)}
        >
          <planeGeometry args={[130, 150]} />
          <meshBasicMaterial transparent opacity={0} depthWrite={false} />
        </mesh>
      </Canvas>
    </div>
  );
}
