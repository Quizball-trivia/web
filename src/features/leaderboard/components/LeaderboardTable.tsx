import { Badge } from "@/components/ui/badge";
import { AvatarDisplay } from "@/components/AvatarDisplay";
import { cn } from "@/lib/utils";
import type { LeaderboardEntry } from "@/lib/domain/leaderboard";
import { TrendingUp, TrendingDown, Minus, Trophy } from "lucide-react";

interface LeaderboardTableProps {
  entries: LeaderboardEntry[];
  currentUserId?: string;
}

const TIER_COLORS: Record<string, string> = {
  GOAT: "bg-yellow-500/20 text-yellow-600 border-yellow-500/40",
  Legend: "bg-purple-500/20 text-purple-600 border-purple-500/40",
  "World-Class": "bg-blue-500/20 text-blue-600 border-blue-500/40",
  Captain: "bg-cyan-500/20 text-cyan-600 border-cyan-500/40",
  "Key Player": "bg-green-500/20 text-green-600 border-green-500/40",
  Starting11: "bg-emerald-500/20 text-emerald-600 border-emerald-500/40",
  Rotation: "bg-slate-400/20 text-slate-500 border-slate-400/40",
  Bench: "bg-orange-400/20 text-orange-500 border-orange-400/40",
  Reserve: "bg-stone-400/20 text-stone-500 border-stone-400/40",
  "Youth Prospect": "bg-stone-300/20 text-stone-400 border-stone-300/40",
  Academy: "bg-stone-200/20 text-stone-400 border-stone-200/40",
};

export function LeaderboardTable({ entries, currentUserId }: LeaderboardTableProps) {
  return (
    <div className="w-full overflow-hidden rounded-2xl border-2 border-border border-b-4 bg-card">
      {/* Header */}
      {/* Header */}
      <div className="grid grid-cols-12 gap-1 sm:gap-4 border-b-2 border-border/50 bg-muted/30 px-2 sm:px-4 py-3 text-[9px] sm:text-[10px] font-fun font-black uppercase tracking-widest text-muted-foreground">
        <div className="col-span-2 sm:col-span-1 text-center">Rank</div>
        <div className="col-span-6 sm:col-span-5 px-1 sm:px-0">Player</div>
        <div className="col-span-4 sm:col-span-2 text-center">Tier</div>
        <div className="col-span-4 text-right hidden sm:block">Rank Points</div>
      </div>

      {/* Rows */}
      <div className="divide-y divide-border/30">
        {entries.map((entry) => {
          const isCurrentUser = entry.isCurrentUser || entry.id === currentUserId;
          const tierColor = TIER_COLORS[entry.tier] ?? TIER_COLORS.Rotation;

          return (
            <div
              key={entry.id}
              className={cn(
                "grid grid-cols-12 gap-1 sm:gap-4 items-center px-2 sm:px-4 py-2.5 sm:py-3 transition-colors hover:bg-muted/30",
                isCurrentUser && "bg-primary/5 hover:bg-primary/10 border-l-4 border-l-primary"
              )}
            >
              {/* Rank */}
              <div className="col-span-2 sm:col-span-1 flex flex-col items-center justify-center">
                <span className={cn(
                  "text-sm sm:text-lg font-fun font-black tabular-nums",
                  entry.rank === 1 && "text-yellow-400",
                  entry.rank === 2 && "text-slate-300",
                  entry.rank === 3 && "text-orange-500",
                  entry.rank > 3 && "text-foreground"
                )}>
                  {entry.rank}
                </span>
                <div className="flex items-center gap-0.5 mt-0.5">
                  {entry.trend === 'up' && <TrendingUp className="size-2.5 sm:size-3 text-[#58CC02]" />}
                  {entry.trend === 'down' && <TrendingDown className="size-2.5 sm:size-3 text-[#FF4B4B]" />}
                  {entry.trend === 'same' && <Minus className="size-2.5 sm:size-3 text-muted-foreground" />}
                </div>
              </div>

              {/* Player */}
              <div className="col-span-6 sm:col-span-5 flex items-center gap-1.5 sm:gap-3 min-w-0">
                <div className="relative shrink-0">
                  <div className="block sm:hidden">
                    <AvatarDisplay
                      customization={{ base: entry.avatar || 'avatar-1' }}
                      size="xs"
                    />
                  </div>
                  <div className="hidden sm:block">
                    <AvatarDisplay
                      customization={{ base: entry.avatar || 'avatar-1' }}
                      size="sm"
                    />
                  </div>
                  {entry.rank <= 3 && (
                    <div className="absolute -top-1 -right-1 bg-yellow-500 text-white text-[6px] sm:text-[8px] size-3 sm:size-4 rounded-full flex items-center justify-center border-[1.5px] sm:border-2 border-background shadow-sm">
                      <Trophy className="size-2 sm:size-2.5" />
                    </div>
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1 sm:gap-1.5">
                    <span className={cn(
                      "font-fun font-bold text-[11px] sm:text-base leading-tight whitespace-normal break-words line-clamp-2 flex-1",
                      isCurrentUser && "text-primary"
                    )}>
                      {entry.username}
                    </span>
                    {isCurrentUser && (
                      <Badge className="text-[7px] sm:text-[10px] h-3 sm:h-4 px-1 sm:px-1.5 font-fun font-black bg-primary text-primary-foreground rounded-md shrink-0">
                        YOU
                      </Badge>
                    )}
                  </div>
                  <div className="block sm:hidden text-[9px] font-bold text-primary/80 mt-0.5">
                    {entry.rankPoints.toLocaleString()} RP
                  </div>
                </div>
              </div>

              {/* Tier */}
              <div className="col-span-4 sm:col-span-2 flex justify-center">
                <Badge variant="outline" className={cn("text-[8px] sm:text-xs font-fun font-black rounded-lg border-[1.5px] sm:border-2 px-1 sm:px-2 whitespace-nowrap", tierColor)}>
                  {entry.tier}
                </Badge>
              </div>

              {/* RP (Desktop) */}
              <div className="col-span-4 text-right hidden sm:block">
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
