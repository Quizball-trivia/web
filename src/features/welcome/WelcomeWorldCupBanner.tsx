'use client';

import Image from 'next/image';
import { useLocale } from '@/contexts/LocaleContext';
import { WorldCupRulesButton } from '@/components/shared/WorldCupRulesModal';

export function WelcomeWorldCupBanner() {
  const { t } = useLocale();

  return (
    <div>
      {/* Title */}
      <div className="flex items-center gap-2.5 mb-3">
        <Image
          src="/assets/brand/world-cup-trophy.webp"
          alt=""
          width={32}
          height={32}
          className="h-7 md:h-8 w-auto"
        />
        <div>
          <h2 className="text-lg md:text-xl font-black uppercase tracking-wide text-white leading-none">
            {t('welcome.wcPromoTitle')}
          </h2>
          <span className="text-[10px] md:text-xs font-bold text-brand-yellow">
            {t('welcome.wcPromoDateRange')}
          </span>
        </div>
      </div>

      {/* Description */}
      <p className="text-xs md:text-sm text-white/50 mb-4 max-w-md">
        {t('welcome.wcPromoDescription')}
      </p>

      {/* Prizes */}
      <div className="flex flex-col gap-2">
        <div className="flex items-center gap-3 rounded-xl border border-brand-yellow/15 bg-brand-yellow/5 px-3 py-2.5">
          <span className="text-lg">🥇</span>
          <span className="text-sm font-bold text-white flex-1">{t('welcome.wcPromoPrize1')}</span>
          <div className="w-10 h-10 flex items-center justify-center shrink-0">
            <Image src="/assets/world-cup-promotion/Layer 6.png" alt="" width={40} height={48} className="max-h-10 w-auto object-contain" />
          </div>
        </div>
        <div className="flex items-center gap-3 rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2.5">
          <span className="text-lg">🥈</span>
          <span className="text-sm font-bold text-white flex-1">{t('welcome.wcPromoPrize2')}</span>
          <div className="w-10 h-10 flex items-center justify-center shrink-0">
            <Image src="/assets/world-cup-promotion/Sony-PlayStation-5-Digital-Edition-Console-Wholesale-Product-Hero2.png" alt="" width={40} height={48} className="max-h-10 w-auto object-contain" />
          </div>
        </div>
        <div className="flex items-center gap-3 rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2.5">
          <span className="text-lg">🥉</span>
          <span className="text-sm font-bold text-white flex-1">{t('welcome.wcPromoPrize3')}</span>
          <div className="w-10 h-10 flex items-center justify-center shrink-0">
            <Image src="/assets/world-cup-promotion/pngtree-apple-airpods-pro-in-a-charging-case-with-the-lid-open-png-image_16254552.png" alt="" width={36} height={36} className="max-h-10 w-auto object-contain" />
          </div>
        </div>
      </div>

      {/* Merch + Rules */}
      <div className="mt-3 flex items-center justify-between">
        <p className="text-[10px] md:text-xs text-white/40">
          🎁 {t('welcome.wcPromoMerch')}
        </p>
        <WorldCupRulesButton variant="text" />
      </div>
    </div>
  );
}
