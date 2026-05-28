'use client';

import { useId } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useRealtimeMatchStore } from '@/stores/realtimeMatch.store';
import type { BarBattlePhase, BarBattleState } from './bar-battle/barBattle.types';
import { BarBattleScoreText } from './bar-battle/BarBattleScoreText';
import { BarBattleCollisionFlash } from './bar-battle/BarBattleCollisionFlash';
import {
  AVATAR_BAR_OFFSET,
  BAR_GAP,
  BAR_GAP_ANCHORED,
  BAR_H,
  BAR_H_ANCHORED,
  BAR_RX,
  BAR_RX_ANCHORED,
  BAR_W,
  BAR_W_ANCHORED,
  BLUE,
  BLUE_DARK,
  CY,
  CY_ANCHORED,
  FIELD_MAX_X,
  FIELD_MIN_X,
  RED,
  RED_DARK,
  STACK_CANCEL_FLASH_S,
  STACK_CANCEL_STEP_S,
  clampCenterX,
  pointsToBarCount,
} from './bar-battle/barBattle.helpers';

// Re-export the public types so external consumers can keep importing
// from this file path. Tests and the dev page do this.
export type { BarBattlePhase, BarBattleState } from './bar-battle/barBattle.types';

// ─── Single bar (capsule with gradient + inner shine) ────────────────────────

function Bar({
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
}: {
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
}) {
  const y = cy - barH / 2;
  const BAR_W = barW;
  const BAR_H = barH;
  const BAR_RX = barRx;
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
          x={0} y={y} width={BAR_W} height={BAR_H} rx={BAR_RX}
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
          x={0} y={y - 2} width={BAR_W} height={BAR_H + 4} rx={BAR_RX}
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
        x={0} y={y} width={BAR_W} height={BAR_H} rx={BAR_RX}
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
        x={0} y={y} width={BAR_W} height={BAR_H} rx={BAR_RX}
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
          transformOrigin: `${BAR_W / 2}px ${cy}px`,
        }}
      />
      {isCharging && (
        <motion.rect
          x={-2}
          y={y - 3}
          width={BAR_W + 4}
          height={BAR_H + 6}
          rx={BAR_RX + 2}
          fill="#FFE500"
          initial={{ opacity: 0, scaleY: 0.08, scaleX: 0.65 }}
          animate={{ opacity: [0, 0.88, 0], scaleY: [0.08, 1.18, 1], scaleX: [0.65, 1.4, 1] }}
          transition={{ duration: 0.42, delay: chargeDelay, ease: [0.22, 1, 0.36, 1] }}
          style={{ transformOrigin: `${BAR_W / 2}px ${cy}px` }}
        />
      )}
    </motion.g>
  );
}

// Single bar with a "×N" label for rows that cannot fit behind the avatar.
function StackedBar({
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
  cy = CY,
  barW = BAR_W,
  barH = BAR_H,
  barRx = BAR_RX,
  morphFromX,
  morphFromY,
  isPortrait = false,
}: {
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
  cy?: number;
  barW?: number;
  barH?: number;
  barRx?: number;
  morphFromX?: number;
  morphFromY?: number;
  isPortrait?: boolean;
}) {
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
    const hitCount = Math.max(1, Math.min(cancelCount, 12));
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
          ? [targetX, targetX, targetX + chargeHitOffsetX, targetX + chargeHitOffsetX * 0.2]
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

// ─── Main overlay ────────────────────────────────────────────────────────────

interface BarBattleOverlayProps {
  battle: BarBattleState;
  mirrored: boolean;
  /** X position of the player avatar circle on the pitch — required for the
   *  avatar-anchored variant so bars sit behind the avatar. The classic
   *  variant ignores this. */
  playerAvatarX?: number;
  /** X position of the opponent avatar circle. */
  opponentAvatarX?: number;
  /** True when the parent SVG group is rotated 90° CCW (via
   *  `matrix(0,-1,1,0,0,500)`) for portrait layout. Used so splash text
   *  can counter-rotate and stay upright. */
  isPortrait?: boolean;
  /** Override the match variant for isolated demos that should not mutate the realtime store. */
  variant?: 'ranked_sim' | 'friendly_possession';
}

export function BarBattleOverlay({
  battle,
  mirrored,
  playerAvatarX,
  opponentAvatarX,
  isPortrait = false,
  variant,
}: BarBattleOverlayProps) {
  const uid = useId();
  
  const storeMatchVariant = useRealtimeMatchStore((s) => s.match?.variant);
  const matchVariant = variant ?? storeMatchVariant;
  const isAnchored = matchVariant === 'ranked_sim'
    && playerAvatarX != null
    && opponentAvatarX != null;

  const { phase, playerBars, opponentBars, playerPoints, opponentPoints, remainingDelta, dividerX } = battle;
  if (phase === 'done') return null;
  const chargeLunges = battle.chargeMode !== 'pulse';
  const blueGrad = `${uid}-blue`;
  const redGrad = `${uid}-red`;
  const battleClip = `${uid}-battle-clip`;

  // Pick the active bar dimensions based on variant. Anchored bars are smaller
  // so they fit cleanly below the avatar circle without bleeding into the field.
  const barW = isAnchored ? BAR_W_ANCHORED : BAR_W;
  const barH = isAnchored ? BAR_H_ANCHORED : BAR_H;
  const barGap = isAnchored ? BAR_GAP_ANCHORED : BAR_GAP;
  const barRx = isAnchored ? BAR_RX_ANCHORED : BAR_RX;
  const cy = isAnchored ? CY_ANCHORED : CY;

  const minBars = Math.min(playerBars, opponentBars);
  const playerDir = mirrored ? 1 : -1;
  const opponentDir = mirrored ? -1 : 1;
  const playerLayoutBars = playerBars > 0 ? playerBars : pointsToBarCount(playerPoints);
  const opponentLayoutBars = opponentBars > 0 ? opponentBars : pointsToBarCount(opponentPoints);

  // In portrait, SVG X maps to screen Y. The bar lane must extend away from
  // the opposing avatar, which flips when the second half mirrors the pitch.
  const portraitPlayerDir = playerAvatarX != null && opponentAvatarX != null && playerAvatarX > opponentAvatarX ? 1 : -1;
  const portraitOpponentDir = opponentAvatarX != null && playerAvatarX != null && opponentAvatarX > playerAvatarX ? 1 : -1;
  const playerPreferredBarDir = isAnchored && isPortrait ? portraitPlayerDir : playerDir;
  const opponentPreferredBarDir = isAnchored && isPortrait ? portraitOpponentDir : opponentDir;

  const compactW = barW * 2.2;
  const normalRowX = (avatarX: number, dir: number, count: number) => {
    if (count <= 0) return [];
    const firstX = avatarX + dir * AVATAR_BAR_OFFSET;
    const maxStep = count <= 1
      ? barW + barGap
      : dir > 0
        ? ((FIELD_MAX_X - barW) - firstX) / (count - 1)
        : (firstX - FIELD_MIN_X) / (count - 1);
    const step = Math.min(barW + barGap, maxStep);
    if (step < barW) return null;
    return Array.from({ length: count }, (_, i) => firstX + dir * i * step);
  };
  const buildAnchoredLayout = (
    avatarX: number | undefined,
    dir: number,
    count: number
  ) => {
    const fallbackBarX = avatarX == null
      ? dividerX
      : clampCenterX(avatarX + dir * AVATAR_BAR_OFFSET + barW / 2, barW);
    if (!isAnchored || avatarX == null || count <= 0) {
      return {
        compact: false,
        dir,
        rowX: (_i: number) => fallbackBarX - barW / 2,
        compactX: fallbackBarX,
        splashX: fallbackBarX,
        landingX: fallbackBarX,
      };
    }

    const xs = normalRowX(avatarX, dir, count);
    const compactX = clampCenterX(avatarX + dir * (AVATAR_BAR_OFFSET + compactW / 2), compactW);
    if (xs === null) {
      return {
        compact: true,
        dir,
        rowX: (_i: number) => compactX,
        compactX,
        splashX: compactX,
        landingX: compactX,
      };
    }
    const splashX = (xs[0] + xs[xs.length - 1] + barW) / 2;
    const landingX = xs[0] + barW / 2;

    return {
      compact: false,
      dir,
      rowX: (i: number) => xs[i] ?? avatarX,
      compactX,
      splashX,
      landingX,
    };
  };

  const playerLayout = buildAnchoredLayout(playerAvatarX, playerPreferredBarDir, playerLayoutBars);
  const opponentLayout = buildAnchoredLayout(opponentAvatarX, opponentPreferredBarDir, opponentLayoutBars);
  const playerBarDir = playerLayout.dir;
  const opponentBarDir = opponentLayout.dir;
  const playerStackCount = (phase === 'result' || phase === 'charge') && remainingDelta > 0 ? remainingDelta : playerBars;
  const opponentStackCount = (phase === 'result' || phase === 'charge') && remainingDelta < 0 ? -remainingDelta : opponentBars;

  // Spawn position:
  //   - classic: cluster just outside the divider on each player's side
  //   - avatar-anchored: extend OUTWARD from each avatar (bars sit BEHIND the
  //     avatar in landscape x; in portrait that maps to above/below in screen).
  //     Bar i=0 is closest to avatar, i=N furthest away.
  const playerBarStartX = (i: number) => {
    if (isAnchored) {
      return playerLayout.rowX(i);
    }
    const barAreaOffset = 28;
    return dividerX + playerDir * (barAreaOffset + i * (barW + barGap));
  };
  const opponentBarStartX = (i: number) => {
    if (isAnchored) {
      return opponentLayout.rowX(i);
    }
    const barAreaOffset = 28;
    return dividerX + opponentDir * (barAreaOffset + i * (barW + barGap));
  };

  // Battle / result positions:
  //   - classic: bars march to centre, clash, surviving ones push the divider
  //   - avatar-anchored: pairs annihilate IN PLACE (no marching), so the bars
  //     stay behind their owner. Surviving bars also stay (the AVATAR moves
  //     instead, driven by possessionDiff update from the playground).
  const playerMarchX = (i: number) =>
    isAnchored
      ? playerBarStartX(i)
      : dividerX + playerDir * ((i + 1) * (barW + barGap));
  const opponentMarchX = (i: number) =>
    isAnchored
      ? opponentBarStartX(i)
      : dividerX + opponentDir * ((i + 1) * (barW + barGap));

  const pushPerBar = 16;
  const pushSign = remainingDelta > 0 ? opponentDir : playerDir;
  const pushDist = Math.abs(remainingDelta) * pushPerBar;
  const newDividerX = Math.max(40, Math.min(460, dividerX + pushDist * pushSign));

  const playerPushX = (i: number) =>
    isAnchored
      ? playerBarStartX(i)
      : newDividerX + playerDir * ((i + 1) * (barW + barGap));
  const opponentPushX = (i: number) =>
    isAnchored
      ? opponentBarStartX(i)
      : newDividerX + opponentDir * ((i + 1) * (barW + barGap));

  // Score splash position:
  //   - classic: hard-coded x=100/400 above the off-centre bar area
  //   - avatar-anchored: splash enters from the far edge and lands at the
  //     clamped row center, where it morphs into bars.
  const FAR_LEFT_X = 30;
  const FAR_RIGHT_X = 470;
  const playerSplashLandX = isAnchored && playerBars > 0
    ? playerLayout.splashX
    : playerAvatarX != null
      ? playerAvatarX + playerBarDir * AVATAR_BAR_OFFSET
    : dividerX + playerDir * (28 + (playerBars * (barW + barGap)) / 2);
  const opponentSplashLandX = isAnchored && opponentBars > 0
    ? opponentLayout.splashX
    : opponentAvatarX != null
      ? opponentAvatarX + opponentBarDir * AVATAR_BAR_OFFSET
    : dividerX + opponentDir * (28 + (opponentBars * (barW + barGap)) / 2);
  const playerTextX = isAnchored
    ? (playerBarDir < 0 ? FAR_LEFT_X : FAR_RIGHT_X)
    : (mirrored ? 400 : 100);
  const opponentTextX = isAnchored
    ? (opponentBarDir < 0 ? FAR_LEFT_X : FAR_RIGHT_X)
    : (mirrored ? 100 : 400);
  const playerTextTargetX = isAnchored ? playerSplashLandX : playerSplashLandX;
  const opponentTextTargetX = isAnchored ? opponentSplashLandX : opponentSplashLandX;

  const playerScoreVisible = phase !== 'opponent-score';
  const opponentScoreVisible = phase !== 'player-score';

  return (
    <g>
      {/* Gradient defs for bars */}
      <defs>
        <linearGradient id={blueGrad} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#4DD4FF" />
          <stop offset="40%" stopColor={BLUE} />
          <stop offset="100%" stopColor={BLUE_DARK} />
        </linearGradient>
        <linearGradient id={redGrad} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#FF8080" />
          <stop offset="40%" stopColor={RED} />
          <stop offset="100%" stopColor={RED_DARK} />
        </linearGradient>
        <clipPath id={battleClip}>
          <rect x="0" y="-30" width="500" height="290" />
        </clipPath>
      </defs>

      {isAnchored && (
        <g pointerEvents="none" aria-hidden="true">
          <circle data-testid="bar-target-player" data-pitch-bar-target="player" cx={playerLayout.landingX} cy={cy} r="6" fill="transparent" />
          <circle data-testid="bar-target-opponent" data-pitch-bar-target="opponent" cx={opponentLayout.landingX} cy={cy} r="6" fill="transparent" />
        </g>
      )}

      {/* Score texts — only shown in the CLASSIC variant.
          In the avatar-anchored variant the splash is handled entirely by the
          HTML flight overlay (BarBattleFlightOverlay), so suppressing the SVG
          splash here prevents a "second +N appearing on the pitch" right
          before the bars expand. */}
      {!isAnchored && (() => {
        const splashY = CY - BAR_H / 2 - 16;
        const convertY = CY - 6;
        return (
          <>
            <BarBattleScoreText
              points={playerPoints}
              x={playerTextX}
              color={BLUE}
              phase={phase}
              targetX={playerTextTargetX}
              visible={playerScoreVisible}
              splashY={splashY}
              convertY={convertY}
              isPortrait={isPortrait}
            />
            <BarBattleScoreText
              points={opponentPoints}
              x={opponentTextX}
              color={RED}
              phase={phase}
              targetX={opponentTextTargetX}
              visible={opponentScoreVisible}
              splashY={splashY}
              convertY={convertY}
              isPortrait={isPortrait}
            />
          </>
        );
      })()}

      <g clipPath={`url(#${battleClip})`}>
        {playerLayout.compact ? (
          <StackedBar
            key={`p-stack-${battle.key}`}
            spawnX={playerLayout.compactX}
            marchX={playerLayout.compactX}
            pushX={playerLayout.compactX}
            gradientId={blueGrad}
            count={playerStackCount}
            cancelCount={minBars}
            phase={phase}
            cancelled={remainingDelta <= 0}
            survived={remainingDelta > 0}
            chargeOrder={0}
            chargeHitOffsetX={!chargeLunges
              ? 0
              : remainingDelta > 0 && isAnchored && playerAvatarX != null
              ? (playerAvatarX + playerBarDir * 20) - playerLayout.compactX
              : remainingDelta > 0
                ? -playerBarDir * 34
                : 0}
            cy={cy}
            barW={barW}
            barH={barH}
            barRx={barRx}
            morphFromX={isAnchored ? playerSplashLandX : undefined}
            morphFromY={isAnchored ? cy : undefined}
            isPortrait={isPortrait}
          />
        ) : (
          Array.from({ length: playerBars }).map((_, i) => {
            const isCancelled = remainingDelta >= 0 ? i < minBars : true;
            const isSurvived = remainingDelta > 0 && i >= minBars;
            const cancelOrder = isCancelled ? (minBars - 1 - i) : 0;
            const survivedIndex = isSurvived ? i - minBars : i;
            const survivorCount = Math.max(0, playerBars - minBars);
            const chargeOrder = isSurvived ? Math.max(0, survivorCount - 1 - survivedIndex) : 0;
            const chargeHitOffsetX = !chargeLunges
              ? 0
              : isSurvived && survivedIndex === 0
              ? isAnchored && playerAvatarX != null
                ? (playerAvatarX + playerBarDir * 20) - playerBarStartX(i)
                : -playerBarDir * 34
              : 0;

            return (
              <Bar
                key={`p-${battle.key}-${i}`}
                spawnX={playerBarStartX(i)}
                marchX={playerMarchX(i)}
                pushX={playerPushX(survivedIndex)}
                color={BLUE}
                darkColor={BLUE_DARK}
                gradientId={blueGrad}
                index={i}
                phase={phase}
                cancelled={isCancelled}
                cancelOrder={cancelOrder}
                survived={isSurvived}
                chargeOrder={chargeOrder}
                chargeHitOffsetX={chargeHitOffsetX}
                cy={cy}
                barW={barW}
                barH={barH}
                barRx={barRx}
                morphFromX={isAnchored ? playerSplashLandX : undefined}
                morphFromY={isAnchored ? cy : undefined}
              />
            );
          })
        )}

        {opponentLayout.compact ? (
          <StackedBar
            key={`o-stack-${battle.key}`}
            spawnX={opponentLayout.compactX}
            marchX={opponentLayout.compactX}
            pushX={opponentLayout.compactX}
            gradientId={redGrad}
            count={opponentStackCount}
            cancelCount={minBars}
            phase={phase}
            cancelled={remainingDelta >= 0}
            survived={remainingDelta < 0}
            chargeOrder={0}
            chargeHitOffsetX={!chargeLunges
              ? 0
              : remainingDelta < 0 && isAnchored && opponentAvatarX != null
              ? (opponentAvatarX + opponentBarDir * 20) - opponentLayout.compactX
              : remainingDelta < 0
                ? -opponentBarDir * 34
                : 0}
            cy={cy}
            barW={barW}
            barH={barH}
            barRx={barRx}
            morphFromX={isAnchored ? opponentSplashLandX : undefined}
            morphFromY={isAnchored ? cy : undefined}
            isPortrait={isPortrait}
          />
        ) : (
          Array.from({ length: opponentBars }).map((_, i) => {
            const isCancelled = remainingDelta <= 0 ? i < minBars : true;
            const isSurvived = remainingDelta < 0 && i >= minBars;
            const cancelOrder = isCancelled ? (minBars - 1 - i) : 0;
            const survivedIndex = isSurvived ? i - minBars : i;
            const survivorCount = Math.max(0, opponentBars - minBars);
            const chargeOrder = isSurvived ? Math.max(0, survivorCount - 1 - survivedIndex) : 0;
            const chargeHitOffsetX = !chargeLunges
              ? 0
              : isSurvived && survivedIndex === 0
              ? isAnchored && opponentAvatarX != null
                ? (opponentAvatarX + opponentBarDir * 20) - opponentBarStartX(i)
                : -opponentBarDir * 34
              : 0;

            return (
              <Bar
                key={`o-${battle.key}-${i}`}
                spawnX={opponentBarStartX(i)}
                marchX={opponentMarchX(i)}
                pushX={opponentPushX(survivedIndex)}
                color={RED}
                darkColor={RED_DARK}
                gradientId={redGrad}
                index={i}
                phase={phase}
                cancelled={isCancelled}
                cancelOrder={cancelOrder}
                survived={isSurvived}
                chargeOrder={chargeOrder}
                chargeHitOffsetX={chargeHitOffsetX}
                cy={cy}
                barW={barW}
                barH={barH}
                barRx={barRx}
                morphFromX={isAnchored ? opponentSplashLandX : undefined}
                morphFromY={isAnchored ? cy : undefined}
              />
            );
          })
        )}

        {/* Collision flash — flash position follows the bar row's Y */}
        <BarBattleCollisionFlash
          x={dividerX}
          active={phase === 'battle'}
          count={minBars}
          cy={cy}
          ry={isAnchored ? 16 : 38}
          sparkOffsets={isAnchored ? [-10, -4, 0, 4, 10] : undefined}
        />
      </g>
    </g>
  );
}
