'use client';

import { useRealtimeMatchStore } from '@/stores/realtimeMatch.store';
import type { BarBattleState } from './bar-battle/barBattle.types';
import { BarBattleScoreText } from './bar-battle/BarBattleScoreText';
import { BarBattleCollisionFlash } from './bar-battle/BarBattleCollisionFlash';
import { BarBattleBar } from './bar-battle/BarBattleBar';
import { BarBattleStackedBar } from './bar-battle/BarBattleStackedBar';
import {
  BAR_H,
  BLUE,
  BLUE_DARK,
  CY,
  RED,
  RED_DARK,
} from './bar-battle/barBattle.helpers';
import { useBarBattleViewModel } from './bar-battle/useBarBattleViewModel';

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
  // Resolve the active variant. The store-read is still here as a
  // fallback so existing callers (notably the dev page) keep working;
  // step 6 of this refactor swaps the fallback out for a required
  // prop and moves the store-read up to the production caller.
  //
  // `match.variant` is the broader LobbyGameMode union; only the
  // ranked-sim / friendly-possession arms are visually meaningful here,
  // so narrow to the BarBattleVariant union — any other value falls
  // through to the classic (non-anchored) layout.
  const storeMatchVariant = useRealtimeMatchStore((s) => s.match?.variant);
  const matchVariant: 'ranked_sim' | 'friendly_possession' | undefined =
    variant
    ?? (storeMatchVariant === 'ranked_sim' || storeMatchVariant === 'friendly_possession'
      ? storeMatchVariant
      : undefined);

  const vm = useBarBattleViewModel({
    battle,
    mirrored,
    playerAvatarX,
    opponentAvatarX,
    isPortrait,
    matchVariant,
  });
  if (vm.isDone) return null;
  const {
    blueGrad,
    redGrad,
    battleClip,
    isAnchored,
    barW,
    barH,
    barRx,
    cy,
    chargeLunges,
    phase,
    playerBars,
    opponentBars,
    playerPoints,
    opponentPoints,
    remainingDelta,
    dividerX,
    minBars,
    playerBarDir,
    opponentBarDir,
    playerLayout,
    opponentLayout,
    playerStackCount,
    opponentStackCount,
    playerBarStartX,
    opponentBarStartX,
    playerMarchX,
    opponentMarchX,
    playerPushX,
    opponentPushX,
    playerSplashLandX,
    opponentSplashLandX,
    playerTextX,
    opponentTextX,
    playerTextTargetX,
    opponentTextTargetX,
    playerScoreVisible,
    opponentScoreVisible,
  } = vm;

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
