'use client';

/**
 * Dev lab for the 3D stadium (/dev/stadium-3d): the bowl round the zone match's pitch with every crowd scene from the
 * 2D playground, a camera you can drag round (wheel to zoom) and presets for the match's own shots.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { cn } from '@/lib/utils';
import { GOAL_X, PITCH_HALF_W } from '@/features/zone-match/zoneMatch3d.layout';
import { SCENE_GROUPS, SCENES, type CrowdScene } from './crowd/scenes';
import { Stadium3D } from './Stadium3D';

type Orbit = { az: number; el: number; dist: number; target: [number, number, number] };

const PRESETS: { id: string; label: string; orbit: Orbit }[] = [
  { id: 'broadcast', label: 'Match camera', orbit: { az: 0, el: 0.2, dist: 42, target: [0, 3, -6] } },
  { id: 'tifo', label: 'Tifo stand', orbit: { az: 0, el: 0.12, dist: 30, target: [0, 7, -20] } },
  { id: 'goal', label: 'Behind the goal', orbit: { az: Math.PI / 2, el: 0.18, dist: 40, target: [0, 3, 0] } },
  { id: 'aerial', label: 'Aerial', orbit: { az: 0.5, el: 1.0, dist: 78, target: [0, 0, 0] } },
];

function Pitch() {
  const texture = useMemo(() => {
    const canvas = document.createElement('canvas');
    canvas.width = 1024;
    canvas.height = 640;
    const ctx = canvas.getContext('2d')!;
    for (let i = 0; i < 12; i += 1) {
      ctx.fillStyle = i % 2 ? '#2F8F3F' : '#36A048';
      ctx.fillRect((i * 1024) / 12, 0, 1024 / 12 + 1, 640);
    }
    ctx.strokeStyle = 'rgba(255,255,255,0.9)';
    ctx.lineWidth = 5;
    ctx.strokeRect(20, 20, 984, 600);
    ctx.beginPath();
    ctx.moveTo(512, 20);
    ctx.lineTo(512, 620);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(512, 320, 80, 0, Math.PI * 2);
    ctx.stroke();
    ctx.strokeRect(20, 180, 150, 280);
    ctx.strokeRect(854, 180, 150, 280);
    const t = new THREE.CanvasTexture(canvas);
    t.colorSpace = THREE.SRGBColorSpace;
    return t;
  }, []);
  useEffect(() => () => texture.dispose(), [texture]);
  return (
    <group>
      {/* The track round the pitch. */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.02, 0]}>
        <planeGeometry args={[2 * (GOAL_X + 6), 2 * (PITCH_HALF_W + 6)]} />
        <meshStandardMaterial color="#1a1d22" roughness={1} />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[2 * (GOAL_X + 1), 2 * PITCH_HALF_W]} />
        <meshStandardMaterial map={texture} roughness={0.95} />
      </mesh>
      {[-1, 1].map((dir) => (
        <group key={dir} position={[dir * GOAL_X, 0, 0]}>
          {[-3.66, 3.66].map((z) => (
            <mesh key={z} position={[0, 1.22, z]}>
              <boxGeometry args={[0.12, 2.44, 0.12]} />
              <meshStandardMaterial color="#ffffff" />
            </mesh>
          ))}
          <mesh position={[0, 2.44, 0]}>
            <boxGeometry args={[0.12, 0.12, 7.44]} />
            <meshStandardMaterial color="#ffffff" />
          </mesh>
        </group>
      ))}
    </group>
  );
}

/** Drag to orbit, wheel to zoom; the camera eases to a preset. */
function OrbitRig({ orbit }: { orbit: React.RefObject<Orbit> }) {
  const { camera, gl } = useThree();
  const shown = useRef<Orbit>({ ...orbit.current, target: [...orbit.current.target] });
  useEffect(() => {
    const el = gl.domElement;
    let drag: { x: number; y: number } | null = null;
    const down = (e: PointerEvent) => {
      drag = { x: e.clientX, y: e.clientY };
      el.setPointerCapture(e.pointerId);
    };
    const move = (e: PointerEvent) => {
      if (!drag) return;
      const o = orbit.current;
      o.az -= (e.clientX - drag.x) * 0.006;
      o.el = Math.max(0.03, Math.min(1.45, o.el + (e.clientY - drag.y) * 0.004));
      drag = { x: e.clientX, y: e.clientY };
    };
    const up = () => {
      drag = null;
    };
    const wheel = (e: WheelEvent) => {
      e.preventDefault();
      orbit.current.dist = Math.max(8, Math.min(140, orbit.current.dist * (1 + e.deltaY * 0.001)));
    };
    el.addEventListener('pointerdown', down);
    el.addEventListener('pointermove', move);
    el.addEventListener('pointerup', up);
    el.addEventListener('wheel', wheel, { passive: false });
    return () => {
      el.removeEventListener('pointerdown', down);
      el.removeEventListener('pointermove', move);
      el.removeEventListener('pointerup', up);
      el.removeEventListener('wheel', wheel);
    };
  }, [gl, orbit]);
  useFrame((_, delta) => {
    const k = 1 - Math.exp(-6 * Math.min(delta, 0.1));
    const o = orbit.current;
    const s = shown.current;
    s.az += (o.az - s.az) * k;
    s.el += (o.el - s.el) * k;
    s.dist += (o.dist - s.dist) * k;
    for (let i = 0; i < 3; i += 1) s.target[i] += (o.target[i] - s.target[i]) * k;
    camera.position.set(
      s.target[0] + s.dist * Math.cos(s.el) * Math.sin(s.az),
      s.target[1] + s.dist * Math.sin(s.el),
      s.target[2] + s.dist * Math.cos(s.el) * Math.cos(s.az),
    );
    camera.lookAt(s.target[0], s.target[1], s.target[2]);
  });
  return null;
}

export function StadiumLab() {
  const [sceneId, setSceneId] = useState('idle');
  const [text, setText] = useState('QUIZBALL');
  const [run, setRun] = useState(0);
  const scene: CrowdScene = SCENES.find((s) => s.id === sceneId) ?? SCENES[0];
  const orbit = useRef<Orbit>({ ...PRESETS[0].orbit, target: [...PRESETS[0].orbit.target] });
  // The scene's clock (seconds); the stadium restarts its scene on each replay.
  const clock = useCallback(() => performance.now() / 1000, []);
  const fps = useRef<HTMLSpanElement>(null);
  useEffect(() => {
    let raf = 0;
    let frames = 0;
    let since = performance.now();
    const tick = (now: number) => {
      raf = requestAnimationFrame(tick);
      frames += 1;
      if (now - since > 500) {
        if (fps.current) fps.current.textContent = `${Math.round((frames * 1000) / (now - since))} fps`;
        frames = 0;
        since = now;
      }
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, []);

  const pick = (id: string) => {
    setSceneId(id);
    setRun((n) => n + 1);
  };

  return (
    <div className="flex h-dvh flex-col overflow-hidden bg-surface-page font-poppins text-white md:flex-row">
      <aside className="order-2 flex min-h-0 flex-1 flex-col border-white/10 md:order-1 md:w-[320px] md:flex-none md:border-r">
        <div className="flex flex-wrap items-center gap-2 border-b border-white/10 p-3">
          <span className="text-xs font-bold uppercase text-white/60">Crowd scene</span>
          <span ref={fps} className="ml-auto font-mono text-[11px] text-white/50" />
        </div>
        {scene.usesText && (
          <div className="border-b border-white/10 p-3">
            <input
              value={text}
              onChange={(e) => setText(e.target.value.toUpperCase().slice(0, 18))}
              className="w-full rounded-lg bg-white/10 px-3 py-2 text-sm font-bold"
              aria-label="Mosaic text"
            />
          </div>
        )}
        <div className="min-h-0 flex-1 overflow-y-auto p-2">
          {SCENE_GROUPS.map((group) => (
            <div key={group.id} className="mb-3">
              <div className="px-2 py-1 text-[10px] font-bold uppercase tracking-wide text-white/45">{group.label}</div>
              {group.scenes.map((s) => (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => pick(s.id)}
                  className={cn('block w-full rounded-lg px-3 py-1.5 text-left text-sm', s.id === sceneId ? 'bg-white/15 font-bold' : 'hover:bg-white/5')}
                >
                  {s.label}
                  <span className="block text-[10px] font-normal text-white/45">{s.team}</span>
                </button>
              ))}
            </div>
          ))}
        </div>
      </aside>
      <main className="relative order-1 h-[60dvh] flex-none md:order-2 md:h-auto md:flex-1">
        <Canvas shadows camera={{ position: [0, 12, 42], fov: 40, near: 0.1, far: 400 }} gl={{ antialias: true }}>
          <color attach="background" args={['#07111d']} />
          <fog attach="fog" args={['#07111d', 90, 200]} />
          <hemisphereLight args={['#cfe3ff', '#1b2a1b', 0.9]} />
          <directionalLight position={[20, 40, 25]} intensity={1.6} castShadow />
          <directionalLight position={[-25, 30, -20]} intensity={0.7} />
          <Pitch />
          <Stadium3D scene={scene} text={text} replay={run} clock={clock} />
          <OrbitRig orbit={orbit} />
        </Canvas>
        <div className="absolute left-3 top-3 max-w-[60%] rounded-xl bg-black/55 px-3 py-2 backdrop-blur">
          <div className="text-sm font-bold">{scene.label}</div>
          <div className="text-xs text-white/70">{scene.blurb}</div>
        </div>
        <div className="absolute bottom-3 left-3 right-3 flex flex-wrap gap-2">
          <button type="button" onClick={() => setRun((n) => n + 1)} className="rounded-full bg-white px-4 py-1.5 text-xs font-bold uppercase text-black">
            Replay
          </button>
          {PRESETS.map((p) => (
            <button
              key={p.id}
              type="button"
              onClick={() => {
                orbit.current = { ...p.orbit, target: [...p.orbit.target] };
              }}
              className="rounded-full bg-white/15 px-3 py-1.5 text-xs font-bold uppercase"
            >
              {p.label}
            </button>
          ))}
        </div>
      </main>
    </div>
  );
}
