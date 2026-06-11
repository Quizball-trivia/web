"use client";

import { useState } from "react";
import { Trophy } from "lucide-react";
import { useLocale } from "@/contexts/LocaleContext";
import { cn } from "@/lib/utils";
import { useActiveEventMode } from "@/lib/hooks/useActiveEventMode";

const WC_END = new Date("2026-07-19T23:59:59Z").getTime();

export function ResetsInBadge({ className }: { className?: string }) {
  const { t } = useLocale();
  const { isEventMode } = useActiveEventMode();
  const [wcDaysLeft] = useState(() =>
    Math.max(0, Math.ceil((WC_END - Date.now()) / 86_400_000))
  );

  if (!isEventMode) {
    return null;
  }

  return (
    <div
      className={cn(
        "inline-flex items-center gap-2 rounded-full bg-brand-orange px-3.5 py-1.5",
        "shadow-[0_2px_12px_rgba(255,108,10,0.25)]",
        className,
      )}
      aria-label={t("leaderboard.wcSeasonEnds", { count: wcDaysLeft })}
    >
      <Trophy className="h-3.5 w-3.5 shrink-0 text-white/90" aria-hidden />
      <span className="font-fun text-[10px] font-black uppercase tracking-wide text-white sm:text-xs">
        {t("leaderboard.wcSeasonEnds", { count: wcDaysLeft })}
      </span>
    </div>
  );
}
