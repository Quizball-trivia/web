import { AvatarDisplay } from "@/components/AvatarDisplay";
import type { LeaderboardEntry } from "@/lib/domain/leaderboard";
import { Trophy } from "lucide-react";

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
  return (
    <div
      className="relative flex items-center gap-3 sm:gap-4 rounded-2xl border-2 px-3 sm:px-4 py-3 sm:py-3.5"
      style={{ borderColor: "#38B60E", backgroundColor: "transparent" }}
    >
      {/* Avatar + trophy badge */}
      <div className="relative shrink-0">
        <AvatarDisplay
          customization={{ base: userEntry.avatar || "avatar-1" }}
          countryCode={userEntry.country}
          size="sm"
        />
        <div className="absolute -top-1 -left-1 flex size-5 items-center justify-center rounded-full bg-[#FFE500] shadow-sm ring-2 ring-black">
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
          <span className="text-white/50 truncate">{userEntry.tier}</span>
          <span className="text-[#38B60E] tabular-nums shrink-0">
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
