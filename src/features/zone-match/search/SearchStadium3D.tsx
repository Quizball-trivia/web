'use client';

/**
 * The search screen (3D): the match's own stadium and avatar crowd at night, scarves twirling in the stands, the
 * camera drifting round. Your FUT card (with your playstyles) waits bottom-left, a "?" card being scanned bottom-right,
 * your playstyles' tips rotating between them; the big screen counts the search. Found: the floodlights come up, the
 * stand spells "VS <name>", the camera swoops in, the "?" card flips into the opponent and both cards slide into the
 * middle for the VS.
 */

import { useEffect, useMemo, useRef, useState } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { AnimatePresence, motion } from 'motion/react';
import { Stadium3D } from '@/features/stadium/Stadium3D';
import { StadiumPitch } from '@/features/stadium/StadiumLab';
import { findScene } from '@/features/stadium/crowd/scenes';
import { cn } from '@/lib/utils';
import { FutCard } from '../ZoneMatchFutCard';
import { useMediaQuery } from '../ZoneMatchCards';
import { CARD_BY_ID } from '../zoneMatch.cards';
import { CancelButton, clockText, useSearchSeconds, type SearchScreenProps } from './searchShared';
import { fill } from '../zoneMatch.copy';
import { useZoneCopy } from '../useZoneCopy';

/** The search state the 3D scene reads every frame: when the opponent was found (canvas clock, s). */
type Live = { found: number | null };

/** The big screen over the far stand: the search clock, then the pairing. */
function BigScreen({ text }: { text: string }) {
  const texture = useMemo(() => {
    const c = document.createElement('canvas');
    c.width = 1024;
    c.height = 256;
    const ctx = c.getContext('2d')!;
    ctx.fillStyle = '#05080f';
    ctx.fillRect(0, 0, 1024, 256);
    ctx.strokeStyle = '#1CB0F6';
    ctx.lineWidth = 10;
    ctx.strokeRect(6, 6, 1012, 244);
    ctx.fillStyle = '#FFE500';
    // Shrunk to fit long names.
    let size = 110;
    ctx.font = `bold ${size}px Poppins, sans-serif`;
    while (size > 40 && ctx.measureText(text).width > 960) {
      size -= 6;
      ctx.font = `bold ${size}px Poppins, sans-serif`;
    }
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(text, 512, 132);
    const t = new THREE.CanvasTexture(c);
    t.colorSpace = THREE.SRGBColorSpace;
    return t;
  }, [text]);
  useEffect(() => () => texture.dispose(), [texture]);
  return (
    <mesh position={[0, 13, -27]}>
      <planeGeometry args={[26, 6.5]} />
      <meshBasicMaterial map={texture} toneMapped={false} />
    </mesh>
  );
}

function Camera({ live, phone }: { live: React.RefObject<Live>; phone: boolean }) {
  useFrame(({ camera, clock }) => {
    const t = clock.elapsedTime;
    const found = live.current.found;
    const swoop = found === null ? 0 : THREE.MathUtils.smootherstep(Math.min(1, (t - found) / 1.6), 0, 1);
    const angle = t * 0.08;
    // Phones (portrait) stand further back so the big screen and the stands fit across.
    const r = THREE.MathUtils.lerp(phone ? 58 : 38, phone ? 26 : 18, swoop);
    camera.position.set(Math.sin(angle) * r, THREE.MathUtils.lerp(phone ? 16 : 13, 6, swoop), Math.cos(angle) * r);
    camera.lookAt(0, THREE.MathUtils.lerp(4, 1.5, swoop), 0);
  });
  return null;
}

export function SearchStadium3D({ self, deck, startedAt, opponent, opponentDeck, onCancel }: SearchScreenProps) {
  const { c } = useZoneCopy();
  const seconds = useSearchSeconds(startedAt);
  const live = useRef<Live>({ found: null });
  const [clock] = useState(() => () => performance.now() / 1000);
  const [versus, setVersus] = useState(false);
  const elapsed = useRef(0);
  // A tip about one of your playstyles, changing every few seconds.
  const tip = Math.floor(seconds / 4);
  const phone = useMediaQuery('(max-width: 640px)');
  const cardW = phone ? 128 : CARD_W;
  // Searching, the cards wait apart (desktop) or side by side (phones: there is no room to spread).
  const apart = versus || phone ? 0 : 26;

  useEffect(() => {
    if (!opponent) return;
    // The scene's clock is the canvas's; mark the moment on it.
    live.current.found = elapsed.current;
    const id = window.setTimeout(() => setVersus(true), 1700);
    return () => window.clearTimeout(id);
  }, [opponent]);

  const lit = opponent ? 1 : 0.78;
  const scene = opponent ? findScene('text-wall') : findScene('scarf-twirl');

  return (
    <div className="relative h-dvh overflow-hidden bg-[#03060c] font-poppins text-white">
      <Canvas camera={{ position: [0, 16, 44], fov: 42, near: 0.1, far: 400 }} gl={{ antialias: true }} dpr={[1, 1.5]}>
        <ClockTap elapsedRef={elapsed} />
        <color attach="background" args={['#03060c']} />
        <fog attach="fog" args={['#03060c', 60, 160]} />
        <hemisphereLight args={['#9fb8ff', '#0b1a10', opponent ? 1.1 : 0.35]} />
        <directionalLight position={[20, 40, 25]} intensity={opponent ? 1.6 : 0.25} />
        <StadiumPitch />
        <Stadium3D scene={scene} text={opponent ? `VS ${opponent.name}`.toUpperCase().slice(0, 15) : ''} clock={clock} brightness={() => lit} />
        <BigScreen text={opponent ? `${self.name}  vs  ${opponent.name}` : fill(c.search.screenSearching, { clock: clockText(seconds) })} />
        <Camera live={live} phone={phone} />
      </Canvas>
      <div className={cn('pointer-events-none absolute inset-x-0 text-center', phone ? 'top-[max(14px,env(safe-area-inset-top))] px-4' : 'top-6')}>
        <p className="text-[10px] font-bold uppercase tracking-[0.3em] text-brand-yellow sm:text-xs">{c.search.eyebrow}</p>
        <h1 className={cn('mt-1 font-black uppercase drop-shadow-lg', phone ? 'text-xl' : 'text-3xl')}>{opponent ? c.search.found : c.search.finding}</h1>
        {phone && !opponent && <p className="mt-0.5 font-mono text-sm text-white/80">{clockText(seconds)}</p>}
      </div>
      {/* The two cards: yours waiting bottom-left, the "?" being scanned bottom-right; found, they meet in the middle. */}
      <div className={cn('pointer-events-none absolute inset-x-0 flex items-center justify-center', phone ? 'bottom-[22%]' : 'bottom-[12%]')}>
        <motion.div animate={{ x: `${-apart}vw` }} transition={{ type: 'spring', stiffness: 120, damping: 18 }}>
          <FutCard seat={self} width={cardW} slots={[deck[0] ?? null, deck[1] ?? null, deck[2] ?? null]} shineKey={seconds % 5 === 0 ? seconds : 0} />
        </motion.div>
        <motion.div
          initial={false}
          animate={{ scale: versus ? 1 : 0, opacity: versus ? 1 : 0 }}
          transition={{ type: 'spring', stiffness: 300, damping: 14 }}
          className={cn('font-black italic text-brand-yellow drop-shadow-[0_4px_0_rgba(0,0,0,0.5)]', phone ? 'mx-2' : 'mx-6')}
          style={{ fontSize: cardW * 0.32 }}
        >
          VS
        </motion.div>
        <motion.div animate={{ x: `${apart}vw` }} transition={{ type: 'spring', stiffness: 120, damping: 18 }} style={{ perspective: 900 }}>
          <motion.div animate={{ rotateY: opponent ? 0 : 180 }} transition={{ duration: 0.6 }} style={{ transformStyle: 'preserve-3d' }} className="relative">
            <div style={{ backfaceVisibility: 'hidden' }}>
              {opponent ? <FutCard seat={opponent} width={cardW} slots={[opponentDeck?.[0] ?? null, opponentDeck?.[1] ?? null, opponentDeck?.[2] ?? null]} mirror /> : <div style={{ width: cardW, height: cardHeight(cardW) }} />}
            </div>
            <MysteryCard width={cardW} />
          </motion.div>
        </motion.div>
      </div>
      {!opponent && (
        <div className={cn('pointer-events-none absolute inset-x-0 flex justify-center px-4', phone ? 'bottom-[12%]' : 'bottom-[6%]')}>
          <AnimatePresence mode="wait">
            <motion.p key={tip} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }} className={cn('rounded-2xl bg-black/55 px-4 py-2 text-center backdrop-blur', phone ? 'max-w-full text-xs' : 'max-w-[46vw] text-sm')}>
              <span className="mr-1">{CARD_BY_ID[deck[tip % deck.length]]?.icon}</span>
              <b>{c.cards[deck[tip % deck.length]]?.name}:</b> {c.cards[deck[tip % deck.length]]?.effect}
            </motion.p>
          </AnimatePresence>
        </div>
      )}
      {!opponent && <CancelButton onCancel={onCancel} className={phone ? 'absolute bottom-[max(18px,env(safe-area-inset-bottom))] left-1/2 -translate-x-1/2' : 'absolute right-6 top-6'} />}
    </div>
  );
}

const CARD_W = 190;
const cardHeight = (width: number) => Math.round((width * 321) / 200);

/** The opponent's card while the search runs: face down, a scan line sweeping it. */
function MysteryCard({ width }: { width: number }) {
  return (
    <div
      className="absolute inset-0 grid place-items-center overflow-hidden rounded-[22px] border-2 border-[#1CB0F6]/70 bg-[#0b1a33]"
      style={{ transform: 'rotateY(180deg)', backfaceVisibility: 'hidden', width, height: cardHeight(width) }}
    >
      <span className="font-black text-[#1CB0F6]/80" style={{ fontSize: width * 0.38 }}>?</span>
      <motion.div
        className="absolute inset-x-0 h-10"
        style={{ background: 'linear-gradient(180deg, transparent, rgba(28,176,246,0.55), transparent)' }}
        animate={{ top: ['-15%', '100%'] }}
        transition={{ duration: 1.6, repeat: Infinity, ease: 'linear' }}
      />
    </div>
  );
}

/** Keeps the canvas clock's time where the search component can read it. */
function ClockTap({ elapsedRef }: { elapsedRef: React.RefObject<number> }) {
  useFrame(({ clock }) => {
    elapsedRef.current = clock.elapsedTime;
  });
  return null;
}
