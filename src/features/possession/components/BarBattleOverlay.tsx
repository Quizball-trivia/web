'use client';

import { useId } from 'react';
import { motion, AnimatePresence } from 'motion/react';

// ─── Types ───────────────────────────────────────────────────────────────────

export type BarBattlePhase =
  | 'player-score'
  | 'opponent-score'
  | 'both-score'
  | 'convert'
  | 'bars'
  | 'battle'
  | 'result'
  | 'done';

export interface BarBattleState {
  key: number;
  phase: BarBattlePhase;
  playerBars: number;
  opponentBars: number;
  playerPoints: number;
  opponentPoints: number;
  remainingDelta: number;
  dividerX: number;
}

// ─── Visual constants ────────────────────────────────────────────────────────

const BAR_W = 14;
const BAR_H = 62;
const BAR_GAP = 5;
const BAR_RX = 7; // Full capsule ends
const CY = 115;

const BLUE = '#1CB0F6';
const RED = '#FF4B4B';
const BLUE_DARK = '#0E8ACC';
const RED_DARK = '#CC2E2E';

// ─── Score text ──────────────────────────────────────────────────────────────

function ScoreText({
  points,
  x,
  color,
  phase,
  targetX,
  visible,
}: {
  points: number;
  x: number;
  color: string;
  phase: BarBattlePhase;
  targetX: number;
  visible: boolean;
}) {
  if (!visible || points <= 0) return null;

  const y = CY - BAR_H / 2 - 16;
  const isConverting = phase === 'convert';
  const isGone = phase === 'bars' || phase === 'battle' || phase === 'result' || phase === 'done';

  if (isGone) return null;

  return (
    <motion.text
      x={x}
      y={y}
      textAnchor="middle"
      fill={color}
      fontSize="20"
      fontWeight="900"
      fontFamily="'Poppins', system-ui, sans-serif"
      style={{ paintOrder: 'stroke fill', stroke: 'rgba(0,0,0,0.8)', strokeWidth: 3.5 }}
      initial={{ opacity: 0, scale: 0.2, y: y + 14 }}
      animate={
        isConverting
          ? {
              opacity: [1, 0.85, 0],
              x: [x, (x + targetX) / 2, targetX],
              y: [y, y + 6, CY - 6],
              scale: [1.1, 0.55, 0.15],
            }
          : {
              opacity: 1,
              scale: 1.1,
              y,
              x,
            }
      }
      transition={
        isConverting
          ? { duration: 0.5, ease: [0.4, 0, 0.15, 1] }
          : { type: 'spring', stiffness: 200, damping: 12, mass: 0.8 }
      }
    >
      +{points}
    </motion.text>
  );
}

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
}) {
  const y = CY - BAR_H / 2;

  const showBar = phase === 'bars' || phase === 'battle' || phase === 'result';
  const isMarching = phase === 'battle' || phase === 'result';
  const isBattling = phase === 'battle' && cancelled;
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

  // Spawning / standing bar
  return (
    <motion.rect
      key={`bar-spawn-${index}`}
      x={0} y={y} width={BAR_W} height={BAR_H} rx={BAR_RX}
      fill={`url(#${gradientId})`}
      initial={{ opacity: 0, x: spawnX, scaleY: 0.05, scaleX: 0.4 }}
      animate={{
        opacity: 0.95,
        x: isMarching ? marchX : spawnX,
        scaleY: 1,
        scaleX: 1,
      }}
      transition={{
        opacity: { duration: 0.2, delay: spawnDelay, ease: 'easeOut' },
        scaleY: { type: 'spring', stiffness: 260, damping: 14, delay: spawnDelay },
        scaleX: { type: 'spring', stiffness: 260, damping: 14, delay: spawnDelay },
        x: isMarching
          ? { type: 'spring', stiffness: 100, damping: 18, mass: 0.6, delay: spawnDelay * 0.25 }
          : { duration: 0.01, delay: spawnDelay },
      }}
    />
  );
}

// ─── Collision flash ─────────────────────────────────────────────────────────

function CollisionFlash({ x, active, count }: { x: number; active: boolean; count: number }) {
  return (
    <AnimatePresence>
      {active && count > 0 && (
        <motion.g key="collision-flash">
          {/* Wide glow pulse */}
          <motion.ellipse
            cx={x} cy={CY} rx={6} ry={38}
            fill="white"
            initial={{ opacity: 0, scaleX: 0.5 }}
            animate={{ opacity: [0, 0.5, 0.25, 0], scaleX: [0.5, 3, 2, 0.5] }}
            transition={{ duration: 0.5, ease: 'easeOut' }}
          />
          {/* Sparks */}
          {[-24, -12, 0, 12, 24].map((yOff, i) => (
            <motion.circle
              key={`spark-${i}`}
              cx={x} cy={CY + yOff} r={2.5}
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

// ─── Main overlay ────────────────────────────────────────────────────────────

interface BarBattleOverlayProps {
  battle: BarBattleState;
  mirrored: boolean;
}

export function BarBattleOverlay({ battle, mirrored }: BarBattleOverlayProps) {
  const uid = useId();
  const { phase, playerBars, opponentBars, playerPoints, opponentPoints, remainingDelta, dividerX } = battle;
  if (phase === 'done') return null;
  const blueGrad = `${uid}-blue`;
  const redGrad = `${uid}-red`;

  const minBars = Math.min(playerBars, opponentBars);
  const playerDir = mirrored ? 1 : -1;
  const opponentDir = mirrored ? -1 : 1;

  const barAreaOffset = 28;
  const playerBarStartX = (i: number) =>
    dividerX + playerDir * (barAreaOffset + i * (BAR_W + BAR_GAP));
  const opponentBarStartX = (i: number) =>
    dividerX + opponentDir * (barAreaOffset + i * (BAR_W + BAR_GAP));

  const playerMarchX = (i: number) =>
    dividerX + playerDir * ((i + 1) * (BAR_W + BAR_GAP));
  const opponentMarchX = (i: number) =>
    dividerX + opponentDir * ((i + 1) * (BAR_W + BAR_GAP));

  const pushPerBar = 16;
  const pushSign = remainingDelta > 0 ? opponentDir : playerDir;
  const pushDist = Math.abs(remainingDelta) * pushPerBar;
  const newDividerX = Math.max(40, Math.min(460, dividerX + pushDist * pushSign));

  const playerPushX = (i: number) =>
    newDividerX + playerDir * ((i + 1) * (BAR_W + BAR_GAP));
  const opponentPushX = (i: number) =>
    newDividerX + opponentDir * ((i + 1) * (BAR_W + BAR_GAP));

  const playerTextX = mirrored ? 400 : 100;
  const opponentTextX = mirrored ? 100 : 400;
  const playerTextTargetX = dividerX + playerDir * (barAreaOffset + (playerBars * (BAR_W + BAR_GAP)) / 2);
  const opponentTextTargetX = dividerX + opponentDir * (barAreaOffset + (opponentBars * (BAR_W + BAR_GAP)) / 2);

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
      </defs>

      {/* Score texts */}
      <ScoreText
        points={playerPoints}
        x={playerTextX}
        color={BLUE}
        phase={phase}
        targetX={playerTextTargetX}
        visible={playerScoreVisible}
      />
      <ScoreText
        points={opponentPoints}
        x={opponentTextX}
        color={RED}
        phase={phase}
        targetX={opponentTextTargetX}
        visible={opponentScoreVisible}
      />

      {/* Player bars */}
      {Array.from({ length: playerBars }).map((_, i) => {
        const isCancelled = remainingDelta >= 0 ? i < minBars : true;
        const isSurvived = remainingDelta > 0 && i >= minBars;
        const cancelOrder = isCancelled ? (minBars - 1 - i) : 0;
        const survivedIndex = isSurvived ? i - minBars : i;

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
          />
        );
      })}

      {/* Opponent bars */}
      {Array.from({ length: opponentBars }).map((_, i) => {
        const isCancelled = remainingDelta <= 0 ? i < minBars : true;
        const isSurvived = remainingDelta < 0 && i >= minBars;
        const cancelOrder = isCancelled ? (minBars - 1 - i) : 0;
        const survivedIndex = isSurvived ? i - minBars : i;

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
          />
        );
      })}

      {/* Collision flash */}
      <CollisionFlash x={dividerX} active={phase === 'battle'} count={minBars} />
    </g>
  );
}
