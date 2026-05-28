'use client';

/**
 * One capsule bar — the building block of the BarBattle.
 *
 * Picks a render variant from the current phase:
 *  - `battling` cancelled bar: marches in, white-flashes, vanishes.
 *  - `result` survived bar: pushes to a new X with a satisfying bounce.
 *  - default (`bars`/`charge`/`result` standing): spawns + optionally
 *    charges with a yellow glow halo.
 *
 * `morphFromX/Y` enable the anchored variant to fragment the splash
 * landing point into bars by starting at the splash position instead
 * of the standard spawn position.
 */

import { motion } from 'motion/react';
import type { BarBattlePhase } from './barBattle.types';
import { BAR_H, BAR_RX, BAR_W, CY } from './barBattle.helpers';

interface BarBattleBarProps {
  spawnX: number;
  marchX: number;
  pushX: number;
  color: string;
  darkColor: string;
  gradientId: string;
  index: number;
  phase: BarBattlePhase;
  cancelled: boolean;
  cancelOrder: number;
  survived: boolean;
  chargeOrder: number;
  chargeHitOffsetX?: number;
  /** Vertical centre for the bar; classic uses CY=115, anchored uses CY_ANCHORED. */
  cy?: number;
  barW?: number;
  barH?: number;
  barRx?: number;
  /** When set, the bar starts at this point and animates out to (spawnX, cy)
   *  — used by the anchored variant so the splash's landing point visually
   *  fragments into bars. */
  morphFromX?: number;
  morphFromY?: number;
}

export function BarBattleBar({
  spawnX,
  marchX,
  pushX,
  color,
  darkColor,
  gradientId,
  index,
  phase,
  cancelled,
  cancelOrder,
  survived,
  chargeOrder,
  chargeHitOffsetX = 0,
  cy = CY,
  barW = BAR_W,
  barH = BAR_H,
  barRx = BAR_RX,
  morphFromX,
  morphFromY,
}: BarBattleBarProps) {
  const y = cy - barH / 2;
  const W = barW;
  const H = barH;
  const RX = barRx;
  // Where the bar starts before spring-animating to its row position. Classic
  // bars start at (spawnX, y). Anchored bars start at the splash's landing
  // point so the splash visually scatters INTO the bars.
  const initialX = morphFromX ?? spawnX;
  const initialYOffset = morphFromY != null ? morphFromY - y : 0;

  const showBar = phase === 'bars' || phase === 'battle' || phase === 'charge' || phase === 'result';
  const isMarching = phase === 'battle' || phase === 'charge' || phase === 'result';
  const isBattling = phase === 'battle' && cancelled;
  const isCharging = phase === 'charge' && survived;
  const isResult = phase === 'result';

  if (!showBar) return null;

  const spawnDelay = index * 0.06;
  const cancelDelay = cancelOrder * 0.1;

  void color;
  void darkColor;

  // Cancelled bar — march in then flash white and vanish
  if (isBattling) {
    return (
      <motion.g key={`bar-battle-${index}`}>
        <motion.rect
          x={0} y={y} width={W} height={H} rx={RX}
          fill={`url(#${gradientId})`}
          initial={{ opacity: 0.95, x: spawnX }}
          animate={{
            x: marchX,
            opacity: [0.95, 0.95, 0],
            scaleY: [1, 1, 1.3],
            scaleX: [1, 1, 0.15],
          }}
          transition={{
            x: { type: 'spring', stiffness: 100, damping: 18, mass: 0.6 },
            opacity: { duration: 0.25, delay: cancelDelay, ease: 'easeOut' },
            scaleY: { duration: 0.25, delay: cancelDelay, ease: 'easeOut' },
            scaleX: { duration: 0.25, delay: cancelDelay, ease: 'easeOut' },
          }}
        />
        {/* White flash on cancel */}
        <motion.rect
          x={0} y={y - 2} width={W} height={H + 4} rx={RX}
          fill="white"
          initial={{ opacity: 0, x: marchX }}
          animate={{ opacity: [0, 0.9, 0], scaleX: [1, 1.6, 0.3] }}
          transition={{ duration: 0.2, delay: cancelDelay + 0.05, ease: 'easeOut' }}
        />
      </motion.g>
    );
  }

  // Survived bar — push to new position with satisfying bounce
  if (isResult && survived) {
    return (
      <motion.rect
        key={`bar-result-${index}`}
        x={0} y={y} width={W} height={H} rx={RX}
        fill={`url(#${gradientId})`}
        initial={{ opacity: 0.95, x: marchX }}
        animate={{ x: pushX, opacity: 1 }}
        transition={{ type: 'spring', stiffness: 80, damping: 12, mass: 0.7 }}
      />
    );
  }

  if (isResult && cancelled) return null;
  if (phase === 'charge' && cancelled) return null;

  // Spawning / standing bar. In the anchored variant we morph from the
  // splash's landing point (initialX, initialYOffset) outward to (spawnX, 0),
  // making the splash visually fragment into bars. In classic mode initialX
  // === spawnX, so no extra movement happens.
  const chargeDelay = chargeOrder * 0.075;
  const targetX = isMarching ? marchX : spawnX;
  const isChargeImpact = isCharging && chargeHitOffsetX !== 0;

  return (
    <motion.g
      key={`bar-spawn-${index}`}
      initial={{ x: initialX, y: initialYOffset }}
      animate={{
        x: isChargeImpact
          ? [targetX, targetX, targetX + chargeHitOffsetX, targetX + chargeHitOffsetX * 0.2]
          : targetX,
        y: 0,
      }}
      transition={{
        x: isChargeImpact
          ? { duration: 0.46, delay: chargeDelay + 0.04, times: [0, 0.38, 0.72, 1], ease: [0.22, 1, 0.36, 1] }
          : isMarching
            ? { type: 'spring', stiffness: 100, damping: 18, mass: 0.6, delay: spawnDelay * 0.25 }
            : { type: 'spring', stiffness: 180, damping: 16, mass: 0.6, delay: spawnDelay },
        y: { type: 'spring', stiffness: 180, damping: 16, mass: 0.6, delay: spawnDelay },
      }}
    >
      <motion.rect
        x={0} y={y} width={W} height={H} rx={RX}
        fill={`url(#${gradientId})`}
        initial={{ opacity: 0, scaleY: 0.05, scaleX: 0.4 }}
        animate={{
          opacity: isCharging ? [0.95, 1, 0.95] : 0.95,
          scaleY: isCharging ? [1, 1.1, 1] : 1,
          scaleX: isCharging ? [1, 1.16, 1] : 1,
        }}
        transition={isCharging
          ? { duration: 0.34, delay: chargeDelay, ease: 'easeOut' }
          : {
              opacity: { duration: 0.25, delay: spawnDelay, ease: 'easeOut' },
              scaleY: { type: 'spring', stiffness: 240, damping: 14, delay: spawnDelay },
              scaleX: { type: 'spring', stiffness: 240, damping: 14, delay: spawnDelay },
            }}
        style={{
          filter: isCharging ? 'drop-shadow(0 0 7px rgba(255,229,0,0.75))' : undefined,
          transformOrigin: `${W / 2}px ${cy}px`,
        }}
      />
      {isCharging && (
        <motion.rect
          x={-2}
          y={y - 3}
          width={W + 4}
          height={H + 6}
          rx={RX + 2}
          fill="#FFE500"
          initial={{ opacity: 0, scaleY: 0.08, scaleX: 0.65 }}
          animate={{ opacity: [0, 0.88, 0], scaleY: [0.08, 1.18, 1], scaleX: [0.65, 1.4, 1] }}
          transition={{ duration: 0.42, delay: chargeDelay, ease: [0.22, 1, 0.36, 1] }}
          style={{ transformOrigin: `${W / 2}px ${cy}px` }}
        />
      )}
    </motion.g>
  );
}
