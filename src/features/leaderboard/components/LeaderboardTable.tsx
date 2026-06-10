import Image from "next/image";
import { TierFrameAvatar } from "@/components/TierFrameAvatar";
import type { LeaderboardEntry } from "@/lib/domain/leaderboard";
import { cn } from "@/lib/utils";
import { getTierAccent } from "@/utils/tierVisuals";
import { useLocale } from "@/contexts/LocaleContext";
import { useActiveEventMode } from "@/lib/hooks/useActiveEventMode";

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

const PRIZE_IMAGES: Record<number, { src: string; alt: string }> = {
  1: { src: "/assets/world-cup-promotion/Layer 6.png", alt: "iPhone" },
  2: { src: "/assets/world-cup-promotion/Sony-PlayStation-5-Digital-Edition-Console-Wholesale-Product-Hero2.png", alt: "PS5" },
  3: { src: "/assets/world-cup-promotion/pngtree-apple-airpods-pro-in-a-charging-case-with-the-lid-open-png-image_16254552.png", alt: "AirPods" },
};

export function LeaderboardTable({ entries, currentUserId, onEntryClick }: LeaderboardTableProps) {
  const { t } = useLocale();
  const { isEventMode } = useActiveEventMode();
  return (
    <div className="relative">
      {/* Column labels */}
      <div className="grid grid-cols-12 gap-2 sm:gap-4 px-3 sm:px-4 pb-3 text-[10px] sm:text-xs font-fun font-black uppercase tracking-[0.18em] text-white/45">
        <div className="col-span-3 text-center">{t('leaderboard.colRank')}</div>
        <div className="col-span-4 text-left">{t('leaderboard.colPlayer')}</div>
        <div className="col-span-2 sm:col-span-3 text-center">{t('leaderboard.colTier')}</div>
        <div className="col-span-3 sm:col-span-2 text-center">{t('leaderboard.colRP')}</div>
      </div>

      {/* Table wrapper */}
      <div className="relative">
        {/* Betsson badge — event only, top-right corner of border */}
        {isEventMode && (
          <div
            className="absolute -top-1 -right-2 z-20 flex flex-col items-start rounded-md px-2 py-1"
            style={{ backgroundColor: '#FF6C0A', width: 120, height: 34, rotate: '-5.8deg', border: '2px solid #000', boxShadow: '0 4px 12px rgba(0,0,0,0.4)' }}
          >
            <span className="text-[6px] font-bold uppercase tracking-wider text-white/80 leading-none">{t('welcome.poweredBy')}</span>
            <Image src="/assets/betsson/3.png" alt="Betsson Sport" width={96} height={18} className="h-4 w-auto object-contain mt-0.5" />
          </div>
        )}

        {/* Bordered table */}
        <div
          className="overflow-visible rounded-[10px] border-2"
          style={{ borderColor: isEventMode ? "#FF6C0A" : "#38B60E" }}
        >
          <div className={cn("divide-y", isEventMode ? "divide-white/5" : "divide-brand-green/25")}>
            {entries.map((entry) => {
              const isCurrentUser = entry.isCurrentUser || entry.id === currentUserId;
              const isFirst = entry.rank === 1;
              const isTopThree = entry.rank <= 3;
              const interactive = !!onEntryClick;
              const tierAccent = getTierAccent(entry.tier);
              const prize = PRIZE_IMAGES[entry.rank];

              return (
                <div key={entry.id} className="relative">
                  {/* Row content */}
                  <div
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
                      "grid grid-cols-12 gap-2 sm:gap-4 items-center px-3 sm:px-4 py-3.5 sm:py-4 transition-colors",
                      isEventMode && isFirst
                        ? "text-white"
                        : isCurrentUser
                          ? "bg-brand-green"
                          : "hover:bg-white/[0.03]",
                      interactive && "cursor-pointer",
                    )}
                    style={isEventMode && isFirst ? { backgroundColor: '#FF6C0A' } : undefined}
                  >
                    {/* Rank (+ prize image + event gift, stacked under the rank) */}
                    <div className="col-span-3 flex items-center justify-center gap-1.5 sm:gap-2">
                      {prize && (
                        <Image
                          src={prize.src}
                          alt={prize.alt}
                          width={40}
                          height={48}
                          className="h-9 sm:h-12 w-auto object-contain shrink-0"
                        />
                      )}
                      <div className="flex flex-col items-center gap-1">
                        <span
                          className="text-xl sm:text-2xl tabular-nums font-black text-white"
                          style={poppins}
                        >
                          #{entry.rank}
                        </span>
                        {isEventMode && entry.rank <= 25 && (
                          <Image
                            src={isTopThree ? "/assets/world-cup-promotion/gift-filled.svg" : "/assets/world-cup-promotion/gift.svg"}
                            alt=""
                            width={24}
                            height={24}
                            className={cn("size-5 sm:size-6", !isTopThree && "opacity-50")}
                          />
                        )}
                      </div>
                    </div>

                    {/* Player */}
                    <div className="col-span-4 flex items-center justify-start gap-2 sm:gap-3 min-w-0">
                      <div className="block sm:hidden">
                        <TierFrameAvatar
                          tier={entry.tier}
                          avatarCustomization={entry.avatarCustomization}
                          avatarFallback={entry.avatar || "avatar-1"}
                          countryCode={entry.country}
                          size="sm"
                        />
                      </div>
                      <div className="hidden sm:block">
                        <TierFrameAvatar
                          tier={entry.tier}
                          avatarCustomization={entry.avatarCustomization}
                          avatarFallback={entry.avatar || "avatar-1"}
                          countryCode={entry.country}
                          size="md"
                        />
                      </div>
                      <span className="truncate text-sm sm:text-base font-fun font-black uppercase text-white">
                        {entry.username}
                      </span>
                    </div>

                    {/* Tier */}
                    <div className="col-span-2 sm:col-span-3 min-w-0 text-center">
                      <span
                        className="block truncate text-[10px] sm:text-sm font-fun font-black uppercase tracking-wide"
                        style={{ color: (isEventMode && isFirst) || isCurrentUser ? "#FFFFFF" : tierAccent }}
                      >
                        {entry.tier}
                      </span>
                    </div>

                    {/* RP */}
                    <div className="col-span-3 sm:col-span-2 text-center">
                      <span
                        className="text-sm sm:text-lg tabular-nums font-black text-white"
                        style={poppins}
                      >
                        {entry.rankPoints.toLocaleString()}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Vertical timeline line on the left border — event only */}
        {isEventMode && (
          <div className="absolute -left-[1px] top-0 bottom-0 w-0.5 z-10" style={{ backgroundColor: '#FF6C0A' }} />
        )}
      </div>
    </div>
  );
}
