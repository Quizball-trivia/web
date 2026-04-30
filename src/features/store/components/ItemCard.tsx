"use client";

import Image from "next/image";
import { motion } from "motion/react";
import { CoinIcon } from "./CoinIcon";
import { AvatarPreview } from "@/components/AvatarPreview";
import type { AvatarCustomization } from "@/types/game";

const poppins = {
  fontFamily: "'Poppins', sans-serif",
  fontWeight: 600,
  letterSpacing: "0",
  lineHeight: 1,
} as const;

const PURPLE = "#BA02E8";
const CARD_BG = "#0B1619";

export interface ItemCardProps {
  name: string;
  asset: string;
  /** Display price, e.g. "500" (coins) or "—" if unavailable. */
  price: string;
  /** Optional bigger image rendering (use for hair/headwear that should fill the frame). */
  imageSize?: "sm" | "md" | "lg";
  onBuy?: () => void;
  /** Already owned/unlocked — show an "Owned" pill instead of price. */
  owned?: boolean;
  /** When provided, card renders a composite avatar preview instead of the flat asset. */
  previewCustomization?: AvatarCustomization;
}

const SIZE_PCT: Record<NonNullable<ItemCardProps["imageSize"]>, number> = {
  sm: 55,
  md: 70,
  lg: 80,
};

export function ItemCard({
  name,
  asset,
  price,
  imageSize = "md",
  onBuy,
  owned,
  previewCustomization,
}: ItemCardProps) {
  return (
    <motion.div
      whileHover={{ scale: 1.02, y: -2 }}
      whileTap={{ scale: 0.98 }}
      transition={{ type: "spring", stiffness: 300, damping: 20 }}
      className="relative flex flex-col"
    >
      <div
        className="relative flex flex-col rounded-[20px] border-[3px] aspect-[320/268] px-5 pt-5 pb-5"
        style={{ backgroundColor: CARD_BG, borderColor: PURPLE }}
      >
        {/* Title */}
        <div
          className="text-[14px] sm:text-[16px] uppercase leading-none text-white truncate"
          style={poppins}
        >
          {name}
        </div>

        {/* Item image (or composite avatar preview) — centered, fills available space */}
        <div className="relative flex flex-1 items-center justify-center py-2">
          {previewCustomization ? (
            <AvatarPreview customization={previewCustomization} width={130} />
          ) : (
            <div
              className="relative h-full"
              style={{ width: `${SIZE_PCT[imageSize]}%` }}
            >
              <Image
                src={asset}
                alt={name}
                fill
                unoptimized
                sizes="(min-width: 768px) 200px, 50vw"
                className="object-contain drop-shadow-[0_4px_12px_rgba(0,0,0,0.4)]"
              />
            </div>
          )}
        </div>

        {/* Price pill / Owned */}
        {owned ? (
          <div
            className="flex h-[44px] w-full items-center justify-center rounded-[20px] border-2 text-[14px] uppercase text-white/80"
            style={{ ...poppins, borderColor: "rgba(255,255,255,0.15)" }}
          >
            Owned
          </div>
        ) : (
          <button
            type="button"
            onClick={onBuy}
            className="flex h-[44px] w-full items-center justify-center gap-2 rounded-[20px] text-[18px] uppercase text-white transition-transform active:translate-y-[2px]"
            style={{ ...poppins, backgroundColor: PURPLE }}
          >
            <span className="tabular-nums">{price}</span>
            <CoinIcon size={26} />
          </button>
        )}
      </div>
    </motion.div>
  );
}
