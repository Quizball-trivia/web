'use client';

import { Suspense, useEffect, useMemo, useRef, useState } from 'react';
import { Canvas, useFrame, useLoader, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { buildPlayerObject, disposeBuiltObject, resolveJoints, SCORE_BODY_URL, SCORE_HAIR_URL } from './ScoreGoalsPlayer3D';
import { KEEPER_CONTACT_S, sampleGoalkeeper } from './GoalkeeperMotion';
import { sampleSavedBall, type KeeperSaveStyle } from '../lib/keeperSaves';
import { shotFlight } from '../lib/ballPhysics';
import { FootballClipPlayer } from './FootballClipPlayer';
import { useMatchBallGeometry, useMatchBallTexture } from './footballVisuals';

const STUDIO_BALL_START = new THREE.Vector3(0, .13, 4);

const CLIPS = [
  ['stance_carlos', 'Roberto Carlos-inspired angled stance'], ['strike_left_power', 'Roberto Carlos-inspired left-foot power'],
  ['stance_power', 'Ronaldo-inspired wide stance'], ['stance_samba', 'Ronaldinho-inspired relaxed stance'], ['stance_left', 'Messi-inspired compact stance'], ['stance_curl', 'Beckham-inspired angled stance'], ['stance_neymar', 'Neymar-inspired staggered stance'],
  ['strike_whip', 'Neymar-inspired whipped shot'],
  ['outfield_idle', 'Ready stance'], ['dribble', 'Dribble'], ['strike', 'Free-kick strike'],
  ['strike_power', 'Ronaldo-inspired power strike'], ['strike_curl', 'Beckham-inspired curled instep'], ['strike_toe', 'Ronaldinho-inspired toe-poke'], ['strike_left', 'Messi-inspired left-foot placement'],
  ['celebrate_siu', 'Ronaldo-inspired jump-turn'], ['celebrate_samba', 'Ronaldinho-inspired samba'], ['celebrate_sky', 'Messi-inspired sky-point'], ['celebrate_fold', 'Mbappé-inspired folded arms'],
  ['jockey', 'Defensive shuffle'], ['celebrate', 'Celebration'], ['keeper_idle', 'Keeper ready'],
  ['keeper_low_left', 'Keeper low left'], ['keeper_low_right', 'Keeper low right'],
  ['keeper_scoop', 'Keeper central scoop'], ['keeper_overhead', 'Keeper overhead catch'],
  ['keeper_parry_left', 'Keeper left-hand parry'], ['keeper_parry_right', 'Keeper right-hand parry'], ['keeper_tip_left', 'Keeper left fingertip save'], ['keeper_tip_right', 'Keeper right fingertip save'],
  ['keeper_high_left', 'Keeper high left'], ['keeper_high_right', 'Keeper high right'],
] as const;

function CameraControls({ clip }: { clip: string }) {
  const { camera, gl } = useThree();
  const controls = useRef<OrbitControls | null>(null);
  useEffect(() => {
    const orbit = new OrbitControls(camera, gl.domElement);
    const dive = clip.startsWith('keeper_') && clip !== 'keeper_idle';
    const side = clip.includes('left') ? -1 : 1;
    const big = clip.startsWith('celebrate_');
    camera.position.set(dive ? 3.5 : 2.5, dive ? 2.8 : big ? 2.1 : 1.8, dive ? 7.5 : big ? 5.2 : 3.8);
    orbit.target.set(dive ? side * 1.1 : 0, 0.9, 0);
    orbit.enableDamping = true;
    orbit.minDistance = 2.2;
    orbit.maxDistance = 10;
    orbit.maxPolarAngle = Math.PI / 2;
    orbit.update();
    controls.current = orbit;
    return () => { orbit.dispose(); controls.current = null; };
  }, [camera, gl, clip]);
  useFrame(() => controls.current?.update());
  return null;
}

function StudioPlayer({ clip, speed, inspect, inspectTime }: { clip: string; speed: number; inspect: boolean; inspectTime: number }) {
  const ball = useRef<THREE.Mesh>(null);
  const ballTexture = useMatchBallTexture();
  const ballGeometry = useMatchBallGeometry(.13);
  const gltf = useLoader(GLTFLoader, SCORE_BODY_URL);
  const hair = useLoader(GLTFLoader, SCORE_HAIR_URL);
  const keeper = clip.startsWith('keeper_');
  const longHair = clip === 'stance_samba' || clip === 'strike_toe' || clip === 'celebrate_samba';
  const built = useMemo(() => {
    const obj = buildPlayerObject(gltf.scene, { shirt: keeper ? '#e88929' : '#1645ff', shorts: '#17283d', accent: '#f3f1d7', socks: '#eff4e8', boots: '#d6ed57', gloves: keeper ? '#eff4e8' : undefined }, 'studio', 10, '#f3f1d7', { hair: hair.scene, hairStyle: longHair ? 'Hair_Long' : 'Hair_SimpleParted', headband: longHair, skin: '#b67e55', hairColor: '#251c16', beard: false });
    return { obj, clips: new FootballClipPlayer(obj, gltf.animations), joints: resolveJoints(obj), catchPoint: new THREE.Vector3() };
  }, [gltf, hair, keeper, longHair]);
  const time = useRef(0);
  useEffect(() => { time.current = 0; }, [clip]);
  useEffect(() => () => { built.clips.stop(); disposeBuiltObject(built.obj); }, [built]);
  useFrame((_, delta) => {
    time.current += Math.min(delta, 0.1) * speed;
    if (keeper && built.joints) {
      built.clips.stop();
      const x = clip === 'keeper_scoop' || clip === 'keeper_overhead' ? 0 : clip.includes('left') ? -2.45 : 2.45;
      const y = clip.includes('high') || clip.includes('tip') || clip === 'keeper_overhead' ? 1.84 : clip.includes('parry') ? 1.1 : .64;
      const saveStyle: KeeperSaveStyle = clip.includes('parry') ? 'parry' : clip.includes('tip') ? 'tip' : 'catch';
      sampleGoalkeeper(built.obj as THREE.Group, built.joints, [x, y], clip === 'keeper_idle' ? 0 : inspect ? inspectTime : time.current % 3, true, built.catchPoint, saveStyle);
      if (ball.current) {
        const saveTime = inspect ? inspectTime : time.current % 3;
        const elapsed = saveTime - .45;
        sampleSavedBall(ball.current.position, new THREE.Vector3(x, y, .42), built.catchPoint, saveTime - KEEPER_CONTACT_S, saveStyle);
        if (elapsed < KEEPER_CONTACT_S - .45) shotFlight(ball.current.position, STUDIO_BALL_START, new THREE.Vector3(x, y, .42), elapsed, KEEPER_CONTACT_S - .45);
      }
      return;
    }
    const animation = clip;
    const duration = gltf.animations.find(a => a.name === animation)?.duration ?? 1;
    const cycle = time.current % (duration + 0.6);
    built.clips.sample(animation, Math.min(cycle, duration));
  });
  return <><primitive object={built.obj} />{keeper && clip !== 'keeper_idle' && <mesh ref={ball} geometry={ballGeometry} castShadow><meshStandardMaterial map={ballTexture} roughness={.65} /></mesh>}</>;
}

export function FootballModelStudio() {
  const [clip, setClip] = useState<string>('dribble');
  const [speed, setSpeed] = useState(1);
  const [inspect, setInspect] = useState(false);
  const [inspectTime, setInspectTime] = useState(KEEPER_CONTACT_S);
  return <section>
    <div className="relative aspect-[4/3] overflow-hidden rounded-3xl border border-white/15 bg-surface-map-panel-deep sm:aspect-[16/9]">
      <Canvas shadows={{ type: THREE.PCFShadowMap }} dpr={[1, 1.5]} camera={{ position: [2.5, 1.8, 3.8], fov: 32 }}>
        <color attach="background" args={['#142030']} />
        <hemisphereLight args={['#deebff', '#31423d', 1.3]} />
        <directionalLight position={[3, 5, 4]} intensity={3} castShadow shadow-mapSize={[1024, 1024]} shadow-camera-left={-3} shadow-camera-right={3} shadow-camera-top={3} shadow-camera-bottom={-3} shadow-normalBias={0.015} />
        <directionalLight position={[-3, 2, -3]} intensity={2.4} color="#8fcaff" />
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.015, 0]} receiveShadow><circleGeometry args={[6, 64]} /><meshStandardMaterial color="#243346" roughness={0.9} /></mesh>
        <Suspense fallback={null}><StudioPlayer clip={clip} speed={speed} inspect={inspect} inspectTime={inspectTime} /></Suspense>
        <CameraControls clip={clip} />
      </Canvas>
      <p className="pointer-events-none absolute bottom-4 left-5 text-xs text-slate-400">Drag to rotate · scroll to zoom</p>
    </div>
    <div className="mt-5 flex flex-wrap items-center gap-4">
      <label className="flex min-w-0 w-full items-center text-sm text-slate-300 sm:w-auto">Animation <select aria-label="Animation" className="ml-2 min-w-0 flex-1 rounded-xl border border-white/20 bg-surface-input px-3 py-2 text-white" value={clip} onChange={event => setClip(event.target.value)}>{CLIPS.map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
      <button className="rounded-full border border-white/20 px-5 py-2.5 text-sm" onClick={() => setSpeed(s => s === 1 ? 0.35 : 1)}>{speed === 1 ? 'Slow motion' : 'Normal speed'}</button>
      {clip.startsWith('keeper_') && clip !== 'keeper_idle' && <button aria-pressed={inspect} className="rounded-full border border-white/20 px-5 py-2.5 text-sm" onClick={() => setInspect(value => !value)}>{inspect ? 'Play save' : 'Inspect catch'}</button>}
      {inspect && clip.startsWith('keeper_') && clip !== 'keeper_idle' && <select aria-label="Save moment" className="rounded-xl border border-white/20 bg-surface-input px-3 py-2 text-sm text-white" value={inspectTime} onChange={event => setInspectTime(Number(event.target.value))}>
        <option value={0}>Ready</option><option value={.78}>Push-off</option><option value={KEEPER_CONTACT_S}>Glove contact</option><option value={KEEPER_CONTACT_S + .24}>Gather</option><option value={KEEPER_CONTACT_S + .8}>Landing</option>
      </select>}
      <p className="ml-auto text-sm text-slate-400">Original authored football actions</p>
    </div>
  </section>;
}
