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

function SectionHeading({ emoji, children }: { emoji: string; children: React.ReactNode }) {
  return (
    <h3 className="text-xs font-black uppercase tracking-wide text-white mb-1.5">
      {emoji} {children}
    </h3>
  );
}

function RpTable({ rows }: { rows: { label: string; value: string; positive?: boolean }[] }) {
  return (
    <div className="rounded-xl border border-white/10 overflow-hidden">
      {rows.map((row, i) => (
        <div
          key={i}
          className={cn(
            'flex items-center justify-between px-3 py-1.5 text-xs',
            i % 2 === 0 ? 'bg-white/[0.03]' : 'bg-transparent',
          )}
        >
          <span className="text-white/70">{row.label}</span>
          <span className={cn('font-bold tabular-nums', row.positive === false ? 'text-red-400' : 'text-emerald-400')}>
            {row.value}
          </span>
        </div>
      ))}
    </div>
  );
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
          <button type="button" className={`rounded-full px-3 py-1 text-[10px] sm:text-xs font-black uppercase tracking-wide text-white transition-colors ${className ?? ''}`} style={{ backgroundColor: '#FF6C0A' }}>
            {t('welcome.wcPromoRules')}
          </button>
        )}
      </DialogTrigger>
      <DialogContent
        className={cn(
          'max-w-lg w-[95vw] rounded-[24px] border-0 bg-brand-blue',
          'max-h-[85vh] overflow-y-auto p-6 sm:p-8',
          '[&>button]:hidden',
        )}
      >
        <div className="absolute top-5 right-5 z-30">
          <ModalCloseButton onClose={() => setOpen(false)} className="!static" />
        </div>
        <DialogHeader>
          <DialogTitle className="flex items-center justify-center gap-2 text-xl sm:text-2xl font-black text-white text-center pr-10">
            <Image src="/assets/brand/world-cup-trophy.webp" alt="" width={28} height={28} className="h-6 w-auto shrink-0 object-contain" />
            {t('welcome.wcPromoRulesTitle')}
          </DialogTitle>
          <DialogDescription className="sr-only">{t('welcome.wcPromoRulesDescription')}</DialogDescription>
        </DialogHeader>

        <div className="mt-4 space-y-5 text-sm text-white/80 leading-relaxed">
          {/* Duration */}
          <div>
            <SectionHeading emoji="📅">{t('welcome.wcPromoRulesDuration')}</SectionHeading>
            <p>{t('welcome.wcPromoRulesDurationText')}</p>
          </div>

          {/* Prizes */}
          <div>
            <SectionHeading emoji="🎁">{t('welcome.wcPromoRulesPrizes')}</SectionHeading>
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

          {/* Ranked Match Tickets */}
          <div>
            <SectionHeading emoji="🎮">{t('welcome.wcPromoRulesTicketsTitle')}</SectionHeading>
            <p>{t('welcome.wcPromoRulesTicketsText')}</p>
            <p className="mt-1.5 text-xs font-bold text-white">{t('welcome.wcPromoRulesTicketsMax')}</p>
            <div className="mt-3 rounded-xl border border-white/10 bg-white/[0.03] p-3 space-y-2">
              <p className="text-xs text-white/60">{t('welcome.wcPromoRulesTicketsForfeit')}</p>
              <ul className="space-y-1 list-disc list-inside text-xs text-white/50">
                <li>{t('welcome.wcPromoRulesTicketsForfeitNo1')}</li>
                <li>{t('welcome.wcPromoRulesTicketsForfeitNo2')}</li>
                <li>{t('welcome.wcPromoRulesTicketsForfeitNo3')}</li>
              </ul>
              <p className="text-[11px] text-white/40 italic">{t('welcome.wcPromoRulesTicketsForfeitWhy')}</p>
            </div>
          </div>

          {/* Ranked Point System */}
          <div>
            <SectionHeading emoji="📈">{t('welcome.wcPromoRulesRpTitle')}</SectionHeading>

            {/* Match Result */}
            <p className="text-xs font-bold text-white mb-1.5">{t('welcome.wcPromoRulesRpMatch')}</p>
            <RpTable rows={[
              { label: t('welcome.wcPromoRulesRpRegularWin'), value: '+50', positive: true },
              { label: t('welcome.wcPromoRulesRpPenaltyWin'), value: '+35', positive: true },
              { label: t('welcome.wcPromoRulesRpRegularLoss'), value: '-25', positive: false },
              { label: t('welcome.wcPromoRulesRpPenaltyLoss'), value: '-15', positive: false },
              { label: t('welcome.wcPromoRulesRpForfeit'), value: '-50', positive: false },
              { label: t('welcome.wcPromoRulesRpOppForfeit'), value: '+50', positive: true },
            ]} />
          </div>

          {/* Winning Margin Bonus */}
          <div>
            <p className="text-xs font-bold text-white mb-1.5">{t('welcome.wcPromoRulesMarginTitle')}</p>
            <RpTable rows={[
              { label: t('welcome.wcPromoRulesMarginBy1'), value: '+0', positive: true },
              { label: t('welcome.wcPromoRulesMarginBy2'), value: '+15', positive: true },
              { label: t('welcome.wcPromoRulesMarginBy3'), value: '+30', positive: true },
              { label: t('welcome.wcPromoRulesMarginBy4'), value: '+40', positive: true },
            ]} />
            <p className="mt-1.5 text-xs text-white/50">{t('welcome.wcPromoRulesMarginText')}</p>
          </div>

          {/* Opponent Strength Bonus */}
          <div>
            <p className="text-xs font-bold text-white mb-1.5">{t('welcome.wcPromoRulesStrengthTitle')}</p>
            <RpTable rows={[
              { label: t('welcome.wcPromoRulesStrengthCondition'), value: '+10', positive: true },
            ]} />
            <p className="mt-1.5 text-xs text-white/50">{t('welcome.wcPromoRulesStrengthText')}</p>
            <ul className="mt-1 space-y-0.5 list-disc list-inside text-xs text-white/50">
              <li>{t('welcome.wcPromoRulesStrengthEx1')}</li>
              <li>{t('welcome.wcPromoRulesStrengthEx2')}</li>
            </ul>
          </div>

          {/* Fair Play Policy */}
          <div>
            <SectionHeading emoji="⚠️">{t('welcome.wcPromoRulesFairTitle')}</SectionHeading>
            <p>{t('welcome.wcPromoRulesFairText')}</p>
            <p className="mt-2 text-xs text-white/60">{t('welcome.wcPromoRulesFairReview')}</p>
            <ul className="mt-1 space-y-0.5 list-disc list-inside text-xs text-white/50">
              <li>{t('welcome.wcPromoRulesFair1')}</li>
              <li>{t('welcome.wcPromoRulesFair2')}</li>
              <li>{t('welcome.wcPromoRulesFair3')}</li>
              <li>{t('welcome.wcPromoRulesFair4')}</li>
            </ul>
            <p className="mt-2 text-xs font-medium text-red-400/80">{t('welcome.wcPromoRulesFairWarn')}</p>
          </div>

          {/* Footer */}
          <div className="border-t border-white/10 pt-4">
            <p className="flex items-start gap-2 text-center text-xs text-white/50">
              <Image src="/assets/brand/world-cup-trophy.webp" alt="" width={16} height={16} className="h-3.5 w-auto shrink-0 object-contain opacity-70 mt-0.5" />
              <span>{t('welcome.wcPromoRulesFooter')}</span>
            </p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
