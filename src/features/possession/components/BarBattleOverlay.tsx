'use client';

import { useId } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useRealtimeMatchStore } from '@/stores/realtimeMatch.store';

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

const BAR_W_ANCHORED = 10;
const BAR_H_ANCHORED = 90;
const BAR_GAP_ANCHORED = 4;
const BAR_RX_ANCHORED = 6;
const CY_ANCHORED = 115;
const AVATAR_BAR_OFFSET = 58;
const AVATAR_LANE_CLEARANCE = 42;

const BLUE = '#1CB0F6';
const RED = '#FF4B4B';
const BLUE_DARK = '#0E8ACC';
const RED_DARK = '#CC2E2E';
const FIELD_MIN_X = 24;
const FIELD_MAX_X = 476;

// ─── Score text ──────────────────────────────────────────────────────────────

function ScoreText({
  points,
  x,
  color,
  phase,
  targetX,
  visible,
  splashY = CY - BAR_H / 2 - 16,
  convertY = CY - 6,
  isPortrait = false,
}: {
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
}) {
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

  // Spawning / standing bar. In the anchored variant we morph from the
  // splash's landing point (initialX, initialYOffset) outward to (spawnX, 0),
  // making the splash visually fragment into bars. In classic mode initialX
  // === spawnX, so no extra movement happens.
  return (
    <motion.rect
      key={`bar-spawn-${index}`}
      x={0} y={y} width={BAR_W} height={BAR_H} rx={BAR_RX}
      fill={`url(#${gradientId})`}
      initial={{ opacity: 0, x: initialX, y: initialYOffset, scaleY: 0.05, scaleX: 0.4 }}
      animate={{
        opacity: 0.95,
        x: isMarching ? marchX : spawnX,
        y: 0,
        scaleY: 1,
        scaleX: 1,
      }}
      transition={{
        opacity: { duration: 0.25, delay: spawnDelay, ease: 'easeOut' },
        scaleY: { type: 'spring', stiffness: 240, damping: 14, delay: spawnDelay },
        scaleX: { type: 'spring', stiffness: 240, damping: 14, delay: spawnDelay },
        x: isMarching
          ? { type: 'spring', stiffness: 100, damping: 18, mass: 0.6, delay: spawnDelay * 0.25 }
          : { type: 'spring', stiffness: 180, damping: 16, mass: 0.6, delay: spawnDelay },
        y: { type: 'spring', stiffness: 180, damping: 16, mass: 0.6, delay: spawnDelay },
      }}
    />
  );
}

// ─── Collision flash ─────────────────────────────────────────────────────────

function CollisionFlash({
  x,
  active,
  count,
  cy = CY,
  ry = 38,
  sparkOffsets = [-24, -12, 0, 12, 24],
}: {
  x: number;
  active: boolean;
  count: number;
  cy?: number;
  ry?: number;
  sparkOffsets?: number[];
}) {
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
}

export function BarBattleOverlay({
  battle,
  mirrored,
  playerAvatarX,
  opponentAvatarX,
  isPortrait = false,
}: BarBattleOverlayProps) {
  const uid = useId();
  
  const matchVariant = useRealtimeMatchStore((s) => s.match?.variant);
  const isAnchored = matchVariant === 'ranked_sim'
    && playerAvatarX != null
    && opponentAvatarX != null;

  const { phase, playerBars, opponentBars, playerPoints, opponentPoints, remainingDelta, dividerX } = battle;
  if (phase === 'done') return null;
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

  // Direction each side extends its bar row in landscape coords.
  //   - For non-mirrored (player on left attacking right): player's defensive
  //     zone is to the LEFT, so player bars extend leftward (-1).
  //   - Opponent attacks the other way, bars extend rightward (+1).
  // For mirrored layout the signs flip. We re-use playerDir/opponentDir which
  // already encode that.
  // In portrait the pitch group is rotated, so SVG X becomes screen Y. The two
  // sides need opposite lanes: the lower/player side pushes from bottom upward
  // (decreasing SVG X), while the upper/opponent side pushes from top downward
  // (increasing SVG X).
  const playerPreferredBarDir = isAnchored && isPortrait ? -1 : playerDir;
  const opponentPreferredBarDir = isAnchored && isPortrait ? 1 : opponentDir;

  const resolveAnchoredRowDir = (
    avatarX: number,
    otherAvatarX: number | null | undefined,
    preferredDir: number,
    count: number
  ) => {
    if (count <= 0) return preferredDir;
    const getShiftedBounds = (dir: number) => {
      const raw = Array.from({ length: count }, (_, i) => (
        avatarX + dir * (AVATAR_BAR_OFFSET + i * (barW + barGap))
      ));
      const minX = Math.min(...raw);
      const maxX = Math.max(...raw) + barW;
      const leftOverflow = FIELD_MIN_X - minX;
      const rightOverflow = maxX - FIELD_MAX_X;
      const shift = leftOverflow > 0
        ? leftOverflow
        : rightOverflow > 0
          ? -rightOverflow
          : 0;
      return {
        minX: minX + shift,
        maxX: maxX + shift,
        clipped: leftOverflow > 0 || rightOverflow > 0,
      };
    };

    const isClearOfOtherAvatar = (dir: number) => {
      if (otherAvatarX == null) return true;
      const bounds = getShiftedBounds(dir);
      return otherAvatarX < bounds.minX - AVATAR_LANE_CLEARANCE
        || otherAvatarX > bounds.maxX + AVATAR_LANE_CLEARANCE;
    };

    const candidates = [preferredDir, -preferredDir];
    const clearCandidate = candidates.find((dir) => isClearOfOtherAvatar(dir));
    if (clearCandidate != null) return clearCandidate;

    const unclippedCandidate = candidates.find((dir) => !getShiftedBounds(dir).clipped);
    return unclippedCandidate ?? preferredDir;
  };

  const playerBarDir = isAnchored && playerAvatarX != null
    ? resolveAnchoredRowDir(playerAvatarX, opponentAvatarX, playerPreferredBarDir, playerBars)
    : playerPreferredBarDir;
  const opponentBarDir = isAnchored && opponentAvatarX != null
    ? resolveAnchoredRowDir(opponentAvatarX, playerAvatarX, opponentPreferredBarDir, opponentBars)
    : opponentPreferredBarDir;
  const makeAnchoredRowX = (avatarX: number, dir: number, count: number) => {
    const raw = Array.from({ length: count }, (_, i) => (
      avatarX + dir * (AVATAR_BAR_OFFSET + i * (barW + barGap))
    ));
    if (raw.length === 0) return (_i: number) => avatarX;

    const minX = Math.min(...raw);
    const maxX = Math.max(...raw) + barW;
    const leftOverflow = FIELD_MIN_X - minX;
    const rightOverflow = maxX - FIELD_MAX_X;
    const shift = leftOverflow > 0
      ? leftOverflow
      : rightOverflow > 0
        ? -rightOverflow
        : 0;
    const shifted = raw.map((x) => Math.max(FIELD_MIN_X, Math.min(FIELD_MAX_X - barW, x + shift)));
    return (i: number) => shifted[i] ?? avatarX;
  };
  const playerAnchoredRowX = isAnchored && playerAvatarX != null
    ? makeAnchoredRowX(playerAvatarX, playerBarDir, playerBars)
    : null;
  const opponentAnchoredRowX = isAnchored && opponentAvatarX != null
    ? makeAnchoredRowX(opponentAvatarX, opponentBarDir, opponentBars)
    : null;

  // Spawn position:
  //   - classic: cluster just outside the divider on each player's side
  //   - avatar-anchored: extend OUTWARD from each avatar (bars sit BEHIND the
  //     avatar in landscape x; in portrait that maps to above/below in screen).
  //     Bar i=0 is closest to avatar, i=N furthest away.
  const playerBarStartX = (i: number) => {
    if (isAnchored && playerAnchoredRowX) {
      return playerAnchoredRowX(i);
    }
    const barAreaOffset = 28;
    return dividerX + playerDir * (barAreaOffset + i * (barW + barGap));
  };
  const opponentBarStartX = (i: number) => {
    if (isAnchored && opponentAnchoredRowX) {
      return opponentAnchoredRowX(i);
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
    ? (playerBarStartX(0) + playerBarStartX(playerBars - 1) + barW) / 2
    : playerAvatarX != null
      ? playerAvatarX + playerBarDir * AVATAR_BAR_OFFSET
    : dividerX + playerDir * (28 + (playerBars * (barW + barGap)) / 2);
  const opponentSplashLandX = isAnchored && opponentBars > 0
    ? (opponentBarStartX(0) + opponentBarStartX(opponentBars - 1) + barW) / 2
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
            <ScoreText
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
            <ScoreText
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
        {/* Player bars — in anchored variant they morph FROM the splash landing
            point outward to their row positions, so the splash visually scatters
            into bars. Classic uses spawnX as the start point (no morph). */}
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
              cy={cy}
              barW={barW}
              barH={barH}
              barRx={barRx}
              morphFromX={isAnchored ? playerSplashLandX : undefined}
              morphFromY={isAnchored ? cy : undefined}
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
              cy={cy}
              barW={barW}
              barH={barH}
              barRx={barRx}
              morphFromX={isAnchored ? opponentSplashLandX : undefined}
              morphFromY={isAnchored ? cy : undefined}
            />
          );
        })}

        {/* Collision flash — flash position follows the bar row's Y */}
        <CollisionFlash
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
