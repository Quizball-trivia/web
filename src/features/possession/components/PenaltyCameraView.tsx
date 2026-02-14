'use client';

import { useId } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { PitchVisualization } from './PitchVisualization';

interface PenaltyCameraViewProps {
  playerAvatarUrl: string;
  opponentAvatarUrl: string;
  shooterAvatarUrl: string;
  defenderAvatarUrl: string;
  shooterName: string;
  defenderName: string;
  isPlayerShooter: boolean;
  result: 'goal' | 'saved' | null;
  phase: 'setup' | 'playing' | 'result';
  playerPosition: number;
}

// Ball positions in the SVG coordinate space
const BALL_START = { x: 440, y: 115 };
const GOAL_TARGET = { x: 490, y: 107 }; // Inside the net
const SAVE_TARGET = { x: 478, y: 112 }; // Where keeper catches it
const KEEPER_POS = { x: 485, y: 115 };
const SHOOTER_POS = { x: 400, y: 115 };

export function PenaltyCameraView({
  playerAvatarUrl,
  opponentAvatarUrl,
  shooterAvatarUrl,
  defenderAvatarUrl,
  shooterName,
  defenderName,
  isPlayerShooter,
  result,
  phase,
  playerPosition,
}: PenaltyCameraViewProps) {
  const uid = useId();
  const kClipId = `kClip-${uid}`;
  const sClipId = `sClip-${uid}`;
  const glowShooterId = `penGlowShooter-${uid}`;
  const glowKeeperId = `penGlowKeeper-${uid}`;
  const netPatternId = `penaltyNet-${uid}`;

  const shooterColor = isPlayerShooter ? '#1CB0F6' : '#FF4B4B';
  const keeperColor = isPlayerShooter ? '#FF4B4B' : '#1CB0F6';

  return (
    <div className="fixed inset-0 z-50 bg-[#0a0e1a] overflow-hidden">
      {/* Zoomed pitch — reuses the existing field */}
      <motion.div
        initial={{ transform: 'translateX(0%) scale(1)' }}
        animate={{ transform: 'translateX(-35%) scale(2.5)' }}
        transition={{ duration: 0.8, ease: [0.4, 0, 0.2, 1] }}
        className="absolute inset-0 flex items-center justify-center"
      >
        <div className="w-full max-w-2xl">
          <PitchVisualization
            playerPosition={playerPosition}
            playerAvatarUrl={playerAvatarUrl}
            opponentAvatarUrl={opponentAvatarUrl}
            myMomentum={0}
            oppMomentum={0}
          />
        </div>

        {/* Edge blur — dims non-penalty areas */}
        <div className="absolute inset-0 pointer-events-none">
          <div
            className="absolute top-0 left-0 bottom-0 right-1/3 backdrop-blur-md"
            style={{ background: 'linear-gradient(to right, rgba(10,14,26,0.7), transparent)' }}
          />
          <div
            className="absolute top-0 left-0 right-0 h-1/4 backdrop-blur-sm"
            style={{ background: 'linear-gradient(to bottom, rgba(10,14,26,0.6), transparent)' }}
          />
          <div
            className="absolute bottom-0 left-0 right-0 h-1/4 backdrop-blur-sm"
            style={{ background: 'linear-gradient(to top, rgba(10,14,26,0.6), transparent)' }}
          />
        </div>
      </motion.div>

      {/* ─── Penalty scene overlay (SVG, matches pitch coordinate space) ─── */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
        <svg
          viewBox="0 0 500 230"
          className="w-full max-w-2xl h-auto"
          style={{ transform: 'translateX(-35%) scale(2.5)' }}
        >
          <defs>
            <filter id={glowShooterId} x="-50%" y="-50%" width="200%" height="200%">
              <feGaussianBlur stdDeviation="3" />
              <feFlood floodColor={shooterColor} floodOpacity="0.7" />
              <feComposite in2="SourceAlpha" operator="in" />
              <feMerge>
                <feMergeNode />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
            <filter id={glowKeeperId} x="-50%" y="-50%" width="200%" height="200%">
              <feGaussianBlur stdDeviation="3" />
              <feFlood floodColor={keeperColor} floodOpacity="0.7" />
              <feComposite in2="SourceAlpha" operator="in" />
              <feMerge>
                <feMergeNode />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
            {/* Goal net pattern */}
            <pattern id={netPatternId} x="0" y="0" width="6" height="6" patternUnits="userSpaceOnUse">
              <line x1="0" y1="0" x2="0" y2="6" stroke="rgba(255,255,255,0.12)" strokeWidth="0.4" />
              <line x1="0" y1="0" x2="6" y2="0" stroke="rgba(255,255,255,0.12)" strokeWidth="0.4" />
            </pattern>
          </defs>

          {/* ── Goalkeeper ── */}
          <motion.g
            initial={{ y: -8, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.4, type: 'spring', stiffness: 150 }}
          >
            <ellipse cx={KEEPER_POS.x} cy={KEEPER_POS.y + 5} rx="10" ry="4" fill="rgba(0,0,0,0.3)" />
            <motion.g
              animate={
                phase === 'result' && result === 'saved'
                  ? { x: [0, -6, 4, 0], y: [0, -4, -2, 0] }
                  : {}
              }
              transition={{ duration: 0.35 }}
            >
              <circle cx={KEEPER_POS.x} cy={KEEPER_POS.y} r="13" fill="none" stroke={keeperColor} strokeWidth="2" filter={`url(#${glowKeeperId})`} />
              <clipPath id={kClipId}><circle cx={KEEPER_POS.x} cy={KEEPER_POS.y} r="11" /></clipPath>
              <image href={defenderAvatarUrl} x={KEEPER_POS.x - 11} y={KEEPER_POS.y - 11} width="22" height="22" clipPath={`url(#${kClipId})`} />
            </motion.g>
            <text x={KEEPER_POS.x} y={KEEPER_POS.y + 18} textAnchor="middle" fill="rgba(255,255,255,0.85)" fontSize="5" fontWeight="800" fontFamily="system-ui">{defenderName}</text>
          </motion.g>

          {/* ── Shooter ── */}
          <motion.g
            initial={{ y: 8, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.45, type: 'spring', stiffness: 150 }}
          >
            <ellipse cx={SHOOTER_POS.x} cy={SHOOTER_POS.y + 5} rx="10" ry="4" fill="rgba(0,0,0,0.3)" />
            <motion.g
              animate={
                phase === 'result' && result === 'goal'
                  ? { y: [0, -4, 0] }
                  : {}
              }
              transition={{ duration: 0.35 }}
            >
              <circle cx={SHOOTER_POS.x} cy={SHOOTER_POS.y} r="13" fill="none" stroke={shooterColor} strokeWidth="2" filter={`url(#${glowShooterId})`} />
              <clipPath id={sClipId}><circle cx={SHOOTER_POS.x} cy={SHOOTER_POS.y} r="11" /></clipPath>
              <image href={shooterAvatarUrl} x={SHOOTER_POS.x - 11} y={SHOOTER_POS.y - 11} width="22" height="22" clipPath={`url(#${sClipId})`} />
            </motion.g>
            <text x={SHOOTER_POS.x} y={SHOOTER_POS.y + 18} textAnchor="middle" fill="rgba(255,255,255,0.85)" fontSize="5" fontWeight="800" fontFamily="system-ui">{shooterName}</text>
          </motion.g>

          {/* ── Static ball (before result, or fallback if result is null) ── */}
          <AnimatePresence>
            {(phase !== 'result' || result === null) && (
              <motion.g
                initial={{ scale: 0, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ opacity: 0, transition: { duration: 0.1 } }}
                transition={{ delay: 0.5, type: 'spring', stiffness: 200 }}
              >
                <ellipse cx={BALL_START.x} cy={BALL_START.y + 3} rx="5" ry="2.5" fill="rgba(0,0,0,0.35)" />
                <motion.circle
                  cx={BALL_START.x} cy={BALL_START.y} r="4.5"
                  fill="white" stroke="rgba(0,0,0,0.12)" strokeWidth="0.4"
                  animate={{ scale: [1, 1.04, 1] }}
                  transition={{ duration: 1.5, repeat: Infinity, ease: 'easeInOut' }}
                />
              </motion.g>
            )}
          </AnimatePresence>

          {/* ── Ball travel → GOAL ── */}
          <AnimatePresence>
            {phase === 'result' && result === 'goal' && (
              <motion.g>
                {/* Ball travels from penalty spot into the net */}
                <motion.circle
                  cx={BALL_START.x} cy={BALL_START.y} r="4.5"
                  fill="white" stroke="rgba(0,0,0,0.12)" strokeWidth="0.4"
                  animate={{
                    cx: [BALL_START.x, GOAL_TARGET.x],
                    cy: [BALL_START.y, GOAL_TARGET.y],
                    scale: [1, 0.85],
                  }}
                  transition={{ duration: 0.4, ease: [0.2, 0, 0.4, 1] }}
                />
                {/* Ball shadow follows */}
                <motion.ellipse
                  cx={BALL_START.x} cy={BALL_START.y + 3}
                  rx="5" ry="2.5" fill="rgba(0,0,0,0.25)"
                  animate={{
                    cx: [BALL_START.x, GOAL_TARGET.x],
                    cy: [BALL_START.y + 3, GOAL_TARGET.y + 2],
                    opacity: [0.35, 0],
                  }}
                  transition={{ duration: 0.4, ease: [0.2, 0, 0.4, 1] }}
                />

                {/* Net ripple — brief flash inside the goal area */}
                <motion.rect
                  x="479" y="93" width="14" height="44" rx="1"
                  fill={`url(#${netPatternId})`}
                  initial={{ opacity: 0, x: 479 }}
                  animate={{
                    opacity: [0, 0.8, 0.4, 0],
                    x: [479, 481, 480, 479],
                  }}
                  transition={{ duration: 0.5, delay: 0.35 }}
                />

                {/* Contextual "GOAL" label — near goal mouth, offset above */}
                <motion.text
                  x="490" y="82"
                  textAnchor="middle"
                  fill="#58CC02"
                  fontSize="8"
                  fontWeight="900"
                  fontFamily="system-ui"
                  initial={{ opacity: 0, y: 86 }}
                  animate={{ opacity: [0, 1, 1, 0], y: [86, 82, 82, 80] }}
                  transition={{ duration: 0.5, delay: 0.3, times: [0, 0.2, 0.7, 1] }}
                >
                  GOAL
                </motion.text>
              </motion.g>
            )}
          </AnimatePresence>

          {/* ── Ball travel → SAVED ── */}
          <AnimatePresence>
            {phase === 'result' && result === 'saved' && (
              <motion.g>
                {/* Ball travels toward goal then stops at keeper */}
                <motion.circle
                  cx={BALL_START.x} cy={BALL_START.y} r="4.5"
                  fill="white" stroke="rgba(0,0,0,0.12)" strokeWidth="0.4"
                  animate={{
                    cx: [BALL_START.x, SAVE_TARGET.x, SAVE_TARGET.x - 6],
                    cy: [BALL_START.y, SAVE_TARGET.y, SAVE_TARGET.y + 8],
                    scale: [1, 0.9, 0.75],
                    opacity: [1, 1, 0.6],
                  }}
                  transition={{ duration: 0.5, ease: [0.3, 0, 0.2, 1], times: [0, 0.5, 1] }}
                />

                {/* Contextual "SAVED" label — near keeper, offset right */}
                <motion.text
                  x={KEEPER_POS.x + 2} y={KEEPER_POS.y - 20}
                  textAnchor="middle"
                  fill="#FF4B4B"
                  fontSize="7"
                  fontWeight="900"
                  fontFamily="system-ui"
                  initial={{ opacity: 0, y: KEEPER_POS.y - 16 }}
                  animate={{
                    opacity: [0, 1, 1, 0],
                    y: [KEEPER_POS.y - 16, KEEPER_POS.y - 20, KEEPER_POS.y - 20, KEEPER_POS.y - 22],
                  }}
                  transition={{ duration: 0.5, delay: 0.25, times: [0, 0.2, 0.7, 1] }}
                >
                  SAVED
                </motion.text>
              </motion.g>
            )}
          </AnimatePresence>
        </svg>
      </div>

      {/* Subtle spotlight — low intensity */}
      <motion.div
        animate={{ opacity: [0.03, 0.08, 0.03] }}
        transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
        className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[600px] bg-yellow-400/10 rounded-full blur-3xl pointer-events-none"
      />
    </div>
  );
}
