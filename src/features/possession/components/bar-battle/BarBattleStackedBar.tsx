'use client';

/**
 * Compact ×N variant of the bar — used when a player's bar row would
 * not fit behind their avatar. Renders one wider bar with a numeric
 * label and replays the cancel-flash N times during the battle phase.
 *
 * The `data-testid="stack-cancel-hit"` markers on the white flashes
 * are read by tests to assert per-bar cancel-step counts.
 */

import { motion } from 'motion/react';
import type { BarBattlePhase } from './barBattle.types';
import {
  BAR_H,
  BAR_RX,
  BAR_W,
  CY,
  STACK_CANCEL_FLASH_S,
  STACK_CANCEL_STEP_S,
  getChargeImpactXKeyframes,
} from './barBattle.helpers';

interface BarBattleStackedBarProps {
  spawnX: number;
  marchX: number;
  pushX: number;
  gradientId: string;
  count: number;
  cancelCount?: number;
  phase: BarBattlePhase;
  cancelled: boolean;
  survived: boolean;
  chargeOrder: number;
  chargeHitOffsetX?: number;
  holdChargeImpact?: boolean;
  cy?: number;
  barW?: number;
  barH?: number;
  barRx?: number;
  morphFromX?: number;
  morphFromY?: number;
  isPortrait?: boolean;
}

export function BarBattleStackedBar({
  spawnX,
  marchX,
  pushX,
  gradientId,
  count,
  cancelCount = 0,
  phase,
  cancelled,
  survived,
  chargeOrder,
  chargeHitOffsetX = 0,
  holdChargeImpact = false,
  cy = CY,
  barW = BAR_W,
  barH = BAR_H,
  barRx = BAR_RX,
  morphFromX,
  morphFromY,
  isPortrait = false,
}: BarBattleStackedBarProps) {
  const W = barW * 2.2;
  const H = barH;
  const y = cy - H / 2;
  const initialX = morphFromX ?? spawnX;
  const initialYOffset = morphFromY != null ? morphFromY - y : 0;

  const showBar = phase === 'bars' || phase === 'battle' || phase === 'charge' || phase === 'result';
  const isMarching = phase === 'battle' || phase === 'charge' || phase === 'result';
  const isBattling = phase === 'battle' && cancelCount > 0;
  const isCharging = phase === 'charge' && survived;
  const isResult = phase === 'result';
  const textRotate = isPortrait ? `rotate(90, 0, ${cy})` : undefined;
  if (!showBar) return null;

  if (isBattling) {
    const hitCount = Math.max(1, Math.min(cancelCount, 20));
    const finalHitDelay = (hitCount - 1) * STACK_CANCEL_STEP_S;
    const vanishAt = finalHitDelay + STACK_CANCEL_FLASH_S;
    const shouldDisappear = cancelled && !survived;

    return (
      <motion.g
        initial={{ x: spawnX }}
        animate={{ x: marchX }}
        transition={{ type: 'spring', stiffness: 100, damping: 18, mass: 0.6 }}
      >
        <motion.rect
          x={-W / 2} y={y} width={W} height={H} rx={barRx}
          fill={`url(#${gradientId})`}
          initial={{ opacity: 0.95 }}
          animate={shouldDisappear
            ? { opacity: [0.95, 0.95, 0], scaleY: [1, 1, 1.3], scaleX: [1, 1, 0.15] }
            : { opacity: 0.95, scaleY: [1, 1.04, 1], scaleX: [1, 1.05, 1] }}
          transition={shouldDisappear
            ? {
                opacity: { duration: vanishAt + 0.18, times: [0, 0.82, 1], ease: 'easeOut' },
                scaleY: { duration: vanishAt + 0.18, times: [0, 0.82, 1], ease: 'easeOut' },
                scaleX: { duration: vanishAt + 0.18, times: [0, 0.82, 1], ease: 'easeOut' },
              }
            : {
                scaleY: { duration: vanishAt + 0.12, ease: 'easeOut' },
                scaleX: { duration: vanishAt + 0.12, ease: 'easeOut' },
              }}
        />
        {Array.from({ length: hitCount }).map((_, i) => (
          <motion.rect
            key={`stack-hit-${i}`}
            data-testid="stack-cancel-hit"
            x={-W / 2}
            y={y - 2}
            width={W}
            height={H + 4}
            rx={barRx}
            fill="white"
            initial={{ opacity: 0, scaleX: 1 }}
            animate={{ opacity: [0, 0.9, 0], scaleX: [1, 1.6, 0.3] }}
            transition={{ duration: 0.2, delay: i * STACK_CANCEL_STEP_S + 0.05, ease: 'easeOut' }}
            style={{ transformOrigin: `0px ${cy}px` }}
          />
        ))}
        <motion.text
          x={0}
          y={cy + 4}
          textAnchor="middle"
          fill="white"
          fontSize={H * 0.45}
          fontWeight="900"
          fontFamily="'Poppins', system-ui, sans-serif"
          transform={textRotate}
          initial={{ opacity: 1 }}
          animate={shouldDisappear ? { opacity: [1, 1, 0] } : { opacity: 1 }}
          transition={shouldDisappear ? { duration: vanishAt + 0.18, times: [0, 0.82, 1], ease: 'easeOut' } : undefined}
          style={{ paintOrder: 'stroke fill', stroke: 'rgba(0,0,0,0.55)', strokeWidth: 1.5 }}
        >
          ×{count}
        </motion.text>
      </motion.g>
    );
  }

  if (isResult && cancelled && !survived) return null;
  if (phase === 'charge' && cancelled && !survived) return null;

  const targetX = isMarching && !isResult ? marchX : isResult && survived ? pushX : spawnX;
  const chargeDelay = chargeOrder * 0.075;
  const isChargeImpact = isCharging && chargeHitOffsetX !== 0;

  return (
    <motion.g
      initial={{ opacity: 0, x: initialX, y: initialYOffset, scale: 0.4 }}
      animate={{
        opacity: isCharging ? [0.95, 1, 0.95] : 0.95,
        x: isChargeImpact
          ? getChargeImpactXKeyframes(targetX, chargeHitOffsetX, holdChargeImpact)
          : targetX,
        y: 0,
        scale: isCharging ? [1, 1.08, 1] : 1,
      }}
      transition={{
        opacity: isCharging
          ? { duration: 0.42, delay: chargeDelay, ease: 'easeOut' }
          : { duration: 0.25, ease: 'easeOut' },
        scale: isCharging
          ? { duration: 0.42, delay: chargeDelay, ease: 'easeOut' }
          : { type: 'spring', stiffness: 220, damping: 14 },
        x: isChargeImpact
          ? { duration: 0.46, delay: chargeDelay + 0.04, times: [0, 0.38, 0.72, 1], ease: [0.22, 1, 0.36, 1] }
          : { type: 'spring', stiffness: 140, damping: 18, mass: 0.7 },
        y: { type: 'spring', stiffness: 180, damping: 16, mass: 0.6 },
      }}
      style={{ filter: isCharging ? 'drop-shadow(0 0 9px rgba(255,229,0,0.7))' : undefined }}
    >
      <rect
        x={-W / 2} y={y} width={W} height={H} rx={barRx}
        fill={`url(#${gradientId})`}
      />
      {isCharging && (
        <motion.rect
          x={-W / 2 - 3}
          y={y - 3}
          width={W + 6}
          height={H + 6}
          rx={barRx + 2}
          fill="#FFE500"
          initial={{ opacity: 0, scaleY: 0.1, scaleX: 0.75 }}
          animate={{ opacity: [0, 0.75, 0], scaleY: [0.1, 1.12, 1], scaleX: [0.75, 1.18, 1] }}
          transition={{ duration: 0.46, delay: chargeDelay, ease: [0.22, 1, 0.36, 1] }}
        />
      )}
      <text
        x={0}
        y={cy + 4}
        textAnchor="middle"
        fill="white"
        fontSize={H * 0.45}
        fontWeight="900"
        fontFamily="'Poppins', system-ui, sans-serif"
        transform={textRotate}
        style={{ paintOrder: 'stroke fill', stroke: 'rgba(0,0,0,0.55)', strokeWidth: 1.5 }}
      >
        ×{count}
      </text>
    </motion.g>
  );
}
