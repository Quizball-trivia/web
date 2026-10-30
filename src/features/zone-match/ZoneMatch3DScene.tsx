'use client';

/**
 * Zone match 3D view — the WebGL half (client only; loaded through `next/dynamic` by ZoneMatch3D). A floodlit pitch
 * with the three zones, both goals, the pitch-side boards and the stadium backdrop from Road to Goal, and the ball.
 * The players are the seats' own avatar art as paper cut-outs (ZoneMatch3DCutouts, DOM projected onto the scene).
 * `DuelDirector` moves everything; this file only builds the scene, renders on demand (60 fps while something moves,
 * 30 when idle, nothing off-screen) and projects the players for the cut-outs and the HTML nameplates.
 */

import { Component, Suspense, memo, useEffect, useMemo, useRef, useState, type ReactNode, type RefObject } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { RoadAdvertisingBoards } from '@/features/mini-games/components/RoadAdvertisingBoards';
import { useMatchBallGeometry, useMatchBallTexture, usePitchTurf, useStadiumArtwork } from '@/features/mini-games/components/footballVisuals';
import { createRoadNet, deformRoadNet } from '@/features/mini-games/lib/roadNet';
import type { ZoneSide } from './zoneMatch.rules';
import { BALL_R, GOAL_X, PITCH_HALF_W, SIDE_COLOR, ZONE_LEN, columnX } from './zoneMatch3d.layout';
import { DuelDirector, type DirectorInput } from './zoneMatch3d.director';
import { CutoutDriver, type CutoutRegistry } from './ZoneMatch3DCutouts';
import type { CardFx } from './zoneMatch3d.fx';
import { CardEffectsEngine } from './zoneMatch3d.effects';
import { REAL_CLOCK, type SceneClock } from './zoneMatch3d.clock';

/**
 * Screen px covered by overlays on each edge of the full-screen view: the HUD on top, the question sheet and the hand
 * at the bottom, the question column on the right on desktop.
 */
export interface SceneInsets {
  top: number;
  bottom: number;
  left: number;
  right: number;
  /**
   * Desktop's step card floating in the middle: px from the open area's centre line to the card's edge plus a gap.
   * The players then stand clear of it, one each side (0: the usual duel framing).
   */
  split?: number;
  /** Frame both players whole (phone steps: they share the band above the card), not the ball-led duel framing. */
  both?: boolean;
}

export interface ZoneMatch3DSceneProps {
  input: RefObject<DirectorInput>;
  /** The covered edges: the camera frames the players in the open band between them. */
  insets: RefObject<SceneInsets>;
  /** The playstyle effects to show (zoneMatch3d.fx). */
  fx: RefObject<CardFx>;
  /** DOM overlays the effects drive. */
  overlays: { speed: RefObject<HTMLDivElement | null> };
  /** The players' cut-out DOM nodes (ZoneMatch3DCutouts). */
  cutouts: CutoutRegistry;
  plates: Record<ZoneSide, RefObject<HTMLDivElement | null>>;
  /** False while the view is scrolled away: nothing renders. */
  visible: RefObject<boolean>;
  onFailure: () => void;
  /** Real time unless given (the dev animation lab's slow motion). */
  clock?: SceneClock;
}

/** WebGL / three failures fall back to the 2D ball strip instead of crashing the match screen. */
class CanvasFailureBoundary extends Component<{ onFailure: () => void; children: ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  componentDidCatch() {
    this.props.onFailure();
  }
  render() {
    return this.state.failed ? null : this.props.children;
  }
}

const LINE = '#e6efdf';
const SIDES: ZoneSide[] = ['player', 'opponent'];

/* ── pitch ───────────────────────────────────────────────────────────── */

function useZoneMask() {
  const texture = useMemo(() => {
    const canvas = document.createElement('canvas');
    canvas.width = 128;
    canvas.height = 128;
    const ctx = canvas.getContext('2d')!;
    // An alpha map (read from the green channel, so drawn in opaque greys): a light wash inside the zone with a
    // brighter band along its two edges, fading out towards both touchlines.
    const g = ctx.createLinearGradient(0, 0, 128, 0);
    g.addColorStop(0, 'rgb(255,255,255)');
    g.addColorStop(0.06, 'rgb(64,64,64)');
    g.addColorStop(0.94, 'rgb(64,64,64)');
    g.addColorStop(1, 'rgb(255,255,255)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, 128, 128);
    const v = ctx.createLinearGradient(0, 0, 0, 128);
    v.addColorStop(0, 'rgba(0,0,0,0.85)');
    v.addColorStop(0.3, 'rgba(0,0,0,0)');
    v.addColorStop(0.7, 'rgba(0,0,0,0)');
    v.addColorStop(1, 'rgba(0,0,0,0.85)');
    ctx.fillStyle = v;
    ctx.fillRect(0, 0, 128, 128);
    const map = new THREE.CanvasTexture(canvas);
    return map;
  }, []);
  useEffect(() => () => texture.dispose(), [texture]);
  return texture;
}

function useLabelTexture(text: string) {
  const texture = useMemo(() => {
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 96;
    const ctx = canvas.getContext('2d')!;
    ctx.font = '800 64px Poppins, "Arial Black", Arial, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = '#ffffff';
    ctx.fillText(text, 256, 52);
    const map = new THREE.CanvasTexture(canvas);
    map.colorSpace = THREE.SRGBColorSpace;
    map.anisotropy = 8;
    return map;
  }, [text]);
  useEffect(() => () => texture.dispose(), [texture]);
  return texture;
}

function ZoneLabel({ text, x }: { text: string; x: number }) {
  const map = useLabelTexture(text);
  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[x, 0.012, -PITCH_HALF_W + 3.2]}>
      <planeGeometry args={[8, 1.5]} />
      <meshBasicMaterial map={map} transparent opacity={0.2} depthWrite={false} toneMapped={false} />
    </mesh>
  );
}

/** The three zones: faint dividers, names near the far touchline, and the ball's zone lit in the attacker's colour. */
function Zones({ director }: { director: DuelDirector }) {
  const mask = useZoneMask();
  const materials = useRef<(THREE.MeshBasicMaterial | null)[]>([]);
  const colors = useMemo(() => ({ player: new THREE.Color(SIDE_COLOR.player), opponent: new THREE.Color(SIDE_COLOR.opponent) }), []);
  useFrame((_, delta) => {
    const dt = Math.min(delta, 0.1);
    materials.current.forEach((mat, column) => {
      if (!mat) return;
      const lit = director.lit.column === column;
      mat.opacity = THREE.MathUtils.damp(mat.opacity, lit ? 0.55 : 0, 5, dt);
      if (lit) mat.color.lerp(colors[director.lit.side], 1 - Math.exp(-6 * dt));
    });
  });
  const spans: [number, number][] = [[-GOAL_X, -ZONE_LEN / 2], [-ZONE_LEN / 2, ZONE_LEN / 2], [ZONE_LEN / 2, GOAL_X]];
  return (
    <group>
      {spans.map(([a, b], column) => (
        <mesh key={column} rotation={[-Math.PI / 2, 0, 0]} position={[(a + b) / 2, 0.008, 0]} renderOrder={1}>
          <planeGeometry args={[b - a, PITCH_HALF_W * 2]} />
          <meshBasicMaterial
            ref={(m) => { materials.current[column] = m; }}
            color={SIDE_COLOR.player}
            alphaMap={mask}
            transparent
            opacity={0}
            depthWrite={false}
            toneMapped={false}
          />
        </mesh>
      ))}
      {[-ZONE_LEN / 2, ZONE_LEN / 2].map((x) => (
        <group key={x}>
          {Array.from({ length: 15 }, (_, i) => (
            <mesh key={i} rotation={[-Math.PI / 2, 0, 0]} position={[x, 0.01, -PITCH_HALF_W + 1 + i * 2]}>
              <planeGeometry args={[0.12, 1.1]} />
              <meshBasicMaterial color="#ffffff" transparent opacity={0.45} depthWrite={false} />
            </mesh>
          ))}
        </group>
      ))}
      <ZoneLabel text="YOUR SIDE" x={columnX(0) - 2} />
      <ZoneLabel text="CENTRE" x={columnX(1)} />
      <ZoneLabel text="THEIR SIDE" x={columnX(2) + 2} />
    </group>
  );
}

function Pitch() {
  const { map, bumpMap } = usePitchTurf(10, 6);
  const box = 8;
  const boxHalf = 10;
  const six = 2.8;
  const sixHalf = 5.6;
  const lines: [number, number, number, number][] = [
    [0, -PITCH_HALF_W, GOAL_X * 2, 0.08],
    [0, PITCH_HALF_W, GOAL_X * 2, 0.08],
    [0, 0, 0.08, PITCH_HALF_W * 2],
  ];
  for (const s of [-1, 1]) {
    const gx = s * GOAL_X;
    lines.push(
      [gx, 0, 0.08, PITCH_HALF_W * 2],
      [gx - s * box, 0, 0.08, boxHalf * 2],
      [gx - (s * box) / 2, -boxHalf, box, 0.08],
      [gx - (s * box) / 2, boxHalf, box, 0.08],
      [gx - s * six, 0, 0.08, sixHalf * 2],
      [gx - (s * six) / 2, -sixHalf, six, 0.08],
      [gx - (s * six) / 2, sixHalf, six, 0.08],
    );
  }
  return (
    <group>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.02, 0]} receiveShadow>
        <planeGeometry args={[84, 48]} />
        <meshStandardMaterial map={map} bumpMap={bumpMap} bumpScale={0.006} roughness={0.94} metalness={0} />
      </mesh>
      {Array.from({ length: 12 }, (_, i) => (
        <mesh key={i} rotation={[-Math.PI / 2, 0, 0]} position={[-GOAL_X + 2.5 + i * (50 / 12), -0.015, 0]} receiveShadow>
          <planeGeometry args={[50 / 12, PITCH_HALF_W * 2]} />
          <meshStandardMaterial color={i % 2 ? '#bedb9f' : '#102c1b'} transparent opacity={0.05} depthWrite={false} roughness={1} />
        </mesh>
      ))}
      {lines.map(([x, z, w, d], i) => (
        <mesh key={i} rotation={[-Math.PI / 2, 0, 0]} position={[x, 0.005, z]}>
          <planeGeometry args={[w, d]} />
          <meshBasicMaterial color={LINE} transparent opacity={0.75} depthWrite={false} />
        </mesh>
      ))}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.006, 0]}>
        <ringGeometry args={[4, 4.08, 96]} />
        <meshBasicMaterial color={LINE} transparent opacity={0.75} depthWrite={false} />
      </mesh>
      {[0, -(GOAL_X - 5.5), GOAL_X - 5.5].map((x) => (
        <mesh key={x} rotation={[-Math.PI / 2, 0, 0]} position={[x, 0.006, 0]}>
          <circleGeometry args={[0.12, 20]} />
          <meshBasicMaterial color={LINE} transparent opacity={0.8} depthWrite={false} />
        </mesh>
      ))}
    </group>
  );
}

/** RoadGoal's goal frame and net (with its ripple), mounted on either goal line. */
function Goal({ dir, director }: { dir: 1 | -1; director: DuelDirector }) {
  const net = useMemo(() => createRoadNet(), []);
  const lastAge = useRef<number | null>(null);
  useEffect(() => () => net.geometry.dispose(), [net]);
  useFrame(() => {
    const age = director.netAge[dir];
    const settled = age < 0 || age > 3;
    if (settled && lastAge.current === -1) return;
    deformRoadNet(net, settled ? -1 : age);
    lastAge.current = settled ? -1 : age;
  });
  return (
    <group position={[dir * GOAL_X, 0, 0]} rotation={[0, -dir * (Math.PI / 2), 0]}>
      {[-4.25, 4.25].map((x) => (
        <group key={x}>
          <mesh position={[x, 1.6, 0]} castShadow>
            <cylinderGeometry args={[0.07, 0.07, 3.2, 20]} />
            <meshStandardMaterial color="#f7faf8" roughness={0.35} metalness={0.16} />
          </mesh>
          <mesh position={[x, 0.055, -0.9]}>
            <boxGeometry args={[0.065, 0.065, 1.9]} />
            <meshStandardMaterial color="#9caeb2" roughness={0.5} />
          </mesh>
          <mesh position={[x, 1.6, -1.8]}>
            <cylinderGeometry args={[0.022, 0.022, 3.2, 10]} />
            <meshStandardMaterial color="#83999d" roughness={0.5} />
          </mesh>
        </group>
      ))}
      <mesh position={[0, 3.2, 0]} rotation={[0, 0, Math.PI / 2]} castShadow>
        <cylinderGeometry args={[0.07, 0.07, 8.5, 20]} />
        <meshStandardMaterial color="#f7faf8" roughness={0.35} metalness={0.16} />
      </mesh>
      <lineSegments geometry={net.geometry}>
        <lineBasicMaterial color="#dae8e5" transparent opacity={0.55} depthWrite={false} />
      </lineSegments>
    </group>
  );
}

/** Road to Goal's grandstand panorama, kept centred on what the camera sees, behind its LED boards. */
/** Floodlight Failure's blackout is on right now. */
const isDark = (fx: CardFx) => fx.dark !== null && Date.now() >= fx.dark.from && Date.now() < fx.dark.until;

/**
 * Road to Goal's grandstand panorama, kept centred on what the camera sees, behind its LED boards. Home Advantage
 * tints the crowd and the boards in the owner's colour; Floodlight Failure darkens the stands.
 */
function Stadium({ fx }: { fx: RefObject<CardFx> }) {
  const backdrop = useStadiumArtwork('/assets/demos/road-to-goal-stadium-panorama-v4.png', 80 / 24);
  const root = useRef<THREE.Group>(null);
  const crowd = useRef<(THREE.MeshBasicMaterial | null)[]>([]);
  const boards = useRef<THREE.MeshBasicMaterial>(null);
  const tint = useMemo(() => ({ color: new THREE.Color('#ffffff'), target: new THREE.Color(), board: 0 }), []);
  useFrame(({ camera }, delta) => {
    const dt = Math.min(delta, 0.1);
    if (root.current) root.current.position.x = camera.position.x * 0.85;
    const home = fx.current.home;
    const target = tint.target.set(home ? SIDE_COLOR[home] : '#ffffff');
    if (home) target.lerp(WHITE, 0.12);
    if (isDark(fx.current)) target.multiplyScalar(0.16);
    tint.color.lerp(target, 1 - Math.exp(-5 * dt));
    for (const material of crowd.current) material?.color.copy(tint.color);
    if (boards.current) {
      if (home) boards.current.color.set(SIDE_COLOR[home]);
      boards.current.opacity = THREE.MathUtils.damp(boards.current.opacity, home ? 0.7 : 0, 5, dt);
    }
  });
  return (
    <>
      <group ref={root}>
        <mesh position={[0, 9.5, -PITCH_HALF_W - 14]}>
          <planeGeometry args={[80, 24]} />
          <meshBasicMaterial ref={(m) => { crowd.current[0] = m; }} map={backdrop} toneMapped={false} fog={false} />
        </mesh>
      </group>
      {/* The same crowd behind both goals, for the shots filmed down the pitch. */}
      {[-1, 1].map((dir, i) => (
        <mesh key={dir} position={[dir * (GOAL_X + 16), 9.5, 0]} rotation={[0, -dir * (Math.PI / 2), 0]}>
          <planeGeometry args={[80, 24]} />
          <meshBasicMaterial ref={(m) => { crowd.current[i + 1] = m; }} map={backdrop} toneMapped={false} fog={false} />
        </mesh>
      ))}
      <group position={[-20, 0, -PITCH_HALF_W - 3.2 + 9.4]}>
        <RoadAdvertisingBoards />
      </group>
      <mesh position={[0, 0.62, -PITCH_HALF_W - 3.2 + 0.14]}>
        <planeGeometry args={[100, 0.92]} />
        <meshBasicMaterial ref={boards} transparent opacity={0} depthWrite={false} toneMapped={false} />
      </mesh>
    </>
  );
}

const WHITE = new THREE.Color('#ffffff');
const LIGHT_LEVELS = [0.32, 1.05, 2.6, 1.2, 1.6];

/** Floodlit night; Floodlight Failure cuts the floodlights and leaves a single spot on its victim. */
function Lights({ director, fx }: { director: DuelDirector; fx: RefObject<CardFx> }) {
  const key = useRef<THREE.DirectionalLight>(null);
  const lights = useRef<(THREE.Light | null)[]>([]);
  const spot = useRef<THREE.SpotLight>(null);
  const target = useMemo(() => new THREE.Object3D(), []);
  const spotTarget = useMemo(() => new THREE.Object3D(), []);
  const level = useRef({ dim: 0 });
  const point = useMemo(() => new THREE.Vector3(), []);
  useFrame((_, delta) => {
    const light = key.current;
    if (!light) return;
    const f = director.focus;
    light.position.set(f.x + 6, 15, f.z + 9);
    target.position.set(f.x, 0, f.z);
    target.updateMatrixWorld();
    const dark = fx.current.dark;
    const dim = (level.current.dim = THREE.MathUtils.damp(level.current.dim, isDark(fx.current) ? 1 : 0, 7, Math.min(delta, 0.1)));
    lights.current.forEach((l, i) => {
      if (l) l.intensity = LIGHT_LEVELS[i] * (1 - 0.88 * dim);
    });
    const s = spot.current;
    if (s) {
      s.visible = dim > 0.01 && dark !== null;
      const pelvis = dark ? director.pelvisOf(dark.victim, point) : null;
      if (s.visible && pelvis) {
        s.intensity = 260 * dim;
        s.position.set(pelvis.x + 1.5, 11, pelvis.z + 3);
        spotTarget.position.set(pelvis.x, 0, pelvis.z);
        spotTarget.updateMatrixWorld();
      }
    }
  });
  const keep = (i: number) => (l: THREE.Light | null) => {
    lights.current[i] = l;
  };
  return (
    <>
      <ambientLight ref={keep(0)} intensity={0.32} color="#C7DBFF" />
      <hemisphereLight ref={keep(1)} args={['#EAF5FF', '#163b2d', 1.05]} />
      <directionalLight
        ref={(l) => {
          key.current = l;
          lights.current[2] = l;
        }}
        target={target}
        intensity={2.6}
        color="#FFF8DF"
        castShadow
        shadow-mapSize-width={1024}
        shadow-mapSize-height={1024}
        shadow-camera-left={-14}
        shadow-camera-right={14}
        shadow-camera-top={12}
        shadow-camera-bottom={-12}
        shadow-camera-near={1}
        shadow-camera-far={45}
        shadow-normalBias={0.025}
        shadow-bias={-0.0001}
      />
      <directionalLight ref={keep(3)} position={[-10, 8, 6]} intensity={1.2} color="#9FC8FF" />
      <directionalLight ref={keep(4)} position={[4, 9, -8]} intensity={1.6} color="#bbdeff" />
      <spotLight ref={spot} target={spotTarget} angle={0.32} penumbra={0.55} decay={1} distance={0} color="#FFF4D6" visible={false} />
      <primitive object={target} />
      <primitive object={spotTarget} />
    </>
  );
}

/* ── players and ball ────────────────────────────────────────────────── */

interface PlatePlacement {
  x: number;
  y: number;
  w: number;
  h: number;
  on: boolean;
}

function placePlate(plate: HTMLDivElement, p: PlatePlacement) {
  plate.style.opacity = p.on ? '1' : '0';
  plate.style.transform = `translate3d(${p.x.toFixed(1)}px, ${p.y.toFixed(1)}px, 0) translate(-50%, -100%)`;
}

/** A ring under each player in their side's colour (blue = you, red = them), and the HTML nameplates above. */
function Markers({ director, plates, insets }: { director: DuelDirector; plates: ZoneMatch3DSceneProps['plates']; insets: ZoneMatch3DSceneProps['insets'] }) {
  const rings = useRef<Partial<Record<ZoneSide, THREE.Mesh | null>>>({});
  const point = useMemo(() => new THREE.Vector3(), []);
  const placedRef = useRef<Record<ZoneSide, PlatePlacement>>({ player: { x: 0, y: 0, w: 0, h: 0, on: false }, opponent: { x: 0, y: 0, w: 0, h: 0, on: false } });
  useFrame(({ camera, size }) => {
    const placed = placedRef.current;
    for (const side of SIDES) {
      // The ring sits under the cut-out's base.
      const ring = rings.current[side];
      const pose = director.poseOf(side);
      if (ring) {
        ring.visible = true;
        ring.position.set(pose.x, 0.02, pose.z);
      }
      const p = placed[side];
      const plate = plates[side].current;
      const head = director.headOf(side, point);
      p.on = false;
      if (!plate || !head) continue;
      if (!p.w) {
        p.w = plate.offsetWidth;
        p.h = plate.offsetHeight;
      }
      head.y += 0.95;
      head.project(camera);
      p.on = head.z < 1 && Math.abs(head.x) < 1.1 && head.y > -1;
      // Keep the plate inside the open band, also when the head is above it (tight shots): never under the HUD.
      // Room on the left for the ✓ / ✗ badge that sits beside the plate at a result.
      const edge = insets.current;
      p.x = THREE.MathUtils.clamp(((head.x + 1) / 2) * size.width, edge.left + p.w / 2 + 44, Math.max(edge.left + p.w / 2 + 44, size.width - edge.right - p.w / 2 - 4));
      p.y = Math.max(insets.current.top + p.h + 6, ((1 - head.y) / 2) * size.height);
    }
    // Two plates over each other (players side by side on screen): lift the farther one clear.
    const a = placed.player;
    const b = placed.opponent;
    if (a.on && b.on && Math.abs(a.x - b.x) < (a.w + b.w) / 2 && Math.abs(a.y - b.y) < (a.h + b.h) / 2) {
      const [top, bottom] = a.y <= b.y ? [a, b] : [b, a];
      top.y = Math.min(top.y, bottom.y - (a.h + b.h) / 2 - 2);
      if (top.y < insets.current.top + top.h + 6) {
        top.y = insets.current.top + top.h + 6;
        bottom.y = top.y + (a.h + b.h) / 2 + 2;
      }
    }
    for (const side of SIDES) {
      const plate = plates[side].current;
      if (!plate) continue;
      placePlate(plate, placed[side]);
    }
  });
  return (
    <>
      {SIDES.map((side) => (
        <mesh key={side} ref={(m) => { rings.current[side] = m; }} rotation={[-Math.PI / 2, 0, 0]} visible={false} renderOrder={2}>
          <ringGeometry args={[0.72, 0.92, 48]} />
          <meshBasicMaterial color={SIDE_COLOR[side]} transparent opacity={0.85} depthWrite={false} toneMapped={false} />
        </mesh>
      ))}
    </>
  );
}

function Ball({ director }: { director: DuelDirector }) {
  const map = useMatchBallTexture();
  const geometry = useMatchBallGeometry(BALL_R);
  const shadow = useRef<THREE.Mesh>(null);
  useFrame(() => {
    const s = shadow.current;
    if (!s) return;
    const b = director.ballPosition();
    s.position.set(b.x, 0.012, b.z);
    const height = Math.max(0, b.y - BALL_R);
    s.scale.setScalar(1 + height * 0.35);
    (s.material as THREE.MeshBasicMaterial).opacity = Math.max(0.05, 0.3 - height * 0.08);
  });
  return (
    <>
      <mesh ref={shadow} rotation={[-Math.PI / 2, 0, 0]}>
        <circleGeometry args={[0.22, 24]} />
        <meshBasicMaterial color="#020805" transparent opacity={0.3} depthWrite={false} />
      </mesh>
      <mesh ref={(m) => director.attachBall(m)} geometry={geometry} castShadow>
        <meshStandardMaterial map={map} roughness={0.62} metalness={0.02} />
      </mesh>
    </>
  );
}

/* ── loop ────────────────────────────────────────────────────────────── */

/** The open area never frames smaller than this (a tiny phone with a tall sheet): the players then sit lower. */
const MIN_OPEN_PX = 140;

/**
 * Runs the director, framing for the open area between the overlays: the camera's frustum is set up for a virtual
 * viewport the size of that area (aspect and fit), then widened to the whole canvas with a view offset, so the
 * director's framing lands centred in the open area and the rest of the scene still fills the screen behind the
 * overlays. The area eases when a sheet slides, so the camera glides instead of jumping.
 */
function DirectorLoop({ director, input, insets, clock }: { director: DuelDirector; input: RefObject<DirectorInput>; insets: ZoneMatch3DSceneProps['insets']; clock: SceneClock }) {
  const area = useRef<SceneInsets | null>(null);
  useFrame((state, delta) => {
    const camera = state.camera as THREE.PerspectiveCamera;
    const now = clock.now();
    const width = Math.max(1, state.size.width);
    const height = Math.max(1, state.size.height);
    const target = insets.current;
    let a = area.current;
    if (!a) {
      a = area.current = { ...target, split: target.split ?? 0 };
    } else {
      const k = 1 - Math.exp(-6 * Math.min(delta, 0.1));
      let moving = false;
      const goal = { ...target, split: target.split ?? 0 };
      for (const edge of ['top', 'bottom', 'left', 'right', 'split'] as const) {
        const current = a[edge] ?? 0;
        // The split jumps (the director moves the players and the camera itself); the edges ease.
        const next = edge === 'split' ? goal[edge] : current + (goal[edge] - current) * k;
        a[edge] = Math.abs(goal[edge] - next) < 0.5 ? goal[edge] : next;
        if (a[edge] !== goal[edge]) moving = true;
      }
      if (moving) director.keepBusy(now + 0.15);
    }
    const openW = Math.min(width, Math.max(MIN_OPEN_PX, width - a.left - a.right));
    const openH = Math.min(height, Math.max(MIN_OPEN_PX, height - a.top - a.bottom));
    if (openW === width && openH === height && a.left === 0 && a.top === 0) {
      if (camera.view?.enabled) camera.clearViewOffset();
    } else {
      // Virtual viewport = the open area (its corner at left, top); the canvas shows that, plus what lies around it.
      camera.setViewOffset(openW, openH, -a.left, -a.top, width, height);
    }
    const aspect = openW / openH;
    if (Math.abs(camera.aspect - aspect) > 1e-4) {
      camera.aspect = aspect;
      camera.updateProjectionMatrix();
    }
    // The card's reach as a share of the open area's half-width (the director spreads the players past it).
    const split = a.split ? Math.min(0.8, a.split / (openW / 2)) : 0;
    director.update(input.current, now, delta * clock.rate(), camera, aspect, split, target.both ?? false);
  }, -1);
  return null;
}

type Frameloop = 'always' | 'demand';

/**
 * Frame budget: the full loop while anything moves, ~30 fps on demand for the idle loops, nothing while scrolled
 * away. (Invalidating every frame in demand mode only reaches every other frame, so 60 fps switches the Canvas to
 * its 'always' loop.)
 */
function FrameDriver({ director, visible, onFrameloop }: { director: DuelDirector; visible: RefObject<boolean>; onFrameloop: (mode: Frameloop) => void }) {
  const invalidate = useThree((s) => s.invalidate);
  useEffect(() => {
    let raf = 0;
    let last = 0;
    let mode: Frameloop = 'demand';
    const loop = (ms: number) => {
      raf = requestAnimationFrame(loop);
      const fps = visible.current ? director.wantFps : 0;
      const next: Frameloop = fps >= 60 ? 'always' : 'demand';
      if (next !== mode) {
        mode = next;
        onFrameloop(next);
      }
      // A stopped loop only restarts on an invalidate; while it runs this is a no-op.
      if (fps >= 60) invalidate();
      else if (fps > 0 && ms - last >= 1000 / fps - 4) {
        last = ms;
        invalidate();
      }
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [director, invalidate, onFrameloop, visible]);
  return null;
}

/** The playstyle cards in the scene (zoneMatch3d.effects), after the director has placed everyone. */
function CardEffects({ director, engine, fx, overlays, clock }: { director: DuelDirector; engine: CardEffectsEngine; fx: RefObject<CardFx>; overlays: ZoneMatch3DSceneProps['overlays']; clock: SceneClock }) {
  useFrame(({ scene }, delta) => {
    const now = clock.now();
    engine.update(fx.current, now, Math.min(delta * clock.rate(), 0.1), scene, overlays.speed.current);
    if (engine.busy) director.keepBusy(now + 0.15);
  });
  return <primitive object={engine.root} />;
}

function ZoneMatch3DScene({ input, insets, fx, cutouts, plates, overlays, visible, onFailure, clock = REAL_CLOCK }: ZoneMatch3DSceneProps) {
  const director = useMemo(() => new DuelDirector(), []);
  const engine = useMemo(() => new CardEffectsEngine(director), [director]);
  useEffect(() => () => engine.dispose(), [engine]);
  const [frameloop, setFrameloop] = useState<Frameloop>('demand');
  return (
    <CanvasFailureBoundary onFailure={onFailure}>
      <Canvas
        className="!absolute inset-0"
        frameloop={frameloop}
        dpr={[1, 1.5]}
        shadows={{ type: THREE.PCFShadowMap }}
        camera={{ position: [0, 6, 14], fov: 36, near: 0.1, far: 140 }}
        gl={{ antialias: true, alpha: false, powerPreference: 'high-performance' }}
      >
        <color attach="background" args={['#07111d']} />
        <fog attach="fog" args={['#07111d', 45, 90]} />
        <Lights director={director} fx={fx} />
        <Suspense fallback={null}>
          <Stadium fx={fx} />
        </Suspense>
        <Pitch />
        <Zones director={director} />
        <Goal dir={-1} director={director} />
        <Goal dir={1} director={director} />
        <Suspense fallback={null}>
          <Ball director={director} />
        </Suspense>
        <CardEffects director={director} engine={engine} fx={fx} overlays={overlays} clock={clock} />
        <Markers director={director} plates={plates} insets={insets} />
        <CutoutDriver director={director} engine={engine} fx={fx} registry={cutouts} clock={clock} />
        <DirectorLoop director={director} input={input} insets={insets} clock={clock} />
        <FrameDriver director={director} visible={visible} onFrameloop={setFrameloop} />
      </Canvas>
    </CanvasFailureBoundary>
  );
}

/** Memoised: the match screen re-renders on every clock tick; the scene doesn't need to. */
export default memo(ZoneMatch3DScene);
