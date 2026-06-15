'use client';

import { motion } from 'motion/react';
import { cn } from '@/lib/utils';

interface RoundTransitionOverlayProps {
  title: string;
  categoryName?: string | null;
  subtitle?: string | null;
  className?: string;
}

// Promoted from dev preview to production: the redesigned overlay is now
// the only variant. The classic implementation lives below for reference
// but is no longer wired up.
export function RoundTransitionOverlay(props: RoundTransitionOverlayProps) {
  return <ModernRoundTransitionOverlay {...props} />;
}

function ClassicRoundTransitionOverlay({ title, categoryName, subtitle }: RoundTransitionOverlayProps) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.2 }}
      className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-surface-deep/95 backdrop-blur-sm rounded-2xl overflow-hidden"
    >
      <motion.div
        initial={{ scaleX: 0 }}
        animate={{ scaleX: 1 }}
        transition={{ duration: 0.4, ease: 'easeOut' }}
        className="absolute top-0 inset-x-0 h-[3px] bg-brand-cyan origin-left"
      />
      <motion.div
        initial={{ scaleX: 0 }}
        animate={{ scaleX: 1 }}
        transition={{ duration: 0.4, ease: 'easeOut', delay: 0.05 }}
        className="absolute bottom-0 inset-x-0 h-[3px] bg-brand-cyan origin-right"
      />

      {categoryName ? (
        <motion.div
          initial={{ y: 8, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ type: 'spring', stiffness: 400, damping: 28, delay: 0.1 }}
          className="text-brand-cyan text-xs font-bold font-fun uppercase tracking-[0.2em] mb-2"
        >
          {categoryName}
        </motion.div>
      ) : null}

      <motion.div
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: 'spring', stiffness: 350, damping: 22, delay: 0.15 }}
        className="text-3xl font-black font-fun text-white uppercase tracking-wider"
        style={{ textShadow: '0 4px 0 rgba(0,0,0,0.4), 0 0 30px rgba(28,176,246,0.15)' }}
      >
        {title}
      </motion.div>

      {subtitle ? (
        <motion.div
          initial={{ y: -6, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ type: 'spring', stiffness: 400, damping: 28, delay: 0.25 }}
          className="text-white/50 text-xs font-bold font-fun uppercase tracking-widest mt-2"
        >
          {subtitle}
        </motion.div>
      ) : null}
    </motion.div>
  );
}

/**
 * Modern round-transition overlay — dev preview.
 *
 * Departs from the classic "Duolingo-bordered card" look:
 *  - Fully transparent surface (no fill, no cyan accent rails)
 *  - Poppins everywhere (no `font-fun`) to match the new app type stack
 *  - Subtitle (e.g. "1ST HALF") promoted to a brand-yellow tag that's noticeably
 *    larger than the previous tiny grey label
 *  - Title stays bold uppercase but sized down slightly and pulls the focus
 *    via a soft drop shadow instead of stadium glow
 */
function ModernRoundTransitionOverlay({ title, categoryName, subtitle, className }: RoundTransitionOverlayProps) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.2 }}
      className={cn(
        'absolute inset-x-0 bottom-0 top-0 z-20 flex flex-col items-center justify-center overflow-hidden bg-transparent px-6 text-center [transform:translateY(-9%)] sm:[transform:none]',
        className,
      )}
    >
      {/* Top + bottom accent rails — kept from the classic variant so the
          overlay still reads as a discrete "round break" beat. Brand green
          token matches the rest of the new visual language. */}
      <motion.div
        initial={{ scaleX: 0 }}
        animate={{ scaleX: 1 }}
        transition={{ duration: 0.4, ease: 'easeOut' }}
        className="absolute top-0 inset-x-0 h-[3px] bg-brand-green origin-left"
      />
      <motion.div
        initial={{ scaleX: 0 }}
        animate={{ scaleX: 1 }}
        transition={{ duration: 0.4, ease: 'easeOut', delay: 0.05 }}
        className="absolute bottom-0 inset-x-0 h-[3px] bg-brand-green origin-right"
      />

      {categoryName ? (
        <motion.div
          initial={{ y: 12, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ type: 'spring', stiffness: 380, damping: 26, delay: 0.05 }}
          className="font-poppins max-w-[90vw] text-balance text-[15px] sm:text-[18px] md:text-[20px] font-bold uppercase leading-tight tracking-[0.12em] sm:tracking-[0.22em] text-brand-yellow mb-4"
          style={{ textShadow: '0 2px 8px rgba(0,0,0,0.4)' }}
        >
          {categoryName}
        </motion.div>
      ) : null}

      <motion.div
        initial={{ y: 18, opacity: 0, scale: 0.92 }}
        animate={{ y: 0, opacity: 1, scale: 1 }}
        transition={{ type: 'spring', stiffness: 320, damping: 22, delay: 0.12 }}
        className="font-poppins text-[28px] sm:text-[34px] md:text-[40px] font-extrabold uppercase tracking-wider text-white"
        style={{ textShadow: '0 4px 14px rgba(0,0,0,0.35)' }}
      >
        {title}
      </motion.div>

      {subtitle ? (
        <motion.div
          initial={{ y: -8, opacity: 0, scale: 0.85 }}
          animate={{ y: 0, opacity: 1, scale: 1 }}
          transition={{ type: 'spring', stiffness: 380, damping: 22, delay: 0.22 }}
          className="mt-4 font-poppins text-[14px] sm:text-[16px] font-bold uppercase tracking-[0.22em] text-brand-yellow"
        >
          {subtitle}
        </motion.div>
      ) : null}
    </motion.div>
  );
}
