'use client';

import { motion } from 'motion/react';

interface PenaltyTransitionProps {
  visible: boolean;
  playerGoals: number;
  opponentGoals: number;
}

export function PenaltyTransition({ visible, playerGoals, opponentGoals }: PenaltyTransitionProps) {
  if (!visible) return null;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 bg-black flex flex-col items-center justify-center overflow-hidden"
    >
      {/* Animated background */}
      <div className="absolute inset-0">
        {/* Radial pulse */}
        <motion.div
          animate={{
            scale: [1, 2, 1],
            opacity: [0.3, 0.1, 0.3],
          }}
          transition={{
            duration: 2,
            repeat: Infinity,
            ease: 'easeInOut',
          }}
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] rounded-full bg-gradient-to-r from-red-600/40 to-orange-600/40 blur-3xl"
        />
        {/* Stadium lights effect */}
        <motion.div
          animate={{
            opacity: [0, 1, 0],
          }}
          transition={{
            duration: 0.5,
            repeat: Infinity,
            repeatDelay: 1,
          }}
          className="absolute inset-0 bg-white/5"
        />
      </div>

      {/* Content */}
      <div className="relative z-10 text-center px-6">
        {/* Score */}
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ delay: 0.2, type: 'spring', bounce: 0.5 }}
          className="mb-8"
        >
          <div className="text-6xl font-black text-white font-fun">
            {playerGoals} - {opponentGoals}
          </div>
          <div className="text-gray-400 text-lg mt-2 tracking-wide">Match Tied</div>
        </motion.div>

        {/* Main text */}
        <motion.div
          initial={{ y: 50, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.5 }}
          className="space-y-4"
        >
          <motion.div
            animate={{
              scale: [1, 1.05, 1],
            }}
            transition={{
              duration: 1.5,
              repeat: Infinity,
              ease: 'easeInOut',
            }}
            className="text-5xl md:text-6xl font-black text-transparent bg-clip-text bg-gradient-to-r from-red-500 via-orange-500 to-yellow-500 uppercase tracking-wider font-fun"
          >
            Penalty Shootout
          </motion.div>

          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 1 }}
            className="text-gray-300 text-xl font-medium"
          >
            Best of 5 
          </motion.div>
        </motion.div>

        {/* Ball animation */}
        <motion.div
          initial={{ y: -100, rotate: 0 }}
          animate={{
            y: 0,
            rotate: 360,
            scale: [1, 1.2, 1],
          }}
          transition={{
            delay: 0.3,
            y: { type: 'spring', bounce: 0.6 },
            rotate: { duration: 0.6 },
            scale: { duration: 1, repeat: Infinity },
          }}
          className="text-7xl mt-12"
        >
          ⚽
        </motion.div>

        {/* Pressure indicator */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: [0, 1, 0] }}
          transition={{
            delay: 1.2,
            duration: 1.5,
            repeat: Infinity,
          }}
          className="mt-8 text-red-400 font-bold text-sm uppercase tracking-widest"
        >
          🔥 High Pressure 🔥
        </motion.div>
      </div>

      {/* Bottom text */}
      <motion.div
        initial={{ y: 50, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 1.5 }}
        className="absolute bottom-12 text-center text-gray-500 text-sm"
      >
        Answer correctly and faster to score
      </motion.div>
    </motion.div>
  );
}
