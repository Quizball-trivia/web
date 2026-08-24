'use client';

import { motion } from 'motion/react';
import { formatMoney, MIN_BID_INCREMENT } from '../../data';
import { poppins } from '../../constants/auction.constants';
import { useLocale } from '@/contexts/LocaleContext';

/**
 * The whole bid surface: a single raise button. Opening a lot bids the starting
 * price outright; every later turn raises by exactly one {@link MIN_BID_INCREMENT}.
 * `minBid` already encodes both cases (server-side `getMinBid`), so the button
 * always submits `minBid` — only the label changes.
 */
export function QuickBidPanel({
  minBid,
  maxBid,
  currentBudget,
  isOpeningBid,
  onBid,
}: {
  minBid: number;
  maxBid: number;
  currentBudget: number;
  /** No standing bid yet — this bid opens the lot at the starting price. */
  isOpeningBid: boolean;
  onBid: (amount: number) => void;
}) {
  const { t } = useLocale();

  // Budget reserve (slots still to fill) can put even the minimum out of reach.
  const canAfford = minBid <= maxBid;
  const budgetAfter = currentBudget - minBid;

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="w-full space-y-2.5">
      <motion.button
        type="button"
        whileTap={canAfford ? { scale: 0.97 } : undefined}
        disabled={!canAfford}
        onClick={() => canAfford && onBid(minBid)}
        className={`relative flex w-full flex-col items-center justify-center gap-1 rounded-[16px] px-4 py-5 text-white shadow-none transition-colors ${
          canAfford ? 'bg-brand-green hover:bg-brand-green/90' : 'cursor-not-allowed bg-white/10 text-white/30'
        }`}
      >
        <span className="text-xl font-black uppercase leading-none" style={poppins}>
          {isOpeningBid
            ? t('auctionGame.bidAmount', { amount: formatMoney(minBid) })
            : t('auctionGame.raiseBy', { amount: formatMoney(MIN_BID_INCREMENT) })}
        </span>
        <span className="text-xs font-semibold leading-none text-white/85" style={poppins}>
          {canAfford
            ? isOpeningBid
              ? t('auctionGame.leftAmount', { amount: formatMoney(budgetAfter) })
              : t('auctionGame.bidTotalAmount', { amount: formatMoney(minBid) })
            : t('auctionGame.cannotAffordRaise')}
        </span>
      </motion.button>

      {/* Budget info */}
      <div className="flex justify-between px-1 text-xs font-semibold text-white/70 sm:text-sm" style={poppins}>
        <span>{t('auctionGame.budgetAmount', { amount: formatMoney(currentBudget) })}</span>
        <span>{t('auctionGame.maxBidAmount', { amount: formatMoney(maxBid) })}</span>
      </div>
    </motion.div>
  );
}
