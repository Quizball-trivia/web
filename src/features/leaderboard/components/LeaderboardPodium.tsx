import { AvatarDisplay } from "@/components/AvatarDisplay";
import { cn } from "@/components/ui/utils";
import type { LeaderboardEntry } from "@/lib/domain/leaderboard";
import { Trophy, Crown, Medal } from "lucide-react";

interface LeaderboardPodiumProps {
  topThree: LeaderboardEntry[];
}

export function LeaderboardPodium({ topThree }: LeaderboardPodiumProps) {
  // Ensure we have 3 slots (fill with placeholder if needed, though unlikely for global)
  const [first, second, third] = [
    topThree.find(p => p.rank === 1),
    topThree.find(p => p.rank === 2),
    topThree.find(p => p.rank === 3),
  ];

  if (!first) return null; // Minimum expectation

  return (
    <div className="flex items-end justify-center gap-4 py-8 px-4 h-64 md:h-80 mb-6 w-full max-w-lg mx-auto">
      {/* 2nd Place */}
      <div className="flex flex-col items-center flex-1 z-10">
        <div className="relative mb-3 animate-in fade-in slide-in-from-bottom-4 duration-700 delay-100">
           <AvatarDisplay customization={{ base: 'avatar-2' }} size="md" className="border-4 border-slate-300 shadow-xl" />
           <div className="absolute -bottom-3 left-1/2 -translate-x-1/2 bg-slate-200 text-slate-800 text-xs font-bold px-2 py-0.5 rounded-full shadow border border-white">
              #{second?.rank || 2}
           </div>
        </div>
        <div className="w-full h-32 bg-gradient-to-t from-slate-400/20 to-slate-300/10 rounded-t-lg border-t border-x border-slate-400/30 flex flex-col items-center justify-start pt-4 backdrop-blur-sm">
           <span className="font-bold text-sm text-center truncate w-full px-2" title={second?.username}>{second?.username || '-'}</span>
           <span className="text-xs text-muted-foreground mt-1">{second?.rankPoints.toLocaleString()} RP</span>
        </div>
      </div>

      {/* 1st Place */}
      <div className="flex flex-col items-center flex-1 z-20 -mx-2 hover:scale-105 transition-transform duration-300">
        <div className="relative mb-3 animate-in fade-in slide-in-from-bottom-8 duration-700">
           <Crown className="absolute -top-8 left-1/2 -translate-x-1/2 text-yellow-400 size-8 drop-shadow-lg animate-bounce" />
           <AvatarDisplay customization={{ base: 'avatar-1' }} size="lg" className="border-4 border-yellow-400 shadow-[0_0_20px_rgba(250,204,21,0.3)]" />
           <div className="absolute -bottom-3 left-1/2 -translate-x-1/2 bg-yellow-400 text-yellow-900 text-sm font-black px-3 py-0.5 rounded-full shadow border border-white">
              #{first.rank}
           </div>
        </div>
        <div className="w-full h-40 bg-gradient-to-t from-yellow-500/20 to-yellow-400/10 rounded-t-lg border-t border-x border-yellow-500/30 flex flex-col items-center justify-start pt-6 backdrop-blur-sm shadow-[0_0_30px_rgba(234,179,8,0.1)]">
           <span className="font-bold text-base text-center truncate w-full px-2" title={first.username}>{first.username}</span>
           <span className="text-xs font-bold text-yellow-500 mt-1">{first.rankPoints.toLocaleString()} RP</span>
           <Trophy className="size-4 text-yellow-500/50 mt-2" />
        </div>
      </div>

      {/* 3rd Place */}
      <div className="flex flex-col items-center flex-1 z-10">
        <div className="relative mb-3 animate-in fade-in slide-in-from-bottom-4 duration-700 delay-200">
           <AvatarDisplay customization={{ base: 'avatar-3' }} size="md" className="border-4 border-orange-700/60 shadow-xl" />
           <div className="absolute -bottom-3 left-1/2 -translate-x-1/2 bg-orange-700/80 text-white text-xs font-bold px-2 py-0.5 rounded-full shadow border border-white/20">
              #{third?.rank || 3}
           </div>
        </div>
        <div className="w-full h-24 bg-gradient-to-t from-orange-800/20 to-orange-700/10 rounded-t-lg border-t border-x border-orange-700/30 flex flex-col items-center justify-start pt-4 backdrop-blur-sm">
           <span className="font-bold text-sm text-center truncate w-full px-2" title={third?.username}>{third?.username || '-'}</span>
           <span className="text-xs text-muted-foreground mt-1">{third?.rankPoints.toLocaleString()} RP</span>
        </div>
      </div>
    </div>
  );
}
