'use client';

import { useId, useMemo, useState } from 'react';
import { motion } from 'motion/react';
import { useLocale } from '@/contexts/LocaleContext';
import { formatMoney, MIN_BID_INCREMENT } from '../../../data';
import type { AuctionActions } from '../../../hooks/useAuctionGame';

/** Custom input is denominated in millions, so 11.6 means $11,600,000. */
const MILLION = 1_000_000;

/**
 * The human's turn controls: a "waiting" spinner (action in flight), or a clean
 * one-row [Fold] [Bid] pair plus an optional custom-amount input.
 *
 * The quick button submits `minBid` (server-computed: opening = starting price,
 * later turns = +one increment) and leads with the resulting *total*. It used to
 * lead with the raise ("+$10M"), but starting prices are real market values and
 * rarely round, so a $1.6M lot raised to $11.6M read as though someone had
 * underbid the increment.
 *
 * The custom input lets a player jump past the minimum in one turn. The server
 * accepts any integer in [minBid, maxBid] (`isBidValid`), so nothing this panel
 * can submit needs a backend change.
 *
 * The opener may pass like anyone else (labelled "Pass" instead of "Fold" on the
 * opening turn — nothing to fold out of yet); if every seat passes the lot goes
 * unsold. Shared by both layouts.
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
  const [customInput, setCustomInput] = useState('');
  const customRangeHintId = useId();

  const parsedCustom = useMemo(() => {
    const trimmed = customInput.trim();
    if (!trimmed) return null;
    // Plain decimal millions only, and at most 6 decimals — one euro. Anything
    // finer is not a representable bid, and rounding it would submit a
    // different amount than the player typed.
    if (!/^\d+(\.\d{1,6})?$/.test(trimmed)) return null;
    const millions = Number(trimmed);
    if (!Number.isFinite(millions)) return null;
    // Whole euros, not display precision: snapping to 0.1M could submit more
    // than was typed, and a narrow [minBid, maxBid] window can sit entirely
    // between two 0.1M steps — 27 prod cards are priced off that grid.
    const amount = Math.round(millions * MILLION);
    return Number.isSafeInteger(amount) ? amount : null;
  }, [customInput]);

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

  // Raising above the minimum needs headroom; opening a lot is always exact.
  const canRaiseAboveMin = canAfford && maxBid > minBid;
  // The hint has to be typeable: formatMoney rounds to 1 decimal, so a
  // 35,050,000 bound renders "$35.0M" — typing that back is below the minimum
  // and gets rejected. Show exact millions, matching the input's own unit.
  const inMillions = (amount: number) => String(Number((amount / MILLION).toFixed(6)));
  const isCustomValid = parsedCustom !== null && parsedCustom >= minBid && parsedCustom <= maxBid;
  const showCustomHint = parsedCustom !== null && !isCustomValid;

  const handleCustomBid = () => {
    if (!isCustomValid || parsedCustom === null) return;
    // Deliberately not cleared: acceptance unmounts these controls anyway, and
    // if the server rejects the bid (turn expired, stale view) the player gets
    // their amount back instead of having to retype it.
    onBid(parsedCustom);
  };

  return (
    <div className="space-y-2">
      {showTurnLabel && (
        <div className="text-center font-poppins text-xs font-black uppercase tracking-wide text-brand-yellow">
          {t('auctionGame.yourTurn')}
        </div>
      )}
      <div className="flex gap-2">
        <button
          type="button"
          onClick={onFold}
          className="flex h-11 shrink-0 items-center justify-center rounded-2xl bg-brand-red px-6 font-poppins text-sm font-black uppercase text-white transition-colors hover:bg-brand-red/90"
        >
          {mustOpen ? t('auctionGame.pass') : t('auctionGame.fold')}
        </button>
        <motion.button
          type="button"
          whileTap={canAfford ? { scale: 0.98 } : undefined}
          disabled={!canAfford}
          onClick={() => canAfford && onBid(minBid)}
          className={`flex h-11 flex-1 flex-col items-center justify-center rounded-2xl font-poppins leading-none transition-colors ${
            canAfford ? 'bg-brand-green text-white hover:bg-brand-green/90' : 'cursor-not-allowed bg-white/10 text-white/30'
          }`}
        >
          <span className="text-lg font-black uppercase">
            {t('auctionGame.bidAmount', { amount: formatMoney(minBid) })}
          </span>
          <span className="mt-0.5 text-[11px] font-semibold text-white/85">
            {!canAfford
              ? t('auctionGame.cannotAffordRaise')
              : mustOpen
                ? t('auctionGame.leftAmount', { amount: formatMoney(budgetAfter) })
                : t('auctionGame.raiseBreakdown', {
                    previous: formatMoney(minBid - MIN_BID_INCREMENT),
                    raise: formatMoney(MIN_BID_INCREMENT),
                  })}
          </span>
        </motion.button>
      </div>

      {/* Custom amount — bid anything from the minimum up to the budget cap. */}
      {canRaiseAboveMin && (
        <div>
          <div className="flex items-stretch gap-1.5 rounded-2xl border-2 border-white/10 bg-white/5 p-1.5">
            <div className="relative flex-1">
              <span className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 font-poppins text-sm font-bold text-white/40">
                $
              </span>
              <input
                type="number"
                inputMode="decimal"
                step="any"
                min={minBid / MILLION}
                max={maxBid / MILLION}
                value={customInput}
                onChange={(e) => setCustomInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleCustomBid();
                }}
                aria-label={t('auctionGame.customBidLabel')}
                aria-invalid={showCustomHint || undefined}
                aria-describedby={customRangeHintId}
                className="h-9 w-full rounded-xl bg-transparent pl-6 pr-6 font-poppins text-sm font-semibold tabular-nums text-white outline-none placeholder:text-white/30"
                // Ceil, never round: a placeholder that rounds *down* (350K →
                // "0.3") suggests an amount its own Bid button rejects. Kept
                // unpadded so a $11.6M minimum reads as 11.6, not a round 12.
                placeholder={String(Math.ceil((minBid / MILLION) * 100) / 100)}
              />
              <span className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 font-poppins text-[11px] font-bold text-white/40">
                M
              </span>
            </div>
            <button
              type="button"
              onClick={handleCustomBid}
              disabled={!isCustomValid}
              className={`shrink-0 rounded-xl px-4 font-poppins text-xs font-black uppercase transition-colors ${
                isCustomValid
                  ? 'bg-brand-green text-white hover:bg-brand-green/90'
                  : 'cursor-not-allowed bg-white/10 text-white/30'
              }`}
            >
              {t('auctionGame.bid')}
            </button>
          </div>
          <p
            id={customRangeHintId}
            // Polite live region so the range is announced when an out-of-range
            // amount turns it into an error message, not just recoloured.
            aria-live="polite"
            className={`px-1 pt-1 font-poppins text-[11px] font-semibold leading-tight ${
              showCustomHint ? 'text-brand-red' : 'text-white/45'
            }`}
          >
            {showCustomHint
              ? t('auctionGame.customBidInvalid', {
                  min: inMillions(minBid),
                  max: inMillions(maxBid),
                })
              : t('auctionGame.customBidRange', {
                  min: inMillions(minBid),
                  max: inMillions(maxBid),
                })}
          </p>
        </div>
      )}
    </div>
  );
}
