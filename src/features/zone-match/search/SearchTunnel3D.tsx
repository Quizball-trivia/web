'use client';

/**
 * Searching direction "Tunnel walk-out" (3D): the players' tunnel before kick-off — strip lights passing overhead,
 * club boards on the walls, the bright pitch at the far end — with your full-body avatar walking it while the search
 * runs, your three playstyles over your head. Found: the opponent steps in from the other side and squares up to you,
 * the light at the end flares, and the VS comes in.
 */

import { useEffect, useMemo, useRef, useState } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { AnimatePresence, motion } from 'motion/react';
import { AvatarFullBody, applyFullBodyPose, type FullBodyEls } from '../AvatarFullBody';
import { FULL_H, FULL_W, idlePose, mixPose, runPose } from '../zoneMatch.fullBody';
import { CardArt } from '../ZoneMatchCardFace';
import { CancelButton, VersusReveal, clockText, useSearchSeconds, type SearchScreenProps } from './searchShared';

const SEG = 6;
const SEGMENTS = 9;
const W = 7;
const H = 4.2;
const SPEED = 2.2;

function signTexture(text: string, bg: string, ink: string) {
  const c = document.createElement('canvas');
  c.width = 512;
  c.height = 128;
  const ctx = c.getContext('2d')!;
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, 512, 128);
  ctx.fillStyle = ink;
  ctx.font = 'bold 64px Poppins, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(text, 256, 68);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

function Tunnel({ flare }: { flare: React.RefObject<number> }) {
  const group = useRef<THREE.Group>(null);
  const exit = useRef<THREE.MeshBasicMaterial>(null);
  const signs = useMemo(() => [signTexture('QUIZBALL', '#1645FF', '#FFE500'), signTexture('ZONE MATCH', '#58CC02', '#ffffff'), signTexture('RANKED', '#FF4B4B', '#ffffff')], []);
  useEffect(() => () => signs.forEach((s) => s.dispose()), [signs]);
  useFrame(({ clock }) => {
    if (group.current) group.current.position.z = (clock.elapsedTime * SPEED) % SEG;
    if (exit.current) exit.current.color.setScalar(1 + 3 * (flare.current ?? 0));
  });
  return (
    <>
      <group ref={group}>
        {Array.from({ length: SEGMENTS }, (_, i) => {
          const z = -i * SEG;
          return (
            <group key={i} position={[0, 0, z]}>
              {/* Concrete ribs and the strip light in each bay. */}
              <mesh position={[0, H, -SEG / 2]}>
                <boxGeometry args={[W, 0.3, 0.5]} />
                <meshStandardMaterial color="#6b778d" roughness={0.9} />
              </mesh>
              {[-1, 1].map((s) => (
                <mesh key={s} position={[(s * W) / 2, H / 2, -SEG / 2]}>
                  <boxGeometry args={[0.4, H, 0.5]} />
                  <meshStandardMaterial color="#6b778d" roughness={0.9} />
                </mesh>
              ))}
              <mesh position={[0, H - 0.05, -SEG / 4]}>
                <boxGeometry args={[2.6, 0.06, 0.35]} />
                <meshBasicMaterial color="#f4f9ff" toneMapped={false} />
              </mesh>
              {/* A board on alternate walls. */}
              <mesh position={[(i % 2 ? 1 : -1) * (W / 2 - 0.05), 2.2, -SEG / 4]} rotation={[0, (i % 2 ? -1 : 1) * (Math.PI / 2), 0]}>
                <planeGeometry args={[3.2, 0.8]} />
                <meshBasicMaterial map={signs[i % signs.length]} toneMapped={false} />
              </mesh>
            </group>
          );
        })}
      </group>
      {/* Walls, floor and ceiling run the whole length. */}
      <mesh position={[0, 0, -SEG * SEGMENTS / 2]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[W, SEG * SEGMENTS + 10]} />
        <meshStandardMaterial color="#3a4556" roughness={0.45} metalness={0.25} />
      </mesh>
      <mesh position={[0, H, -SEG * SEGMENTS / 2]} rotation={[Math.PI / 2, 0, 0]}>
        <planeGeometry args={[W, SEG * SEGMENTS + 10]} />
        <meshStandardMaterial color="#2b3341" />
      </mesh>
      {[-1, 1].map((s) => (
        <mesh key={s} position={[(s * W) / 2, H / 2, -SEG * SEGMENTS / 2]} rotation={[0, -s * (Math.PI / 2), 0]}>
          <planeGeometry args={[SEG * SEGMENTS + 10, H]} />
          <meshStandardMaterial color="#56627a" roughness={0.9} />
        </mesh>
      ))}
      {/* The pitch at the end of the tunnel: bright light. */}
      <mesh position={[0, H / 2, -SEG * (SEGMENTS - 1)]}>
        <planeGeometry args={[W, H]} />
        <meshBasicMaterial ref={exit} color="#cfe9d6" toneMapped={false} />
      </mesh>
    </>
  );
}

function Walker({ customization, side, arrived }: { customization: SearchScreenProps['self']['avatarCustomization']; side: 'self' | 'rival'; arrived: boolean }) {
  const [els, setEls] = useState<FullBodyEls | null>(null);
  const box = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!els) return;
    let raf = 0;
    // The moment the opponent arrived (this effect re-runs then).
    const enterAt = arrived ? performance.now() : null;
    const loop = (ms: number) => {
      const now = ms / 1000;
      // Walking in place (the tunnel moves past); the rival walks in, then both stand squared up.
      const entering = side === 'rival' && enterAt !== null ? Math.min(1, (performance.now() - enterAt) / 1300) : 1;
      const walking = side === 'self' ? (enterAt === null ? 1 : Math.max(0, 1 - (performance.now() - enterAt - 900) / 500)) : 1 - entering;
      applyFullBodyPose(els, mixPose(idlePose(now), runPose(now * 1.6, 0.3), Math.max(0.0001, walking)));
      if (box.current && side === 'rival') box.current.style.transform = `translateX(${(1 - entering) * 60}vw) scaleX(-1)`;
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [els, side, arrived]);
  return (
    <div ref={box} className="h-full" style={{ aspectRatio: `${FULL_W} / ${FULL_H}`, transform: side === 'rival' ? 'translateX(60vw) scaleX(-1)' : undefined }}>
      <AvatarFullBody customization={customization} seed={side === 'self' ? 0 : 3} onEls={setEls} style={{ height: '100%' }} />
    </div>
  );
}

export function SearchTunnel3D({ self, deck, startedAt, opponent, opponentDeck, onCancel }: SearchScreenProps) {
  const seconds = useSearchSeconds(startedAt);
  const flare = useRef(0);
  const [versus, setVersus] = useState(false);
  const arrived = opponent !== null;

  useEffect(() => {
    if (!opponent) return;
    const start = performance.now();
    let raf = 0;
    const loop = () => {
      flare.current = Math.max(0, Math.min(1, (performance.now() - start - 1400) / 700));
      if (flare.current < 1) raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    const id = window.setTimeout(() => setVersus(true), 2300);
    return () => {
      cancelAnimationFrame(raf);
      window.clearTimeout(id);
    };
  }, [opponent]);

  return (
    <div className="relative h-dvh overflow-hidden bg-black font-poppins text-white">
      <Canvas camera={{ position: [0, 1.7, 3], fov: 62, near: 0.1, far: 120 }} gl={{ antialias: true }} dpr={[1, 1.5]}>
        <color attach="background" args={['#05070b']} />
        <fog attach="fog" args={['#0b1018', 26, 60]} />
        <ambientLight intensity={1.4} color="#cfe0ff" />
        <hemisphereLight args={['#dfe9ff', '#2a2f3a', 1.2]} />
        <pointLight position={[0, 3.6, 1]} intensity={14} distance={14} color="#f4f9ff" />
        <pointLight position={[0, 2, -45]} intensity={60} distance={40} color="#d7ffe4" />
        <Tunnel flare={flare} />
      </Canvas>
      <AnimatePresence>
        {!versus && (
          <motion.div exit={{ opacity: 0 }} className="absolute inset-0">
            <div className="pointer-events-none absolute inset-x-0 top-6 text-center">
              <p className="text-xs font-bold uppercase tracking-[0.3em] text-brand-yellow">Ranked · {clockText(seconds)}</p>
              <h1 className="mt-1 text-3xl font-black uppercase drop-shadow-lg">{opponent ? `${opponent.name} is here` : 'Walking out…'}</h1>
            </div>
            <div className="absolute bottom-0 left-[14%] h-[62vh]">
              <div className="absolute -top-16 left-1/2 flex -translate-x-1/2 gap-2">
                {deck.map((id) => (
                  <div key={id} className="size-12 rounded-xl bg-black/50 p-1 backdrop-blur">
                    <CardArt id={id} className="size-full" />
                  </div>
                ))}
              </div>
              <Walker customization={self.avatarCustomization} side="self" arrived={arrived} />
            </div>
            {opponent && (
              <div className="absolute bottom-0 right-[14%] h-[62vh]">
                <Walker customization={opponent.avatarCustomization} side="rival" arrived={arrived} />
              </div>
            )}
            {!opponent && <CancelButton onCancel={onCancel} className="absolute bottom-8 right-8" />}
          </motion.div>
        )}
      </AnimatePresence>
      <AnimatePresence>
        {versus && opponent && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="absolute inset-0 grid place-items-center bg-white/10">
            <VersusReveal self={self} deck={deck} opponent={opponent} opponentDeck={opponentDeck} width={210} />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
