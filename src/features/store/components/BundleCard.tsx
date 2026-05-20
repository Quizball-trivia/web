import Image from "next/image";
import { motion } from "motion/react";

export interface BundleProps {
  id: string;
  title: string;
  amount: number;
  bonus?: number;
  price: string;
  currencyType: "coins" | "tickets";
  imageSrc?: string;
  isPopular?: boolean;
  onBuy?: () => void;
}

const poppins = {
  fontFamily: "'Poppins', sans-serif",
  fontWeight: 600,
  letterSpacing: "0",
  lineHeight: 1,
} as const;

const CARD_BG = "#0B1619";
const ACCENT_PURPLE = "#BA02E8";
const ACCENT_YELLOW = "#FFE500";
const TEXT_DARK = "#071013";

export function BundleCard({
  title,
  amount,
  price,
  imageSrc,
  isPopular,
  onBuy,
}: BundleProps) {
  const accent = isPopular ? ACCENT_YELLOW : ACCENT_PURPLE;
  const buttonTextColor = isPopular ? TEXT_DARK : "#FFFFFF";

  return (
    <motion.div
      whileHover={{ scale: 1.02, y: -2 }}
      whileTap={{ scale: 0.98 }}
      transition={{ type: "spring", stiffness: 300, damping: 20 }}
      className="relative flex flex-col"
    >
      {/* MOST POPULAR badge — yellow tilted oval */}
      {isPopular && (
        <div className="absolute -top-3 right-4 z-20 -rotate-[6deg]">
          <div
            className="rounded-[20px] px-5 py-2 text-[14px] uppercase tracking-[0.04em] shadow-md whitespace-nowrap"
            style={{ ...poppins, backgroundColor: ACCENT_YELLOW, color: TEXT_DARK }}
          >
            Most Popular
          </div>
        </div>
      )}

      {/* Card matches the avatar item-card footprint so store grids stay aligned on mobile. */}
      <div
        className="relative flex min-h-[218px] flex-col rounded-[16px] border-[3px] aspect-[4/5] px-2.5 py-3 sm:min-h-[270px] sm:rounded-[20px] sm:px-5 sm:py-5"
        style={{ backgroundColor: CARD_BG, borderColor: accent }}
      >
        {/* Top: amount + label (centered) */}
        <div className="text-center">
          <div
            className="text-[18px] tabular-nums leading-none text-white sm:text-[28px]"
            style={poppins}
          >
            {amount.toLocaleString()}
          </div>
          <div
            className="mt-1.5 text-[8px] uppercase tracking-[0.04em] text-white/50 sm:mt-2 sm:text-[11px]"
            style={poppins}
          >
            {title}
          </div>
        </div>

        {/* Center image — fixed-height slot (anchors padding from text → slot
            and slot → button identically across all four tiers). Icons
            object-contain inside the slot; the Handful (single coin) gets a
            tighter max-h so its square shape doesn't dominate the card. */}
        <div className="relative flex min-h-0 flex-1 items-center justify-center py-1.5 sm:py-2">
          {imageSrc ? (
            <Image
              src={imageSrc}
              alt={title}
              width={200}
              height={200}
              className={`h-[clamp(84px,25vw,142px)] w-auto max-w-full object-contain drop-shadow-[0_4px_12px_rgba(0,0,0,0.4)] ${
                amount <= 100 ? "max-h-[54px] sm:max-h-[78px]" : "max-h-[112px] sm:max-h-[142px]"
              }`}
            />
          ) : (
            <div className="size-20 rounded-2xl" style={{ backgroundColor: `${accent}20` }} />
          )}
        </div>

        {/* Bottom: pill button */}
        <button
          type="button"
          onClick={onBuy}
          className="flex h-9 w-full items-center justify-center rounded-[16px] text-[12px] uppercase transition-transform active:translate-y-[2px] sm:h-[44px] sm:rounded-[20px] sm:text-[18px]"
          style={{ ...poppins, backgroundColor: accent, color: buttonTextColor }}
        >
          {price}
        </button>
      </div>
    </motion.div>
  );
}
