"use client";

import { motion, useReducedMotion } from "motion/react";

import { useLocale } from "@/contexts/LocaleContext";
import { CoinIcon } from "@/features/store/components/CoinIcon";
import { getAvatarPart } from "@/lib/avatars/parts";
import { translatePartName } from "@/lib/avatars/partNames";

import { WlVictoryPack } from "./WlVictoryPack";
import { WL_PACK_NAME_KEY, WL_PLACE_ACCENT, wlPackPlace, type WlRewardReceipt } from "./wlRewards";

interface WlRewardsEarnedCardProps {
  /** `undefined` while settlement has not produced a receipt yet. */
  receipt: WlRewardReceipt | undefined;
  /** No reward is coming (spectator, or a result that earns nothing). */
  none?: boolean;
  onOpen: () => void;
}

/** "Your rewards" block on the tournament result screen. */
export function WlRewardsEarnedCard({ receipt, none = false, onOpen }: WlRewardsEarnedCardProps) {
  const { t } = useLocale();
  const reduced = useReducedMotion();
  if (none) return null;

  if (!receipt) {
    return (
      <div className="mt-5 w-full rounded-[20px] border border-white/10 bg-surface-card-deep px-5 py-4" role="status">
        <div className="font-poppins text-[11px] font-black uppercase tracking-widest text-white/50">
          {t("wlRewards.resultTitle")}
        </div>
        <div className="mt-2 font-poppins text-sm font-bold text-white/60">{t("wlRewards.resultPending")}</div>
      </div>
    );
  }

  const place = wlPackPlace(receipt);
  const accent = place ? WL_PLACE_ACCENT[place].main : "#FFD700";
  const jersey = receipt.items[0] ? getAvatarPart(receipt.items[0].avatarPartId) : null;

  return (
    <motion.div
      className="mt-5 w-full rounded-[20px] border-2 bg-surface-card-deep px-5 py-4 text-left"
      style={{ borderColor: `${accent}66` }}
      initial={reduced ? false : { opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.5, duration: 0.4 }}
    >
      <div className="font-poppins text-[11px] font-black uppercase tracking-widest text-white/50">
        {t("wlRewards.resultTitle")}
      </div>
      <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-3">
        {place ? (
          <WlVictoryPack place={place} reducedMotion className="w-14 shrink-0" />
        ) : (
          <CoinIcon size={48} className="shrink-0" />
        )}
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5 font-poppins text-2xl font-black tabular-nums text-brand-gold">
            +{receipt.coins.toLocaleString()}
            {place && <CoinIcon size={22} />}
          </div>
          {place && (
            <div className="mt-0.5 font-poppins text-[12px] font-bold uppercase leading-snug text-white/70">
              {t(WL_PACK_NAME_KEY[place])}
              {jersey ? ` · ${translatePartName(jersey.name, t)}` : ""}
            </div>
          )}
        </div>
        {!receipt.seen && (
          <button
            type="button"
            onClick={onOpen}
            className="h-11 w-full shrink-0 rounded-[14px] bg-brand-green px-5 font-poppins text-[13px] font-bold uppercase tracking-wide text-white transition-colors hover:bg-brand-green-deep sm:w-auto"
          >
            {place ? t("wlRewards.resultPackCta") : t("wlRewards.resultCoinsCta")}
          </button>
        )}
      </div>
    </motion.div>
  );
}
