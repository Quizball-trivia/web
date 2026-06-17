'use client';

import { LoaderCircle } from 'lucide-react';
import { motion } from 'motion/react';
import { cn } from '@/lib/utils';

interface MatchWaitingForReadyOverlayProps {
  title: string;
  readyLabel: string;
  detailLabel: string;
  className?: string;
}

export function MatchWaitingForReadyOverlay({
  title,
  readyLabel,
  detailLabel,
  className,
}: MatchWaitingForReadyOverlayProps) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.2 }}
      className={cn(
        'flex min-h-dvh w-full items-center justify-center bg-surface-page-alt bg-[url("/assets/bg-pattern.webp")] bg-cover bg-center bg-no-repeat px-4 text-white',
        className,
      )}
    >
      <div className="absolute inset-0 bg-surface-page-alt/55 backdrop-blur-[1.5px]" />
      <motion.div
        initial={{ y: 12, scale: 0.98, opacity: 0 }}
        animate={{ y: 0, scale: 1, opacity: 1 }}
        exit={{ y: 12, scale: 0.98, opacity: 0 }}
        transition={{ type: 'spring', stiffness: 280, damping: 25 }}
        className="relative flex w-full max-w-sm flex-col items-center overflow-hidden rounded-[20px] bg-brand-blue px-6 py-7 text-center shadow-2xl sm:px-7"
      >
        <div className="absolute inset-x-0 top-0 h-1 bg-brand-cyan" />
        <div className="font-poppins text-[11px] font-semibold uppercase leading-tight tracking-[0.2em] text-brand-yellow">
          {readyLabel}
        </div>
        <div className="mt-2 max-w-[18rem] text-balance font-poppins text-2xl font-semibold uppercase leading-tight text-white sm:text-[1.65rem]">
          {title}
        </div>
        <div className="mt-5 flex size-20 items-center justify-center rounded-full border border-white/15 bg-white/8 shadow-[0_0_48px_rgba(28,176,246,0.35)]">
          <LoaderCircle
            data-testid="match-ready-spinner"
            className="size-10 animate-spin text-brand-cyan"
            aria-hidden="true"
          />
        </div>
        <div className="mt-4 max-w-[17rem] text-balance font-poppins text-sm font-semibold leading-snug text-white/75">
          {detailLabel}
        </div>
      </motion.div>
    </motion.div>
  );
}
