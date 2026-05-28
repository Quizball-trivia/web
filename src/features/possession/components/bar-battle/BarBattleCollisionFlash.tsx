'use client';

/**
 * White glow ellipse + spark burst that fires at the divider when the
 * `battle` phase cancels pairs of bars. The anchored variant tightens
 * the spark spacing via `sparkOffsets`.
 */

import { motion, AnimatePresence } from 'motion/react';
import { CY } from './barBattle.helpers';

interface BarBattleCollisionFlashProps {
  x: number;
  active: boolean;
  count: number;
  cy?: number;
  ry?: number;
  sparkOffsets?: number[];
}

export function BarBattleCollisionFlash({
  x,
  active,
  count,
  cy = CY,
  ry = 38,
  sparkOffsets = [-24, -12, 0, 12, 24],
}: BarBattleCollisionFlashProps) {
  return (
    <AnimatePresence>
      {active && count > 0 && (
        <motion.g key="collision-flash">
          {/* Wide glow pulse */}
          <motion.ellipse
            cx={x} cy={cy} rx={6} ry={ry}
            fill="white"
            initial={{ opacity: 0, scaleX: 0.5 }}
            animate={{ opacity: [0, 0.5, 0.25, 0], scaleX: [0.5, 3, 2, 0.5] }}
            transition={{ duration: 0.5, ease: 'easeOut' }}
          />
          {/* Sparks */}
          {sparkOffsets.map((yOff, i) => (
            <motion.circle
              key={`spark-${i}`}
              cx={x} cy={cy + yOff} r={2.5}
              fill="white"
              initial={{ opacity: 0, x: 0 }}
              animate={{
                opacity: [0, 1, 0],
                x: [(i % 2 === 0 ? -1 : 1) * 3, (i % 2 === 0 ? -1 : 1) * 28],
                y: [0, yOff * 0.4],
              }}
              transition={{ duration: 0.35, delay: 0.03 + i * 0.04, ease: 'easeOut' }}
            />
          ))}
        </motion.g>
      )}
    </AnimatePresence>
  );
}
