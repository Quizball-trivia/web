"use client";

import Image from "next/image";

import { WorldCupMedal, type MedalPlace } from "@/components/shared/WorldCupMedal";
import { useLocale } from "@/contexts/LocaleContext";
import type { MessageKey } from "@/lib/i18n/messages";
import { cn } from "@/lib/utils";

const THEMES: Record<
  MedalPlace,
  { border: string; glow: string; title: string }
> = {
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

const TITLE_KEYS: Record<MedalPlace, MessageKey> = {
  1: "wcAward.title1",
  2: "wcAward.title2",
  3: "wcAward.title3",
};

const SUBTITLE_KEYS: Record<MedalPlace, MessageKey> = {
  1: "wcAward.achSubtitle1",
  2: "wcAward.achSubtitle2",
  3: "wcAward.achSubtitle3",
};

interface WorldCupAchievementCardProps {
  place: MedalPlace;
  className?: string;
}

/** Profile achievement row for World Cup event podium finishers. */
export function WorldCupAchievementCard({
  place,
  className,
}: WorldCupAchievementCardProps) {
  const { t } = useLocale();
  const theme = THEMES[place];
  return (
    <div
      className={cn(
        "relative flex items-center gap-4 overflow-hidden rounded-[14px] border-2 bg-surface-card px-4 py-3",
        theme.border,
        theme.glow,
        className,
      )}
    >
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.07]"
        style={{
          background:
            "radial-gradient(circle at 12% 50%, currentColor 0%, transparent 55%)",
        }}
      />
      <WorldCupMedal place={place} className="w-14 shrink-0 sm:w-16" />
      <div className="min-w-0 flex-1">
        <div
          className={cn(
            "font-poppins text-sm font-bold uppercase leading-tight sm:text-base",
            theme.title,
          )}
        >
          {t(TITLE_KEYS[place])}
        </div>
        <div className="mt-1 text-[11px] font-semibold leading-snug text-white/60 sm:text-xs">
          {t(SUBTITLE_KEYS[place])}
        </div>
      </div>
      <div className="flex shrink-0 flex-col items-end gap-1">
        <span className="text-[7px] font-bold uppercase tracking-[0.14em] text-white/45">
          {t("welcome.poweredBy")}
        </span>
        <Image
          src="/assets/betsson/3.png"
          alt="Betsson Sport"
          width={80}
          height={16}
          className="h-3 w-auto object-contain"
        />
      </div>
    </div>
  );
}
