"use client";

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Trophy, Globe, Flag, Loader2, Target, Zap } from 'lucide-react';
import { useLeaderboard, useUserRank } from '@/lib/queries/leaderboard.queries';
import { LeaderboardTable } from './components/LeaderboardTable';
import { LeaderboardPodium } from './components/LeaderboardPodium';
import { UserRankStrip } from './components/UserRankStrip';
import type { LeaderboardType } from '@/lib/domain/leaderboard';
import { motion } from 'motion/react';

interface LeaderboardScreenProps {
  currentPlayerId?: string;
}

export function LeaderboardScreen({ currentPlayerId }: LeaderboardScreenProps) {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<LeaderboardType>('global');

  const handleEntryClick = (userId: string) => {
    router.push(`/profile/${userId}`);
  };

  const { data: entries, isLoading, isError } = useLeaderboard(activeTab, currentPlayerId);
  const { data: userRank } = useUserRank(currentPlayerId ?? '', activeTab);

  const topThree = entries ? entries.slice(0, 3) : [];
  const userEntryFromList = entries?.find(e => e.isCurrentUser || e.id === currentPlayerId);
  const userEntry = userEntryFromList ?? userRank;

  // Placeholder labels for season info
  const nextRewardLabel = "100 Gems";
  const seasonEndsLabel = "14 Days";

  return (
    <div className="relative flex flex-col bg-transparent" style={{ minHeight: 'calc(100vh - 4rem)' }}>
      <div className="flex-1 container max-w-2xl mx-auto px-3 sm:px-4 pt-2 sm:pt-4 pb-0 space-y-4 sm:space-y-6">

        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="flex items-center gap-3 sm:gap-4 py-3 sm:py-5"
        >
          <div className="size-10 sm:size-14 rounded-2xl bg-yellow-500/15 border-2 border-yellow-500/30 flex items-center justify-center">
            <Trophy className="size-5 sm:size-7 text-yellow-500" />
          </div>
          <div>
            <h1 className="text-2xl sm:text-3xl font-fun font-black uppercase tracking-tight">Leaderboard</h1>
            <p className="text-xs sm:text-sm font-bold text-muted-foreground">Compete for glory and prizes</p>
          </div>
        </motion.div>

        {/* Tabs */}
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.1 }}
        >
          <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as LeaderboardType)} className="w-full">
            <TabsList className="grid w-full grid-cols-2 mb-4 sm:mb-6 bg-card border-2 border-border p-1 sm:p-1.5 rounded-2xl h-auto">
              {([
                { value: 'global', label: 'Global', icon: Globe },
                { value: 'country', label: 'Country', icon: Flag },
              ] as const).map((tab) => (
                <TabsTrigger
                  key={tab.value}
                  value={tab.value}
                  className="rounded-xl py-2 sm:py-2.5 font-fun font-black uppercase tracking-wide text-[11px] sm:text-xs data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-md data-[state=active]:border-b-[3px] data-[state=active]:border-primary/60 transition-all duration-200"
                >
                  <tab.icon className="size-4 mr-1.5" />
                  {tab.label}
                </TabsTrigger>
              ))}
            </TabsList>

            {/* User Rank Strip */}
            {!isLoading && userEntry && (
              <UserRankStrip userEntry={userEntry} />
            )}

            <TabsContent value={activeTab} className="space-y-6 focus-visible:outline-none">

              {/* Loading */}
              {isLoading && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="flex flex-col items-center justify-center py-20 gap-4 rounded-2xl bg-card border-2 border-border border-b-4"
                >
                  <Loader2 className="size-10 text-primary animate-spin" />
                  <p className="text-muted-foreground font-fun font-bold animate-pulse">Loading rankings...</p>
                </motion.div>
              )}

              {/* Error */}
              {isError && (
                <div className="text-center py-20 rounded-2xl bg-red-500/10 border-2 border-red-500/20 border-b-4 border-b-red-500/30">
                  <p className="font-fun font-bold text-red-400">Failed to load leaderboard data.</p>
                </div>
              )}

              {/* Data */}
              {!isLoading && !isError && entries && (
                <>
                  {entries.length >= 3 && (
                    <motion.div
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ duration: 0.5, delay: 0.15 }}
                    >
                      <LeaderboardPodium topThree={topThree} onEntryClick={handleEntryClick} />
                    </motion.div>
                  )}

                  <motion.div
                    initial={{ opacity: 0, y: 16 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5, delay: 0.25 }}
                    className="space-y-4"
                  >
                    <div className="flex items-center gap-2 px-1">
                      <span className="text-lg">🏅</span>
                      <h3 className="font-fun font-black text-lg uppercase tracking-wide">Rankings</h3>
                    </div>

                    <LeaderboardTable entries={entries} currentUserId={currentPlayerId} onEntryClick={handleEntryClick} />

                  </motion.div>
                </>
              )}
            </TabsContent>
          </Tabs>
        </motion.div>


      </div>
    </div>
  );
}
