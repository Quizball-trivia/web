'use client';

import { useLocale } from '@/contexts/LocaleContext';
import type { AuctionPlayer, PositionGroup, SitOutReason } from '../../../types';
import { usePositionLabel } from '../../../hooks/usePositionLabel';

/**
 * Shown when it's NOT the human's turn: first WHY they can't act (forfeited /
 * eliminated / position already filled for this lot), then who everyone is
 * waiting on (or that they folded). Identical in both bidding layouts.
 */
export function SitOutWaiting({
  sitOutReason,
  positionGroup,
  posColor,
  humanFolded,
  currentTurnPlayer,
}: {
  sitOutReason: SitOutReason;
  positionGroup: PositionGroup;
  posColor: string;
  humanFolded: boolean;
  currentTurnPlayer: AuctionPlayer | null;
}) {
  const { t } = useLocale();
  const posLabel = usePositionLabel();

  return (
    <div className="space-y-2">
      {sitOutReason && (
        <div
          className="flex items-center justify-center rounded-[14px] border-2 px-5 py-2.5 text-center font-poppins text-sm font-black uppercase"
          style={{ borderColor: `${posColor}55`, backgroundColor: `${posColor}14`, color: posColor }}
        >
          {sitOutReason === 'forfeited'
            ? t('auctionGame.removedWatching')
            : sitOutReason === 'eliminated'
              ? t('auctionGame.eliminatedWatching')
              : t('auctionGame.positionFilledWatching', { position: posLabel(positionGroup) })}
        </div>
      )}
      <div
        aria-live="polite"
        className="flex items-center justify-center gap-2 rounded-[14px] bg-black/25 px-5 py-2.5 text-center font-poppins text-sm font-semibold uppercase text-white/45"
      >
        {humanFolded ? (
          t('auctionGame.youFolded')
        ) : currentTurnPlayer ? (
          <>
            <span className="size-2 shrink-0 animate-pulse rounded-full bg-brand-yellow" />
            {t('auctionGame.waitingForTurn', { name: currentTurnPlayer.username })}
          </>
        ) : (
          t('auctionGame.watching')
        )}
      </div>
    </div>
  );
}
