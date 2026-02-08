import { TrendingUp, TrendingDown, Minus } from "lucide-react";

import { AvatarDisplay } from "@/components/AvatarDisplay";
import { Badge } from "@/components/ui/badge";

import type { LeaderboardEntry } from "@/lib/domain/leaderboard";

interface UserRankStripProps {
  userEntry: LeaderboardEntry;
}

export function UserRankStrip({ userEntry }: UserRankStripProps) {
  return (
    <div className="sticky bottom-0 z-50 pb-2 md:pb-4 pt-6 bg-gradient-to-t from-background from-70% to-transparent pointer-events-none">
      <div className="container max-w-2xl mx-auto px-4 pointer-events-auto">
        <div className="flex items-center gap-4 p-3 rounded-2xl border-2 border-primary/30 border-b-4 border-b-primary/40 bg-primary/10 backdrop-blur-md shadow-2xl shadow-primary/10">

          {/* Rank */}
          <div className="flex flex-col items-center justify-center min-w-[3rem]">
            <span className="text-xl font-fun font-black text-primary">#{userEntry.rank}</span>
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
              <span className="font-fun font-bold truncate text-foreground">{userEntry.username}</span>
              <Badge className="text-[10px] h-4 px-1.5 font-fun font-black bg-primary text-primary-foreground rounded-md">YOU</Badge>
            </div>
            <div className="text-xs text-muted-foreground flex gap-2 font-bold">
              <span>Lvl {userEntry.level}</span>
              <span className="text-primary/80">{userEntry.rankPoints.toLocaleString()} RP</span>
            </div>
          </div>

          {/* Next Rank */}
          {/* TODO: Replace hardcoded "+5 RP" with dynamic pointsToNext from getRankInfo or a new prop.
              Handle edge cases (0/undefined => "MAX" or "—"). Currently mock data without backend logic. */}
          <div className="text-right text-xs hidden sm:block">
            <div className="text-[10px] font-fun font-black text-muted-foreground uppercase tracking-widest">Next Rank</div>
            <div className="font-fun font-black text-primary">+5 RP</div>
          </div>

        </div>
      </div>
    </div>
  );
}
