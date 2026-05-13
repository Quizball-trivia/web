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

      {/* Card — 295×268 in Figma; we use aspect ratio so it scales */}
      <div
        className="relative flex flex-col rounded-[20px] border-[3px] aspect-[295/268] px-5 pt-6 pb-5"
        style={{ backgroundColor: CARD_BG, borderColor: accent }}
      >
        {/* Top: amount + label (centered) */}
        <div className="text-center">
          <div
            className="text-[28px] sm:text-[32px] tabular-nums leading-none text-white"
            style={poppins}
          >
            {amount.toLocaleString()}
          </div>
          <div
            className="mt-2 text-[10px] sm:text-[11px] uppercase tracking-[0.04em] text-white/50"
            style={poppins}
          >
            {title}
          </div>
        </div>

        {/* Center image — fixed-height slot (anchors padding from text → slot
            and slot → button identically across all four tiers). Icons
            object-contain inside the slot; the Handful (single coin) gets a
            tighter max-h so its square shape doesn't dominate the card. */}
        <div className="relative flex h-[110px] items-center justify-center pt-1 sm:h-[120px]">
          {imageSrc ? (
            <Image
              src={imageSrc}
              alt={title}
              width={200}
              height={200}
              className={`w-auto max-w-full object-contain drop-shadow-[0_4px_12px_rgba(0,0,0,0.4)] ${
                amount <= 100 ? "max-h-[70px] sm:max-h-[78px]" : "max-h-full"
              }`}
            />
          ) : (
            <div className="size-20 rounded-2xl" style={{ backgroundColor: `${accent}20` }} />
          )}
        </div>
        <div className="flex-1" />

        {/* Bottom: pill button */}
        <button
          type="button"
          onClick={onBuy}
          className="mt-3 flex h-[44px] w-full items-center justify-center rounded-[20px] text-[18px] uppercase transition-transform active:translate-y-[2px]"
          style={{ ...poppins, backgroundColor: accent, color: buttonTextColor }}
        >
          {price}
        </button>
      </div>
    </motion.div>
  );
}
