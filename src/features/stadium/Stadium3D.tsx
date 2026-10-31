'use client';

/**
 * The 3D stadium: tiered stands round the zone match's pitch, filled with fans who play the 2D playground's crowd
 * scenes (card mosaics and tifos, scarves, flags, phone torches, bounces, waves…), and LED boards round the pitch
 * scrolling "POWERED BY quizball". Inside an R3F Canvas; the scene runs on the given clock (seconds).
 *
 * Fans are instanced (one draw per part: body, head, card, scarf, flag, arms, torch glow), their parts placed every
 * frame from the scene's per-fan state (CrowdDriver). The stands are one mesh of terrace steps.
 */

import { useEffect, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { CrowdDriver } from './crowdDriver';
import { FAN_ATLAS, FAN_VARIANTS, buildFanAtlas } from './fanAtlas';
import { PROP_FLAG, PROP_LINK, PROP_SCARF, PROP_TORCH, PROP_TWIRL, SHAPE_CARD } from './crowd/mechanics';
import type { CrowdScene } from './crowd/scenes';
import { OFFSET_TO_WORLD, TERRACE, TRACK_W, deepestRow, placeFans, terracePoint, trackEdge } from './stadium3d.layout';

/** Seat spacing along a stand (world units) and between rows: the size a held-up card needs to tile a mosaic. */
const CARD = { w: 0.72, h: 0.9, at: 0.7 };
/** A fan: one of the avatar sheet's cut-outs (FAN_ATLAS cells), its hands this high up it. */
const FAN = { w: 0.84, h: (0.84 * FAN_ATLAS.cellH) / FAN_ATLAS.cellW, sink: 0.16, hands: 0.62 };
const PARTS = ['fan', 'card', 'scarf', 'flag', 'stick', 'glow'] as const;
type Part = (typeof PARTS)[number];

/* ── the stands ──────────────────────────────────────────────────────── */

/** Terrace steps all the way round (riser + tread per row), a back wall on top; sampled round the track's edge. */
/** `skipNear`: leave out the stand on the camera's side (+z), which would only block the match's touchline shots. */
function terraceGeometry(rows: number, skipNear = false): THREE.BufferGeometry {
  // Round the track's edge: a point far out in each direction, projected onto it.
  const samples: { ex: number; ez: number; nx: number; nz: number }[] = [];
  const N = 220;
  for (let i = 0; i < N; i += 1) {
    const a = (i / N) * Math.PI * 2;
    const e = trackEdge(Math.cos(a) * 200, Math.sin(a) * 200);
    samples.push({ ex: e.ex, ez: e.ez, nx: e.nx, nz: e.nz });
  }
  const positions: number[] = [];
  const colors: number[] = [];
  const indices: number[] = [];
  const stepColors = [new THREE.Color('#163a22'), new THREE.Color('#1b4529')];
  const riser = new THREE.Color('#0e2716');
  let v = 0;
  const quad = (a: number[], b: number[], c: number[], d: number[], col: THREE.Color) => {
    positions.push(...a, ...b, ...c, ...d);
    for (let k = 0; k < 4; k += 1) colors.push(col.r, col.g, col.b);
    indices.push(v, v + 1, v + 2, v, v + 2, v + 3);
    v += 4;
  };
  const step = TERRACE.row / TERRACE.gain;
  for (let i = 0; i < N; i += 1) {
    const s0 = samples[i];
    const s1 = samples[(i + 1) % N];
    if (skipNear && (s0.nz > NEAR_NZ || s1.nz > NEAR_NZ)) continue;
    for (let row = 0; row <= rows; row += 1) {
      const d0 = row * step - step / 2;
      const d1 = d0 + step;
      const [ax, ay, az] = terracePoint(s0.ex, s0.ez, s0.nx, s0.nz, Math.max(0, d0));
      const [bx, , bz] = terracePoint(s1.ex, s1.ez, s1.nx, s1.nz, Math.max(0, d0));
      const [cx2, , cz2] = terracePoint(s1.ex, s1.ez, s1.nx, s1.nz, d1);
      const [dx, , dz] = terracePoint(s0.ex, s0.ez, s0.nx, s0.nz, d1);
      const y = ay - 0.02;
      // Tread (flat), then the riser up to the next row.
      quad([ax, y, az], [bx, y, bz], [cx2, y, cz2], [dx, y, dz], stepColors[row % 2]);
      const yNext = terracePoint(s0.ex, s0.ez, s0.nx, s0.nz, d1)[1] - 0.02;
      quad([dx, y, dz], [cx2, y, cz2], [cx2, yNext, cz2], [dx, yNext, dz], riser);
    }
    // The front wall below the first row, down to the track.
    const [fx, fy, fz] = terracePoint(s0.ex, s0.ez, s0.nx, s0.nz, 0);
    const [gx, , gz] = terracePoint(s1.ex, s1.ez, s1.nx, s1.nz, 0);
    quad([fx - s0.nx * 0.5, 0, fz - s0.nz * 0.5], [gx - s1.nx * 0.5, 0, gz - s1.nz * 0.5], [gx - s1.nx * 0.5, fy, gz - s1.nz * 0.5], [fx - s0.nx * 0.5, fy, fz - s0.nz * 0.5], riser);
    // The back wall and a roof lip over the top row.
    const top = (rows + 1) * step;
    const [tx, ty, tz] = terracePoint(s0.ex, s0.ez, s0.nx, s0.nz, top);
    const [ux, , uz] = terracePoint(s1.ex, s1.ez, s1.nx, s1.nz, top);
    quad([tx, ty, tz], [ux, ty, uz], [ux, ty + 3.2, uz], [tx, ty + 3.2, tz], new THREE.Color('#0c1f13'));
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  g.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
  g.setIndex(indices);
  g.computeVertexNormals();
  return g;
}

/* ── LED boards ──────────────────────────────────────────────────────── */

function boardTexture(bg: string, fg: string, words: [string, string]): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 1024;
  canvas.height = 64;
  const ctx = canvas.getContext('2d')!;
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, 1024, 64);
  ctx.fillStyle = fg;
  ctx.textBaseline = 'middle';
  for (let i = 0; i < 4; i += 1) {
    const x = 30 + i * 256;
    ctx.font = '700 15px Poppins, Arial, sans-serif';
    ctx.fillText(words[0], x, 22);
    ctx.font = '900 30px Poppins, Arial, sans-serif';
    ctx.fillText(words[1], x, 44);
  }
  const t = new THREE.CanvasTexture(canvas);
  t.wrapS = THREE.RepeatWrapping;
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 4;
  return t;
}

/** Boards on the track, all four sides: scrolling, and every few seconds a flash to the second message. */
function LedBoards({ clock }: { clock: () => number }) {
  const inset = 1.1;
  // Each board its own pair of textures, repeated to its length (one message every 14 units).
  const boards = useMemo(() => {
    const { hx, hz } = TRACK_W;
    const sides = [
      { pos: [0, 0.5, -(hz - inset)] as const, rot: 0, len: 2 * (hx - 5) },
      { pos: [0, 0.5, hz - inset] as const, rot: Math.PI, len: 2 * (hx - 5) },
      { pos: [-(hx - inset), 0.5, 0] as const, rot: Math.PI / 2, len: 2 * (hz - 5) },
      { pos: [hx - inset, 0.5, 0] as const, rot: -Math.PI / 2, len: 2 * (hz - 5) },
    ];
    return sides.map((side) => {
      const textures = [boardTexture('#FB6A00', '#FFFFFF', ['POWERED BY', 'quizball']), boardTexture('#1645FF', '#FFE500', ['ZONE MATCH', 'GO GO GO!'])];
      for (const t of textures) t.repeat.set(side.len / 14, 1);
      return { ...side, textures };
    });
  }, []);
  useEffect(() => () => boards.forEach((b) => b.textures.forEach((t) => t.dispose())), [boards]);
  const materials = useRef<(THREE.MeshBasicMaterial | null)[]>([]);
  useFrame(() => {
    const t = clock();
    const flash = Math.floor(t / 7) % 2 === 1 && t % 7 < 2.2;
    boards.forEach((board, i) => {
      const m = materials.current[i];
      for (const tex of board.textures) tex.offset.x = (t * 0.06) % 1;
      if (!m) return;
      const tex = board.textures[flash ? 1 : 0];
      if (m.map !== tex) {
        m.map = tex;
        m.needsUpdate = true;
      }
      m.color.setScalar(flash ? 0.85 + 0.25 * Math.abs(Math.sin(t * 9)) : 1);
    });
  });
  return (
    <>
      {boards.map((board, i) => (
        <mesh key={i} position={[board.pos[0], board.pos[1], board.pos[2]]} rotation={[0, board.rot, 0]}>
          <planeGeometry args={[board.len, 0.95]} />
          <meshBasicMaterial
            ref={(m) => {
              materials.current[i] = m;
            }}
            map={board.textures[0]}
            toneMapped={false}
          />
        </mesh>
      ))}
    </>
  );
}

/* ── the fans ────────────────────────────────────────────────────────── */

const _m = new THREE.Matrix4();
const _q = new THREE.Quaternion();
const _e = new THREE.Euler();
const _p = new THREE.Vector3();
const _s = new THREE.Vector3();
const ZERO = new THREE.Matrix4().makeScale(0, 0, 0);
const _c = new THREE.Color();
const FULL = () => 1;
/** Seats and steps facing the pitch from the camera's side (their outward normal points at +z). */
const NEAR_NZ = 0.45;

export function Stadium3D({
  scene,
  text = '',
  replay = 0,
  clock,
  hideNear = false,
  brightness = FULL,
}: {
  scene: CrowdScene;
  text?: string;
  /** Bump to restart the scene. */
  replay?: number;
  clock: () => number;
  /** Leave out the stand on the camera's side (the match's touchline shots). */
  hideNear?: boolean;
  /** How lit the crowd is, 0–1 (a blackout darkens it). */
  brightness?: () => number;
}) {
  const driver = useMemo(() => new CrowdDriver(), []);
  const places = useMemo(() => placeFans(driver.crowd), [driver]);
  const rows = useMemo(() => Math.ceil(deepestRow(driver.crowd) / (TERRACE.row / TERRACE.gain)) + 1, [driver]);
  const terraces = useMemo(() => terraceGeometry(rows, hideNear), [rows, hideNear]);
  useEffect(() => () => terraces.dispose(), [terraces]);
  const meshes = useRef<Partial<Record<Part, THREE.InstancedMesh | null>>>({});
  const tableColors = useRef<THREE.Color[]>([]);
  const last = useRef<number | null>(null);

  useEffect(() => {
    driver.setScene(scene, text);
    tableColors.current = driver.colorTable.map((c) => new THREE.Color(c));
    last.current = null;
  }, [driver, scene, text, replay]);

  const n = driver.crowd.count;
  const geometries = useMemo(
    () => ({
      fan: new THREE.PlaneGeometry(FAN.w, FAN.h).translate(0, FAN.h / 2, 0),
      card: new THREE.PlaneGeometry(CARD.w, CARD.h),
      scarf: new THREE.BoxGeometry(0.95, 0.13, 0.04),
      flag: new THREE.PlaneGeometry(0.85, 0.55).translate(0.42, 0, 0),
      stick: new THREE.BoxGeometry(0.04, 1.0, 0.04).translate(0, 0.5, 0),
      glow: new THREE.PlaneGeometry(0.5, 0.5),
    }),
    [],
  );
  useEffect(() => () => Object.values(geometries).forEach((g) => g.dispose()), [geometries]);

  // The avatar sheet; each fan shows one cell of it (aCell), lit by its instance colour (darkened in a blackout).
  const fanMaterial = useMemo(() => {
    const material = new THREE.MeshBasicMaterial({ alphaTest: 0.5, side: THREE.DoubleSide, toneMapped: false, transparent: false });
    material.onBeforeCompile = (shader) => {
      shader.vertexShader = shader.vertexShader
        .replace('#include <common>', '#include <common>\nattribute float aCell;')
        .replace(
          '#include <uv_vertex>',
          `#include <uv_vertex>
          #ifdef USE_MAP
            vMapUv = vec2((mod(aCell, ${FAN_ATLAS.cols}.0) + uv.x) / ${FAN_ATLAS.cols}.0, 1.0 - (floor(aCell / ${FAN_ATLAS.cols}.0) + 1.0 - uv.y) / ${FAN_ATLAS.rows}.0);
          #endif`,
        );
    };
    return material;
  }, []);
  useEffect(() => {
    let cancelled = false;
    let texture: THREE.CanvasTexture | null = null;
    void buildFanAtlas().then((canvas) => {
      if (cancelled) return;
      texture = new THREE.CanvasTexture(canvas);
      texture.colorSpace = THREE.SRGBColorSpace;
      texture.anisotropy = 4;
      fanMaterial.map = texture;
      fanMaterial.needsUpdate = true;
      if (meshes.current.fan) meshes.current.fan.visible = true;
    });
    return () => {
      cancelled = true;
      texture?.dispose();
      fanMaterial.dispose();
    };
  }, [fanMaterial]);
  // Which avatar each fan is (spread so neighbours differ).
  const cells = useMemo(() => {
    const a = new Float32Array(n);
    for (let i = 0; i < n; i += 1) a[i] = (driver.crowd.seed[i] * 7 + i * 13) % FAN_VARIANTS;
    return a;
  }, [driver, n]);

  useFrame(({ camera }) => {
    const now = clock();
    const bright = brightness();
    const dt = last.current === null ? 0 : Math.max(0, now - last.current);
    last.current = now;
    driver.advance(dt);
    const st = driver.state;
    const table = tableColors.current;
    const m = meshes.current;
    const colour = (i: number) => table[driver.colorIndex(i)] ?? table[0];
    const propColour = (i: number) => {
      const pal = driver.palette;
      return pal.length ? table[5 + (st.propColor[i] % pal.length) * 3 + 1] ?? table[0] : table[1];
    };
    for (let i = 0; i < n; i += 1) {
      const scale = st.scale[i];
      const hidden = scale <= 0.001 || (hideNear && places.nz[i] > NEAR_NZ);
      const lift = Math.max(-0.4, -st.oy[i] * OFFSET_TO_WORLD.up);
      const along = st.ox[i] * OFFSET_TO_WORLD.along;
      const x = places.x[i] + places.tx[i] * along;
      const z = places.z[i] + places.tz[i] * along;
      const y = places.y[i] + lift;
      const yaw = places.yaw[i];
      // The fan faces the camera (a cut-out, like the players); held cards face the pitch.
      const faceYaw = Math.atan2(camera.position.x - x, camera.position.z - z);
      // A coloured fan (mosaics, text walls) holds up a card of that colour.
      const card = st.shape[i] === SHAPE_CARD || st.color[i] !== 0;
      const k = hidden ? 0 : Math.min(1.25, 0.8 + 0.2 * scale);
      _q.setFromEuler(_e.set(0, faceYaw, 0));
      _m.compose(_p.set(x, y - FAN.sink, z), _q, _s.setScalar(k));
      m.fan?.setMatrixAt(i, hidden ? ZERO : _m);
      if (!hidden) m.fan?.setColorAt(i, _c.setScalar(bright * (0.86 + 0.14 * ((driver.crowd.seed[i] % 7) / 6))));
      // A card held up in front of the face (mosaics): facing the pitch, a little flutter.
      if (card && !hidden) {
        const flutter = 0.06 * Math.sin(now * 7 + driver.crowd.seed[i]);
        _q.setFromEuler(_e.set(-0.08 + flutter, yaw, 0));
        _m.compose(_p.set(x + Math.sin(yaw) * 0.12, places.y[i] + CARD.at + lift, z + Math.cos(yaw) * 0.12), _q, _s.set(1, 1, 1));
        m.card?.setMatrixAt(i, _m);
        m.card?.setColorAt(i, _c.copy(colour(i)).multiplyScalar(bright));
      } else m.card?.setMatrixAt(i, ZERO);
      // Props.
      const prop = hidden ? 0 : st.prop[i];
      const pc = propColour(i);
      if (prop === PROP_SCARF || prop === PROP_LINK || prop === PROP_TWIRL) {
        const twirl = prop === PROP_TWIRL ? st.propA[i] : 0;
        const high = prop === PROP_LINK ? FAN.hands - 0.25 : FAN.hands + 0.1;
        _q.setFromEuler(_e.set(0, yaw, twirl));
        _m.compose(_p.set(x, y + high, z), _q, _s.set(prop === PROP_LINK ? 1.3 : 1, 1, 1));
        m.scarf?.setMatrixAt(i, _m);
        m.scarf?.setColorAt(i, pc);
      } else m.scarf?.setMatrixAt(i, ZERO);
      if (prop === PROP_FLAG) {
        _q.setFromEuler(_e.set(0, yaw + 0.5 * Math.sin(st.propA[i] || now * 3 + i), 0));
        _m.compose(_p.set(x + 0.15, y + FAN.hands - 0.3, z), _q, _s.set(1, 1, 1));
        m.stick?.setMatrixAt(i, _m);
        _m.compose(_p.set(x + 0.15, y + FAN.hands + 0.45, z), _q, _s.set(1, 1, 1));
        m.flag?.setMatrixAt(i, _m);
        m.flag?.setColorAt(i, pc);
      } else {
        m.stick?.setMatrixAt(i, ZERO);
        m.flag?.setMatrixAt(i, ZERO);
      }
      if (prop === PROP_TORCH) {
        const pulse = 0.75 + 0.35 * Math.sin(now * 5 + driver.crowd.seed[i]);
        _q.setFromEuler(_e.set(0, yaw, 0));
        _m.compose(_p.set(x, y + FAN.hands + 0.15, z), _q, _s.setScalar(pulse));
        m.glow?.setMatrixAt(i, _m);
        m.glow?.setColorAt(i, pc);
      } else m.glow?.setMatrixAt(i, ZERO);
    }
    for (const part of PARTS) {
      const mesh = m[part];
      if (!mesh) continue;
      mesh.instanceMatrix.needsUpdate = true;
      if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
    }
  });

  const instanced = (part: Part, material: React.ReactNode) => (
    <instancedMesh
      key={part}
      ref={(mesh) => {
        meshes.current[part] = mesh;
        if (mesh && !mesh.instanceColor) {
          mesh.instanceColor = new THREE.InstancedBufferAttribute(new Float32Array(n * 3).fill(1), 3);
          mesh.frustumCulled = false;
        }
      }}
      args={[geometries[part], undefined, n]}
    >
      {material}
    </instancedMesh>
  );

  return (
    <group>
      <mesh geometry={terraces} receiveShadow>
        <meshStandardMaterial vertexColors roughness={0.95} />
      </mesh>
      <LedBoards clock={clock} />
      <instancedMesh
        ref={(mesh) => {
          meshes.current.fan = mesh;
          if (mesh && !mesh.instanceColor) {
            mesh.instanceColor = new THREE.InstancedBufferAttribute(new Float32Array(n * 3).fill(1), 3);
            mesh.geometry.setAttribute('aCell', new THREE.InstancedBufferAttribute(cells, 1));
            mesh.frustumCulled = false;
          }
        }}
        args={[geometries.fan, fanMaterial, n]}
        // Shown once the avatar sheet has been drawn (until then the fans would be blank planes).
        visible={false}
      />
      {instanced('card', <meshBasicMaterial side={THREE.DoubleSide} toneMapped={false} />)}
      {instanced('scarf', <meshStandardMaterial roughness={0.8} />)}
      {instanced('flag', <meshStandardMaterial side={THREE.DoubleSide} roughness={0.9} />)}
      {instanced('stick', <meshStandardMaterial color="#d8d8d8" />)}
      {instanced('glow', <meshBasicMaterial transparent opacity={0.9} blending={THREE.AdditiveBlending} depthWrite={false} toneMapped={false} />)}
    </group>
  );
}
