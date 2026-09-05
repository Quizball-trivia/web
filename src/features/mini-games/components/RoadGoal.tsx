'use client';

import { useEffect, useMemo, type RefObject } from 'react';
import { useFrame, useLoader } from '@react-three/fiber';
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { buildPlayerObject, disposeBuiltObject, resolveJoints, SCORE_BODY_URL, SCORE_HAIR_URL } from './ScoreGoalsPlayer3D';
import { createRoadNet, deformRoadNet } from '../lib/roadNet';
import type { KeeperSaveStyle } from '../lib/keeperSaves';
import { sampleGoalkeeper } from './GoalkeeperMotion';
import { ROAD_GOAL_X, ROAD_GOAL_IMPACT, type RoadFinishState } from '../lib/roadFinish';

export function RoadKeeper({ finish, saveStyle = 'catch' }: { finish: RefObject<RoadFinishState>; saveStyle?: KeeperSaveStyle }) {
  const body = useLoader(GLTFLoader, SCORE_BODY_URL);
  const hair = useLoader(GLTFLoader, SCORE_HAIR_URL);
  const built = useMemo(() => {
    const obj = buildPlayerObject(body.scene, { shirt: '#f39432', shorts: '#122238', socks: '#ecf4e9', accent: '#fff1ce', boots: '#d4ed53', gloves: '#f3f5e9' }, 'road-keeper', 1, '#ffffff', { hair: hair.scene, hairStyle: 'Hair_SimpleParted', skin: '#ad7450', hairColor: '#25211e', beard: false });
    return { obj, joints: resolveJoints(obj) };
  }, [body, hair]);
  useEffect(() => () => disposeBuiltObject(built.obj), [built]);
  useFrame(() => {
    if (!built.joints) return;
    const state = finish.current;
    sampleGoalkeeper(built.obj as THREE.Group, built.joints, [1.85, 1.45], state.elapsed ?? 0, state.saved, state.catchPoint, saveStyle);
  }, -1);
  return <group position={[ROAD_GOAL_X, 0, .8]} rotation={[0, -Math.PI / 2, 0]} scale={1.75}><primitive object={built.obj} /></group>;
}

/** A wide goal facing the attack, with fixed posts and a suspended net pocket. */
export function RoadGoal({ finish }: { finish: RefObject<RoadFinishState> }) {
  const net = useMemo(() => createRoadNet(), []);
  useEffect(() => () => net.geometry.dispose(), [net]);
  useFrame(() => {
    const state = finish.current;
    const age = state.elapsed === null || state.saved ? -1 : state.elapsed - ROAD_GOAL_IMPACT;
    deformRoadNet(net, age);
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
