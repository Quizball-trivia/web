import { Badge } from "@/components/ui/badge";
import { AvatarDisplay } from "@/components/AvatarDisplay";
import { cn } from "@/lib/utils";
import type { LeaderboardEntry } from "@/lib/domain/leaderboard";
import { TrendingUp, TrendingDown, Minus, Trophy } from "lucide-react";

interface LeaderboardTableProps {
  entries: LeaderboardEntry[];
  currentUserId?: string;
}

export function LeaderboardTable({ entries, currentUserId }: LeaderboardTableProps) {
  return (
    <div className="w-full overflow-hidden rounded-xl border border-border bg-card/40 backdrop-blur-sm">
      <div className="grid grid-cols-12 gap-4 border-b border-border/50 bg-muted/30 px-4 py-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
        <div className="col-span-2 md:col-span-1 text-center">Rank</div>
        <div className="col-span-7 md:col-span-5">Player</div>
        <div className="col-span-3 md:col-span-2 text-center">Level</div>
        <div className="col-span-4 md:col-span-4 text-right hidden md:block">Rank Points</div>
        {/* Mobile RP merged into Player or handle specially */}
      </div>

      <div className="divide-y divide-border/30">
        {entries.map((entry) => {
          const isCurrentUser = entry.isCurrentUser || entry.id === currentUserId;

          return (
            <div
              key={entry.id}
              className={cn(
                "grid grid-cols-12 gap-4 items-center px-4 py-3 transition-colors hover:bg-muted/40",
                isCurrentUser && "bg-primary/5 hover:bg-primary/10"
              )}
            >
              {/* Rank */}
              <div className="col-span-2 md:col-span-1 flex flex-col items-center justify-center">
                <span className={cn("text-lg font-bold tabular-nums", 
                    entry.rank <= 3 ? "text-yellow-500" : "text-foreground"
                )}>
                  {entry.rank}
                </span>
                
                {/* Trend Indicator */}
                <div className="flex items-center gap-0.5 mt-0.5">
                    {entry.trend === 'up' && <TrendingUp className="size-3 text-green-500" />}
                    {entry.trend === 'down' && <TrendingDown className="size-3 text-red-500" />}
                    {entry.trend === 'same' && <Minus className="size-3 text-muted-foreground" />}
                    {entry.trend !== 'same' && <span className="text-[10px] text-muted-foreground">{entry.trendValue}</span>}
                </div>
              </div>

              {/* Player */}
              <div className="col-span-7 md:col-span-5 flex items-center gap-3">
                 <div className="relative size-8 md:size-10 shrink-0">
                    <AvatarDisplay 
                        customization={{ base: 'avatar-1' }} // Mock/Default if missing
                        size="sm" 
                    />
                    {entry.rank <= 3 && (
                        <div className="absolute -top-1 -right-1 bg-yellow-500 text-white text-[8px] size-4 rounded-full flex items-center justify-center border border-background shadow-sm">
                            <Trophy className="size-2.5" />
                        </div>
                    )}
                 </div>
                 <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                        <span className={cn("truncate font-medium text-sm md:text-base", isCurrentUser && "text-primary")}>
                            {entry.username}
                        </span>
                        {isCurrentUser && <Badge variant="secondary" className="text-[10px] h-4 px-1">YOU</Badge>}
                    </div>
                    <div className="block md:hidden text-xs font-semibold text-primary/80 mt-0.5">
                        {entry.rankPoints} RP
                    </div>
                 </div>
              </div>

              {/* Level */}
              <div className="col-span-3 md:col-span-2 text-center">
                 <Badge variant="outline" className="bg-background/50 text-xs font-mono">
                    LVL {entry.level}
                 </Badge>
              </div>

              {/* RP (Desktop) */}
              <div className="col-span-4 md:col-span-4 text-right hidden md:block">
                 <div className="font-bold text-primary tabular-nums">{entry.rankPoints.toLocaleString()} RP</div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
