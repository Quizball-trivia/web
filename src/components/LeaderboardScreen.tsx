"use client";

import { useState } from 'react';
import { Card, CardContent } from './ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { Trophy, Globe, Flag, Users, Medal, Loader2, Award, Zap, Target } from 'lucide-react';
import { useLeaderboard, useUserRank } from '@/lib/queries/leaderboard.queries';
import { LeaderboardTable } from '@/features/leaderboard/components/LeaderboardTable';
import { LeaderboardPodium } from '@/features/leaderboard/components/LeaderboardPodium';
import { UserRankStrip } from '@/features/leaderboard/components/UserRankStrip';
import type { LeaderboardType } from '@/lib/domain/leaderboard';

interface LeaderboardScreenProps {
  // Props removed as data is now fetched internally
  currentPlayerId?: string;
}

export function LeaderboardScreen({ currentPlayerId }: LeaderboardScreenProps) {
  const [activeTab, setActiveTab] = useState<LeaderboardType>('global');

  // Fetch Data
  const { data: entries, isLoading, isError } = useLeaderboard(activeTab);
  const { data: userAllRankData } = useUserRank(currentPlayerId || 'current-user');

  // Derived Data
  const topThree = entries ? entries.slice(0, 3) : [];
  const restOfEntries = entries ? entries.slice(3) : [];
  const userEntry = entries?.find(e => e.isCurrentUser || e.id === currentPlayerId);

  return (
    <div className="min-h-screen bg-background pb-24 relative">
      <div className="container max-w-2xl mx-auto p-4 space-y-6">
        
        {/* Header Title */}
        <div className="flex items-center gap-3 py-4">
             <Trophy className="size-8 text-yellow-500" />
             <div>
                 <h1 className="text-2xl font-black uppercase tracking-tight">Leaderboards</h1>
                 <p className="text-sm text-muted-foreground">Compete for glory and prizes</p>
             </div>
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as LeaderboardType)} className="w-full">
          <TabsList className="grid w-full grid-cols-3 mb-6 bg-muted/50 p-1 rounded-xl">
            <TabsTrigger value="global" className="rounded-lg data-[state=active]:bg-background data-[state=active]:text-primary data-[state=active]:shadow-sm transition-all duration-300">
              <Globe className="size-4 mr-2" />
              Global
            </TabsTrigger>
            <TabsTrigger value="country" className="rounded-lg data-[state=active]:bg-background data-[state=active]:text-primary data-[state=active]:shadow-sm transition-all duration-300">
              <Flag className="size-4 mr-2" />
              Country
            </TabsTrigger>
            <TabsTrigger value="friends" className="rounded-lg data-[state=active]:bg-background data-[state=active]:text-primary data-[state=active]:shadow-sm transition-all duration-300">
              <Users className="size-4 mr-2" />
              Friends
            </TabsTrigger>
          </TabsList>

          <TabsContent value={activeTab} className="space-y-6 focus-visible:outline-none animate-in fade-in slide-in-from-bottom-2 duration-500">
            
            {/* Loading State */}
            {isLoading && (
                <div className="flex flex-col items-center justify-center py-20 gap-4">
                    <Loader2 className="size-10 text-primary animate-spin" />
                    <p className="text-muted-foreground animate-pulse">Loading rankings...</p>
                </div>
            )}

            {/* Error State */}
            {isError && (
                <div className="text-center py-20 text-red-500 bg-red-500/10 rounded-xl border border-red-500/20">
                    <p>Failed to load leaderboard data.</p>
                </div>
            )}

            {/* Data Display */}
            {!isLoading && !isError && entries && (
                <>
                    {/* Podium for Top 3 */}
                    {entries.length >= 3 && <LeaderboardPodium topThree={topThree} />}

                    {/* Main List */}
                    <div className="space-y-4">
                        <div className="flex items-center gap-2 px-1">
                            <Medal className="size-5 text-muted-foreground" />
                            <h3 className="font-bold text-lg">Rankings</h3>
                        </div>
                        
                        <LeaderboardTable entries={entries} currentUserId={currentPlayerId} />

                        {/* Empty State for Friends */}
                        {activeTab === 'friends' && entries.length === 0 && (
                            <div className="text-center py-12 px-4 rounded-xl bg-muted/30 border border-dashed border-border">
                                <Users className="size-12 mx-auto text-muted-foreground opacity-50 mb-3" />
                                <h4 className="font-bold">No Friends Yet</h4>
                                <p className="text-sm text-muted-foreground mt-1 max-w-xs mx-auto">
                                   Invite friends to see who's the true QuizBall champion!
                                </p>
                            </div>
                        )}
                    </div>
                </>
            )}

          </TabsContent>
        </Tabs>

        {/* Info Cards (Compact Grid) */}
        {!isLoading && (
            <div className="grid grid-cols-2 gap-3 mt-8">
                <Card className="bg-primary/5 border-primary/10">
                    <CardContent className="p-4 flex flex-col items-center text-center">
                        <Target className="size-6 text-primary mb-2" />
                        <div className="text-xs font-bold text-muted-foreground uppercase">Next Reward</div>
                        <div className="font-bold text-foreground">Top 100</div>
                    </CardContent>
                </Card>
                <Card className="bg-yellow-500/5 border-yellow-500/10">
                    <CardContent className="p-4 flex flex-col items-center text-center">
                        <Zap className="size-6 text-yellow-500 mb-2" />
                        <div className="text-xs font-bold text-muted-foreground uppercase">Season Ends</div>
                        <div className="font-bold text-foreground">14 Days</div>
                    </CardContent>
                </Card>
            </div>
        )}

      </div>

      {/* Sticky User Strip */}
      {!isLoading && userEntry && (
         <UserRankStrip userEntry={userEntry} />
      )}
    </div>
  );
}
