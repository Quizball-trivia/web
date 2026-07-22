'use client';

import { motion } from 'motion/react';
import type { AuctionPlayer, AuctionRound } from '../../types';
import { formatMoney, needsPosition } from '../../data';
import { useLocale } from '@/contexts/LocaleContext';

type RivalStatus = 'leading' | 'in' | 'folded' | 'out' | 'sitting-out';

const STATUS_STYLE: Record<RivalStatus, { chip: string; label: string }> = {
  leading: { chip: 'border-brand-yellow/60 bg-brand-yellow/10', label: 'text-brand-yellow' },
  in: { chip: 'border-white/12 bg-white/[0.04]', label: 'text-white/60' },
  folded: { chip: 'border-white/8 bg-white/[0.02] opacity-55', label: 'text-white/40' },
  'sitting-out': { chip: 'border-white/8 bg-white/[0.02] opacity-55', label: 'text-white/40' },
  out: { chip: 'border-brand-red/30 bg-brand-red/5 opacity-60', label: 'text-brand-red' },
};

/**
 * Who you are actually bidding against, at a glance.
 *
 * In a 3-player match most of a lot is spent watching, and the board previously
 * said nothing about the other two: you could not see that a rival had folded
 * (so the lot was yours at the current price), how much they had left to outbid
 * you with, or whether a seat was a backfilled bot. All of that lives here.
 */
export function BiddingRivals({
  players,
  round,
  humanPlayerId,
}: {
  players: AuctionPlayer[];
  round: AuctionRound;
  humanPlayerId: string;
}) {
  const { t } = useLocale();
  const rivals = players.filter((p) => p.id !== humanPlayerId);
  if (rivals.length === 0) return null;

  const statusOf = (player: AuctionPlayer): RivalStatus => {
    if (player.forfeited || player.isEliminated) return 'out';
    if (round.foldedIds.includes(player.id)) return 'folded';
    if (!needsPosition(player, round.positionGroup)) return 'sitting-out';
    if (round.highestBidderId === player.id) return 'leading';
    return 'in';
  };

  const statusLabel: Record<RivalStatus, string> = {
    leading: t('auctionGame.rivalLeading'),
    in: t('auctionGame.rivalIn'),
    folded: t('auctionGame.rivalFolded'),
    'sitting-out': t('auctionGame.rivalSittingOut'),
    out: t('auctionGame.rivalOut'),
  };

  return (
    <div data-testid="bidding-rivals" className="grid w-full grid-cols-2 gap-2">
      {rivals.map((rival) => {
        const status = statusOf(rival);
        const style = STATUS_STYLE[status];
        const isTurn = round.currentTurnId === rival.id;

        return (
          <motion.div
            key={rival.id}
            layout
            data-testid={`rival-${rival.id}`}
            data-status={status}
            className={`relative flex min-w-0 flex-col gap-0.5 rounded-[12px] border-2 px-2.5 py-2 ${style.chip} ${
              isTurn ? 'ring-2 ring-brand-yellow/40' : ''
            }`}
          >
            <div className="flex min-w-0 items-center gap-1.5">
              <span className="truncate font-poppins text-xs font-black uppercase text-white/90">
                {rival.username}
              </span>
              {rival.isBot && (
                <span className="shrink-0 rounded bg-white/12 px-1 py-px font-poppins text-[9px] font-black uppercase tracking-wide text-white/60">
                  {t('auctionGame.botTag')}
                </span>
              )}
            </div>
            <div className="flex items-baseline justify-between gap-1.5">
              <span className={`font-poppins text-[10px] font-black uppercase tracking-wide ${style.label}`}>
                {statusLabel[status]}
              </span>
              <span className="font-poppins text-[11px] font-bold tabular-nums text-white/70">
                {formatMoney(rival.budget)}
              </span>
            </div>
          </motion.div>
        );
      })}
    </div>
  );
}
