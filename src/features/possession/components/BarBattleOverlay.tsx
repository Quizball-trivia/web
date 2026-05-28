'use client';

import { useId } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useRealtimeMatchStore } from '@/stores/realtimeMatch.store';
import type { BarBattlePhase, BarBattleState } from './bar-battle/barBattle.types';
import { BarBattleScoreText } from './bar-battle/BarBattleScoreText';
import { BarBattleCollisionFlash } from './bar-battle/BarBattleCollisionFlash';
import { BarBattleBar } from './bar-battle/BarBattleBar';
import { BarBattleStackedBar } from './bar-battle/BarBattleStackedBar';
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
  clampCenterX,
  pointsToBarCount,
} from './bar-battle/barBattle.helpers';

// Re-export the public types so external consumers can keep importing
// from this file path. Tests and the dev page do this.
export type { BarBattlePhase, BarBattleState } from './bar-battle/barBattle.types';

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
          <BarBattleStackedBar
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
              <BarBattleBar
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
          <BarBattleStackedBar
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
              <BarBattleBar
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
