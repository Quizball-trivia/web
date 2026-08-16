'use client';

import { Clock } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useLocale } from '@/contexts/LocaleContext';
import { CLUE_STUDY_MS } from '../../../data';
import { CountdownTimer } from '../CountdownTimer';

/**
 * The pre-bidding "study window" countdown. Deliberately a centered, iconized
 * announcement — the old label-left / control-right box read like a text input
 * (users thought they had to type). `variant` swaps colours for the yellow
 * mystery card (`card`) vs the dark stadium overlay (`panel`).
 */
export function StudyCountdown({
  endsAt,
  variant,
}: {
  endsAt: number;
  variant: 'card' | 'panel';
}) {
  const { t } = useLocale();
  // Both variants sit on the brand-blue card: dark inset + bright text, so the
  // countdown never reads blue-on-blue.
  void variant;

  return (
    <div
      className={cn(
        'flex flex-col items-center gap-1.5 rounded-[16px] bg-black/25 px-4 py-2 text-center',
      )}
    >
      <div
        className={cn(
          'flex items-center gap-1.5 font-poppins text-[11px] font-black uppercase tracking-[0.12em] text-white/90',
        )}
      >
        <Clock className="size-3.5" strokeWidth={2.5} />
        {t('auctionGame.biddingOpensIn')}
      </div>
      <CountdownTimer key={String(endsAt)} endsAt={endsAt} totalMs={CLUE_STUDY_MS} />
    </div>
  );
}
