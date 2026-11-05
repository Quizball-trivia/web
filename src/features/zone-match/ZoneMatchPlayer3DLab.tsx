'use client';

/**
 * Dev concept (/dev/zone-match/player-3d): the zone match's players as their own cartoon avatars in 3D (toonAvatar)
 * instead of 2.5D cut-outs. Three players on a patch of pitch — you, the rival and a keeper in gloves — playing any of
 * the skeleton's animations, beside the 2D avatar for comparison. Drag to orbit, scroll to zoom.
 */

import { Suspense, useEffect, useMemo, useRef, useState } from 'react';
import { Canvas, useFrame, useLoader, useThree } from '@react-three/fiber';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { cn } from '@/lib/utils';
import type { AvatarCustomization } from '@/types/game';
import { HAIR_PARTS, JERSEY_PARTS, SKIN_PARTS } from '@/lib/avatars/parts';
import { SCORE_BODY_URL, disposeBuiltObject } from '@/features/mini-games/components/ScoreGoalsPlayer3D';
import { FootballClipPlayer } from '@/features/mini-games/components/FootballClipPlayer';
import { AvatarFullBody } from './AvatarFullBody';
import { buildToonAvatar, toonHairFor, type ToonHair } from './zoneMatch3d.toonAvatar';

const GROUPS: { label: string; match: (name: string) => boolean }[] = [
  { label: 'Moving', match: (n) => /^(outfield_idle|dribble|jockey)$/.test(n) },
  { label: 'Stances', match: (n) => n.startsWith('stance_') },
  { label: 'Shots', match: (n) => n.startsWith('strike') },
  { label: 'Keeper', match: (n) => n.startsWith('keeper_') && !n.endsWith('_full') },
  { label: 'Keeper (full dive)', match: (n) => n.startsWith('keeper_') && n.endsWith('_full') },
  { label: 'Celebrations', match: (n) => n.startsWith('celebrate') },
];

const TOON_HAIR: ToonHair[] = ['spiky', 'curly', 'buzz', 'long', 'none'];
const SPEEDS = [0.25, 0.5, 1];

type Seat = { id: string; label: string; customization: AvatarCustomization; seed: number; gloves: boolean; x: number; clipFor: (clip: string) => string };

function Orbit() {
  const camera = useThree((s) => s.camera);
  const dom = useThree((s) => s.gl.domElement);
  useEffect(() => {
    const controls = new OrbitControls(camera, dom);
    controls.target.set(0, 1.05, 0);
    controls.update();
    return () => controls.dispose();
  }, [camera, dom]);
  return null;
}

function Player({ seat, clip, speed, hair }: { seat: Seat; clip: string; speed: number; hair?: ToonHair }) {
  const body = useLoader(GLTFLoader, SCORE_BODY_URL);
  const time = useRef(0);
  const built = useMemo(() => {
    const avatar = buildToonAvatar(body.scene, seat.customization, seat.seed, { gloves: seat.gloves, hair });
    return { obj: avatar.object, clips: new FootballClipPlayer(avatar.object, body.animations) };
  }, [body, seat, hair]);
  useEffect(
    () => () => {
      built.clips.stop();
      disposeBuiltObject(built.obj);
    },
    [built],
  );
  useEffect(() => {
    time.current = 0;
  }, [clip]);
  useFrame((_, dt) => {
    time.current += dt * speed;
    built.clips.sample(seat.clipFor(clip), time.current, true, 0.2);
  });
  return <primitive object={built.obj} position={[seat.x, 0, 0]} />;
}

function Pitch() {
  return (
    <>
      <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <circleGeometry args={[9, 64]} />
        <meshStandardMaterial color="#2f8f5b" roughness={0.95} />
      </mesh>
      {[-1.2, 1.2].map((z) => (
        <mesh key={z} rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.005, z]}>
          <planeGeometry args={[12, 0.06]} />
          <meshBasicMaterial color="#d8efe2" transparent opacity={0.7} />
        </mesh>
      ))}
    </>
  );
}

export function ZoneMatchPlayer3DLab() {
  const [clips, setClips] = useState<string[]>([]);
  const [clip, setClip] = useState('outfield_idle');
  const [speed, setSpeed] = useState(1);
  const [jersey, setJersey] = useState('jersey_barcelona');
  const [skin, setSkin] = useState('skin_male_white_alt');
  const [hairId, setHairId] = useState('hair_boy_basic');
  const [hairStyle, setHairStyle] = useState<ToonHair | undefined>(undefined);
  const [sameMove, setSameMove] = useState(true);
  const loaded = useRef(false);

  useEffect(() => {
    if (loaded.current) return;
    loaded.current = true;
    new GLTFLoader().load(SCORE_BODY_URL, (gltf) => setClips(gltf.animations.map((a) => a.name).sort()));
  }, []);

  const you: AvatarCustomization = useMemo(() => ({ skin, jersey, hair: hairId }) as AvatarCustomization, [skin, jersey, hairId]);
  const seats: Seat[] = useMemo(
    () => [
      { id: 'you', label: 'You', customization: you, seed: 0, gloves: false, x: -1.6, clipFor: (c) => c },
      {
        id: 'rival',
        label: 'Rival',
        customization: { skin: 'skin_male_dark', jersey: 'jersey_milan', hair: 'hair_buzz' } as AvatarCustomization,
        seed: 2,
        gloves: false,
        x: 0,
        clipFor: (c) => (sameMove || !c.startsWith('strike') ? c : 'jockey'),
      },
      {
        id: 'keeper',
        label: 'Keeper',
        customization: { skin: 'skin_male_white', jersey: 'jersey_yellow', hair: 'hair_side_part' } as AvatarCustomization,
        seed: 4,
        gloves: true,
        x: 1.6,
        clipFor: (c) => (sameMove || c.startsWith('keeper') ? c : c.startsWith('strike') ? 'keeper_high_left' : 'keeper_idle'),
      },
    ],
    [you, sameMove],
  );

  return (
    <div className="flex h-dvh bg-[#07111d] font-poppins text-white">
      <aside className="flex w-[300px] shrink-0 flex-col gap-4 overflow-y-auto border-r border-white/10 p-4 text-sm">
        <div>
          <h1 className="text-base font-bold uppercase">3D players · concept</h1>
          <p className="mt-1 text-xs text-white/60">The avatar as a real 3D footballer. Drag to orbit, scroll to zoom.</p>
        </div>
        <label className="flex flex-col gap-1">
          <span className="text-[11px] uppercase text-white/50">Your jersey</span>
          <select value={jersey} onChange={(e) => setJersey(e.target.value)} className="rounded-lg bg-white/10 px-2 py-1.5">
            {JERSEY_PARTS.map((p) => (
              <option key={p.id} value={p.id} className="bg-neutral-900">
                {p.name}
              </option>
            ))}
          </select>
        </label>
        <div className="flex flex-col gap-1">
          <span className="text-[11px] uppercase text-white/50">Skin</span>
          <div className="flex gap-1">
            {SKIN_PARTS.map((p) => (
              <button key={p.id} type="button" onClick={() => setSkin(p.id)} className={cn('rounded-full px-2 py-1 text-xs', skin === p.id ? 'bg-white text-black' : 'bg-white/10')}>
                {p.name}
              </button>
            ))}
          </div>
        </div>
        <label className="flex flex-col gap-1">
          <span className="text-[11px] uppercase text-white/50">Your hair (colour from the 2D art)</span>
          <select
            value={hairId}
            onChange={(e) => {
              setHairId(e.target.value);
              setHairStyle(undefined);
            }}
            className="rounded-lg bg-white/10 px-2 py-1.5"
          >
            {HAIR_PARTS.map((p) => (
              <option key={p.id} value={p.id} className="bg-neutral-900">
                {p.name}
              </option>
            ))}
          </select>
          <div className="mt-1 flex flex-wrap gap-1">
            {TOON_HAIR.map((h) => (
              <button
                key={h}
                type="button"
                onClick={() => setHairStyle(h)}
                className={cn('rounded-full px-2 py-1 text-xs capitalize', (hairStyle ?? toonHairFor(hairId)) === h ? 'bg-white text-black' : 'bg-white/10')}
              >
                {h}
              </button>
            ))}
          </div>
        </label>
        <label className="flex items-center gap-2 text-xs">
          <input type="checkbox" checked={sameMove} onChange={(e) => setSameMove(e.target.checked)} />
          All three do the same move
        </label>
        {GROUPS.map((g) => {
          const names = clips.filter(g.match);
          if (!names.length) return null;
          return (
            <div key={g.label} className="flex flex-col gap-1">
              <span className="text-[11px] uppercase text-white/50">{g.label}</span>
              <div className="flex flex-wrap gap-1">
                {names.map((n) => (
                  <button key={n} type="button" onClick={() => setClip(n)} className={cn('rounded-full px-2 py-1 text-xs', clip === n ? 'bg-brand-yellow text-black' : 'bg-white/10 hover:bg-white/15')}>
                    {n.replace(/^(stance|strike|keeper|celebrate)_?/, '') || n}
                  </button>
                ))}
              </div>
            </div>
          );
        })}
      </aside>
      <main className="relative flex-1">
        <Canvas shadows camera={{ position: [0, 1.7, 5.6], fov: 40 }} dpr={[1, 2]}>
          <color attach="background" args={['#0b1a2a']} />
          <fog attach="fog" args={['#0b1a2a', 12, 26]} />
          <hemisphereLight args={['#ffffff', '#1d3b2a', 0.9]} />
          <directionalLight position={[4, 8, 6]} intensity={2.2} castShadow shadow-mapSize={[2048, 2048]} />
          <directionalLight position={[-5, 3, -4]} intensity={0.6} />
          <Pitch />
          <Suspense fallback={null}>
            {seats.map((s) => (
              <Player key={s.id} seat={s} clip={clip} speed={speed} hair={s.id === 'you' ? hairStyle : undefined} />
            ))}
          </Suspense>
          <Orbit />
        </Canvas>
        <div className="pointer-events-none absolute inset-x-0 top-3 flex justify-center gap-[92px] text-xs font-bold uppercase text-white/70">
          {seats.map((s) => (
            <span key={s.id}>{s.label}</span>
          ))}
        </div>
        <div className="absolute bottom-4 left-4 flex items-center gap-2">
          <span className="text-xs uppercase text-white/50">Speed</span>
          {SPEEDS.map((s) => (
            <button key={s} type="button" onClick={() => setSpeed(s)} className={cn('rounded-full px-2 py-1 font-mono text-xs', speed === s ? 'bg-white text-black' : 'bg-white/10')}>
              {s}×
            </button>
          ))}
          <span className="ml-3 font-mono text-xs text-white/60">{clip}</span>
        </div>
        <div className="absolute bottom-4 right-4 w-[150px] rounded-2xl bg-black/40 p-2">
          <p className="mb-1 text-center text-[10px] uppercase text-white/50">2D avatar today</p>
          <AvatarFullBody customization={you} className="w-full" />
        </div>
      </main>
    </div>
  );
}
