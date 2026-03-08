import { TrendingUp, TrendingDown, Minus } from "lucide-react";

import { AvatarDisplay } from "@/components/AvatarDisplay";
import { Badge } from "@/components/ui/badge";

import type { LeaderboardEntry } from "@/lib/domain/leaderboard";

interface UserRankStripProps {
  userEntry: LeaderboardEntry;
}

export function UserRankStrip({ userEntry }: UserRankStripProps) {
  return (
    <div className="flex items-center gap-2.5 sm:gap-4 p-2.5 sm:p-3 rounded-2xl border-2 border-primary/30 border-b-4 border-b-primary/40 bg-primary/10 mb-4 sm:mb-6">

      {/* Rank */}
      <div className="flex flex-col items-center justify-center min-w-[2.5rem] sm:min-w-[3rem]">
        <span className="text-lg sm:text-xl font-fun font-black text-primary">#{userEntry.rank}</span>
        <div className="flex items-center gap-0.5 mt-0.5">
          {userEntry.trend === 'up' && <TrendingUp className="size-3 text-[#58CC02]" />}
          {userEntry.trend === 'down' && <TrendingDown className="size-3 text-[#FF4B4B]" />}
          {userEntry.trend === 'same' && <Minus className="size-3 text-muted-foreground" />}
        </div>
      </div>

      {/* Avatar */}
      <AvatarDisplay customization={{ base: 'avatar-1' }} size="sm" className="hidden xs:block border-2 border-primary/20" />

      {/* Info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="font-fun font-bold text-foreground text-sm sm:text-base whitespace-normal break-words line-clamp-1 flex-1">{userEntry.username}</span>
          <Badge className="text-[8px] sm:text-[10px] h-3.5 sm:h-4 px-1 sm:px-1.5 font-fun font-black bg-primary text-primary-foreground rounded-md">YOU</Badge>
        </div>
        <div className="text-[10px] sm:text-xs text-muted-foreground flex gap-2 font-bold">
          <span>{userEntry.tier}</span>
          <span className="text-primary/80">{userEntry.rankPoints.toLocaleString()} RP</span>
        </div>
      </div>

    </div>
  );
}
