import { AvatarDisplay } from "@/components/AvatarDisplay";
import type { LeaderboardEntry } from "@/lib/domain/leaderboard";
import { Crown } from "lucide-react";

interface LeaderboardPodiumProps {
  topThree: LeaderboardEntry[];
}

const podiumConfig = {
  1: {
    height: 'h-36',
    avatarSize: 'lg' as const,
    borderColor: 'border-yellow-400',
    bgGlow: 'shadow-[0_0_24px_rgba(250,204,21,0.25)]',
    barBg: 'bg-gradient-to-t from-yellow-500/25 to-yellow-400/5 border-yellow-500/30',
    badgeBg: 'bg-yellow-400 text-yellow-900',
    rpColor: 'text-yellow-500',
    order: 'order-2',
    z: 'z-20',
  },
  2: {
    height: 'h-28',
    avatarSize: 'md' as const,
    borderColor: 'border-slate-300',
    bgGlow: '',
    barBg: 'bg-gradient-to-t from-slate-400/15 to-slate-300/5 border-slate-400/30',
    badgeBg: 'bg-slate-200 text-slate-800',
    rpColor: 'text-muted-foreground',
    order: 'order-1',
    z: 'z-10',
  },
  3: {
    height: 'h-20',
    avatarSize: 'md' as const,
    borderColor: 'border-orange-600/60',
    bgGlow: '',
    barBg: 'bg-gradient-to-t from-orange-700/15 to-orange-600/5 border-orange-700/30',
    badgeBg: 'bg-orange-700/80 text-white',
    rpColor: 'text-muted-foreground',
    order: 'order-3',
    z: 'z-10',
  },
};

export function LeaderboardPodium({ topThree }: LeaderboardPodiumProps) {
  const [first, second, third] = [
    topThree.find(p => p.rank === 1),
    topThree.find(p => p.rank === 2),
    topThree.find(p => p.rank === 3),
  ];

  if (!first) return null;

  const players = [
    { entry: second, rank: 2 as const },
    { entry: first, rank: 1 as const },
    { entry: third, rank: 3 as const },
  ];

  return (
    <div className="rounded-2xl bg-card border-2 border-border border-b-4 p-4 pt-10 pb-0">
      <div className="flex items-end justify-center gap-3 w-full max-w-md mx-auto">
        {players.map(({ entry, rank }) => {
          const config = podiumConfig[rank];
          if (!entry) return <div key={rank} className={`flex-1 ${config.order}`} />;

          return (
            <div key={entry.id} className={`flex flex-col items-center flex-1 ${config.z} ${config.order}`}>
              {/* Avatar */}
              <div className="relative mb-3">
                {rank === 1 && (
                  <Crown className="absolute -top-7 left-1/2 -translate-x-1/2 text-yellow-400 size-7 drop-shadow-lg animate-bounce" />
                )}
                <AvatarDisplay
                  customization={{ base: entry.avatar || `avatar-${rank}` }}
                  size={config.avatarSize}
                  className={`border-4 ${config.borderColor} ${config.bgGlow}`}
                />
                <div className={`absolute -bottom-2.5 left-1/2 -translate-x-1/2 ${config.badgeBg} text-xs font-black px-2.5 py-0.5 rounded-full shadow border-2 border-background`}>
                  #{rank}
                </div>
              </div>

              {/* Pedestal */}
              <div className={`w-full ${config.height} rounded-t-xl border-t-2 border-x-2 ${config.barBg} flex flex-col items-center justify-start pt-5`}>
                <span className="font-fun font-black text-sm text-center truncate w-full px-2" title={entry.username}>
                  {entry.username}
                </span>
                <span className={`text-xs font-bold ${config.rpColor} mt-1`}>
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
