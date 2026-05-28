'use client';

/**
 * Controller hook for the PitchVisualization scene split.
 *
 * Owns every derived value the scenes need: avatar coordinates,
 * goal-side mapping, penalty/shot result flags, zone-band layout,
 * ball-target keyframes, ball transition tuning, html-actor motion
 * presets, the `simpleShotReturnToCenter` lifecycle, and the scoped
 * `uid()` factory used by every <defs>-referencing scene.
 *
 * The screen is a pure renderer over this hook — no useState or
 * useEffect lives in the shell.
 */

import { useEffect, useId, useMemo, useState } from 'react';
import {
  GOAL_SHOT_TO_FIELD_RESET_MS,
  PENALTY_BALL_GOAL_FLIGHT_MS,
  PENALTY_BALL_SAVE_FLIGHT_MS,
  PENALTY_KICK_CONTACT_MS,
} from '../../realtimePossession.helpers';

import type { GoalCoordinates, PitchVisualizationProps } from './pitch.types';
import {
  LEFT_GOAL,
  RIGHT_GOAL,
  isMotionPoint,
  mapLandscapeMotionToCss,
  toShotVariant,
} from './pitch.helpers';

export function usePitchSceneModel({
  playerPosition,
  playerName,
  opponentName,
  myMomentum: _myMomentum = 0,
  oppMomentum: _oppMomentum = 0,
  penaltyMode,
  shotMode,
  zoomToGoal,
  mirrored = false,
  targetGoal,
  ballOnPlayer = true,
  orientation = 'landscape',
  centerPossessionTrack = true,
  simpleShotAnimation = false,
  shotAvatarUnitSize,
  disableShotActorResultMotion = false,
}: PitchVisualizationProps) {
  const isPenalty = !!penaltyMode;
  const isShot = !!shotMode;
  const useSimpleShotAnimation = simpleShotAnimation && isShot && !!shotMode;
  const isPortrait = orientation === 'portrait';
  // Mobile uses the landscape pitch (desktop puts the pitch in a narrow
  // portrait sidebar). Bigger avatars on mobile so they're readable at
  // small viewport sizes.
  const avatarBox = isPortrait ? 68 : 88;
  const avatarBoxOffset = avatarBox / 2; // SVG x/y offset from centre
  const avatarBoxY = 115 - avatarBoxOffset; // foreignObject y, centred on cy=115
  void _myMomentum;
  void _oppMomentum;

  // Scoped SVG IDs to avoid collisions when multiple instances render
  const reactId = useId();
  const uid = (name: string) => `${reactId}-${name}`;
  const playerAvatarAlt = playerName ? `${playerName} avatar` : 'player avatar';
  const opponentAvatarAlt = opponentName ? `${opponentName} avatar` : 'opponent avatar';

  // Helper: counter-rotate text 90° in portrait mode so labels stay readable
  const textTf = (cx: number, cy: number) =>
    isPortrait ? `rotate(90, ${cx}, ${cy})` : undefined;
  void textTf;

  const ballImageStyle: React.CSSProperties = isPortrait
    ? { width: '100%', height: '100%', objectFit: 'contain', transform: 'rotate(90deg)' }
    : { width: '100%', height: '100%', objectFit: 'contain' };
  // Penalty UI uses a smaller ball so it doesn't dominate the goal-mouth view.
  const ballBox = isPenalty ? (isPortrait ? 14 : 20) : (isPortrait ? 24 : 36);
  const ballBoxOffset = ballBox / 2;
  const ballGlowR = isPenalty ? (isPortrait ? 8 : 11) : (isPortrait ? 14 : 20);

  // Goal coordinate set based on target
  const goal: GoalCoordinates = (targetGoal ?? 'right') === 'right' ? RIGHT_GOAL : LEFT_GOAL;
  const penaltyBallStart = useMemo(() => (
    isPortrait
      ? { x: goal.penSpotX - 10, y: goal.penY }
      : { x: goal.penSpotX, y: goal.penY + 9 }
  ), [goal, isPortrait]);
  const possessionTrackLeft = 15;
  const possessionTrackRight = centerPossessionTrack ? 485 : 470;
  const possessionTrackWidth = possessionTrackRight - possessionTrackLeft;
  const rawPossessionBoundaryX = mirrored
    ? possessionTrackRight - (playerPosition / 100) * possessionTrackWidth
    : possessionTrackLeft + (playerPosition / 100) * possessionTrackWidth;
  // Mobile avatars are bigger, so they need more spread from the boundary.
  const avatarSpread = isPortrait ? 48 : 55;

  // Clamp the boundary so the winning side's bar zone (1 stacked bar
  // worth — AVATAR_BAR_OFFSET 58 + half bar 16 = 74) always fits behind
  // the avatar on either edge of the pitch.
  const BAR_ZONE_PADDING = 74;
  const minBoundary = 24 + avatarSpread + BAR_ZONE_PADDING;
  const maxBoundary = 476 - avatarSpread - BAR_ZONE_PADDING;
  const possessionBoundaryX = Math.max(
    minBoundary,
    Math.min(maxBoundary, rawPossessionBoundaryX),
  );

  const playerAvatarX = possessionBoundaryX + (mirrored ? avatarSpread : -avatarSpread);
  const opponentAvatarX = possessionBoundaryX + (mirrored ? -avatarSpread : avatarSpread);

  // Normal positions (mirrored flips attack direction for 2nd half)
  const normalPlayerX = mirrored
    ? 470 - (playerPosition / 100) * 440
    : 30 + (playerPosition / 100) * 440;
  const normalOpponentX = mirrored
    ? normalPlayerX + 30
    : normalPlayerX - 30;

  // Avatar visual X — mirrors the inline `animate.x` on the player/opponent
  // <motion.g> below. Passed to BarBattleOverlay so the avatar-anchored variant
  // can spawn bars directly below each avatar.
  const playerAvatarVisualX = playerAvatarX;
  const opponentAvatarVisualX = opponentAvatarX;
  const simpleShotOriginX = shotMode?.isPlayerAttacker ? playerAvatarX : opponentAvatarX;
  const simpleShotOriginY = 115;
  const normalBallX = ballOnPlayer
    ? normalPlayerX + (mirrored ? -14 : 14)
    : normalOpponentX + (mirrored ? 14 : -14);

  // Final positions (penalty/shot overrides normal)
  const playerX = isPenalty
    ? (penaltyMode.isPlayerShooter ? goal.penSpotX : goal.goalLineX)
    : isShot && shotMode
      ? (shotMode.isPlayerAttacker ? shotMode.ballOriginX : goal.goalLineX)
      : normalPlayerX;
  const opponentX = isPenalty
    ? (penaltyMode.isPlayerShooter ? goal.goalLineX : goal.penSpotX)
    : isShot && shotMode
      ? (shotMode.isPlayerAttacker ? goal.goalLineX : shotMode.ballOriginX)
      : normalOpponentX;

  // Penalty result state
  const showPenResult = isPenalty && penaltyMode.phase === 'result' && penaltyMode.result;
  const isGoal = showPenResult && penaltyMode.result === 'goal';
  const isSave = showPenResult && penaltyMode.result === 'saved';

  // Shot result state
  const shotResultActive = isShot && shotMode.result !== 'pending';
  const isShotGoal = shotResultActive && shotMode.result === 'goal';
  const isShotSave = shotResultActive && shotMode.result === 'saved';
  const isShotMiss = shotResultActive && shotMode.result === 'miss';
  const [simpleShotReturnToCenter, setSimpleShotReturnToCenter] = useState(false);
  const simpleShotKey = useSimpleShotAnimation && isShot && shotMode
    ? `${shotMode.shotId ?? 0}:${shotMode.isPlayerAttacker ? 'player' : 'opponent'}:${shotMode.result}:${targetGoal ?? 'right'}:${shotMode.variant ?? 0}`
    : null;

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- reset on key change
    setSimpleShotReturnToCenter(false);
    if (!useSimpleShotAnimation || !isShotGoal || !simpleShotKey) return;

    const timer = setTimeout(() => {
      setSimpleShotReturnToCenter(true);
    }, GOAL_SHOT_TO_FIELD_RESET_MS);

    return () => clearTimeout(timer);
  }, [isShotGoal, simpleShotKey, useSimpleShotAnimation]);

  const simpleShotGoalTarget = { x: goal.goalTarget.x, y: goal.goalTarget.y - 6 };
  const simpleShotCenterTarget = { x: possessionBoundaryX, y: 112 };
  const simpleShotTarget = (() => {
    if (simpleShotReturnToCenter) return simpleShotCenterTarget;
    if (isShotGoal) return simpleShotGoalTarget;
    if (isShotSave) return { x: goal.goalLineX - 10 * goal.inward, y: goal.penY };
    if (isShotMiss) return { x: goal.goalLineX + 38 * goal.inward, y: goal.goalTarget.y - 58 };
    return { x: simpleShotOriginX, y: simpleShotOriginY };
  })();
  const renderSimpleShotBall = useSimpleShotAnimation && (
    (isShotGoal && !simpleShotReturnToCenter) || isShotSave || isShotMiss
  );
  const shotVariant = toShotVariant(shotMode?.variant);
  // Ball origin — captured at shot start so it doesn't shift when positions reset
  const shotBallOriginX = useSimpleShotAnimation ? simpleShotOriginX : (isShot ? shotMode.ballOriginX : normalBallX);
  const shotBallOriginY = useSimpleShotAnimation ? simpleShotOriginY : 145; // Below shooter's feet (avatar at 115 + radius 28 + ball offset)

  // Zone bands (mirrored reverses order: BOX on left, DEF on right)
  const zoneBands = mirrored
    ? [
        { x: 0, w: 150, fill: 'rgba(255,75,75,0.06)', rx: 12 },
        { x: 150, w: 125, fill: 'rgba(255,150,0,0.04)' },
        { x: 275, w: 125, fill: 'rgba(56,189,248,0.03)' },
        { x: 400, w: 100, fill: 'rgba(156,163,175,0.05)', rx: 12 },
      ]
    : [
        { x: 0, w: 100, fill: 'rgba(156,163,175,0.05)', rx: 12 },
        { x: 100, w: 125, fill: 'rgba(56,189,248,0.03)' },
        { x: 225, w: 125, fill: 'rgba(255,150,0,0.04)' },
        { x: 350, w: 150, fill: 'rgba(255,75,75,0.06)', rx: 12 },
      ];

  // Camera zoom direction — portrait maps landscape left→bottom, right→top
  const zoomOrigin = isPortrait
    ? (targetGoal === 'left' ? 'center bottom' : 'center top')
    : (targetGoal === 'left' ? 'left center' : 'right center');
  const vignetteGradient = isPortrait
    ? (targetGoal === 'left'
      ? 'radial-gradient(ellipse at 50% 80%, transparent 35%, rgba(0,0,0,0.35) 100%)'
      : 'radial-gradient(ellipse at 50% 20%, transparent 35%, rgba(0,0,0,0.35) 100%)')
    : (targetGoal === 'left'
      ? 'radial-gradient(ellipse at 20% 50%, transparent 35%, rgba(0,0,0,0.35) 100%)'
      : 'radial-gradient(ellipse at 80% 50%, transparent 35%, rgba(0,0,0,0.35) 100%)');
  const shouldZoomToGoal = !!zoomToGoal && !useSimpleShotAnimation;

  // Keeper jolt direction (away from goal) — enhanced amplitude for cinematic feel
  const keeperJolt = { x: [0, -8 * goal.inward, 4 * goal.inward, 0], y: [0, -6, -2, 0] };
  const ballTarget = useMemo(() => {
    if (isGoal) {
      return {
        x: [penaltyBallStart.x, penaltyBallStart.x, goal.goalLineX + 92 * goal.inward],
        y: [penaltyBallStart.y, penaltyBallStart.y, goal.goalTarget.y - 8],
      };
    }
    if (isSave) {
      return {
        x: [penaltyBallStart.x, penaltyBallStart.x, goal.saveTarget.x - 10 * goal.inward],
        y: [penaltyBallStart.y, penaltyBallStart.y, goal.saveTarget.y + 5],
      };
    }
    if (useSimpleShotAnimation && isShotGoal) return simpleShotTarget;
    if (useSimpleShotAnimation && isShotSave) return simpleShotTarget;
    if (useSimpleShotAnimation && isShotMiss) return simpleShotTarget;
    if (isShotGoal) {
      if (shotVariant === 1) {
        return {
          x: [shotBallOriginX, (shotBallOriginX + goal.goalTarget.x) / 2 - 20 * goal.inward, goal.goalTarget.x],
          y: [shotBallOriginY, 68, goal.goalTarget.y - 16],
        };
      }
      if (shotVariant === 2) {
        return {
          x: [shotBallOriginX, goal.goalLineX - 20 * goal.inward, goal.goalTarget.x],
          y: [shotBallOriginY, goal.penY + 6, goal.goalTarget.y + 2],
        };
      }
      if (shotVariant === 3) {
        return {
          x: [
            shotBallOriginX,
            shotBallOriginX - 28 * goal.inward,
            (shotBallOriginX + goal.goalTarget.x) / 2 - 10 * goal.inward,
            goal.goalTarget.x,
          ],
          y: [shotBallOriginY, shotBallOriginY - 24, 76, goal.goalTarget.y - 10],
        };
      }
      if (shotVariant === 4) {
        return {
          x: [shotBallOriginX, (shotBallOriginX + goal.goalTarget.x) / 2, goal.goalTarget.x - 8 * goal.inward, goal.goalTarget.x],
          y: [shotBallOriginY, 84, 62, goal.goalTarget.y - 6],
        };
      }
      return {
        x: [shotBallOriginX, (shotBallOriginX + goal.goalTarget.x) / 2, goal.goalTarget.x],
        y: [shotBallOriginY, shotBallOriginY - 25, goal.goalTarget.y - 8],
      };
    }
    if (isShotSave) {
      if (shotVariant === 1) {
        return {
          x: [shotBallOriginX, goal.goalLineX - 2 * goal.inward, goal.goalLineX - 20 * goal.inward],
          y: [shotBallOriginY, goal.penY - 16, goal.penY - 36],
        };
      }
      if (shotVariant === 2) {
        return {
          x: [shotBallOriginX, goal.goalLineX - 5 * goal.inward, goal.goalLineX - 18 * goal.inward],
          y: [shotBallOriginY, goal.penY + 4, goal.penY + 22],
        };
      }
      return {
        x: [shotBallOriginX, goal.goalLineX - 2 * goal.inward, goal.goalLineX - 12 * goal.inward],
        y: [shotBallOriginY, goal.penY - 10, goal.penY + 5],
      };
    }
    if (isShotMiss) {
      if (shotVariant === 1) {
        return {
          x: [shotBallOriginX, goal.goalLineX - 22 * goal.inward],
          y: [shotBallOriginY, goal.penY - 8],
        };
      }
      if (shotVariant === 2) {
        return {
          x: [shotBallOriginX, goal.goalLineX + 2 * goal.inward, goal.goalLineX - 16 * goal.inward],
          y: [shotBallOriginY, goal.penY - 12, goal.penY + 20],
        };
      }
      return {
        x: [shotBallOriginX, goal.goalLineX + 10 * goal.inward],
        y: [shotBallOriginY, 50],
      };
    }
    if (isPenalty) {
      return penaltyBallStart;
    }
    // During shot pending, position ball between shooter and goal
    if (isShot && shotMode.result === 'pending') {
      if (useSimpleShotAnimation) {
        return { x: simpleShotOriginX, y: simpleShotOriginY };
      }
      return {
        x: (shotBallOriginX + goal.goalLineX) / 2,
        y: 115
      };
    }
    // Position ball at the boundary between blue and red zones
    return { x: possessionBoundaryX, y: 112 };
  }, [isGoal, isSave, useSimpleShotAnimation, isShotGoal, simpleShotTarget, isShotSave, isShotMiss, isPenalty, isShot, shotMode, shotVariant, goal, penaltyBallStart, shotBallOriginX, shotBallOriginY, simpleShotOriginX, simpleShotOriginY, possessionBoundaryX]);
  const ballTransition = useMemo(() => {
    // Penalty: hold the ball still through the shooter's wind-up, then
    // launch exactly on the same contact beat as the SFX.
    if (isGoal) return {
      duration: PENALTY_BALL_GOAL_FLIGHT_MS / 1000,
      delay: PENALTY_KICK_CONTACT_MS / 1000,
      times: [0, 0.56, 1],
      ease: [0.2, 0, 0.4, 1] as const,
    };
    if (isSave) return {
      duration: PENALTY_BALL_SAVE_FLIGHT_MS / 1000,
      delay: PENALTY_KICK_CONTACT_MS / 1000,
      times: [0, 0.5, 1],
      ease: [0.3, 0, 0.2, 1] as const,
    };
    if (useSimpleShotAnimation && simpleShotReturnToCenter) {
      return { duration: 1.45, ease: [0.22, 1, 0.36, 1] as const, times: [0, 0.28, 1] };
    }
    if (useSimpleShotAnimation && (isShotGoal || isShotSave || isShotMiss)) {
      return { duration: isShotGoal ? 1.05 : 0.9, ease: [0.22, 1, 0.36, 1] as const };
    }
    if (isShotGoal) {
      const duration = shotVariant === 1
        ? 0.55
        : shotVariant === 2
          ? 0.38
          : shotVariant === 3
            ? 0.62
            : shotVariant === 4
              ? 0.48
              : 0.45;
      return { duration, ease: [0.2, 0, 0.4, 1] as const };
    }
    if (isShotSave) return { duration: shotVariant === 1 ? 0.6 : 0.5, ease: [0.3, 0, 0.2, 1] as const, times: [0, 0.5, 1] };
    if (isShotMiss) return { duration: shotVariant === 1 ? 0.45 : 0.55, ease: [0.2, 0, 0.6, 1] as const };
    return { type: 'spring' as const, stiffness: 160, damping: 12, mass: 0.7 };
  }, [isGoal, isSave, useSimpleShotAnimation, simpleShotReturnToCenter, isShotGoal, isShotSave, isShotMiss, shotVariant]);
  const ballOpacity = isShotMiss && !useSimpleShotAnimation ? 0.3 : 1;
  const shotGoalNetDelay = useSimpleShotAnimation ? 0.95 : 0.35;
  const simpleShotBallAnimate = simpleShotReturnToCenter && isShotGoal
    ? {
        x: simpleShotCenterTarget.x,
        y: simpleShotCenterTarget.y,
        scale: 1,
        opacity: 1,
      }
    : {
        x: simpleShotTarget.x,
        y: simpleShotTarget.y,
        scale: 1,
        opacity: 1,
      };
  const renderHtmlPitchActors = true;
  const actorPosition = (x: number, y: number) => ({
    left: `${(isPortrait ? (y + 30) / 290 : x / 500) * 100}%`,
    top: `${(isPortrait ? (500 - x) / 500 : (y + 30) / 290) * 100}%`,
  });
  const actorMotionPosition = (target: { x: number | number[]; y: number | number[] }) => {
    if (typeof target.x === 'number' && typeof target.y === 'number') {
      return actorPosition(target.x, target.y);
    }

    const xs = Array.isArray(target.x) ? target.x : [target.x];
    const ys = Array.isArray(target.y) ? target.y : [target.y];
    const keyframeCount = Math.max(xs.length, ys.length);
    return {
      left: Array.from({ length: keyframeCount }, (_, i) => {
        const x = xs[Math.min(i, xs.length - 1)] ?? xs[xs.length - 1] ?? 0;
        const y = ys[Math.min(i, ys.length - 1)] ?? ys[ys.length - 1] ?? 0;
        return actorPosition(x, y).left;
      }),
      top: Array.from({ length: keyframeCount }, (_, i) => {
        const x = xs[Math.min(i, xs.length - 1)] ?? xs[xs.length - 1] ?? 0;
        const y = ys[Math.min(i, ys.length - 1)] ?? ys[ys.length - 1] ?? 0;
        return actorPosition(x, y).top;
      }),
    };
  };
  const useMarkerActors = isPenalty || (isShot && !useSimpleShotAnimation);
  const actorY = useMarkerActors ? goal.penY : 115;
  const playerActorPosition = actorPosition(useMarkerActors ? playerX : playerAvatarX, actorY);
  const opponentActorPosition = actorPosition(useMarkerActors ? opponentX : opponentAvatarX, actorY);
  const ballActorPosition = isMotionPoint(ballTarget)
    ? actorMotionPosition(ballTarget)
    : null;
  const actorWidthUnits = isPortrait ? 290 : 500;
  const actorAvatarUnitSize = isPenalty
    ? 40
    : isShot && !useSimpleShotAnimation
      ? (shotAvatarUnitSize ?? 30)
      : avatarBox;
  const actorAvatarSize = `${(actorAvatarUnitSize / actorWidthUnits) * 100}%`;
  const actorBallSize = `${(ballBox / actorWidthUnits) * 100}%`;
  const playerAvatarPulse = mirrored
    ? (playerPosition < 50 ? [1, 1.08, 1] : 1)
    : (playerPosition > 50 ? [1, 1.08, 1] : 1);
  const opponentAvatarPulse = mirrored
    ? (playerPosition > 50 ? [1, 1.08, 1] : 1)
    : (playerPosition < 50 ? [1, 1.08, 1] : 1);
  const htmlActorResultActive = !!showPenResult || !!shotResultActive;
  const htmlActorSaveActive = !!isSave || !!isShotSave;
  const playerHtmlIsShooter = isPenalty
    ? penaltyMode.isPlayerShooter
    : (isShot && shotMode ? shotMode.isPlayerAttacker : false);
  const playerHtmlIsKeeper = isPenalty
    ? !penaltyMode.isPlayerShooter
    : (isShot && shotMode ? !shotMode.isPlayerAttacker : false);
  const opponentHtmlIsShooter = isPenalty
    ? !penaltyMode.isPlayerShooter
    : (isShot && shotMode ? !shotMode.isPlayerAttacker : false);
  const opponentHtmlIsKeeper = isPenalty
    ? penaltyMode.isPlayerShooter
    : (isShot && shotMode ? shotMode.isPlayerAttacker : false);
  const htmlActorMotion = (isShooter: boolean, isKeeper: boolean) => {
    if (htmlActorResultActive && isShooter) {
      if (disableShotActorResultMotion && isShot && !isPenalty) {
        return { scale: [1, 1.04, 1] };
      }
      return isPortrait
        ? { y: [0, -16, 4, 0] }
        : { rotate: [0, 34 * goal.inward, -26 * goal.inward, 0] };
    }
    if (htmlActorSaveActive && isKeeper) return mapLandscapeMotionToCss(keeperJolt, isPortrait);
    return {};
  };
  const htmlActorTransition = (isShooter: boolean) => (
    useMarkerActors && htmlActorResultActive && isShooter
      ? { duration: 0.78, times: [0, 0.32, 0.62, 1], ease: [0.22, 1, 0.36, 1] as const }
      : { duration: useMarkerActors ? 0.5 : 1.5, repeat: useMarkerActors ? 0 : Infinity, ease: 'easeInOut' as const }
  );
  const playerHtmlActorMotion = useMarkerActors
    ? htmlActorMotion(playerHtmlIsShooter, playerHtmlIsKeeper)
    : { scale: playerAvatarPulse };
  const opponentHtmlActorMotion = useMarkerActors
    ? htmlActorMotion(opponentHtmlIsShooter, opponentHtmlIsKeeper)
    : { scale: opponentAvatarPulse };
  const playerHtmlActorTransition = htmlActorTransition(playerHtmlIsShooter);
  const opponentHtmlActorTransition = htmlActorTransition(opponentHtmlIsShooter);

  return {
    isPenalty,
    isShot,
    isPortrait,
    useSimpleShotAnimation,
    avatarBox,
    avatarBoxOffset,
    avatarBoxY,
    uid,
    playerAvatarAlt,
    opponentAvatarAlt,
    ballImageStyle,
    ballBox,
    ballBoxOffset,
    ballGlowR,
    goal,
    possessionTrackLeft,
    possessionTrackWidth,
    possessionBoundaryX,
    playerAvatarX,
    opponentAvatarX,
    playerAvatarVisualX,
    opponentAvatarVisualX,
    simpleShotOriginX,
    simpleShotOriginY,
    playerX,
    opponentX,
    showPenResult,
    isGoal,
    isSave,
    shotResultActive,
    isShotGoal,
    isShotSave,
    isShotMiss,
    renderSimpleShotBall,
    shotVariant,
    zoneBands,
    zoomOrigin,
    vignetteGradient,
    shouldZoomToGoal,
    keeperJolt,
    ballTarget,
    ballTransition,
    ballOpacity,
    shotGoalNetDelay,
    simpleShotBallAnimate,
    renderHtmlPitchActors,
    playerActorPosition,
    opponentActorPosition,
    ballActorPosition,
    actorAvatarSize,
    actorBallSize,
    playerAvatarPulse,
    opponentAvatarPulse,
    htmlActorResultActive,
    useMarkerActors,
    playerHtmlIsShooter,
    opponentHtmlIsShooter,
    playerHtmlActorMotion,
    opponentHtmlActorMotion,
    playerHtmlActorTransition,
    opponentHtmlActorTransition,
  };
}
