import { TierFrameAvatar } from "@/components/TierFrameAvatar";
import type { LeaderboardEntry } from "@/lib/domain/leaderboard";
import { getTierAccent } from "@/utils/tierVisuals";
import { Trophy } from "lucide-react";
import { useActiveEventMode } from "@/lib/hooks/useActiveEventMode";

interface UserRankStripProps {
  userEntry: LeaderboardEntry;
}

const poppins = {
  fontFamily: "'Poppins', sans-serif",
  fontWeight: 600,
  letterSpacing: "0",
  lineHeight: 1,
} as const;

export function UserRankStrip({ userEntry }: UserRankStripProps) {
  const { isEventMode } = useActiveEventMode();
  const tierAccent = getTierAccent(userEntry.tier);
  return (
    <div
      className="relative flex items-center gap-3 sm:gap-4 rounded-[10px] border-2 px-3 sm:px-4 py-3 sm:py-3.5"
      style={{ borderColor: isEventMode ? "#FF6C0A" : "#38B60E", backgroundColor: "transparent" }}
    >
      {/* Avatar + trophy badge */}
      <div className="relative shrink-0">
        <TierFrameAvatar
          tier={userEntry.tier}
          avatarCustomization={userEntry.avatarCustomization ?? { base: userEntry.avatar || "avatar-1" }}
          avatarFallback={userEntry.avatar || "avatar-1"}
          countryCode={userEntry.country}
          size="md"
        />
        <div className="absolute -top-1 -left-1 z-20 flex size-5 items-center justify-center rounded-full bg-brand-yellow shadow-sm ring-2 ring-black">
          <Trophy className="size-3 text-black" strokeWidth={2.5} />
        </div>
      </div>

      {/* Info */}
      <div className="min-w-0 flex-1">
        <div
          className="truncate text-base sm:text-xl uppercase text-white"
          style={poppins}
        >
          {userEntry.username}
        </div>
        <div className="mt-1 flex items-center gap-2 text-[10px] sm:text-xs font-fun font-black uppercase tracking-wide">
          <span className="truncate" style={{ color: tierAccent }}>{userEntry.tier}</span>
          <span className="tabular-nums shrink-0 text-white">
            {userEntry.rankPoints.toLocaleString()} RP
          </span>
        </div>
      </div>

      {/* Rank */}
      <div
        className="shrink-0 text-2xl sm:text-3xl text-white tabular-nums"
        style={poppins}
      >
        #{userEntry.rank}
      </div>
    </div>
  );
}
