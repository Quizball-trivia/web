'use client';

/** Boot loader for the embedded (Betsson WebView/iframe) context: the
 *  first thing a visitor sees must say this is Quizball's product —
 *  მაგიდის დერბი ✕ QUIZBALL, powered-by line, brand loading bar. */

import { motion } from 'motion/react';
import { MuralBackdrop, TdLogoSticker, TD_DISPLAY, TD_LATIN } from './brand';

export function TdLoader() {
  return (
    <motion.div
      key="td-loader"
      exit={{ opacity: 0, scale: 1.04 }}
      transition={{ duration: 0.45, ease: 'easeOut' }}
      className="fixed inset-0 z-[60] flex flex-col items-center justify-center gap-8"
      style={{ background: 'var(--td-bg)' }}
    >
      <MuralBackdrop dim={0.4} />

      <div className="relative z-10 flex flex-col items-center gap-6">
        <motion.div initial={{ y: 18, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ duration: 0.5 }}>
          <TdLogoSticker variant="blackOnWhite" scale={1.05} />
        </motion.div>

        <motion.span
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ delay: 0.25, type: 'spring', damping: 10 }}
          className="text-3xl"
          style={{ ...TD_DISPLAY, color: 'var(--td-orange)', transform: 'rotate(-6deg)' }}
          aria-hidden
        >
          ✕
        </motion.span>

        <motion.div initial={{ y: 18, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.35, duration: 0.5 }}>
          {/* eslint-disable-next-line @next/next/no-img-element -- local brand asset */}
          <img src="/assets/brand/quizball-logo.webp" alt="Quizball" className="h-16 w-auto md:h-20" />
        </motion.div>
      </div>

      {/* indeterminate brand loading bar */}
      <div className="relative z-10 h-2 w-44 overflow-hidden rounded-full" style={{ background: 'rgba(255,255,255,0.12)' }}>
        <motion.div
          animate={{ x: ['-110%', '310%'] }}
          transition={{ repeat: Infinity, duration: 1.15, ease: 'easeInOut' }}
          className="h-full w-1/3 rounded-full"
          style={{ background: 'var(--td-orange)' }}
        />
      </div>

      <span
        className="absolute bottom-8 z-10 text-[11px] uppercase"
        style={{ ...TD_LATIN, letterSpacing: '0.28em', color: 'rgba(255,255,255,0.55)' }}
      >
        powered by Quizball
      </span>
    </motion.div>
  );
}
