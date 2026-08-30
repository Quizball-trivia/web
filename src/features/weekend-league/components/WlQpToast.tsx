'use client';

// Test A of the WL acquisition experiments (2026-08-29): surface the QP a
// ranked match just earned, at the moment it lands, with a tap-through to the
// league tab. Rendered by RealtimeResultsScreen via its qpToastSlot prop so
// control-arm users simply get no slot.

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { motion, useReducedMotion } from 'motion/react';
import { ArrowRight } from 'lucide-react';
import { useLocale } from '@/contexts/LocaleContext';
import { LEAGUE_TAB_HREF } from './StatusBandVariants';

const poppins = { fontFamily: "'Poppins', sans-serif", fontWeight: 600 } as const;

export function WlQpToast({
  gainedQp,
  previousQp,
  targetQp = 200,
  href = LEAGUE_TAB_HREF,
  onOpen,
  onShown,
}: {
  gainedQp: number;
  previousQp: number;
  targetQp?: number;
  href?: string;
  onOpen?: () => void;
  /** Fires when the entrance animation completes — the toast is actually visible. */
  onShown?: () => void;
}) {
  const { t } = useLocale();
  const reducedMotion = useReducedMotion();
  const newQp = Math.min(targetQp, previousQp + gainedQp);
  const remaining = Math.max(0, targetQp - newQp);
  const [fill, setFill] = useState(previousQp / targetQp);
  useEffect(() => {
    const id = setTimeout(() => setFill(newQp / targetQp), 650);
    return () => clearTimeout(id);
  }, [newQp, targetQp]);

  const tail = remaining > 0
    ? t('weekendLeague.qpToastRemaining', { n: remaining })
    : t('weekendLeague.qpToastQualified');

  return (
    <motion.div
      initial={reducedMotion ? false : { opacity: 0, y: 18, scale: 0.97 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={reducedMotion ? { duration: 0 } : { delay: 0.45, duration: 0.28, ease: 'easeOut' }}
      onAnimationComplete={onShown}
      className="mx-auto w-full max-w-sm"
    >
      <Link
        href={href}
        onClick={onOpen}
        className="block rounded-[14px] px-4 py-3 text-left transition-[filter] hover:brightness-110 active:brightness-95"
        style={{ backgroundImage: 'linear-gradient(180deg, #1645FF 0%, #1A35A1 100%)' }}
      >
        <div className="flex items-center justify-between">
          <span className="text-[15px] uppercase text-brand-yellow" style={poppins}>
            +{gainedQp} QP
          </span>
          <span className="flex items-center gap-1.5 text-[12px] uppercase text-white" style={poppins}>
            {tail}
            <span className="flex size-5 items-center justify-center rounded-full bg-white">
              <ArrowRight className="size-3.5 text-brand-blue" />
            </span>
          </span>
        </div>
        <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-white/20">
          <div
            className="h-full rounded-full bg-brand-yellow transition-[width] duration-700 ease-out"
            style={{ width: `${Math.round(fill * 100)}%` }}
          />
        </div>
        <div className="mt-1 text-right text-[11px] tabular-nums text-white/60" style={poppins}>
          {newQp}/{targetQp} QP
        </div>
      </Link>
    </motion.div>
  );
}
