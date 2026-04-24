import { AvatarDisplay } from "@/components/AvatarDisplay";
import type { LeaderboardEntry } from "@/lib/domain/leaderboard";
import { Trophy } from "lucide-react";

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
    rpColor: "text-[#FFE500]",
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
    rpColor: "text-[#FFE500]",
    order: "order-3",
  },
};

export function LeaderboardPodium({ topThree, onEntryClick }: LeaderboardPodiumProps) {
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

  return (
    <div className="overflow-hidden rounded-2xl md:rounded-[28px] bg-[#071013] p-4 pt-10 sm:p-6 sm:pt-14 pb-0">
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
                    customization={{ base: entry.avatar || `avatar-${rank}` }}
                    size="md"
                    countryCode={entry.country}
                  />
                </div>
                <div className="block sm:hidden">
                  <AvatarDisplay
                    customization={{ base: entry.avatar || `avatar-${rank}` }}
                    size="sm"
                    countryCode={entry.country}
                  />
                </div>
                {/* Trophy badge */}
                <div className="absolute -top-1 -left-1 flex size-5 sm:size-6 items-center justify-center rounded-full bg-[#FFE500] shadow ring-2 ring-[#071013]">
                  <Trophy className="size-3 sm:size-3.5 text-black" strokeWidth={2.5} />
                </div>
              </div>

              {/* Bar */}
              <div
                className={`relative w-full ${config.height} flex flex-col items-center justify-center gap-2 rounded-2xl px-2 sm:px-3 overflow-hidden`}
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
