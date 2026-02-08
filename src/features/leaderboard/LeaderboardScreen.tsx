"use client";

import { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Trophy, Globe, Flag, Users, Loader2, Zap, Target } from 'lucide-react';
import { useLeaderboard, useUserRank } from '@/lib/queries/leaderboard.queries';
import { LeaderboardTable } from './components/LeaderboardTable';
import { LeaderboardPodium } from './components/LeaderboardPodium';
import { UserRankStrip } from './components/UserRankStrip';
import type { LeaderboardType } from '@/lib/domain/leaderboard';
import { motion } from 'motion/react';

interface LeaderboardScreenProps {
  currentPlayerId?: string;
}

const NEXT_REWARD_MILESTONES = [100, 50, 25, 10, 3, 1] as const;
const MOCK_SEASON_END_DATE = new Date('2026-02-22T23:59:59Z');

function getNextRewardLabel(rank?: number): string {
  if (typeof rank !== 'number' || Number.isNaN(rank)) return 'TBD';
  if (rank <= 1) return 'Champion';

  const nextRewardThreshold = NEXT_REWARD_MILESTONES.find((threshold) => rank > threshold) ?? 1;
  return `Top ${nextRewardThreshold}`;
}

function computeDaysUntil(targetDate: Date): number | null {
  const targetMs = targetDate.getTime();
  if (Number.isNaN(targetMs)) return null;
  return Math.max(0, Math.ceil((targetMs - Date.now()) / (1000 * 60 * 60 * 24)));
}

export function LeaderboardScreen({ currentPlayerId }: LeaderboardScreenProps) {
  const [activeTab, setActiveTab] = useState<LeaderboardType>('global');

  const { data: entries, isLoading, isError } = useLeaderboard(activeTab);
  const { data: userRank } = useUserRank(currentPlayerId ?? '');

  const topThree = entries ? entries.slice(0, 3) : [];
  const userEntryFromList = entries?.find(e => e.isCurrentUser || e.id === currentPlayerId);
  const userEntry = userEntryFromList ?? userRank;
  const nextRewardLabel = getNextRewardLabel(userEntry?.rank);
  const seasonEndsRemaining = computeDaysUntil(MOCK_SEASON_END_DATE);
  const seasonEndsLabel = seasonEndsRemaining === null
    ? 'TBD'
    : `${seasonEndsRemaining} ${seasonEndsRemaining === 1 ? 'Day' : 'Days'}`;

  return (
    <div className="flex flex-col bg-background relative" style={{ minHeight: 'calc(100vh - 4rem)' }}>
      <div className="flex-1 container max-w-2xl mx-auto p-4 pb-0 space-y-6">

        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="flex items-center gap-4 py-5"
        >
          <div className="size-14 rounded-2xl bg-yellow-500/15 border-2 border-yellow-500/30 flex items-center justify-center">
            <Trophy className="size-7 text-yellow-500" />
          </div>
          <div>
            <h1 className="text-3xl font-fun font-black uppercase tracking-tight">Leaderboard</h1>
            <p className="text-sm font-bold text-muted-foreground">Compete for glory and prizes</p>
          </div>
        </motion.div>

        {/* Tabs */}
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.1 }}
        >
          <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as LeaderboardType)} className="w-full">
            <TabsList className="grid w-full grid-cols-3 mb-6 bg-card border-2 border-border p-1.5 rounded-2xl h-auto">
              {([
                { value: 'global', label: 'Global', icon: Globe },
                { value: 'country', label: 'Country', icon: Flag },
                { value: 'friends', label: 'Friends', icon: Users },
              ] as const).map((tab) => (
                <TabsTrigger
                  key={tab.value}
                  value={tab.value}
                  className="rounded-xl py-2.5 font-fun font-black uppercase tracking-wide text-xs data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-md data-[state=active]:border-b-[3px] data-[state=active]:border-primary/60 transition-all duration-200"
                >
                  <tab.icon className="size-4 mr-1.5" />
                  {tab.label}
                </TabsTrigger>
              ))}
            </TabsList>

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
                      <LeaderboardPodium topThree={topThree} />
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

                    <LeaderboardTable entries={entries} currentUserId={currentPlayerId} />

                    {activeTab === 'friends' && entries.length === 0 && (
                      <div className="text-center py-12 px-4 rounded-2xl bg-card border-2 border-dashed border-border border-b-4">
                        <Users className="size-12 mx-auto text-muted-foreground opacity-50 mb-3" />
                        <h4 className="font-fun font-black text-base">No Friends Yet</h4>
                        <p className="text-sm text-muted-foreground mt-1 max-w-xs mx-auto">
                          Invite friends to see who&apos;s the true QuizBall champion!
                        </p>
                      </div>
                    )}
                  </motion.div>
                </>
              )}
            </TabsContent>
          </Tabs>
        </motion.div>

        {/* Info Cards */}
        {!isLoading && (
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.35 }}
            className="grid grid-cols-2 gap-4 mt-8"
          >
            {/* TODO(leaderboard-api): Replace these mock placeholders with real season metadata (e.g. props.nextReward + computeDaysUntil(props.seasonEndDate)). */}
            <div className="rounded-2xl bg-card border-2 border-primary/20 border-b-4 border-b-primary/30 p-5 flex flex-col items-center text-center active:translate-y-[2px] active:border-b-2 transition-all">
              <div className="size-10 rounded-xl bg-primary/15 flex items-center justify-center mb-2">
                <Target className="size-5 text-primary" />
              </div>
              <div className="text-[10px] font-fun font-black text-muted-foreground uppercase tracking-widest">Next Reward</div>
              <div className="font-fun font-black text-foreground text-lg">{nextRewardLabel}</div>
            </div>
            <div className="rounded-2xl bg-card border-2 border-yellow-500/20 border-b-4 border-b-yellow-500/30 p-5 flex flex-col items-center text-center active:translate-y-[2px] active:border-b-2 transition-all">
              <div className="size-10 rounded-xl bg-yellow-500/15 flex items-center justify-center mb-2">
                <Zap className="size-5 text-yellow-500" />
              </div>
              <div className="text-[10px] font-fun font-black text-muted-foreground uppercase tracking-widest">Season Ends</div>
              <div className="font-fun font-black text-foreground text-lg">{seasonEndsLabel}</div>
            </div>
          </motion.div>
        )}

      </div>

      {/* Sticky User Strip */}
      {!isLoading && userEntry && (
        <UserRankStrip userEntry={userEntry} />
      )}
    </div>
  );
}
