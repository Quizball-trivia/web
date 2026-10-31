'use client';

/**
 * The app's avatar, full body: the real, unchanged upper body (AvatarPreview — skin, jersey, hair, accessories) on top
 * of a drawn lower body in the same flat style (no outlines, flat fills, one darker shade panel): legs in the avatar's
 * skin tone, loose shorts and mid-calf socks that go with its jersey, chunky football boots. The jersey is trimmed to a
 * straight hem over the shorts' waistband.
 *
 * Hips, knees and ankles are SVG groups posed by rotation (`applyFullBodyPose`, poses in zoneMatch.fullBody), and the
 * upper body leans / shifts with one CSS transform — animation never touches layout.
 */

import { useLayoutEffect, useMemo, useState, type CSSProperties, type ReactNode } from 'react';
import { AvatarPreview } from '@/components/AvatarPreview';
import { resolveAvatarCustomization } from '@/lib/avatars';
import { getSkinPart } from '@/lib/avatars/parts';
import type { AvatarCustomization } from '@/types/game';
import {
  ANKLE_Y,
  ARM,
  FULL_H,
  FULL_W,
  HIP_X,
  HIP_Y,
  KNEE_Y,
  STAND,
  armJoints,
  fullBodyColors,
  mixHex,
  shade,
  type FullBodyColors,
  type FullBodyPose,
  type HandShape,
} from './zoneMatch.fullBody';

const MUD = '#5B3A1D';
/** Boots caked in mud (Muddy Pitch). */
const MUD_BOOTS: Partial<FullBodyColors> = { boots: '#5B3A1D', bootShade: '#46290F', bootTrim: '#8A6236', sole: '#3B2511', laces: '#A9845A' };

const UPPER_H = 543;
/** The jersey's middle (it spans 140–350). */
const MID_X = 245;
/** Inside the jersey's rounded bottom corners, so no sliver shows beside the hem. */
const SHORTS_HALF = 102;
const SHORTS_TOP = 450;
const SHORTS_HEM = 596;
const SOCK_TOP = KNEE_Y + 34;
/** Where the shorts' legs part. */
const CROTCH_Y = HIP_Y + 46;
/**
 * The app's jerseys end in a V (they are cut for a waist-up crop): the full body trims them to a straight, slightly
 * curved hem so they sit over the shorts like a shirt. Art units of the 496 × 543 upper canvas; the WL retro shirts'
 * V starts higher.
 */
const HEM: [number, number][] = [[100, 486], [70, 486], [60, 489], [50, 491], [40, 489], [30, 486], [0, 486]];
const HEM_LIFT: Record<string, number> = { jersey_wl_retro_home: 26, jersey_wl_retro_away: 26, jersey_wl_retro_training: 33 };

function hemClip(jersey: string | undefined, armsOff = false): string {
  const lift = (jersey && HEM_LIFT[jersey]) || 0;
  const y = (v: number) => `${(((v - lift) / UPPER_H) * 100).toFixed(2)}%`;
  if (!armsOff) return `polygon(-50% -60%, 150% -60%, 150% ${y(HEM[0][1])}, ${HEM.map(([x, v]) => `${x}% ${y(v)}`).join(', ')}, -50% ${y(HEM[0][1])})`;
  // Moving arms: the art's own raised arms are cut away — the head, the neck, the body and the sleeves stay (the
  // outline below runs just outside them, between the hands and the head; measured on the skin and jersey art).
  const px = (x: number) => `${((x / 496) * 100).toFixed(2)}%`;
  const py = (v: number) => `${((v / UPPER_H) * 100).toFixed(2)}%`;
  const right: [number, number][] = [[800, -300], [800, 108], [412, 108], [414, 326], [404, 342], [391, 357], [375, 371], [356, 386], [352, 400]];
  const left: [number, number][] = [[140, 400], [124, 389], [89, 387], [72, 356], [62, 326], [66, 309], [80, 293], [100, 278], [106, 262], [106, 88], [-300, 88]];
  const hemY = (xPct: number) => {
    for (let i = 0; i < HEM.length - 1; i += 1) {
      const [x0, y0] = HEM[i];
      const [x1, y1] = HEM[i + 1];
      if (xPct <= x0 && xPct >= x1) return y0 + ((y1 - y0) * (xPct - x0)) / (x1 - x0);
    }
    return HEM[0][1];
  };
  const hem = HEM.filter(([x]) => x < (352 / 496) * 100 && x > (140 / 496) * 100).map(([x, v]) => `${x}% ${y(v)}`);
  return `polygon(${[[-300, -300] as [number, number], ...right].map(([x, v]) => `${px(x)} ${py(v)}`).join(', ')}, ${px(352)} ${y(hemY((352 / 496) * 100))}, ${hem.join(', ')}, ${px(140)} ${y(hemY((140 / 496) * 100))}, ${left.map(([x, v]) => `${px(x)} ${py(v)}`).join(', ')})`;
}

type Joint = 'hipL' | 'kneeL' | 'ankleL' | 'hipR' | 'kneeR' | 'ankleR';
export interface FullBodyEls {
  upper: HTMLDivElement | null;
  legs: SVGGElement | null;
  joints: Partial<Record<Joint, SVGGElement | null>>;
  shorts: SVGPathElement | null;
  folds: SVGPathElement | null;
  /** Moving arms (celebrations): each arm's upper arm, forearm and hand, and the hand's shapes. */
  arms: Partial<Record<'L' | 'R', { upper: SVGGElement | null; fore: SVGGElement | null; hand: SVGGElement | null; shapes: Partial<Record<HandShape, SVGGElement | null>> }>>;
}

const FALLBACK: AvatarCustomization = { skin: 'skin_male_white', jersey: 'jersey_green', hair: 'hair_boy_basic' };

type Pt = [number, number];
const fmt = ([x, y]: Pt) => `${x.toFixed(1)} ${y.toFixed(1)}`;
/** `p` turned by `deg` about (cx, cy), clockwise on screen (as SVG and CSS rotate). */
function turn([px, py]: Pt, deg: number, cx: number, cy: number): Pt {
  const r = (deg * Math.PI) / 180;
  const c = Math.cos(r);
  const s = Math.sin(r);
  return [cx + (px - cx) * c - (py - cy) * s, cy + (px - cx) * s + (py - cy) * c];
}

/** The convex hull of a few points (monotone chain). */
function hull(points: Pt[]): Pt[] {
  const sorted = [...points].sort((a, b) => a[0] - b[0] || a[1] - b[1]);
  const cross = (o: Pt, a: Pt, b: Pt) => (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0]);
  const half = (list: Pt[]) => {
    const out: Pt[] = [];
    for (const p of list) {
      while (out.length >= 2 && cross(out[out.length - 2], out[out.length - 1], p) <= 0) out.pop();
      out.push(p);
    }
    out.pop();
    return out;
  };
  return [...half(sorted), ...half([...sorted].reverse())];
}

/** A closed outline, always wound the same way: overlapping pieces then fill as one (nonzero), never cancel out. */
function ring(points: Pt[]): string {
  let area = 0;
  for (let i = 0; i < points.length; i += 1) {
    const [x0, y0] = points[i];
    const [x1, y1] = points[(i + 1) % points.length];
    area += x0 * y1 - x1 * y0;
  }
  const ordered = area < 0 ? [...points].reverse() : points;
  return `M${ordered.map(fmt).join(' L')} Z`;
}

/**
 * The shorts, three overlapping pieces of one colour: a leg on each thigh (turning with it about the hip) and the
 * seat between them, whose waist rides with the jersey (its lean) and whose sides hold on to the thighs at the hip.
 * Each piece is convex, so however the legs swing or cross, no outline folds over itself, and the overlaps don't show.
 */
export function shortsPaths(pose: FullBodyPose): { body: string; folds: string } {
  const waist = (p: Pt) => turn(p, pose.lean, FULL_W / 2, HIP_Y);
  const leg = (side: 'L' | 'R', dx: number, y: number) => {
    const x = HIP_X[side];
    const o = side === 'L' ? -1 : 1;
    return turn([x + o * dx, y], side === 'L' ? -pose.hipL : -pose.hipR, x, HIP_Y);
  };
  const panel = (side: 'L' | 'R') =>
    ring([
      leg(side, -50, HIP_Y - 16),
      leg(side, 51, HIP_Y - 16),
      leg(side, 56, SHORTS_HEM - 10),
      leg(side, 55, SHORTS_HEM - 3),
      leg(side, 48, SHORTS_HEM),
      leg(side, -40, SHORTS_HEM + 4),
      leg(side, -50, CROTCH_Y),
    ]);
  // The seat is the outline around its corners: convex however far the thighs turn.
  const seat = ring(hull([
    waist([MID_X - SHORTS_HALF, SHORTS_TOP]),
    waist([MID_X + SHORTS_HALF, SHORTS_TOP]),
    leg('R', 51, HIP_Y - 16),
    waist([MID_X, CROTCH_Y]),
    leg('L', 51, HIP_Y - 16),
    // The inner edge of each leg near the crotch: a leg swung far out (a slide, a high kick) pulls the seat with it
    // instead of opening a gap between them.
    leg('L', -48, CROTCH_Y + 6),
    leg('R', -48, CROTCH_Y + 6),
    leg('L', -44, CROTCH_Y + 22),
    leg('R', -44, CROTCH_Y + 22),
  ]));
  const fold = (side: 'L' | 'R') => ring([leg(side, -50, CROTCH_Y), leg(side, -40, SHORTS_HEM + 4), leg(side, -32, SHORTS_HEM + 3)]);
  return { body: `${panel('L')} ${seat} ${panel('R')}`, folds: `${fold('L')} ${fold('R')}` };
}

/** Pose the figure (cheap: one CSS transform, a few SVG transforms and the shorts' outline). */
export function applyFullBodyPose(els: FullBodyEls, pose: FullBodyPose) {
  if (pose.arms) {
    for (const side of ['L', 'R'] as const) {
      const a = pose.arms[side];
      const g = els.arms[side];
      if (!g) continue;
      const [sx, sy] = ARM.shoulder[side];
      const { elbow, wrist } = armJoints(side, a);
      g.upper?.setAttribute('transform', `translate(${sx} ${sy}) rotate(${(-a.upper).toFixed(1)})`);
      g.fore?.setAttribute('transform', `translate(${elbow[0].toFixed(1)} ${elbow[1].toFixed(1)}) rotate(${(-a.fore).toFixed(1)})`);
      // (The hand art is drawn small: scaled up to the art's chunky hands.)
      g.hand?.setAttribute('transform', `translate(${wrist[0].toFixed(1)} ${wrist[1].toFixed(1)}) rotate(${(-a.hand).toFixed(1)}) scale(${side === 'R' ? -1.35 : 1.35} 1.35)`);
      for (const [shape, el] of Object.entries(g.shapes)) el?.setAttribute('display', shape === a.shape ? 'inline' : 'none');
    }
  }
  if (els.upper) {
    els.upper.style.transform = `translate(${((pose.bodyX / FULL_W) * 100).toFixed(2)}%, ${((pose.bodyY / UPPER_H) * 100).toFixed(2)}%) rotate(${pose.lean.toFixed(1)}deg)`;
  }
  els.legs?.setAttribute('transform', `translate(${pose.bodyX.toFixed(1)} ${pose.bodyY.toFixed(1)})`);
  const set = (joint: Joint, deg: number, x: number, y: number) => els.joints[joint]?.setAttribute('transform', `rotate(${deg.toFixed(1)} ${x} ${y})`);
  // SVG rotates clockwise: a leg swinging forward (+x) turns counter-clockwise about the hip.
  set('hipL', -pose.hipL, HIP_X.L, HIP_Y);
  set('kneeL', pose.kneeL, HIP_X.L, KNEE_Y);
  set('ankleL', -pose.ankleL, HIP_X.L, ANKLE_Y);
  set('hipR', -pose.hipR, HIP_X.R, HIP_Y);
  set('kneeR', pose.kneeR, HIP_X.R, KNEE_Y);
  set('ankleR', -pose.ankleR, HIP_X.R, ANKLE_Y);
  if (els.shorts || els.folds) {
    const { body, folds } = shortsPaths(pose);
    els.shorts?.setAttribute('d', body);
    els.folds?.setAttribute('d', folds);
  }
}

function Boot({ x, c, tone }: { x: number; c: FullBodyColors; tone: (hex: string) => string }) {
  const a = ANKLE_Y;
  const g = a + 37;
  return (
    <>
      {/* Side view, toe forward: the leg drops into a padded collar over the heel, the instep slopes to a rounded toe. */}
      <path
        d={`M${x - 34} ${a - 14} Q${x - 2} ${a - 23} ${x + 30} ${a - 18} Q${x + 40} ${a - 4} ${x + 54} ${a + 2} Q${x + 76} ${a + 8} ${x + 78} ${a + 20} Q${x + 79} ${a + 27} ${x + 70} ${a + 27} H${x - 30} Q${x - 39} ${a + 27} ${x - 39} ${a + 16} L${x - 37} ${a - 4} Q${x - 37} ${a - 12} ${x - 34} ${a - 14} Z`}
        fill={tone(c.boots)}
      />
      <path d={`M${x - 34} ${a - 14} Q${x - 2} ${a - 23} ${x + 30} ${a - 18} L${x + 32} ${a - 11} Q${x - 2} ${a - 16} ${x - 36} ${a - 6} Z`} fill={tone(c.bootShade)} />
      {[0, 17].map((dx) => (
        <path key={dx} d={`M${x - 12 + dx} ${a + 21} L${x + 2 + dx} ${a + 3} H${x + 11 + dx} L${x - 3 + dx} ${a + 21} Z`} fill={tone(c.bootTrim)} />
      ))}
      {[[31, -7], [40, -2], [49, 2]].map(([dx, dy]) => (
        <path key={dx} d={`M${x + dx - 3} ${a + dy + 4} L${x + dx + 3} ${a + dy - 4}`} stroke={tone(c.laces)} strokeWidth={4.5} strokeLinecap="round" />
      ))}
      <rect x={x - 39} y={a + 23} width={118} height={9} rx={4.5} fill={tone(c.sole)} />
      {[-30, -10, 28, 46, 64].map((dx) => (
        <rect key={dx} x={x + dx} y={a + 30} width={10} height={g - a - 30} rx={2} fill={tone(c.sole)} />
      ))}
    </>
  );
}

function Leg({ x, c, side, els, pad = false }: { x: number; c: FullBodyColors; side: 'L' | 'R'; els: FullBodyEls; pad?: boolean }) {
  const back = side === 'L';
  /** Outward, away from the other leg. */
  const o = back ? -1 : 1;
  const X = (dx: number) => x + o * dx;
  const tone = (hex: string) => (back ? shade(hex, 0.07) : hex);
  const sockStripe = c.sockBand.toLowerCase() !== c.socks.toLowerCase();
  return (
    <g ref={(el) => keepJoint(els, `hip${side}`, el)}>
      {/* Thigh, under loose shorts. */}
      <rect x={x - 27} y={HIP_Y - 20} width={54} height={KNEE_Y - HIP_Y + 40} rx={27} fill={tone(c.skin)} />
      <g ref={(el) => keepJoint(els, `knee${side}`, el)}>
        {/* Shin, then a sock to mid-calf with a turned-down cuff. */}
        <rect x={x - 25} y={KNEE_Y - 16} width={50} height={ANKLE_Y - KNEE_Y + 20} rx={25} fill={tone(c.skin)} />
        <rect x={back ? x + 13 : x - 23} y={KNEE_Y + 4} width={10} height={SOCK_TOP - KNEE_Y - 4} rx={5} fill={tone(c.skinShade)} />
        <path d={`M${x - 30} ${SOCK_TOP} H${x + 30} L${x + 27} ${ANKLE_Y - 2} H${x - 27} Z`} fill={tone(c.socks)} />
        <path d={`M${X(-30)} ${SOCK_TOP} H${X(-16)} L${X(-14)} ${ANKLE_Y - 2} H${X(-27)} Z`} fill={tone(c.sockShade)} />
        <rect x={x - 32} y={SOCK_TOP - 4} width={64} height={20} rx={6} fill={tone(c.socks)} />
        {sockStripe && <rect x={x - 32} y={SOCK_TOP + 3} width={64} height={6} fill={tone(c.sockBand)} />}
        <rect x={x - 31} y={SOCK_TOP + 14} width={62} height={4} rx={2} fill={tone(c.sockShade)} />
        {pad && (
          // Shin Pads: on the front of the shin (the toe side), from below the knee over the sock's cuff.
          <g transform={`translate(${x + 6} ${KNEE_Y + 62})`} opacity={back ? 0.92 : 1}>
            <path d="M-20 -48 Q0 -56 20 -48 L22 30 Q0 52 -22 30 Z" fill={tone('#F4F6F8')} stroke={tone('#1645FF')} strokeWidth={4.5} strokeLinejoin="round" />
            <path d="M-14 -40 Q0 -46 14 -40 L15 -32 Q0 -38 -15 -32 Z" fill={tone('#C9D6FF')} />
            <path d="M-9 -12 h18 v12 q0 12 -9 16 q-9 -4 -9 -16 Z" fill={tone('#58CC02')} stroke="#14213D" strokeWidth={2} />
          </g>
        )}
        <g ref={(el) => keepJoint(els, `ankle${side}`, el)}>
          {/* The sock's end turns with the foot (a round joint under the boot's collar): no sock edge pokes out of the
              boot at any ankle angle. Both boots point the way the face looks (the cut-out mirrors as a whole). */}
          <circle cx={x} cy={ANKLE_Y - 2} r={27} fill={tone(c.socks)} />
          <Boot x={x} c={c} tone={tone} />
        </g>
      </g>
    </g>
  );
}

function keepJoint(els: FullBodyEls, joint: Joint, el: SVGGElement | null) {
  els.joints[joint] = el;
}
function keepShorts(els: FullBodyEls, el: SVGPathElement | null, part: 'shorts' | 'folds') {
  els[part] = el;
}
function keepUpper(els: FullBodyEls, el: HTMLDivElement | null) {
  els.upper = el;
}
function keepLegs(els: FullBodyEls, el: SVGGElement | null) {
  els.legs = el;
}

/**
 * The gloves are the hands' own outline (the skin art, a touch bigger), so they fit any skin: each hand's box, the
 * fingers (lime) and the wrist strap (white), in upper-body art units — measured on the skin art.
 */
export const GLOVE_HANDS = {
  R: { box: [410, 110, 496, 232], fingers: [413, 143, 472, 214], strap: [436, 208, 490, 224], centre: [452, 172] },
  L: { box: [8, 86, 102, 222], fingers: [48, 122, 102, 200], strap: [14, 198, 66, 214], centre: [58, 150] },
} as const;

/** % of the upper body's box, from its art units. */
const pctX = (x: number) => `${((x / 496) * 100).toFixed(2)}%`;
const pctY = (y: number) => `${((y / 543) * 100).toFixed(2)}%`;

/**
 * A keeper glove on one hand: the hand's own outline from the skin art (so it fits whatever the skin), a touch bigger
 * — blue, lime over the fingers, a white wrist strap.
 */
function Glove({ hand, skinUrl }: { hand: 'L' | 'R'; skinUrl: string }) {
  const g = GLOVE_HANDS[hand];
  const [x0, y0, x1, y1] = g.box;
  const rect = (r: readonly number[]) => ({ left: pctX(r[0]), top: pctY(r[1]), width: pctX(r[2] - r[0]), height: pctY(r[3] - r[1]) });
  return (
    <div
      className="absolute inset-x-0 top-0"
      style={{
        aspectRatio: '496 / 543',
        WebkitMaskImage: `url(${skinUrl})`,
        maskImage: `url(${skinUrl})`,
        WebkitMaskSize: '100% 100%',
        maskSize: '100% 100%',
        clipPath: `inset(${pctY(y0)} ${pctX(496 - x1)} ${pctY(543 - y1)} ${pctX(x0)})`,
        transform: 'scale(1.07)',
        transformOrigin: `${pctX(g.centre[0])} ${pctY(g.centre[1])}`,
      }}
    >
      <div className="absolute inset-0" style={{ background: 'linear-gradient(160deg, #3B74FF, #1645FF 45%, #0E2FB0)' }} />
      <div className="absolute rounded-[30%]" style={{ ...rect(g.fingers), background: 'linear-gradient(170deg, #8EE53F, #58CC02 60%, #3E9A00)' }} />
      <div className="absolute" style={{ ...rect(g.strap), background: '#F4F6F8', boxShadow: 'inset 0 -3px 0 rgba(0,0,0,0.18)' }} />
      <div className="absolute inset-0" style={{ background: 'radial-gradient(40% 30% at 45% 30%, rgba(255,255,255,0.35), transparent 70%)' }} />
    </div>
  );
}

/** Goalkeeper gloves on both hands of this avatar (fitted to its skin art), for an upper-body overlay. */
export function KeeperGloves({ customization }: { customization: AvatarCustomization | null }) {
  const skinUrl = useMemo(() => getSkinPart(resolveAvatarCustomization(customization ?? FALLBACK).skin).asset, [customization]);
  return (
    <>
      <Glove hand="L" skinUrl={skinUrl} />
      <Glove hand="R" skinUrl={skinUrl} />
    </>
  );
}

const HAND_SHAPES: HandShape[] = ['open', 'flat', 'fist', 'point', 'thumb', 'shaka', 'heart', 'ok'];

/**
 * A hand, wrist at (0, 0), the fingers towards +y, the thumb on the +x side (the right hand is drawn mirrored):
 * a palm, four fingers (out, or curled to a knuckle) and a thumb, posed per shape. Flat fills like the art.
 */
function HandShapeArt({ shape, skin, skinShade }: { shape: HandShape; skin: string; skinShade: string }) {
  const finger = (x: number, len: number, key: string) => <rect key={key} x={x - 5.5} y={26} width={11} height={len + 8} rx={5.5} fill={skin} />;
  const knuckle = (x: number, key: string) => <circle key={key} cx={x} cy={36} r={6.5} fill={skin} />;
  const thumb = (angle: number, len: number) => (
    <g transform={`translate(15 12) rotate(${-angle})`}>
      <rect x={-6} y={-2} width={12} height={len} rx={6} fill={skin} />
    </g>
  );
  const xs = [-14, -4.5, 5, 14];
  const palm = <rect x={-20} y={-4} width={40} height={40} rx={13} fill={skin} />;
  const crease = <path d="M-12 22 Q0 28 12 22" stroke={skinShade} strokeWidth={3} fill="none" strokeLinecap="round" />;
  switch (shape) {
    case 'open':
      return <>{thumb(-60, 28)}{palm}{xs.map((x, i) => finger(x, [24, 30, 30, 26][i], `f${i}`))}{crease}</>;
    case 'flat':
      return <>{thumb(-12, 24)}{palm}{xs.map((x, i) => finger(x * 0.8, [24, 28, 28, 25][i], `f${i}`))}</>;
    case 'fist':
      return <>{palm}{xs.map((x, i) => knuckle(x, `k${i}`))}{thumb(-95, 22)}</>;
    case 'point':
      return <>{palm}{xs.slice(0, 3).map((x, i) => knuckle(x, `k${i}`))}{finger(14, 34, 'i')}{thumb(-95, 20)}</>;
    case 'thumb':
      return <>{palm}{xs.map((x, i) => knuckle(x, `k${i}`))}{thumb(0, 34)}</>;
    case 'shaka':
      return <>{thumb(-70, 28)}{palm}{xs.slice(1).map((x, i) => knuckle(x, `k${i}`))}{finger(-14, 26, 'p')}</>;
    case 'heart':
      // The fingers curve round towards the other hand: half a heart.
      return (
        <>
          {palm}
          <path d="M-14 30 C-20 64 6 80 22 62" stroke={skin} strokeWidth={22} fill="none" strokeLinecap="round" />
          {thumb(-120, 26)}
        </>
      );
    case 'ok':
      return (
        <>
          {palm}
          {xs.slice(0, 3).map((x, i) => finger(x - 2, [24, 28, 26][i], `f${i}`))}
          <circle cx={18} cy={34} r={11} stroke={skin} strokeWidth={9} fill="none" />
        </>
      );
  }
}

/** The moving arms: the upper arms behind the body (the sleeves cover their tops), the forearms and hands in front. */
function MovingArms({ layer, colors, els }: { layer: 'back' | 'front'; colors: FullBodyColors; els: FullBodyEls }) {
  const arm = (side: 'L' | 'R') => (els.arms[side] ??= { upper: null, fore: null, hand: null, shapes: {} });
  return (
    <svg className="pointer-events-none absolute inset-x-0 top-0 w-full overflow-visible" style={{ aspectRatio: '496 / 543' }} viewBox="0 0 496 543" aria-hidden>
      {(['L', 'R'] as const).map((side) =>
        layer === 'back' ? (
          <g key={side} ref={(el) => void (arm(side).upper = el)}>
            <rect x={-ARM.upperW / 2} y={-ARM.upperW / 2} width={ARM.upperW} height={ARM.upper + ARM.upperW} rx={ARM.upperW / 2} fill={colors.skin} />
            <rect x={ARM.upperW / 2 - 12} y={0} width={9} height={ARM.upper} rx={4.5} fill={colors.skinShade} />
          </g>
        ) : (
          <g key={side}>
            <g ref={(el) => void (arm(side).fore = el)}>
              <circle r={ARM.upperW / 2 - 1} fill={colors.skin} />
              <rect x={-ARM.foreW / 2} y={0} width={ARM.foreW} height={ARM.fore + 8} rx={ARM.foreW / 2} fill={colors.skin} />
            </g>
            <g ref={(el) => void (arm(side).hand = el)}>
              {HAND_SHAPES.map((shape) => (
                <g key={shape} display="none" ref={(el) => void (arm(side).shapes[shape] = el)}>
                  <HandShapeArt shape={shape} skin={colors.skin} skinShade={colors.skinShade} />
                </g>
              ))}
            </g>
          </g>
        ),
      )}
    </svg>
  );
}

export function AvatarFullBody({
  customization,
  seed = 0,
  pose = STAND,
  onEls,
  className,
  style,
  upperOverlay,
  bootColors,
  muddy = false,
  upperUnderlay,
  shinPads = false,
  gloves = false,
  movingArms = false,
}: {
  customization: AvatarCustomization | null;
  /** Picks the boots. */
  seed?: number;
  /** A static pose (animated callers pose the figure through `onEls` instead). */
  pose?: FullBodyPose;
  /** The figure's posable parts, for per-frame animation. */
  onEls?: (els: FullBodyEls) => void;
  className?: string;
  style?: CSSProperties;
  /** Drawn over the upper body and moving with it (card glows on the arms and hands). */
  upperOverlay?: ReactNode;
  /** A boot in other colours (Golden Boot: the golden boot on his left foot). */
  bootColors?: Partial<Record<'L' | 'R', Partial<FullBodyColors>>>;
  /** Muddy Pitch: mud-brown boots and mud on the socks. */
  muddy?: boolean;
  /** Shin Pads: a pad strapped on the front of each shin. */
  shinPads?: boolean;
  /** Goalkeeper gloves on both hands. */
  gloves?: boolean;
  /** Arms that move (posed through the pose's `arms`) instead of the art's raised ones. */
  movingArms?: boolean;
  /** Drawn behind the upper body and moving with it (a card held in the hand, gripped by the fingers). */
  upperUnderlay?: ReactNode;
}) {
  // The same defaults AvatarPreview fills in (e.g. the default jersey), so the shorts match what is drawn.
  const resolved = useMemo(() => resolveAvatarCustomization(customization ?? FALLBACK), [customization]);
  const colors = useMemo(() => {
    const base = fullBodyColors(resolved, seed);
    if (!muddy) return base;
    return {
      ...base,
      ...MUD_BOOTS,
      socks: mixHex(base.socks, MUD, 0.45),
      sockShade: mixHex(base.sockShade, MUD, 0.55),
      sockBand: mixHex(base.sockBand, MUD, 0.35),
    };
  }, [resolved, seed, muddy]);
  const colorsL = useMemo(() => ({ ...colors, ...bootColors?.L }), [colors, bootColors?.L]);
  const colorsR = useMemo(() => ({ ...colors, ...bootColors?.R }), [colors, bootColors?.R]);
  const [els] = useState<FullBodyEls>(() => ({ upper: null, legs: null, joints: {}, shorts: null, folds: null, arms: {} }));
  useLayoutEffect(() => {
    applyFullBodyPose(els, pose);
  }, [els, pose]);
  useLayoutEffect(() => {
    onEls?.(els);
  }, [els, onEls]);

  return (
    <div className={className} style={{ position: 'relative', aspectRatio: `${FULL_W} / ${FULL_H}`, ...style }}>
      <svg className="absolute inset-0 size-full overflow-visible" viewBox={`0 0 ${FULL_W} ${FULL_H}`} aria-hidden>
        <g ref={(el) => keepLegs(els, el)}>
          <Leg x={HIP_X.L} c={colorsL} side="L" els={els} pad={shinPads} />
          <Leg x={HIP_X.R} c={colorsR} side="R" els={els} pad={shinPads} />
          <path ref={(el) => keepShorts(els, el, 'shorts')} fill={colors.shorts} />
          <path ref={(el) => keepShorts(els, el, 'folds')} fill={colors.shortsShade} />
        </g>
      </svg>
      <div
        ref={(el) => keepUpper(els, el)}
        className="absolute inset-x-0 top-0"
        style={{ transformOrigin: `50% ${((HIP_Y / UPPER_H) * 100).toFixed(1)}%` }}
      >
        {upperUnderlay}
        {movingArms && <MovingArms layer="back" colors={colors} els={els} />}
        <div className="relative" style={{ clipPath: hemClip(resolved.jersey, movingArms) }}>
          <AvatarPreview customization={customization ?? FALLBACK} width="100%" />
        </div>
        {movingArms && <MovingArms layer="front" colors={colors} els={els} />}
        {gloves && (
          <div className="pointer-events-none absolute inset-x-0 top-0" style={{ aspectRatio: '496 / 543' }}>
            <KeeperGloves customization={customization} />
          </div>
        )}
        {upperOverlay}
      </div>
    </div>
  );
}
