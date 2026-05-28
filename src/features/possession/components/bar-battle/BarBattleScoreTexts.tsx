'use client';

/**
 * The pair of "+N" splash texts that fly over the classic
 * (non-anchored) BarBattle layout. The anchored variant hides this
 * pair because the HTML flight overlay (BarBattleFlightOverlay) owns
 * the splash, and showing both would double-stack a +N on the pitch.
 */

import { BarBattleScoreText } from './BarBattleScoreText';
import { BAR_H, BLUE, CY, RED } from './barBattle.helpers';
import type { BarBattleViewModel } from './useBarBattleViewModel';

interface BarBattleScoreTextsProps {
  vm: BarBattleViewModel;
  isPortrait: boolean;
}

export function BarBattleScoreTexts({ vm, isPortrait }: BarBattleScoreTextsProps) {
  if (vm.isAnchored) return null;

  const splashY = CY - BAR_H / 2 - 16;
  const convertY = CY - 6;

  return (
    <>
      <BarBattleScoreText
        points={vm.playerPoints}
        x={vm.playerTextX}
        color={BLUE}
        phase={vm.phase}
        targetX={vm.playerTextTargetX}
        visible={vm.playerScoreVisible}
        splashY={splashY}
        convertY={convertY}
        isPortrait={isPortrait}
      />
      <BarBattleScoreText
        points={vm.opponentPoints}
        x={vm.opponentTextX}
        color={RED}
        phase={vm.phase}
        targetX={vm.opponentTextTargetX}
        visible={vm.opponentScoreVisible}
        splashY={splashY}
        convertY={convertY}
        isPortrait={isPortrait}
      />
    </>
  );
}
