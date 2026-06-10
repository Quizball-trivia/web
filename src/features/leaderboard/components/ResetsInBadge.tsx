"use client";

import { Clock } from "lucide-react";
import { useLocale } from "@/contexts/LocaleContext";
import { cn } from "@/lib/utils";
import { useLeaderboardReset } from "../hooks/useLeaderboardReset";

// "Resets in HH:MM:SS" pill, styled after the leaderboard's current-user
// (brand-green) badge but a bit larger so the countdown is readable. Counts
// down to the next 12:00 PM Georgia time (Asia/Tbilisi) reset.
export function ResetsInBadge({ className }: { className?: string }) {
  const { t } = useLocale();
  const { formatted } = useLeaderboardReset();

  return (
    <div
      className={cn(
        "inline-flex items-center gap-2 rounded-full bg-brand-green px-3.5 py-1.5",
        "shadow-[0_2px_12px_rgba(34,197,94,0.25)]",
        className,
      )}
      aria-label={`${t("leaderboard.resetsIn")} ${formatted}`}
    >
      <Clock className="h-3.5 w-3.5 shrink-0 text-white/90" aria-hidden />
      <span className="font-fun text-[10px] font-black uppercase tracking-wide text-white/80 sm:text-xs">
        {t("leaderboard.resetsIn")}
      </span>
      <span className="font-fun text-sm font-black tabular-nums text-white sm:text-base">
        {formatted}
      </span>
    </div>
  );
}
