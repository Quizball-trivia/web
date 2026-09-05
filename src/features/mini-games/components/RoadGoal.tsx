'use client';

import { useEffect, useMemo, type RefObject } from 'react';
import { useFrame, useLoader } from '@react-three/fiber';
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { buildPlayerObject, disposeBuiltObject, resolveJoints, SCORE_BODY_URL, SCORE_HAIR_URL } from './ScoreGoalsPlayer3D';
import type { KeeperSaveStyle } from '../lib/keeperSaves';
import { sampleGoalkeeper } from './GoalkeeperMotion';
import { ROAD_GOAL_X, ROAD_GOAL_IMPACT, type RoadFinishState } from '../lib/roadFinish';

export function RoadKeeper({ finish, saveStyle = 'catch' }: { finish: RefObject<RoadFinishState>; saveStyle?: KeeperSaveStyle }) {
  const body = useLoader(GLTFLoader, SCORE_BODY_URL);
  const hair = useLoader(GLTFLoader, SCORE_HAIR_URL);
  const built = useMemo(() => {
    const obj = buildPlayerObject(body.scene, { shirt: '#f39432', shorts: '#122238', socks: '#ecf4e9', accent: '#fff1ce', boots: '#d4ed53', gloves: '#f3f5e9' }, 'road-keeper', 1, '#ffffff', { hair: hair.scene, hairStyle: 'Hair_SimpleParted', skin: '#ad7450', hairColor: '#25211e', beard: false });
    return { obj, joints: resolveJoints(obj)! };
  }, [body, hair]);
  useEffect(() => () => disposeBuiltObject(built.obj), [built]);
  useFrame(() => {
    const state = finish.current;
    sampleGoalkeeper(built.obj as THREE.Group, built.joints, [1.85, 1.45], state.elapsed ?? 0, state.saved, state.catchPoint, saveStyle);
  }, -1);
  return <group position={[ROAD_GOAL_X, 0, .8]} rotation={[0, -Math.PI / 2, 0]} scale={1.75}><primitive object={built.obj} /></group>;
}

/** A wide goal facing the attack, with fixed posts and a suspended net pocket. */
export function RoadGoal({ finish }: { finish: RefObject<RoadFinishState> }) {
  const net = useMemo(() => {
    const points: number[] = [];
    const line = (a: number[], b: number[]) => points.push(...a, ...b);
    const w = 4.25, h = 3.2, d = 1.8;
    for (let i = 0; i <= 48; i++) {
      const x = -w + i * 2 * w / 48;
      line([x, .04, -d], [x, h, -d]);
      line([x, h, 0], [x, h, -d]);
    }
    for (let i = 0; i <= 20; i++) {
      const y = .04 + i * (h - .04) / 20;
      line([-w, y, -d], [w, y, -d]);
      for (const x of [-w, w]) line([x, y, 0], [x, y, -d]);
    }
    for (let i = 0; i <= 11; i++) {
      const z = -i * d / 11;
      line([-w, h, z], [w, h, z]);
      for (const x of [-w, w]) line([x, .04, z], [x, h, z]);
    }
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(points, 3));
    return { geometry, original: new Float32Array(points) };
  }, []);
  useEffect(() => () => net.geometry.dispose(), [net]);
  useFrame(() => {
    const state = finish.current;
    const age = state.elapsed === null || state.saved ? -1 : state.elapsed - ROAD_GOAL_IMPACT;
    const positions = net.geometry.getAttribute('position') as THREE.BufferAttribute;
    for (let i = 0; i < positions.count; i++) {
      const x = net.original[i * 3], y = net.original[i * 3 + 1], z = net.original[i * 3 + 2];
      const pinned = Math.sin((x + 4.25) / 8.5 * Math.PI) * Math.sin(y / 3.2 * Math.PI);
      const pocket = Math.exp(-((x - 3.15) ** 2 + (y - 2.15) ** 2) * 1.2);
      const wave = age > 0 ? Math.sin(Math.min(age * 12, Math.PI)) * Math.exp(-age * 2.8) * pocket * .65 : 0;
      positions.setZ(i, z - (z === -1.8 ? pinned * .1 + wave : 0));
    }
    positions.needsUpdate = true;
  });
  return <group position={[ROAD_GOAL_X, 0, .8]} rotation={[0, -Math.PI / 2, 0]}>
    {[-4.25, 4.25].map(x => <group key={x}>
      <mesh position={[x, 1.6, 0]} castShadow><cylinderGeometry args={[.07, .07, 3.2, 20]} /><meshStandardMaterial color="#f7faf8" roughness={.35} metalness={.16} /></mesh>
      <mesh position={[x, .055, -.9]} castShadow><boxGeometry args={[.065, .065, 1.9]} /><meshStandardMaterial color="#9caeb2" roughness={.5} /></mesh>
      <mesh position={[x, 1.6, -1.8]}><cylinderGeometry args={[.022, .022, 3.2, 10]} /><meshStandardMaterial color="#83999d" roughness={.5} /></mesh>
    </group>)}
    <mesh position={[0, 3.2, 0]} rotation={[0, 0, Math.PI / 2]} castShadow><cylinderGeometry args={[.07, .07, 8.5, 20]} /><meshStandardMaterial color="#f7faf8" roughness={.35} metalness={.16} /></mesh>
    <lineSegments geometry={net.geometry}><lineBasicMaterial color="#dae8e5" transparent opacity={.55} depthWrite={false} /></lineSegments>
  </group>;
}
