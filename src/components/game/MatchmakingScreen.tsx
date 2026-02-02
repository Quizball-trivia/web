"use client";

import { useEffect, useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { ArrowLeft, Users, Loader2 } from 'lucide-react';

interface MatchmakingScreenProps {
  matchType: 'ranked' | 'friendly';
  onCancel: () => void;
}

export function MatchmakingScreen({ matchType, onCancel }: MatchmakingScreenProps) {
  const [progress, setProgress] = useState(0);
  const [searchTime, setSearchTime] = useState(0);

  useEffect(() => {
    const progressInterval = setInterval(() => {
      setProgress(prev => Math.min(prev + 10, 90));
    }, 300);

    // Count search time
    const timeInterval = setInterval(() => {
      setSearchTime(prev => prev + 1);
    }, 1000);

    return () => {
      clearInterval(progressInterval);
      clearInterval(timeInterval);
    };
  }, []);

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <div className="border-b bg-background sticky top-0 z-10">
        <div className="px-4 py-3">
          <div className="flex items-center gap-3">
            <button
              onClick={onCancel}
              className="flex items-center justify-center size-9 rounded-lg hover:bg-secondary transition-colors"
            >
              <ArrowLeft className="size-5" />
            </button>
            <div>
              <h1 className="text-xl">Finding Match</h1>
              <p className="text-sm text-muted-foreground">
                {matchType === 'ranked' ? 'Ranked matchmaking' : 'Finding opponent'}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 flex items-center justify-center p-4">
        <div className="w-full max-w-md space-y-6">
          {/* Matchmaking Animation */}
          <Card className="border-2 border-primary/30">
            <CardContent className="pt-8 pb-8">
              <div className="text-center space-y-6">
                {/* Animated Icon */}
                <div className="relative inline-flex">
                  <div className="absolute inset-0 animate-ping">
                    <div className="size-20 rounded-full bg-primary/20" />
                  </div>
                  <div className="relative size-20 rounded-full bg-primary/10 flex items-center justify-center">
                    <Users className="size-10 text-primary" />
                  </div>
                </div>

                {/* Status */}
                <div>
                  <h2 className="mb-2">Searching for opponent...</h2>
                  <p className="text-sm text-muted-foreground">
                    {searchTime}s elapsed
                  </p>
                </div>

                {/* Progress */}
                <div className="space-y-2">
                  <Progress value={progress} className="h-2" />
                  <div className="flex items-center justify-center gap-2">
                    <Loader2 className="size-4 animate-spin text-muted-foreground" />
                    <span className="text-xs text-muted-foreground">
                      Looking for players...
                    </span>
                  </div>
                </div>

                {/* Match Type Badge */}
                <Badge
                  className={matchType === 'ranked' ? 'bg-amber-500 text-white' : 'bg-blue-500 text-white'}
                >
                  {matchType === 'ranked' ? 'Ranked Match' : 'Friendly Match'}
                </Badge>
              </div>
            </CardContent>
          </Card>

          {/* Cancel Button */}
          <Button
            onClick={onCancel}
            variant="outline"
            className="w-full"
            size="lg"
          >
            Cancel Matchmaking
          </Button>

          {/* Tips */}
          <Card>
            <CardContent className="pt-4 pb-4">
              <div className="text-sm space-y-2">
                <p className="text-muted-foreground">
                  <strong className="text-foreground">Tip:</strong> Matches are 10 fast questions — answer quickly for bonus points.
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
