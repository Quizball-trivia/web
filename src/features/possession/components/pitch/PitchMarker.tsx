'use client';

/**
 * Reusable SVG marker sub-component for player/opponent avatars during
 * penalty + shot scenes. Drives the per-actor jolt animation and the
 * shooter pulse ring. Keeps `data-pitch-avatar` so the bar-battle
 * flight overlay can target the right element.
 */

import { motion } from 'motion/react';
import { AvatarDisplay } from '@/components/AvatarDisplay';
import type { AvatarCustomization } from '@/types/game';

export interface PitchMarkerProps {
  side?: 'player' | 'opponent';
  x: number;
  y: number;
  avatarCustomization?: AvatarCustomization | null;
  avatarAlt: string;
  color: string;
  glowFilter: string;
  isShooter: boolean;
  isKeeper: boolean;
  isSave: boolean;
  isGoal: boolean;
  showPenResult: boolean;
  keeperJolt: Record<string, number[]>;
  kickDirection: 1 | -1;
  isPortrait?: boolean;
  size?: number; // avatar diameter in px
  /** Hide the colored ring + glow halo (penalty UI uses raw avatars). */
  hideRing?: boolean;
}

export function PitchMarker({
  side, x, y, avatarCustomization, avatarAlt, color, glowFilter,
  isShooter, isKeeper, isSave, isGoal, showPenResult, keeperJolt,
  kickDirection,
  isPortrait = false,
  size = 40,
  hideRing = false,
}: PitchMarkerProps) {
  const isPenaltyKick = showPenResult && isShooter;
  const isGoalCelebration = isGoal && isShooter;
  // isPortrait === desktop (portrait pitch via the matrix(0,-1,1,0,0,500)
  // flip); !isPortrait === mobile (raw landscape).
  //  - Desktop: lift the avatar up off the ball (screen-vertical lunge).
  //    The matrix maps motion.x → screen-Y, so +x = screen-up.
  //  - Mobile: tilt the whole avatar like a body lean — wind up to one
  //    side, swing through the opposite tilt, settle. Pivots from the
  //    feet via transformOrigin so it reads as a lean, not a spin.
  const joltAnim = isPenaltyKick
    ? isPortrait
      ? { x: [0, 16, -4, 0] }
      : { rotate: [0, 34 * kickDirection, -26 * kickDirection, 0] }
    : isSave && isKeeper
    ? keeperJolt
    : isGoalCelebration
      ? { x: [0, 8, -8, 6, -6, 4, -4, 0], y: [0, -4, -1, -5, -2, -4, 0, 0] }
      : {};
  const joltTransition = isPenaltyKick
    ? { duration: 0.78, times: [0, 0.32, 0.62, 1], ease: [0.22, 1, 0.36, 1] as const }
    : isGoalCelebration
    ? { duration: 1.8, ease: 'easeInOut' as const }
    : { duration: 0.5 };

  return (
    <motion.g
      data-pitch-avatar={side}
      animate={{ x, y }}
      transition={{ type: 'spring', stiffness: 150, damping: 14, mass: 0.8 }}
      filter={hideRing ? undefined : `url(#${glowFilter})`}
    >
      <motion.g
        animate={joltAnim}
        transition={joltTransition}
        style={
          isPenaltyKick && !isPortrait
            ? { transformOrigin: '50% 100%', transformBox: 'fill-box' }
            : undefined
        }
      >
        <g transform={isPortrait ? 'rotate(90)' : undefined}>
          {isShooter && !showPenResult && !hideRing && (
            <motion.circle
              cx="0" cy="0" r={size * 0.7}
              fill="none" stroke={color} strokeWidth="1.5" opacity="0.4"
              animate={{ r: [size * 0.7, size * 0.85, size * 0.7], opacity: [0.4, 0.15, 0.4] }}
              transition={{ duration: 1.5, repeat: Infinity, ease: 'easeInOut' }}
            />
          )}
          {!hideRing && (
            <circle cx="0" cy="0" r={size * 0.55} fill="none" stroke={color} strokeWidth={isKeeper ? 3.5 : 2.5} />
          )}
          <foreignObject x={-size/2} y={-size/2} width={size} height={size}>
            <div
              aria-label={avatarAlt}
              style={{ position: 'relative', width: '100%', height: '100%', borderRadius: '50%', overflow: 'hidden' }}
            >
              <AvatarDisplay customization={avatarCustomization ?? {}} size="xs" className="size-full" />
            </div>
          </foreignObject>
        </g>
      </motion.g>
    </motion.g>
  );
}
