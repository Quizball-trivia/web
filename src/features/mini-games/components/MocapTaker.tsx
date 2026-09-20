'use client';

/**
 * Free-kick taker using the remodeled Blender footballer and authored strike.
 *
 * The kick clip is retimed so foot contact lands at the shot launch
 * (KICK_LEAD_S) — the ball leaves the boot exactly when the ball-flight starts.
 * The strike holds its follow-through; a scored shot blends into a restrained
 * celebration. All ref reads happen in useFrame.
 */

import { useMemo, useRef, useEffect, type RefObject } from 'react';
import { useLoader, useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { buildPlayerObject, disposeBuiltObject, SCORE_HAIR_URL, SCORE_BODY_URL, type HairStyleName } from './ScoreGoalsPlayer3D';

import { FOOTBALL_STYLES, footballStyleForPlayer } from '../lib/footballActions';

const TAKER_URL = SCORE_BODY_URL;
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
  celebrating = false,
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
  celebrating?: boolean;
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
  // and the same kit materials as the wall/Score! players.
  const built = useMemo(() => {
    const obj = buildPlayerObject(gltf.scene, { shirt: kit, shorts, accent, socks }, id, number, accent, {
      skin,
      headband: id === 'ronaldinho',
      hair: hairLib.scene,
      hairColor,
      hairStyle,
      beard,
    });
    obj.traverse((c) => {
      if ((c as THREE.SkinnedMesh).isSkinnedMesh) c.frustumCulled = false;
    });
    const style = FOOTBALL_STYLES[footballStyleForPlayer(id)];
    const mixer = new THREE.AnimationMixer(obj);
    const idle = THREE.AnimationClip.findByName(gltf.animations, style.stance);
    const kick = THREE.AnimationClip.findByName(gltf.animations, style.shot) ?? THREE.AnimationClip.findByName(gltf.animations, 'kick');
    const idleAction = idle ? mixer.clipAction(idle) : null;
    const celebration = THREE.AnimationClip.findByName(gltf.animations, style.celebration);
    const celebrationAction = celebration ? mixer.clipAction(celebration).setLoop(THREE.LoopOnce, 1) : null;
    if (celebrationAction) celebrationAction.clampWhenFinished = true;
    const kickAction = kick ? mixer.clipAction(kick) : null;
    if (kickAction) {
      kickAction.clampWhenFinished = true;
      kickAction.setLoop(THREE.LoopOnce, 1);
      kickAction.timeScale = KICK_TIMESCALE;
    }
    const contact = new THREE.Vector3(style.foot === 'l' ? .1143 : -.1143, 0.07, 0.15);
    if (kickAction) {
      kickAction.reset().play();
      kickAction.time = CLIP_CONTACT_S;
      mixer.update(0);
      obj.updateMatrixWorld(true);
      const foot = obj.getObjectByName(`foot_${style.foot}`) as THREE.Bone | undefined;
      let inverse: THREE.Matrix4 | undefined;
      obj.traverse(child => {
        const mesh = child as THREE.SkinnedMesh;
        if (!mesh.isSkinnedMesh || inverse || !foot) return;
        const index = mesh.skeleton.bones.indexOf(foot);
        if (index >= 0) inverse = mesh.skeleton.boneInverses[index];
      });
      if (foot && inverse) contact.applyMatrix4(inverse).applyMatrix4(foot.matrixWorld);
      kickAction.stop();
    }
    const seekKick = (elapsed: number) => {
      if (!kickAction) return;
      kickAction.time = Math.max(0, Math.min(kickAction.getClip().duration, elapsed * KICK_TIMESCALE));
      mixer.update(0);
    };
    return { obj, mixer, idleAction, kickAction, celebrationAction, contact, seekKick };
  }, [gltf, hairLib, id, number, kit, shorts, socks, skin, accent, hairColor, hairStyle, beard]);

  const kicking = useRef(false);
  const wasCelebrating = useRef(false);
  const root = useRef<THREE.Group | null>(null);

  useEffect(() => {
    built.idleAction?.reset().play();
    kicking.current = false;
    wasCelebrating.current = false;
    const { mixer, obj } = built;
    return () => {
      mixer.stopAllAction();
      // Strict Mode replays this effect with the same memoized actions.
      // Keep their mixer bindings intact; the whole mixer is garbage collected
      // with this player when it is replaced.
      disposeBuiltObject(obj);
    };
  }, [built]);

  useFrame(({ clock }, dt) => {
    const start = tl.current?.start ?? null;
    if (start != null && !kicking.current && built.kickAction) {
      // Launch the kick so contact hits the ball at start + KICK_LEAD_S.
      kicking.current = true;
      built.kickAction.reset().play();
      if (built.idleAction) built.kickAction.crossFadeFrom(built.idleAction, 0.12, false);
    } else if (start == null && kicking.current) {
      // Back to the run-up: stop the clamped follow-through so it stops
      // contributing weight, then restart the idle cleanly.
      kicking.current = false;
      built.celebrationAction?.stop();
      wasCelebrating.current = false;
      built.kickAction?.stop();
      built.idleAction?.reset().play();
    }
    if (celebrating && !wasCelebrating.current && built.celebrationAction) {
      wasCelebrating.current = true;
      built.celebrationAction.reset().play();
      const from = built.kickAction ?? built.idleAction;
      if (from) built.celebrationAction.crossFadeFrom(from, .45, false);
    }
    built.mixer.update(dt);
    if (start != null && !wasCelebrating.current && built.kickAction) {
      built.seekKick(clock.elapsedTime - start);
    }
    if (root.current) {
      root.current.rotation.y = THREE.MathUtils.damp(root.current.rotation.y, Math.PI - aimX * .03, 7, Math.min(dt, .1));
      root.current.position.y = 0;
    }
  });

  // Face the goal (−z), angled a touch toward the aim. The footballer faces
  // +z, so π turns it to look down-pitch.
  const yaw = Math.PI - aimX * 0.03;
  const offsetX = built.contact.x * Math.cos(yaw) + built.contact.z * Math.sin(yaw);
  const offsetZ = -built.contact.x * Math.sin(yaw) + built.contact.z * Math.cos(yaw);

  return (
    <group ref={root} position={[ball[0] - offsetX, 0, ball[2] - offsetZ]} rotation={[0, yaw, 0]}>
      <primitive object={built.obj} />
    </group>
  );
}
