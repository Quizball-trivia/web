'use client';

import { motion, AnimatePresence } from 'motion/react';
import type { AuctionPlayer } from '../../types';
import { formatMoney } from '../../data';
import { poppins } from '../../constants/auction.constants';
import { useLocale } from '@/contexts/LocaleContext';
import { DropInBadge } from '../shared/DropInBadge';

/** Last-4 bids list; green border = you, red = opponents. Drops an OUTBID! badge
 *  on the human's most recent row when they've been outbid. */
export function BidTicker({
  bids,
  players,
  humanPlayerId,
  outbid = false,
}: {
  bids: { playerId: string; amount: number }[];
  players: AuctionPlayer[];
  humanPlayerId: string;
  /** When true, an OUTBID! badge drops in tilted over the human's last bid row. */
  outbid?: boolean;
}) {
  const { t } = useLocale();
  const recentBids = bids.slice(-4);
  if (recentBids.length === 0) return null;
  // Index (within recentBids) of the human's most recent bid row.
  const humanRowIndex = recentBids.map((b) => b.playerId).lastIndexOf(humanPlayerId);

  return (
    <div className="w-full space-y-1">
      <AnimatePresence initial={false}>
        {recentBids.map((bid, i) => {
          const player = players.find((p) => p.id === bid.playerId);
          const isHuman = bid.playerId === humanPlayerId;
          const isLatest = i === recentBids.length - 1;
          const showOutbid = outbid && i === humanRowIndex;

          return (
            <div key={`${bid.playerId}-${bid.amount}`} className="relative">
              {/* OUTBID! badge — drops in + bounces, lands tilted on the human's row */}
              {showOutbid && (
                <DropInBadge
                  from={-260}
                  landingRotate={4}
                  duration={0.85}
                  className="pointer-events-none absolute -top-2.5 right-2 z-30 flex items-center gap-1 rounded-lg bg-brand-red px-2.5 py-1 font-poppins text-xs font-black uppercase tracking-wide text-white shadow-[0_4px_14px_rgba(255,75,75,0.55)]"
                >
                  <span>⚠️</span>
                  {t('auctionGame.outbid')}
                </DropInBadge>
              )}
              <motion.div
                initial={{ opacity: 0, x: -30, height: 0 }}
                animate={{ opacity: isLatest ? 1 : 0.6, x: 0, height: 'auto' }}
                exit={{ opacity: 0, x: 30, height: 0 }}
                transition={{ type: 'spring', stiffness: 400, damping: 25 }}
                className={`flex items-center gap-2.5 rounded-[12px] border-2 px-3.5 py-2.5 ${
                  isHuman ? 'border-brand-green bg-brand-green/5' : 'border-brand-red-deep bg-brand-red/5'
                } ${isLatest ? 'shadow-[0_0_14px_rgba(0,0,0,0.35)]' : ''}`}
              >
                {isHuman && (
                  <span className="shrink-0 rounded-md bg-brand-green px-2 py-0.5 text-[11px] font-black uppercase text-white" style={poppins}>
                    {t('auctionGame.you')}
                  </span>
                )}
                <span className="text-sm font-bold truncate text-white/85" style={poppins}>
                  {isHuman ? '' : player?.username}
                </span>
                <span className="ml-auto text-base font-black tabular-nums text-white" style={poppins}>
                  {formatMoney(bid.amount)}
                </span>
              </motion.div>
            </div>
          );
        })}
      </AnimatePresence>
    </div>
  );
}
