'use client';

import type { ReactNode } from 'react';
import { motion, MotionConfig } from 'motion/react';

/** Post-match results backdrop (pattern + glow) and the content's scale-in entrance. */
export function ResultsScreenFrame({ children }: { children: ReactNode }) {
  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-surface-page-alt p-3 md:p-6">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 bg-surface-page-alt bg-[url('/assets/bg-pattern.webp')] bg-cover bg-center bg-no-repeat"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "radial-gradient(circle at top center, rgba(28,176,246,0.08), transparent 32%), radial-gradient(circle at bottom left, rgba(88,204,2,0.06), transparent 28%)",
        }}
      />
      {/* Reduced motion keeps the fade and drops the scale. */}
      <MotionConfig reducedMotion="user">
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="relative z-10 w-full max-w-[1280px] space-y-4 font-poppins md:space-y-6"
        >
          {children}
        </motion.div>
      </MotionConfig>
    </div>
  );
}
