'use client';

import { motion } from 'motion/react';

interface PitchVisualizationProps {
  playerPosition: number; // 0–100
  playerAvatarUrl: string;
  opponentAvatarUrl: string;
}

export function PitchVisualization({ playerPosition, playerAvatarUrl, opponentAvatarUrl }: PitchVisualizationProps) {
  // Both markers move in same direction — they're fighting for the ball
  // Player at their position, opponent slightly behind (closer to their goal)
  const playerX = 30 + (playerPosition / 100) * 440;
  const opponentX = playerX - 30; // opponent trails behind player
  const ballX = playerPosition > 50 ? playerX + 14 : opponentX - 14;

  return (
    <div className="w-full px-3">
      <div className="relative rounded-2xl overflow-hidden border-2 border-emerald-900/60 border-b-4 border-b-emerald-950/80">
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
            {/* Grass stripe pattern */}
            <pattern id="grassStripes" x="0" y="0" width="60" height="230" patternUnits="userSpaceOnUse">
              <rect x="0" y="0" width="30" height="230" fill="rgba(255,255,255,0.015)" />
            </pattern>
            {/* Clip circles for avatars */}
            <clipPath id="playerClip">
              <circle cx="0" cy="0" r="16" />
            </clipPath>
            <clipPath id="opponentClip">
              <circle cx="0" cy="0" r="16" />
            </clipPath>
            {/* Glow filters */}
            <filter id="blueGlow" x="-50%" y="-50%" width="200%" height="200%">
              <feGaussianBlur stdDeviation="4" result="blur" />
              <feFlood floodColor="#1CB0F6" floodOpacity="0.5" result="color" />
              <feComposite in="color" in2="blur" operator="in" result="glow" />
              <feMerge>
                <feMergeNode in="glow" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
            <filter id="redGlow" x="-50%" y="-50%" width="200%" height="200%">
              <feGaussianBlur stdDeviation="4" result="blur" />
              <feFlood floodColor="#FF4B4B" floodOpacity="0.5" result="color" />
              <feComposite in="color" in2="blur" operator="in" result="glow" />
              <feMerge>
                <feMergeNode in="glow" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
            <filter id="ballGlow" x="-50%" y="-50%" width="200%" height="200%">
              <feGaussianBlur stdDeviation="3" result="blur" />
              <feFlood floodColor="#ffffff" floodOpacity="0.6" result="color" />
              <feComposite in="color" in2="blur" operator="in" result="glow" />
              <feMerge>
                <feMergeNode in="glow" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>

          {/* Field background */}
          <rect x="0" y="0" width="500" height="230" rx="12" fill="url(#pitchGrad)" />
          <rect x="0" y="0" width="500" height="230" rx="12" fill="url(#grassStripes)" />

          {/* Zone bands: DEF 0-20, MID 21-45, ATT 46-70, BOX 71-100 */}
          <rect x="0" y="0" width="100" height="230" fill="rgba(156,163,175,0.05)" rx="12" />
          <rect x="355" y="0" width="145" height="230" fill="rgba(255,75,75,0.06)" rx="12" />
          <rect x="230" y="0" width="125" height="230" fill="rgba(255,150,0,0.04)" />

          {/* Pitch markings */}
          {/* Outer border */}
          <rect x="15" y="15" width="470" height="200" rx="4" fill="none" stroke="rgba(255,255,255,0.15)" strokeWidth="1.5" />

          {/* Center line */}
          <line x1="250" y1="15" x2="250" y2="215" stroke="rgba(255,255,255,0.15)" strokeWidth="1.5" />
          {/* Center circle */}
          <circle cx="250" cy="115" r="35" fill="none" stroke="rgba(255,255,255,0.15)" strokeWidth="1.5" />
          <circle cx="250" cy="115" r="3" fill="rgba(255,255,255,0.2)" />

          {/* Left penalty box */}
          <rect x="15" y="50" width="65" height="130" fill="none" stroke="rgba(255,255,255,0.12)" strokeWidth="1.2" rx="2" />
          {/* Left goal area */}
          <rect x="15" y="75" width="28" height="80" fill="none" stroke="rgba(255,255,255,0.12)" strokeWidth="1.2" rx="2" />
          {/* Left goal */}
          <rect x="6" y="92" width="9" height="46" fill="none" stroke="rgba(255,255,255,0.25)" strokeWidth="2" rx="2" />

          {/* Right penalty box */}
          <rect x="420" y="50" width="65" height="130" fill="none" stroke="rgba(255,255,255,0.12)" strokeWidth="1.2" rx="2" />
          {/* Right goal area */}
          <rect x="457" y="75" width="28" height="80" fill="none" stroke="rgba(255,255,255,0.12)" strokeWidth="1.2" rx="2" />
          {/* Right goal */}
          <rect x="485" y="92" width="9" height="46" fill="none" stroke="rgba(255,255,255,0.25)" strokeWidth="2" rx="2" />

          {/* Penalty spots */}
          <circle cx="60" cy="115" r="2" fill="rgba(255,255,255,0.15)" />
          <circle cx="440" cy="115" r="2" fill="rgba(255,255,255,0.15)" />

          {/* Zone labels */}
          <text x="50" y="28" fill="rgba(156,163,175,0.35)" fontSize="9" fontWeight="800" textAnchor="middle" fontFamily="system-ui">DEF</text>
          <text x="165" y="28" fill="rgba(255,255,255,0.25)" fontSize="9" fontWeight="800" textAnchor="middle" fontFamily="system-ui">MID</text>
          <text x="290" y="28" fill="rgba(255,150,0,0.35)" fontSize="9" fontWeight="800" textAnchor="middle" fontFamily="system-ui">ATT</text>
          <text x="428" y="28" fill="rgba(255,75,75,0.35)" fontSize="9" fontWeight="800" textAnchor="middle" fontFamily="system-ui">BOX</text>

          {/* === Opponent marker === */}
          <motion.g
            animate={{ x: opponentX, y: 115 }}
            transition={{ type: 'spring', stiffness: 120, damping: 20 }}
            filter="url(#redGlow)"
          >
            {/* Ring */}
            <circle cx="0" cy="0" r="18" fill="none" stroke="#FF4B4B" strokeWidth="2.5" />
            {/* Avatar image */}
            <clipPath id="oppClipInst">
              <circle cx="0" cy="0" r="16" />
            </clipPath>
            <image
              href={opponentAvatarUrl}
              x="-16"
              y="-16"
              width="32"
              height="32"
              clipPath="url(#oppClipInst)"
            />
          </motion.g>

          {/* === Player marker === */}
          <motion.g
            animate={{ x: playerX, y: 115 }}
            transition={{ type: 'spring', stiffness: 120, damping: 20 }}
            filter="url(#blueGlow)"
          >
            {/* Ring */}
            <circle cx="0" cy="0" r="18" fill="none" stroke="#1CB0F6" strokeWidth="2.5" />
            {/* Avatar image */}
            <clipPath id="playerClipInst">
              <circle cx="0" cy="0" r="16" />
            </clipPath>
            <image
              href={playerAvatarUrl}
              x="-16"
              y="-16"
              width="32"
              height="32"
              clipPath="url(#playerClipInst)"
            />
          </motion.g>

          {/* === Football emoji === */}
          <motion.g
            animate={{ x: ballX, y: 105 }}
            transition={{ type: 'spring', stiffness: 140, damping: 18 }}
            filter="url(#ballGlow)"
          >
            <foreignObject x="-12" y="-12" width="24" height="24">
              <div style={{ fontSize: '20px', lineHeight: '24px', textAlign: 'center' }}>
                ⚽
              </div>
            </foreignObject>
          </motion.g>
        </svg>
      </div>
    </div>
  );
}
