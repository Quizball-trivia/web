'use client';

import Image from 'next/image';
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
              const slug = band.tier.toLowerCase().replace(/[\s-]+/g, '_');
              return (
                <motion.div
                  key={band.tier}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.06 }}
                  className="flex flex-col items-center px-1.5 md:px-2.5 relative"
                  style={{ minWidth: isTop ? '100px' : '80px' }}
                >
                  {/* Card frame with emoji overlay */}
                  <div className={`relative z-10 mb-2 ${isTop ? 'w-[72px] md:w-[88px]' : 'w-[56px] md:w-[68px]'}`}>
                    <Image
                      src={`/assets/ranks/${slug}_frame.png`}
                      alt={band.tier}
                      width={isTop ? 88 : 68}
                      height={isTop ? 120 : 92}
                      className="w-full h-auto object-contain"
                    />
                    <span className={`absolute inset-0 flex items-center justify-center ${
                      isTop ? 'text-2xl md:text-3xl' : 'text-lg md:text-xl'
                    }`}>
                      {visual?.emoji}
                    </span>
                  </div>

                  <div className={`text-center font-black text-[9px] md:text-[11px] uppercase tracking-wide leading-tight ${
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
