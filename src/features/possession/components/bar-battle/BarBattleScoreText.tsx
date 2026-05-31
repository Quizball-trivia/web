'use client';

/**
 * Score splash text — the "+N" that pops on each side during the
 * scoring phases. During `convert` the text flies toward the bar lane
 * and shrinks. Hidden once the bars take over (`bars`/`battle`/etc).
 *
 * Counter-rotates 90° when the parent <g> uses the portrait
 * `matrix(0,-1,1,0,0,500)` flip so the splash reads upright.
 */

import { motion } from 'motion/react';
import type { BarBattlePhase } from './barBattle.types';
import { BAR_H, CY } from './barBattle.helpers';

interface BarBattleScoreTextProps {
  points: number;
  x: number;
  color: string;
  phase: BarBattlePhase;
  targetX: number;
  visible: boolean;
  /** Y position where the splash text appears. */
  splashY?: number;
  /** Y position the text flies to during the convert phase. */
  convertY?: number;
  /** Counter-rotate the text 90° CW (in screen) so it stays upright when
   *  the parent SVG <g> is rotated 90° CCW by `matrix(0,-1,1,0,0,500)` for
   *  portrait layout. */
  isPortrait?: boolean;
}

export function BarBattleScoreText({
  points,
  x,
  color,
  phase,
  targetX,
  visible,
  splashY = CY - BAR_H / 2 - 16,
  convertY = CY - 6,
  isPortrait = false,
}: BarBattleScoreTextProps) {
  if (!visible || points <= 0) return null;

  const y = splashY;
  const isConverting = phase === 'convert';
  const isGone = phase === 'bars' || phase === 'battle' || phase === 'result' || phase === 'done';

  if (isGone) return null;

  const dxConvert = targetX - x;
  const dyConvert = convertY - y;
  const textRotate = isPortrait ? `rotate(90, ${x}, ${y})` : undefined;

  return (
    <motion.g
      initial={{ x: 0, y: 14, opacity: 0, scale: 0.2 }}
      animate={
        isConverting
          ? {
              opacity: [1, 0.85, 0],
              x: [0, dxConvert / 2, dxConvert],
              y: [0, dyConvert / 2, dyConvert],
              scale: [1.1, 0.55, 0.15],
            }
          : { x: 0, y: 0, opacity: 1, scale: 1.1 }
      }
      transition={
        isConverting
          ? { duration: 0.5, ease: [0.4, 0, 0.15, 1] }
          : { type: 'spring', stiffness: 200, damping: 12, mass: 0.8 }
      }
    >
      <text
        x={x}
        y={y}
        textAnchor="middle"
        fill={color}
        fontSize="20"
        fontWeight="900"
        fontFamily="'Poppins', system-ui, sans-serif"
        transform={textRotate}
        style={{ paintOrder: 'stroke fill', stroke: 'rgba(0,0,0,0.8)', strokeWidth: 3.5 }}
      >
        +{points}
      </text>
    </motion.g>
  );
}
