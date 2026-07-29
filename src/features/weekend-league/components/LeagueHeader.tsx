'use client';

import { motion } from 'motion/react';
import { poppins } from '../constants';
import { PRIZES } from '../mock-data';

/** Weekend League wordmark + tagline + headline-prize hook. */
export function LeagueHeader() {
  const topPrize = PRIZES[0];
  return (
    <header className="relative overflow-hidden rounded-[24px] border-2 border-brand-gold/25 bg-gradient-to-br from-brand-blue/25 via-surface-card-deep to-surface-card-deep px-5 py-6 text-center">
      <div aria-hidden className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_-10%,rgba(255,215,0,0.18),transparent_60%)]" />
      <div className="relative">
        <div className="font-poppins text-[11px] font-black uppercase tracking-[0.28em] text-brand-gold">Weekly Tournament</div>
        <motion.h1
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="mt-1 font-poppins text-3xl font-black uppercase leading-none text-white sm:text-4xl"
          style={poppins}
        >
          Weekend League
        </motion.h1>
        <p className="mx-auto mt-2 max-w-xs font-poppins text-[13px] font-semibold text-white/60">
          Qualify Saturday. Battle Sunday. Win the title.
        </p>
        <div className="mt-4 inline-flex items-center gap-2 rounded-full border border-brand-gold/30 bg-brand-gold/10 px-3.5 py-1.5">
          <span className="text-base leading-none">{topPrize.icon}</span>
          <span className="font-poppins text-[11px] font-bold uppercase tracking-wide text-white/90">
            Champion wins {topPrize.prize}
          </span>
        </div>
      </div>
    </header>
  );
}
