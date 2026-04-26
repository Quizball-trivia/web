import { Ticket, Star } from "lucide-react";
import { motion } from "motion/react";

interface FeaturedBundleCardProps {
  onBuy?: () => void;
}

const poppins = {
  fontFamily: "'Poppins', sans-serif",
  fontWeight: 600,
  letterSpacing: "0",
  lineHeight: 1,
} as const;

const MAGENTA = "#C61FCD";
const ACCENT_YELLOW = "#FFE500";

export function FeaturedBundleCard({ onBuy }: FeaturedBundleCardProps) {
  return (
    <motion.div
      whileHover={{ scale: 1.02, y: -4, rotate: -0.5 }}
      whileTap={{ scale: 0.99, rotate: 0 }}
      transition={{ type: "spring", stiffness: 300, damping: 20 }}
      className="relative w-full overflow-hidden rounded-[10px] cursor-pointer"
      style={{ backgroundColor: MAGENTA }}
      onClick={onBuy}
    >
      <div className="flex flex-col items-center gap-5 p-6 md:flex-row md:items-center md:gap-8 md:p-8">
        {/* ── Ticket icon block (left) ── */}
        <div className="relative shrink-0">
          <motion.div
            whileHover={{ rotate: 6 }}
            transition={{ type: "spring", stiffness: 200, damping: 15 }}
            className="relative flex h-[150px] w-[200px] items-center justify-center"
          >
            <Ticket
              className="size-[180px]"
              style={{ color: ACCENT_YELLOW }}
              strokeWidth={1.5}
              fill={ACCENT_YELLOW}
            />
            <Star
              className="absolute size-12 text-[#FF9600]"
              strokeWidth={2}
              fill="#FF9600"
            />
          </motion.div>
          <span className="absolute -bottom-1 left-1/2 inline-flex -translate-x-1/2 items-center rounded-full bg-black px-3 py-1.5 text-[10px] font-fun font-black uppercase tracking-[0.18em] text-white">
            Best Value
          </span>
        </div>

        {/* ── Text content (middle) ── */}
        <div className="min-w-0 flex-1 text-center md:text-left">
          {/* PRO STARTER PACK pill */}
          <div className="flex justify-center md:justify-start">
            <span className="inline-flex items-center rounded-full bg-black px-3 py-1.5 text-[10px] font-fun font-black uppercase tracking-[0.18em] text-white">
              Pro Starter Pack
            </span>
          </div>

          {/* Title */}
          <h2
            className="mt-3 text-3xl uppercase text-white sm:text-4xl md:text-[2.75rem]"
            style={poppins}
          >
            Unlock <span style={{ color: ACCENT_YELLOW }}>the Arena</span>
          </h2>

          {/* Description */}
          <p className="mx-auto mt-2 max-w-md text-xs font-fun font-black uppercase tracking-wide text-white/85 sm:text-sm md:mx-0">
            Get <span style={{ color: ACCENT_YELLOW }}>10 Arena Tickets</span>
            {" "}+ <span style={{ color: ACCENT_YELLOW }}>5,000 Bonus Coins</span>
            {" "}to jumpstart your ranked climb.
          </p>

          {/* Stats row */}
          <div className="mt-3 flex items-center justify-center gap-5 text-[10px] font-fun font-black uppercase tracking-[0.18em] text-white sm:text-xs md:justify-start md:gap-6">
            <span>No Ads / 7 Days</span>
            <span>2x XP Boost</span>
          </div>
        </div>

        {/* ── CTA button (right) ── */}
        <div className="flex w-full shrink-0 flex-col items-center gap-2 md:w-auto">
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onBuy?.();
            }}
            className="flex h-[56px] w-full items-center justify-center gap-3 rounded-[8px] bg-black px-6 text-white transition-transform active:translate-y-[2px] md:w-[260px]"
          >
            <span className="text-base uppercase sm:text-lg" style={poppins}>
              Unlock Bundle
            </span>
            <span
              className="text-base tabular-nums sm:text-lg"
              style={{ ...poppins, color: ACCENT_YELLOW }}
            >
              $9.99
            </span>
            <span className="text-xs tabular-nums text-white/40 line-through sm:text-sm">
              $19.99
            </span>
          </button>
          <p className="text-[10px] font-fun font-black uppercase tracking-[0.22em] text-white/60">
            Limited time offer
          </p>
        </div>
      </div>
    </motion.div>
  );
}
