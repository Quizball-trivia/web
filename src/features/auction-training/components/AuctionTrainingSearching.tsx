'use client';

import { useLocale } from '@/contexts/LocaleContext';

const poppins = { fontFamily: "'Poppins', sans-serif" };

/** The "finding opponents" beat — same look as the live auction search, no socket. */
export function AuctionTrainingSearching() {
  const { t } = useLocale();
  return (
    <div className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden bg-surface-page">
      <div className="relative z-10 flex flex-col items-center gap-5">
        <div className="relative">
          <div className="size-20 animate-spin rounded-full border-[5px] border-white/10 border-t-brand-yellow" />
          <div className="absolute inset-0 flex items-center justify-center">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/assets/brand/goal-ball-small.webp" alt="" aria-hidden="true" draggable={false} width={28} height={28} className="block size-7 object-contain" />
          </div>
        </div>
        <h2 className="font-poppins text-xl font-black uppercase text-white" style={poppins}>
          {t('auctionGame.lookingForOpponents', { count: 2 })}
        </h2>
      </div>
    </div>
  );
}
