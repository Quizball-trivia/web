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
    <div className="w-full overflow-hidden rounded-2xl border-2 border-border border-b-4 bg-card">
      {/* Header */}
      <div className="grid grid-cols-12 gap-4 border-b-2 border-border/50 bg-muted/30 px-4 py-3 text-[10px] font-fun font-black uppercase tracking-widest text-muted-foreground">
        <div className="col-span-2 md:col-span-1 text-center">Rank</div>
        <div className="col-span-7 md:col-span-5">Player</div>
        <div className="col-span-3 md:col-span-2 text-center">Level</div>
        <div className="col-span-4 md:col-span-4 text-right hidden md:block">Rank Points</div>
      </div>

      {/* Rows */}
      <div className="divide-y divide-border/30">
        {entries.map((entry) => {
          const isCurrentUser = entry.isCurrentUser || entry.id === currentUserId;

          return (
            <div
              key={entry.id}
              className={cn(
                "grid grid-cols-12 gap-4 items-center px-4 py-3 transition-colors hover:bg-muted/30",
                isCurrentUser && "bg-primary/5 hover:bg-primary/10 border-l-4 border-l-primary"
              )}
            >
              {/* Rank */}
              <div className="col-span-2 md:col-span-1 flex flex-col items-center justify-center">
                <span className={cn(
                  "text-lg font-fun font-black tabular-nums",
                  entry.rank === 1 && "text-yellow-400",
                  entry.rank === 2 && "text-slate-300",
                  entry.rank === 3 && "text-orange-500",
                  entry.rank > 3 && "text-foreground"
                )}>
                  {entry.rank}
                </span>
                <div className="flex items-center gap-0.5 mt-0.5">
                  {entry.trend === 'up' && <TrendingUp className="size-3 text-[#58CC02]" />}
                  {entry.trend === 'down' && <TrendingDown className="size-3 text-[#FF4B4B]" />}
                  {entry.trend === 'same' && <Minus className="size-3 text-muted-foreground" />}
                  {entry.trend !== 'same' && (
                    <span className="text-[10px] font-bold text-muted-foreground">{entry.trendValue}</span>
                  )}
                </div>
              </div>

              {/* Player */}
              <div className="col-span-7 md:col-span-5 flex items-center gap-3">
                <div className="relative size-8 md:size-10 shrink-0">
                  <AvatarDisplay
                    customization={{ base: entry.avatar || 'avatar-1' }}
                    size="sm"
                  />
                  {entry.rank <= 3 && (
                    <div className="absolute -top-1 -right-1 bg-yellow-500 text-white text-[8px] size-4 rounded-full flex items-center justify-center border-2 border-background shadow-sm">
                      <Trophy className="size-2.5" />
                    </div>
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className={cn(
                      "truncate font-fun font-bold text-sm md:text-base",
                      isCurrentUser && "text-primary"
                    )}>
                      {entry.username}
                    </span>
                    {isCurrentUser && (
                      <Badge className="text-[10px] h-4 px-1.5 font-fun font-black bg-primary text-primary-foreground rounded-md">
                        YOU
                      </Badge>
                    )}
                  </div>
                  <div className="block md:hidden text-xs font-bold text-primary/80 mt-0.5">
                    {entry.rankPoints} RP
                  </div>
                </div>
              </div>

              {/* Level */}
              <div className="col-span-3 md:col-span-2 text-center">
                <Badge variant="outline" className="bg-muted/50 text-xs font-fun font-black rounded-lg border-2">
                  LVL {entry.level}
                </Badge>
              </div>

              {/* RP (Desktop) */}
              <div className="col-span-4 md:col-span-4 text-right hidden md:block">
                <span className="font-fun font-black text-primary tabular-nums">
                  {entry.rankPoints.toLocaleString()} RP
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
