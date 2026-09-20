"use client";

import { useLocale } from "@/contexts/LocaleContext";

/**
 * Global question-counter pill for daily games embedded in an external flow
 * (the promo quiz): same look as the ranked possession counter, no timer,
 * no back button.
 */
export function EmbeddedCounterPill({ current, total }: { current: number; total: number }) {
  const { t } = useLocale();
  return (
    <div className="mx-auto mt-1.5 w-full max-w-3xl px-3 sm:px-4">
      <div
        className="font-poppins flex items-center justify-center rounded-[16px] bg-brand-blue px-5 text-white h-[40px] sm:h-[52px] md:h-[62px] lg:h-[72px]"
        style={{ fontWeight: 600, fontSize: "clamp(14px, 2.2vw, 26px)" }}
      >
        {t("possession.questionCounter", { current, total })}
      </div>
    </div>
  );
}
