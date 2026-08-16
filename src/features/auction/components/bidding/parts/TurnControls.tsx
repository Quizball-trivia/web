'use client';

import { motion } from 'motion/react';
import { useLocale } from '@/contexts/LocaleContext';
import { formatMoney, MIN_BID_INCREMENT } from '../../../data';
import type { AuctionActions } from '../../../hooks/useAuctionGame';

/**
 * The human's turn controls: a "waiting" spinner (action in flight), or a clean
 * one-row [Fold] [Bid] pair. The bid button submits `minBid` (server-computed:
 * opening = starting price, later turns = +one increment); it shows the raise on
 * top and the resulting total underneath. Fold is hidden for a forced opener.
 * Shared by both bidding layouts.
 */
export function TurnControls({
  minBid,
  maxBid,
  currentBudget,
  mustOpen,
  pendingTurnAction,
  onBid,
  onFold,
  showTurnLabel = false,
}: {
  minBid: number;
  maxBid: number;
  currentBudget: number;
  mustOpen: boolean;
  pendingTurnAction: AuctionActions['pendingTurnAction'] | null;
  onBid: (amount: number) => void;
  onFold: () => void;
  showTurnLabel?: boolean;
}) {
  const { t } = useLocale();

  if (pendingTurnAction) {
    return (
      <div className="flex items-center justify-center gap-2 rounded-[14px] bg-black/25 px-5 py-2.5 text-center font-poppins text-sm font-semibold uppercase text-white/45">
        <span className="size-3 shrink-0 animate-spin rounded-full border-2 border-white/15 border-t-brand-yellow" />
        {pendingTurnAction.kind === 'bid' ? t('auctionGame.bidPlacedWaiting') : t('auctionGame.foldPlacedWaiting')}
      </div>
    );
  }

  const canAfford = minBid <= maxBid;
  const budgetAfter = currentBudget - minBid;

  return (
    <div className="space-y-2">
      {showTurnLabel && (
        <div className="text-center font-poppins text-xs font-black uppercase tracking-wide text-brand-yellow">
          {t('auctionGame.yourTurn')}
        </div>
      )}
      <div className="flex gap-2">
        {!mustOpen && (
          <button
            type="button"
            onClick={onFold}
            className="flex h-12 shrink-0 items-center justify-center rounded-2xl bg-brand-red px-6 font-poppins text-sm font-black uppercase text-white transition-colors hover:bg-brand-red/90"
          >
            {t('auctionGame.fold')}
          </button>
        )}
        <motion.button
          type="button"
          whileTap={canAfford ? { scale: 0.98 } : undefined}
          disabled={!canAfford}
          onClick={() => canAfford && onBid(minBid)}
          className={`flex h-12 flex-1 flex-col items-center justify-center rounded-2xl font-poppins leading-none transition-colors ${
            canAfford ? 'bg-brand-green text-white hover:bg-brand-green/90' : 'cursor-not-allowed bg-white/10 text-white/30'
          }`}
        >
          <span className="text-lg font-black uppercase">
            {mustOpen ? t('auctionGame.bidAmount', { amount: formatMoney(minBid) }) : t('auctionGame.raiseBy', { amount: formatMoney(MIN_BID_INCREMENT) })}
          </span>
          <span className="mt-0.5 text-[11px] font-semibold text-white/85">
            {canAfford
              ? mustOpen
                ? t('auctionGame.leftAmount', { amount: formatMoney(budgetAfter) })
                : t('auctionGame.bidTotalAmount', { amount: formatMoney(minBid) })
              : t('auctionGame.cannotAffordRaise')}
          </span>
        </motion.button>
      </div>
    </div>
  );
}
