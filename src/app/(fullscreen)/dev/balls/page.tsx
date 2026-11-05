'use client';

/**
 * Dev harness: every match-ball design, spinning, side by side; click one to use it in the match.
 * One WebGL canvas behind the page draws each ball into its card's box (browsers cap live WebGL contexts at ~16).
 */

import { useEffect, useRef, type RefObject } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { cn } from '@/lib/utils';
import { BALL_STYLES, makeBallMaterial, setBallStyle, useBallStyle, type BallStyle } from '@/features/zone-match/zoneMatch3d.balls';

type Slots = Map<BallStyle, HTMLDivElement>;

type View = { id: BallStyle; scene: THREE.Scene; mesh: THREE.Mesh; camera: THREE.PerspectiveCamera };

function makeViews(): View[] {
  const geometry = new THREE.SphereGeometry(1, 64, 48);
  return BALL_STYLES.map((b) => {
    const scene = new THREE.Scene();
    scene.add(new THREE.HemisphereLight('#ffffff', '#1d3b2a', 1.1));
    const sun = new THREE.DirectionalLight('#ffffff', 1.6);
    sun.position.set(3, 4, 5);
    scene.add(sun);
    const mesh = new THREE.Mesh(geometry, makeBallMaterial(b.id));
    scene.add(mesh);
    const camera = new THREE.PerspectiveCamera(40, 1, 0.1, 20);
    camera.position.set(0, 0, 3.1);
    return { id: b.id, scene, mesh, camera };
  });
}

const CLEAR = new THREE.Color('#000000');

function BallViews({ slots }: { slots: RefObject<Slots> }) {
  const views = useRef<View[] | null>(null);
  useEffect(
    () => () => {
      views.current?.forEach((v) => (v.mesh.material as THREE.Material).dispose());
      views.current?.[0]?.mesh.geometry.dispose();
      views.current = null;
    },
    [],
  );
  useFrame(({ gl }, dt) => {
    views.current ??= makeViews();
    const height = gl.domElement.clientHeight;
    gl.setScissorTest(false);
    gl.setClearColor(CLEAR, 0);
    gl.clear();
    gl.setScissorTest(true);
    for (const v of views.current) {
      const el = slots.current?.get(v.id);
      if (!el) continue;
      const r = el.getBoundingClientRect();
      if (r.bottom < 0 || r.top > height || r.width === 0) continue;
      v.mesh.rotation.y += dt * 0.7;
      v.mesh.rotation.x += dt * 0.25;
      const y = height - r.bottom;
      gl.setViewport(r.left, y, r.width, r.height);
      gl.setScissor(r.left, y, r.width, r.height);
      gl.render(v.scene, v.camera);
    }
    gl.setScissorTest(false);
  }, 1);
  return null;
}

export default function DevBallsPage() {
  const chosen = useBallStyle();
  const slots = useRef<Slots>(new Map());
  if (process.env.NODE_ENV !== 'development') {
    return <div className="flex min-h-dvh items-center justify-center bg-surface-page font-poppins text-white">Dev only</div>;
  }
  const card = (b: (typeof BALL_STYLES)[number]) => (
    <button
      key={b.id}
      type="button"
      onClick={() => setBallStyle(b.id)}
      className={cn('flex flex-col items-center rounded-2xl p-3', chosen === b.id ? 'bg-white/15 ring-2 ring-brand-yellow' : 'bg-white/5 hover:bg-white/10')}
    >
      <div
        ref={(el) => {
          if (el) slots.current.set(b.id, el);
          else slots.current.delete(b.id);
        }}
        className="aspect-square w-full"
      />
      <span className="mt-2 text-sm font-bold">{b.label}</span>
    </button>
  );
  return (
    <div className="relative min-h-dvh bg-surface-page font-poppins text-white">
      <Canvas className="!fixed inset-0 !pointer-events-none" dpr={[1, 2]} gl={{ antialias: true }} onCreated={({ gl }) => { gl.autoClear = false; }}>
        <BallViews slots={slots} />
      </Canvas>
      <div className="relative p-6">
        <h1 className="mb-1 text-lg font-bold uppercase">Match balls</h1>
        <p className="mb-5 text-sm text-white/60">Click one to use it in the match (kept in this browser).</p>
        <div className="grid grid-cols-2 gap-4 md:grid-cols-5">{BALL_STYLES.filter((b) => !b.famous).map(card)}</div>
        <h2 className="mb-1 mt-8 text-base font-bold uppercase">Famous balls, recreated</h2>
        <p className="mb-5 text-sm text-white/60">Our own takes on the look of iconic tournament balls — no makers&apos; marks or names.</p>
        <div className="grid grid-cols-2 gap-4 md:grid-cols-6">{BALL_STYLES.filter((b) => b.famous).map(card)}</div>
      </div>
    </div>
  );
}
