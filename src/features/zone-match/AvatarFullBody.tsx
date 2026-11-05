'use client';

/**
 * The app's avatar, full body: the real, unchanged upper body (AvatarPreview — skin, jersey, hair, accessories) on top
 * of a drawn lower body in the same flat style (no outlines, flat fills, one darker shade panel): legs in the avatar's
 * skin tone, shorts and socks that go with its jersey, football boots. The jersey hem overlaps the shorts, so the join
 * is the art's own edge.
 *
 * Hips, knees and ankles are SVG groups posed by rotation (`applyFullBodyPose`, poses in zoneMatch.fullBody), and the
 * upper body leans / shifts with one CSS transform — animation never touches layout.
 */

import { useLayoutEffect, useMemo, useState, type CSSProperties, type ReactNode } from 'react';
import { AvatarPreview } from '@/components/AvatarPreview';
import { resolveAvatarCustomization } from '@/lib/avatars';
import type { AvatarCustomization } from '@/types/game';
import { FULL_H, FULL_W, STAND, fullBodyColors, shade, type FullBodyColors, type FullBodyPose } from './zoneMatch.fullBody';

const UPPER_H = 543;
const HIP_Y = 515;
const KNEE_Y = 643;
const ANKLE_Y = 793;
/** The legs: the back one (drawn first, in shade) and the front one. */
const HIP_X = { L: 214, R: 282 } as const;

type Joint = 'hipL' | 'kneeL' | 'ankleL' | 'hipR' | 'kneeR' | 'ankleR';
export interface FullBodyEls {
  upper: HTMLDivElement | null;
  legs: SVGGElement | null;
  joints: Partial<Record<Joint, SVGGElement | null>>;
}

const FALLBACK: AvatarCustomization = { skin: 'skin_male_white', jersey: 'jersey_green', hair: 'hair_boy_basic' };

/** Pose the figure (cheap: one CSS transform and seven SVG transform attributes). */
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
}

function Leg({ x, c, side, els }: { x: number; c: FullBodyColors; side: 'L' | 'R'; els: FullBodyEls }) {
  const back = side === 'L';
  const tone = (hex: string) => (back ? shade(hex, 0.12) : hex);
  return (
    <g ref={(el) => keepJoint(els, `hip${side}`, el)}>
      {/* Thigh. */}
      <rect x={x - 36} y={HIP_Y - 10} width={72} height={150} rx={34} fill={tone(c.skin)} />
      <rect x={x + 14} y={HIP_Y + 4} width={22} height={128} rx={11} fill={tone(c.skinShade)} />
      {/* Shorts leg, with a darker side panel and hem. */}
      <path d={`M${x - 41} ${HIP_Y - 34} H${x + 41} L${x + 45} ${HIP_Y + 80} Q${x + 45} ${HIP_Y + 88} ${x + 37} ${HIP_Y + 88} H${x - 37} Q${x - 45} ${HIP_Y + 88} ${x - 45} ${HIP_Y + 80} Z`} fill={tone(c.shorts)} />
      <path d={`M${x + 18} ${HIP_Y - 34} H${x + 41} L${x + 45} ${HIP_Y + 80} Q${x + 45} ${HIP_Y + 88} ${x + 37} ${HIP_Y + 88} H${x + 22} Z`} fill={tone(c.shortsShade)} />
      <g ref={(el) => keepJoint(els, `knee${side}`, el)}>
        {/* Shin and sock with its band. */}
        <rect x={x - 31} y={KNEE_Y - 24} width={62} height={176} rx={30} fill={tone(c.skin)} />
        <rect x={x - 33} y={KNEE_Y + 20} width={66} height={140} rx={22} fill={tone(c.socks)} />
        <rect x={x + 11} y={KNEE_Y + 20} width={22} height={136} rx={11} fill={tone(shade(c.socks, 0.1))} />
        <rect x={x - 33} y={KNEE_Y + 30} width={66} height={12} fill={tone(c.sockBand)} />
        <rect x={x - 33} y={KNEE_Y + 48} width={66} height={7} fill={tone(c.sockBand)} />
        <g ref={(el) => keepJoint(els, `ankle${side}`, el)}>
          {/* Boot: rounded heel, low collar, toe forward; a contrast stripe, sole and studs. */}
          <path
            d={`M${x - 28} ${ANKLE_Y - 20} H${x + 12} Q${x + 30} ${ANKLE_Y - 18} ${x + 38} ${ANKLE_Y} L${x + 62} ${ANKLE_Y + 9} Q${x + 76} ${ANKLE_Y + 15} ${x + 72} ${ANKLE_Y + 28} H${x - 28} Q${x - 35} ${ANKLE_Y + 28} ${x - 34} ${ANKLE_Y + 16} Z`}
            fill={tone(c.boots)}
          />
          <path d={`M${x - 20} ${ANKLE_Y + 12} Q${x + 10} ${ANKLE_Y - 2} ${x + 40} ${ANKLE_Y + 12}`} stroke={tone(c.bootTrim)} strokeWidth={7} strokeLinecap="round" fill="none" />
          <rect x={x - 34} y={ANKLE_Y + 26} width={108} height={9} rx={4.5} fill={tone(shade(c.boots, 0.45))} />
          {[-22, 6, 34, 56].map((dx) => (
            <rect key={dx} x={x + dx} y={ANKLE_Y + 33} width={9} height={5} rx={2} fill={tone(shade(c.boots, 0.55))} />
          ))}
        </g>
      </g>
    </g>
  );
}

function keepJoint(els: FullBodyEls, joint: Joint, el: SVGGElement | null) {
  els.joints[joint] = el;
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
  const colors = useMemo(() => fullBodyColors(resolveAvatarCustomization(customization ?? FALLBACK), seed), [customization, seed]);
  const [els] = useState<FullBodyEls>(() => ({ upper: null, legs: null, joints: {} }));
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
          {/* Shorts seat, tucked under the jersey hem. */}
          <path d={`M150 ${HIP_Y - 48} H346 V${HIP_Y + 30} Q346 ${HIP_Y + 52} 324 ${HIP_Y + 52} H172 Q150 ${HIP_Y + 52} 150 ${HIP_Y + 30} Z`} fill={colors.shorts} />
          <path d={`M300 ${HIP_Y - 48} H346 V${HIP_Y + 30} Q346 ${HIP_Y + 52} 324 ${HIP_Y + 52} H304 Z`} fill={colors.shortsShade} />
          <Leg x={HIP_X.R} c={colors} side="R" els={els} />
        </g>
      </svg>
      <div
        ref={(el) => keepUpper(els, el)}
        className="absolute inset-x-0 top-0"
        style={{ transformOrigin: `50% ${((HIP_Y / UPPER_H) * 100).toFixed(1)}%` }}
      >
        <AvatarPreview customization={customization ?? FALLBACK} width="100%" />
        {upperOverlay}
      </div>
    </div>
  );
}
