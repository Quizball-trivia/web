import { AvatarDisplay } from "@/components/AvatarDisplay";
import type { LeaderboardEntry } from "@/lib/domain/leaderboard";
import { Crown } from "lucide-react";

interface LeaderboardPodiumProps {
  topThree: LeaderboardEntry[];
  onEntryClick?: (userId: string) => void;
}

const podiumConfig = {
  1: {
    height: 'h-28 sm:h-36',
    avatarSize: 'sm' as const,
    avatarDesktopSize: 'lg' as const,
    borderColor: 'border-yellow-400',
    bgGlow: 'shadow-[0_0_24px_rgba(250,204,21,0.25)]',
    barBg: 'bg-gradient-to-t from-yellow-500/25 to-yellow-400/5 border-yellow-500/30',
    badgeBg: 'bg-yellow-400 text-yellow-900',
    rpColor: 'text-yellow-500',
    order: 'order-2',
    z: 'z-20',
  },
  2: {
    height: 'h-20 sm:h-28',
    avatarSize: 'xs' as const,
    avatarDesktopSize: 'md' as const,
    borderColor: 'border-slate-300',
    bgGlow: '',
    barBg: 'bg-gradient-to-t from-slate-400/15 to-slate-300/5 border-slate-400/30',
    badgeBg: 'bg-slate-200 text-slate-800',
    rpColor: 'text-muted-foreground',
    order: 'order-1',
    z: 'z-10',
  },
  3: {
    height: 'h-16 sm:h-20',
    avatarSize: 'xs' as const,
    avatarDesktopSize: 'md' as const,
    borderColor: 'border-orange-600/60',
    bgGlow: '',
    barBg: 'bg-gradient-to-t from-orange-700/15 to-orange-600/5 border-orange-700/30',
    badgeBg: 'bg-orange-700/80 text-white',
    rpColor: 'text-muted-foreground',
    order: 'order-3',
    z: 'z-10',
  },
};

export function LeaderboardPodium({ topThree, onEntryClick }: LeaderboardPodiumProps) {
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
    <div className="overflow-hidden rounded-[28px] border border-white/10 bg-[#071013] p-2 pt-6 sm:p-4 sm:pt-10 pb-0 shadow-[inset_0_1px_0_rgba(255,255,255,0.03)]">
      <div className="flex items-end justify-center gap-1 sm:gap-3 w-full max-w-sm sm:max-w-md mx-auto">
        {players.map(({ entry, rank }) => {
          const config = podiumConfig[rank];
          if (!entry) return <div key={rank} className={`flex-1 ${config.order}`} />;

          return (
            <div
              key={entry.id}
              onClick={() => onEntryClick?.(entry.id)}
              role={onEntryClick ? "button" : undefined}
              tabIndex={onEntryClick ? 0 : undefined}
              onKeyDown={onEntryClick ? (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onEntryClick(entry.id); } } : undefined}
              className={`flex flex-col items-center flex-1 min-w-0 ${config.z} ${config.order} ${onEntryClick ? 'cursor-pointer' : ''}`}
            >
              {/* Avatar */}
              <div className="relative mb-1.5 sm:mb-3 shrink-0">
                {rank === 1 && (
                  <Crown className="absolute -top-4 sm:-top-7 left-1/2 -translate-x-1/2 text-yellow-400 size-4 sm:size-7 drop-shadow-lg animate-bounce" />
                )}
                <div className="hidden sm:block">
                  <AvatarDisplay
                    customization={{ base: entry.avatar || `avatar-${rank}` }}
                    size={config.avatarDesktopSize}
                    className={`border-4 ${config.borderColor} ${config.bgGlow}`}
                    countryCode={entry.country}
                  />
                </div>
                <div className="block sm:hidden">
                  <AvatarDisplay
                    customization={{ base: entry.avatar || `avatar-${rank}` }}
                    size={config.avatarSize}
                    className={`border-[1.5px] ${config.borderColor} ${config.bgGlow}`}
                    countryCode={entry.country}
                  />
                </div>
                <div className={`absolute -bottom-1.5 sm:-bottom-2.5 left-1/2 -translate-x-1/2 ${config.badgeBg} text-[8px] sm:text-xs font-black px-1 sm:px-2.5 py-0 rounded-full shadow border-2 border-background`}>
                  #{rank}
                </div>
              </div>

              {/* Pedestal */}
              <div className={`w-full ${config.height} rounded-t-lg sm:rounded-t-xl border-t-2 border-x-2 ${config.barBg} flex flex-col items-center justify-start pt-2 sm:pt-5 min-w-0`}>
                <span 
                  className="font-fun font-black text-[9px] sm:text-sm text-center line-clamp-2 leading-tight w-full px-1 sm:px-2 break-words whitespace-normal" 
                  title={entry.username}
                >
                  {entry.username}
                </span>
                <span className={`text-[8px] sm:text-[10px] sm:text-xs font-bold ${config.rpColor} mt-0 sm:mt-1`}>
                  {entry.rankPoints.toLocaleString()} <span className="hidden xs:inline">RP</span>
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
