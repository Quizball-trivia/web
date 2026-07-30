'use client';

import { useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { Check } from 'lucide-react';
import { useLocale } from '@/contexts/LocaleContext';
import { colors } from '@/lib/colors';

const CONFETTI_COLORS = ['#FFE500', '#38B60E', '#1CB0F6', '#FF6C0A', '#FFD700', '#FFFFFF'];
const PIECES = 28;

// Deterministic pseudo-random so the burst is stable across re-renders and SSR.
function rand(seed: number): number {
  const x = Math.sin(seed * 127.1 + 311.7) * 43758.5453;
  return x - Math.floor(x);
}

/**
 * The league join CTA. Pressing it fires a confetti burst and settles into the
 * joined state; once joined it renders as a static confirmation.
 */
export function JoinLeagueButton({
  joined,
  onJoin,
  className = '',
}: {
  joined: boolean;
  onJoin?: () => void;
  className?: string;
}) {
  const { t } = useLocale();
  const [burst, setBurst] = useState(false);

  const confetti = useMemo(
    () =>
      Array.from({ length: PIECES }, (_, i) => {
        const angle = (i / PIECES) * Math.PI * 2 + rand(i * 7) * 0.4;
        const dist = 70 + rand(i * 7 + 1) * 120;
        return {
          x: Math.cos(angle) * dist,
          y: Math.sin(angle) * dist * 0.8,
          rotate: rand(i * 7 + 3) * 540 - 270,
          scale: 0.5 + rand(i * 7 + 4) * 0.8,
          color: CONFETTI_COLORS[i % CONFETTI_COLORS.length],
          delay: rand(i * 7 + 5) * 0.12,
        };
      }),
    [],
  );

  const handleClick = () => {
    if (joined) return;
    setBurst(true);
    onJoin?.();
  };

  const base =
    'relative flex h-11 w-full items-center justify-center gap-2 rounded-[10px] font-poppins text-[13px] font-black uppercase tracking-wide text-black';

  return (
    <div className={`relative ${className}`}>
      {/* Burst originates from the button's centre and is never interactive. */}
      <AnimatePresence>
        {burst && (
          <div className="pointer-events-none absolute inset-0 z-20 flex items-center justify-center">
            {confetti.map((piece, i) => (
              <motion.span
                key={i}
                initial={{ opacity: 1, x: 0, y: 0, scale: 0, rotate: 0 }}
                animate={{
                  opacity: [1, 1, 0],
                  x: piece.x,
                  y: [0, piece.y, piece.y + 60],
                  scale: piece.scale,
                  rotate: piece.rotate,
                }}
                transition={{ duration: 1.1, delay: piece.delay, ease: 'easeOut' }}
                onAnimationComplete={i === 0 ? () => setBurst(false) : undefined}
                className="absolute size-2 rounded-[2px]"
                style={{ backgroundColor: piece.color }}
              />
            ))}
          </div>
        )}
      </AnimatePresence>

      {joined ? (
        <motion.div
          initial={{ scale: 0.92 }}
          animate={{ scale: 1 }}
          transition={{ type: 'spring', stiffness: 320, damping: 14 }}
          className={`${base} cursor-default`}
          style={{ backgroundColor: 'rgba(133,224,0,0.35)', color: 'rgba(255,255,255,0.75)' }}
        >
          <motion.span
            initial={{ scale: 0, rotate: -30 }}
            animate={{ scale: 1, rotate: 0 }}
            transition={{ type: 'spring', stiffness: 400, damping: 12, delay: 0.05 }}
            className="flex"
          >
            <Check className="size-4" strokeWidth={3} />
          </motion.span>
          {t('weekendLeague.joinedCta')}
        </motion.div>
      ) : (
        <motion.button
          type="button"
          onClick={handleClick}
          whileTap={{ scale: 0.96 }}
          whileHover={{ scale: 1.02 }}
          transition={{ type: 'spring', stiffness: 400, damping: 17 }}
          className={base}
          style={{ backgroundColor: colors.green.light }}
        >
          {t('weekendLeague.joinCta')}
        </motion.button>
      )}
    </div>
  );
}
