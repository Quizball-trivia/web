import Image from "next/image";
import { AvatarDisplay } from "@/components/AvatarDisplay";
import { TierFrameAvatar } from "@/components/TierFrameAvatar";
import type { LeaderboardEntry } from "@/lib/domain/leaderboard";
import { Trophy } from "lucide-react";
import { useActiveEventMode } from "@/lib/hooks/useActiveEventMode";

interface LeaderboardPodiumProps {
  topThree: LeaderboardEntry[];
  onEntryClick?: (userId: string) => void;
}

const poppins = {
  fontFamily: "'Poppins', sans-serif",
  fontWeight: 600,
  letterSpacing: "0",
  lineHeight: 1,
} as const;

type PodiumRank = 1 | 2 | 3;

const eventPodiumConfig: Record<
  PodiumRank,
  {
    barHeight: string;
    ringColor: string;
    badgeColor: string;
    gradientFrom: string;
    gradientTo: string;
    order: string;
    prizeImage: string;
    prizeAlt: string;
    prizeSize: string;
  }
> = {
  1: {
    barHeight: "h-36 sm:h-48",
    ringColor: "#FFD700",
    badgeColor: "#FFD700",
    gradientFrom: "rgba(255,215,0,0.85)",
    gradientTo: "rgba(255,176,0,0.35)",
    order: "order-2",
    prizeImage: "/assets/world-cup-promotion/Layer 6.png",
    prizeAlt: "iPhone 17 Pro",
    prizeSize: "h-16 sm:h-20",
  },
  2: {
    barHeight: "h-28 sm:h-36",
    ringColor: "#C0C0C0",
    badgeColor: "#C0C0C0",
    gradientFrom: "rgba(214,214,222,0.8)",
    gradientTo: "rgba(160,160,170,0.3)",
    order: "order-1",
    prizeImage: "/assets/world-cup-promotion/Sony-PlayStation-5-Digital-Edition-Console-Wholesale-Product-Hero2.png",
    prizeAlt: "PlayStation 5",
    prizeSize: "h-14 sm:h-16",
  },
  3: {
    barHeight: "h-20 sm:h-28",
    ringColor: "#CD7F32",
    badgeColor: "#CD7F32",
    gradientFrom: "rgba(205,127,50,0.85)",
    gradientTo: "rgba(160,90,30,0.35)",
    order: "order-3",
    prizeImage: "/assets/world-cup-promotion/pngtree-apple-airpods-pro-in-a-charging-case-with-the-lid-open-png-image_16254552.png",
    prizeAlt: "AirPods",
    prizeSize: "h-10 sm:h-14",
  },
};

const podiumConfig: Record<
  PodiumRank,
  {
    height: string;
    bg: string;
    nameColor: string;
    rpColor: string;
    order: string;
  }
> = {
  1: {
    // Middle, tallest — green
    height: "h-40 sm:h-52",
    bg: "#38B60E",
    nameColor: "text-white",
    rpColor: "text-brand-yellow",
    order: "order-2",
  },
  2: {
    // Left — yellow
    height: "h-32 sm:h-40",
    bg: "#FFE500",
    nameColor: "text-black",
    rpColor: "text-black",
    order: "order-1",
  },
  3: {
    // Right — blue
    height: "h-24 sm:h-32",
    bg: "#1645FF",
    nameColor: "text-white",
    rpColor: "text-brand-yellow",
    order: "order-3",
  },
};

export function LeaderboardPodium({ topThree, onEntryClick }: LeaderboardPodiumProps) {
  const { isEventMode } = useActiveEventMode();

  const [first, second, third] = [
    topThree.find((p) => p.rank === 1),
    topThree.find((p) => p.rank === 2),
    topThree.find((p) => p.rank === 3),
  ];

  if (!first) return null;

  const players: { entry: LeaderboardEntry | undefined; rank: PodiumRank }[] = [
    { entry: second, rank: 2 },
    { entry: first, rank: 1 },
    { entry: third, rank: 3 },
  ];

  if (!isEventMode) {
    return (
      <div className="overflow-visible px-4 pt-10 sm:px-6 sm:pt-14">
        <div className="flex items-end justify-center gap-2 sm:gap-4 w-full max-w-md mx-auto">
          {players.map(({ entry, rank }) => {
            const config = podiumConfig[rank];

            if (!entry) {
              return <div key={rank} className={`flex-1 ${config.order}`} />;
            }

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
                className={`flex min-w-0 flex-1 flex-col items-center ${config.order} ${
                  interactive ? "cursor-pointer active:translate-y-[2px] transition-transform" : ""
                }`}
              >
                {/* Avatar — floats well above the top of the bar */}
                <div className="relative mb-3 sm:mb-4 z-10 shrink-0">
                  <div className="hidden sm:block">
                    <AvatarDisplay
                      customization={entry.avatarCustomization ?? { base: entry.avatar || `avatar-${rank}` }}
                      size="md"
                      countryCode={entry.country}
                    />
                  </div>
                  <div className="block sm:hidden">
                    <AvatarDisplay
                      customization={entry.avatarCustomization ?? { base: entry.avatar || `avatar-${rank}` }}
                      size="sm"
                      countryCode={entry.country}
                    />
                  </div>
                  {/* Trophy badge */}
                  <div className="absolute -top-1 -left-1 flex size-5 sm:size-6 items-center justify-center rounded-full bg-brand-yellow shadow ring-2 ring-surface-page">
                    <Trophy className="size-3 sm:size-3.5 text-black" strokeWidth={2.5} />
                  </div>
                </div>

                {/* Bar */}
                <div
                  className={`relative w-full ${config.height} flex flex-col items-center justify-center gap-2 rounded-[10px] px-2 sm:px-3 overflow-hidden`}
                  style={{ backgroundColor: config.bg }}
                >
                  <span
                    className={`w-full text-[10px] sm:text-xs uppercase ${config.nameColor} text-center font-fun font-black leading-tight break-all line-clamp-2`}
                    title={entry.username}
                  >
                    {entry.username}
                  </span>
                  <span
                    className={`text-lg sm:text-2xl tabular-nums ${config.rpColor}`}
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
    );
  }

  return (
    <div className="overflow-visible px-4 pt-6 sm:px-6 sm:pt-8">
      <div className="flex items-end justify-center gap-3 sm:gap-5 w-full max-w-lg mx-auto">
        {players.map(({ entry, rank }) => {
          const config = eventPodiumConfig[rank];

          if (!entry) {
            return <div key={rank} className={`flex-1 ${config.order}`} />;
          }

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
              className={`flex min-w-0 flex-1 flex-col items-center ${config.order} ${
                interactive ? "cursor-pointer active:translate-y-[2px] transition-transform" : ""
              }`}
            >
              {/* Prize image floating above avatar */}
              <div className="mb-1 sm:mb-2 shrink-0">
                <Image
                  src={config.prizeImage}
                  alt={config.prizeAlt}
                  width={80}
                  height={80}
                  className={`${config.prizeSize} w-auto object-contain drop-shadow-[0_4px_16px_rgba(0,0,0,0.4)]`}
                />
              </div>

              {/* Avatar inside tier card frame */}
              <div className="relative mb-2 sm:mb-3 z-10 shrink-0">
                <div className="hidden sm:block">
                  <TierFrameAvatar
                    tier={entry.tier}
                    avatarCustomization={entry.avatarCustomization}
                    avatarFallback={entry.avatar || `avatar-${rank}`}
                    countryCode={entry.country}
                    size="lg"
                  />
                </div>
                <div className="block sm:hidden">
                  <TierFrameAvatar
                    tier={entry.tier}
                    avatarCustomization={entry.avatarCustomization}
                    avatarFallback={entry.avatar || `avatar-${rank}`}
                    countryCode={entry.country}
                    size="md"
                  />
                </div>
                {/* Rank badge */}
                <div
                  className="absolute -bottom-1 left-1/2 -translate-x-1/2 flex size-7 sm:size-8 items-center justify-center rounded-full text-sm sm:text-base font-black text-white shadow-lg z-20"
                  style={{ backgroundColor: config.badgeColor }}
                >
                  {rank}
                </div>
              </div>

              {/* Gradient bar with dots */}
              <div
                className={`relative w-full ${config.barHeight} flex flex-col items-center justify-center gap-1.5 rounded-t-[10px] overflow-hidden`}
                style={{ background: `linear-gradient(180deg, ${config.gradientFrom} 0%, ${config.gradientTo} 100%)` }}
              >
                <span
                  className="w-full text-[10px] sm:text-xs uppercase text-white text-center font-fun font-black leading-tight break-all line-clamp-2"
                  title={entry.username}
                >
                  {entry.username}
                </span>
                <span
                  className="text-lg sm:text-2xl tabular-nums text-white"
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
  );
}
