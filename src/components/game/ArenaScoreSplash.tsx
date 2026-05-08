'use client';

import { useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';

interface ArenaScoreSplashProps {
  show: boolean;
  points: number | null;
  side: 'left' | 'right';
  variant?: 'pending' | 'points';
  onComplete?: () => void;
}

export function ArenaScoreSplash({
  show,
  points,
  side,
  variant = 'points',
  onComplete,
}: ArenaScoreSplashProps) {
  const isPointsVariant = variant === 'points';
  const visible = show && (!isPointsVariant || (points != null && points > 0));

  useEffect(() => {
    if (!visible) return;
    const timer = setTimeout(() => onComplete?.(), 1100);
    return () => clearTimeout(timer);
  }, [visible, onComplete]);

  const isLeft = side === 'left';

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          key="splash"
          initial={{ opacity: 0, scale: 0.4, rotate: isLeft ? 12 : -12 }}
          animate={{
            opacity: [0, 1, 1, 0],
            scale: [0.4, 1.15, 1, 0.95],
            y: [0, -10, -14, -22],
            rotate: 6.8,
          }}
          exit={{ opacity: 0 }}
          transition={{
            duration: 1.0,
            times: [0, 0.2, 0.7, 1],
            ease: 'easeOut',
          }}
          className="pointer-events-none select-none"
          style={{
            color: '#FFE500',
            fontFamily: "'Poppins', sans-serif",
            fontWeight: 900,
            fontSize: 'clamp(36px, 5vw, 64px)',
            textTransform: 'uppercase',
            WebkitTextStroke: '2px #000000',
            paintOrder: 'stroke fill',
            whiteSpace: 'nowrap',
          }}
        >
          {isPointsVariant ? `+${points}` : 'Correct!'}
        </motion.div>
      )}
    </AnimatePresence>
  );
}
