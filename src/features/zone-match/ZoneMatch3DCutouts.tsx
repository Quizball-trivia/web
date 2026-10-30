'use client';

/**
 * Zone match 3D view: the players as cut-outs of their real avatar art on drawn legs (AvatarFullBody: the app's own
 * AvatarPreview upper body), drawn as DOM over the canvas and projected every frame onto the director's pose
 * (zoneMatch3d.director): standing on the grass, striding, kicking, sliding, diving, tipping over, spinning. Ghosts
 * (Tiki-Taka teammate, Dummy Run decoy) are translucent copies of the same art. On the figure: the keeper's gloves (put
 * on as a shot comes, tossed away after it — bigger and glowing with Goalkeeper Gloves), Captain's Armband, gold / First
 * Touch boots, a Yellow Card's tint and lock, the card activation hop, and the celebration confetti.
 */

import { useMemo, useRef, type RefObject } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import type { SceneClock } from './zoneMatch3d.clock';
import { AvatarFullBody, applyFullBodyPose, type FullBodyEls } from './AvatarFullBody';
import type { AvatarCustomization } from '@/types/game';
import type { ZoneSide } from './zoneMatch.rules';
import { CUTOUT_ASPECT, CUTOUT_BASE, CUTOUT_H, blankPose, clipPose, type CutoutPose, type DuelDirector, type GhostFx } from './zoneMatch3d.director';
import type { CardEffectsEngine } from './zoneMatch3d.effects';
import type { CardFx } from './zoneMatch3d.fx';

const SIDES: ZoneSide[] = ['player', 'opponent'];
/** Ghost copies per side (the Park the Bus wall needs four). */
const GHOSTS_PER_SIDE = 4;
const BASE_W = 160;
const BASE_H = BASE_W / CUTOUT_ASPECT;
const CONFETTI = 14;
/** Boots per side (AvatarFullBody's seed). */
const SEED: Record<ZoneSide, number> = { player: 0, opponent: 3 };
const CONFETTI_COLORS = ['#FFE500', '#1CB0F6', '#FF4B4B', '#58CC02', '#FFFFFF', '#FF9600'];
/** Raw colours live in style objects (no hex Tailwind classes). */
const BLUFF_INK = '#7B45E8';
const BOOT_GLOW: Record<'gold' | 'mint', string> = {
  gold: 'radial-gradient(closest-side, rgba(255,214,60,0.95), rgba(255,170,0,0.45) 60%, transparent)',
  mint: 'radial-gradient(closest-side, rgba(255,255,255,0.95), rgba(88,204,2,0.55) 60%, transparent)',
};
const FALLBACK_AVATAR: AvatarCustomization = { skin: 'skin_male_white', jersey: 'jersey_green', hair: 'hair_boy_basic' };

export interface CutoutEls {
  root: HTMLDivElement | null;
  art: HTMLDivElement | null;
  armband: HTMLDivElement | null;
  gloves: HTMLDivElement | null;
  /** The two gloves (left hand, right hand). */
  hands: (HTMLSpanElement | null)[];
  boots: HTMLDivElement | null;
  /** Yellow Card: a lock over the head. */
  lock: HTMLDivElement | null;
  /** Dummy Run's decoy: its "?". */
  bluff: HTMLDivElement | null;
  confetti: (HTMLSpanElement | null)[];
  /** The legs and upper body, posed every frame. */
  body: FullBodyEls | null;
}

export type CutoutRegistry = Record<ZoneSide, { main: CutoutEls; ghosts: CutoutEls[] }>;

const emptyEls = (): CutoutEls => ({ root: null, art: null, armband: null, gloves: null, hands: [], boots: null, lock: null, bluff: null, confetti: [], body: null });

/** The DOM nodes of every cut-out, filled in by the layer's refs and read by the driver each frame. */
export function createCutoutRegistry(): CutoutRegistry {
  return {
    player: { main: emptyEls(), ghosts: Array.from({ length: GHOSTS_PER_SIDE }, emptyEls) },
    opponent: { main: emptyEls(), ghosts: Array.from({ length: GHOSTS_PER_SIDE }, emptyEls) },
  };
}

type ElKey = 'root' | 'art' | 'armband' | 'gloves' | 'boots' | 'lock' | 'bluff';
function keep(els: CutoutEls, key: ElKey, el: HTMLDivElement | null) {
  els[key] = el;
}
function keepPiece(els: CutoutEls, index: number, el: HTMLSpanElement | null) {
  els.confetti[index] = el;
}
function keepHand(els: CutoutEls, index: number, el: HTMLSpanElement | null) {
  els.hands[index] = el;
}

function keepBody(els: CutoutEls, body: FullBodyEls) {
  els.body = body;
}

/** The card glows that ride on the upper body: the armband on the arm, gloves on the hands. */
function UpperBadges({ els }: { els: CutoutEls }) {
  return (
    <>
      {/* Captain's Armband: a gold band with a C on the upper arm. */}
      <div
        ref={(el) => keep(els, 'armband', el)}
        className="absolute grid place-items-center rounded-md font-black text-black"
        style={{ left: '74%', top: '54%', width: '17%', height: '9%', opacity: 0, background: 'linear-gradient(180deg, #FFE45C, #FFB800)', boxShadow: '0 0 10px 3px rgba(255,200,0,0.75)', fontSize: 15, transform: 'rotate(-28deg)' }}
      >
        C
      </div>
      {/* Keeper gloves on both hands (glowing with Goalkeeper Gloves); the driver puts them on and tosses them. */}
      <div ref={(el) => keep(els, 'gloves', el)} className="absolute inset-0" style={{ opacity: 0 }}>
        {[
          { left: '2%', top: '13%' },
          { left: '79%', top: '17%' },
        ].map((spot, i) => (
          <span
            key={spot.left}
            ref={(el) => keepHand(els, i, el)}
            className="absolute grid place-items-center rounded-full"
            style={{ ...spot, width: '22%', aspectRatio: '1', fontSize: 24 }}
          >
            🧤
          </span>
        ))}
      </div>
    </>
  );
}

/** One cut-out: the full-body avatar, with the card badges and confetti on the main figures. */
function Figure({ customization, seed, els, main, side }: { customization: AvatarCustomization | null; seed: number; els: CutoutEls; main: boolean; side: ZoneSide }) {
  return (
    <div
      ref={(el) => keep(els, 'root', el)}
      // The players' own figures, for layout checks (is the step card clear of them?).
      data-zm-cutout={main ? side : undefined}
      className="absolute left-0 top-0"
      style={{ width: BASE_W, height: BASE_H, opacity: 0, transformOrigin: `50% ${CUTOUT_BASE * 100}%`, willChange: 'transform' }}
    >
      <div ref={(el) => keep(els, 'art', el)} className="size-full">
        <AvatarFullBody
          customization={customization ?? FALLBACK_AVATAR}
          seed={seed}
          onEls={(body) => keepBody(els, body)}
          style={{ width: '100%' }}
          upperOverlay={main ? <UpperBadges els={els} /> : undefined}
        />
      </div>
      {!main && (
        // Dummy Run's decoy is a bluff: it wears a question mark.
        <div
          ref={(el) => keep(els, 'bluff', el)}
          className="absolute left-1/2 grid -translate-x-1/2 place-items-center rounded-full bg-white font-black"
          style={{ top: '-8%', width: '26%', aspectRatio: '1', opacity: 0, color: BLUFF_INK, fontSize: 34 }}
        >
          ?
        </div>
      )}
      {main && (
        <>
          {/* Golden Boot (gold) or First Touch (mint): a glow round the boots. */}
          <div
            ref={(el) => keep(els, 'boots', el)}
            className="absolute rounded-[50%]"
            style={{ left: '14%', width: '72%', top: `${CUTOUT_BASE * 100 - 9}%`, height: '13%', opacity: 0, background: BOOT_GLOW.gold }}
          />
          {/* Yellow Card: booked — a lock over the head while they can't play cards. */}
          <div
            ref={(el) => keep(els, 'lock', el)}
            className="absolute left-1/2 grid -translate-x-1/2 place-items-center rounded-lg"
            style={{ top: '-9%', width: '24%', aspectRatio: '1', opacity: 0, background: '#FFD60A', boxShadow: '0 0 12px rgba(255,214,10,0.8)', fontSize: 26 }}
          >
            🔒
          </div>
          {/* Celebration confetti. */}
          {Array.from({ length: CONFETTI }, (_, i) => (
            <span
              key={i}
              ref={(el) => keepPiece(els, i, el)}
              className="absolute block"
              style={{ left: '50%', top: '30%', width: 9, height: 14, opacity: 0, background: CONFETTI_COLORS[i % CONFETTI_COLORS.length], borderRadius: 2 }}
            />
          ))}
        </>
      )}
    </div>
  );
}

/** The DOM layer over the canvas: both players and their ghost copies. */
export function CutoutLayer({ registry: reg, customizations }: { registry: CutoutRegistry; customizations: Record<ZoneSide, AvatarCustomization | null> }) {
  return (
    <div className="pointer-events-none absolute inset-0 z-[3] overflow-hidden">
      {SIDES.map((side) => (
        <div key={side}>
          {reg[side].ghosts.map((els, i) => (
            <Figure key={i} customization={customizations[side]} seed={SEED[side]} els={els} main={false} side={side} />
          ))}
          <Figure customization={customizations[side]} seed={SEED[side]} els={reg[side].main} main side={side} />
        </div>
      ))}
    </div>
  );
}

const _a = new THREE.Vector3();
const _b = new THREE.Vector3();
const _right = new THREE.Vector3();

interface Look {
  opacity: number;
  /** CSS filter: blur, darkness, fog. */
  filter: string;
  armband: boolean;
  /** `on` 0–1: being put on (from the waist) / 1 worn; `off` 0–1: being tossed away. `card`: Goalkeeper Gloves (glowing). */
  gloves: { on: number; off: number; card: boolean; flash: number; beaten: boolean };
  boots: number;
  bootsTone: 'gold' | 'mint';
  locked: boolean;
  bluff: boolean;
}

const NO_GLOVES: Look['gloves'] = { on: 0, off: 1, card: false, flash: 0, beaten: false };

/** Project a cut-out pose and write its CSS (module scope: the elements are DOM, not React state). */
function layoutFigure(els: CutoutEls, pose: CutoutPose, look: Look, camera: THREE.Camera, size: { width: number; height: number }, now: number) {
  const root = els.root;
  if (!root) return;
  const foot = _a.set(pose.x, pose.y, pose.z).project(camera);
  if (foot.z > 1 || look.opacity <= 0.01) {
    root.style.opacity = '0';
    return;
  }
  const fx = ((foot.x + 1) / 2) * size.width;
  const fy = ((1 - foot.y) / 2) * size.height;
  // Pixels per world unit at the figure's depth, across the view.
  _right.setFromMatrixColumn(camera.matrixWorld, 0);
  const side = _b.set(pose.x, pose.y, pose.z).add(_right).project(camera);
  const pxPerUnit = Math.hypot(((side.x - foot.x) / 2) * size.width, ((side.y - foot.y) / 2) * size.height);
  // The figure's lean, as the screen sees it (a dive or a fall towards / away from the camera shortens it).
  const tall = CUTOUT_H * CUTOUT_BASE;
  const top = _b.set(pose.x, pose.y, pose.z).addScaledVector(pose.up, tall).project(camera);
  const tx = ((top.x + 1) / 2) * size.width - fx;
  const ty = ((1 - top.y) / 2) * size.height - fy;
  const angle = Math.atan2(tx, -ty);
  const shown = Math.hypot(tx, ty) / Math.max(1, tall * pxPerUnit);
  const scale = (CUTOUT_H * pxPerUnit) / BASE_H;
  const sx = scale * pose.sx;
  const sy = scale * pose.sy * THREE.MathUtils.clamp(shown, 0.35, 1.15);
  root.style.transform = `translate3d(${(fx - BASE_W / 2).toFixed(1)}px, ${(fy - BASE_H * CUTOUT_BASE).toFixed(1)}px, 0) rotate(${angle.toFixed(3)}rad) scale(${sx.toFixed(3)}, ${sy.toFixed(3)})`;
  root.style.opacity = look.opacity.toFixed(2);
  root.style.filter = look.filter;
  // Nearer figures in front.
  root.style.zIndex = String(1000 - Math.round(camera.position.distanceTo(_a.set(pose.x, pose.y, pose.z)) * 10));
  if (els.art) els.art.style.transform = `scaleX(${pose.face}) rotateY(${pose.spin.toFixed(3)}rad)`;
  if (els.body) applyFullBodyPose(els.body, pose.body);
  if (els.armband) els.armband.style.opacity = look.armband ? String(0.85 + 0.15 * Math.sin(now * 6)) : '0';
  if (els.gloves) {
    const g = look.gloves;
    const shown = g.on > 0 && g.off < 1;
    els.gloves.style.opacity = shown ? '1' : '0';
    els.gloves.style.filter = g.beaten ? 'grayscale(1) brightness(0.6)' : `brightness(${(1 + g.flash * 0.8).toFixed(2)})`;
    if (shown) {
      els.hands.forEach((hand, i) => {
        if (!hand) return;
        const inward = i === 0 ? 1 : -1;
        // On: from behind the waist up to the hand. Off: flung outwards, spinning, and gone.
        const away = 1 - g.on;
        const dx = inward * 160 * away - inward * 240 * g.off;
        const dy = 330 * away - 260 * g.off * (1 - g.off) * 2 + 120 * g.off * g.off;
        const spin = (inward * 50 * away + -inward * 420 * g.off).toFixed(0);
        // Big enough to read on a phone: the hands are small on a full-body figure.
        const size = (g.card ? 2.1 : 1.7) * (0.6 + 0.4 * g.on) * (1 + 0.06 * Math.sin(now * 5) + g.flash * 0.35);
        hand.style.transform = `translate(${dx.toFixed(0)}%, ${dy.toFixed(0)}%) rotate(${spin}deg) scale(${size.toFixed(3)})`;
        hand.style.opacity = String(1 - g.off);
        hand.style.background = g.card ? 'radial-gradient(closest-side, rgba(255,255,255,0.95), rgba(90,220,255,0.75) 55%, rgba(30,150,255,0))' : 'none';
      });
    }
  }
  if (els.boots) {
    els.boots.style.opacity = look.boots.toFixed(2);
    els.boots.style.background = BOOT_GLOW[look.bootsTone];
  }
  if (els.lock) els.lock.style.opacity = look.locked ? String(0.85 + 0.15 * Math.sin(now * 4)) : '0';
  if (els.bluff) els.bluff.style.opacity = look.bluff ? String(Math.min(1, look.opacity * 1.8)) : '0';
  // Confetti bursting up and falling, for two seconds after a celebration starts.
  const age = pose.party > 0 ? now - pose.party : Infinity;
  els.confetti.forEach((piece, i) => {
    if (!piece) return;
    if (age > 2.2) {
      piece.style.opacity = '0';
      return;
    }
    const a = -Math.PI / 2 + ((i / CONFETTI) - 0.5) * 2.4;
    const v = 260 + (i % 4) * 55;
    const x = Math.cos(a) * v * age;
    const y = Math.sin(a) * v * age + 380 * age * age;
    piece.style.opacity = String(Math.max(0, 1 - age / 2.2));
    piece.style.transform = `translate(${x.toFixed(1)}px, ${y.toFixed(1)}px) rotate(${(age * 720 + i * 40).toFixed(0)}deg)`;
  });
}

const isDark = (fx: CardFx) => fx.dark !== null && Date.now() >= fx.dark.from && Date.now() < fx.dark.until;

/** Inside the Canvas: places every cut-out after the director and the effects have run. */
export function CutoutDriver({ director, engine, fx, registry: reg, clock }: { director: DuelDirector; engine: CardEffectsEngine; fx: RefObject<CardFx>; registry: CutoutRegistry; clock: SceneClock }) {
  const ghostPose = useMemo(() => blankPose(), []);
  const hopPose = useMemo(() => blankPose(), []);
  const fogLevel = useRef(0);
  // When each side last started / stopped wearing gloves (the put-on and toss-away beats).
  const gloveState = useRef<Record<ZoneSide, { wearing: boolean; since: number }>>({ player: { wearing: false, since: -10 }, opponent: { wearing: false, since: -10 } });
  useFrame(({ camera, size }, delta) => {
    const now = clock.now();
    const f = fx.current;
    const sfx = director.scriptFx;
    fogLevel.current = THREE.MathUtils.damp(fogLevel.current, f.fog ? 1 : 0, 1.8, Math.min(delta * clock.rate(), 0.1));
    const dark = isDark(f);
    const reduced = engine.extras.reduced;
    for (const side of SIDES) {
      const lit = !dark || f.dark?.victim === side;
      // A card firing: a quick fist-pump hop.
      const pose = hopped(hopPose, director.poseOf(side), reduced ? 10 : now - engine.extras.activation[side]);
      // Gloves: on while in goal for a shot (or while Goalkeeper Gloves are on), off when it is over.
      const card = f.gloves[side] || sfx.gloves?.side === side;
      const wearing = card || director.keeper === side;
      const state = gloveState.current[side];
      if (wearing !== state.wearing) {
        state.wearing = wearing;
        state.since = now;
      }
      const t = reduced ? 10 : now - state.since;
      const gloves: Look['gloves'] = {
        on: wearing ? smoothStep(t / 0.5) : 1,
        off: wearing ? 0 : smoothStep(t / 0.65),
        card,
        flash: sfx.gloves?.side === side ? sfx.gloves.flash : 0,
        beaten: sfx.gloves?.side === side && sfx.gloves.beaten,
      };
      if (t < 0.7) keepAnimating(engine, now);
      const booked = f.booked.includes(side);
      const blur = pose.blur * 2.2 + fogLevel.current * 0.8;
      const filter = [
        blur > 0.05 ? `blur(${blur.toFixed(2)}px)` : '',
        lit ? (dark ? 'brightness(1.15) drop-shadow(0 0 14px rgba(255,240,200,0.8))' : '') : 'brightness(0.22)',
        fogLevel.current > 0.05 ? `opacity(${(1 - 0.25 * fogLevel.current).toFixed(2)})` : '',
        // Booked: a yellow tint.
        booked ? 'sepia(1) saturate(3.2) hue-rotate(-12deg) brightness(1.08)' : '',
      ].join(' ');
      const golden = sfx.goldBoots?.side === side ? sfx.goldBoots.glow : f.goldenBoot === side ? 0.8 : 0;
      const firstTouch = f.firstTouch === side ? 0.6 + 0.3 * Math.sin(now * 5) : 0;
      layoutFigure(reg[side].main, pose, {
        opacity: 1,
        filter,
        armband: f.armband === side,
        gloves,
        boots: Math.max(golden, firstTouch),
        bootsTone: golden >= firstTouch ? 'gold' : 'mint',
        locked: booked,
        bluff: false,
      }, camera, size, now);
    }
    // Ghost copies (translucent avatar art) from the effects engine.
    const used: Record<ZoneSide, number> = { player: 0, opponent: 0 };
    for (const g of engine.ghostRequests) {
      const els = reg[g.side].ghosts[used[g.side]];
      if (!els) continue;
      used[g.side] += 1;
      // The decoy dissolves (blurs away) as the bluff is revealed.
      const dissolve = g.bluff ? `blur(${((1 - g.opacity / 0.55) * 6).toFixed(1)}px) ` : '';
      layoutFigure(els, poseGhost(ghostPose, g, now), {
        opacity: g.opacity,
        filter: `${dissolve}saturate(0.6) brightness(1.25) drop-shadow(0 0 10px rgba(140,220,255,0.9))`,
        armband: false,
        gloves: NO_GLOVES,
        boots: 0,
        bootsTone: 'gold',
        locked: false,
        bluff: Boolean(g.bluff),
      }, camera, size, now);
    }
    for (const side of SIDES) {
      reg[side].ghosts.slice(used[side]).forEach((els) => hideFigure(els));
    }
  });
  return null;
}

/** A ghost's cut-out pose from the script's request. */
function poseGhost(out: CutoutPose, g: GhostFx, now: number): CutoutPose {
  clipPose(out, g.clip, g.time, g.yaw, now, 0, g.clip === 'dribble' ? 9 : 0);
  out.x = g.x;
  out.y += g.y;
  out.z = g.z;
  out.party = 0;
  return out;
}

/** Gloves going on / coming off: hold the full frame rate for them. */
function keepAnimating(engine: CardEffectsEngine, now: number) {
  engine.keepBusyUntil(now + 0.2);
}

const smoothStep = (t: number) => {
  const u = Math.min(1, Math.max(0, t));
  return u * u * (3 - 2 * u);
};

/** The pose with a card's activation hop on top (a copy: the director's pose is left alone). */
function hopped(out: CutoutPose, pose: CutoutPose, age: number): CutoutPose {
  if (age >= 0.6) return pose;
  Object.assign(out, pose);
  const k = Math.sin(Math.PI * (age / 0.6));
  out.y = pose.y + 0.7 * k;
  out.sy = pose.sy * (1 + 0.08 * k);
  out.sx = pose.sx * (1 - 0.05 * k);
  return out;
}

function hideFigure(els: CutoutEls) {
  if (els.root) els.root.style.opacity = '0';
}
