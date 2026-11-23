'use client';

/**
 * The ორშაბათობა set, after the show's main camera: walnut slat walls with a
 * warm LED band under the shelves, the dark plaster panel with yellow
 * backlit edges and the neon sign, the curved desk with its turf inlay, and
 * the props the regulars know (crisps, the signed glove, the award plaque,
 * the KALATOZI 7 / TATO 10 print, the cans, the mug
 * and the helmeted rubber duck).
 */

import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import {
  DESK,
  SEATED_HEAD_Y,
  SEATS,
  STUDIO_COLORS,
  WALL,
  deskArcPoint,
  type HostId,
  type HostSeat,
} from './studioLayout';
import {
  canTexture,
  concreteTexture,
  crispBagTexture,
  lidTexture,
  neonSignTexture,
  plaqueTexture,
  posterTexture,
  printTexture,
  turfTexture,
  woodTexture,
} from './studioTextures';

type Vec3 = readonly [number, number, number];

const UP = new THREE.Vector3(0, 1, 0);

/** A cylinder spanning two points. */
function Rod({ from, to, radius, color }: { from: Vec3; to: Vec3; radius: number; color: string }) {
  const { position, quaternion, length } = useMemo(() => {
    const a = new THREE.Vector3(...from);
    const b = new THREE.Vector3(...to);
    const dir = b.clone().sub(a);
    return {
      position: a.clone().add(b).multiplyScalar(0.5),
      quaternion: new THREE.Quaternion().setFromUnitVectors(UP, dir.clone().normalize()),
      length: dir.length(),
    };
  }, [from, to]);
  return (
    <mesh position={position} quaternion={quaternion} castShadow>
      <cylinderGeometry args={[radius, radius, length, 12]} />
      <meshStandardMaterial color={color} roughness={0.45} metalness={0.6} />
    </mesh>
  );
}

function seatFrame(seat: HostSeat) {
  const p = new THREE.Vector3(...seat.position);
  const fwd = new THREE.Vector3(Math.sin(seat.yaw), 0, Math.cos(seat.yaw));
  const out = new THREE.Vector3(seat.side, 0, 0);
  return { p, fwd, out };
}

const toVec3 = (v: THREE.Vector3): Vec3 => [v.x, v.y, v.z];

// ── Walls ────────────────────────────────────────────────────────────────

const SLAT_W = 0.046;
const SLAT_PITCH = 0.068;
const SLAT_D = 0.034;

function slatXs() {
  const xs: number[] = [];
  for (let x = WALL.panelHalfWidth + 0.06; x < WALL.halfWidth; x += SLAT_PITCH) xs.push(x, -x);
  return xs;
}

function Slats({ y0, y1 }: { y0: number; y1: number }) {
  const ref = useRef<THREE.InstancedMesh>(null);
  const xs = useMemo(() => slatXs(), []);
  const material = useMemo(() => new THREE.MeshStandardMaterial({ map: woodTexture('slat'), roughness: 0.75 }), []);
  useLayoutEffect(() => {
    const mesh = ref.current;
    if (!mesh) return;
    const m = new THREE.Matrix4();
    xs.forEach((x, i) => {
      m.makeTranslation(x, (y0 + y1) / 2, WALL.z + SLAT_D / 2);
      mesh.setMatrixAt(i, m);
    });
    mesh.instanceMatrix.needsUpdate = true;
  }, [xs, y0, y1]);
  return (
    <instancedMesh ref={ref} args={[undefined, undefined, xs.length]} material={material} receiveShadow>
      <boxGeometry args={[SLAT_W, y1 - y0, SLAT_D]} />
    </instancedMesh>
  );
}

function SideWalls() {
  const sideWidth = WALL.halfWidth - WALL.panelHalfWidth;
  const sideX = WALL.panelHalfWidth + sideWidth / 2;
  return (
    <group>
      <mesh position={[0, WALL.height / 2, WALL.z - 0.01]} receiveShadow>
        <planeGeometry args={[WALL.halfWidth * 2, WALL.height]} />
        <meshStandardMaterial color={STUDIO_COLORS.slatBacking} roughness={1} />
      </mesh>
      <Slats y0={0} y1={WALL.shelfY} />
      <Slats y0={WALL.shelfY + 0.04} y1={WALL.height} />
      {[-1, 1].map((s) => (
        <mesh key={s} position={[s * sideX, WALL.shelfY + 0.02, WALL.z + WALL.shelfDepth / 2]} castShadow receiveShadow>
          <boxGeometry args={[sideWidth, 0.04, WALL.shelfDepth]} />
          <meshStandardMaterial color="#24170e" roughness={0.6} />
        </mesh>
      ))}
    </group>
  );
}

function NeonSign() {
  const [map, setMap] = useState<THREE.Texture | null>(null);
  useEffect(() => {
    let live = true;
    neonSignTexture().then((t) => live && setMap(t)).catch((e) => console.warn('[orshabatoba] sign', e));
    return () => {
      live = false;
    };
  }, []);
  if (!map) return null;
  return (
    <mesh position={[0, 2.12, WALL.panelZ + 0.065]}>
      <planeGeometry args={[2.04, 1.02]} />
      {/* Bright, but under the bloom threshold: the glyphs stay sharp and the halo is painted in. */}
      <meshBasicMaterial map={map} transparent depthWrite={false} color={new THREE.Color(1, 1, 1).multiplyScalar(1.5)} />
    </mesh>
  );
}

function CentrePanel() {
  return (
    <group>
      <mesh position={[0, WALL.height / 2, WALL.panelZ]} receiveShadow>
        <boxGeometry args={[WALL.panelHalfWidth * 2, WALL.height, 0.12]} />
        <meshStandardMaterial map={concreteTexture()} roughness={0.95} />
      </mesh>
      <NeonSign />
    </group>
  );
}

// ── Shelf and wall props ─────────────────────────────────────────────────

function PrintedBox({ size, map, position, rotation, color = '#e6e1d6' }: { size: Vec3; map: THREE.Texture; position: Vec3; rotation?: Vec3; color?: string }) {
  const materials = useMemo(() => {
    const plain = new THREE.MeshStandardMaterial({ color, roughness: 0.6 });
    const face = new THREE.MeshStandardMaterial({ map, roughness: 0.55 });
    return [plain, plain, plain, plain, face, plain];
  }, [map, color]);
  return (
    <mesh position={position} rotation={rotation} material={materials} castShadow>
      <boxGeometry args={size} />
    </mesh>
  );
}

function Glove({ position }: { position: Vec3 }) {
  const skin = '#f1dd96';
  const fingers = [-0.036, -0.012, 0.012, 0.036];
  return (
    <group position={position} rotation={[-0.08, 0.25, -0.12]}>
      <mesh position={[0, 0.03, 0]} castShadow>
        <cylinderGeometry args={[0.05, 0.055, 0.06, 16]} />
        <meshStandardMaterial color="#c8202a" roughness={0.6} />
      </mesh>
      <mesh position={[0, 0.13, 0]} castShadow>
        <boxGeometry args={[0.1, 0.13, 0.035]} />
        <meshStandardMaterial color={skin} roughness={0.8} />
      </mesh>
      {fingers.map((x, i) => (
        <mesh key={x} position={[x, 0.235 + (i === 1 || i === 2 ? 0.01 : 0), 0]} castShadow>
          <capsuleGeometry args={[0.012, 0.07, 4, 8]} />
          <meshStandardMaterial color={skin} roughness={0.8} />
        </mesh>
      ))}
      <mesh position={[0.065, 0.15, 0]} rotation={[0, 0, -0.7]} castShadow>
        <capsuleGeometry args={[0.013, 0.05, 4, 8]} />
        <meshStandardMaterial color={skin} roughness={0.8} />
      </mesh>
    </group>
  );
}

function ShelfProps() {
  const top = WALL.shelfY + 0.04;
  const z = WALL.z + 0.12;
  return (
    <group>
      <PrintedBox size={[0.3, 0.42, 0.01]} map={printTexture()} position={[-3.35, top + 0.21, z - 0.04]} rotation={[-0.12, 0.1, 0.02]} />
      <Glove position={[-2.95, top, z]} />
      <PrintedBox size={[0.32, 0.4, 0.025]} map={plaqueTexture()} position={[-2.48, top + 0.2, z - 0.03]} rotation={[-0.1, 0, 0]} />
      {[-1.78, -1.52, -1.26].map((x, i) => (
        <PrintedBox key={x} size={[0.21, 0.3, 0.07]} map={crispBagTexture(i)} position={[x, top + 0.15, z]} rotation={[-0.05, (i - 1) * 0.12, (i - 1) * -0.04]} color="#f3dc7a" />
      ))}

      {/* Right wall: the framed print. */}
      <group position={[2.5, 2.36, WALL.z + 0.04]}>
        <mesh castShadow>
          <boxGeometry args={[1.05, 1.32, 0.04]} />
          <meshStandardMaterial color="#111111" roughness={0.5} />
        </mesh>
        <mesh position={[0, 0, 0.021]}>
          <planeGeometry args={[0.97, 1.24]} />
          <meshStandardMaterial map={posterTexture()} roughness={0.7} />
        </mesh>
      </group>
    </group>
  );
}

// ── Desk ─────────────────────────────────────────────────────────────────

const TURF_INSET = 0.07;
/** The desk slab's bevel rises this far past its extrusion; the slab is lowered by it. */
const DESK_BEVEL = 0.008;
const TURF_DEPTH = 0.008;
const TURF_HALF_ANGLE = DESK.halfAngle * 0.9;
const TURF_MAX_WIDTH = 0.42;

/** Turf width at θ: full in the middle, tapering to a point at both ends. */
function turfWidth(theta: number) {
  const t = Math.min(1, Math.abs(theta) / TURF_HALF_ANGLE);
  return TURF_MAX_WIDTH * Math.sqrt(1 - t * t * t);
}

function arcShape(outer: (theta: number) => number, inner: (theta: number) => number, halfAngle: number, steps = 64) {
  const shape = new THREE.Shape();
  for (let i = 0; i <= steps; i++) {
    const theta = -halfAngle + (2 * halfAngle * i) / steps;
    const [x, z] = deskArcPoint(outer(theta), theta);
    if (i === 0) shape.moveTo(x, -z);
    else shape.lineTo(x, -z);
  }
  for (let i = steps; i >= 0; i--) {
    const theta = -halfAngle + (2 * halfAngle * i) / steps;
    const [x, z] = deskArcPoint(inner(theta), theta);
    shape.lineTo(x, -z);
  }
  shape.closePath();
  return shape;
}

function TurfBlades() {
  const ref = useRef<THREE.InstancedMesh>(null);
  const count = 22000;
  const geometry = useMemo(() => {
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute([-0.0018, 0, 0, 0.0018, 0, 0, 0, 0.01, 0], 3));
    g.computeVertexNormals();
    return g;
  }, []);
  useLayoutEffect(() => {
    const mesh = ref.current;
    if (!mesh) return;
    let seed = 7;
    const rand = () => {
      seed = (seed * 16807) % 2147483647;
      return seed / 2147483647;
    };
    const m = new THREE.Matrix4();
    const q = new THREE.Quaternion();
    const e = new THREE.Euler();
    const c = new THREE.Color();
    for (let i = 0; i < count; i++) {
      const theta = (rand() * 2 - 1) * TURF_HALF_ANGLE;
      const r = DESK.outerRadius - TURF_INSET - rand() * turfWidth(theta);
      const [x, z] = deskArcPoint(r, theta);
      e.set((rand() - 0.5) * 0.6, rand() * Math.PI, (rand() - 0.5) * 0.6);
      q.setFromEuler(e);
      const s = 0.7 + rand() * 0.6;
      m.compose(new THREE.Vector3(x, DESK.topY + TURF_DEPTH - 0.001, z), q, new THREE.Vector3(s, s, s));
      mesh.setMatrixAt(i, m);
      c.setHSL(0.27 + rand() * 0.04, 0.55, 0.14 + rand() * 0.1);
      mesh.setColorAt(i, c);
    }
    mesh.instanceMatrix.needsUpdate = true;
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
  }, []);
  return (
    <instancedMesh ref={ref} args={[geometry, undefined, count]}>
      <meshStandardMaterial side={THREE.DoubleSide} roughness={0.9} />
    </instancedMesh>
  );
}

function Desk() {
  const { top, turf, fasciaMap, topMap, turfMap } = useMemo(() => {
    const inner = DESK.outerRadius - DESK.depth;
    const topGeo = new THREE.ExtrudeGeometry(arcShape(() => DESK.outerRadius, () => inner, DESK.halfAngle), {
      depth: DESK.thickness,
      bevelEnabled: true,
      bevelThickness: DESK_BEVEL,
      bevelSize: 0.01,
      bevelSegments: 2,
    });
    topGeo.rotateX(-Math.PI / 2);
    const turfGeo = new THREE.ExtrudeGeometry(
      arcShape(
        () => DESK.outerRadius - TURF_INSET,
        (t) => DESK.outerRadius - TURF_INSET - Math.max(0.004, turfWidth(t)),
        TURF_HALF_ANGLE,
        96,
      ),
      { depth: TURF_DEPTH, bevelEnabled: false },
    );
    turfGeo.rotateX(-Math.PI / 2);
    const deskWood = woodTexture('desk');
    const topTex = deskWood.clone();
    topTex.repeat.set(0.6, 0.6);
    topTex.needsUpdate = true;
    const fascia = deskWood.clone();
    fascia.repeat.set(6, 0.5);
    fascia.needsUpdate = true;
    const turfTex = turfTexture().clone();
    turfTex.repeat.set(4, 4);
    turfTex.needsUpdate = true;
    return { top: topGeo, turf: turfGeo, fasciaMap: fascia, topMap: topTex, turfMap: turfTex };
  }, []);

  return (
    <group>
      <mesh geometry={top} position={[0, DESK.topY - DESK.thickness - DESK_BEVEL, 0]} castShadow receiveShadow>
        <meshStandardMaterial map={topMap} roughness={0.55} />
      </mesh>
      <mesh geometry={turf} position={[0, DESK.topY, 0]} receiveShadow>
        <meshStandardMaterial map={turfMap} color="#9cd47a" roughness={0.95} />
      </mesh>
      <TurfBlades />
      <mesh position={[0, (DESK.topY - DESK.thickness) / 2 + 0.03, DESK.centerZ]} receiveShadow>
        <cylinderGeometry
          args={[
            DESK.outerRadius - 0.06,
            DESK.outerRadius - 0.1,
            DESK.topY - DESK.thickness - 0.06,
            96,
            1,
            true,
            -DESK.halfAngle * 0.97,
            DESK.halfAngle * 1.94,
          ]}
        />
        <meshStandardMaterial map={fasciaMap} color="#8a6a50" roughness={0.6} side={THREE.DoubleSide} />
      </mesh>
    </group>
  );
}

// ── Per-host furniture: chair, mic on a boom arm, laptop ────────────────

function Chair({ seat }: { seat: HostSeat }) {
  return (
    <group position={seat.position} rotation={[0, seat.yaw, 0]}>
      <mesh position={[0, 0.46, -0.04]} castShadow receiveShadow>
        <boxGeometry args={[0.5, 0.07, 0.48]} />
        <meshStandardMaterial color={STUDIO_COLORS.chair} roughness={0.85} />
      </mesh>
      <mesh position={[0, 0.88, -0.3]} rotation={[-0.12, 0, 0]} castShadow>
        <boxGeometry args={[0.48, 0.62, 0.06]} />
        <meshStandardMaterial color={STUDIO_COLORS.chair} roughness={0.85} />
      </mesh>
      <mesh position={[0, 0.25, -0.04]}>
        <cylinderGeometry args={[0.025, 0.025, 0.36, 10]} />
        <meshStandardMaterial color="#1c1c1c" metalness={0.7} roughness={0.35} />
      </mesh>
      {[0, 1, 2, 3, 4].map((i) => (
        <mesh key={i} position={[Math.sin((i * 2 * Math.PI) / 5) * 0.16, 0.06, -0.04 + Math.cos((i * 2 * Math.PI) / 5) * 0.16]} rotation={[0, (i * 2 * Math.PI) / 5, 0]}>
          <boxGeometry args={[0.035, 0.03, 0.32]} />
          <meshStandardMaterial color="#1c1c1c" metalness={0.6} roughness={0.4} />
        </mesh>
      ))}
    </group>
  );
}

function MicRig({ seat }: { seat: HostSeat }) {
  const parts = useMemo(() => {
    const { p, fwd, out } = seatFrame(seat);
    const mouth = p.clone().add(new THREE.Vector3(0, SEATED_HEAD_Y + 0.02, 0)).addScaledVector(fwd, 0.1);
    // Just below and in front of the mouth, so the face stays readable on camera.
    const mic = mouth.clone().addScaledVector(fwd, 0.2).add(new THREE.Vector3(0, -0.1, 0));
    const aim = mouth.clone().sub(mic).normalize();
    const micBack = mic.clone().addScaledVector(aim, -0.1);
    const mount = micBack.clone().add(new THREE.Vector3(0, -0.03, 0));
    const elbow = mount.clone().addScaledVector(out, 0.34).add(new THREE.Vector3(0, 0.12, 0.16));
    const reach = elbow.clone().addScaledVector(out, 0.7).add(new THREE.Vector3(0, 0.95, 0.05));
    return {
      micPos: toVec3(mic),
      micQuat: new THREE.Quaternion().setFromUnitVectors(UP, aim),
      micBack: toVec3(micBack),
      mount: toVec3(mount),
      elbow: toVec3(elbow),
      reach: toVec3(reach),
    };
  }, [seat]);
  return (
    <group>
      <mesh position={parts.micPos} quaternion={parts.micQuat} castShadow>
        <cylinderGeometry args={[0.04, 0.036, 0.17, 20]} />
        <meshStandardMaterial color={STUDIO_COLORS.mic} roughness={0.75} />
      </mesh>
      <Rod from={parts.micBack} to={parts.mount} radius={0.008} color="#202020" />
      <Rod from={parts.mount} to={parts.elbow} radius={0.011} color="#181818" />
      <Rod from={parts.elbow} to={parts.reach} radius={0.011} color="#181818" />
    </group>
  );
}

/** Height of whatever is under (x, z): the desk top (with its turf) or the floor. */
function groundAt(x: number, z: number) {
  const dz = z - DESK.centerZ;
  const r = Math.hypot(x, dz);
  const onDesk = r <= DESK.outerRadius && r >= DESK.outerRadius - DESK.depth && Math.abs(Math.atan2(x, dz)) <= DESK.halfAngle;
  return onDesk ? DESK.topY + 0.008 : 0;
}

const GRAVITY = 9.8;
const KEYS = 16;
const SPARKS = 14;
/** Lid slams shut this fast, then the laptop leaves the desk. */
const LID_SLAM_S = 0.07;
/** World-space launch velocity (m/s): up and toward the camera. */
const LAUNCH = new THREE.Vector3(0.25, 2.5, 1.7);

interface Body {
  pos: THREE.Vector3;
  vel: THREE.Vector3;
  spin: THREE.Vector3;
  resting: boolean;
  bounces: number;
}

const scratch = new THREE.Vector3();
const spinQuat = new THREE.Quaternion();

/** Integrate one falling body in the laptop's frame (which is only yawed, so local y is world y). */
function stepBody(b: Body, obj: THREE.Object3D, frame: THREE.Object3D, dt: number, halfHeight: number, bounce: boolean) {
  if (b.resting) return;
  b.vel.y -= GRAVITY * dt;
  b.pos.addScaledVector(b.vel, dt);
  const angle = b.spin.length() * dt;
  if (angle > 0) obj.quaternion.premultiply(spinQuat.setFromAxisAngle(scratch.copy(b.spin).normalize(), angle));
  frame.localToWorld(scratch.copy(b.pos));
  const floor = groundAt(scratch.x, scratch.z) - frame.position.y + halfHeight;
  if (b.pos.y < floor && b.vel.y < 0) {
    b.pos.y = floor;
    if (bounce && b.bounces < 1) {
      b.bounces += 1;
      b.vel.set(b.vel.x * 0.45, -b.vel.y * 0.3, b.vel.z * 0.45);
      b.spin.multiplyScalar(0.35);
    } else {
      b.resting = true;
      b.vel.set(0, 0, 0);
      b.spin.set(0, 0, 0);
    }
  }
  obj.position.copy(b.pos);
}

/**
 * The host's laptop. `smash` (any new non-zero value) is the moment the fists
 * land: the lid slams shut, the laptop flips off the desk, keys scatter and
 * it sparks. Back to 0/undefined puts it back on the desk.
 */
function Laptop({ seat, lid, smash }: { seat: HostSeat; lid: 'black' | 'silver'; smash?: number }) {
  const { position, yaw } = useMemo(() => {
    const { p, fwd, out } = seatFrame(seat);
    const at = p.clone().addScaledVector(fwd, 0.62).addScaledVector(out, 0.12);
    return { position: [at.x, DESK.topY + 0.002, at.z] as Vec3, yaw: seat.yaw + Math.PI };
  }, [seat]);
  const materials = useMemo(() => {
    const body = new THREE.MeshStandardMaterial({ color: lid === 'black' ? '#151517' : '#bfc1c4', metalness: 0.6, roughness: 0.35 });
    const screen = new THREE.MeshStandardMaterial({ color: '#0b0f16', emissive: '#5d7aa6', emissiveIntensity: 0.25, roughness: 0.2 });
    const back = new THREE.MeshStandardMaterial({ map: lidTexture(lid), metalness: lid === 'silver' ? 0.5 : 0.2, roughness: 0.4 });
    const key = new THREE.MeshStandardMaterial({ color: '#1d1d20', roughness: 0.5 });
    const spark = new THREE.MeshBasicMaterial({ color: new THREE.Color('#ffd27a').multiplyScalar(4) });
    return { body, key, spark, lidFaces: [body, body, body, body, screen, back] };
  }, [lid]);

  const frameRef = useRef<THREE.Group>(null);
  const bodyRef = useRef<THREE.Group>(null);
  const hingeRef = useRef<THREE.Group>(null);
  const keysRef = useRef<THREE.Group>(null);
  const sparksRef = useRef<THREE.Group>(null);
  const sim = useRef<{ key: number; at: number; body: Body; keys: Body[]; sparks: { pos: THREE.Vector3; vel: THREE.Vector3; life: number }[] } | null>(null);

  useFrame((state, delta) => {
    const frame = frameRef.current;
    const body = bodyRef.current;
    const hinge = hingeRef.current;
    const keys = keysRef.current;
    const sparks = sparksRef.current;
    if (!frame || !body || !hinge || !keys || !sparks) return;
    const now = state.clock.elapsedTime;
    const dt = Math.min(delta, 1 / 30);

    if (!smash) {
      if (sim.current) {
        sim.current = null;
        body.position.set(0, 0, 0);
        body.quaternion.identity();
        hinge.rotation.set(-0.28, 0, 0);
        keys.visible = sparks.visible = false;
      }
      return;
    }
    if (sim.current?.key !== smash) {
      let seed = smash * 7919 + 13;
      const rand = () => {
        seed = (seed * 16807) % 2147483647;
        return seed / 2147483647;
      };
      sim.current = {
        key: smash,
        at: now,
        // Up and out over the front edge toward the camera, so it clears the
        // desk and lands on the floor (given in world axes, turned into the
        // laptop's yawed frame).
        body: { pos: new THREE.Vector3(), vel: LAUNCH.clone().applyAxisAngle(UP, -yaw), spin: new THREE.Vector3(7, 1.5, 4), resting: false, bounces: 0 },
        keys: Array.from({ length: KEYS }, () => ({
          pos: new THREE.Vector3((rand() - 0.5) * 0.28, 0.02, (rand() - 0.5) * 0.18),
          vel: new THREE.Vector3((rand() - 0.5) * 2.4, 1.2 + rand() * 1.6, -0.2 - rand() * 1.4),
          spin: new THREE.Vector3(rand() * 20, rand() * 20, rand() * 20),
          resting: false,
          bounces: 0,
        })),
        sparks: Array.from({ length: SPARKS }, () => ({
          pos: new THREE.Vector3((rand() - 0.5) * 0.2, 0.03, (rand() - 0.5) * 0.12),
          vel: new THREE.Vector3((rand() - 0.5) * 3.5, 1 + rand() * 2.5, (rand() - 0.5) * 3.5),
          life: 0.3 + rand() * 0.35,
        })),
      };
      keys.children.forEach((k, i) => {
        k.position.copy(sim.current!.keys[i].pos);
        k.quaternion.identity();
      });
      keys.visible = sparks.visible = true;
    }
    const s = sim.current;
    const t = now - s.at;
    if (t < LID_SLAM_S) {
      hinge.rotation.x = THREE.MathUtils.lerp(-0.28, 1.47, t / LID_SLAM_S);
      return;
    }
    hinge.rotation.x = 1.47;
    stepBody(s.body, body, frame, dt, 0.012, true);
    s.keys.forEach((k, i) => stepBody(k, keys.children[i], frame, dt, 0.003, false));
    s.sparks.forEach((p, i) => {
      const m = sparks.children[i];
      const age = t - LID_SLAM_S;
      if (age > p.life) {
        m.visible = false;
        return;
      }
      p.vel.y -= GRAVITY * dt;
      p.pos.addScaledVector(p.vel, dt);
      m.position.copy(p.pos);
      m.scale.setScalar(1 - age / p.life);
      m.visible = true;
    });
  });

  return (
    <group ref={frameRef} position={position} rotation={[0, yaw, 0]}>
      <group ref={bodyRef}>
        <mesh position={[0, 0.007, 0]} material={materials.body} castShadow>
          <boxGeometry args={[0.33, 0.014, 0.23]} />
        </mesh>
        <group ref={hingeRef} position={[0, 0.014, -0.115]} rotation={[-0.28, 0, 0]}>
          <mesh position={[0, 0.11, 0]} material={materials.lidFaces} castShadow>
            <boxGeometry args={[0.33, 0.22, 0.008]} />
          </mesh>
        </group>
      </group>
      <group ref={keysRef} visible={false}>
        {Array.from({ length: KEYS }, (_, i) => (
          <mesh key={i} material={materials.key} castShadow>
            <boxGeometry args={[0.018, 0.006, 0.018]} />
          </mesh>
        ))}
      </group>
      <group ref={sparksRef} visible={false}>
        {Array.from({ length: SPARKS }, (_, i) => (
          <mesh key={i} material={materials.spark}>
            <sphereGeometry args={[0.006, 6, 4]} />
          </mesh>
        ))}
      </group>
    </group>
  );
}

// ── Desk props ───────────────────────────────────────────────────────────

function Can({ position, kind }: { position: Vec3; kind: 'black' | 'blue' }) {
  const materials = useMemo(() => {
    const metal = new THREE.MeshStandardMaterial({ color: '#c9cbcf', metalness: 0.9, roughness: 0.3 });
    return [new THREE.MeshStandardMaterial({ map: canTexture(kind), metalness: 0.45, roughness: 0.35 }), metal, metal];
  }, [kind]);
  return (
    <mesh position={[position[0], position[1] + 0.084, position[2]]} rotation={[0, -Math.PI / 2 + (position[0] < 0 ? 0.35 : -0.35), 0]} material={materials} castShadow>
      <cylinderGeometry args={[0.033, 0.033, 0.168, 28]} />
    </mesh>
  );
}

function Mug({ position }: { position: Vec3 }) {
  const color = '#c7d22c';
  return (
    <group position={position} rotation={[0, -0.6, 0]}>
      <mesh position={[0, 0.048, 0]} castShadow>
        <cylinderGeometry args={[0.042, 0.04, 0.096, 28]} />
        <meshStandardMaterial color={color} roughness={0.35} />
      </mesh>
      <mesh position={[0.046, 0.05, 0]} rotation={[0, 0, Math.PI / 2]}>
        <torusGeometry args={[0.025, 0.007, 8, 20, Math.PI]} />
        <meshStandardMaterial color={color} roughness={0.35} />
      </mesh>
    </group>
  );
}

/** The black rubber duck in a blue helmet with a head lamp, centre desk. */
function Duck({ position }: { position: Vec3 }) {
  const rubber = { color: '#121212', roughness: 0.35 } as const;
  return (
    <group position={position} rotation={[0, -0.25, 0]} scale={1.15}>
      <mesh position={[0, 0.035, 0]} scale={[1, 0.72, 1.3]} castShadow>
        <sphereGeometry args={[0.05, 24, 16]} />
        <meshStandardMaterial {...rubber} />
      </mesh>
      <mesh position={[0, 0.088, 0.03]} castShadow>
        <sphereGeometry args={[0.033, 24, 16]} />
        <meshStandardMaterial {...rubber} />
      </mesh>
      <mesh position={[0, 0.082, 0.064]} scale={[1, 0.45, 1.2]}>
        <sphereGeometry args={[0.018, 16, 10]} />
        <meshStandardMaterial color="#d9d9d4" roughness={0.4} />
      </mesh>
      {[-1, 1].map((s) => (
        <mesh key={s} position={[s * 0.016, 0.098, 0.056]}>
          <sphereGeometry args={[0.005, 8, 6]} />
          <meshStandardMaterial color="#ffffff" roughness={0.2} />
        </mesh>
      ))}
      <mesh position={[0, 0.1, 0.028]}>
        <sphereGeometry args={[0.035, 24, 12, 0, Math.PI * 2, 0, Math.PI / 2]} />
        <meshStandardMaterial color="#3ea6e6" roughness={0.3} />
      </mesh>
      <mesh position={[0, 0.138, 0.03]}>
        <cylinderGeometry args={[0.006, 0.006, 0.012, 10]} />
        <meshStandardMaterial color="#ffffff" emissive="#ffffff" emissiveIntensity={1.5} />
      </mesh>
    </group>
  );
}

/** `smash`: per host, the laptop smash trigger (see Laptop). */
export function StudioSet({ smash }: { smash?: Partial<Record<HostId, number>> }) {
  const y = DESK.topY + 0.004;
  return (
    <group>
      <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[14, 10]} />
        <meshStandardMaterial color="#0b0908" roughness={0.9} />
      </mesh>
      <SideWalls />
      <CentrePanel />
      <ShelfProps />
      <Desk />
      {Object.values(SEATS).map((seat) => (
        <group key={seat.id}>
          <Chair seat={seat} />
          <MicRig seat={seat} />
          <Laptop seat={seat} lid={seat.id === 'tato' ? 'black' : 'silver'} smash={smash?.[seat.id]} />
        </group>
      ))}
      <Can position={[-0.72, y, 0.55]} kind="black" />
      <Mug position={[-0.5, y, 0.5]} />
      <Can position={[0.72, y, 0.57]} kind="blue" />
      <Duck position={[0, y, 0.6]} />
    </group>
  );
}
