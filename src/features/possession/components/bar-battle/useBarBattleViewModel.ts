'use client';

/**
 * Controller hook for BarBattleOverlay. Owns every derived value the
 * scene pieces need: variant-driven bar sizing, layout direction,
 * anchored-mode row builders (and their fallback math), bar
 * start/march/push X factories, score-splash positions, and score
 * visibility flags.
 *
 * Stays pure: it accepts a pre-resolved `matchVariant` so the shell
 * (or its caller) owns whichever store-read / prop-pass policy is in
 * effect. No hook here reads from the realtime store directly.
 */

import { useId } from 'react';
import type { BarBattleState, BarBattleVariant } from './barBattle.types';
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
  CY,
  CY_ANCHORED,
  FIELD_MAX_X,
  FIELD_MIN_X,
  PENALTY_KEEPER_SHIELD_OFFSET,
  clampCenterX,
  pointsToBarCount,
} from './barBattle.helpers';

interface UseBarBattleViewModelArgs {
  battle: BarBattleState;
  mirrored: boolean;
  playerAvatarX?: number;
  opponentAvatarX?: number;
  isPortrait: boolean;
  matchVariant: BarBattleVariant | undefined;
  /** Penalties zoom the pitch, so the anchored bars render smaller to fit. */
  isPenalty?: boolean;
}

export interface BarBattleViewModel {
  // Lifecycle
  isDone: boolean;
  // Scoped SVG IDs
  blueGrad: string;
  redGrad: string;
  battleClip: string;
  // Variant-resolved sizing
  isAnchored: boolean;
  isPenalty: boolean;
  barW: number;
  barH: number;
  barGap: number;
  barRx: number;
  cy: number;
  chargeLunges: boolean;
  // Battle state
  phase: BarBattleState['phase'];
  playerBars: number;
  opponentBars: number;
  playerPoints: number;
  opponentPoints: number;
  remainingDelta: number;
  dividerX: number;
  minBars: number;
  // Directional layout
  playerBarDir: number;
  opponentBarDir: number;
  playerKeeperShieldCenterX: number | null;
  opponentKeeperShieldCenterX: number | null;
  // Per-side layouts
  playerLayout: AnchoredLayout;
  opponentLayout: AnchoredLayout;
  // Stack counts for the result/charge phases
  playerStackCount: number;
  opponentStackCount: number;
  // Position factories
  playerBarStartX: (i: number) => number;
  opponentBarStartX: (i: number) => number;
  playerMarchX: (i: number) => number;
  opponentMarchX: (i: number) => number;
  playerPushX: (i: number) => number;
  opponentPushX: (i: number) => number;
  // Splash + text positions
  playerSplashLandX: number;
  opponentSplashLandX: number;
  playerTextX: number;
  opponentTextX: number;
  playerTextTargetX: number;
  opponentTextTargetX: number;
  // Score visibility
  playerScoreVisible: boolean;
  opponentScoreVisible: boolean;
}

interface AnchoredLayout {
  compact: boolean;
  dir: number;
  rowX: (i: number) => number;
  compactX: number;
  splashX: number;
  landingX: number;
}

export function useBarBattleViewModel({
  battle,
  mirrored,
  playerAvatarX,
  opponentAvatarX,
  matchVariant,
  isPenalty = false,
}: UseBarBattleViewModelArgs): BarBattleViewModel {
  const uid = useId();
  const isAnchored = matchVariant === 'ranked_sim'
    && playerAvatarX != null
    && opponentAvatarX != null;
  // The penalty pitch is zoomed in, so shrink the anchored bars to keep them
  // proportionate to the larger avatars.
  const penaltyScale = isAnchored && isPenalty ? 0.62 : 1;

  const { phase, playerBars, opponentBars, playerPoints, opponentPoints, remainingDelta, dividerX } = battle;
  const isDone = phase === 'done';
  const chargeLunges = battle.chargeMode !== 'pulse';
  const blueGrad = `${uid}-blue`;
  const redGrad = `${uid}-red`;
  const battleClip = `${uid}-battle-clip`;

  // Pick the active bar dimensions based on variant. Anchored bars are smaller
  // so they fit cleanly below the avatar circle without bleeding into the field.
  // In penalties they shrink further (penaltyScale) for the zoomed pitch.
  const barW = (isAnchored ? BAR_W_ANCHORED : BAR_W) * penaltyScale;
  const barH = (isAnchored ? BAR_H_ANCHORED : BAR_H) * penaltyScale;
  const barGap = (isAnchored ? BAR_GAP_ANCHORED : BAR_GAP) * penaltyScale;
  const barRx = isAnchored ? BAR_RX_ANCHORED : BAR_RX;
  const cy = isAnchored ? CY_ANCHORED : CY;
  const avatarBarOffset = isAnchored && isPenalty ? AVATAR_BAR_OFFSET * penaltyScale : AVATAR_BAR_OFFSET;
  const fieldMinX = isAnchored && isPenalty ? 4 : FIELD_MIN_X;
  const fieldMaxX = isAnchored && isPenalty ? 496 : FIELD_MAX_X;
  const clampBarCenterX = (x: number, width: number) =>
    isAnchored && isPenalty
      ? Math.max(fieldMinX + width / 2, Math.min(fieldMaxX - width / 2, x))
      : clampCenterX(x, width);

  const minBars = Math.min(playerBars, opponentBars);
  const playerDir = mirrored ? 1 : -1;
  const opponentDir = mirrored ? -1 : 1;
  const playerLayoutBars = playerBars > 0 ? playerBars : pointsToBarCount(playerPoints);
  const opponentLayoutBars = opponentBars > 0 ? opponentBars : pointsToBarCount(opponentPoints);

  // When anchored, derive each side's bar direction from the ACTUAL avatar
  // positions so bars always grow away from the opposing avatar — never across
  // it. This is required for penalties, where avatars are placed by role
  // (keeper/shooter), not by the half-based `mirrored` flag, so `playerDir`/
  // `opponentDir` (which key off `mirrored`) would point the wrong way and lay
  // bars in front of the opposite avatar. In portrait SVG-X maps to screen-Y,
  // but the away-from-opponent rule is the same.
  const positionPlayerDir = playerAvatarX != null && opponentAvatarX != null && playerAvatarX > opponentAvatarX ? 1 : -1;
  const positionOpponentDir = opponentAvatarX != null && playerAvatarX != null && opponentAvatarX > playerAvatarX ? 1 : -1;
  const playerPreferredBarDir = isAnchored ? positionPlayerDir : playerDir;
  const opponentPreferredBarDir = isAnchored ? positionOpponentDir : opponentDir;

  const compactW = barW * 2.2;
  const normalRowX = (avatarX: number, dir: number, count: number): number[] | null => {
    if (count <= 0) return [];
    const firstX = avatarX + dir * avatarBarOffset;
    const maxStep = count <= 1
      ? barW + barGap
      : dir > 0
        ? ((fieldMaxX - barW) - firstX) / (count - 1)
        : (firstX - fieldMinX) / (count - 1);
    const step = Math.min(barW + barGap, maxStep);
    if (step < barW) return null;
    return Array.from({ length: count }, (_, i) => firstX + dir * i * step);
  };
  const buildAnchoredLayout = (
    avatarX: number | undefined,
    dir: number,
    count: number,
  ): AnchoredLayout => {
    const fallbackBarX = avatarX == null
      ? dividerX
      : clampBarCenterX(avatarX + dir * avatarBarOffset + barW / 2, barW);
    if (!isAnchored || avatarX == null || count <= 0) {
      return {
        compact: false,
        dir,
        rowX: () => fallbackBarX - barW / 2,
        compactX: fallbackBarX,
        splashX: fallbackBarX,
        landingX: fallbackBarX,
      };
    }

    const xs = normalRowX(avatarX, dir, count);
    const compactGap = Math.max(4, barGap);
    const compactOffset = isPenalty ? compactGap + compactW / 2 : avatarBarOffset + compactW / 2;
    const compactX = clampBarCenterX(avatarX + dir * compactOffset, compactW);
    if (xs === null) {
      return {
        compact: true,
        dir,
        rowX: () => compactX,
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
  const playerKeeperShieldCenterX = isAnchored && isPenalty && playerAvatarX != null
    ? clampBarCenterX(playerAvatarX - playerBarDir * PENALTY_KEEPER_SHIELD_OFFSET, compactW)
    : null;
  const opponentKeeperShieldCenterX = isAnchored && isPenalty && opponentAvatarX != null
    ? clampBarCenterX(opponentAvatarX - opponentBarDir * PENALTY_KEEPER_SHIELD_OFFSET, compactW)
    : null;
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
      ? playerAvatarX + playerBarDir * avatarBarOffset
    : dividerX + playerDir * (28 + (playerBars * (barW + barGap)) / 2);
  const opponentSplashLandX = isAnchored && opponentBars > 0
    ? opponentLayout.splashX
    : opponentAvatarX != null
      ? opponentAvatarX + opponentBarDir * avatarBarOffset
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

  return {
    isDone,
    blueGrad,
    redGrad,
    battleClip,
    isAnchored,
    isPenalty,
    barW,
    barH,
    barGap,
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
    playerKeeperShieldCenterX,
    opponentKeeperShieldCenterX,
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
  };
}
