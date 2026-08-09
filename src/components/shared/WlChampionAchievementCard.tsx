"use client";

import { WlChampionMedal, type WlMedalPlace } from "@/components/shared/WlChampionMedal";
import { useLocale } from "@/contexts/LocaleContext";
import type { MessageKey } from "@/lib/i18n/messages";
import { cn } from "@/lib/utils";

const THEMES: Record<WlMedalPlace, { border: string; glow: string; title: string }> = {
  1: {
    border: "border-brand-gold/60",
    glow: "shadow-[0_0_24px_rgba(255,215,0,0.18)]",
    title: "text-brand-gold",
  },
  2: {
    border: "border-white/30",
    glow: "shadow-[0_0_24px_rgba(255,255,255,0.10)]",
    title: "text-white/85",
  },
  3: {
    border: "border-brand-orange/50",
    glow: "shadow-[0_0_24px_rgba(255,150,0,0.14)]",
    title: "text-brand-orange",
  },
};

const TITLE_KEYS: Record<WlMedalPlace, MessageKey> = {
  1: "wlAward.title1",
  2: "wlAward.title2",
  3: "wlAward.title3",
};

interface WlChampionAchievementCardProps {
  place: WlMedalPlace;
  /** e.g. "9 აგვისტო 2026" — which weekend this podium was earned. */
  weekLabel?: string;
  className?: string;
}

/** Profile achievement row for Weekend League podium finishers — the exact
 *  visual language of the World Cup card, one row per earned weekend. */
export function WlChampionAchievementCard({ place, weekLabel, className }: WlChampionAchievementCardProps) {
  const { t } = useLocale();
  const theme = THEMES[place];
  return (
    <div
      className={cn(
        "relative flex items-center gap-3 overflow-hidden rounded-[14px] border-2 bg-surface-card px-3 py-2.5 sm:gap-4 sm:px-4 sm:py-3",
        theme.border,
        theme.glow,
        className,
      )}
    >
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.07]"
        style={{ background: "radial-gradient(circle at 12% 50%, currentColor 0%, transparent 55%)" }}
      />
      <WlChampionMedal place={place} className="w-11 shrink-0 sm:w-16" />
      <div className="min-w-0 flex-1">
        <div className={cn("font-poppins text-[12.5px] font-bold uppercase leading-tight sm:text-base", theme.title)}>
          {t(TITLE_KEYS[place])}
        </div>
        {weekLabel && (
          <div className="mt-0.5 font-poppins text-[10.5px] font-semibold text-white/55 sm:text-[12px]">
            {weekLabel}
          </div>
        )}
      </div>
    </div>
  );
}

export function isWlAwardSlug(eventSlug: string): boolean {
  return eventSlug.startsWith("weekend-league");
}

const KA_MONTHS = ["იანვარი", "თებერვალი", "მარტი", "აპრილი", "მაისი", "ივნისი",
  "ივლისი", "აგვისტო", "სექტემბერი", "ოქტომბერი", "ნოემბერი", "დეკემბერი"];

/** "weekend-league-2026-08-08" → "Weekend League · 8 აგვისტო 2026". */
export function wlAwardWeekLabel(eventSlug: string): string | undefined {
  const m = eventSlug.match(/(\d{4})-(\d{2})-(\d{2})$/);
  if (!m) return undefined;
  const month = KA_MONTHS[Number(m[2]) - 1] ?? m[2];
  return `Weekend League · ${Number(m[3])} ${month} ${m[1]}`;
}
