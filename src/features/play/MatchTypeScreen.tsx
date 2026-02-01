"use client";

import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Trophy, ArrowLeft, TrendingUp, Users, Timer } from 'lucide-react';

interface MatchTypeScreenProps {
  playMode: 'single' | 'multiplayer';
  onSelectType: (type: 'ranked' | 'friend') => void;
  onBack: () => void;
  playerRankPoints?: number;
  playerTier?: string;
  rankedEntriesUsed?: number;
  rankedEntriesResetTimestamp?: number | null;
}

// Helper function to format remaining time
const formatTimeRemaining = (timestamp: number): string => {
  const now = Date.now();
  const timeElapsed = now - timestamp;
  const twentyFourHours = 24 * 60 * 60 * 1000;
  const timeRemaining = twentyFourHours - timeElapsed;

  if (timeRemaining <= 0) return "Available";

  const hours = Math.floor(timeRemaining / (60 * 60 * 1000));
  const minutes = Math.floor((timeRemaining % (60 * 60 * 1000)) / (60 * 1000));

  if (hours > 0) {
    return `${hours}h ${minutes}m`;
  }
  return `${minutes}m`;
};

export function MatchTypeScreen({ 
  playMode, 
  onSelectType, 
  onBack,
  playerRankPoints = 1000,
  playerTier = 'Silver',
  rankedEntriesUsed = 0,
  rankedEntriesResetTimestamp = null
}: MatchTypeScreenProps) {
  const [, forceUpdate] = React.useState({});

  // Force re-render every minute to update timer
  React.useEffect(() => {
    const interval = setInterval(() => {
      forceUpdate({});
    }, 60000); // Update every minute

    return () => clearInterval(interval);
  }, []);

  const entriesRemaining = 3 - rankedEntriesUsed;
  const allEntriesUsed = rankedEntriesUsed >= 3;
  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <div className="border-b bg-background sticky top-0 z-10">
        <div className="px-4 py-3">
          <div className="flex items-center gap-3">
            <button
              onClick={onBack}
              className="flex items-center justify-center size-9 rounded-lg hover:bg-secondary transition-colors"
            >
              <ArrowLeft className="size-5" />
            </button>
            <div>
              <h1 className="text-xl">Select Match Type</h1>
              <p className="text-sm text-muted-foreground">
                {playMode === 'single' ? 'Solo match type' : 'Multiplayer match type'}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 p-4 space-y-4">
        {/* Friend Match - Only for multiplayer */}
        {playMode === 'multiplayer' && (
          <Card 
            className="active:scale-[0.98] transition-transform cursor-pointer border-2 border-blue-500/30 bg-gradient-to-br from-blue-500/5 to-cyan-500/5"
            onClick={() => onSelectType('friend')}
          >
            <CardContent className="pt-6 pb-6">
              <div className="flex gap-4">
                <div className="flex size-16 shrink-0 items-center justify-center rounded-xl bg-blue-500/20">
                  <Users className="size-8 text-blue-500" />
                </div>
                <div className="flex-1">
                  <div className="mb-2 flex items-center gap-2 flex-wrap">
                    <span className="text-lg">Friend Match</span>
                    <Badge className="bg-blue-500 text-white text-xs">
                      Invite Only
                    </Badge>
                  </div>
                  <p className="text-sm text-muted-foreground mb-3">
                    Challenge your friends with a private room code. Play unranked matches with people you know!
                  </p>
                  <div className="flex flex-wrap gap-2">
                    <Badge variant="outline" className="text-xs">
                      No rank change
                    </Badge>
                    <Badge variant="outline" className="text-xs">
                      Shareable link
                    </Badge>
                    <Badge variant="outline" className="text-xs">
                      Private room
                    </Badge>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Ranked */}
        <Card 
          className={`transition-transform border-2 border-amber-500/30 bg-gradient-to-br from-amber-500/5 to-orange-500/5 ${
            allEntriesUsed 
              ? 'opacity-60 cursor-not-allowed' 
              : 'active:scale-[0.98] cursor-pointer'
          }`}
          onClick={() => !allEntriesUsed && onSelectType('ranked')}
        >
          <CardContent className="pt-6 pb-6">
            <div className="flex gap-4">
              <div className="flex size-16 shrink-0 items-center justify-center rounded-xl bg-amber-500/20">
                <Trophy className="size-8 text-amber-500" />
              </div>
              <div className="flex-1">
                <div className="mb-2 flex items-center gap-2 flex-wrap">
                  <span className="text-lg">Ranked</span>
                  <Badge className="bg-amber-500 text-white text-xs">
                    Competitive
                  </Badge>
                </div>
                <p className="text-sm text-muted-foreground mb-3">
                  {playMode === 'multiplayer' 
                    ? 'Climb the ranks and prove you\'re the best! Win to gain rank points, lose to drop them.'
                    : 'Competitive solo play with rank points on the line. Challenge yourself against the best!'}
                </p>
                <div className="space-y-2">
                  <div className="flex flex-wrap gap-2">
                    <Badge variant="outline" className="text-xs">
                      +25 on win
                    </Badge>
                    <Badge variant="outline" className="text-xs">
                      -15 on loss
                    </Badge>
                    <Badge variant="outline" className="text-xs">
                      Extra rewards
                    </Badge>
                  </div>
                  <div className="flex items-center gap-2 p-2 bg-secondary rounded-lg">
                    <TrendingUp className="size-4 text-muted-foreground" />
                    <div className="text-sm flex items-center gap-1">
                      <span className="text-muted-foreground">Your rank: </span>
                      {playerTier === 'Bronze' && <span>🥉</span>}
                      {playerTier === 'Silver' && <span>🥈</span>}
                      {playerTier === 'Gold' && <span>🥇</span>}
                      {playerTier === 'Platinum' && <span>💎</span>}
                      {playerTier === 'Diamond' && <span>💠</span>}
                      <span className="font-medium">{playerTier}</span>
                      <span className="text-muted-foreground ml-1">({playerRankPoints} RP)</span>
                    </div>
                  </div>
                  {allEntriesUsed ? (
                    <div className="flex items-center gap-2 p-2 bg-orange-500/10 border border-orange-500/30 rounded-lg">
                      <Timer className="size-4 text-orange-600" />
                      <div className="text-sm">
                        <span className="text-muted-foreground">Resets in: </span>
                        <span className="font-medium text-orange-600">
                          {rankedEntriesResetTimestamp && formatTimeRemaining(rankedEntriesResetTimestamp)}
                        </span>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2 p-2 bg-green-500/10 border border-green-500/30 rounded-lg">
                      <Trophy className="size-4 text-green-600" />
                      <div className="text-sm">
                        <span className="text-muted-foreground">Entries: </span>
                        <span className="font-medium text-green-600">
                          {entriesRemaining}/3 remaining
                        </span>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
