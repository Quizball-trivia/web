'use client';

import { motion } from 'motion/react';
import { CalendarDays, Trophy } from 'lucide-react';

import { useLocale } from '@/contexts/LocaleContext';

const MIN_RANK_TIER = 'Bench';

export function UpcomingEventScreen() {
  const { t } = useLocale();

  return (
    <div className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden px-6 pb-24 font-fun">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute left-1/2 top-1/3 h-[500px] w-[500px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-brand-blue/[0.05] blur-[100px]" />
        <div className="absolute bottom-1/4 left-1/3 h-[300px] w-[300px] rounded-full bg-brand-green/[0.03] blur-[80px]" />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45 }}
        className="relative w-full max-w-md rounded-[24px] bg-brand-blue px-6 py-8 text-center shadow-2xl sm:px-10"
      >
        <motion.div
          initial={{ scale: 0, rotate: -12 }}
          animate={{ scale: 1, rotate: 0 }}
          transition={{ delay: 0.15, type: 'spring', stiffness: 220, damping: 15 }}
          className="mx-auto mb-5 flex justify-center"
        >
          <Trophy className="size-10 text-brand-yellow" />
        </motion.div>

        <div className="font-poppins text-[11px] font-bold uppercase tracking-[0.3em] text-brand-yellow">
          {t('events.upcomingKicker')}
        </div>
        <h1 className="mt-2 font-poppins text-2xl font-bold uppercase leading-tight text-white sm:text-3xl">
          {t('events.upcomingTitle')}
        </h1>

        <div className="mt-6 flex items-center justify-center gap-2 text-sm font-semibold text-white/90">
          <CalendarDays className="size-4 shrink-0 text-brand-yellow" aria-hidden />
          <span>
            {t('events.startsLabel')}: <span className="text-white">{t('events.startsValue')}</span>
          </span>
        </div>

        <div className="mt-4 flex items-center justify-center gap-2">
          <span className="text-xs font-bold uppercase tracking-wide text-white/70">
            {t('events.minRankLabel')}
          </span>
          <span className="inline-flex items-center gap-1.5 rounded-full bg-white/15 px-3 py-1 font-poppins text-xs font-bold uppercase tracking-wide text-white">
            {MIN_RANK_TIER}
          </span>
        </div>

        <p className="mx-auto mt-5 max-w-[21rem] text-[13px] font-semibold leading-snug text-white/75">
          {t('events.qualifyHint', { tier: MIN_RANK_TIER })}
        </p>

      </motion.div>
    </div>
  );
}
