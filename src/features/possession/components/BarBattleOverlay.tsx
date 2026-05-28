'use client';

import { useRealtimeMatchStore } from '@/stores/realtimeMatch.store';
import type { BarBattleState } from './bar-battle/barBattle.types';
import { BLUE, BLUE_DARK, RED, RED_DARK } from './bar-battle/barBattle.helpers';
import { BarBattleScoreTexts } from './bar-battle/BarBattleScoreTexts';
import { BarBattleBars } from './bar-battle/BarBattleBars';
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
  const { blueGrad, redGrad, battleClip, isAnchored, cy, playerLayout, opponentLayout } = vm;

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

      <BarBattleScoreTexts vm={vm} isPortrait={isPortrait} />

      <BarBattleBars
        battle={battle}
        vm={vm}
        playerAvatarX={playerAvatarX}
        opponentAvatarX={opponentAvatarX}
        isPortrait={isPortrait}
      />
    </g>
  );
}
