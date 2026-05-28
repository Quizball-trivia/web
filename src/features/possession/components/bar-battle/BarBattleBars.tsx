'use client';

/**
 * Render the two bar rows (player + opponent) plus the collision flash
 * at the divider. Picks the compact stacked variant when the layout
 * builder says the row can't fit individual bars behind the avatar.
 *
 * All math + decisions come from the view-model; this component owns
 * only the JSX shape + the per-bar charge-impact offset that depends
 * on the avatar X coordinates (which the shell holds, not the VM).
 */

import { BarBattleBar } from './BarBattleBar';
import { BarBattleStackedBar } from './BarBattleStackedBar';
import { BarBattleCollisionFlash } from './BarBattleCollisionFlash';
import { BLUE, BLUE_DARK, RED, RED_DARK } from './barBattle.helpers';
import type { BarBattleState } from './barBattle.types';
import type { BarBattleViewModel } from './useBarBattleViewModel';

interface BarBattleBarsProps {
  battle: BarBattleState;
  vm: BarBattleViewModel;
  playerAvatarX?: number;
  opponentAvatarX?: number;
  isPortrait: boolean;
}

export function BarBattleBars({
  battle,
  vm,
  playerAvatarX,
  opponentAvatarX,
  isPortrait,
}: BarBattleBarsProps) {
  const {
    isAnchored,
    barW,
    barH,
    barRx,
    cy,
    chargeLunges,
    phase,
    playerBars,
    opponentBars,
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
    blueGrad,
    redGrad,
    battleClip,
  } = vm;

  return (
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
  );
}
