'use client';

/**
 * One seated host. Both models share one skeleton (the Table Derby demo's
 * guest rig: Hips … Head, no fingers or face rig) and its SeatedIdle clip;
 * each host starts the loop at a different point so they never breathe in step.
 *
 * After each mixer update, a pose layer adds the acting on top: the head
 * turns toward the other host (or the camera, when talking to the player),
 * gestures and anger from `acting.ts`. Every turn is about a host axis in
 * world space, applied parent-first along the spine and arms.
 */

import { useEffect, useMemo, useRef, type RefObject } from 'react';
import { useFrame, useLoader } from '@react-three/fiber';
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { MeshoptDecoder } from 'three/examples/jsm/libs/meshopt_decoder.module.js';
import { clone as cloneSkinned } from 'three/examples/jsm/utils/SkeletonUtils.js';
import { SEATS, type HostId, type HostModel } from './studioLayout';
import { gesturePose, moodPose, type BoneTurn, type Hand, type HostAct } from './acting';

/** The host models are meshopt-compressed (EXT_meshopt_compression). */
function withMeshopt(loader: GLTFLoader) {
  loader.setMeshoptDecoder(MeshoptDecoder);
}

/** Phones and low-memory devices get the lighter model, as in the demo. */
export function prefersLightModels() {
  if (typeof window === 'undefined') return false;
  const memory = (navigator as Navigator & { deviceMemory?: number }).deviceMemory ?? 8;
  return Math.min(window.innerWidth, window.innerHeight) < 600 || memory <= 4;
}

const IDLE_OFFSET_S: Record<HostId, number> = { tato: 0, kala: 0.9 };

/** The hand nearer the camera (both hosts face inward). */
const CAMERA_HAND: Record<HostId, Hand> = { tato: 'Right', kala: 'Left' };

/** Bones the pose layer may turn, parents before children. */
const POSE_BONES = [
  'Spine', 'Spine1', 'Spine2', 'Neck', 'Head',
  'LeftShoulder', 'LeftArm', 'LeftForeArm', 'RightShoulder', 'RightArm', 'RightForeArm',
] as const;

/** How a gaze turn is shared out, base of the neck first. */
const GAZE_SHARE: Partial<Record<(typeof POSE_BONES)[number], number>> = { Neck: 0.4, Head: 0.6 };
const MAX_GAZE = THREE.MathUtils.degToRad(50);

const WORLD_UP = new THREE.Vector3(0, 1, 0);
const parentQuat = new THREE.Quaternion();
const turn = new THREE.Quaternion();
const axisTurn = new THREE.Quaternion();
const headPos = new THREE.Vector3();
const projected = new THREE.Vector3();
const ABOVE_HEAD = new THREE.Vector3(0, 0.3, 0);

const STEAM_PUFFS = 8;

/** A soft round puff for the anger steam. */
const puffTexture = (() => {
  if (typeof document === 'undefined') return null;
  const c = document.createElement('canvas');
  c.width = c.height = 64;
  const ctx = c.getContext('2d');
  if (!ctx) return null;
  const g = ctx.createRadialGradient(32, 32, 0, 32, 32, 32);
  g.addColorStop(0, 'rgba(255,255,255,0.9)');
  g.addColorStop(0.5, 'rgba(255,255,255,0.35)');
  g.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 64, 64);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
})();

export interface StudioHostProps {
  id: HostId;
  spec: HostModel;
  light: boolean;
  act?: HostAct;
  /** An element kept pinned (via transform) just above the host's head, for speech bubbles. */
  anchor?: RefObject<HTMLElement | null>;
}

export function StudioHost({ id, spec, light, act, anchor }: StudioHostProps) {
  const seat = SEATS[id];
  const gltf = useLoader(GLTFLoader, light ? spec.lod1 : spec.lod0, withMeshopt);

  const { root, mixer, idle, bones, head } = useMemo(() => {
    const obj = cloneSkinned(gltf.scene);
    obj.traverse((child) => {
      const mesh = child as THREE.SkinnedMesh;
      if (!mesh.isMesh) return;
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      // Skinned bounds don't follow the pose; never cull a host mid-shot.
      mesh.frustumCulled = false;
    });
    const mix = new THREE.AnimationMixer(obj);
    const clip = THREE.AnimationClip.findByName(gltf.animations, spec.clip);
    if (!clip) console.warn(`[orshabatoba] ${id}: no ${spec.clip} clip`);
    const list = POSE_BONES.map((name) => ({
      name,
      bone: obj.getObjectByName(name),
      /** The clip's rotation before the layer, and the rotation after it (all-zero until first applied). */
      base: new THREE.Quaternion(),
      turned: new THREE.Quaternion(0, 0, 0, 0),
      world: new THREE.Quaternion(),
    }));
    return { root: obj, mixer: mix, idle: clip ? mix.clipAction(clip) : null, bones: list, head: obj.getObjectByName('Head') };
  }, [gltf, id, spec.clip]);

  // Started here, not in the memo, so a Strict Mode cleanup/setup replay restarts it.
  useEffect(() => {
    if (!idle) return;
    idle.reset().play();
    mixer.setTime(IDLE_OFFSET_S[id] % idle.getClip().duration);
    return () => {
      mixer.stopAllAction();
    };
  }, [idle, mixer, id]);

  const frame = useMemo(() => {
    const fwd = new THREE.Vector3(Math.sin(seat.yaw), 0, Math.cos(seat.yaw));
    // A character facing +Z has its left on +X; yaw carries that round with it.
    const left = new THREE.Vector3(Math.cos(seat.yaw), 0, -Math.sin(seat.yaw));
    const other = SEATS[id === 'tato' ? 'kala' : 'tato'];
    const toOther = Math.atan2(other.position[0] - seat.position[0], other.position[2] - seat.position[2]) - seat.yaw;
    return { fwd, left, toOther };
  }, [id, seat]);

  /** When the current gesture started (clock seconds), keyed by its replay key. */
  const gestureStart = useRef<{ key: number; at: number } | null>(null);
  const gaze = useRef(frame.toOther);
  const steam = useRef<THREE.Group>(null);

  useFrame((state, delta) => {
    mixer.update(Math.min(delta, 0.1));
    const now = state.clock.elapsedTime;

    // Gaze: ease toward the other host or the camera.
    const toCamera = Math.atan2(state.camera.position.x - seat.position[0], state.camera.position.z - seat.position[2]) - seat.yaw;
    const target = THREE.MathUtils.clamp(act?.look === 'camera' ? toCamera : frame.toOther, -MAX_GAZE, MAX_GAZE);
    gaze.current += (target - gaze.current) * (1 - Math.exp(-delta * 6));

    const g = act?.gesture;
    if (g && gestureStart.current?.key !== g.key) gestureStart.current = { key: g.key, at: now };
    const turns: BoneTurn[] = [
      ...moodPose(act?.anger ?? 0, now),
      ...(g && gestureStart.current ? gesturePose(g.name, now - gestureStart.current.at, CAMERA_HAND[id]) : []),
    ];

    for (const b of bones) {
      const { bone } = b;
      if (!bone?.parent) continue;
      // The mixer skips writing a bone whose clip value didn't change since
      // last frame, so it may still hold last frame's layer: undo that first.
      if (bone.quaternion.equals(b.turned)) bone.quaternion.copy(b.base);
      b.base.copy(bone.quaternion);
      b.world.identity();
      const share = GAZE_SHARE[b.name];
      if (share) b.world.multiply(axisTurn.setFromAxisAngle(WORLD_UP, gaze.current * share));
      for (const t of turns) {
        if (t.bone !== b.name) continue;
        b.world.premultiply(axisTurn.setFromAxisAngle(t.axis === 'up' ? WORLD_UP : frame.left, THREE.MathUtils.degToRad(t.deg)));
      }
      bone.parent.getWorldQuaternion(parentQuat);
      // World-space turn expressed in the bone's parent frame.
      turn.copy(b.world).premultiply(parentQuat.clone().invert()).multiply(parentQuat);
      bone.quaternion.premultiply(turn);
      b.turned.copy(bone.quaternion);
    }

    if (!head) return;
    head.getWorldPosition(headPos);

    const puffs = steam.current;
    if (puffs) {
      const on = (act?.anger ?? 0) >= 3;
      puffs.visible = on;
      if (on) {
        puffs.children.forEach((p, i) => {
          const life = (now * 0.9 + i / STEAM_PUFFS) % 1;
          const side = i % 2 ? 1 : -1;
          p.position.set(headPos.x + frame.left.x * side * 0.09, headPos.y + 0.12 + life * 0.35, headPos.z + frame.left.z * side * 0.09);
          p.scale.setScalar(0.08 + life * 0.22);
          (p as THREE.Sprite).material.opacity = 0.7 * Math.sin(Math.PI * life);
        });
      }
    }

    const el = anchor?.current;
    if (el) {
      projected.copy(headPos).add(ABOVE_HEAD).project(state.camera);
      // Kept far enough from the edges that a centred bubble (≤ 20rem / 80vw) stays on screen.
      const margin = Math.min(170, state.size.width * 0.41);
      const x = THREE.MathUtils.clamp((projected.x * 0.5 + 0.5) * state.size.width, margin, state.size.width - margin);
      // The bubble grows upward from the anchor: keep its top on screen too.
      const bubbleHeight = (el.firstElementChild as HTMLElement | null)?.offsetHeight ?? 0;
      const y = THREE.MathUtils.clamp((-projected.y * 0.5 + 0.5) * state.size.height, bubbleHeight + 8, state.size.height);
      el.style.setProperty('transform', `translate3d(${x.toFixed(1)}px, ${y.toFixed(1)}px, 0)`);
      el.style.setProperty('visibility', projected.z < 1 ? 'visible' : 'hidden');
    }
  });

  return (
    <>
      <group position={[seat.position[0], seat.position[1] + spec.floorOffset, seat.position[2]]} rotation={[0, seat.yaw, 0]}>
        <primitive object={root} />
      </group>
      <group ref={steam} visible={false}>
        {Array.from({ length: STEAM_PUFFS }, (_, i) => (
          <sprite key={i}>
            <spriteMaterial map={puffTexture} color="#f4f1ec" transparent depthWrite={false} />
          </sprite>
        ))}
      </group>
    </>
  );
}
