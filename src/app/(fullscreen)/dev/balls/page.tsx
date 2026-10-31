'use client';

/** Dev harness: the five match-ball designs, spinning, side by side; click one to use it in the match. */

import { useEffect, useMemo, useRef } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { cn } from '@/lib/utils';
import { BALL_STYLES, makeBallMaterial, setBallStyle, useBallStyle, type BallStyle } from '@/features/zone-match/zoneMatch3d.balls';

function SpinningBall({ style }: { style: BallStyle }) {
  const mesh = useRef<THREE.Mesh>(null);
  const material = useMemo(() => makeBallMaterial(style), [style]);
  const geometry = useMemo(() => new THREE.SphereGeometry(1, 64, 48), []);
  useEffect(() => () => {
    material.dispose();
    geometry.dispose();
  }, [material, geometry]);
  useFrame((_, dt) => {
    if (!mesh.current) return;
    mesh.current.rotation.y += dt * 0.7;
    mesh.current.rotation.x += dt * 0.25;
  });
  return <mesh ref={mesh} geometry={geometry} material={material} />;
}

export default function DevBallsPage() {
  const chosen = useBallStyle();
  if (process.env.NODE_ENV !== 'development') {
    return <div className="flex min-h-dvh items-center justify-center bg-surface-page font-poppins text-white">Dev only</div>;
  }
  return (
    <div className="min-h-dvh bg-surface-page p-6 font-poppins text-white">
      <h1 className="mb-1 text-lg font-bold uppercase">Match balls</h1>
      <p className="mb-5 text-sm text-white/60">Click one to use it in the match (kept in this browser).</p>
      <div className="grid grid-cols-2 gap-4 md:grid-cols-5">
        {BALL_STYLES.map((b) => (
          <button
            key={b.id}
            type="button"
            onClick={() => setBallStyle(b.id)}
            className={cn('flex flex-col items-center rounded-2xl p-3', chosen === b.id ? 'bg-white/15 ring-2 ring-brand-yellow' : 'bg-white/5 hover:bg-white/10')}
          >
            <div className="aspect-square w-full">
              <Canvas camera={{ position: [0, 0, 3.1], fov: 40 }} dpr={[1, 2]}>
                <color attach="background" args={['#0d1a16']} />
                <hemisphereLight args={['#ffffff', '#1d3b2a', 1.1]} />
                <directionalLight position={[3, 4, 5]} intensity={1.6} />
                <SpinningBall style={b.id} />
              </Canvas>
            </div>
            <span className="mt-2 text-sm font-bold">{b.label}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
