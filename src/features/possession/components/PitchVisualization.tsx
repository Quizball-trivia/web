'use client';

import { useId, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';

type GoalSide = 'left' | 'right';

// ─── Reusable marker sub-component for player/opponent avatars on the pitch ──
interface PitchMarkerProps {
  x: number;
  y: number;
  avatarUrl: string;
  avatarAlt: string;
  color: string;
  glowFilter: string;
  isShooter: boolean;
  isKeeper: boolean;
  isSave: boolean;
  isGoal: boolean;
  showPenResult: boolean;
  keeperJolt: Record<string, number[]>;
  isPortrait?: boolean;
  size?: number; // avatar diameter in px
}

function PitchMarker({
  x, y, avatarUrl, avatarAlt, color, glowFilter,
  isShooter, isKeeper, isSave, isGoal, showPenResult, keeperJolt,
  isPortrait = false,
  size = 40,
}: PitchMarkerProps) {
  const isGoalCelebration = isGoal && isShooter;
  const joltAnim = isSave && isKeeper
    ? keeperJolt
    : isGoalCelebration
      ? { x: [0, 8, -8, 6, -6, 4, -4, 0], y: [0, -4, -1, -5, -2, -4, 0, 0] }
      : {};
  const joltTransition = isGoalCelebration
    ? { duration: 1.8, ease: 'easeInOut' as const }
    : { duration: 0.5 };

  return (
    <motion.g
      animate={{ x, y }}
      transition={{ type: 'spring', stiffness: 150, damping: 14, mass: 0.8 }}
      filter={`url(#${glowFilter})`}
    >
      <motion.g animate={joltAnim} transition={joltTransition}>
        <g transform={isPortrait ? 'rotate(90)' : undefined}>
          {isShooter && !showPenResult && (
            <motion.circle
              cx="0" cy="0" r={size * 0.7}
              fill="none" stroke={color} strokeWidth="1.5" opacity="0.4"
              animate={{ r: [size * 0.7, size * 0.85, size * 0.7], opacity: [0.4, 0.15, 0.4] }}
              transition={{ duration: 1.5, repeat: Infinity, ease: 'easeInOut' }}
            />
          )}
          <circle cx="0" cy="0" r={size * 0.55} fill="none" stroke={color} strokeWidth={isKeeper ? 3.5 : 2.5} />
          <foreignObject x={-size/2} y={-size/2} width={size} height={size}>
            <div style={{ width: '100%', height: '100%', borderRadius: '50%', overflow: 'hidden' }}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={avatarUrl} alt={avatarAlt} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
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
  penSpotX: 440,
  goalLineX: 485,
  goalTarget: { x: 492, y: 107 },
  saveTarget: { x: 483, y: 115 },
  penY: 115,
  netX: 485,
  goalTextX: 490,
  inward: 1,
};

const LEFT_GOAL: GoalCoordinates = {
  penSpotX: 60,
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
}

interface PitchVisualizationProps {
  playerPosition: number; // 0–100
  playerAvatarUrl: string;
  opponentAvatarUrl: string;
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
}

function toShotVariant(value: number | undefined): 0 | 1 | 2 | 3 | 4 {
  const normalized = ((value ?? 0) % 5 + 5) % 5;
  if (normalized === 1 || normalized === 2 || normalized === 3 || normalized === 4) return normalized;
  return 0;
}

export function PitchVisualization({
  playerPosition,
  playerAvatarUrl,
  opponentAvatarUrl,
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
}: PitchVisualizationProps) {
  const isPenalty = !!penaltyMode;
  const isShot = !!shotMode;
  const isPortrait = orientation === 'portrait';
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

  // Helper: ball emoji style — counter-rotate in portrait to stay upright
  const ballEmojiStyle: React.CSSProperties = isPortrait
    ? { fontSize: '20px', lineHeight: '24px', textAlign: 'center', transform: 'rotate(90deg)' }
    : { fontSize: '20px', lineHeight: '24px', textAlign: 'center' };

  // Goal coordinate set based on target
  const goal: GoalCoordinates = (targetGoal ?? 'right') === 'right' ? RIGHT_GOAL : LEFT_GOAL;

  // Normal positions (mirrored flips attack direction for 2nd half)
  const normalPlayerX = mirrored
    ? 470 - (playerPosition / 100) * 440
    : 30 + (playerPosition / 100) * 440;
  const normalOpponentX = mirrored
    ? normalPlayerX + 30
    : normalPlayerX - 30;
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
  const shotVariant = toShotVariant(shotMode?.variant);
  const shotGoalLabel = shotVariant === 1
    ? 'TOP BINS'
    : shotVariant === 2
      ? 'CLINICAL'
      : shotVariant === 3
        ? 'BENDER'
        : shotVariant === 4
          ? 'SCREAMER'
          : 'GOAL';
  const shotSaveLabel = shotVariant === 1 ? 'DENIED' : shotVariant === 2 ? 'STOPPED' : 'SAVED';
  const shotMissLabel = shotVariant === 1 ? 'OFF TARGET' : shotVariant === 2 ? 'HIT POST' : 'MISS';
  // Ball origin — captured at shot start so it doesn't shift when positions reset
  const shotBallOriginX = isShot ? shotMode.ballOriginX : normalBallX;
  const shotBallOriginY = 145; // Below shooter's feet (avatar at 115 + radius 28 + ball offset)

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

  // Keeper jolt direction (away from goal) — enhanced amplitude for cinematic feel
  const keeperJolt = { x: [0, -8 * goal.inward, 4 * goal.inward, 0], y: [0, -6, -2, 0] };
  const ballTarget = useMemo(() => {
    if (isGoal) return { x: goal.goalTarget.x, y: goal.goalTarget.y - 8 };
    if (isSave) return { x: goal.saveTarget.x - 10 * goal.inward, y: goal.saveTarget.y + 5 };
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
    if (isPenalty) return { x: goal.penSpotX, y: 105 };
    // During shot pending, position ball between shooter and goal
    if (isShot && shotMode.result === 'pending') {
      return {
        x: (shotBallOriginX + goal.goalLineX) / 2,
        y: 115
      };
    }
    // Position ball at the boundary between blue and red zones
    return { x: mirrored ? (470 - (playerPosition / 100) * 455) : (15 + (playerPosition / 100) * 455), y: 112 };
  }, [isGoal, isSave, isShotGoal, isShotSave, isShotMiss, isPenalty, isShot, shotMode, shotVariant, goal, shotBallOriginX, shotBallOriginY, playerPosition, mirrored]);
  const ballTransition = useMemo(() => {
    if (isGoal) return { duration: 0.4, ease: [0.2, 0, 0.4, 1] as const };
    if (isSave) return { duration: 0.5, ease: [0.3, 0, 0.2, 1] as const };
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
  }, [isGoal, isSave, isShotGoal, isShotSave, isShotMiss, shotVariant]);
  const ballOpacity = isShotMiss ? 0.3 : 1;

  return (
    <div className={isPortrait ? 'h-full flex justify-center' : 'w-full px-3'}>
      <div className={`relative rounded-2xl overflow-hidden border-2 border-emerald-900/60 border-b-4 border-b-emerald-950/80 ${isPortrait ? 'h-full aspect-[23/50]' : ''}`}>
        {/* Camera zoom wrapper — field container stays anchored, SVG zooms inside */}
        <motion.div
          animate={zoomToGoal ? {
            scale: 1.8,
            x: '0%',
            y: '0%',
          } : {
            scale: 1,
            x: '0%',
            y: '0%',
          }}
          transition={{ duration: 0.5, ease: [0.4, 0, 0.2, 1] }}
          style={{ transformOrigin: zoomOrigin, ...(isPortrait ? { height: '100%' } : {}) }}
        >
        <svg
          viewBox={isPortrait ? '0 0 230 500' : '0 0 500 230'}
          className={isPortrait ? 'w-full h-full' : 'w-full h-auto'}
        >
          <defs>
            <linearGradient id={uid('pitchGrad')} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#1e5c32" />
              <stop offset="50%" stopColor="#1a472a" />
              <stop offset="100%" stopColor="#143820" />
            </linearGradient>
            <pattern id={uid('grassStripes')} x="0" y="0" width="60" height="230" patternUnits="userSpaceOnUse">
              <rect x="0" y="0" width="30" height="230" fill="rgba(255,255,255,0.015)" />
            </pattern>
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

          {/* Field background */}
          <rect x="0" y="0" width="500" height="230" rx="12" fill={`url(#${uid('pitchGrad')})`} />
          <rect x="0" y="0" width="500" height="230" rx="12" fill={`url(#${uid('grassStripes')})`} />

          {/* Zone bands — hidden during penalties */}
          {!isPenalty && (
            <>
              {zoneBands.map((z, i) => (
                <rect key={i} x={z.x} y="0" width={z.w} height="230" fill={z.fill} rx={z.rx} />
              ))}
            </>
          )}

          {/* Pitch markings */}
          <rect x="15" y="15" width="470" height="200" rx="4" fill="none" stroke="rgba(255,255,255,0.15)" strokeWidth="1.5" />
          <line x1="250" y1="15" x2="250" y2="215" stroke="rgba(255,255,255,0.15)" strokeWidth="1.5" />
          <circle cx="250" cy="115" r="35" fill="none" stroke="rgba(255,255,255,0.15)" strokeWidth="1.5" />
          <circle cx="250" cy="115" r="3" fill="rgba(255,255,255,0.2)" />

          {/* Left penalty box */}
          <rect x="15" y="50" width="65" height="130" fill="none" stroke="rgba(255,255,255,0.12)" strokeWidth="1.2" rx="2" />
          <rect x="15" y="75" width="28" height="80" fill="none" stroke="rgba(255,255,255,0.12)" strokeWidth="1.2" rx="2" />
          <rect x="6" y="92" width="9" height="46" fill="none" stroke="rgba(255,255,255,0.25)" strokeWidth="2" rx="2" />

          {/* Right penalty box */}
          <rect x="420" y="50" width="65" height="130" fill="none" stroke="rgba(255,255,255,0.12)" strokeWidth="1.2" rx="2" />
          <rect x="457" y="75" width="28" height="80" fill="none" stroke="rgba(255,255,255,0.12)" strokeWidth="1.2" rx="2" />
          <rect x="485" y="92" width="9" height="46" fill="none" stroke="rgba(255,255,255,0.25)" strokeWidth="2" rx="2" />

          {/* Penalty spots */}
          <circle cx="60" cy="115" r="2" fill="rgba(255,255,255,0.15)" />
          <circle cx="440" cy="115" r="2" fill="rgba(255,255,255,0.15)" />


          {/* === Player avatars — ONLY shown during shots and penalties === */}
          {(isPenalty || isShot) && (
            <>
              {/* === Opponent marker === */}
              <PitchMarker
                x={opponentX} y={goal.penY}
                avatarUrl={opponentAvatarUrl}
                avatarAlt={opponentAvatarAlt}
                color="#FF4B4B" glowFilter={uid('redGlow')}
                isShooter={isPenalty ? !penaltyMode.isPlayerShooter : (isShot && shotMode ? !shotMode.isPlayerAttacker : false)}
                isKeeper={isPenalty ? penaltyMode.isPlayerShooter : (isShot && shotMode ? shotMode.isPlayerAttacker : false)}
                isSave={!!isSave || !!isShotSave} isGoal={!!isGoal || !!isShotGoal}
                showPenResult={!!showPenResult || !!shotResultActive} keeperJolt={keeperJolt}
                isPortrait={isPortrait}
                size={isShot ? 30 : 40}
              />

              {/* === Player marker === */}
              <PitchMarker
                x={playerX} y={goal.penY}
                avatarUrl={playerAvatarUrl}
                avatarAlt={playerAvatarAlt}
                color="#1CB0F6" glowFilter={uid('blueGlow')}
                isShooter={isPenalty ? penaltyMode.isPlayerShooter : (isShot && shotMode ? shotMode.isPlayerAttacker : false)}
                isKeeper={isPenalty ? !penaltyMode.isPlayerShooter : (isShot && shotMode ? !shotMode.isPlayerAttacker : false)}
                isSave={!!isSave || !!isShotSave} isGoal={!!isGoal || !!isShotGoal}
                showPenResult={!!showPenResult || !!shotResultActive} keeperJolt={keeperJolt}
                isPortrait={isPortrait}
                size={isShot ? 30 : 40}
              />
            </>
          )}

          {/* === Live Score Tracker Style — ONLY shown during normal gameplay === */}
          {!isPenalty && !isShot && (
            <>
              {/* Possession tracking visualization */}
              <g>
                {/* Main possession bar container */}
                <rect x="15" y="70" width="470" height="90" fill="rgba(0,0,0,0.2)" rx="6" />

                {/* Center line */}
                <line x1="250" y1="70" x2="250" y2="160" stroke="rgba(255,255,255,0.1)" strokeWidth="2" />

                {/* Player's possession fill (always from their defensive end) */}
                <motion.rect
                  x={mirrored ? 470 - (playerPosition / 100) * 455 : 15}
                  y="70"
                  width={(playerPosition / 100) * 455}
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
                  x={mirrored ? 15 : 15 + (playerPosition / 100) * 455}
                  y="70"
                  width={((100 - playerPosition) / 100) * 455}
                  height="90"
                  fill="#FF4B4B"
                  opacity="0.12"
                  rx="6"
                  animate={{
                    opacity: [0.08, 0.15, 0.08],
                  }}
                  transition={{ duration: 2.5, repeat: Infinity, ease: 'easeInOut', delay: 0.3 }}
                />

                {/* Player avatar (positioned close to white line on blue side) */}
                <motion.g
                  animate={{
                    x: mirrored ? (470 - (playerPosition / 100) * 455 + 35) : (15 + (playerPosition / 100) * 455 - 35),
                    scale: mirrored ? (playerPosition < 50 ? [1, 1.08, 1] : 1) : (playerPosition > 50 ? [1, 1.08, 1] : 1),
                  }}
                  transition={{
                    x: { type: 'spring', stiffness: 160, damping: 12, mass: 0.7 },
                    scale: { duration: 1.5, repeat: Infinity, ease: 'easeInOut' }
                  }}
                >
                  <circle
                    cx="0"
                    cy="115"
                    r="22"
                    fill="none"
                    stroke="#1CB0F6"
                    strokeWidth="2"
                  />
                  <g transform={isPortrait ? 'rotate(90, 0, 115)' : undefined}>
                    <foreignObject
                      x="-22"
                      y="93"
                      width="44"
                      height="44"
                    >
                      <div style={{ width: '100%', height: '100%', borderRadius: '50%', overflow: 'hidden' }}>
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={playerAvatarUrl} alt={playerAvatarAlt} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                      </div>
                    </foreignObject>
                  </g>
                </motion.g>

                {/* Opponent avatar (positioned close to white line on red side) */}
                <motion.g
                  animate={{
                    x: mirrored ? (470 - (playerPosition / 100) * 455 - 35) : (15 + (playerPosition / 100) * 455 + 35),
                    scale: mirrored ? (playerPosition > 50 ? [1, 1.08, 1] : 1) : (playerPosition < 50 ? [1, 1.08, 1] : 1),
                  }}
                  transition={{
                    x: { type: 'spring', stiffness: 160, damping: 12, mass: 0.7 },
                    scale: { duration: 1.5, repeat: Infinity, ease: 'easeInOut' }
                  }}
                >
                  <circle
                    cx="0"
                    cy="115"
                    r="22"
                    fill="none"
                    stroke="#FF4B4B"
                    strokeWidth="2"
                  />
                  <g transform={isPortrait ? 'rotate(90, 0, 115)' : undefined}>
                    <foreignObject
                      x="-22"
                      y="93"
                      width="44"
                      height="44"
                    >
                      <div style={{ width: '100%', height: '100%', borderRadius: '50%', overflow: 'hidden' }}>
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={opponentAvatarUrl} alt={opponentAvatarAlt} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                      </div>
                    </foreignObject>
                  </g>
                </motion.g>

                {/* Ball position indicator - positioned at boundary between blue/red zones */}
                <motion.g
                  animate={{ x: mirrored ? (470 - (playerPosition / 100) * 455) : (15 + (playerPosition / 100) * 455) }}
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

                {/* Possession percentages - counter-rotated in portrait */}
                <g transform={textTf(0, 0)}>
                  {/* Player possession % */}
                  <motion.text
                    x={mirrored ? (470 - (playerPosition / 100) * 455 + 35) : (15 + (playerPosition / 100) * 455 - 35)}
                    y="180"
                    textAnchor="middle"
                    fill="#1CB0F6"
                    fontSize="12"
                    fontWeight="900"
                    fontFamily="system-ui"
                    animate={{
                      x: mirrored ? (470 - (playerPosition / 100) * 455 + 35) : (15 + (playerPosition / 100) * 455 - 35),
                    }}
                    transition={{ type: 'spring', stiffness: 160, damping: 12, mass: 0.7 }}
                  >
                    {Math.round(playerPosition)}%
                  </motion.text>

                  {/* Opponent possession % */}
                  <motion.text
                    x={mirrored ? (470 - (playerPosition / 100) * 455 - 35) : (15 + (playerPosition / 100) * 455 + 35)}
                    y="180"
                    textAnchor="middle"
                    fill="#FF4B4B"
                    fontSize="12"
                    fontWeight="900"
                    fontFamily="system-ui"
                    animate={{
                      x: mirrored ? (470 - (playerPosition / 100) * 455 - 35) : (15 + (playerPosition / 100) * 455 + 35),
                    }}
                    transition={{ type: 'spring', stiffness: 160, damping: 12, mass: 0.7 }}
                  >
                    {Math.round(100 - playerPosition)}%
                  </motion.text>

                  {/* Player name */}
                  <motion.text
                    x={mirrored ? (470 - (playerPosition / 100) * 455 + 35) : (15 + (playerPosition / 100) * 455 - 35)}
                    y="195"
                    textAnchor="middle"
                    fill="rgba(255,255,255,0.7)"
                    fontSize="8"
                    fontWeight="700"
                    fontFamily="system-ui"
                    animate={{
                      x: mirrored ? (470 - (playerPosition / 100) * 455 + 35) : (15 + (playerPosition / 100) * 455 - 35),
                    }}
                    transition={{ type: 'spring', stiffness: 160, damping: 12, mass: 0.7 }}
                  >
                    {playerName || 'YOU'}
                  </motion.text>

                  {/* Opponent name */}
                  <motion.text
                    x={mirrored ? (470 - (playerPosition / 100) * 455 - 35) : (15 + (playerPosition / 100) * 455 + 35)}
                    y="195"
                    textAnchor="middle"
                    fill="rgba(255,255,255,0.7)"
                    fontSize="8"
                    fontWeight="700"
                    fontFamily="system-ui"
                    animate={{
                      x: mirrored ? (470 - (playerPosition / 100) * 455 - 35) : (15 + (playerPosition / 100) * 455 + 35),
                    }}
                    transition={{ type: 'spring', stiffness: 160, damping: 12, mass: 0.7 }}
                  >
                    {opponentName || 'OPPONENT'}
                  </motion.text>


                  {/* Zone indicator */}
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
          <motion.g
            key="ball"
            animate={{
              x: ballTarget.x,
              y: ballTarget.y,
              opacity: ballOpacity,
            }}
            transition={ballTransition}
          >
            <motion.circle  cx="0" cy="0" r="14" fill="rgba(255,255,255,0.1)" filter={`url(#${uid('ballGlow')})`} />
            <foreignObject x="-12" y="-12" width="24" height="24">
              <div style={ballEmojiStyle}>⚽</div>
            </foreignObject>
          </motion.g>

          {/* === Decorative overlays (net ripple, text) — separate AnimatePresence === */}
          <AnimatePresence>
            {/* Penalty goal: net ripple + GOAL text */}
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
                <motion.text
                  x={goal.goalTextX} y="82"
                  textAnchor="middle" fill="#58CC02" fontSize="8" fontWeight="900" fontFamily="system-ui"
                  initial={{ opacity: 0, y: 86 }}
                  animate={{ opacity: [0, 1, 1, 0], y: [86, 82, 82, 80] }}
                  transition={{ duration: 0.5, delay: 0.3, times: [0, 0.2, 0.7, 1] }}
                  transform={textTf(goal.goalTextX, 82)}
                >
                  GOAL
                </motion.text>
              </motion.g>
            )}
            {/* Penalty save: SAVED text */}
            {isSave && (
              <motion.g key="pen-save-decor">
                <motion.text
                  x={goal.goalLineX} y={goal.penY - 28}
                  textAnchor="middle" fill="#FF4B4B" fontSize="7" fontWeight="900" fontFamily="system-ui"
                  initial={{ opacity: 0, y: goal.penY - 24 }}
                  animate={{
                    opacity: [0, 1, 1, 0],
                    y: [goal.penY - 24, goal.penY - 28, goal.penY - 28, goal.penY - 30],
                  }}
                  transition={{ duration: 0.5, delay: 0.25, times: [0, 0.2, 0.7, 1] }}
                  transform={textTf(goal.goalLineX, goal.penY - 28)}
                >
                  SAVED
                </motion.text>
              </motion.g>
            )}
            {/* Shot goal: net ripple + GOAL text */}
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
                  transition={{ duration: 0.5, delay: 0.35 }}
                />
                <motion.text
                  x={goal.goalTextX} y="82"
                  textAnchor="middle" fill="#58CC02" fontSize="8" fontWeight="900" fontFamily="system-ui"
                  initial={{ opacity: 0, y: 86 }}
                  animate={{ opacity: [0, 1, 1, 0], y: [86, 82, 82, 80] }}
                  transition={{ duration: 0.6, delay: 0.25, times: [0, 0.2, 0.75, 1] }}
                  transform={textTf(goal.goalTextX, 82)}
                >
                  {shotGoalLabel}
                </motion.text>
              </motion.g>
            )}
            {/* Shot save: SAVED text */}
            {isShotSave && (
              <motion.g key="shot-save-decor">
                <motion.text
                  x={goal.goalLineX} y={goal.penY - 28}
                  textAnchor="middle" fill="#FF4B4B" fontSize="7" fontWeight="900" fontFamily="system-ui"
                  initial={{ opacity: 0, y: goal.penY - 24 }}
                  animate={{
                    opacity: [0, 1, 1, 0],
                    y: [goal.penY - 24, goal.penY - 28, goal.penY - 28, goal.penY - 30],
                  }}
                  transition={{ duration: 0.55, delay: 0.2, times: [0, 0.2, 0.75, 1] }}
                  transform={textTf(goal.goalLineX, goal.penY - 28)}
                >
                  {shotSaveLabel}
                </motion.text>
              </motion.g>
            )}
            {/* Shot miss: MISS text */}
            {isShotMiss && (
              <motion.g key="shot-miss-decor">
                <motion.text
                  x={goal.goalLineX - 20 * goal.inward} y={60}
                  textAnchor="middle" fill="rgba(255,255,255,0.4)" fontSize="7" fontWeight="900" fontFamily="system-ui"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: [0, 0.6, 0.6, 0] }}
                  transition={{ duration: 0.65, delay: 0.25, times: [0, 0.2, 0.75, 1] }}
                  transform={textTf(goal.goalLineX - 20 * goal.inward, 60)}
                >
                  {shotMissLabel}
                </motion.text>
              </motion.g>
            )}
          </AnimatePresence>


          </g>
        </svg>
        </motion.div>

        {/* Vignette overlay during camera zoom */}
        <AnimatePresence>
          {zoomToGoal && (
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
