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
import type { AvatarCustomization } from '@/types/game';
import { ANKLE_Y, FULL_H, FULL_W, HIP_X, HIP_Y, KNEE_Y, STAND, fullBodyColors, shade, type FullBodyColors, type FullBodyPose } from './zoneMatch.fullBody';

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

function hemClip(jersey: string | undefined): string {
  const lift = (jersey && HEM_LIFT[jersey]) || 0;
  const y = (v: number) => `${(((v - lift) / UPPER_H) * 100).toFixed(2)}%`;
  return `polygon(-50% -60%, 150% -60%, 150% ${y(HEM[0][1])}, ${HEM.map(([x, v]) => `${x}% ${y(v)}`).join(', ')}, -50% ${y(HEM[0][1])})`;
}

type Joint = 'hipL' | 'kneeL' | 'ankleL' | 'hipR' | 'kneeR' | 'ankleR';
export interface FullBodyEls {
  upper: HTMLDivElement | null;
  legs: SVGGElement | null;
  joints: Partial<Record<Joint, SVGGElement | null>>;
  shorts: SVGPathElement | null;
  folds: SVGPathElement | null;
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
  ]));
  const fold = (side: 'L' | 'R') => ring([leg(side, -50, CROTCH_Y), leg(side, -40, SHORTS_HEM + 4), leg(side, -32, SHORTS_HEM + 3)]);
  return { body: `${panel('L')} ${seat} ${panel('R')}`, folds: `${fold('L')} ${fold('R')}` };
}

/** Pose the figure (cheap: one CSS transform, a few SVG transforms and the shorts' outline). */
export function applyFullBodyPose(els: FullBodyEls, pose: FullBodyPose) {
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

function Leg({ x, c, side, els }: { x: number; c: FullBodyColors; side: 'L' | 'R'; els: FullBodyEls }) {
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

export function AvatarFullBody({
  customization,
  seed = 0,
  pose = STAND,
  onEls,
  className,
  style,
  upperOverlay,
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
}) {
  // The same defaults AvatarPreview fills in (e.g. the default jersey), so the shorts match what is drawn.
  const resolved = useMemo(() => resolveAvatarCustomization(customization ?? FALLBACK), [customization]);
  const colors = useMemo(() => fullBodyColors(resolved, seed), [resolved, seed]);
  const [els] = useState<FullBodyEls>(() => ({ upper: null, legs: null, joints: {}, shorts: null, folds: null }));
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
          <Leg x={HIP_X.L} c={colors} side="L" els={els} />
          <Leg x={HIP_X.R} c={colors} side="R" els={els} />
          <path ref={(el) => keepShorts(els, el, 'shorts')} fill={colors.shorts} />
          <path ref={(el) => keepShorts(els, el, 'folds')} fill={colors.shortsShade} />
        </g>
      </svg>
      <div
        ref={(el) => keepUpper(els, el)}
        className="absolute inset-x-0 top-0"
        style={{ transformOrigin: `50% ${((HIP_Y / UPPER_H) * 100).toFixed(1)}%` }}
      >
        <div className="relative" style={{ clipPath: hemClip(resolved.jersey) }}>
          <AvatarPreview customization={customization ?? FALLBACK} width="100%" />
        </div>
        {upperOverlay}
      </div>
    </div>
  );
}
