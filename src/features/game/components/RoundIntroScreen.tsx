"use client";

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Trophy, Check, Loader2, Timer } from 'lucide-react';
import { motion } from 'motion/react';
import { GameMode } from '@/types/game';

interface RoundIntroScreenProps {
  roundNumber: number;
  totalRounds: number;
  mode: GameMode;
  playerUsername: string;
  opponentUsername: string;
  playerAvatar: string;
  opponentAvatar: string;
  playerRoundsWon: number;
  opponentRoundsWon: number;
  onReady: () => void;
}

const getModeInfo = (mode: GameMode): { name: string; icon: string; description: string; howToWin: string; emoji: string } => {
  switch (mode) {
    case 'countdown':
      return {
        name: 'Countdown',
        icon: '⏱️',
        emoji: '⏱️',
        description: 'Type as many correct answers as you can within the time limit!',
        howToWin: 'Score points by entering correct answers. The player with the most points wins the round.',
      };
    case 'clues':
      return {
        name: 'Clue Game',
        icon: '👁️',
        emoji: '👁️',
        description: 'Guess the answer from progressive clues. Fewer clues used = more points!',
        howToWin: 'Answer correctly using fewer clues to score more points. Each clue revealed reduces the potential score.',
      };
    case 'timeAttack':
      return {
        name: 'Time Attack',
        icon: '⚡',
        emoji: '⚡',
        description: 'Answer 5 questions as quickly and accurately as possible!',
        howToWin: 'Score the most points by answering correctly. Speed bonuses for quick answers!',
      };
    case 'moneyDrop':
      return {
        name: 'Money Drop',
        icon: '💰',
        emoji: '💰',
        description: 'Start with $1,000,000 and bet on the correct answers!',
        howToWin: 'The player who keeps the most money after all 5 questions wins the round.',
      };
    default:
      return {
        name: 'Football Trivia',
        icon: '⚽',
        emoji: '⚽',
        description: 'Answer football questions correctly!',
        howToWin: 'Score more points than your opponent to win the round.',
      };
  }
};

export function RoundIntroScreen({
  roundNumber,
  totalRounds,
  mode,
  playerUsername,
  opponentUsername,
  playerAvatar,
  opponentAvatar,
  playerRoundsWon,
  opponentRoundsWon,
  onReady,
}: RoundIntroScreenProps) {
  const [isPlayerReady, setIsPlayerReady] = useState(false);
  const [isOpponentReady, setIsOpponentReady] = useState(false);
  const [countdown, setCountdown] = useState(10);

  const modeInfo = getModeInfo(mode);
  const isAutoStarting = (isPlayerReady || isOpponentReady) && !(isPlayerReady && isOpponentReady);

  useEffect(() => {
    // Simulate opponent ready state (in real app, this would come from backend)
    let innerTimer: ReturnType<typeof setTimeout> | undefined;
    const opponentReadyTimer = setTimeout(() => {
      const randomDelay = Math.random() * 3000 + 1000; // 1-4 seconds
      innerTimer = setTimeout(() => {
        setIsOpponentReady(true);
      }, randomDelay);
    }, 500);

    return () => {
      clearTimeout(opponentReadyTimer);
      if (innerTimer) clearTimeout(innerTimer);
    };
  }, []);

  useEffect(() => {
    if (isPlayerReady && isOpponentReady) {
      // Both ready, proceed immediately
      const timer = setTimeout(() => {
        onReady();
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [isPlayerReady, isOpponentReady, onReady]);

  useEffect(() => {
    if (isPlayerReady && isOpponentReady) {
      // Already handled in previous effect
      return;
    }

    if (isAutoStarting) {
      // One player is ready, start countdown
      const interval = setInterval(() => {
        setCountdown((prev) => {
          if (prev <= 1) {
            return 0;
          }
          return prev - 1;
        });
      }, 1000);

      return () => clearInterval(interval);
    }
  }, [isAutoStarting, isPlayerReady, isOpponentReady]);

  // Separate effect to trigger onReady when countdown reaches 0
  useEffect(() => {
    if (countdown === 0 && isAutoStarting) {
      onReady();
    }
  }, [countdown, isAutoStarting, onReady]);

  const handlePlayerReady = () => {
    setIsPlayerReady(true);
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="max-w-md w-full space-y-4"
      >
        {/* Round Header */}
        <div className="text-center">
          <Badge className="mb-2">
            Round {roundNumber} of {totalRounds}
          </Badge>
          <div className="text-6xl mb-3">{modeInfo.emoji}</div>
          <h1 className="mb-2">{modeInfo.name}</h1>
          <p className="text-muted-foreground">{modeInfo.description}</p>
        </div>

        {/* How to Win */}
        <Card className="border-2 border-primary/20 bg-gradient-to-br from-primary/5 to-primary/10">
          <CardContent className="pt-4 pb-4">
            <div className="flex items-start gap-3">
              <Trophy className="size-5 text-primary mt-0.5 shrink-0" />
              <div>
                <div className="mb-1">How to Win</div>
                <p className="text-sm text-muted-foreground">{modeInfo.howToWin}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Match Score */}
        <Card>
          <CardContent className="pt-4 pb-4">
            <div className="text-center text-sm text-muted-foreground mb-3">
              Current Match Score
            </div>
            <div className="flex items-center justify-center gap-6">
              <div className="text-center">
                <div className="text-3xl mb-1">{playerAvatar}</div>
                <div className="text-sm mb-1">{playerUsername}</div>
                <div className="text-2xl">{playerRoundsWon}</div>
              </div>
              <div className="text-2xl text-muted-foreground">-</div>
              <div className="text-center">
                <div className="text-3xl mb-1">{opponentAvatar}</div>
                <div className="text-sm mb-1">{opponentUsername}</div>
                <div className="text-2xl">{opponentRoundsWon}</div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Ready Status */}
        <Card>
          <CardContent className="pt-4 pb-4">
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-xl">{playerAvatar}</span>
                  <span className="text-sm">{playerUsername}</span>
                </div>
                <div className="flex items-center gap-2">
                  {isPlayerReady ? (
                    <>
                      <Check className="size-4 text-green-500" />
                      <span className="text-sm text-green-500">Ready</span>
                    </>
                  ) : (
                    <span className="text-sm text-muted-foreground">Not Ready</span>
                  )}
                </div>
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-xl">{opponentAvatar}</span>
                  <span className="text-sm">{opponentUsername}</span>
                </div>
                <div className="flex items-center gap-2">
                  {isOpponentReady ? (
                    <>
                      <Check className="size-4 text-green-500" />
                      <span className="text-sm text-green-500">Ready</span>
                    </>
                  ) : (
                    <>
                      <Loader2 className="size-4 animate-spin text-muted-foreground" />
                      <span className="text-sm text-muted-foreground">Waiting...</span>
                    </>
                  )}
                </div>
              </div>
            </div>

            {isAutoStarting && (
              <div className="mt-4 pt-4 border-t">
                <div className="text-center mb-2">
                  <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
                    <Timer className="size-4" />
                    <span>Starting in {countdown}s</span>
                  </div>
                </div>
                <Progress value={(countdown / 10) * 100} className="h-1" />
              </div>
            )}
          </CardContent>
        </Card>

        {/* Ready Button */}
        {!isPlayerReady && (
          <Button
            onClick={handlePlayerReady}
            size="lg"
            className="w-full"
          >
            I&apos;m Ready
          </Button>
        )}

        {isPlayerReady && isOpponentReady && (
          <div className="text-center text-sm text-green-500">
            Both players ready! Starting...
          </div>
        )}
      </motion.div>
    </div>
  );
}
