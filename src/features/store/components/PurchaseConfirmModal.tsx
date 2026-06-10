"use client";

import { motion, AnimatePresence } from "motion/react";
import { Loader2 } from "lucide-react";
import { AvatarPreview } from "@/components/AvatarPreview";
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
const CARD_BG = "#FFFFFF";
const TEXT_DARK = "#071013";

export interface PurchaseConfirmModalProps {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  isPending?: boolean;
  /** Item label, e.g. "Pouch" or "Slick Back". */
  name: string;
  /** Display price, e.g. "0.99$" or "500". Pass empty string for owned items (equip flow). */
  price: string;
  /** When provided, modal renders an equipped-on-avatar preview (used for avatar parts). */
  previewCustomization?: AvatarCustomization;
  /** Confirm button label override (e.g. "Equip" when item is already owned). */
  confirmLabel?: string;
  /**
   * When false, the user can't afford the item — Cancel/Confirm are replaced
   * by a single disabled "Need more" button (modal stays preview-only).
   */
  affordable?: boolean;
}

export function PurchaseConfirmModal({
  open,
  onClose,
  onConfirm,
  isPending,
  name,
  price,
  previewCustomization,
  confirmLabel,
  affordable = true,
}: PurchaseConfirmModalProps) {
  const { t } = useLocale();
  const hidePrice = !price.trim();
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
            className="relative w-full max-w-[420px] rounded-[24px] border-[3px] p-6"
            style={{ backgroundColor: CARD_BG, borderColor: PURPLE }}
            onClick={(e) => e.stopPropagation()}
          >
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
              className="text-center text-[24px] uppercase text-surface-page"
              style={poppins}
            >
              {name}
            </div>

            {/* Price (hidden in equip flow) */}
            {!hidePrice && (
              <div className="mt-4 flex items-center justify-center gap-2">
                <span
                  className="text-[10px] uppercase tracking-[0.04em] text-surface-page/55"
                  style={poppins}
                >
                  {t('profile.purchase.price')}
                </span>
                <span
                  className="text-[28px] tabular-nums"
                  style={{ ...poppins, color: PURPLE }}
                >
                  {price.replace(/\s*coins?$/i, "").trim()}
                </span>
                {/^[\d,]+\s*coins?$/i.test(price) && <CoinIcon size={28} />}
              </div>
            )}

            {/* Buttons */}
            {!affordable ? (
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
            <div className="mt-6 flex gap-3">
              <button
                type="button"
                disabled={isPending}
                onClick={onClose}
                className="flex h-[48px] flex-1 items-center justify-center rounded-[16px] border-2 border-surface-page/20 bg-surface-page/5 text-[14px] uppercase text-surface-page transition-colors hover:bg-surface-page/10 disabled:opacity-40"
                style={poppins}
              >
                {t('common.cancel')}
              </button>
              <button
                type="button"
                disabled={isPending}
                onClick={onConfirm}
                className="flex h-[48px] flex-1 items-center justify-center gap-2 rounded-[16px] text-[14px] uppercase transition-transform active:translate-y-[1px] disabled:opacity-60"
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

// Re-export TEXT_DARK so consumers can use the same palette.
export { PURPLE as PURCHASE_MODAL_ACCENT, TEXT_DARK as PURCHASE_MODAL_TEXT_DARK };
