"use client";

import { useLocale } from "@/contexts/LocaleContext";
import { BoardBadge } from "./BoardBadge";

const MEDAL = { 1: "#FFD700", 2: "#C7CBD1", 3: "#CD7F32" } as const;

interface TopBadgeProps {
  kind: "country" | "club";
  value: string;
  rank: 1 | 2 | 3;
}

/** "No.1 fan" (club) / "No.1" (country) badge held by a board's top three. */
export function TopBadge({ kind, value, rank }: TopBadgeProps) {
  const { t } = useLocale();
  return (
    <span
      className="inline-flex items-center gap-1.5 text-[11px] font-black uppercase tracking-wide drop-shadow-[0_1px_2px_rgba(0,0,0,0.8)]"
      style={{ color: MEDAL[rank] }}
    >
      <BoardBadge kind={kind} value={value} className={kind === "club" ? "size-4" : "text-[12px]"} />
      {kind === "club" ? t("leaderboard.topFanBadge", { rank }) : t("leaderboard.topCountryBadge", { rank })}
    </span>
  );
}
