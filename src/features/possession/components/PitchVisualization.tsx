'use client';

import { motion, AnimatePresence } from 'motion/react';

type GoalSide = 'left' | 'right';

// ─── Reusable marker sub-component for player/opponent avatars on the pitch ──
interface PitchMarkerProps {
  x: number;
  y: number;
  avatarUrl: string;
  clipId: string;
  color: string;
  glowFilter: string;
  isShooter: boolean;
  isKeeper: boolean;
  isSave: boolean;
  isGoal: boolean;
  showPenResult: boolean;
  keeperJolt: Record<string, number[]>;
}

function PitchMarker({
  x, y, avatarUrl, clipId, color, glowFilter,
  isShooter, isKeeper, isSave, isGoal, showPenResult, keeperJolt,
}: PitchMarkerProps) {
  const joltAnim = isSave && isKeeper
    ? keeperJolt
    : isGoal && isShooter
      ? { y: [0, -4, 0] }
      : {};

  return (
    <motion.g
      animate={{ x, y }}
      transition={{ type: 'spring', stiffness: 120, damping: 20 }}
      filter={`url(#${glowFilter})`}
    >
      <motion.g animate={joltAnim} transition={{ duration: 0.35 }}>
        {isShooter && !showPenResult && (
          <motion.circle
            cx="0" cy="0" r="22"
            fill="none" stroke={color} strokeWidth="1.5" opacity="0.4"
            animate={{ r: [22, 26, 22], opacity: [0.4, 0.15, 0.4] }}
            transition={{ duration: 1.5, repeat: Infinity, ease: 'easeInOut' }}
          />
        )}
        <circle cx="0" cy="0" r="18" fill="none" stroke={color} strokeWidth={isKeeper ? 3.5 : 2.5} />
        <clipPath id={clipId}><circle cx="0" cy="0" r="16" /></clipPath>
        <image href={avatarUrl} x="-16" y="-16" width="32" height="32" clipPath={`url(#${clipId})`} />
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
}

export function PitchVisualization({
  playerPosition,
  playerAvatarUrl,
  opponentAvatarUrl,
  myMomentum = 0,
  oppMomentum = 0,
  penaltyMode,
  shotMode,
  zoomToGoal,
  mirrored = false,
  targetGoal,
  ballOnPlayer = true,
}: PitchVisualizationProps) {
  const isPenalty = !!penaltyMode;
  const isShot = !!shotMode;

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

  // Camera zoom direction
  const zoomOrigin = targetGoal === 'left' ? 'left center' : 'right center';
  const vignetteGradient = targetGoal === 'left'
    ? 'radial-gradient(ellipse at 20% 50%, transparent 35%, rgba(0,0,0,0.35) 100%)'
    : 'radial-gradient(ellipse at 80% 50%, transparent 35%, rgba(0,0,0,0.35) 100%)';

  // Keeper jolt direction (away from goal)
  const keeperJolt = { x: [0, -5 * goal.inward, 3 * goal.inward, 0], y: [0, -3, -1, 0] };

  return (
    <div className="w-full px-3">
      <div className="relative rounded-2xl overflow-hidden border-2 border-emerald-900/60 border-b-4 border-b-emerald-950/80">
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
          style={{ transformOrigin: zoomOrigin }}
        >
        <svg
          viewBox="0 0 500 230"
          className="w-full h-auto"
        >
          <defs>
            <linearGradient id="pitchGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#1e5c32" />
              <stop offset="50%" stopColor="#1a472a" />
              <stop offset="100%" stopColor="#143820" />
            </linearGradient>
            <pattern id="grassStripes" x="0" y="0" width="60" height="230" patternUnits="userSpaceOnUse">
              <rect x="0" y="0" width="30" height="230" fill="rgba(255,255,255,0.015)" />
            </pattern>
            <filter id="blueGlow" x="-50%" y="-50%" width="200%" height="200%">
              <feGaussianBlur stdDeviation="4" result="blur" />
              <feFlood floodColor="#1CB0F6" floodOpacity="0.5" result="color" />
              <feComposite in="color" in2="blur" operator="in" result="glow" />
              <feMerge><feMergeNode in="glow" /><feMergeNode in="SourceGraphic" /></feMerge>
            </filter>
            <filter id="redGlow" x="-50%" y="-50%" width="200%" height="200%">
              <feGaussianBlur stdDeviation="4" result="blur" />
              <feFlood floodColor="#FF4B4B" floodOpacity="0.5" result="color" />
              <feComposite in="color" in2="blur" operator="in" result="glow" />
              <feMerge><feMergeNode in="glow" /><feMergeNode in="SourceGraphic" /></feMerge>
            </filter>
            <filter id="ballGlow" x="-50%" y="-50%" width="200%" height="200%">
              <feGaussianBlur stdDeviation="3" result="blur" />
              <feFlood floodColor="#ffffff" floodOpacity="0.6" result="color" />
              <feComposite in="color" in2="blur" operator="in" result="glow" />
              <feMerge><feMergeNode in="glow" /><feMergeNode in="SourceGraphic" /></feMerge>
            </filter>
            {/* Dual momentum meter clip */}
            <clipPath id="meterClip">
              <rect x="125" y="34" width="250" height="9" rx="4.5" />
            </clipPath>
            {/* Goal net pattern (penalty only) */}
            <pattern id="penNet" x="0" y="0" width="6" height="6" patternUnits="userSpaceOnUse">
              <line x1="0" y1="0" x2="0" y2="6" stroke="rgba(255,255,255,0.12)" strokeWidth="0.4" />
              <line x1="0" y1="0" x2="6" y2="0" stroke="rgba(255,255,255,0.12)" strokeWidth="0.4" />
            </pattern>
          </defs>

          {/* Field background */}
          <rect x="0" y="0" width="500" height="230" rx="12" fill="url(#pitchGrad)" />
          <rect x="0" y="0" width="500" height="230" rx="12" fill="url(#grassStripes)" />

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

          {/* Zone labels — hidden during penalties */}
          {!isPenalty && (
            <>
              {zoneLabels.map((l, i) => (
                <text key={i} x={l.x} y="28" fill={l.fill} fontSize="9" fontWeight="800" textAnchor="middle" fontFamily="system-ui">{l.text}</text>
              ))}
            </>
          )}

          {/* === Opponent marker === */}
          <PitchMarker
            x={opponentX} y={goal.penY}
            avatarUrl={opponentAvatarUrl} clipId="oppClipInst"
            color="#FF4B4B" glowFilter="redGlow"
            isShooter={isPenalty && !penaltyMode.isPlayerShooter}
            isKeeper={isPenalty && penaltyMode.isPlayerShooter}
            isSave={isSave} isGoal={isGoal}
            showPenResult={showPenResult} keeperJolt={keeperJolt}
          />

          {/* === Player marker === */}
          <PitchMarker
            x={playerX} y={goal.penY}
            avatarUrl={playerAvatarUrl} clipId="playerClipInst"
            color="#1CB0F6" glowFilter="blueGlow"
            isShooter={isPenalty && penaltyMode.isPlayerShooter}
            isKeeper={isPenalty && !penaltyMode.isPlayerShooter}
            isSave={isSave} isGoal={isGoal}
            showPenResult={showPenResult} keeperJolt={keeperJolt}
          />

          {/* === DUAL MOMENTUM METER — hidden during penalties/shots === */}
          {meterVisible && (
            <g>
              {/* "SHOT" label at center — brightens as momentum builds */}
              <motion.text
                x="250" y="30"
                textAnchor="middle" fill="rgba(255,255,255,1)" fontSize="7" fontWeight="900" fontFamily="system-ui"
                animate={{ opacity: shotLabelOpacity }}
              >
                SHOT
              </motion.text>

              {/* Background bar */}
              <rect x="125" y="34" width="250" height="9" rx="4.5" fill="rgba(0,0,0,0.45)" stroke="rgba(255,255,255,0.1)" strokeWidth="0.8" />

              {/* Fills clipped to rounded bar shape */}
              <g clipPath="url(#meterClip)">
                {/* Player fill — blue, grows from left toward center */}
                <motion.rect
                  x="125" y="34" height="9"
                  fill="#1CB0F6"
                  initial={{ width: 0 }}
                  animate={{ width: myFillWidth, opacity: myMomentum > 0 ? 0.85 : 0.2 }}
                  transition={{ type: 'spring', stiffness: 300, damping: 25 }}
                />
                {/* Opponent fill — red, grows from right toward center */}
                <motion.rect
                  y="34" height="9"
                  fill="#FF4B4B"
                  initial={{ width: 0, x: 375 }}
                  animate={{ width: oppFillWidth, x: 375 - oppFillWidth, opacity: oppMomentum > 0 ? 0.85 : 0.2 }}
                  transition={{ type: 'spring', stiffness: 300, damping: 25 }}
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

          {/* === Normal ball (hidden during penalty result or shot result) === */}
          <AnimatePresence>
            {(!isPenalty || penaltyMode.phase !== 'result') && !shotResultActive && (
              <motion.g
                key="normal-ball"
                animate={{ x: isPenalty ? goal.penSpotX : normalBallX, y: 105 }}
                exit={{ opacity: 0, transition: { duration: 0.1 } }}
                transition={{ type: 'spring', stiffness: 140, damping: 18 }}
              >
                <motion.circle cx="0" cy="0" r="14" fill="rgba(255,255,255,0.1)" filter="url(#ballGlow)" />
                <foreignObject x="-12" y="-12" width="24" height="24">
                  <div style={{ fontSize: '20px', lineHeight: '24px', textAlign: 'center' }}>⚽</div>
                </foreignObject>
              </motion.g>
            )}
          </AnimatePresence>

          {/* === Penalty result: ball travels to goal === */}
          {isGoal && (
            <motion.g key="pen-goal-ball">
              {/* Ball flies into goal */}
              <motion.g
                initial={{ x: goal.penSpotX, y: 105 }}
                animate={{ x: goal.goalTarget.x, y: goal.goalTarget.y - 8 }}
                transition={{ duration: 0.4, ease: [0.2, 0, 0.4, 1] }}
              >
                <motion.circle cx="0" cy="0" r="14" fill="rgba(255,255,255,0.1)" filter="url(#ballGlow)" />
                <foreignObject x="-12" y="-12" width="24" height="24">
                  <div style={{ fontSize: '20px', lineHeight: '24px', textAlign: 'center' }}>⚽</div>
                </foreignObject>
              </motion.g>
              {/* Net ripple */}
              <motion.rect
                x={goal.netX} y="92" width="9" height="46" rx="1"
                fill="url(#penNet)"
                initial={{ opacity: 0 }}
                animate={{
                  opacity: [0, 0.8, 0.4, 0],
                  x: [goal.netX, goal.netX + 2 * goal.inward, goal.netX + goal.inward, goal.netX],
                }}
                transition={{ duration: 0.5, delay: 0.35 }}
              />
              {/* Small "GOAL" text near goal mouth */}
              <motion.text
                x={goal.goalTextX} y="82"
                textAnchor="middle" fill="#58CC02" fontSize="8" fontWeight="900" fontFamily="system-ui"
                initial={{ opacity: 0, y: 86 }}
                animate={{ opacity: [0, 1, 1, 0], y: [86, 82, 82, 80] }}
                transition={{ duration: 0.5, delay: 0.3, times: [0, 0.2, 0.7, 1] }}
              >
                GOAL
              </motion.text>
            </motion.g>
          )}

          {/* === Penalty result: ball saved by keeper === */}
          {isSave && (
            <motion.g key="pen-save-ball">
              {/* Ball travels toward goal, stops at keeper */}
              <motion.g
                initial={{ x: goal.penSpotX, y: 105 }}
                animate={{
                  x: [goal.penSpotX, goal.saveTarget.x, goal.saveTarget.x - 10 * goal.inward],
                  y: [105, goal.saveTarget.y - 10, goal.saveTarget.y + 5],
                }}
                transition={{ duration: 0.5, ease: [0.3, 0, 0.2, 1], times: [0, 0.5, 1] }}
              >
                <motion.circle cx="0" cy="0" r="14" fill="rgba(255,255,255,0.1)" filter="url(#ballGlow)" />
                <foreignObject x="-12" y="-12" width="24" height="24">
                  <div style={{ fontSize: '20px', lineHeight: '24px', textAlign: 'center' }}>⚽</div>
                </foreignObject>
              </motion.g>
              {/* Small "SAVED" text near keeper */}
              <motion.text
                x={goal.goalLineX} y={goal.penY - 28}
                textAnchor="middle" fill="#FF4B4B" fontSize="7" fontWeight="900" fontFamily="system-ui"
                initial={{ opacity: 0, y: goal.penY - 24 }}
                animate={{
                  opacity: [0, 1, 1, 0],
                  y: [goal.penY - 24, goal.penY - 28, goal.penY - 28, goal.penY - 30],
                }}
                transition={{ duration: 0.5, delay: 0.25, times: [0, 0.2, 0.7, 1] }}
              >
                SAVED
              </motion.text>
            </motion.g>
          )}

          {/* === Shot result: GOAL — ball into net === */}
          {isShotGoal && (
            <motion.g key="shot-goal-ball">
              <motion.g
                initial={{ x: shotBallOriginX, y: shotBallOriginY }}
                animate={{ x: goal.goalTarget.x, y: goal.goalTarget.y - 8 }}
                transition={{ duration: 0.4, ease: [0.2, 0, 0.4, 1] }}
              >
                <motion.circle cx="0" cy="0" r="14" fill="rgba(255,255,255,0.1)" filter="url(#ballGlow)" />
                <foreignObject x="-12" y="-12" width="24" height="24">
                  <div style={{ fontSize: '20px', lineHeight: '24px', textAlign: 'center' }}>⚽</div>
                </foreignObject>
              </motion.g>
              {/* Net ripple */}
              <motion.rect
                x={goal.netX} y="92" width="9" height="46" rx="1"
                fill="url(#penNet)"
                initial={{ opacity: 0 }}
                animate={{
                  opacity: [0, 0.8, 0.4, 0],
                  x: [goal.netX, goal.netX + 2 * goal.inward, goal.netX + goal.inward, goal.netX],
                }}
                transition={{ duration: 0.5, delay: 0.35 }}
              />
              {/* "GOAL" text near goal */}
              <motion.text
                x={goal.goalTextX} y="82"
                textAnchor="middle" fill="#58CC02" fontSize="8" fontWeight="900" fontFamily="system-ui"
                initial={{ opacity: 0, y: 86 }}
                animate={{ opacity: [0, 1, 1, 0], y: [86, 82, 82, 80] }}
                transition={{ duration: 0.5, delay: 0.3, times: [0, 0.2, 0.7, 1] }}
              >
                GOAL
              </motion.text>
            </motion.g>
          )}

          {/* === Shot result: SAVED — ball deflected by keeper === */}
          {isShotSave && (
            <motion.g key="shot-save-ball">
              <motion.g
                initial={{ x: shotBallOriginX, y: shotBallOriginY }}
                animate={{
                  x: [shotBallOriginX, goal.goalLineX - 2 * goal.inward, goal.goalLineX - 12 * goal.inward],
                  y: [shotBallOriginY, goal.penY - 10, goal.penY + 5],
                }}
                transition={{ duration: 0.5, ease: [0.3, 0, 0.2, 1], times: [0, 0.5, 1] }}
              >
                <motion.circle cx="0" cy="0" r="14" fill="rgba(255,255,255,0.1)" filter="url(#ballGlow)" />
                <foreignObject x="-12" y="-12" width="24" height="24">
                  <div style={{ fontSize: '20px', lineHeight: '24px', textAlign: 'center' }}>⚽</div>
                </foreignObject>
              </motion.g>
              {/* "SAVED" text near keeper */}
              <motion.text
                x={goal.goalLineX} y={goal.penY - 28}
                textAnchor="middle" fill="#FF4B4B" fontSize="7" fontWeight="900" fontFamily="system-ui"
                initial={{ opacity: 0, y: goal.penY - 24 }}
                animate={{
                  opacity: [0, 1, 1, 0],
                  y: [goal.penY - 24, goal.penY - 28, goal.penY - 28, goal.penY - 30],
                }}
                transition={{ duration: 0.5, delay: 0.25, times: [0, 0.2, 0.7, 1] }}
              >
                SAVED
              </motion.text>
            </motion.g>
          )}

          {/* === Shot result: MISS — ball goes wide === */}
          {isShotMiss && (
            <motion.g key="shot-miss-ball">
              <motion.g
                initial={{ x: shotBallOriginX, y: shotBallOriginY }}
                animate={{
                  x: [shotBallOriginX, goal.goalLineX + 10 * goal.inward],
                  y: [shotBallOriginY, 50],
                  opacity: [1, 1, 0.3],
                }}
                transition={{ duration: 0.5, ease: [0.2, 0, 0.6, 1] }}
              >
                <motion.circle cx="0" cy="0" r="14" fill="rgba(255,255,255,0.1)" filter="url(#ballGlow)" />
                <foreignObject x="-12" y="-12" width="24" height="24">
                  <div style={{ fontSize: '20px', lineHeight: '24px', textAlign: 'center' }}>⚽</div>
                </foreignObject>
              </motion.g>
              {/* Subtle "MISS" text */}
              <motion.text
                x={goal.goalLineX - 20 * goal.inward} y={60}
                textAnchor="middle" fill="rgba(255,255,255,0.4)" fontSize="7" fontWeight="900" fontFamily="system-ui"
                initial={{ opacity: 0 }}
                animate={{ opacity: [0, 0.6, 0.6, 0] }}
                transition={{ duration: 0.6, delay: 0.3, times: [0, 0.2, 0.7, 1] }}
              >
                MISS
              </motion.text>
            </motion.g>
          )}
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
