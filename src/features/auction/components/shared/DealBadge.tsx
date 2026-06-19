'use client';

import { useLocale } from '@/contexts/LocaleContext';
import { DropInBadge } from './DropInBadge';

/**
 * STEAL / BARGAIN / FAIR / OVERPAID / ROBBERY badge, keyed on the paid/true-value
 * ratio. Drops in tilted on the sold price (position via the parent's relative box).
 */
export function DealBadge({ paid, value }: { paid: number; value: number }) {
  const { t } = useLocale();
  const ratio = value > 0 ? paid / value : 1;

  let label: string;
  let bg: string;
  if (ratio < 0.7) {
    label = t('auctionGame.steal');
    bg = '#1645FF'; // brand blue
  } else if (ratio < 0.95) {
    label = t('auctionGame.bargain');
    bg = '#58CC02';
  } else if (ratio <= 1.15) {
    label = t('auctionGame.fairDeal');
    bg = '#FF9600'; // orange
  } else if (ratio <= 1.4) {
    label = t('auctionGame.overpaid');
    bg = '#FF6C0A';
  } else {
    label = t('auctionGame.robbery');
    bg = '#FF4B4B'; // red
  }

  return (
    <div className="pointer-events-none absolute -top-3 left-1/2 z-30 -translate-x-1/2">
      <DropInBadge
        from={-220}
        landingRotate={5}
        style={{ backgroundColor: bg }}
        className="whitespace-nowrap rounded-lg px-3 py-1 font-poppins text-xs font-black uppercase tracking-wide text-white shadow-[0_4px_14px_rgba(0,0,0,0.5)]"
      >
        {label}
      </DropInBadge>
    </div>
  );
}
