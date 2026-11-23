'use client';

/**
 * The ორშაბათობა studio: set, both hosts, lighting, bloom and a camera that
 * glides between named shots. The challenges mount their own UI over it and
 * drive `shot` (e.g. cut to Tato when he asks, back to wide for the answer).
 */

import { Suspense, useEffect, useLayoutEffect, useMemo, useRef, useState, type RefObject } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/examples/jsm/postprocessing/OutputPass.js';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { StudioSet } from './StudioSet';
import { StudioHost, prefersLightModels } from './StudioHost';
import { HOST_MODELS, SEATS, SHOTS, STUDIO_COLORS, type HostId, type StudioShot } from './studioLayout';
import type { HostAct } from './acting';

function shotPose(shot: StudioShot, aspect: number) {
  const spec = SHOTS[shot];
  // Portrait screens can't hold the wide width; open the lens a little and
  // let the sides crop instead of backing the camera into the dark.
  const fov = aspect < 1 ? Math.min(52, spec.fov + (1 - aspect) * 30) : spec.fov;
  const half = THREE.MathUtils.degToRad(fov / 2);
  const [fw, fh] = spec.fit;
  const dist = Math.min(8.5, Math.max(fh / 2 / Math.tan(half), fw / 2 / (Math.tan(half) * aspect)));
  const target = new THREE.Vector3(...spec.target);
  const position = new THREE.Vector3(...spec.from).normalize().multiplyScalar(dist).add(target);
  return { fov, target, position };
}

const SHAKE_S = 0.55;

function CameraRig({ shot, interactive, shake }: { shot: StudioShot; interactive: boolean; shake?: number }) {
  const camera = useThree((s) => s.camera) as THREE.PerspectiveCamera;
  const gl = useThree((s) => s.gl);
  const aspect = useThree((s) => s.size.width / s.size.height);
  const goal = useMemo(() => shotPose(shot, aspect), [shot, aspect]);
  const look = useRef(goal.target.clone());
  const placed = useRef(false);
  const shaking = useRef<{ key: number; at: number } | null>(null);

  useLayoutEffect(() => {
    if (placed.current) return;
    placed.current = true;
    camera.position.copy(goal.position);
    camera.fov = goal.fov;
    camera.updateProjectionMatrix();
    look.current.copy(goal.target);
    camera.lookAt(look.current);
  }, [camera, goal]);

  useEffect(() => {
    if (!interactive) return;
    const controls = new OrbitControls(camera, gl.domElement);
    controls.target.copy(goal.target);
    controls.enableDamping = true;
    controls.minDistance = 0.8;
    controls.maxDistance = 9;
    controls.maxPolarAngle = Math.PI * 0.6;
    controls.update();
    const lookAt = look.current;
    let frame = requestAnimationFrame(function tick() {
      controls.update();
      frame = requestAnimationFrame(tick);
    });
    return () => {
      cancelAnimationFrame(frame);
      controls.dispose();
      lookAt.copy(controls.target);
    };
  }, [interactive, camera, gl, goal]);

  useFrame((state, delta) => {
    if (interactive) return;
    const k = 1 - Math.exp(-delta * 2.6);
    camera.position.lerp(goal.position, k);
    look.current.lerp(goal.target, k);
    if (Math.abs(camera.fov - goal.fov) > 0.01) {
      camera.fov += (goal.fov - camera.fov) * k;
      camera.updateProjectionMatrix();
    }
    camera.lookAt(look.current);
    // A new `shake` key jolts the frame (an impact), dying out over SHAKE_S.
    if (shake && shaking.current?.key !== shake) shaking.current = { key: shake, at: state.clock.elapsedTime };
    const age = shaking.current ? state.clock.elapsedTime - shaking.current.at : SHAKE_S;
    if (age < SHAKE_S) {
      const a = 0.035 * (1 - age / SHAKE_S) ** 2;
      camera.rotateX(a * Math.sin(age * 71));
      camera.rotateY(a * Math.sin(age * 53 + 1.3));
    }
  });
  return null;
}

/** Bloom on the HDR frame, then tone mapping: the sparks and the brightest highlights. */
function Bloom() {
  const gl = useThree((s) => s.gl);
  const scene = useThree((s) => s.scene);
  const camera = useThree((s) => s.camera);
  const size = useThree((s) => s.size);
  const composer = useMemo(() => {
    const target = new THREE.WebGLRenderTarget(1, 1, { type: THREE.HalfFloatType, samples: 4 });
    const c = new EffectComposer(gl, target);
    c.addPass(new RenderPass(scene, camera));
    c.addPass(new UnrealBloomPass(new THREE.Vector2(1, 1), 0.42, 0.5, 1.6));
    c.addPass(new OutputPass());
    return c;
  }, [gl, scene, camera]);
  useEffect(() => {
    composer.setPixelRatio(gl.getPixelRatio());
    composer.setSize(size.width, size.height);
  }, [composer, gl, size]);
  useEffect(() => () => composer.dispose(), [composer]);
  useFrame(() => composer.render(), 1);
  return null;
}

function Environment() {
  const get = useThree((s) => s.get);
  useEffect(() => {
    const { gl, scene } = get();
    const pmrem = new THREE.PMREMGenerator(gl);
    const env = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
    scene.environment = env;
    scene.environmentIntensity = 0.18;
    return () => {
      scene.environment = null;
      env.dispose();
      pmrem.dispose();
    };
  }, [get]);
  return null;
}

function Spot({ position, target, color, intensity, angle, shadow = false, shadowSize = 2048 }: {
  position: readonly [number, number, number];
  target: readonly [number, number, number];
  color: string;
  intensity: number;
  angle: number;
  shadow?: boolean;
  /** Shadow map edge in pixels. */
  shadowSize?: number;
}) {
  const light = useRef<THREE.SpotLight>(null);
  const scene = useThree((s) => s.scene);
  useLayoutEffect(() => {
    const l = light.current;
    if (!l) return;
    l.target.position.set(...target);
    scene.add(l.target);
    return () => {
      scene.remove(l.target);
    };
  }, [scene, target]);
  return (
    <spotLight
      ref={light}
      position={position}
      color={color}
      intensity={intensity}
      angle={angle}
      penumbra={0.85}
      decay={2}
      castShadow={shadow}
      shadow-mapSize={[shadowSize, shadowSize]}
      shadow-bias={-0.0004}
      shadow-normalBias={0.02}
    />
  );
}

function Lights({ light }: { light: boolean }) {
  return (
    <>
      <hemisphereLight args={['#ffe2c0', '#140d08', 0.35]} />
      <Spot position={[0.3, 3.6, 3.4]} target={[0, 0.95, -0.3]} color="#ffe9d2" intensity={70} angle={0.62} shadow shadowSize={light ? 1024 : 2048} />
      <Spot position={[0.6, 2.2, 2.2]} target={[-1.5, 1.15, -0.2]} color="#ffd8b0" intensity={14} angle={0.35} />
      <Spot position={[-0.6, 2.2, 2.2]} target={[1.5, 1.15, -0.2]} color="#ffd8b0" intensity={14} angle={0.35} />
      {/* Rims from the wall side, so the hosts separate from the dark set. */}
      <Spot position={[-2.6, 2.9, -1.9]} target={[-1.5, 1.1, -0.2]} color="#ffbf7a" intensity={16} angle={0.5} />
      <Spot position={[2.6, 2.9, -1.9]} target={[1.5, 1.1, -0.2]} color="#ffbf7a" intensity={16} angle={0.5} />
      {/* Wash on the upper slats and the right-hand print. */}
      <Spot position={[0, 3.3, 0.6]} target={[2.4, 2.3, -2.6]} color="#ffcf9a" intensity={22} angle={0.55} />
      <Spot position={[0, 3.3, 0.6]} target={[-2.4, 2.3, -2.6]} color="#ffcf9a" intensity={22} angle={0.55} />
    </>
  );
}

export interface OrshabatobaStudioProps {
  shot?: StudioShot;
  /** Free orbit camera (dev tooling); the shot only seeds where it starts. */
  interactive?: boolean;
  /** What each host is doing (gaze, anger, gesture). */
  acts?: Partial<Record<HostId, HostAct>>;
  /** Per host: a new non-zero value smashes that host's laptop; 0 restores it. */
  smash?: Partial<Record<HostId, number>>;
  /** A new value shakes the camera once. */
  shake?: number;
  /** Elements to keep pinned above each host's head (speech bubbles). */
  anchors?: Partial<Record<HostId, RefObject<HTMLElement | null>>>;
  className?: string;
}

export function OrshabatobaStudio({ shot = 'wide', interactive = false, acts, smash, shake, anchors, className }: OrshabatobaStudioProps) {
  // Canvas children only ever render on the client, so this is read once there.
  const [light] = useState(prefersLightModels);
  return (
    <div className={className} style={{ background: STUDIO_COLORS.background }}>
      <Canvas
        shadows={{ type: THREE.PCFShadowMap }}
        dpr={light ? [1, 1.25] : [1, 1.75]}
        camera={{ fov: SHOTS[shot].fov, near: 0.05, far: 40 }}
        gl={{ antialias: true, alpha: false, powerPreference: 'high-performance' }}
        onCreated={({ gl }) => {
          gl.toneMapping = THREE.ACESFilmicToneMapping;
          gl.toneMappingExposure = 1.05;
        }}
      >
        <color attach="background" args={[STUDIO_COLORS.background]} />
        <Environment />
        <Lights light={light} />
        <StudioSet smash={smash} />
        <Suspense fallback={null}>
          {(Object.keys(SEATS) as HostId[]).map((id) => (
            <StudioHost key={id} id={id} spec={HOST_MODELS[id]} light={light} act={acts?.[id]} anchor={anchors?.[id]} />
          ))}
        </Suspense>
        <CameraRig shot={shot} interactive={interactive} shake={shake} />
        <Bloom />
      </Canvas>
    </div>
  );
}
