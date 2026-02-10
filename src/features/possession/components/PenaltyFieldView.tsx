'use client';

import { motion, AnimatePresence } from 'motion/react';

interface PenaltyFieldViewProps {
  shooterAvatarUrl: string;
  defenderAvatarUrl: string;
  shooterName: string;
  defenderName: string;
  isShooterTurn: boolean; // true if player is shooter
  result: 'pending' | 'goal' | 'saved' | null;
  phase: 'setup' | 'playing' | 'result'; // setup=before answer, playing=answering, result=after answer
}

export function PenaltyFieldView({
  shooterAvatarUrl,
  defenderAvatarUrl,
  shooterName,
  defenderName,
  isShooterTurn,
  result,
  phase,
}: PenaltyFieldViewProps) {
  const showBallAnimation = phase === 'result' && (result === 'goal' || result === 'saved');

  return (
    <div className="fixed inset-0 z-50 bg-[#0a0e1a] overflow-hidden">
      {/* Camera view container */}
      <motion.div
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 0.6, ease: 'easeOut' }}
        className="relative w-full h-full flex items-center justify-center"
      >
        {/* Background field gradient */}
        <div className="absolute inset-0">
          <div className="absolute inset-0 bg-gradient-to-b from-[#1e5c32] via-[#1a472a] to-[#143820]" />
          {/* Grass texture overlay */}
          <div className="absolute inset-0 opacity-20" style={{
            backgroundImage: 'repeating-linear-gradient(90deg, transparent, transparent 50px, rgba(255,255,255,0.02) 50px, rgba(255,255,255,0.02) 100px)',
          }} />
        </div>

        {/* Penalty area visualization */}
        <svg
          viewBox="0 0 800 600"
          className="absolute inset-0 w-full h-full"
          preserveAspectRatio="xMidYMid slice"
        >
          <defs>
            {/* Goal net pattern */}
            <pattern id="netPattern" x="0" y="0" width="20" height="20" patternUnits="userSpaceOnUse">
              <line x1="0" y1="0" x2="0" y2="20" stroke="rgba(255,255,255,0.15)" strokeWidth="1" />
              <line x1="0" y1="0" x2="20" y2="0" stroke="rgba(255,255,255,0.15)" strokeWidth="1" />
            </pattern>
            {/* Shadow filter */}
            <filter id="shadow" x="-50%" y="-50%" width="200%" height="200%">
              <feGaussianBlur in="SourceAlpha" stdDeviation="4" />
              <feOffset dx="0" dy="4" result="offsetblur" />
              <feComponentTransfer>
                <feFuncA type="linear" slope="0.3" />
              </feComponentTransfer>
              <feMerge>
                <feMergeNode />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
            {/* Glow filters */}
            <filter id="playerGlow" x="-50%" y="-50%" width="200%" height="200%">
              <feGaussianBlur stdDeviation="6" result="blur" />
              <feFlood floodColor={isShooterTurn ? '#1CB0F6' : '#FF4B4B'} floodOpacity="0.6" />
              <feComposite in2="blur" operator="in" />
              <feMerge>
                <feMergeNode />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
            <filter id="keeperGlow" x="-50%" y="-50%" width="200%" height="200%">
              <feGaussianBlur stdDeviation="6" result="blur" />
              <feFlood floodColor={isShooterTurn ? '#FF4B4B' : '#1CB0F6'} floodOpacity="0.6" />
              <feComposite in2="blur" operator="in" />
              <feMerge>
                <feMergeNode />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>

          {/* Field markings - penalty area */}
          <rect x="200" y="100" width="400" height="400" fill="none" stroke="rgba(255,255,255,0.2)" strokeWidth="2" rx="4" />

          {/* Penalty spot */}
          <circle cx="400" cy="450" r="3" fill="rgba(255,255,255,0.3)" />

          {/* Goal area */}
          <rect x="320" y="80" width="160" height="40" fill="none" stroke="rgba(255,255,255,0.2)" strokeWidth="2" rx="2" />

          {/* Goal structure */}
          <g id="goal">
            {/* Goal frame */}
            <rect x="300" y="40" width="200" height="60" fill="none" stroke="rgba(255,255,255,0.4)" strokeWidth="3" rx="2" />
            {/* Goal net */}
            <rect x="302" y="42" width="196" height="56" fill="url(#netPattern)" opacity="0.6" rx="2" />
            {/* Goal posts highlight */}
            <line x1="300" y1="40" x2="300" y2="100" stroke="rgba(255,255,255,0.6)" strokeWidth="4" strokeLinecap="round" />
            <line x1="500" y1="40" x2="500" y2="100" stroke="rgba(255,255,255,0.6)" strokeWidth="4" strokeLinecap="round" />
            <line x1="300" y1="40" x2="500" y2="40" stroke="rgba(255,255,255,0.6)" strokeWidth="4" strokeLinecap="round" />
          </g>

          {/* === Goalkeeper (Defender) at goal === */}
          <motion.g
            initial={{ y: -20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.3, type: 'spring', stiffness: 120 }}
          >
            {/* Shadow */}
            <ellipse cx="400" cy="135" rx="20" ry="8" fill="rgba(0,0,0,0.3)" />

            {/* Defender avatar */}
            <motion.g
              animate={
                phase === 'result' && result === 'saved'
                  ? { x: [0, -15, 15, 0], y: [0, -5, -5, 0] } // Dive animation
                  : {}
              }
              transition={{ duration: 0.5 }}
            >
              <circle cx="400" cy="120" r="25" fill="none" stroke={isShooterTurn ? '#FF4B4B' : '#1CB0F6'} strokeWidth="3" filter="url(#keeperGlow)" />
              <clipPath id="keeperClip">
                <circle cx="400" cy="120" r="22" />
              </clipPath>
              <image
                href={defenderAvatarUrl}
                x="378"
                y="98"
                width="44"
                height="44"
                clipPath="url(#keeperClip)"
              />
            </motion.g>

            {/* Name label */}
            <text
              x="400"
              y="165"
              textAnchor="middle"
              fill="rgba(255,255,255,0.9)"
              fontSize="12"
              fontWeight="800"
              fontFamily="system-ui"
            >
              {defenderName}
            </text>
          </motion.g>

          {/* === Ball === */}
          <AnimatePresence>
            {phase !== 'result' && (
              <motion.g
                initial={{ scale: 0, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0, opacity: 0 }}
                transition={{ delay: 0.5, type: 'spring', stiffness: 200 }}
              >
                {/* Ball shadow */}
                <ellipse cx="400" cy="425" rx="12" ry="6" fill="rgba(0,0,0,0.4)" />
                {/* Ball */}
                <motion.circle
                  cx="400"
                  cy="410"
                  r="12"
                  fill="white"
                  filter="url(#shadow)"
                  animate={{
                    scale: [1, 1.05, 1],
                  }}
                  transition={{
                    duration: 2,
                    repeat: Infinity,
                    ease: 'easeInOut',
                  }}
                />
                {/* Ball details */}
                <circle cx="400" cy="410" r="12" fill="none" stroke="rgba(0,0,0,0.1)" strokeWidth="1" />
                <path d="M 395,405 L 405,405 L 402.5,415 L 397.5,415 Z" fill="rgba(0,0,0,0.15)" />
              </motion.g>
            )}
          </AnimatePresence>

          {/* === Ball animation (goal or saved) === */}
          <AnimatePresence>
            {showBallAnimation && result === 'goal' && (
              <motion.g
                initial={{ x: 400, y: 410 }}
                animate={{ x: 400, y: 70, scale: 0.8 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.6, ease: 'easeIn' }}
              >
                <circle cx="0" cy="0" r="12" fill="white" filter="url(#shadow)" />
              </motion.g>
            )}
            {showBallAnimation && result === 'saved' && (
              <motion.g
                initial={{ x: 400, y: 410 }}
                animate={{ x: 420, y: 200, scale: 0.9 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.5, ease: 'easeOut' }}
              >
                <circle cx="0" cy="0" r="12" fill="white" filter="url(#shadow)" />
              </motion.g>
            )}
          </AnimatePresence>

          {/* === Penalty taker (Shooter) === */}
          <motion.g
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.4, type: 'spring', stiffness: 120 }}
          >
            {/* Shadow */}
            <ellipse cx="400" cy="485" rx="20" ry="8" fill="rgba(0,0,0,0.3)" />

            {/* Shooter avatar */}
            <motion.g
              animate={
                phase === 'result' && result === 'goal'
                  ? { y: [0, -10, 0], scale: [1, 1.1, 1] } // Celebrate animation
                  : {}
              }
              transition={{ duration: 0.5 }}
            >
              <circle cx="400" cy="470" r="25" fill="none" stroke={isShooterTurn ? '#1CB0F6' : '#FF4B4B'} strokeWidth="3" filter="url(#playerGlow)" />
              <clipPath id="shooterClip">
                <circle cx="400" cy="470" r="22" />
              </clipPath>
              <image
                href={shooterAvatarUrl}
                x="378"
                y="448"
                width="44"
                height="44"
                clipPath="url(#shooterClip)"
              />
            </motion.g>

            {/* Name label */}
            <text
              x="400"
              y="515"
              textAnchor="middle"
              fill="rgba(255,255,255,0.9)"
              fontSize="12"
              fontWeight="800"
              fontFamily="system-ui"
            >
              {shooterName}
            </text>
          </motion.g>

          {/* Net ripple effect on goal */}
          <AnimatePresence>
            {result === 'goal' && phase === 'result' && (
              <motion.g>
                <motion.rect
                  x="302"
                  y="42"
                  width="196"
                  height="56"
                  fill="rgba(88,204,2,0.3)"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: [0, 0.6, 0] }}
                  transition={{ duration: 0.8 }}
                />
              </motion.g>
            )}
          </AnimatePresence>
        </svg>

        {/* Result overlay */}
        <AnimatePresence>
          {phase === 'result' && result === 'goal' && (
            <motion.div
              initial={{ scale: 0, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0, opacity: 0 }}
              className="absolute inset-0 flex items-center justify-center pointer-events-none"
            >
              <motion.div
                animate={{ scale: [1, 1.1, 1] }}
                transition={{ duration: 0.5, repeat: 2 }}
                className="text-center"
              >
                <div className="text-9xl mb-4">⚽</div>
                <div className="text-7xl font-black text-green-400 font-fun uppercase tracking-wider drop-shadow-[0_0_20px_rgba(88,204,2,0.8)]">
                  GOAL!
                </div>
              </motion.div>
            </motion.div>
          )}

          {phase === 'result' && result === 'saved' && (
            <motion.div
              initial={{ scale: 0, x: 100, opacity: 0 }}
              animate={{ scale: 1, x: 0, opacity: 1 }}
              exit={{ scale: 0, opacity: 0 }}
              className="absolute inset-0 flex items-center justify-center pointer-events-none"
            >
              <motion.div
                animate={{ rotate: [-5, 5, -5, 5, 0] }}
                transition={{ duration: 0.5 }}
                className="text-center"
              >
                <div className="text-9xl mb-4">🧤</div>
                <div className="text-7xl font-black text-red-400 font-fun uppercase tracking-wider drop-shadow-[0_0_20px_rgba(255,75,75,0.8)]">
                  SAVED!
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Spotlight effect */}
        <motion.div
          animate={{
            opacity: [0.1, 0.2, 0.1],
          }}
          transition={{
            duration: 3,
            repeat: Infinity,
            ease: 'easeInOut',
          }}
          className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[600px] bg-yellow-400/10 rounded-full blur-3xl pointer-events-none"
        />
      </motion.div>
    </div>
  );
}
