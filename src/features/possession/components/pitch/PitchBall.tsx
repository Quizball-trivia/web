'use client';

/**
 * Unified ball motion group for the PitchVisualization scenes.
 *
 * Renders either the persistent <motion.g> ball (penalty/open-play
 * paths) or the simple-shot variant whose key changes per shot so
 * motion remounts and re-runs the keyframe track. The shell decides
 * which variant to mount via `renderSimpleShotBall`.
 */

import { motion } from 'motion/react';
import { PITCH_BALL_IMAGE_URL } from './pitch.helpers';

type AnimateTarget = {
  x: number | number[];
  y: number | number[];
  opacity?: number;
};

interface PitchBallProps {
  /** When true, render the simple-shot keyed variant (otherwise the persistent ball). */
  variant: 'unified' | 'simple-shot';
  /** Simple-shot key — drives the React key on the motion.g so consecutive shots remount. */
  simpleShotKey?: string;
  initialPosition?: { x: number; y: number };
  animate: AnimateTarget;
  transition: Parameters<typeof motion.g>[0]['transition'];
  ballGlowR: number;
  ballBox: number;
  ballBoxOffset: number;
  ballImageStyle: React.CSSProperties;
  uid: (name: string) => string;
}

export function PitchBall({
  variant,
  simpleShotKey,
  initialPosition,
  animate,
  transition,
  ballGlowR,
  ballBox,
  ballBoxOffset,
  ballImageStyle,
  uid,
}: PitchBallProps) {
  if (variant === 'simple-shot') {
    return (
      <motion.g
        key={simpleShotKey}
        initial={{
          x: initialPosition?.x ?? 0,
          y: initialPosition?.y ?? 0,
          scale: 1,
          opacity: 1,
        }}
        animate={animate}
        transition={transition}
      >
        <motion.circle cx="0" cy="0" r={ballGlowR} fill="rgba(255,255,255,0.1)" filter={`url(#${uid('ballGlow')})`} />
        <foreignObject x={-ballBoxOffset} y={-ballBoxOffset} width={ballBox} height={ballBox}>
          <img src={PITCH_BALL_IMAGE_URL} alt="" style={ballImageStyle} />
        </foreignObject>
      </motion.g>
    );
  }

  return (
    <motion.g
      key="ball"
      initial={false}
      animate={animate}
      transition={transition}
    >
      <motion.circle cx="0" cy="0" r={ballGlowR} fill="rgba(255,255,255,0.1)" filter={`url(#${uid('ballGlow')})`} />
      <foreignObject x={-ballBoxOffset} y={-ballBoxOffset} width={ballBox} height={ballBox}>
        <img src={PITCH_BALL_IMAGE_URL} alt="" style={ballImageStyle} />
      </foreignObject>
    </motion.g>
  );
}
