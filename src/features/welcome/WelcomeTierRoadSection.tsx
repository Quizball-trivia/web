'use client';

import { motion } from 'motion/react';
import { Button } from '@/components/ui/button';
import { useLocale } from '@/contexts/LocaleContext';
import { RANKED_TIER_BANDS } from '@/utils/rankedTier';
import { tierConfig, type TierName } from '@/utils/tierVisuals';

interface WelcomeTierRoadSectionProps {
  onStartClimbing: () => void;
}

export function WelcomeTierRoadSection({ onStartClimbing }: WelcomeTierRoadSectionProps) {
  const { t } = useLocale();
  return (
    <section className="py-12 md:py-20 overflow-hidden">
      <div className="max-w-6xl mx-auto px-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-10"
        >
          <h2 className="text-2xl md:text-3xl font-black text-white mb-3">
            {t('welcome.tierRoadTitle')}
          </h2>
          <p className="text-sm md:text-base text-white/60 font-medium">
            {t('welcome.tierRoadSubtitle')}
          </p>
        </motion.div>

        <div className="overflow-x-auto pb-4 -mx-6 px-6 scrollbar-hide" style={{ WebkitOverflowScrolling: 'touch' }}>
          <div className="relative flex items-center min-w-max mx-auto" style={{ width: 'fit-content' }}>
            <div className="absolute left-6 right-6 top-1/2 -translate-y-[14px] h-0.5 bg-gradient-to-r from-slate-600/40 via-white/15 to-fuchsia-500/40" />

            {[...RANKED_TIER_BANDS].reverse().map((band, i) => {
              const visual = tierConfig[band.tier as TierName];
              const isTop = band.tier === 'GOAT';
              const totalTiers = RANKED_TIER_BANDS.length;
              return (
                <motion.div
                  key={band.tier}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.06 }}
                  className="flex flex-col items-center px-2 md:px-3 relative"
                  style={{ minWidth: i === totalTiers - 1 ? '90px' : '76px' }}
                >
                  <div
                    className={`relative z-10 flex items-center justify-center shrink-0 rounded-full border-2 mb-2 ${
                      isTop
                        ? 'size-14 md:size-16 text-2xl md:text-3xl bg-gradient-to-br from-fuchsia-500/30 to-fuchsia-400/10 border-fuchsia-400/50 shadow-[0_0_20px_rgba(217,70,239,0.3)]'
                        : 'size-10 md:size-12 text-lg md:text-xl border-white/15 bg-surface-auth-input'
                    }`}
                  >
                    {visual?.emoji}
                  </div>

                  <div className={`text-center font-black text-[10px] md:text-xs uppercase tracking-wide leading-tight ${
                    isTop ? 'text-fuchsia-300' : visual?.color ?? 'text-white'
                  }`}>
                    {band.tier}
                  </div>

                  <div className="text-[9px] md:text-[10px] text-white/60 font-semibold text-center mt-0.5 whitespace-nowrap">
                    {band.maxRpExclusive === null
                      ? `${band.minRp.toLocaleString()}+`
                      : `${band.minRp.toLocaleString()}`}
                  </div>
                </motion.div>
              );
            })}
          </div>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 10 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ delay: 0.6 }}
          className="mt-10 text-center"
        >
          <Button
            onClick={onStartClimbing}
            className="h-14 rounded-[20px] bg-brand-green px-10 font-poppins text-lg font-semibold uppercase tracking-wide text-white shadow-none transition-colors hover:bg-brand-green/90 hover:shadow-none"
          >
            {t('welcome.startClimbing')}
          </Button>
        </motion.div>
      </div>
    </section>
  );
}
