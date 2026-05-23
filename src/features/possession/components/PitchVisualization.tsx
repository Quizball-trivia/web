'use client';

import { useEffect, useId, useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { AvatarDisplay } from '@/components/AvatarDisplay';
import type { AvatarCustomization } from '@/types/game';
import { BarBattleOverlay, type BarBattleState } from './BarBattleOverlay';
import {
  GOAL_SHOT_TO_FIELD_RESET_MS,
  PENALTY_BALL_GOAL_FLIGHT_MS,
  PENALTY_BALL_SAVE_FLIGHT_MS,
  PENALTY_KICK_CONTACT_MS,
} from '../realtimePossession.helpers';

// Same cartoon-style ball asset the LoadingScreen bounces — keeps every
// in-game ball (pitch, shot, goal celebration) visually consistent with
// the brand's loading state.
const PITCH_BALL_IMAGE_URL =
  'https://lfbwhxvwubzeqkztghok.supabase.co/storage/v1/object/public/imgs/world-cup-style-ball-cartoon-transparent.png';

type GoalSide = 'left' | 'right';

// ─── Reusable marker sub-component for player/opponent avatars on the pitch ──
interface PitchMarkerProps {
  side?: 'player' | 'opponent';
  x: number;
  y: number;
  avatarCustomization?: AvatarCustomization | null;
  avatarAlt: string;
  color: string;
  glowFilter: string;
  isShooter: boolean;
  isKeeper: boolean;
  isSave: boolean;
  isGoal: boolean;
  showPenResult: boolean;
  keeperJolt: Record<string, number[]>;
  kickDirection: 1 | -1;
  isPortrait?: boolean;
  size?: number; // avatar diameter in px
  /** Hide the colored ring + glow halo (penalty UI uses raw avatars). */
  hideRing?: boolean;
}

function PitchMarker({
  side, x, y, avatarCustomization, avatarAlt, color, glowFilter,
  isShooter, isKeeper, isSave, isGoal, showPenResult, keeperJolt,
  kickDirection,
  isPortrait = false,
  size = 40,
  hideRing = false,
}: PitchMarkerProps) {
  const isPenaltyKick = showPenResult && isShooter;
  const isGoalCelebration = isGoal && isShooter;
  // isPortrait === desktop (portrait pitch via the matrix(0,-1,1,0,0,500)
  // flip); !isPortrait === mobile (raw landscape).
  //  - Desktop: lift the avatar up off the ball (screen-vertical lunge).
  //    The matrix maps motion.x → screen-Y, so +x = screen-up.
  //  - Mobile: tilt the whole avatar like a body lean — wind up to one
  //    side, swing through the opposite tilt, settle. Pivots from the
  //    feet via transformOrigin so it reads as a lean, not a spin.
  const joltAnim = isPenaltyKick
    ? isPortrait
      ? { x: [0, 16, -4, 0] }
      : { rotate: [0, 34 * kickDirection, -26 * kickDirection, 0] }
    : isSave && isKeeper
    ? keeperJolt
    : isGoalCelebration
      ? { x: [0, 8, -8, 6, -6, 4, -4, 0], y: [0, -4, -1, -5, -2, -4, 0, 0] }
      : {};
  const joltTransition = isPenaltyKick
    ? { duration: 0.78, times: [0, 0.32, 0.62, 1], ease: [0.22, 1, 0.36, 1] as const }
    : isGoalCelebration
    ? { duration: 1.8, ease: 'easeInOut' as const }
    : { duration: 0.5 };

  return (
    <motion.g
      data-pitch-avatar={side}
      animate={{ x, y }}
      transition={{ type: 'spring', stiffness: 150, damping: 14, mass: 0.8 }}
      filter={hideRing ? undefined : `url(#${glowFilter})`}
    >
      <motion.g
        animate={joltAnim}
        transition={joltTransition}
        style={
          isPenaltyKick && !isPortrait
            ? { transformOrigin: '50% 100%', transformBox: 'fill-box' }
            : undefined
        }
      >
        <g transform={isPortrait ? 'rotate(90)' : undefined}>
          {isShooter && !showPenResult && !hideRing && (
            <motion.circle
              cx="0" cy="0" r={size * 0.7}
              fill="none" stroke={color} strokeWidth="1.5" opacity="0.4"
              animate={{ r: [size * 0.7, size * 0.85, size * 0.7], opacity: [0.4, 0.15, 0.4] }}
              transition={{ duration: 1.5, repeat: Infinity, ease: 'easeInOut' }}
            />
          )}
          {!hideRing && (
            <circle cx="0" cy="0" r={size * 0.55} fill="none" stroke={color} strokeWidth={isKeeper ? 3.5 : 2.5} />
          )}
          <foreignObject x={-size/2} y={-size/2} width={size} height={size}>
            <div
              aria-label={avatarAlt}
              style={{ position: 'relative', width: '100%', height: '100%', borderRadius: '50%', overflow: 'hidden' }}
            >
              <AvatarDisplay customization={avatarCustomization ?? {}} size="xs" className="size-full" />
            </div>
          </foreignObject>
        </g>
      </motion.g>
    </motion.g>
  );
}

interface GoalCoordinates {
  penSpotX: number;
  goalLineX: number;
  goalTarget: { x: number; y: number };
  saveTarget: { x: number; y: number };
  penY: number;
  netX: number;
  goalTextX: number;
  /** +1 = rightward (into right goal), -1 = leftward (into left goal) */
  inward: 1 | -1;
}

const RIGHT_GOAL: GoalCoordinates = {
  penSpotX: 360,
  goalLineX: 485,
  goalTarget: { x: 492, y: 107 },
  saveTarget: { x: 483, y: 115 },
  penY: 115,
  netX: 485,
  goalTextX: 490,
  inward: 1,
};

const LEFT_GOAL: GoalCoordinates = {
  penSpotX: 140,
  goalLineX: 15,
  goalTarget: { x: 8, y: 107 },
  saveTarget: { x: 17, y: 115 },
  penY: 115,
  netX: 6,
  goalTextX: 10,
  inward: -1,
};

interface PenaltyMode {
  isPlayerShooter: boolean;
  result: 'pending' | 'goal' | 'saved' | null;
  phase: 'setup' | 'playing' | 'result';
}

interface ShotMode {
  result: 'pending' | 'goal' | 'saved' | 'miss';
  /** Captured ball X position at shot start (SVG coords). Stays fixed during animation. */
  ballOriginX: number;
  /** Whether the player is attacking (shooting) or defending (goalkeeping) */
  isPlayerAttacker: boolean;
  /** Optional animation variant index used to diversify shot visuals. */
  variant?: number;
  /** Unique per-shot identifier — forces shot-effect reset when consecutive shots share attacker/result/goal/variant. */
  shotId?: number | string;
}

interface PitchVisualizationProps {
  playerPosition: number; // 0–100
  playerAvatarUrl: string;
  opponentAvatarUrl: string;
  playerAvatarCustomization?: AvatarCustomization | null;
  opponentAvatarCustomization?: AvatarCustomization | null;
  playerName?: string;
  opponentName?: string;
  myMomentum?: number; // 0-6
  oppMomentum?: number; // 0-6
  penaltyMode?: PenaltyMode;
  shotMode?: ShotMode;
  /** Camera zoom into the goal area (penalty/shot). Field stays anchored. */
  zoomToGoal?: boolean;
  /** Flip pitch orientation for 2nd half */
  mirrored?: boolean;
  /** Which goal shots/penalties animate toward */
  targetGoal?: GoalSide;
  /** Ball sits on player icon (true) or opponent icon (false). Drives kick-off logic. */
  ballOnPlayer?: boolean;
  /** Pitch layout orientation. Portrait wraps all content in a 90° rotation matrix. */
  orientation?: 'landscape' | 'portrait';
  /** Bar battle animation state — rendered inside the possession zone */
  barBattle?: BarBattleState | null;
  /** Force a bar-battle variant without changing global realtime match state. */
  barBattleVariant?: 'ranked_sim' | 'friendly_possession';
  /** Align the possession boundary to the stadium art's true center line. */
  centerPossessionTrack?: boolean;
  /** Dev prototype: keep avatars planted and animate only the ball for shot/goal results. */
  simpleShotAnimation?: boolean;
  /** Optional shot avatar size override for compact demos where the production marker reads too small. */
  shotAvatarUnitSize?: number;
  /** Keep landing/demo avatars upright during shots while preserving the shared ball path. */
  disableShotActorResultMotion?: boolean;
  /** Hide the pitch-owned ball while a full-screen celebration owns the visible ball. */
  hideBall?: boolean;
}

function toShotVariant(value: number | undefined): 0 | 1 | 2 | 3 | 4 {
  const normalized = ((value ?? 0) % 5 + 5) % 5;
  if (normalized === 1 || normalized === 2 || normalized === 3 || normalized === 4) return normalized;
  return 0;
}

function isMotionPoint(value: unknown): value is { x: number | number[]; y: number | number[] } {
  const maybePoint = value as { x?: unknown; y?: unknown } | null;
  return (
    typeof maybePoint === 'object'
    && maybePoint !== null
    && (typeof maybePoint.x === 'number' || Array.isArray(maybePoint.x))
    && (typeof maybePoint.y === 'number' || Array.isArray(maybePoint.y))
  );
}

function mapLandscapeMotionToCss(motionValue: Record<string, number[]>, isPortrait: boolean) {
  if (!isPortrait) return motionValue;

  const x = motionValue.y;
  const y = motionValue.x?.map((value) => -value);
  return {
    ...(x ? { x } : {}),
    ...(y ? { y } : {}),
  };
}

export function PitchVisualization({
  playerPosition,
  playerAvatarCustomization = null,
  opponentAvatarCustomization = null,
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
  barBattle,
  barBattleVariant,
  centerPossessionTrack = true,
  simpleShotAnimation = false,
  shotAvatarUnitSize,
  disableShotActorResultMotion = false,
  hideBall = false,
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

  return (
    <div className={isPortrait ? 'h-full w-full' : 'w-full'}>
      {/* Square corners — matches the Figma stadium frame (no rounded edges) */}
      <div className={`relative overflow-hidden ${isPortrait ? 'h-full w-full' : ''}`}>
        {/* Camera zoom wrapper — field container stays anchored, SVG zooms inside */}
        <motion.div
          animate={shouldZoomToGoal ? {
            scale: 1.8,
            x: '0%',
            y: '0%',
          } : {
            scale: 1,
            x: '0%',
            y: '0%',
          }}
          transition={{ duration: 0.5, ease: [0.4, 0, 0.2, 1] }}
          style={{ transformOrigin: zoomOrigin, position: 'relative', ...(isPortrait ? { height: '100%' } : {}) }}
        >
        {/* viewBox aspect 500/290 ≈ 1.72:1 — matches the Figma stadium frame
            (846.95 × 493.07). The internal 500-wide × 230-tall play area
            stays at y=0..230 so existing markings/avatar positions don't
            need to shift; we extend 30 units of green pitch above and below
            (y=-30..0 and y=230..260) to reach Figma's proportions. */}
        <svg
          data-pitch-field="possession"
          viewBox={isPortrait ? '-30 0 290 500' : '0 -30 500 290'}
          className={isPortrait ? 'w-full h-full' : 'w-full h-auto'}
        >
          <defs>
            <clipPath id={uid('fieldClip')}>
              {/* Square clip — matches Figma's sharp-cornered stadium frame. */}
              <rect x="0" y="-30" width="500" height="290" />
            </clipPath>
            <filter id={uid('blueGlow')} x="-50%" y="-50%" width="200%" height="200%">
              <feGaussianBlur stdDeviation="4" result="blur" />
              <feFlood floodColor="#1CB0F6" floodOpacity="0.5" result="color" />
              <feComposite in="color" in2="blur" operator="in" result="glow" />
              <feMerge><feMergeNode in="glow" /><feMergeNode in="SourceGraphic" /></feMerge>
            </filter>
            <filter id={uid('redGlow')} x="-50%" y="-50%" width="200%" height="200%">
              <feGaussianBlur stdDeviation="4" result="blur" />
              <feFlood floodColor="#FF4B4B" floodOpacity="0.5" result="color" />
              <feComposite in="color" in2="blur" operator="in" result="glow" />
              <feMerge><feMergeNode in="glow" /><feMergeNode in="SourceGraphic" /></feMerge>
            </filter>
            <filter id={uid('ballGlow')} x="-50%" y="-50%" width="200%" height="200%">
              <feGaussianBlur stdDeviation="3" result="blur" />
              <feFlood floodColor="#ffffff" floodOpacity="0.6" result="color" />
              <feComposite in="color" in2="blur" operator="in" result="glow" />
              <feMerge><feMergeNode in="glow" /><feMergeNode in="SourceGraphic" /></feMerge>
            </filter>
            {/* Dual momentum meter clip */}
            <clipPath id={uid('meterClip')}>
              <rect x="125" y="34" width="250" height="9" rx="4.5" />
            </clipPath>
            {/* Goal net pattern (penalty only) */}
            <pattern id={uid('penNet')} x="0" y="0" width="6" height="6" patternUnits="userSpaceOnUse">
              <line x1="0" y1="0" x2="0" y2="6" stroke="rgba(255,255,255,0.12)" strokeWidth="0.4" />
              <line x1="0" y1="0" x2="6" y2="0" stroke="rgba(255,255,255,0.12)" strokeWidth="0.4" />
            </pattern>
          </defs>

          {/* Portrait mode: wrap all content in a 90° rotation matrix.
              matrix(0,-1,1,0,0,500) maps landscape (x,y) → portrait (y, 500-x):
              - Landscape left (x=0, DEF) → portrait bottom (y=500)
              - Landscape right (x=500, BOX) → portrait top (y=0)
              Animations operate in local coord space, parent transform maps to viewport. */}
          <g transform={isPortrait ? 'matrix(0,-1,1,0,0,500)' : undefined}>

          {/* Field background — stadium image stretches to fill the full
              500×290 viewBox so the green + yellow boundary lines reach the
              edges of the Figma-matched aspect frame. */}
          <image href="/assets/stadium-green.png" x="0" y="-30" width="500" height="290" preserveAspectRatio="none" clipPath={`url(#${uid('fieldClip')})`} />

          {/* Zone bands — hidden during penalties */}
          {!isPenalty && (
            <>
              {zoneBands.map((z, i) => (
                <rect key={i} x={z.x} y="-30" width={z.w} height="290" fill={z.fill} rx={z.rx} />
              ))}
            </>
          )}

          {/* Pitch markings removed — stadium-green.png has its own lines */}

          <circle
            data-pitch-ball-center="true"
            cx={possessionBoundaryX}
            cy="112"
            r="1"
            fill="transparent"
            pointerEvents="none"
          />


          {/* === Player avatars — ONLY shown during shots and penalties === */}
          {(isPenalty || (isShot && !useSimpleShotAnimation)) && !renderHtmlPitchActors && (
            <>
              {/* === Opponent marker === */}
              <PitchMarker
                side="opponent"
                x={opponentX} y={goal.penY}
                avatarCustomization={opponentAvatarCustomization}
                avatarAlt={opponentAvatarAlt}
                color="#FF4B4B" glowFilter={uid('redGlow')}
                isShooter={isPenalty ? !penaltyMode.isPlayerShooter : (isShot && shotMode ? !shotMode.isPlayerAttacker : false)}
                isKeeper={isPenalty ? penaltyMode.isPlayerShooter : (isShot && shotMode ? shotMode.isPlayerAttacker : false)}
                isSave={!!isSave || !!isShotSave} isGoal={!!isGoal || !!isShotGoal}
                showPenResult={!!showPenResult || !!shotResultActive} keeperJolt={keeperJolt}
                kickDirection={goal.inward}
                isPortrait={isPortrait}
                size={isShot ? 30 : 40}
                hideRing={isPenalty}
              />

              {/* === Player marker === */}
              <PitchMarker
                side="player"
                x={playerX} y={goal.penY}
                avatarCustomization={playerAvatarCustomization}
                avatarAlt={playerAvatarAlt}
                color="#1CB0F6" glowFilter={uid('blueGlow')}
                isShooter={isPenalty ? penaltyMode.isPlayerShooter : (isShot && shotMode ? shotMode.isPlayerAttacker : false)}
                isKeeper={isPenalty ? !penaltyMode.isPlayerShooter : (isShot && shotMode ? !shotMode.isPlayerAttacker : false)}
                isSave={!!isSave || !!isShotSave} isGoal={!!isGoal || !!isShotGoal}
                showPenResult={!!showPenResult || !!shotResultActive} keeperJolt={keeperJolt}
                kickDirection={goal.inward}
                isPortrait={isPortrait}
                size={isShot ? 30 : 40}
                hideRing={isPenalty}
              />
            </>
          )}

          {/* === Live Score Tracker Style — ONLY shown during normal gameplay === */}
          {!isPenalty && (!isShot || useSimpleShotAnimation) && (
            <>
              {/* Possession tracking visualization */}
              <g>
                {/* Main possession bar container */}
                <rect x="15" y="70" width="470" height="90" fill="rgba(0,0,0,0.2)" rx="6" />

                {/* Center line */}
                <line x1="250" y1="70" x2="250" y2="160" stroke="rgba(255,255,255,0.1)" strokeWidth="2" />

                {/* Player's possession fill (always from their defensive end) */}
                <motion.rect
                  x={mirrored ? possessionBoundaryX : possessionTrackLeft}
                  y="70"
                  width={(playerPosition / 100) * possessionTrackWidth}
                  height="90"
                  fill="#1CB0F6"
                  opacity="0.18"
                  rx="6"
                  animate={{
                    opacity: [0.15, 0.22, 0.15],
                  }}
                  transition={{ duration: 2.5, repeat: Infinity, ease: 'easeInOut' }}
                />

                {/* Opponent's possession fill */}
                <motion.rect
                  x={mirrored ? possessionTrackLeft : possessionBoundaryX}
                  y="70"
                  width={((100 - playerPosition) / 100) * possessionTrackWidth}
                  height="90"
                  fill="#FF4B4B"
                  opacity="0.12"
                  rx="6"
                  animate={{
                    opacity: [0.08, 0.15, 0.08],
                  }}
                  transition={{ duration: 2.5, repeat: Infinity, ease: 'easeInOut', delay: 0.3 }}
                />

                {/* Bar battle animation sits UNDER avatars. If bars overlap in
                    tight edge cases, the player art remains on top and readable. */}
                {barBattle && (
                  <BarBattleOverlay
                    battle={barBattle}
                    mirrored={mirrored}
                    playerAvatarX={playerAvatarVisualX}
                    opponentAvatarX={opponentAvatarVisualX}
                    isPortrait={isPortrait}
                    variant={barBattleVariant}
                  />
                )}

                {/* Player avatar (positioned close to white line on blue side).
                    The data-pitch-avatar attribute lets the bar-battle flight
                    overlay find the avatar's screen position so the +N ghost
                    can fly into it. Production code paths ignore the attr. */}
                {!renderHtmlPitchActors && (
                  <motion.g
                    data-pitch-avatar="player"
                    animate={{
                      x: playerAvatarX,
                      scale: playerAvatarPulse,
                    }}
                    transition={{
                      x: { type: 'spring', stiffness: 160, damping: 12, mass: 0.7 },
                      scale: { duration: 1.5, repeat: Infinity, ease: 'easeInOut' }
                    }}
                  >
                    <g transform={isPortrait ? 'rotate(90, 0, 115)' : undefined}>
                      <foreignObject
                        x={-avatarBoxOffset}
                        y={avatarBoxY}
                        width={avatarBox}
                        height={avatarBox}
                      >
                        <div
                          aria-label={playerAvatarAlt}
                          style={{
                            width: '100%',
                            height: '100%',
                            borderRadius: '50%',
                            overflow: 'hidden',
                            // 2nd half (mirrored) flips the pitch — player is
                            // now on the right side and needs to face left
                            // toward the opp. Default half: player faces forward.
                            transform: mirrored ? 'scaleX(-1)' : undefined,
                          }}
                        >
                          <AvatarDisplay customization={playerAvatarCustomization ?? {}} size="xs" className="size-full" />
                        </div>
                      </foreignObject>
                    </g>
                  </motion.g>
                )}

                {/* Opponent avatar (positioned close to white line on red side) */}
                {!renderHtmlPitchActors && (
                  <motion.g
                    data-pitch-avatar="opponent"
                    animate={{
                      x: opponentAvatarX,
                      scale: opponentAvatarPulse,
                    }}
                    transition={{
                      x: { type: 'spring', stiffness: 160, damping: 12, mass: 0.7 },
                      scale: { duration: 1.5, repeat: Infinity, ease: 'easeInOut' }
                    }}
                  >
                    <g transform={isPortrait ? 'rotate(90, 0, 115)' : undefined}>
                      <foreignObject
                        x={-avatarBoxOffset}
                        y={avatarBoxY}
                        width={avatarBox}
                        height={avatarBox}
                      >
                        <div
                          aria-label={opponentAvatarAlt}
                          style={{
                            width: '100%',
                            height: '100%',
                            borderRadius: '50%',
                            overflow: 'hidden',
                            // Default half: opp sits on the right and faces
                            // left toward the player. After mirror (2nd half)
                            // opp is on the left and faces forward.
                            transform: mirrored ? undefined : 'scaleX(-1)',
                          }}
                        >
                          <AvatarDisplay customization={opponentAvatarCustomization ?? {}} size="xs" className="size-full" />
                        </div>
                      </foreignObject>
                    </g>
                  </motion.g>
                )}

                {/* Ball position indicator - positioned at boundary between blue/red zones */}
                <motion.g
                  animate={{ x: possessionBoundaryX }}
                  transition={{ type: 'spring', stiffness: 160, damping: 12, mass: 0.7 }}
                >
                  {/* Vertical indicator line */}
                  <motion.line
                    x1="0" y1="65" x2="0" y2="165"
                    stroke="white"
                    strokeWidth="2.5"
                    opacity="0.9"
                    animate={{
                      opacity: [0.7, 1, 0.7],
                    }}
                    transition={{ duration: 1.5, repeat: Infinity, ease: 'easeInOut' }}
                  />
                </motion.g>

                {/* Zone indicator only — the per-avatar possession % and name
                    labels were redundant with the top scoreboard and clustered
                    awkwardly on mobile (the "50% Me" overlap). The scoreboard
                    already shows points/possession, so the pitch stays clean. */}
                <g transform={textTf(0, 0)}>
                  <text
                    x="250"
                    y="210"
                    textAnchor="middle"
                    fill="rgba(255,255,255,0.35)"
                    fontSize="7"
                    fontWeight="700"
                    fontFamily="system-ui"
                  >
                    {playerPosition < 33.33
                      ? 'DEFENSIVE ZONE'
                      : playerPosition < 66.67
                        ? 'MIDFIELD ZONE'
                        : 'ATTACKING ZONE'}
                  </text>
                </g>

              </g>
            </>
          )}

          {/* === UNIFIED BALL — single persistent <motion.g> that never unmounts === */}
          {!hideBall && !renderHtmlPitchActors && !renderSimpleShotBall && (
            <motion.g
              key="ball"
              initial={false}
              animate={{
                x: ballTarget.x,
                y: ballTarget.y,
                opacity: ballOpacity,
              }}
              transition={ballTransition}
            >
              <motion.circle cx="0" cy="0" r={ballGlowR} fill="rgba(255,255,255,0.1)" filter={`url(#${uid('ballGlow')})`} />
              <foreignObject x={-ballBoxOffset} y={-ballBoxOffset} width={ballBox} height={ballBox}>
                <img src={PITCH_BALL_IMAGE_URL} alt="" style={ballImageStyle} />
              </foreignObject>
            </motion.g>
          )}

          {!hideBall && !renderHtmlPitchActors && renderSimpleShotBall && (
            <motion.g
              key={`simple-shot-ball-${shotMode?.isPlayerAttacker ? 'player' : 'opponent'}-${shotMode?.result}-${targetGoal ?? 'right'}`}
              initial={{
                x: simpleShotOriginX,
                y: simpleShotOriginY,
                scale: 1,
                opacity: 1,
              }}
              animate={simpleShotBallAnimate}
              transition={ballTransition}
            >
              <motion.circle cx="0" cy="0" r={ballGlowR} fill="rgba(255,255,255,0.1)" filter={`url(#${uid('ballGlow')})`} />
              <foreignObject x={-ballBoxOffset} y={-ballBoxOffset} width={ballBox} height={ballBox}>
                <img src={PITCH_BALL_IMAGE_URL} alt="" style={ballImageStyle} />
              </foreignObject>
            </motion.g>
          )}

          {/* === Decorative overlays — separate AnimatePresence === */}
          <AnimatePresence>
            {/* Penalty goal: net ripple */}
            {isGoal && (
              <motion.g key="pen-goal-decor">
                <motion.rect
                  x={goal.netX} y="92" width="9" height="46" rx="1"
                  fill={`url(#${uid('penNet')})`}
                  initial={{ opacity: 0 }}
                  animate={{
                    opacity: [0, 0.8, 0.4, 0],
                    x: [goal.netX, goal.netX + 2 * goal.inward, goal.netX + goal.inward, goal.netX],
                  }}
                  transition={{ duration: 0.5, delay: 0.35 }}
                />
              </motion.g>
            )}
            {/* Shot goal: net ripple */}
            {isShotGoal && (
              <motion.g key="shot-goal-decor">
                <motion.rect
                  x={goal.netX} y="92" width="9" height="46" rx="1"
                  fill={`url(#${uid('penNet')})`}
                  initial={{ opacity: 0 }}
                  animate={{
                    opacity: [0, 0.8, 0.4, 0],
                    x: [goal.netX, goal.netX + 2 * goal.inward, goal.netX + goal.inward, goal.netX],
                  }}
                  transition={{ duration: 0.5, delay: shotGoalNetDelay }}
                />
              </motion.g>
            )}
          </AnimatePresence>


          </g>
        </svg>
        {renderHtmlPitchActors && (
          <>
            <motion.div
              data-pitch-avatar="player"
              initial={false}
              animate={playerActorPosition}
              transition={{ type: 'spring', stiffness: 160, damping: 12, mass: 0.7 }}
              className="pointer-events-none absolute z-20"
              style={{
                width: actorAvatarSize,
                aspectRatio: '1 / 1',
                transform: 'translate(-50%, -50%)',
              }}
            >
              <motion.div
                animate={playerHtmlActorMotion}
                transition={htmlActorTransition(playerHtmlIsShooter)}
                className="size-full rounded-full"
                style={!isPortrait && useMarkerActors && htmlActorResultActive && playerHtmlIsShooter ? { transformOrigin: '50% 100%' } : undefined}
              >
                <div
                  aria-label={playerAvatarAlt}
                  className="size-full overflow-hidden rounded-full"
                  style={{ transform: mirrored ? 'scaleX(-1)' : undefined }}
                >
                  <AvatarDisplay customization={playerAvatarCustomization ?? {}} size="xs" className="size-full" />
                </div>
              </motion.div>
            </motion.div>

            <motion.div
              data-pitch-avatar="opponent"
              initial={false}
              animate={opponentActorPosition}
              transition={{ type: 'spring', stiffness: 160, damping: 12, mass: 0.7 }}
              className="pointer-events-none absolute z-20"
              style={{
                width: actorAvatarSize,
                aspectRatio: '1 / 1',
                transform: 'translate(-50%, -50%)',
              }}
            >
              <motion.div
                animate={opponentHtmlActorMotion}
                transition={htmlActorTransition(opponentHtmlIsShooter)}
                className="size-full rounded-full"
                style={!isPortrait && useMarkerActors && htmlActorResultActive && opponentHtmlIsShooter ? { transformOrigin: '50% 100%' } : undefined}
              >
                <div
                  aria-label={opponentAvatarAlt}
                  className="size-full overflow-hidden rounded-full"
                  style={{ transform: mirrored ? undefined : 'scaleX(-1)' }}
                >
                  <AvatarDisplay customization={opponentAvatarCustomization ?? {}} size="xs" className="size-full" />
                </div>
              </motion.div>
            </motion.div>

            {!hideBall && ballActorPosition && (
              <motion.div
                key="portrait-html-ball"
                initial={false}
                animate={{
                  ...ballActorPosition,
                  opacity: ballOpacity,
                }}
                transition={ballTransition}
                className="pointer-events-none absolute z-30"
                style={{
                  width: actorBallSize,
                  aspectRatio: '1 / 1',
                  transform: 'translate(-50%, -50%)',
                }}
              >
                <div className="absolute inset-[-18%] rounded-full bg-white/10 blur-sm" />
                <img
                  src={PITCH_BALL_IMAGE_URL}
                  alt=""
                  className="relative size-full object-contain drop-shadow-[0_0_8px_rgba(255,255,255,0.32)]"
                />
              </motion.div>
            )}
          </>
        )}
        </motion.div>

        {/* Vignette overlay during camera zoom */}
        <AnimatePresence>
          {shouldZoomToGoal && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 pointer-events-none"
              style={{ background: vignetteGradient }}
            />
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
