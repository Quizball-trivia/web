'use client';

/**
 * Dev harness: the cloth goal net on its own. A ball is shot into a different part of the goal every few seconds and
 * the net takes it; drag to orbit, scroll to zoom, slow motion to study the bulge.
 */

import { useEffect, useRef, useState } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { cn } from '@/lib/utils';
import { ClothGoal } from '@/features/zone-match/ZoneMatchGoal3D';
import { intoTheNet } from '@/features/zone-match/zoneMatch3d.director';
import { BALL_R } from '@/features/zone-match/zoneMatch3d.layout';
import { makeBallMaterial } from '@/features/zone-match/zoneMatch3d.balls';

/** Where each shot hits the back of the net (goal-local x, y), and where it's struck from. */
const SHOTS = [
  { x: 3.1, y: 2.4, from: -6 },
  { x: -2.6, y: 0.6, from: 5 },
  { x: 0.4, y: 1.6, from: 0 },
  { x: -3.3, y: 2.6, from: 7 },
  { x: 2.2, y: 0.5, from: -3 },
];
const FLIGHT = 0.55;
/** The shot's scratch vectors (one harness on the page). */
const tmp = { from: new THREE.Vector3(), contact: new THREE.Vector3(), out: new THREE.Vector3() };
const CYCLE = 3.4;

function Orbit() {
  const camera = useThree((s) => s.camera);
  const dom = useThree((s) => s.gl.domElement);
  useEffect(() => {
    const controls = new OrbitControls(camera, dom);
    controls.target.set(0, 1.3, -0.9);
    controls.update();
    return () => controls.dispose();
  }, [camera, dom]);
  return null;
}

function NetScene({ speed }: { speed: number }) {
  const [ballMaterial] = useState(() => makeBallMaterial('classic'));
  const ball = useRef<THREE.Mesh>(null);
  const clock = useRef(0);
  useEffect(() => () => ballMaterial.dispose(), [ballMaterial]);
  useFrame((_, dt) => {
    clock.current += dt * speed;
    const n = Math.floor(clock.current / CYCLE);
    const t = clock.current - n * CYCLE;
    const shot = SHOTS[n % SHOTS.length];
    tmp.from.set(shot.from, BALL_R, 11);
    tmp.contact.set(shot.x, shot.y, -1.8 + BALL_R);
    if (t < FLIGHT) {
      const k = t / FLIGHT;
      tmp.out.lerpVectors(tmp.from, tmp.contact, k);
      tmp.out.y += 1.2 * k * (1 - k);
    } else intoTheNet(tmp.out, tmp.from, tmp.contact, t - FLIGHT);
    ball.current?.position.copy(tmp.out);
  });
  return (
    <>
      <mesh ref={ball} material={ballMaterial} castShadow>
        <sphereGeometry args={[BALL_R, 32, 24]} />
      </mesh>
      <ClothGoal ball={() => tmp.out} rate={() => speed} />
      <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[40, 40]} />
        <meshStandardMaterial color="#2f8f5b" roughness={0.95} />
      </mesh>
    </>
  );
}

export default function DevGoalNetPage() {
  const [speed, setSpeed] = useState(0.5);
  if (process.env.NODE_ENV !== 'development') {
    return <div className="flex min-h-dvh items-center justify-center bg-surface-page font-poppins text-white">Dev only</div>;
  }
  return (
    <div className="relative h-dvh bg-[#07111d] font-poppins text-white">
      <Canvas shadows camera={{ position: [9.5, 2.6, -0.6], fov: 45 }} dpr={[1, 2]}>
        <color attach="background" args={['#07111d']} />
        <hemisphereLight args={['#ffffff', '#1d3b2a', 1.0]} />
        <directionalLight position={[6, 10, 8]} intensity={1.8} castShadow />
        <NetScene speed={speed} />
        <Orbit />
      </Canvas>
      <div className="absolute left-4 top-4 flex items-center gap-2">
        <span className="text-sm font-bold uppercase">Goal net</span>
        {[0.1, 0.25, 0.5, 1].map((s) => (
          <button key={s} type="button" onClick={() => setSpeed(s)} className={cn('rounded-full px-2 py-1 font-mono text-xs', speed === s ? 'bg-white text-black' : 'bg-white/10')}>
            {s}×
          </button>
        ))}
      </div>
    </div>
  );
}
