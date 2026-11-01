'use client';

/** A box goal — posts, crossbar, back stanchions, ground and top bars — with the cloth net the ball pushes into. */

import { useEffect, useMemo, useRef, useState } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { GoalNet, makeNetTexture } from './zoneMatch3d.net';

const W = 4.25;
const H = 3.2;
const D = 1.8;

type Props = {
  position?: [number, number, number];
  rotation?: [number, number, number];
  /** The ball's centre in world space this frame. */
  ball: () => THREE.Vector3;
  /** Time scale (the lab's slow motion and pause). */
  rate?: () => number;
};

export function ClothGoal({ position, rotation, ball, rate }: Props) {
  const [net] = useState(() => new GoalNet());
  const [texture] = useState(() => makeNetTexture());
  const frame = useRef<THREE.Group>(null);
  const local = useMemo(() => new THREE.Vector3(), []);
  useEffect(
    () => () => {
      net.dispose();
      texture.dispose();
    },
    [net, texture],
  );
  useFrame((_, dt) => {
    if (!frame.current) return;
    frame.current.updateMatrixWorld();
    net.update(dt * (rate ? rate() : 1), frame.current.worldToLocal(local.copy(ball())));
  });
  return (
    <group ref={frame} position={position} rotation={rotation}>
      {[-W, W].map((x) => (
        <group key={x}>
          <mesh position={[x, H / 2, 0]} castShadow>
            <cylinderGeometry args={[0.07, 0.07, H, 20]} />
            <meshStandardMaterial color="#f7faf8" roughness={0.35} metalness={0.16} />
          </mesh>
          <mesh position={[x, 0.055, -D / 2]}>
            <boxGeometry args={[0.065, 0.065, D + 0.1]} />
            <meshStandardMaterial color="#9caeb2" roughness={0.5} />
          </mesh>
          <mesh position={[x, H / 2, -D]}>
            <cylinderGeometry args={[0.022, 0.022, H, 10]} />
            <meshStandardMaterial color="#83999d" roughness={0.5} />
          </mesh>
          <mesh position={[x, H, -D / 2]} rotation={[Math.PI / 2, 0, 0]}>
            <cylinderGeometry args={[0.022, 0.022, D, 10]} />
            <meshStandardMaterial color="#83999d" roughness={0.5} />
          </mesh>
        </group>
      ))}
      <mesh position={[0, H, 0]} rotation={[0, 0, Math.PI / 2]} castShadow>
        <cylinderGeometry args={[0.07, 0.07, 2 * W, 20]} />
        <meshStandardMaterial color="#f7faf8" roughness={0.35} metalness={0.16} />
      </mesh>
      <mesh position={[0, H, -D]} rotation={[0, 0, Math.PI / 2]}>
        <cylinderGeometry args={[0.022, 0.022, 2 * W, 10]} />
        <meshStandardMaterial color="#83999d" roughness={0.5} />
      </mesh>
      <mesh geometry={net.geometry} renderOrder={2}>
        <meshStandardMaterial map={texture} color="#eef5f3" transparent alphaTest={0.08} side={THREE.DoubleSide} roughness={0.9} depthWrite={false} />
      </mesh>
    </group>
  );
}
