"use client";

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Trophy, Clock, Check, Loader2, Award, TrendingUp } from 'lucide-react';
import { motion } from 'motion/react';
import { GameMode } from '@/types/game';
import { InlineAvatar as AvatarDisplay } from '@/components/InlineAvatar';

interface RoundResultScreenProps {
  roundNumber: number;
  totalRounds: number;
  mode: GameMode;
  playerScore: number;
  opponentScore: number;
  playerUsername: string;
  opponentUsername: string;
  playerAvatar: string;
  opponentAvatar: string;
  playerRoundsWon: number;
  opponentRoundsWon: number;
  isRanked: boolean;
  onReady: () => void;
  opponentLeft?: boolean;
  rankPointsGained?: number;
}

const getModeDisplayName = (mode: GameMode): string => {
  const names: Record<GameMode, string> = {
    timeAttack: 'Time Attack',
    moneyDrop: 'Money Drop',
    categories: 'Categories',
    countdown: 'Countdown',
    clues: 'Clue Game',
    survival: 'Survival',
    buzzer: 'Buzzer Battle',
    footballJeopardy: 'Football Jeopardy',
    trueFalse: 'True or False',
    emojiGuess: 'Emoji Guess',
    putInOrder: 'Put In Order',
  };
  return names[mode];
};

const getModeIcon = (mode: GameMode): string => {
  switch (mode) {
    case 'moneyDrop':
      return '💰';
    case 'timeAttack':
      return '⚡';
    case 'categories':
      return '🎯';
    case 'countdown':
      return '⏱️';
    case 'clues':
      return '👁️';
    case 'survival':
      return '❤️';
    case 'buzzer':
      return '🔔';
    case 'footballJeopardy':
      return '🏆';
    case 'trueFalse':
      return '✓';
    case 'emojiGuess':
      return '😊';
    case 'putInOrder':
      return '📊';
    default: {
      // Exhaustive check: if GameMode is extended, this will fail at compile time
      void (mode satisfies never);
      return '❓';
    }
  }
};

export function RoundResultScreen({
  roundNumber,
  totalRounds,
  mode,
  playerScore,
  opponentScore,
  playerUsername,
  opponentUsername,
  playerAvatar,
  opponentAvatar,
  playerRoundsWon,
  opponentRoundsWon,
  isRanked,
  onReady,
  opponentLeft = false,
  rankPointsGained,
}: RoundResultScreenProps) {
  const [isPlayerReady, setIsPlayerReady] = useState(false);
  const [isOpponentReady, setIsOpponentReady] = useState(false);
  const [countdown, setCountdown] = useState(10);

  const playerWon = playerScore > opponentScore;
  const isDraw = playerScore === opponentScore;
  const isAutoStarting = (isPlayerReady || isOpponentReady) && !(isPlayerReady && isOpponentReady);

  useEffect(() => {
    if (opponentLeft) {
      return;
    }

    let innerTimer: ReturnType<typeof setTimeout> | undefined;

    // Simulate opponent ready state (in real app, this would come from backend)
    const opponentReadyTimer = setTimeout(() => {
      const randomDelay = Math.random() * 3000 + 1000; // 1-4 seconds
      innerTimer = setTimeout(() => {
        setIsOpponentReady(true);
      }, randomDelay);
    }, 500);

    return () => {
      clearTimeout(opponentReadyTimer);
      if (innerTimer) {
        clearTimeout(innerTimer);
      }
    };
  }, [opponentLeft]);

  useEffect(() => {
    if (opponentLeft) {
      return;
    }

    if (isPlayerReady && isOpponentReady) {
      // Both ready, proceed immediately
      const timer = setTimeout(() => {
        onReady();
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [isPlayerReady, isOpponentReady, onReady, opponentLeft]);

  useEffect(() => {
    if (opponentLeft || (isPlayerReady && isOpponentReady)) {
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
  }, [isAutoStarting, opponentLeft, isPlayerReady, isOpponentReady]);

  // Separate effect to trigger onReady when countdown reaches 0
  useEffect(() => {
    if (countdown === 0 && isAutoStarting && !opponentLeft) {
      onReady();
    }
  }, [countdown, isAutoStarting, opponentLeft, onReady]);

  const handlePlayerReady = () => {
    setIsPlayerReady(true);
  };

  if (opponentLeft) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="max-w-md w-full"
        >
          <Card className="border-2 border-yellow-500/20 bg-gradient-to-br from-yellow-500/5 to-orange-500/5">
            <CardContent className="pt-6 pb-6 text-center">
              <div className="mb-6">
                <Trophy className="size-20 text-yellow-500 mx-auto mb-4" />
                <h2 className="mb-2">Victory!</h2>
                <p className="text-muted-foreground">
                  Your opponent left the match
                </p>
              </div>

              <div className="space-y-4">
                <div className="bg-secondary rounded-lg p-4">
                  <div className="flex items-center justify-center gap-2 mb-2">
                    <AvatarDisplay avatar={playerAvatar} alt={playerUsername} size="lg" />
                    <h3>{playerUsername}</h3>
                  </div>
                  <div className="text-sm text-muted-foreground">
                    Rounds Won: {playerRoundsWon} - {opponentRoundsWon}
                  </div>
                </div>

                {isRanked && rankPointsGained !== undefined && (
                  <div className="bg-primary/10 border border-primary/20 rounded-lg p-4">
                    <div className="flex items-center justify-center gap-2 text-primary mb-2">
                      <Award className="size-5" />
                      <span>Rank Points</span>
                    </div>
                    <div className="text-2xl flex items-center justify-center gap-2">
                      <TrendingUp className="size-6 text-green-500" />
                      <span className="text-green-500">+{rankPointsGained}</span>
                    </div>
                  </div>
                )}

                <Button onClick={onReady} size="lg" className="w-full">
                  Continue
                </Button>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    );
  }

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
          <div className="flex items-center justify-center gap-2 mb-2">
            <span className="text-2xl">{getModeIcon(mode)}</span>
            <h2>{getModeDisplayName(mode)}</h2>
          </div>
        </div>

        {/* Winner Card */}
        <Card className={`border-2 ${playerWon ? 'border-green-500/50 bg-gradient-to-br from-green-500/5 to-emerald-500/5' : isDraw ? 'border-yellow-500/50 bg-gradient-to-br from-yellow-500/5 to-orange-500/5' : 'border-red-500/50 bg-gradient-to-br from-red-500/5 to-orange-500/5'}`}>
          <CardContent className="pt-6 pb-6">
            <div className="text-center mb-4">
              {isDraw ? (
                <>
                  <div className="text-4xl mb-2">🤝</div>
                  <h3>It&apos;s a Draw!</h3>
                </>
              ) : (
                <>
                  <div className="text-4xl mb-2">
                    {playerWon ? '🏆' : '😔'}
                  </div>
                  <h3>{playerWon ? 'You Won!' : 'Opponent Won!'}</h3>
                </>
              )}
            </div>

            {/* Scores */}
            <div className="space-y-3">
              <div className={`bg-secondary rounded-lg p-3 ${playerWon ? 'ring-2 ring-green-500/50' : ''}`}>
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <AvatarDisplay avatar={playerAvatar} alt={playerUsername} />
                    <span>{playerUsername}</span>
                    {playerWon && <Trophy className="size-4 text-yellow-500" />}
                  </div>
                  <div className="text-xl">
                    {mode === 'moneyDrop' ? `$${playerScore.toLocaleString()}` : `${playerScore} pts`}
                  </div>
                </div>
              </div>

              <div className={`bg-secondary rounded-lg p-3 ${!playerWon && !isDraw ? 'ring-2 ring-red-500/50' : ''}`}>
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <AvatarDisplay avatar={opponentAvatar} alt={opponentUsername} />
                    <span>{opponentUsername}</span>
                    {!playerWon && !isDraw && <Trophy className="size-4 text-yellow-500" />}
                  </div>
                  <div className="text-xl">
                    {mode === 'moneyDrop' ? `$${opponentScore.toLocaleString()}` : `${opponentScore} pts`}
                  </div>
                </div>
              </div>
            </div>

            {/* Match Score */}
            <div className="mt-4 pt-4 border-t">
              <div className="text-center text-sm text-muted-foreground mb-2">
                Match Score
              </div>
              <div className="flex items-center justify-center gap-4">
                <div className="text-center">
                  <div className="text-2xl">{playerRoundsWon}</div>
                  <div className="text-xs text-muted-foreground">You</div>
                </div>
                <div className="text-muted-foreground">-</div>
                <div className="text-center">
                  <div className="text-2xl">{opponentRoundsWon}</div>
                  <div className="text-xs text-muted-foreground">Opponent</div>
                </div>
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
                  <AvatarDisplay avatar={playerAvatar} alt={playerUsername} size="sm" />
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
                  <AvatarDisplay avatar={opponentAvatar} alt={opponentUsername} size="sm" />
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
                    <Clock className="size-4" />
                    <span>Auto-starting in {countdown}s</span>
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
            Ready for Next Round
          </Button>
        )}
      </motion.div>
    </div>
  );
}
