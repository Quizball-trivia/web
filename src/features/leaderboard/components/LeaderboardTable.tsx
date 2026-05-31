import { AvatarDisplay } from "@/components/AvatarDisplay";
import type { LeaderboardEntry } from "@/lib/domain/leaderboard";
import { cn } from "@/lib/utils";
import { getTierAccent } from "@/utils/tierVisuals";
import { Minus, TrendingDown, TrendingUp, Trophy } from "lucide-react";
import { useLocale } from "@/contexts/LocaleContext";

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
  const { t } = useLocale();
  return (
    <div>
      {/* Column labels — outside the card */}
      <div className="grid grid-cols-12 gap-2 sm:gap-4 px-3 sm:px-4 pb-3 text-[10px] sm:text-xs font-fun font-black uppercase tracking-[0.18em] text-white/45">
        <div className="col-span-2 sm:col-span-2 text-center">{t('leaderboard.colRank')}</div>
        <div className="col-span-5 sm:col-span-5 text-left">{t('leaderboard.colPlayer')}</div>
        <div className="col-span-2 sm:col-span-3 text-center">{t('leaderboard.colTier')}</div>
        <div className="col-span-3 sm:col-span-2 text-center">{t('leaderboard.colRP')}</div>
      </div>

      {/* Rows container with green outline */}
      <div
        className="overflow-hidden rounded-[10px] border-2"
        style={{ borderColor: "#38B60E" }}
      >
        <div className="divide-y divide-brand-green/25">
          {entries.map((entry) => {
            const isCurrentUser = entry.isCurrentUser || entry.id === currentUserId;
            const isTopThree = entry.rank <= 3;
            const interactive = !!onEntryClick;
            const tierAccent = getTierAccent(entry.tier);

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
                  isCurrentUser ? "bg-brand-green" : "hover:bg-white/[0.03]",
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
                        isCurrentUser ? "text-white" : "text-brand-green-light",
                      )}
                    />
                  )}
                  {entry.trend === "down" && (
                    <TrendingDown
                      className={cn(
                        "size-3 shrink-0",
                        isCurrentUser ? "text-white" : "text-brand-red-soft",
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
                        customization={entry.avatarCustomization ?? { base: entry.avatar || "avatar-1" }}
                        size="sm"
                        countryCode={entry.country}
                      />
                    </div>
                    <div className="hidden sm:block">
                      <AvatarDisplay
                        customization={entry.avatarCustomization ?? { base: entry.avatar || "avatar-1" }}
                        size="md"
                        countryCode={entry.country}
                      />
                    </div>
                    {isTopThree && (
                      <div className="absolute -top-1 -left-1 flex size-4 sm:size-5 items-center justify-center rounded-full bg-brand-yellow shadow ring-2 ring-surface-page">
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
                  <span
                    className="block truncate text-[10px] sm:text-sm font-fun font-black uppercase tracking-wide"
                    style={{ color: isCurrentUser ? "#FFFFFF" : tierAccent }}
                  >
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
