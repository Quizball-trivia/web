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
}

function PitchMarker({
  x, y, avatarUrl, avatarAlt, color, glowFilter,
  isShooter, isKeeper, isSave, isGoal, showPenResult, keeperJolt,
  isPortrait = false,
}: PitchMarkerProps) {
  const joltAnim = isSave && isKeeper
    ? keeperJolt
    : isGoal && isShooter
      ? { y: [0, -4, 0] }
      : {};

  return (
    <motion.g
      animate={{ x, y }}
      transition={{ type: 'spring', stiffness: 150, damping: 14, mass: 0.8 }}
      filter={`url(#${glowFilter})`}
    >
      <motion.g animate={joltAnim} transition={{ duration: 0.5 }}>
        <g transform={isPortrait ? 'rotate(90)' : undefined}>
          {isShooter && !showPenResult && (
            <motion.circle
              cx="0" cy="0" r="28"
              fill="none" stroke={color} strokeWidth="1.5" opacity="0.4"
              animate={{ r: [28, 33, 28], opacity: [0.4, 0.15, 0.4] }}
              transition={{ duration: 1.5, repeat: Infinity, ease: 'easeInOut' }}
            />
          )}
          <circle cx="0" cy="0" r="22" fill="none" stroke={color} strokeWidth={isKeeper ? 3.5 : 2.5} />
          <foreignObject x="-20" y="-20" width="40" height="40">
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
}

/** Shot momentum threshold at which a shot on goal triggers */
const SHOT_VISUAL_THRESHOLD = 4;

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

export function PitchVisualization({
  playerPosition,
  playerAvatarUrl,
  opponentAvatarUrl,
  playerName,
  opponentName,
  myMomentum = 0,
  oppMomentum = 0,
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

  // Final positions (penalty overrides normal)
  const playerX = isPenalty
    ? (penaltyMode.isPlayerShooter ? goal.penSpotX : goal.goalLineX)
    : normalPlayerX;
  const opponentX = isPenalty
    ? (penaltyMode.isPlayerShooter ? goal.goalLineX : goal.penSpotX)
    : normalOpponentX;

  // Dual momentum meter (hidden during penalties/shots)
  const meterVisible = !isPenalty && !isShot;
  const myFillWidth = Math.min(125, (myMomentum / SHOT_VISUAL_THRESHOLD) * 125);
  const oppFillWidth = Math.min(125, (oppMomentum / SHOT_VISUAL_THRESHOLD) * 125);
  const maxMomentum = Math.max(myMomentum, oppMomentum);
  const shotLabelOpacity = Math.min(1, 0.15 + maxMomentum * 0.2);

  // Penalty result state
  const showPenResult = isPenalty && penaltyMode.phase === 'result' && penaltyMode.result;
  const isGoal = showPenResult && penaltyMode.result === 'goal';
  const isSave = showPenResult && penaltyMode.result === 'saved';

  // Shot result state
  const shotResultActive = isShot && shotMode.result !== 'pending';
  const isShotGoal = shotResultActive && shotMode.result === 'goal';
  const isShotSave = shotResultActive && shotMode.result === 'saved';
  const isShotMiss = shotResultActive && shotMode.result === 'miss';
  // Ball origin — captured at shot start so it doesn't shift when positions reset
  const shotBallOriginX = isShot ? shotMode.ballOriginX : normalBallX;
  const shotBallOriginY = 105;

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

  const zoneLabels = mirrored
    ? [
        { x: 450, text: 'DEF', fill: 'rgba(156,163,175,0.35)' },
        { x: 335, text: 'MID', fill: 'rgba(255,255,255,0.25)' },
        { x: 210, text: 'ATT', fill: 'rgba(255,150,0,0.35)' },
        { x: 72, text: 'BOX', fill: 'rgba(255,75,75,0.35)' },
      ]
    : [
        { x: 50, text: 'DEF', fill: 'rgba(156,163,175,0.35)' },
        { x: 165, text: 'MID', fill: 'rgba(255,255,255,0.25)' },
        { x: 290, text: 'ATT', fill: 'rgba(255,150,0,0.35)' },
        { x: 428, text: 'BOX', fill: 'rgba(255,75,75,0.35)' },
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
      return {
        x: [shotBallOriginX, (shotBallOriginX + goal.goalTarget.x) / 2, goal.goalTarget.x],
        y: [shotBallOriginY, shotBallOriginY - 25, goal.goalTarget.y - 8],
      };
    }
    if (isShotSave) {
      return {
        x: [shotBallOriginX, goal.goalLineX - 2 * goal.inward, goal.goalLineX - 12 * goal.inward],
        y: [shotBallOriginY, goal.penY - 10, goal.penY + 5],
      };
    }
    if (isShotMiss) {
      return {
        x: [shotBallOriginX, goal.goalLineX + 10 * goal.inward],
        y: [shotBallOriginY, 50],
      };
    }
    if (isPenalty) return { x: goal.penSpotX, y: 105 };
    return { x: normalBallX, y: 105 };
  }, [isGoal, isSave, isShotGoal, isShotSave, isShotMiss, isPenalty, goal, shotBallOriginX, shotBallOriginY, normalBallX]);
  const ballTransition = useMemo(() => {
    if (isGoal) return { duration: 0.4, ease: [0.2, 0, 0.4, 1] as const };
    if (isSave) return { duration: 0.5, ease: [0.3, 0, 0.2, 1] as const };
    if (isShotGoal) return { duration: 0.4, ease: [0.2, 0, 0.4, 1] as const };
    if (isShotSave) return { duration: 0.5, ease: [0.3, 0, 0.2, 1] as const, times: [0, 0.5, 1] };
    if (isShotMiss) return { duration: 0.5, ease: [0.2, 0, 0.6, 1] as const };
    return { type: 'spring' as const, stiffness: 160, damping: 12, mass: 0.7 };
  }, [isGoal, isSave, isShotGoal, isShotSave, isShotMiss]);
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

          {/* Zone labels — hidden during penalties, counter-rotated in portrait */}
          {!isPenalty && (
            <>
              {zoneLabels.map((l, i) => (
                <text key={i} x={l.x} y="28" fill={l.fill} fontSize="9" fontWeight="800" textAnchor="middle" fontFamily="system-ui" transform={textTf(l.x, 28)}>{l.text}</text>
              ))}
            </>
          )}

          {/* === Opponent marker === */}
          <PitchMarker
            x={opponentX} y={goal.penY}
            avatarUrl={opponentAvatarUrl}
            avatarAlt={opponentAvatarAlt}
            color="#FF4B4B" glowFilter={uid('redGlow')}
            isShooter={isPenalty && !penaltyMode.isPlayerShooter}
            isKeeper={isPenalty && penaltyMode.isPlayerShooter}
            isSave={!!isSave} isGoal={!!isGoal}
            showPenResult={!!showPenResult} keeperJolt={keeperJolt}
            isPortrait={isPortrait}
          />

          {/* === Player marker === */}
          <PitchMarker
            x={playerX} y={goal.penY}
            avatarUrl={playerAvatarUrl}
            avatarAlt={playerAvatarAlt}
            color="#1CB0F6" glowFilter={uid('blueGlow')}
            isShooter={isPenalty && penaltyMode.isPlayerShooter}
            isKeeper={isPenalty && !penaltyMode.isPlayerShooter}
            isSave={!!isSave} isGoal={!!isGoal}
            showPenResult={!!showPenResult} keeperJolt={keeperJolt}
            isPortrait={isPortrait}
          />

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
            <motion.circle cx="0" cy="0" r="14" fill="rgba(255,255,255,0.1)" filter={`url(#${uid('ballGlow')})`} />
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
                  transition={{ duration: 0.5, delay: 0.3, times: [0, 0.2, 0.7, 1] }}
                  transform={textTf(goal.goalTextX, 82)}
                >
                  GOAL
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
                  transition={{ duration: 0.5, delay: 0.25, times: [0, 0.2, 0.7, 1] }}
                  transform={textTf(goal.goalLineX, goal.penY - 28)}
                >
                  SAVED
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
                  transition={{ duration: 0.6, delay: 0.3, times: [0, 0.2, 0.7, 1] }}
                  transform={textTf(goal.goalLineX - 20 * goal.inward, 60)}
                >
                  MISS
                </motion.text>
              </motion.g>
            )}
          </AnimatePresence>

          {/* === DUAL MOMENTUM METER — hidden during penalties/shots === */}
          {meterVisible && (
            <g>
              {/* "SHOT" label at center — brightens as momentum builds, counter-rotated in portrait */}
              <motion.text
                x="250" y="30"
                textAnchor="middle" fill="rgba(255,255,255,1)" fontSize="7" fontWeight="900" fontFamily="system-ui"
                animate={{ opacity: shotLabelOpacity }}
                transform={textTf(250, 30)}
              >
                SHOT
              </motion.text>

              {/* Background bar */}
              <rect x="125" y="34" width="250" height="9" rx="4.5" fill="rgba(0,0,0,0.45)" stroke="rgba(255,255,255,0.1)" strokeWidth="0.8" />

              {/* Fills clipped to rounded bar shape */}
              <g clipPath={`url(#${uid('meterClip')})`}>
                {/* Player fill — blue, grows from left toward center */}
                <motion.rect
                  x="125" y="34" height="9"
                  fill="#1CB0F6"
                  initial={{ width: 0, scaleY: 1 }}
                  animate={{ width: myFillWidth, opacity: myMomentum > 0 ? 0.85 : 0.2, scaleY: 1 }}
                  transition={{ type: 'spring', stiffness: 250, damping: 15 }}
                />
                {/* Opponent fill — red, grows from right toward center */}
                <motion.rect
                  y="34" height="9"
                  fill="#FF4B4B"
                  initial={{ width: 0, x: 375, scaleY: 1 }}
                  animate={{ width: oppFillWidth, x: 375 - oppFillWidth, opacity: oppMomentum > 0 ? 0.85 : 0.2, scaleY: 1 }}
                  transition={{ type: 'spring', stiffness: 250, damping: 15 }}
                />
              </g>

              {/* Center divider — shot threshold line */}
              <line x1="250" y1="33" x2="250" y2="44" stroke="rgba(255,255,255,0.35)" strokeWidth="1.2" />

              {/* Pulse glow when player reaches threshold */}
              {myMomentum >= SHOT_VISUAL_THRESHOLD && (
                <motion.rect
                  x="125" y="34" width="125" height="9" rx="4.5"
                  fill="none" stroke="#1CB0F6" strokeWidth="1.5"
                  animate={{ opacity: [0.7, 0.25, 0.7] }}
                  transition={{ duration: 0.8, repeat: Infinity, ease: 'easeInOut' }}
                />
              )}

              {/* Pulse glow when opponent reaches threshold */}
              {oppMomentum >= SHOT_VISUAL_THRESHOLD && (
                <motion.rect
                  x="250" y="34" width="125" height="9" rx="4.5"
                  fill="none" stroke="#FF4B4B" strokeWidth="1.5"
                  animate={{ opacity: [0.7, 0.25, 0.7] }}
                  transition={{ duration: 0.8, repeat: Infinity, ease: 'easeInOut' }}
                />
              )}
            </g>
          )}

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
