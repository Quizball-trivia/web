'use client';

import { useState, useMemo } from 'react';
import { motion } from 'motion/react';
import { formatMoney } from '../../data';
import { poppins } from '../../constants/auction.constants';
import { useLocale } from '@/contexts/LocaleContext';

/** Preset bid buttons (MIN / +10 / +25 / +50 / ALL IN) + custom-amount input. */
export function QuickBidPanel({
  minBid,
  maxBid,
  currentBudget,
  onBid,
}: {
  minBid: number;
  maxBid: number;
  currentBudget: number;
  onBid: (amount: number) => void;
}) {
  const { t } = useLocale();
  const [customInput, setCustomInput] = useState('');

  const presets = useMemo(() => {
    const options: { label: string; amount: number; variant: 'default' | 'hot' | 'max' }[] = [];

    options.push({ label: t('auctionGame.minBid', { amount: formatMoney(minBid) }), amount: minBid, variant: 'default' });

    const smallRaise = minBid + 10_000_000;
    if (smallRaise <= maxBid && smallRaise !== minBid) {
      options.push({ label: t('auctionGame.bidPlus10M'), amount: smallRaise, variant: 'default' });
    }

    const medRaise = minBid + 25_000_000;
    if (medRaise <= maxBid && options.length < 3) {
      options.push({ label: t('auctionGame.bidPlus25M'), amount: medRaise, variant: 'hot' });
    }

    const bigRaise = minBid + 50_000_000;
    if (bigRaise <= maxBid && options.length < 4) {
      options.push({ label: t('auctionGame.bidPlus50M'), amount: bigRaise, variant: 'hot' });
    }

    if (maxBid > minBid + 5_000_000) {
      options.push({ label: t('auctionGame.allIn'), amount: maxBid, variant: 'max' });
    }

    return options;
  }, [minBid, maxBid, t]);

  const parsedCustom = Math.round(Number(customInput) * 1_000_000);
  const isCustomValid = !isNaN(parsedCustom) && parsedCustom >= minBid && parsedCustom <= maxBid;

  const handleCustomBid = () => {
    if (!isCustomValid) return;
    onBid(parsedCustom);
    setCustomInput('');
  };

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="w-full space-y-2.5">
      {/* Preset buttons + custom-amount cell (sits in the grid, right of ALL IN) */}
      <div className="grid grid-cols-2 gap-2">
        {presets.map((preset) => {
          const budgetAfter = currentBudget - preset.amount;
          return (
            <motion.button
              key={preset.label}
              type="button"
              whileTap={{ scale: 0.97 }}
              onClick={() => onBid(preset.amount)}
              className={`relative flex flex-col items-center justify-center gap-1 rounded-[14px] px-2 py-3.5 text-white shadow-none transition-colors ${
                preset.variant === 'max'
                  ? 'bg-brand-red hover:bg-brand-red/90'
                  : preset.variant === 'hot'
                    ? 'bg-brand-orange hover:bg-brand-orange/90'
                    : 'bg-brand-green hover:bg-brand-green/90'
              }`}
            >
              <span className="text-sm font-black uppercase leading-none" style={poppins}>
                {preset.label}
              </span>
              <span className="text-[11px] font-semibold leading-none text-white/85" style={poppins}>
                {t('auctionGame.leftAmount', { amount: formatMoney(budgetAfter) })}
              </span>
            </motion.button>
          );
        })}

        {/* Custom amount — input + Bid, occupies the grid cell next to ALL IN */}
        <div className="flex items-stretch gap-1.5 rounded-[14px] border-2 border-white/10 bg-white/5 p-1.5">
          <div className="relative flex-1">
            <span className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 font-poppins text-sm font-bold text-white/40">
              $
            </span>
            <input
              type="number"
              inputMode="numeric"
              value={customInput}
              onChange={(e) => setCustomInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleCustomBid();
              }}
              className="h-full w-full rounded-[9px] bg-transparent pl-6 pr-6 font-poppins text-sm font-semibold text-white tabular-nums outline-none placeholder:text-white/30"
              placeholder={String(Math.round(minBid / 1_000_000))}
            />
            <span className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 font-poppins text-[11px] font-bold text-white/40">
              M
            </span>
          </div>
          <button
            type="button"
            onClick={handleCustomBid}
            disabled={!isCustomValid}
            className={`shrink-0 rounded-[9px] px-3 font-poppins text-xs font-bold uppercase shadow-none transition-colors ${
              isCustomValid ? 'bg-brand-green text-white hover:bg-brand-green/90' : 'bg-white/10 text-white/30 cursor-not-allowed'
            }`}
          >
            {t('auctionGame.bid')}
          </button>
        </div>
      </div>

      {/* Budget info */}
      <div className="flex justify-between text-xs sm:text-sm font-semibold text-white/70 px-1" style={poppins}>
        <span>{t('auctionGame.budgetAmount', { amount: formatMoney(currentBudget) })}</span>
        <span>{t('auctionGame.maxBidAmount', { amount: formatMoney(maxBid) })}</span>
      </div>
    </motion.div>
  );
}
