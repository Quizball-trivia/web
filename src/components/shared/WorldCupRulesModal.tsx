'use client';

import { useState } from 'react';
import Image from 'next/image';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { ModalCloseButton } from '@/components/shared/ModalCloseButton';
import { cn } from '@/lib/utils';
import { useLocale } from '@/contexts/LocaleContext';

interface WorldCupRulesButtonProps {
  variant?: 'pill' | 'text' | 'icon';
  className?: string;
}

export function WorldCupRulesButton({ variant = 'pill', className }: WorldCupRulesButtonProps) {
  const [open, setOpen] = useState(false);
  const { t } = useLocale();

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {variant === 'text' ? (
          <button type="button" className={`text-[10px] sm:text-xs font-bold uppercase tracking-wide text-brand-yellow underline underline-offset-2 hover:text-brand-yellow/80 ${className ?? ''}`}>
            {t('welcome.wcPromoRules')}
          </button>
        ) : variant === 'icon' ? (
          <button type="button" className={`flex items-center justify-center size-7 sm:size-8 rounded-full bg-white/10 text-white/60 hover:bg-white/15 hover:text-white transition-colors text-xs font-bold ${className ?? ''}`}>
            ?
          </button>
        ) : (
          <button type="button" className={`rounded-full bg-brand-orange px-3 py-1 text-[10px] sm:text-xs font-black uppercase tracking-wide text-white hover:bg-brand-orange/90 transition-colors ${className ?? ''}`}>
            {t('welcome.wcPromoRules')}
          </button>
        )}
      </DialogTrigger>
      <DialogContent
        className={cn(
          'max-w-lg w-[95vw] rounded-[24px] border-0 bg-brand-blue',
          'max-h-[85vh] overflow-y-auto p-6 sm:p-8',
          '[&>button]:hidden', // hide shadcn's default close — we render our own red X
        )}
      >
        <div className="absolute top-5 right-5 z-30">
          <ModalCloseButton onClose={() => setOpen(false)} className="!static" />
        </div>
        <DialogHeader>
          <DialogTitle className="flex items-center justify-center gap-2 text-xl sm:text-2xl font-black text-white text-center">
            <Image src="/assets/brand/world-cup-trophy.webp" alt="" width={28} height={28} className="h-6 w-auto object-contain" />
            {t('welcome.wcPromoRulesTitle')}
          </DialogTitle>
          <DialogDescription className="sr-only">World Cup event rules and prizes</DialogDescription>
        </DialogHeader>

        <div className="mt-4 space-y-5 text-sm text-white/80 leading-relaxed">
          {/* Duration */}
          <div>
            <h3 className="text-xs font-black uppercase tracking-wide text-white mb-1">📅 {t('welcome.wcPromoRulesDuration')}</h3>
            <p>{t('welcome.wcPromoDateRange')}</p>
          </div>

          {/* How it works */}
          <div>
            <h3 className="text-xs font-black uppercase tracking-wide text-white mb-1">⚽ {t('welcome.wcPromoRulesHow')}</h3>
            <p>{t('welcome.wcPromoRulesHowText')}</p>
          </div>

          {/* Prizes */}
          <div>
            <h3 className="text-xs font-black uppercase tracking-wide text-white mb-2">🎁 {t('welcome.wcPromoRulesPrizes')}</h3>
            <div className="space-y-2">
              <div className="flex items-center gap-3 rounded-xl border border-brand-yellow/15 bg-brand-yellow/5 px-3 py-2.5">
                <span className="text-lg">🥇</span>
                <span className="text-sm font-bold text-white flex-1">{t('welcome.wcPromoPrize1')}</span>
                <Image src="/assets/world-cup-promotion/Layer 6.png" alt="" width={32} height={40} className="h-8 w-auto object-contain" />
              </div>
              <div className="flex items-center gap-3 rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2.5">
                <span className="text-lg">🥈</span>
                <span className="text-sm font-bold text-white flex-1">{t('welcome.wcPromoPrize2')}</span>
                <Image src="/assets/world-cup-promotion/Sony-PlayStation-5-Digital-Edition-Console-Wholesale-Product-Hero2.png" alt="" width={32} height={40} className="h-8 w-auto object-contain" />
              </div>
              <div className="flex items-center gap-3 rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2.5">
                <span className="text-lg">🥉</span>
                <span className="text-sm font-bold text-white flex-1">{t('welcome.wcPromoPrize3')}</span>
                <Image src="/assets/world-cup-promotion/pngtree-apple-airpods-pro-in-a-charging-case-with-the-lid-open-png-image_16254552.png" alt="" width={28} height={28} className="h-6 w-auto object-contain" />
              </div>
              <div className="flex items-center gap-3 rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2.5">
                <span className="text-lg">🏅</span>
                <span className="text-sm font-bold text-white/70">{t('welcome.wcPromoMerch')}</span>
              </div>
            </div>
          </div>

          {/* Ranked matches */}
          <div>
            <h3 className="text-xs font-black uppercase tracking-wide text-white mb-1">🎮 {t('welcome.wcPromoRulesMatches')}</h3>
            <ul className="space-y-1 list-disc list-inside text-white/70">
              <li>{t('welcome.wcPromoRulesTickets')}</li>
              <li>{t('welcome.wcPromoRulesWin')}</li>
              <li>{t('welcome.wcPromoRulesLeaderboard')}</li>
            </ul>
          </div>

          {/* Footer */}
          <p className="flex items-center justify-center gap-1.5 text-center text-xs text-white/40 pt-2">
            <Image src="/assets/brand/world-cup-trophy.webp" alt="" width={16} height={16} className="h-3.5 w-auto object-contain opacity-70" />
            {t('welcome.wcPromoRulesFooter')}
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}
