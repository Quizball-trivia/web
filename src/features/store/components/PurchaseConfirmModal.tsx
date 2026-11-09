"use client";

import { motion, AnimatePresence } from "motion/react";
import { Loader2 } from "lucide-react";
import { AvatarPreview } from "@/components/AvatarPreview";
import { ModalCloseButton } from "@/components/shared/ModalCloseButton";
import { CoinIcon } from "./CoinIcon";
import { useLocale } from "@/contexts/LocaleContext";
import type { AvatarCustomization } from "@/types/game";

const poppins = {
  fontFamily: "'Poppins', sans-serif",
  fontWeight: 600,
  letterSpacing: "0",
  lineHeight: 1,
} as const;

const PURPLE = "#BA02E8";

export interface PurchaseConfirmModalProps {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  isPending?: boolean;
  /** Item label, e.g. "Pouch" or "Slick Back". */
  name: string;
  /** Display price, e.g. "0.99$" or "500". Pass empty string for owned items (equip flow). */
  price: string;
  /** When true, the price is a coin amount — a coin icon is rendered next to it. */
  priceInCoins?: boolean;
  /** When provided, modal renders an equipped-on-avatar preview (used for avatar parts). */
  previewCustomization?: AvatarCustomization;
  /** Confirm button label override (e.g. "Equip" when item is already owned). */
  confirmLabel?: string;
  /**
   * When false, the user can't afford the item — Cancel/Confirm are replaced
   * by a single disabled "Need more" button (modal stays preview-only).
   */
  affordable?: boolean;
  /** Current coin balance; with `priceCoins`, drives the shortfall / balance-after line. */
  balance?: number | null;
  /** Numeric coin price (coin purchases only). */
  priceCoins?: number;
  /** When set, an unaffordable item offers "How to earn coins" instead of a dead end. */
  onEarnMore?: () => void;
}

export function PurchaseConfirmModal({
  open,
  onClose,
  onConfirm,
  isPending,
  name,
  price,
  priceInCoins = false,
  previewCustomization,
  confirmLabel,
  affordable = true,
  balance,
  priceCoins,
  onEarnMore,
}: PurchaseConfirmModalProps) {
  const { t } = useLocale();
  const hidePrice = !price.trim();
  const hasCoinMath = priceInCoins && !hidePrice && balance != null && priceCoins != null && priceCoins > 0;
  const shortfall = hasCoinMath ? Math.max(0, priceCoins - balance) : 0;
  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4"
          onClick={() => {
            if (!isPending) onClose();
          }}
        >
          <motion.div
            initial={{ scale: 0.92, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.92, opacity: 0, y: 20 }}
            transition={{ type: "spring", stiffness: 320, damping: 26 }}
            className="relative w-full max-w-[420px] rounded-[24px] border-[3px] border-store-accent bg-store-card p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <ModalCloseButton
              onClose={() => {
                if (!isPending) onClose();
              }}
            />
            {/* Avatar preview (when applicable) */}
            {previewCustomization && (
              <div className="mb-5 flex justify-center">
                <div className="flex h-[142px] w-[142px] items-center justify-center">
                  <AvatarPreview customization={previewCustomization} width={130} />
                </div>
              </div>
            )}

            {/* Item name */}
            <div
              className="text-center text-[24px] uppercase text-white"
              style={poppins}
            >
              {name}
            </div>

            {/* Price (hidden in equip flow) */}
            {!hidePrice && (
              <div className="mt-4 flex items-center justify-center gap-2">
                <span
                  className="text-[28px] tabular-nums text-white"
                  style={poppins}
                >
                  {price}
                </span>
                {priceInCoins && <CoinIcon size={28} />}
              </div>
            )}

            {hasCoinMath && (
              <p className="mt-2 text-center text-[13px] text-white/70 tabular-nums">
                {!affordable && shortfall > 0
                  ? <>{t("store.balanceLabel", { amount: balance.toLocaleString() })} · <span className="font-semibold text-brand-yellow">{t("store.needMoreAmount", { amount: shortfall.toLocaleString() })}</span></>
                  : t("store.balanceAfter", { amount: (balance - priceCoins).toLocaleString() })}
              </p>
            )}

            {/* Buttons */}
            {!affordable && onEarnMore ? (
              <div className="mt-6">
                <button
                  type="button"
                  onClick={onEarnMore}
                  className="flex h-[48px] w-full items-center justify-center rounded-[16px] bg-brand-yellow text-[14px] uppercase text-black transition-transform active:translate-y-[1px]"
                  style={poppins}
                >
                  {t('store.howToEarnCoins')}
                </button>
              </div>
            ) : !affordable ? (
              <div className="mt-6">
                <button
                  type="button"
                  disabled
                  className="flex h-[48px] w-full items-center justify-center rounded-[16px] text-[14px] uppercase opacity-50"
                  style={{ ...poppins, backgroundColor: PURPLE, color: "#FFFFFF" }}
                >
                  {t('store.needMoreCoins')}
                </button>
              </div>
            ) : (
            <div className="mt-6">
              <button
                type="button"
                disabled={isPending}
                onClick={onConfirm}
                className="flex h-[48px] w-full items-center justify-center gap-2 rounded-[16px] text-[14px] uppercase transition-transform active:translate-y-[1px] disabled:opacity-60"
                style={{ ...poppins, backgroundColor: PURPLE, color: "#FFFFFF" }}
              >
                {isPending && <Loader2 className="size-4 animate-spin" />}
                {isPending ? t('profile.purchase.processing') : (confirmLabel ?? t('profile.purchase.confirm'))}
              </button>
            </div>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

