'use client';

/**
 * FINAL THIRD — three.js free-kick scene (drop-in replacement for the 2D
 * FinalThirdGoal, same props). Behind-the-ball free-kick camera: striped
 * pitch, goal with sagging net, articulated low-poly footballers — a shooter
 * who runs up and strikes the ball, a keeper in a ready crouch who dives
 * (right way on saves, wrong way on goals), and a three-man wall that jumps
 * as the ball clears it. All geometry is primitives + generated canvas
 * textures — no external model assets.
 *
 * Timeline (seconds after the shot is picked): 0–0.45 run-up · 0.45 strike &
 * ball launch · ~1.25 ball arrives. The parent resolves the outcome at 1.35s.
 */

import { useMemo, useRef, useState, type RefObject } from 'react';
import { Canvas, useFrame, type ThreeEvent } from '@react-three/fiber';
import * as THREE from 'three';

interface Zone {
  id: string;
  x: number;
  y: number;
}

/** Goal-mouth coordinates in metres (goal is 7.32 x 2.44, centred on x=0). */
const ZONE_POS: Record<string, [number, number]> = {
  TL: [-2.45, 1.8],
  TC: [0, 1.9],
  TR: [2.45, 1.8],
  BL: [-2.45, 0.65],
  BC: [0, 0.55],
  BR: [2.45, 0.65],
};

const BALL_SPOT = new THREE.Vector3(0, 0.11, 9);
const KICK_LEAD_S = 0.45;
const FLIGHT_S = 0.78;
const SKIN = '#c9955c';

function zoneVec(id: string): THREE.Vector3 {
  const [x, y] = ZONE_POS[id] ?? [0, 1];
  return new THREE.Vector3(x, y, 0.15);
}

/* ── generated textures ─────────────────────────────────────────────── */

function useGrassTexture(): THREE.Texture {
  return useMemo(() => {
    const c = document.createElement('canvas');
    c.width = 512;
    c.height = 512;
    const g = c.getContext('2d')!;
    for (let i = 0; i < 8; i += 1) {
      g.fillStyle = i % 2 ? '#1c6b23' : '#20791f';
      g.fillRect(0, (512 / 8) * i, 512, 512 / 8);
    }
    let s = 42;
    const rnd = () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296);
    for (let i = 0; i < 2200; i += 1) {
      g.fillStyle = `rgba(0,0,0,${rnd() * 0.05})`;
      g.fillRect(rnd() * 512, rnd() * 512, 2, 2);
    }
    const tex = new THREE.CanvasTexture(c);
    tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
    tex.repeat.set(2, 3);
    tex.anisotropy = 4;
    return tex;
  }, []);
}

function useNetTexture(): THREE.Texture {
  return useMemo(() => {
    const c = document.createElement('canvas');
    c.width = 256;
    c.height = 256;
    const g = c.getContext('2d')!;
    g.clearRect(0, 0, 256, 256);
    g.strokeStyle = 'rgba(255,255,255,0.85)';
    g.lineWidth = 2;
    for (let i = 0; i <= 256; i += 16) {
      g.beginPath(); g.moveTo(i, 0); g.lineTo(i, 256); g.stroke();
      g.beginPath(); g.moveTo(0, i); g.lineTo(256, i); g.stroke();
    }
    const tex = new THREE.CanvasTexture(c);
    tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
    return tex;
  }, []);
}

function useBallTexture(): THREE.Texture {
  return useMemo(() => {
    const c = document.createElement('canvas');
    c.width = 256;
    c.height = 128;
    const g = c.getContext('2d')!;
    g.fillStyle = '#f4f4f4';
    g.fillRect(0, 0, 256, 128);
    g.fillStyle = '#111';
    for (let i = 0; i < 12; i += 1) {
      const x = (i % 4) * 64 + 32 + (i % 2) * 10;
      const y = Math.floor(i / 4) * 42 + 22;
      g.beginPath();
      for (let k = 0; k < 5; k += 1) {
        const a = (k / 5) * Math.PI * 2 - Math.PI / 2;
        const px = x + Math.cos(a) * 13;
        const py = y + Math.sin(a) * 13;
        if (k === 0) g.moveTo(px, py);
        else g.lineTo(px, py);
      }
      g.closePath();
      g.fill();
    }
    return new THREE.CanvasTexture(c);
  }, []);
}

/* ── articulated player rig ─────────────────────────────────────────────
 * Joints are named groups; characters resolve them once via getObjectByName
 * inside useFrame and animate imperatively (React never re-renders the rig).
 */

const JOINT_NAMES = ['hipL', 'hipR', 'kneeL', 'kneeR', 'shoL', 'shoR', 'elbL', 'elbR', 'torso'] as const;
type JointName = (typeof JOINT_NAMES)[number];
type JointMap = Partial<Record<JointName, THREE.Object3D>>;

function resolveJoints(root: THREE.Group): JointMap {
  const out: JointMap = {};
  for (const n of JOINT_NAMES) out[n] = root.getObjectByName(n) ?? undefined;
  return out;
}

function Leg({ side, x, boot }: { side: 'L' | 'R'; x: number; boot: string }) {
  return (
    <group name={`hip${side}`} position={[x, 0.86, 0]}>
      <mesh position={[0, -0.17, 0]}>
        <capsuleGeometry args={[0.072, 0.28, 4, 8]} />
        <meshStandardMaterial color="#eaeaea" />
      </mesh>
      <group name={`knee${side}`} position={[0, -0.36, 0]}>
        <mesh position={[0, -0.14, 0]}>
          <capsuleGeometry args={[0.06, 0.24, 4, 8]} />
          <meshStandardMaterial color="#f5f5f5" />
        </mesh>
        <mesh position={[0, -0.31, 0.05]}>
          <boxGeometry args={[0.12, 0.09, 0.26]} />
          <meshStandardMaterial color={boot} />
        </mesh>
      </group>
    </group>
  );
}

function Arm({ side, x, kit, hand }: { side: 'L' | 'R'; x: number; kit: string; hand: string }) {
  return (
    <group name={`sho${side}`} position={[x, 0.38, 0]}>
      <mesh position={[0, -0.13, 0]}>
        <capsuleGeometry args={[0.055, 0.2, 4, 8]} />
        <meshStandardMaterial color={kit} />
      </mesh>
      <group name={`elb${side}`} position={[0, -0.27, 0]}>
        <mesh position={[0, -0.11, 0]}>
          <capsuleGeometry args={[0.05, 0.18, 4, 8]} />
          <meshStandardMaterial color={SKIN} />
        </mesh>
        <mesh position={[0, -0.25, 0]}>
          <sphereGeometry args={[0.062, 10, 10]} />
          <meshStandardMaterial color={hand} />
        </mesh>
      </group>
    </group>
  );
}

function PlayerRig({
  kit,
  shorts,
  hand = SKIN,
  boot = '#16181c',
  hair = '#1b120c',
}: {
  kit: string;
  shorts: string;
  hand?: string;
  boot?: string;
  hair?: string;
}) {
  return (
    <>
      <Leg side="L" x={-0.1} boot={boot} />
      <Leg side="R" x={0.1} boot={boot} />
      <group name="torso" position={[0, 1.02, 0]}>
        {/* shorts */}
        <mesh position={[0, -0.08, 0]}>
          <boxGeometry args={[0.31, 0.18, 0.2]} />
          <meshStandardMaterial color={shorts} />
        </mesh>
        {/* shirt */}
        <mesh position={[0, 0.18, 0]}>
          <capsuleGeometry args={[0.165, 0.34, 4, 10]} />
          <meshStandardMaterial color={kit} />
        </mesh>
        <Arm side="L" x={-0.24} kit={kit} hand={hand} />
        <Arm side="R" x={0.24} kit={kit} hand={hand} />
        {/* head + hair */}
        <mesh position={[0, 0.62, 0]}>
          <sphereGeometry args={[0.145, 14, 14]} />
          <meshStandardMaterial color={SKIN} />
        </mesh>
        <mesh position={[0, 0.7, -0.02]} scale={[1, 0.62, 1]}>
          <sphereGeometry args={[0.15, 14, 14]} />
          <meshStandardMaterial color={hair} />
        </mesh>
      </group>
    </>
  );
}

/* ── shared kick timeline ───────────────────────────────────────────── */

interface Timeline {
  /** clock time when the shot was picked (resolving started); null idle */
  start: number | null;
}

const lerp = THREE.MathUtils.lerp;
const clamp01 = (v: number) => Math.min(1, Math.max(0, v));

/* ── characters ─────────────────────────────────────────────────────── */

function Shooter({ tl, settled, scored }: { tl: RefObject<Timeline>; settled: boolean; scored: boolean | null }) {
  const root = useRef<THREE.Group>(null);
  const joints = useRef<JointMap | null>(null);
  useFrame((state) => {
    const r = root.current;
    if (!r) return;
    if (!joints.current) joints.current = resolveJoints(r);
    const j = joints.current;
    const now = state.clock.elapsedTime;
    const start = tl.current?.start ?? null;
    const idleStart = new THREE.Vector3(-0.72, 0, 10.45);
    const strikePos = new THREE.Vector3(-0.16, 0, 9.42);

    const set = (o: THREE.Object3D | undefined, x: number, y = 0, z = 0) => {
      o?.rotation.set(x, y, z);
    };

    if (start == null) {
      // idle behind the ball: breathing + micro weight shift
      const t = now;
      r.position.copy(idleStart);
      r.position.y = Math.sin(t * 2.1) * 0.012;
      r.rotation.set(0, 0.12, 0);
      set(j.hipL, Math.sin(t * 2.1) * 0.04);
      set(j.hipR, -Math.sin(t * 2.1) * 0.04);
      set(j.kneeL, 0.06);
      set(j.kneeR, 0.06);
      set(j.shoL, Math.sin(t * 2.1) * 0.06, 0, 0.1);
      set(j.shoR, -Math.sin(t * 2.1) * 0.06, 0, -0.1);
      set(j.elbL, -0.35);
      set(j.elbR, -0.35);
      set(j.torso, 0.03);
      return;
    }

    const ph = now - start;
    if (!settled) {
      if (ph < KICK_LEAD_S - 0.12) {
        // run-up: three quick strides
        const t = ph / (KICK_LEAD_S - 0.12);
        r.position.lerpVectors(idleStart, strikePos, t);
        r.position.y = Math.abs(Math.sin(t * Math.PI * 3)) * 0.06;
        r.rotation.set(0, 0.1, 0);
        const swing = Math.sin(t * Math.PI * 6);
        set(j.hipL, swing * 0.85);
        set(j.hipR, -swing * 0.85);
        set(j.kneeL, Math.max(0, -swing) * 1.1 + 0.15);
        set(j.kneeR, Math.max(0, swing) * 1.1 + 0.15);
        set(j.shoL, -swing * 0.7);
        set(j.shoR, swing * 0.7);
        set(j.elbL, -0.5);
        set(j.elbR, -0.5);
        set(j.torso, 0.12);
      } else {
        // plant + strike + follow-through
        const t = clamp01((ph - (KICK_LEAD_S - 0.12)) / 0.28);
        r.position.copy(strikePos);
        r.rotation.set(0, 0.08, -t * 0.12);
        const kick = t < 0.4 ? lerp(1.15, -1.5, t / 0.4) : lerp(-1.5, -0.7, (t - 0.4) / 0.6);
        set(j.hipR, kick);
        set(j.kneeR, t < 0.4 ? 1.3 - t * 2.4 : 0.25);
        set(j.hipL, -0.28);
        set(j.kneeL, 0.35);
        set(j.shoL, 0.9, 0, 0.5);
        set(j.shoR, -0.7, 0, -0.35);
        set(j.elbL, -0.4);
        set(j.elbR, -0.5);
        set(j.torso, -0.06, 0, -0.15);
      }
      return;
    }

    // outcome poses
    r.position.copy(strikePos);
    if (scored) {
      const t = now * 6;
      r.position.y = Math.abs(Math.sin(t)) * 0.09;
      r.rotation.set(0, 0.05, 0);
      set(j.shoL, 0, 0, 2.5);
      set(j.shoR, 0, 0, -2.5);
      set(j.elbL, -0.25);
      set(j.elbR, -0.25);
      set(j.hipL, 0);
      set(j.hipR, 0);
      set(j.kneeL, 0.1);
      set(j.kneeR, 0.1);
      set(j.torso, -0.08);
    } else {
      // hands on head
      r.rotation.set(0, 0.05, 0);
      set(j.shoL, -2.5, 0, 0.6);
      set(j.shoR, -2.5, 0, -0.6);
      set(j.elbL, -1.7);
      set(j.elbR, -1.7);
      set(j.hipL, 0);
      set(j.hipR, 0);
      set(j.kneeL, 0.12);
      set(j.kneeR, 0.12);
      set(j.torso, 0.15);
    }
  });
  return (
    <group ref={root} position={[-0.72, 0, 10.45]}>
      <PlayerRig kit="#FFE500" shorts="#12233f" hair="#2a1a10" />
    </group>
  );
}

function KeeperPlayer({ tl, shotZone, willSave }: { tl: RefObject<Timeline>; shotZone: Zone | null; willSave: boolean }) {
  const root = useRef<THREE.Group>(null);
  const joints = useRef<JointMap | null>(null);
  const dive = useRef(0);
  useFrame((state, delta) => {
    const r = root.current;
    if (!r) return;
    if (!joints.current) joints.current = resolveJoints(r);
    const j = joints.current;
    const now = state.clock.elapsedTime;
    const start = tl.current?.start ?? null;
    const set = (o: THREE.Object3D | undefined, x: number, y = 0, z = 0) => o?.rotation.set(x, y, z);

    const launched = start != null && now - start >= KICK_LEAD_S + 0.08;
    if (start == null) dive.current = 0;
    else if (launched) dive.current = Math.min(1, dive.current + delta / 0.24);

    const d = dive.current;
    if (d === 0) {
      // ready crouch on the line
      const sway = Math.sin(now * 1.9) * 0.16;
      r.position.set(sway, -0.12, 0.5);
      r.rotation.set(0, 0, 0);
      set(j.hipL, -0.55);
      set(j.hipR, -0.55);
      set(j.kneeL, 0.95);
      set(j.kneeR, 0.95);
      set(j.shoL, -0.5, 0, 0.85);
      set(j.shoR, -0.5, 0, -0.85);
      set(j.elbL, -0.7);
      set(j.elbR, -0.7);
      set(j.torso, 0.32);
      return;
    }

    const target = shotZone ? zoneVec(shotZone.id) : new THREE.Vector3(0, 1, 0);
    const to = willSave
      ? target
      : new THREE.Vector3(-(target.x || 1.7) * 0.8, Math.max(0.9, target.y), 0);
    const lean = to.x < 0 ? 1.35 : -1.35;
    r.position.set(lerp(0, to.x * 0.9, d), lerp(-0.12, Math.max(0.1, to.y - 0.85), d), 0.5);
    r.rotation.set(0, 0, lerp(0, lean, d));
    // arms extended toward the corner, legs trailing
    set(j.shoL, 0, 0, lerp(0.85, 2.5, d));
    set(j.shoR, 0, 0, lerp(-0.85, -2.5, d));
    set(j.elbL, lerp(-0.7, -0.1, d));
    set(j.elbR, lerp(-0.7, -0.1, d));
    set(j.hipL, lerp(-0.55, -0.15, d));
    set(j.hipR, lerp(-0.55, 0.35, d));
    set(j.kneeL, lerp(0.95, 0.3, d));
    set(j.kneeR, lerp(0.95, 0.15, d));
    set(j.torso, lerp(0.32, 0.05, d));
  });
  return (
    <group ref={root} position={[0, -0.12, 0.5]}>
      <PlayerRig kit="#58CC02" shorts="#0c1a12" hand="#e8ffe0" hair="#3a2c14" />
    </group>
  );
}

function WallGuy({ tl, x, delay }: { tl: RefObject<Timeline>; x: number; delay: number }) {
  const root = useRef<THREE.Group>(null);
  const joints = useRef<JointMap | null>(null);
  useFrame((state) => {
    const r = root.current;
    if (!r) return;
    if (!joints.current) joints.current = resolveJoints(r);
    const j = joints.current;
    const now = state.clock.elapsedTime;
    const start = tl.current?.start ?? null;
    const set = (o: THREE.Object3D | undefined, rx: number, ry = 0, rz = 0) => o?.rotation.set(rx, ry, rz);

    // arms crossed low, protective stance
    set(j.shoL, -0.45, 0, 0.5);
    set(j.shoR, -0.45, 0, -0.5);
    set(j.elbL, -1.9);
    set(j.elbR, -1.9);
    set(j.torso, 0.08);

    const jumpAt = start != null ? start + KICK_LEAD_S + delay : null;
    if (jumpAt != null && now >= jumpAt) {
      const t = clamp01((now - jumpAt) / 0.5);
      const y = Math.sin(t * Math.PI) * 0.5;
      r.position.set(x, y, 4.5);
      const tuck = Math.sin(t * Math.PI) * 1.15;
      set(j.hipL, -tuck);
      set(j.hipR, -tuck);
      set(j.kneeL, tuck * 1.2);
      set(j.kneeR, tuck * 1.2);
    } else {
      const bob = Math.sin(now * 2 + x * 3) * 0.01;
      r.position.set(x, bob, 4.5);
      set(j.hipL, 0);
      set(j.hipR, 0);
      set(j.kneeL, 0.08);
      set(j.kneeR, 0.08);
    }
  });
  return (
    <group ref={root} position={[x, 0, 4.5]}>
      <PlayerRig kit="#1645FF" shorts="#ffffff" hair="#14100a" />
    </group>
  );
}

/* ── scene ──────────────────────────────────────────────────────────── */

interface SceneProps {
  picking: boolean;
  revealedSave: string | null;
  shotZone: Zone | null;
  resolving: boolean;
  settled: boolean;
  scored: boolean | null;
  onPick: (z: Zone) => void;
  zones: Zone[];
}

function Scene({ picking, revealedSave, shotZone, resolving, settled, scored, onPick, zones }: SceneProps) {
  const grass = useGrassTexture();
  const net = useNetTexture();
  const ballTex = useBallTexture();
  const ball = useRef<THREE.Mesh>(null);
  const netRef = useRef<THREE.Mesh>(null);
  const [hover, setHover] = useState<string | null>(null);
  const tl = useRef<Timeline>({ start: null });
  const isSave = settled && scored === false;

  useFrame((state, delta) => {
    const now = state.clock.elapsedTime;
    if ((resolving || settled) && shotZone) {
      if (tl.current.start == null) tl.current.start = now;
    } else if (!shotZone) {
      tl.current.start = null;
    }

    const b = ball.current;
    if (!b) return;

    const start = tl.current.start;
    if (start == null || !shotZone) {
      b.position.set(BALL_SPOT.x, BALL_SPOT.y, BALL_SPOT.z);
      b.rotation.x += delta * 0.4;
      return;
    }

    const launch = start + KICK_LEAD_S;
    const dest = zoneVec(shotZone.id);
    const t = clamp01((now - launch) / FLIGHT_S);
    if (now < launch) {
      b.position.copy(BALL_SPOT);
    } else if (t >= 1 && isSave) {
      b.position.set(dest.x * 0.45, 0.11, 2.6);
    } else if (t >= 1 && settled && scored) {
      b.position.set(dest.x, Math.max(0.12, dest.y - 0.22), -0.6);
    } else {
      const curl = shotZone.x === 50 ? 0 : shotZone.x < 50 ? 1.5 : -1.5;
      const ctrl = new THREE.Vector3(dest.x * 0.35 + curl, Math.max(dest.y, 1.6) + 1.1, BALL_SPOT.z * 0.45);
      const p01 = BALL_SPOT.clone().lerp(ctrl, t);
      const p12 = ctrl.clone().lerp(dest, t);
      b.position.copy(p01.lerp(p12, t));
      b.rotation.x -= delta * 16;
    }

    // net wobble for ~0.8s after a goal lands
    if (netRef.current) {
      const after = now - launch - FLIGHT_S;
      const amp = settled && scored && after > 0 ? Math.max(0, 0.05 - after * 0.06) : 0;
      netRef.current.position.z = -0.95 - Math.sin(now * 24) * amp * 6;
    }
  });

  return (
    <>
      <hemisphereLight args={['#dceeff', '#2a5a2e', 1.15]} />
      <directionalLight position={[6, 12, 10]} intensity={1.9} color="#fff6df" />
      <directionalLight position={[-8, 10, 6]} intensity={0.85} color="#dfeaff" />

      {/* Pitch */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 4]}>
        <planeGeometry args={[34, 30]} />
        <meshStandardMaterial map={grass} />
      </mesh>
      {[
        { pos: [0, 0.005, 5.5] as const, size: [11, 0.09] as const, rot: 0 },
        { pos: [-5.5, 0.005, 2.75] as const, size: [5.6, 0.09] as const, rot: Math.PI / 2 },
        { pos: [5.5, 0.005, 2.75] as const, size: [5.6, 0.09] as const, rot: Math.PI / 2 },
        { pos: [0, 0.005, 0.02] as const, size: [22, 0.1] as const, rot: 0 },
      ].map((l, i) => (
        <mesh key={i} rotation={[-Math.PI / 2, 0, l.rot]} position={[l.pos[0], l.pos[1], l.pos[2]]}>
          <planeGeometry args={[l.size[0], l.size[1]]} />
          <meshBasicMaterial color="#ffffff" transparent opacity={0.65} />
        </mesh>
      ))}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.006, 9]}>
        <circleGeometry args={[0.09, 16]} />
        <meshBasicMaterial color="#ffffff" transparent opacity={0.8} />
      </mesh>

      {/* Goal frame */}
      {[-3.72, 3.72].map((x) => (
        <mesh key={x} position={[x, 1.28, 0]}>
          <cylinderGeometry args={[0.06, 0.06, 2.56, 12]} />
          <meshStandardMaterial color="#f5f5f5" metalness={0.35} roughness={0.35} />
        </mesh>
      ))}
      <mesh position={[0, 2.5, 0]} rotation={[0, 0, Math.PI / 2]}>
        <cylinderGeometry args={[0.06, 0.06, 7.56, 12]} />
        <meshStandardMaterial color="#f5f5f5" metalness={0.35} roughness={0.35} />
      </mesh>
      {/* Net */}
      <mesh ref={netRef} position={[0, 1.22, -0.95]}>
        <planeGeometry args={[7.44, 2.44]} />
        <meshBasicMaterial map={net} transparent opacity={0.55} side={THREE.DoubleSide} depthWrite={false} />
      </mesh>
      <mesh position={[0, 2.48, -0.48]} rotation={[-Math.PI / 2.35, 0, 0]}>
        <planeGeometry args={[7.44, 1.1]} />
        <meshBasicMaterial map={net} transparent opacity={0.45} side={THREE.DoubleSide} depthWrite={false} />
      </mesh>
      {[-3.7, 3.7].map((x) => (
        <mesh key={`side-${x}`} position={[x, 1.22, -0.48]} rotation={[0, Math.PI / 2, 0]}>
          <planeGeometry args={[1, 2.44]} />
          <meshBasicMaterial map={net} transparent opacity={0.45} side={THREE.DoubleSide} depthWrite={false} />
        </mesh>
      ))}

      {/* Stadium backdrop */}
      <mesh position={[0, 5.5, -14]}>
        <planeGeometry args={[70, 16]} />
        <meshBasicMaterial color="#0a0f1c" />
      </mesh>
      <mesh position={[0, 9.4, -13.8]}>
        <planeGeometry args={[70, 5]} />
        <meshBasicMaterial color="#131a2c" />
      </mesh>

      {/* Players */}
      <group position={[-2.35, 0, 0]}><WallGuy tl={tl} x={0} delay={0} /></group>
      <group position={[-1.72, 0, 0]}><WallGuy tl={tl} x={0} delay={0.04} /></group>
      <group position={[-1.1, 0, 0]}><WallGuy tl={tl} x={0} delay={0.08} /></group>
      <KeeperPlayer tl={tl} shotZone={shotZone} willSave={isSave} />
      <Shooter tl={tl} settled={settled} scored={scored} />

      {/* Zones */}
      {zones.map((z) => {
        const [x, y] = ZONE_POS[z.id];
        const locked = z.id === revealedSave;
        if (!picking && !locked) return null;
        const isHover = hover === z.id && !locked;
        return (
          <group key={z.id} position={[x, y, 0.3]}>
            <mesh
              onClick={(e: ThreeEvent<MouseEvent>) => {
                e.stopPropagation();
                if (!locked && picking) onPick(z);
              }}
              onPointerOver={() => { if (!locked && picking) { setHover(z.id); document.body.style.cursor = 'pointer'; } }}
              onPointerOut={() => { setHover(null); document.body.style.cursor = 'auto'; }}
            >
              <circleGeometry args={[0.42, 24]} />
              <meshBasicMaterial
                color={locked ? '#FF4B4B' : isHover ? '#FFE500' : '#ffffff'}
                transparent
                opacity={locked ? 0.3 : isHover ? 0.35 : 0.14}
                depthWrite={false}
              />
            </mesh>
            <mesh>
              <ringGeometry args={[0.38, 0.44, 24]} />
              <meshBasicMaterial color={locked ? '#FF4B4B' : isHover ? '#FFE500' : '#ffffff'} transparent opacity={locked ? 0.9 : 0.75} depthWrite={false} />
            </mesh>
            {locked && (
              <>
                <mesh rotation={[0, 0, Math.PI / 4]}>
                  <planeGeometry args={[0.55, 0.09]} />
                  <meshBasicMaterial color="#FF4B4B" transparent opacity={0.95} depthWrite={false} />
                </mesh>
                <mesh rotation={[0, 0, -Math.PI / 4]}>
                  <planeGeometry args={[0.55, 0.09]} />
                  <meshBasicMaterial color="#FF4B4B" transparent opacity={0.95} depthWrite={false} />
                </mesh>
              </>
            )}
          </group>
        );
      })}

      {/* Ball + shadow blob */}
      <mesh ref={ball} position={BALL_SPOT.toArray()}>
        <sphereGeometry args={[0.13, 20, 20]} />
        <meshStandardMaterial map={ballTex} roughness={0.4} />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.004, 9]}>
        <circleGeometry args={[0.16, 16]} />
        <meshBasicMaterial color="#000000" transparent opacity={0.35} />
      </mesh>
    </>
  );
}

export function FinalThirdPitch3D({
  picking,
  revealedSave,
  scouting,
  shotZone,
  resolving,
  settled,
  scored,
  onPick,
}: {
  picking: boolean;
  revealedSave: string | null;
  scouting: boolean;
  shotZone: Zone | null;
  resolving: boolean;
  settled: boolean;
  scored: boolean | null;
  onPick: (z: Zone) => void;
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
    <div className="relative mx-auto aspect-[16/10] w-full overflow-hidden rounded-[24px] border border-white/10 bg-[#0a1420]">
      <Canvas
        dpr={[1, 2]}
        camera={{ position: [1.2, 2.2, 13.6], fov: 50, near: 0.1, far: 80 }}
        gl={{ antialias: true, alpha: false }}
        onCreated={({ camera }) => camera.lookAt(-0.2, 1.05, 0)}
      >
        <color attach="background" args={['#0a1420']} />
        <fog attach="fog" args={['#0a1420', 22, 46]} />
        <Scene
          picking={picking}
          revealedSave={revealedSave}
          shotZone={shotZone}
          resolving={resolving}
          settled={settled}
          scored={scored}
          onPick={onPick}
          zones={zones}
        />
      </Canvas>

      {/* DOM overlays: VAR sweep + outcome washes (same language as 2D). */}
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
          className="pointer-events-none absolute inset-0"
          style={{ background: 'radial-gradient(circle at 50% 42%, rgba(88,204,2,0.4), transparent 62%)' }}
        />
      )}
      {showSaveFx && (
        <div
          className="pointer-events-none absolute inset-0"
          style={{ background: 'radial-gradient(circle at 50% 42%, rgba(255,75,75,0.35), transparent 62%)' }}
        />
      )}
      <style>{`@keyframes ft3d-sweep { from { left: -12%; opacity: 0; } 30% { opacity: 0.9; } to { left: 104%; opacity: 0; } }`}</style>
    </div>
  );
}
