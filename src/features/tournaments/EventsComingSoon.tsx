'use client';

import { motion } from 'motion/react';
import { Trophy, Sparkles, Zap, Star } from 'lucide-react';

const floatingIcons = [
  { Icon: Trophy, x: -60, y: -80, delay: 0, color: '#FFD700', size: 28, rotate: -15 },
  { Icon: Sparkles, x: 70, y: -60, delay: 0.2, color: '#CE82FF', size: 22, rotate: 12 },
  { Icon: Zap, x: -80, y: 40, delay: 0.4, color: '#FF9600', size: 24, rotate: -20 },
  { Icon: Star, x: 85, y: 50, delay: 0.6, color: '#1CB0F6', size: 26, rotate: 18 },
  { Icon: Sparkles, x: 0, y: -110, delay: 0.3, color: '#58CC02', size: 20, rotate: 0 },
  { Icon: Star, x: -90, y: -20, delay: 0.5, color: '#FF4B4B', size: 18, rotate: -30 },
];

export function EventsComingSoon() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-6 pb-24 font-fun relative overflow-hidden">
      {/* Ambient glow */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] rounded-full bg-[#1CB0F6]/[0.04] blur-[100px]" />
        <div className="absolute bottom-1/4 left-1/3 w-[300px] h-[300px] rounded-full bg-[#CE82FF]/[0.03] blur-[80px]" />
      </div>

      {/* Main content */}
      <div className="relative flex flex-col items-center">
        {/* Floating icons around the trophy */}
        {floatingIcons.map(({ Icon, x, y, delay, color, size, rotate }, i) => (
          <motion.div
            key={i}
            className="absolute"
            style={{ left: '50%', top: '50%' }}
            initial={{ opacity: 0, scale: 0, x, y, rotate: 0 }}
            animate={{
              opacity: [0, 0.7, 0.5],
              scale: [0, 1.1, 0.9],
              x,
              y,
              rotate,
            }}
            transition={{
              duration: 0.8,
              delay: 0.6 + delay,
              ease: 'easeOut',
            }}
          >
            <motion.div
              animate={{ y: [0, -6, 0] }}
              transition={{
                duration: 2.5 + delay,
                repeat: Infinity,
                ease: 'easeInOut',
              }}
            >
              <Icon size={size} color={color} strokeWidth={2.5} />
            </motion.div>
          </motion.div>
        ))}

        {/* Big trophy badge */}
        <motion.div
          className="relative mb-8"
          initial={{ scale: 0, rotate: -20 }}
          animate={{ scale: 1, rotate: 0 }}
          transition={{
            type: 'spring',
            stiffness: 200,
            damping: 15,
            delay: 0.1,
          }}
        >
          <div className="w-32 h-32 rounded-3xl bg-gradient-to-br from-[#FFD700] to-[#FF9600] border-b-[6px] border-[#B8860B] flex items-center justify-center shadow-lg shadow-[#FFD700]/20">
            <Trophy size={56} className="text-[#131F24]" strokeWidth={2.5} />
          </div>

          {/* Pulse ring */}
          <motion.div
            className="absolute inset-0 rounded-3xl border-2 border-[#FFD700]/40"
            animate={{ scale: [1, 1.3, 1.3], opacity: [0.6, 0, 0] }}
            transition={{ duration: 2, repeat: Infinity, ease: 'easeOut' }}
          />
        </motion.div>

        {/* "COMING SOON" text */}
        <motion.div
          className="flex flex-col items-center gap-3"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4, duration: 0.6, ease: 'easeOut' }}
        >
          {/* Letter-by-letter stagger for "COMING SOON" */}
          <div className="flex gap-1">
            {'COMING SOON'.split('').map((char, i) => (
              <motion.span
                key={i}
                className="text-3xl sm:text-4xl font-black tracking-wider text-white"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{
                  delay: 0.5 + i * 0.04,
                  type: 'spring',
                  stiffness: 300,
                  damping: 20,
                }}
              >
                {char === ' ' ? '\u00A0' : char}
              </motion.span>
            ))}
          </div>

          <motion.p
            className="text-[#56707A] text-base sm:text-lg font-semibold text-center max-w-xs leading-relaxed"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 1.0, duration: 0.6 }}
          >
            Tournaments, challenges & world events are on the way!
          </motion.p>
        </motion.div>

        {/* Animated progress dots */}
        <motion.div
          className="flex gap-2 mt-8"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.2 }}
        >
          {[0, 1, 2].map((i) => (
            <motion.div
              key={i}
              className="w-3 h-3 rounded-full bg-[#1CB0F6]"
              animate={{
                scale: [1, 1.4, 1],
                opacity: [0.4, 1, 0.4],
              }}
              transition={{
                duration: 1.4,
                repeat: Infinity,
                delay: i * 0.3,
                ease: 'easeInOut',
              }}
            />
          ))}
        </motion.div>

        {/* Bottom badge */}
        <motion.div
          className="mt-10 px-5 py-2.5 rounded-2xl bg-[#1B2F36] border-b-4 border-[#0D1B21]"
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 1.4, type: 'spring', stiffness: 200, damping: 20 }}
        >
          <span className="text-[#58CC02] font-bold text-sm tracking-wide">
            Stay tuned
          </span>
        </motion.div>
      </div>
    </div>
  );
}
