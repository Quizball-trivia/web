import Image from "next/image";
import { motion } from "motion/react";
import { useLocale } from "@/contexts/LocaleContext";

interface FeaturedBundleCardProps {
  onBuy?: () => void;
}

const poppins = {
  fontFamily: "'Poppins', sans-serif",
  fontWeight: 600,
  letterSpacing: "0",
  lineHeight: 1.5,
} as const;

const ACCENT_YELLOW = "#FFE500";
const BORDER_YELLOW = "#FFE600";
const PILL_BLACK = "#071013";

export function FeaturedBundleCard({ onBuy }: FeaturedBundleCardProps) {
  const { t } = useLocale();
  return (
    <motion.div
      whileHover={{ scale: 1.005, y: -2 }}
      transition={{ type: "spring", stiffness: 300, damping: 20 }}
      className="relative w-full cursor-pointer"
      onClick={onBuy}
    >
      {/* ─────────────────────────────────────── DESKTOP (xl+) — needs ~800px min for ticket spacer + right column */}
      <div className="hidden xl:block">
        {/* Card body with vertical gradient */}
        <div
          className="relative w-full rounded-[20px]"
          style={{
            backgroundImage: "linear-gradient(180deg, #BA02E8 0%, #790E94 100%)",
          }}
        >
          {/* Flex row: ticket-spacer | middle | right */}
          <div className="flex items-center gap-6 py-7 pl-[300px] pr-6 lg:gap-8 lg:pl-[340px] lg:pr-8">
            {/* ── Middle column: title, description, feature pills ── */}
            <div className="min-w-0 flex-1">
              <h2
                className="text-center text-[26px] uppercase leading-[1.2] text-white lg:text-[30px]"
                style={poppins}
              >
                {t("store.unlock")} <span style={{ color: ACCENT_YELLOW }}>{t("store.theArena")}</span>
              </h2>
              <p
                className="mx-auto mt-2.5 max-w-[440px] text-center text-[13px] leading-[1.45] text-white/85 lg:text-[14px]"
                style={poppins}
              >
                {t("store.bundleDescription", { tickets: `${t("store.ticketsCount")} + ${t("store.bonusCoinsCount")}` })}
              </p>

              {/* Feature pills */}
              <div className="mt-4 flex items-center justify-center gap-3 lg:gap-4">
                <span
                  className="inline-flex h-[44px] items-center justify-center rounded-[20px] border-[3px] px-4 text-[13px] uppercase text-white lg:text-[14px]"
                  style={{ ...poppins, borderColor: BORDER_YELLOW }}
                >
                  {t("store.noAds7Days")}
                </span>
                <span
                  className="inline-flex h-[44px] items-center justify-center rounded-[20px] border-[3px] px-4 text-[13px] uppercase text-white lg:text-[14px]"
                  style={{ ...poppins, borderColor: BORDER_YELLOW }}
                >
                  {t("store.xpBoost")}
                </span>
              </div>
            </div>

            {/* ── Right column: limited time, button, price ── */}
            <div className="w-[260px] shrink-0 lg:w-[300px]">
              <p
                className="text-center text-[13px] uppercase text-white/85 lg:text-[14px]"
                style={poppins}
              >
                {t("store.limitedTimeOffer")}
              </p>

              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onBuy?.();
                }}
                className="mt-2.5 flex h-[60px] w-full items-center justify-center rounded-[20px] text-[20px] uppercase text-white transition-transform active:translate-y-[2px] lg:text-[22px]"
                style={{ ...poppins, backgroundColor: PILL_BLACK }}
              >
                {t("store.unlockBundle")}
              </button>

              <div className="mt-3 flex items-baseline justify-center gap-2">
                <span
                  className="text-[12px] uppercase text-white/85 lg:text-[13px]"
                  style={poppins}
                >
                  {t("store.onlyFor")}
                </span>
                <span
                  className="text-[24px] uppercase tabular-nums lg:text-[26px]"
                  style={{ ...poppins, color: ACCENT_YELLOW }}
                >
                  $9.99
                </span>
                <span
                  className="text-[13px] uppercase tabular-nums text-white/70 line-through lg:text-[14px]"
                  style={poppins}
                >
                  $19.99
                </span>
              </div>
            </div>
          </div>

          {/* ── Ticket: anchored top-left of card, overflows ── */}
          <motion.div
            whileHover={{ scale: 1.04 }}
            transition={{ type: "spring", stiffness: 200, damping: 15 }}
            className="pointer-events-none absolute -top-[55px] -left-[10px]"
          >
            <Image
              src="/assets/ticket_icon.webp"
              alt=""
              width={400}
              height={400}
              className="h-[360px] w-[360px] object-contain drop-shadow-[0_14px_32px_rgba(0,0,0,0.45)] lg:h-[380px] lg:w-[380px]"
              priority
            />
          </motion.div>

          {/* PRO STARTER PACK pill */}
          <span
            className="absolute left-[26px] top-[20px] inline-flex h-[44px] items-center justify-center rounded-[20px] px-4 text-[13px] uppercase text-white lg:text-[14px]"
            style={{ ...poppins, backgroundColor: PILL_BLACK }}
          >
            {t("store.proStarterPack")}
          </span>

          {/* BEST VALUE pill */}
          <span
            className="absolute bottom-[20px] left-[140px] inline-flex h-[44px] items-center justify-center rounded-[20px] px-4 text-[13px] uppercase text-white lg:text-[14px]"
            style={{ ...poppins, backgroundColor: PILL_BLACK }}
          >
            {t("store.bestValue")}
          </span>
        </div>
      </div>

      {/* ─────────────────────────────────────── MOBILE / TABLET (<xl) ─── */}
      <div className="xl:hidden">
        <div
          className="relative w-full rounded-[20px] px-5 py-6"
          style={{
            backgroundImage: "linear-gradient(180deg, #BA02E8 0%, #790E94 100%)",
          }}
        >
          {/* Ticket area */}
          <div className="relative mx-auto flex h-[230px] w-full max-w-[300px] items-center justify-center">
            <Image
              src="/assets/ticket_icon.webp"
              alt=""
              width={400}
              height={400}
              className="h-[260px] w-[260px] object-contain drop-shadow-[0_12px_28px_rgba(0,0,0,0.4)]"
              priority
            />
            <span
              className="absolute left-0 top-2 inline-flex h-9 items-center rounded-full px-3 text-[11px] uppercase text-white shadow-md"
              style={{ ...poppins, backgroundColor: PILL_BLACK }}
            >
              {t("store.proStarterPack")}
            </span>
            <span
              className="absolute bottom-2 left-12 inline-flex h-9 items-center rounded-full px-3 text-[11px] uppercase text-white shadow-md"
              style={{ ...poppins, backgroundColor: PILL_BLACK }}
            >
              {t("store.bestValue")}
            </span>
          </div>

          {/* Text */}
          <h2
            className="mt-2 text-center text-[26px] uppercase text-white"
            style={poppins}
          >
            {t("store.unlock")} <span style={{ color: ACCENT_YELLOW }}>{t("store.theArena")}</span>
          </h2>
          <p
            className="mt-2 text-center text-[13px] leading-[1.5] text-white/85"
            style={poppins}
          >
            {t("store.bundleDescription", { tickets: `${t("store.ticketsCount")} + ${t("store.bonusCoinsCount")}` })}
          </p>

          {/* Feature pills */}
          <div className="mt-4 flex flex-wrap items-center justify-center gap-2.5">
            <span
              className="inline-flex h-10 items-center rounded-[20px] border-[3px] px-4 text-[12px] uppercase text-white"
              style={{ ...poppins, borderColor: BORDER_YELLOW }}
            >
              {t("store.noAds7Days")}
            </span>
            <span
              className="inline-flex h-10 items-center rounded-[20px] border-[3px] px-4 text-[12px] uppercase text-white"
              style={{ ...poppins, borderColor: BORDER_YELLOW }}
            >
              {t("store.xpBoost")}
            </span>
          </div>

          {/* CTA */}
          <p
            className="mt-5 text-center text-[12px] uppercase text-white/85"
            style={poppins}
          >
            {t("store.limitedTimeOffer")}
          </p>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onBuy?.();
            }}
            className="mt-2 flex h-[58px] w-full items-center justify-center rounded-[20px] text-[20px] uppercase text-white transition-transform active:translate-y-[2px]"
            style={{ ...poppins, backgroundColor: PILL_BLACK }}
          >
            {t("store.unlockBundle")}
          </button>
          <div className="mt-2 flex items-baseline justify-center gap-2">
            <span className="text-[12px] uppercase text-white/85" style={poppins}>
              {t("store.onlyFor")}
            </span>
            <span
              className="text-[22px] uppercase tabular-nums"
              style={{ ...poppins, color: ACCENT_YELLOW }}
            >
              $9.99
            </span>
            <span
              className="text-[12px] uppercase tabular-nums text-white/70 line-through"
              style={poppins}
            >
              $19.99
            </span>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
