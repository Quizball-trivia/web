import { AvatarDisplay } from "@/components/AvatarDisplay";
import type { LeaderboardEntry } from "@/lib/domain/leaderboard";
import { cn } from "@/lib/utils";
import { Minus, TrendingDown, TrendingUp, Trophy } from "lucide-react";

interface LeaderboardTableProps {
  entries: LeaderboardEntry[];
  currentUserId?: string;
  onEntryClick?: (userId: string) => void;
}

const poppins = {
  fontFamily: "'Poppins', sans-serif",
  fontWeight: 600,
  letterSpacing: "0",
  lineHeight: 1,
} as const;

export function LeaderboardTable({ entries, currentUserId, onEntryClick }: LeaderboardTableProps) {
  return (
    <div>
      {/* Column labels — outside the card */}
      <div className="grid grid-cols-12 gap-2 sm:gap-4 px-3 sm:px-4 pb-3 text-[10px] sm:text-xs font-fun font-black uppercase tracking-[0.18em] text-white/45">
        <div className="col-span-2 sm:col-span-2 text-center">Rank</div>
        <div className="col-span-5 sm:col-span-5 text-left">Player</div>
        <div className="col-span-2 sm:col-span-3 text-center">Tier</div>
        <div className="col-span-3 sm:col-span-2 text-center">RP</div>
      </div>

      {/* Rows container with green outline */}
      <div
        className="overflow-hidden rounded-2xl border-2"
        style={{ borderColor: "#38B60E" }}
      >
        <div className="divide-y divide-[#38B60E]/25">
          {entries.map((entry) => {
            const isCurrentUser = entry.isCurrentUser || entry.id === currentUserId;
            const isTopThree = entry.rank <= 3;
            const interactive = !!onEntryClick;

            return (
              <div
                key={entry.id}
                onClick={interactive ? () => onEntryClick(entry.id) : undefined}
                onKeyDown={
                  interactive
                    ? (e) => {
                        if (e.key === "Enter" || e.key === " ") {
                          e.preventDefault();
                          onEntryClick(entry.id);
                        }
                      }
                    : undefined
                }
                role={interactive ? "button" : undefined}
                tabIndex={interactive ? 0 : undefined}
                className={cn(
                  "grid grid-cols-12 gap-2 sm:gap-4 items-center px-3 sm:px-4 py-3 sm:py-3.5 transition-colors",
                  isCurrentUser ? "bg-[#38B60E]" : "hover:bg-white/[0.03]",
                  interactive && "cursor-pointer",
                )}
              >
                {/* Rank */}
                <div className="col-span-2 sm:col-span-2 flex items-center justify-center gap-1">
                  <span
                    className="text-base sm:text-xl tabular-nums text-white"
                    style={poppins}
                  >
                    #{entry.rank}
                  </span>
                  {entry.trend === "up" && (
                    <TrendingUp
                      className={cn(
                        "size-3 shrink-0",
                        isCurrentUser ? "text-white" : "text-[#58CC02]",
                      )}
                    />
                  )}
                  {entry.trend === "down" && (
                    <TrendingDown
                      className={cn(
                        "size-3 shrink-0",
                        isCurrentUser ? "text-white" : "text-[#FF4B4B]",
                      )}
                    />
                  )}
                  {entry.trend === "same" && (
                    <Minus
                      className={cn(
                        "size-3 shrink-0",
                        isCurrentUser ? "text-white/70" : "text-white/35",
                      )}
                    />
                  )}
                </div>

                {/* Player */}
                <div className="col-span-5 sm:col-span-5 flex items-center justify-start gap-2 sm:gap-3 min-w-0">
                  <div className="relative shrink-0">
                    <div className="block sm:hidden">
                      <AvatarDisplay
                        customization={{ base: entry.avatar || "avatar-1" }}
                        size="xs"
                        countryCode={entry.country}
                      />
                    </div>
                    <div className="hidden sm:block">
                      <AvatarDisplay
                        customization={{ base: entry.avatar || "avatar-1" }}
                        size="sm"
                        countryCode={entry.country}
                      />
                    </div>
                    {isTopThree && (
                      <div className="absolute -top-1 -left-1 flex size-4 sm:size-5 items-center justify-center rounded-full bg-[#FFE500] shadow ring-2 ring-[#071013]">
                        <Trophy
                          className="size-2.5 sm:size-3 text-black"
                          strokeWidth={2.5}
                        />
                      </div>
                    )}
                  </div>
                  <span className="truncate text-sm sm:text-base font-fun font-black uppercase text-white">
                    {entry.username}
                  </span>
                </div>

                {/* Tier */}
                <div className="col-span-2 sm:col-span-3 min-w-0 text-center">
                  <span className="truncate text-[10px] sm:text-sm font-fun font-black uppercase tracking-wide text-white">
                    {entry.tier}
                  </span>
                </div>

                {/* RP */}
                <div className="col-span-3 sm:col-span-2 text-center">
                  <span
                    className="text-sm sm:text-base tabular-nums text-white"
                    style={poppins}
                  >
                    {entry.rankPoints.toLocaleString()}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
