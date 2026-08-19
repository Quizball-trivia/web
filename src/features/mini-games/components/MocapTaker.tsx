'use client';

/**
 * Free-kick taker driven by real Mixamo mocap (taker.glb — X Bot body + a real
 * penalty-kick strike + an idle, built by scripts/build-taker-rig.mjs with the
 * clip's root-motion walk stripped so he kicks in place). Replaces the
 * hand-authored per-persona run-up/kick.
 *
 * The kick clip is retimed so foot contact lands at the shot launch
 * (KICK_LEAD_S) — the ball leaves the boot exactly when the ball-flight starts.
 * Before the shot he stands in the idle; once beaten/scored he holds the
 * follow-through (clampWhenFinished). All ref reads happen in useFrame.
 */

import { useMemo, useRef, useEffect, type RefObject } from 'react';
import { useLoader, useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { buildPlayerObject, SCORE_HAIR_URL, type HairStyleName } from './ScoreGoalsPlayer3D';

const TAKER_URL = '/assets/demos/score/taker.glb';
const KICK_LEAD_S = 0.45;
// Foot contact in the raw clip (peak forward foot swing) ≈ 0.8s; retime so it
// coincides with the ball launch at KICK_LEAD_S.
const CLIP_CONTACT_S = 0.8;
const KICK_TIMESCALE = CLIP_CONTACT_S / KICK_LEAD_S;

interface Timeline {
  start: number | null;
}

export function MocapTaker({
  tl,
  ball,
  aimX,
  id,
  number,
  kit,
  shorts,
  socks,
  skin,
  accent,
  hairColor,
  hairStyle,
  beard,
}: {
  tl: RefObject<Timeline>;
  /** Ball spot [x, y, z] in pitch metres. */
  ball: readonly [number, number, number];
  /** Horizontal aim of the shot (goal x) — the taker faces slightly toward it. */
  aimX: number;
  /** Persona id — keys the clone so kit/hair rebuild only on a new taker. */
  id: string;
  number: number;
  kit: string;
  shorts: string;
  socks: string;
  skin: string;
  accent: string;
  hairColor: string;
  hairStyle: HairStyleName | null;
  beard: boolean;
}) {
  const gltf = useLoader(GLTFLoader, TAKER_URL);
  const hairLib = useLoader(GLTFLoader, SCORE_HAIR_URL);

  // Built once per persona (the component is keyed by id upstream). Reuses the
  // shared UBC builder so the taker gets eyes, eyebrows, hair, a back number
  // and the banded kit exactly like the wall/Score! players.
  const built = useMemo(() => {
    const obj = buildPlayerObject(gltf.scene, { shirt: kit, shorts, accent, socks }, id, number, accent, {
      skin,
      hair: hairLib.scene,
      hairColor,
      hairStyle,
      beard,
    });
    obj.traverse((c) => {
      if ((c as THREE.SkinnedMesh).isSkinnedMesh) c.frustumCulled = false;
    });
    const mixer = new THREE.AnimationMixer(obj);
    const idle = THREE.AnimationClip.findByName(gltf.animations, 'idle');
    const kick = THREE.AnimationClip.findByName(gltf.animations, 'kick');
    const idleAction = idle ? mixer.clipAction(idle) : null;
    const kickAction = kick ? mixer.clipAction(kick) : null;
    if (kickAction) {
      kickAction.clampWhenFinished = true;
      kickAction.setLoop(THREE.LoopOnce, 1);
      kickAction.timeScale = KICK_TIMESCALE;
    }
    return { obj, mixer, idleAction, kickAction };
  }, [gltf, hairLib, id, number, kit, shorts, socks, skin, accent, hairColor, hairStyle, beard]);

  const kicking = useRef(false);
  const root = useRef<THREE.Group | null>(null);

  useEffect(() => {
    built.idleAction?.reset().play();
    kicking.current = false;
    const mixer = built.mixer;
    return () => {
      mixer.stopAllAction();
    };
  }, [built]);

  useFrame((state, dt) => {
    const start = tl.current?.start ?? null;
    if (start != null && !kicking.current && built.kickAction) {
      // Launch the kick so contact hits the ball at start + KICK_LEAD_S.
      kicking.current = true;
      built.kickAction.reset().play();
      if (built.idleAction) built.kickAction.crossFadeFrom(built.idleAction, 0.12, false);
    } else if (start == null && kicking.current) {
      kicking.current = false;
      built.idleAction?.reset().play();
    }
    built.mixer.update(dt);
  });

  // Face the goal (−z), angled a touch toward the aim. The Mixamo body faces
  // +z, so π turns it to look down-pitch.
  const yaw = Math.PI - aimX * 0.03;

  return (
    <group ref={root} position={[ball[0] - 0.55, 0, ball[2] + 0.35]} rotation={[0, yaw, 0]}>
      <primitive object={built.obj} />
    </group>
  );
}

