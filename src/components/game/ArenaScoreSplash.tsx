'use client';

import { useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';

interface ArenaScoreSplashProps {
  show: boolean;
  points: number | null;
  side: 'left' | 'right';
  variant?: 'pending' | 'points';
  onComplete?: () => void;
}

interface Confetti {
  id: number;
  x: number;
  y: number;
  rotation: number;
  scale: number;
  color: string;
  delay: number;
}

function seededRandom(seed: number): number {
  const value = Math.sin(seed * 12.9898) * 43758.5453;
  return value - Math.floor(value);
}

export function ArenaScoreSplash({
  show,
  points,
  side,
  variant = 'points',
  onComplete,
}: ArenaScoreSplashProps) {
  const isPointsVariant = variant === 'points';
  const confettiSeed = isPointsVariant ? (points ?? 0) : (side === 'left' ? 101 : 257);
  const confetti = useMemo<Confetti[]>(() => {
    if (!show) {
      return [];
    }
    if (isPointsVariant && (points == null || points <= 0)) {
      return [];
    }

    const colors = side === 'left'
      ? ['#58CC02', '#85E000', '#AAFF00', '#6DD400'] // Green for player
      : ['#FF9600', '#FFB800', '#FFCD2E', '#FCD200', '#FFED4E']; // Orange for opponent
    const sideSeedOffset = side === 'left' ? 101 : 257;

    return Array.from({ length: 20 }, (_, i) => ({
      id: i,
      x: seededRandom(confettiSeed + sideSeedOffset + i * 13) * 200 - 100,
      y: seededRandom(confettiSeed + sideSeedOffset + i * 29) * -150 - 50,
      rotation: seededRandom(confettiSeed + sideSeedOffset + i * 47) * 720 - 360,
      scale: seededRandom(confettiSeed + sideSeedOffset + i * 61) * 0.5 + 0.5,
      color: colors[Math.floor(seededRandom(confettiSeed + sideSeedOffset + i * 79) * colors.length)],
      delay: seededRandom(confettiSeed + sideSeedOffset + i * 97) * 0.15,
    }));
  }, [confettiSeed, isPointsVariant, points, show, side]);

  useEffect(() => {
    if (!show) {
      return;
    }
    if (isPointsVariant && (points == null || points <= 0)) {
      return;
    }

    const timer = setTimeout(() => {
      onComplete?.();
    }, 1100);

    return () => clearTimeout(timer);
  }, [isPointsVariant, onComplete, points, show]);

  if (!show) return null;
  if (isPointsVariant && (points == null || points <= 0)) return null;

  const isLeft = side === 'left';
  const baseColor = isLeft ? '#58CC02' : '#FF9600';
  const glowColor = isLeft ? '#85E000' : '#FFB800';
  const starParticles = Array.from({ length: 6 }, (_, i) => {
    const angle = (i * 60 + (isLeft ? 0 : 180)) * (Math.PI / 180);
    const distance = 50 + ((i * 17 + confettiSeed * 7) % 30);
    const delay = 0.15 + ((i * 13 + confettiSeed * 5) % 15) / 100;

    return {
      id: i,
      angle,
      distance,
      delay,
    };
  });

  return (
    <AnimatePresence>
      {show && (
        <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
          {/* Main score burst */}
          <motion.div
            className={`absolute ${isLeft ? '-left-8' : '-right-8'} top-1/2 -translate-y-1/2`}
            initial={{ scale: 0, rotate: -15 }}
            animate={{
              scale: [0, 1.2, 1],
              rotate: [isLeft ? -15 : 15, 0, 0],
            }}
            exit={{ scale: 0, opacity: 0 }}
            transition={{
              duration: 0.6,
              ease: [0.34, 1.56, 0.64, 1],
            }}
          >
            {/* Glow halo */}
            <motion.div
              className="absolute inset-0 rounded-full blur-xl"
              style={{
                background: `radial-gradient(circle, ${glowColor}60 0%, transparent 70%)`,
                width: '100px',
                height: '100px',
                left: '50%',
                top: '50%',
                transform: 'translate(-50%, -50%)',
              }}
              animate={{
                scale: [1, 1.3, 1.1],
                opacity: [0.7, 0.3, 0],
              }}
              transition={{ duration: 0.9 }}
            />

            {/* Score text / success text with chunky border */}
            <motion.div
              className="relative font-fun font-black text-white select-none"
              style={{
                fontSize: isPointsVariant ? '48px' : '32px',
                textShadow: `
                  2px 2px 0 ${baseColor}dd,
                  4px 4px 0 ${baseColor}99,
                  0 0 20px ${glowColor},
                  0 0 40px ${glowColor}66
                `,
                WebkitTextStroke: `1.5px ${baseColor}`,
                paintOrder: 'stroke fill',
              }}
              animate={{
                y: [0, -10, -5],
              }}
              transition={{ duration: 0.7, ease: 'easeOut' }}
            >
              {isPointsVariant ? `+${points}` : 'Correct!'}
            </motion.div>

            {/* Radial burst lines */}
            {Array.from({ length: 8 }).map((_, i) => {
              return (
                <motion.div
                  key={`burst-${i}`}
                  className="absolute top-1/2 left-1/2 origin-left"
                  style={{
                    width: '40px',
                    height: '4px',
                    background: `linear-gradient(90deg, ${baseColor} 0%, transparent 100%)`,
                    transform: `rotate(${i * 45}deg)`,
                    borderRadius: '2px',
                  }}
                  initial={{ scaleX: 0, opacity: 0 }}
                  animate={{
                    scaleX: [0, 1.3, 0],
                    opacity: [0, 1, 0],
                  }}
                  transition={{
                    duration: 0.5,
                    delay: 0.1,
                    ease: 'easeOut',
                  }}
                />
              );
            })}
          </motion.div>

          {/* Confetti explosion */}
          {confetti.map((particle) => (
            <motion.div
              key={particle.id}
              className={`absolute ${isLeft ? '-left-8' : '-right-8'} top-1/2`}
              initial={{
                x: 0,
                y: 0,
                opacity: 1,
                rotate: 0,
                scale: particle.scale,
              }}
              animate={{
                x: particle.x,
                y: particle.y,
                opacity: [1, 1, 0],
                rotate: particle.rotation,
                scale: [particle.scale, particle.scale * 1.2, 0],
              }}
              transition={{
                duration: 0.9,
                delay: particle.delay,
                ease: [0.34, 1.56, 0.64, 1],
              }}
            >
              <div
                className="w-4 h-4 rounded-sm"
                style={{
                  background: particle.color,
                  boxShadow: `0 0 10px ${particle.color}99`,
                }}
              />
            </motion.div>
          ))}

          {/* Star particles */}
          {starParticles.map((particle) => {
            return (
              <motion.div
                key={`star-${particle.id}`}
                className={`absolute ${isLeft ? '-left-8' : '-right-8'} top-1/2`}
                initial={{ scale: 0, opacity: 0 }}
                animate={{
                  x: Math.cos(particle.angle) * particle.distance,
                  y: Math.sin(particle.angle) * particle.distance,
                  scale: [0, 1.2, 0],
                  opacity: [0, 1, 0],
                  rotate: [0, 360],
                }}
                transition={{
                  duration: 0.7,
                  delay: particle.delay,
                  ease: 'easeOut',
                }}
              >
                <div
                  className="text-lg"
                  style={{
                    filter: `drop-shadow(0 0 4px ${baseColor})`,
                  }}
                >
                  ✨
                </div>
              </motion.div>
            );
          })}

          {/* Ring wave pulse */}
          <motion.div
            className={`absolute ${isLeft ? '-left-8' : '-right-8'} top-1/2 -translate-x-1/2 -translate-y-1/2`}
            initial={{ scale: 0.5, opacity: 0 }}
            animate={{
              scale: [0.5, 2],
              opacity: [0.5, 0],
            }}
            transition={{ duration: 0.8, ease: 'easeOut' }}
          >
            <div
              className="rounded-full border-4"
              style={{
                width: '80px',
                height: '80px',
                borderColor: baseColor,
              }}
            />
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
