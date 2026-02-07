'use client';

import { motion } from 'motion/react';
import { cn } from '@/lib/utils';

interface LoadingScreenProps {
  text?: string;
  className?: string;
  fullScreen?: boolean;
}

function SoccerBallSVG({ size = 64 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 100 100"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      {/* Ball base */}
      <circle cx="50" cy="50" r="48" fill="white" stroke="#2A2A2A" strokeWidth="2" />

      {/* Subtle sphere shading */}
      <radialGradient id="ball-shade" cx="40%" cy="35%" r="60%">
        <stop offset="0%" stopColor="white" stopOpacity="1" />
        <stop offset="70%" stopColor="#e8e8e8" stopOpacity="1" />
        <stop offset="100%" stopColor="#d0d0d0" stopOpacity="1" />
      </radialGradient>
      <circle cx="50" cy="50" r="47" fill="url(#ball-shade)" />

      {/* Highlight */}
      <radialGradient id="ball-highlight" cx="35%" cy="30%" r="25%">
        <stop offset="0%" stopColor="white" stopOpacity="0.9" />
        <stop offset="100%" stopColor="white" stopOpacity="0" />
      </radialGradient>
      <circle cx="50" cy="50" r="47" fill="url(#ball-highlight)" />

      {/* Center pentagon */}
      <polygon
        points="50,30 62,38 58,52 42,52 38,38"
        fill="#1a1a1a"
        stroke="#1a1a1a"
        strokeWidth="0.5"
        strokeLinejoin="round"
      />

      {/* Top pentagon */}
      <polygon
        points="50,6 58,18 50,22 42,18"
        fill="#1a1a1a"
        stroke="#1a1a1a"
        strokeWidth="0.5"
        strokeLinejoin="round"
      />

      {/* Top-right pentagon */}
      <polygon
        points="78,22 82,36 72,40 66,32 70,20"
        fill="#1a1a1a"
        stroke="#1a1a1a"
        strokeWidth="0.5"
        strokeLinejoin="round"
      />

      {/* Top-left pentagon */}
      <polygon
        points="22,22 30,20 34,32 28,40 18,36"
        fill="#1a1a1a"
        stroke="#1a1a1a"
        strokeWidth="0.5"
        strokeLinejoin="round"
      />

      {/* Bottom-right pentagon */}
      <polygon
        points="84,60 80,74 68,72 64,60 74,54"
        fill="#1a1a1a"
        stroke="#1a1a1a"
        strokeWidth="0.5"
        strokeLinejoin="round"
      />

      {/* Bottom-left pentagon */}
      <polygon
        points="16,60 26,54 36,60 32,72 20,74"
        fill="#1a1a1a"
        stroke="#1a1a1a"
        strokeWidth="0.5"
        strokeLinejoin="round"
      />

      {/* Bottom pentagon */}
      <polygon
        points="38,82 42,74 58,74 62,82 50,92"
        fill="#1a1a1a"
        stroke="#1a1a1a"
        strokeWidth="0.5"
        strokeLinejoin="round"
      />

      {/* Panel seam lines */}
      <g stroke="#c0c0c0" strokeWidth="0.8" fill="none" opacity="0.6">
        {/* Top to center */}
        <line x1="42" y1="18" x2="38" y2="38" />
        <line x1="58" y1="18" x2="62" y2="38" />
        {/* Sides to center */}
        <line x1="28" y1="40" x2="42" y2="52" />
        <line x1="72" y1="40" x2="58" y2="52" />
        {/* Bottom connections */}
        <line x1="42" y1="52" x2="42" y2="74" />
        <line x1="58" y1="52" x2="58" y2="74" />
        {/* Outer connections */}
        <line x1="34" y1="32" x2="42" y2="18" />
        <line x1="66" y1="32" x2="58" y2="18" />
        <line x1="74" y1="54" x2="62" y2="38" />
        <line x1="26" y1="54" x2="38" y2="38" />
        <line x1="36" y1="60" x2="42" y2="52" />
        <line x1="64" y1="60" x2="58" y2="52" />
        <line x1="32" y1="72" x2="42" y2="74" />
        <line x1="68" y1="72" x2="58" y2="74" />
      </g>
    </svg>
  );
}

export function LoadingScreen({
  text = 'Warming up...',
  className,
  fullScreen = true,
}: LoadingScreenProps) {
  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center bg-background text-foreground',
        fullScreen
          ? 'fixed inset-0 z-50 bg-background/80 backdrop-blur-sm'
          : 'h-64 w-full',
        className
      )}
    >
      <div className="relative h-32 flex items-end justify-center">
        {/* Bouncing Ball */}
        <motion.div
          animate={{
            y: [0, -60, 0],
            scaleX: [1.1, 0.95, 1.1],
            scaleY: [0.9, 1.08, 0.9],
            rotate: [0, 180, 360],
          }}
          transition={{
            duration: 0.7,
            repeat: Infinity,
            ease: [0.33, 0, 0.67, 1],
            times: [0, 0.45, 1],
          }}
          className="relative z-10"
        >
          <SoccerBallSVG size={56} />
        </motion.div>
      </div>

      {/* Shadow */}
      <motion.div
        animate={{
          scaleX: [1.2, 0.5, 1.2],
          opacity: [0.35, 0.1, 0.35],
        }}
        transition={{
          duration: 0.7,
          repeat: Infinity,
          ease: [0.33, 0, 0.67, 1],
          times: [0, 0.45, 1],
        }}
        className="w-14 h-3 rounded-[100%] bg-white/10 blur-[2px] mt-1"
      />

      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: [0.4, 0.8, 0.4] }}
        transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
        className="mt-8 text-sm font-black uppercase tracking-[0.2em] text-white/40 font-fun"
      >
        {text}
      </motion.p>
    </div>
  );
}
