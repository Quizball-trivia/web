import { Coins, Ticket } from "lucide-react";
import { motion } from "motion/react";

export interface BundleProps {
  id: string;
  title: string;
  amount: number;
  bonus?: number;
  price: string;
  currencyType: "coins" | "tickets";
  imageColor?: string;
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
const ACCENT_YELLOW = "#FFE500";
const ACCENT_GREEN = "#38B60E";
const ACCENT_ORANGE = "#FF9600";
const ACCENT_PURPLE = "#CE82FF";

export function BundleCard({
  title,
  amount,
  bonus,
  price,
  currencyType,
  isPopular,
  onBuy,
}: BundleProps) {
  const isCoin = currencyType === "coins";
  const accentColor = isPopular ? ACCENT_ORANGE : isCoin ? ACCENT_YELLOW : ACCENT_PURPLE;

  return (
    <motion.div
      whileHover={{ scale: 1.04, y: -4, rotate: -1.5 }}
      whileTap={{ scale: 0.97, rotate: 0 }}
      transition={{ type: "spring", stiffness: 300, damping: 20 }}
      className="relative flex flex-col"
    >
      {/* Most Popular ribbon */}
      {isPopular && (
        <div
          className="absolute left-1/2 top-0 z-10 -translate-x-1/2 -translate-y-1/2 rounded-full px-3 py-1 text-[10px] font-fun font-black uppercase tracking-[0.18em] text-white"
          style={{ backgroundColor: ACCENT_ORANGE }}
        >
          Most Popular
        </div>
      )}

      {/* Card — preserves the original rectangular proportions */}
      <div
        className="relative flex flex-col items-center rounded-[10px] p-4"
        style={{ backgroundColor: CARD_BG }}
      >
        {/* Icon */}
        <div className="relative mb-3">
          <div
            className="flex size-16 items-center justify-center rounded-[8px]"
            style={{ backgroundColor: `${accentColor}20` }}
          >
            {isCoin ? (
              <Coins className="size-8" style={{ color: accentColor }} />
            ) : (
              <Ticket className="size-8" style={{ color: accentColor }} />
            )}
          </div>
          {bonus && (
            <div
              className="absolute -bottom-1.5 -right-1.5 rounded-full px-1.5 py-0.5 text-[10px] font-fun font-black uppercase text-white"
              style={{ backgroundColor: ACCENT_GREEN }}
            >
              +{bonus}%
            </div>
          )}
        </div>

        {/* Amount + label */}
        <div className="mb-4 text-center">
          <div
            className="text-2xl tabular-nums text-white"
            style={poppins}
          >
            {amount.toLocaleString()}
          </div>
          <div className="mt-1 text-[11px] font-fun font-black uppercase tracking-[0.22em] text-white/40">
            {title}
          </div>
        </div>

        {/* CTA */}
        <button
          type="button"
          onClick={onBuy}
          className="flex h-[40px] w-full items-center justify-center rounded-[8px] text-sm font-fun font-black uppercase tracking-wide text-white transition-transform active:translate-y-[2px]"
          style={{ backgroundColor: isPopular ? ACCENT_ORANGE : "#1CB0F6" }}
        >
          {price}
        </button>
      </div>
    </motion.div>
  );
}
