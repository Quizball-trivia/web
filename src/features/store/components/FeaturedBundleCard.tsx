import Image from "next/image";
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

const ACCENT_YELLOW = "#FFE500";

export function FeaturedBundleCard({ onBuy }: FeaturedBundleCardProps) {
  return (
    <motion.div
      whileHover={{ scale: 1.01, y: -2 }}
      transition={{ type: "spring", stiffness: 300, damping: 20 }}
      className="relative w-full cursor-pointer overflow-visible rounded-[20px]"
      style={{ backgroundColor: "#BA02E8" }}
      onClick={onBuy}
    >
      {/* Subtle radial highlight */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-60"
        style={{
          background:
            "radial-gradient(ellipse at 25% 30%, rgba(255,255,255,0.18) 0%, transparent 55%)",
        }}
      />

      <div className="relative flex flex-col items-stretch gap-5 overflow-visible px-5 py-5 md:flex-row md:items-center md:gap-6 md:px-7 md:py-7">
        {/* ── Ticket icon block (left, overflows card) ── */}
        <div className="relative flex h-[250px] w-full shrink-0 items-center justify-center overflow-visible md:h-[245px] md:w-[335px]">
          {/* Tilted oversized ticket — bleeds outside the card */}
          <motion.div
            whileHover={{ scale: 1.06, rotate: -60, x: -6, y: -8 }}
            initial={{ rotate: 4, x: -10, y: -2 }}
            animate={{ rotate: 4, x: -10, y: -2 }}
            transition={{ type: "spring", stiffness: 220, damping: 14 }}
            className="pointer-events-none absolute left-1/2 top-1/2 z-10 -translate-x-[58%] -translate-y-[55%] md:left-[-24px] md:top-1/2 md:-translate-x-0 md:-translate-y-[52%]"
          >
            <Image
              src="/assets/ticket_icon.webp"
              alt=""
              width={600}
              height={600}
              className="h-[320px] w-[320px] object-contain drop-shadow-[0_18px_38px_rgba(0,0,0,0.48)] md:h-[540px] md:w-[540px]"
              priority
            />
          </motion.div>

          {/* PRO STARTER PACK pill — sits on top of the ticket */}
          <span className="absolute left-1/2 top-3 z-20 inline-flex -translate-x-1/2 items-center rounded-full bg-black px-4 py-2 text-[11px] font-fun font-black uppercase tracking-[0.18em] text-white shadow-[0_4px_14px_rgba(0,0,0,0.5)] md:left-[10px] md:top-[18px] md:translate-x-0">
            Pro Starter Pack
          </span>

          {/* BEST VALUE pill — sits on bottom of the ticket */}
          <span className="absolute bottom-3 left-[35%] z-20 inline-flex items-center rounded-full bg-black px-4 py-2 text-[11px] font-fun font-black uppercase tracking-[0.18em] text-white shadow-[0_4px_14px_rgba(0,0,0,0.5)] md:bottom-[0px] md:left-[132px] md:translate-x-0">
            Best Value
          </span>
        </div>

        {/* ── Text content (middle) ── */}
        <div className="min-w-0 flex-1 text-center md:-translate-y-3 md:text-left">
          {/* Title */}
          <h2
            className="text-2xl uppercase text-white sm:text-3xl md:text-[2rem]"
            style={poppins}
          >
            Unlock <span style={{ color: ACCENT_YELLOW }}>the Arena</span>
          </h2>

          {/* Description */}
          <p className="mx-auto mt-2.5 max-w-md text-[12px] font-fun font-black tracking-wide text-white/85 sm:text-[13px] md:mx-0">
            Get <span className="text-white" style={{ color: ACCENT_YELLOW }}>10 Arena Tickets</span>
            {" + "}
            <span style={{ color: ACCENT_YELLOW }}>5,000 Bonus Coins</span>
            {" "}to jumpstart your ranked climb. Tickets refill hourly while you are below the cap.
          </p>

          {/* Pills row */}
          <div className="mt-4 flex flex-wrap items-center justify-center gap-2.5 md:justify-start">
            <span
              className="inline-flex h-9 items-center justify-center rounded-full border-2 px-4 text-[11px] font-fun font-black uppercase tracking-[0.16em] text-white"
              style={{ borderColor: ACCENT_YELLOW }}
            >
              No Ads / 7 Days
            </span>
            <span
              className="inline-flex h-9 items-center justify-center rounded-full border-2 px-4 text-[11px] font-fun font-black uppercase tracking-[0.16em] text-white"
              style={{ borderColor: ACCENT_YELLOW }}
            >
              2x XP Boost
            </span>
          </div>
        </div>

        {/* ── CTA block (right) ── */}
        <div className="flex w-full shrink-0 flex-col items-center gap-3 md:w-[240px] md:-translate-y-3">
          <p className="text-[10px] font-fun font-black uppercase tracking-[0.22em] text-white/65">
            Limited Time Offer
          </p>

          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onBuy?.();
            }}
            className="flex h-[56px] w-full items-center justify-center rounded-[14px] bg-black px-6 text-white transition-transform active:translate-y-[2px]"
          >
            <span className="text-base uppercase sm:text-lg" style={poppins}>
              Unlock Bundle
            </span>
          </button>

          <div className="flex items-baseline justify-center gap-2">
            <span className="text-[10px] font-fun font-black uppercase tracking-[0.22em] text-white/60">
              Only for
            </span>
            <span
              className="text-2xl tabular-nums sm:text-[1.75rem]"
              style={{ ...poppins, color: ACCENT_YELLOW }}
            >
              $9.99
            </span>
            <span className="text-xs tabular-nums text-white/40 line-through sm:text-sm">
              $19.99
            </span>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
