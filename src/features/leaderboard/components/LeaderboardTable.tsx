import { Badge } from "@/components/ui/badge";
import { AvatarDisplay } from "@/components/AvatarDisplay";
import { cn } from "@/lib/utils";
import type { LeaderboardEntry } from "@/lib/domain/leaderboard";
import { TrendingUp, TrendingDown, Minus, Trophy } from "lucide-react";

interface LeaderboardTableProps {
  entries: LeaderboardEntry[];
  currentUserId?: string;
  onEntryClick?: (userId: string) => void;
}

const TIER_COLORS: Record<string, string> = {
  GOAT: "border-[#FFD84D]/40 bg-[#FFD84D]/10 text-[#FFE37A]",
  Legend: "border-[#F68A1F]/40 bg-[#F68A1F]/10 text-[#FFB45C]",
  "World-Class": "border-[#2E78FF]/45 bg-[#2E78FF]/12 text-[#77A8FF]",
  Captain: "border-[#18B6D9]/40 bg-[#18B6D9]/10 text-[#67D6F2]",
  "Key Player": "border-[#38B60E]/40 bg-[#38B60E]/10 text-[#73EA4E]",
  Starting11: "border-[#15A36D]/40 bg-[#15A36D]/10 text-[#57D89F]",
  Rotation: "border-white/15 bg-white/[0.05] text-white/60",
  Bench: "border-[#D4811F]/35 bg-[#D4811F]/10 text-[#F1A852]",
  Reserve: "border-[#8B95A7]/25 bg-[#8B95A7]/10 text-[#B7C0D0]",
  "Youth Prospect": "border-[#A0D639]/35 bg-[#A0D639]/10 text-[#C4EB6C]",
  Academy: "border-white/12 bg-white/[0.04] text-white/50",
};

export function LeaderboardTable({ entries, currentUserId, onEntryClick }: LeaderboardTableProps) {
  return (
    <div className="w-full overflow-hidden rounded-[28px] border border-white/10 bg-[#071013] shadow-[inset_0_1px_0_rgba(255,255,255,0.03)]">
      {/* Header */}
      {/* Header */}
      <div className="grid grid-cols-12 gap-1 sm:gap-4 border-b border-white/8 bg-white/[0.03] px-2 sm:px-4 py-3 text-[9px] sm:text-[10px] font-fun font-black uppercase tracking-widest text-white/45">
        <div className="col-span-2 sm:col-span-1 text-center">Rank</div>
        <div className="col-span-6 sm:col-span-5 px-1 sm:px-0">Player</div>
        <div className="col-span-4 sm:col-span-2 text-center">Tier</div>
        <div className="col-span-4 text-right hidden sm:block">Rank Points</div>
      </div>

      {/* Rows */}
      <div className="divide-y divide-white/6">
        {entries.map((entry) => {
          const isCurrentUser = entry.isCurrentUser || entry.id === currentUserId;
          const tierColor = TIER_COLORS[entry.tier] ?? TIER_COLORS.Rotation;

          return (
            <div
              key={entry.id}
              onClick={() => onEntryClick?.(entry.id)}
              role={onEntryClick ? "button" : undefined}
              tabIndex={onEntryClick ? 0 : undefined}
              onKeyDown={onEntryClick ? (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onEntryClick(entry.id); } } : undefined}
              className={cn(
                "grid grid-cols-12 gap-1 sm:gap-4 items-center px-2 sm:px-4 py-2.5 sm:py-3 transition-colors hover:bg-white/[0.025]",
                isCurrentUser && "bg-[#38B60E]/[0.04] hover:bg-[#38B60E]/[0.07] border-l-4 border-l-[#38B60E]",
                onEntryClick && "cursor-pointer"
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
                  {entry.trend === 'same' && <Minus className="size-2.5 sm:size-3 text-white/35" />}
                </div>
              </div>

              {/* Player */}
              <div className="col-span-6 sm:col-span-5 flex items-center gap-1.5 sm:gap-3 min-w-0">
                <div className="relative shrink-0">
                  <div className="block sm:hidden">
                    <AvatarDisplay
                      customization={{ base: entry.avatar || 'avatar-1' }}
                      size="xs"
                      countryCode={entry.country}
                    />
                  </div>
                  <div className="hidden sm:block">
                    <AvatarDisplay
                      customization={{ base: entry.avatar || 'avatar-1' }}
                      size="sm"
                      countryCode={entry.country}
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
                      isCurrentUser && "text-[#73EA4E]"
                    )}>
                      {entry.username}
                    </span>
                    {isCurrentUser && (
                      <Badge className="text-[7px] sm:text-[10px] h-3 sm:h-4 px-1 sm:px-1.5 font-fun font-black rounded-md shrink-0 bg-[#38B60E] text-white">
                        YOU
                      </Badge>
                    )}
                  </div>
                  <div className="block sm:hidden text-[9px] font-bold text-[#52D77A] mt-0.5">
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
                <span className="font-fun font-black text-[#52D77A] tabular-nums">
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
