"use client";

import Image from "next/image";
import { motion } from "motion/react";
import { CoinIcon } from "./CoinIcon";
import { AvatarPreview } from "@/components/AvatarPreview";
import type { AvatarCustomization } from "@/types/game";
import { HAIR_PARTS, type AvatarPart } from "@/lib/avatars/parts";
import { useLocale } from "@/contexts/LocaleContext";

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
  /** Optional bigger image rendering (use for items rendered as flat asset, e.g. jerseys). */
  imageSize?: "sm" | "md" | "lg";
  onBuy?: () => void;
  /** Already owned/unlocked — show an "Owned" pill instead of price. */
  owned?: boolean;
  /** When false, the user can't afford the item — the Buy button is disabled. */
  affordable?: boolean;
  /** When provided, card renders a composite avatar preview instead of the flat asset. */
  previewCustomization?: AvatarCustomization;
  /** When provided, card renders a mannequin head with this part overlaid (for hair/glasses/facialHair). */
  mannequinPart?: AvatarPart;
}

const SIZE_PCT: Record<NonNullable<ItemCardProps["imageSize"]>, number> = {
  sm: 75,
  md: 90,
  lg: 100,
};

/* eslint-disable @next/next/no-img-element -- mannequin overlay needs raw img absolute positioning. */

/**
 * MannequinPreview — renders the canonical 495.25 × 543.03 canvas, identical to
 * the live AvatarPreview, with the mannequin face replacing the skin. Hair
 * PNGs have transparent face-cutouts calibrated for this canvas, so the
 * mannequin face shows through the same way the avatar's face does in the
 * preview.
 */
// Mannequin face placed where the avatar's face sits in the canonical canvas
// (eyes at ~30%, mouth at ~34–38% → face top ~7%, ~32% wide and centered).
const MANNEQUIN_FACE_POS = { top: 2, left: 28, width: 44 };

// Default hair shown over glasses/facial-hair items — reuses the exact preview
// position of `hair_boy_basic` so the silhouette matches what users see when
// the avatar has the default boy haircut equipped.
const MANNEQUIN_DEFAULT_HAIR_POS =
  HAIR_PARTS.find((p) => p.id === "hair_boy_basic")?.position ?? { top: -8, left: 18, width: 56 };

// Head content (face + hair + item) natively sits at canvas top 0–40%. Translate
// the wrapper down so the head zone lands in the middle of the card frame.
const HEAD_VERTICAL_SHIFT_PCT = 28;

function MannequinPreview({ part }: { part: AvatarPart }) {
  return (
    <div className="pointer-events-none relative h-full" style={{ aspectRatio: "495.25 / 543.03" }}>
      <div
        className="pointer-events-none absolute inset-0"
        style={{ transform: `translateY(${HEAD_VERTICAL_SHIFT_PCT}%)` }}
      >
        <img
          src="/assets/manequen_face.webp"
          alt=""
          className="pointer-events-none absolute object-contain"
          style={{
            top: `${MANNEQUIN_FACE_POS.top}%`,
            left: `${MANNEQUIN_FACE_POS.left}%`,
            width: `${MANNEQUIN_FACE_POS.width}%`,
          }}
        />
        {part.slot !== "hair" && (
          <img
            src="/assets/manequen_hair.webp"
            alt=""
            className="pointer-events-none absolute object-contain"
            style={{
              top: `${MANNEQUIN_DEFAULT_HAIR_POS.top}%`,
              left: `${MANNEQUIN_DEFAULT_HAIR_POS.left}%`,
              width: `${MANNEQUIN_DEFAULT_HAIR_POS.width}%`,
            }}
          />
        )}
        {(() => {
          // Prefer the part's store-specific tuning when present, fall back to
          // the canonical preview position. This lets individual parts ship a
          // `storePosition` override in parts.ts when their store-card alignment
          // differs from the live AvatarPreview.
          const pos = part.storePosition ?? part.position;
          return (
            <img
              src={part.asset}
              alt=""
              className="pointer-events-none absolute object-contain drop-shadow-[0_4px_12px_rgba(0,0,0,0.4)]"
              style={{
                top: `${pos.top}%`,
                left: `${pos.left}%`,
                width: `${pos.width}%`,
              }}
            />
          );
        })()}
      </div>
    </div>
  );
}

export function ItemCard({
  name,
  asset,
  price,
  imageSize = "md",
  onBuy,
  owned,
  affordable = true,
  previewCustomization,
  mannequinPart,
}: ItemCardProps) {
  const { t } = useLocale();
  const canBuy = owned || affordable;
  return (
    <motion.div
      whileHover={{ scale: 1.02, y: -2 }}
      whileTap={{ scale: 0.98 }}
      transition={{ type: "spring", stiffness: 300, damping: 20 }}
      className="relative flex flex-col"
    >
      <div
        className="relative flex min-h-[218px] flex-col rounded-[16px] border-[3px] aspect-[4/5] px-2.5 py-3 sm:min-h-[270px] sm:rounded-[20px] sm:px-5 sm:py-5"
        style={{ backgroundColor: CARD_BG, borderColor: PURPLE }}
      >
        {/* Title */}
        <div
          className="min-w-0 truncate text-center text-[11px] uppercase leading-none text-white sm:text-[16px]"
          style={poppins}
        >
          {name}
        </div>

        {/* Item image (or composite avatar preview / mannequin overlay) — centered, fills available space */}
        <div className="relative flex min-h-0 flex-1 items-center justify-center py-1.5 sm:py-2">
          {previewCustomization ? (
            <div className="flex size-[clamp(84px,25vw,142px)] items-center justify-center">
              <AvatarPreview customization={previewCustomization} width={104} className="max-h-full max-w-full" />
            </div>
          ) : mannequinPart ? (
            <div className="flex h-[clamp(84px,25vw,142px)] items-center justify-center">
              <MannequinPreview part={mannequinPart} />
            </div>
          ) : (
            <div
              className="relative h-[clamp(84px,25vw,142px)]"
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
          <button
            type="button"
            onClick={onBuy}
            className="flex h-9 w-full items-center justify-center rounded-[16px] border-2 text-[11px] uppercase text-white/80 transition-colors hover:bg-white/5 sm:h-[44px] sm:rounded-[20px] sm:text-[14px]"
            style={{ ...poppins, borderColor: "rgba(255,255,255,0.15)" }}
          >
            {t("store.owned")}
          </button>
        ) : (
          <button
            type="button"
            onClick={onBuy}
            disabled={!canBuy}
            className="flex h-9 w-full items-center justify-center gap-1 rounded-[16px] text-[12px] uppercase text-white transition-transform active:translate-y-[2px] disabled:opacity-50 disabled:active:translate-y-0 sm:h-[44px] sm:gap-2 sm:rounded-[20px] sm:text-[18px]"
            style={{ ...poppins, backgroundColor: PURPLE }}
          >
            <span className="tabular-nums">{canBuy ? price : t("store.needMoreCoins")}</span>
            {canBuy && <CoinIcon size={22} />}
          </button>
        )}
      </div>
    </motion.div>
  );
}
