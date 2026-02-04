import { TrendingUp, TrendingDown, Minus } from "lucide-react";

import { AvatarDisplay } from "@/components/AvatarDisplay";
import { Badge } from "@/components/ui/badge";

import type { LeaderboardEntry } from "@/lib/domain/leaderboard";

interface UserRankStripProps {
  userEntry: LeaderboardEntry;
}

export function UserRankStrip({ userEntry }: UserRankStripProps) {
  return (
    <div className="fixed bottom-[56px] md:bottom-0 left-0 right-0 z-50 p-2 md:p-4 bg-gradient-to-t from-background via-background/95 to-transparent pointer-events-none">
        <div className="container max-w-2xl mx-auto pointer-events-auto">
            <div className="flex items-center gap-4 p-3 rounded-xl border border-primary/30 bg-primary/10 backdrop-blur-md shadow-2xl shadow-primary/10">
                
                {/* Rank */}
                <div className="flex flex-col items-center justify-center min-w-[3rem]">
                    <span className="text-xl font-black text-primary">#{userEntry.rank}</span>
                    <div className="flex items-center gap-0.5 mt-0.5">
                        {userEntry.trend === 'up' && <TrendingUp className="size-3 text-green-500" />}
                        {userEntry.trend === 'down' && <TrendingDown className="size-3 text-red-500" />}
                        {userEntry.trend === 'same' && <Minus className="size-3 text-muted-foreground" />}
                    </div>
                </div>

                {/* Avatar */}
                <AvatarDisplay customization={{ base: 'avatar-1' }} size="sm" className="hidden xs:block border-2 border-primary/20" />

                {/* Info */}
                <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                        <span className="font-bold truncate text-foreground">{userEntry.username}</span>
                        <Badge variant="default" className="text-[10px] h-4 px-1">YOU</Badge>
                    </div>
                    <div className="text-xs text-muted-foreground flex gap-2">
                         <span>Lvl {userEntry.level}</span>
                         <span className="text-primary/80 font-medium">{userEntry.rankPoints.toLocaleString()} RP</span>
                    </div>
                </div>

                {/* Status/Distance */}
                <div className="text-right text-xs hidden sm:block">
                    <div className="text-muted-foreground">Next Rank</div>
                    <div className="font-medium text-foreground">
                        {/* Mock simple calculation */}+5 RP
                    </div>
                </div>

            </div>
        </div>
    </div>
  );
}
