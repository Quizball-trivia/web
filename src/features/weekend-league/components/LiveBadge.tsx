'use client';

import { motion } from 'motion/react';

/** Pulsing red "LIVE" pill used across the live phases. */
export function LiveBadge({ label = 'LIVE', className = '' }: { label?: string; className?: string }) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full bg-brand-red-soft px-2.5 py-1 font-poppins text-[11px] font-black uppercase tracking-wide text-white ${className}`}
    >
      <motion.span
        aria-hidden
        className="size-1.5 rounded-full bg-white"
        animate={{ opacity: [1, 0.25, 1], scale: [1, 0.8, 1] }}
        transition={{ duration: 1.2, repeat: Infinity }}
      />
      {label}
    </span>
  );
}
