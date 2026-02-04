"use client";

import { useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Trophy, Zap, Target, DollarSign, Timer, Eye } from 'lucide-react';
import { GameMode } from '@/types/game';

interface RoundTransitionScreenProps {
  roundNumber: number;
  totalRounds: number;
  nextMode: GameMode;
  player1: { username: string; avatar: string; roundsWon: number };
  player2: { username: string; avatar: string; roundsWon: number };
  lastRoundWinner?: 'player1' | 'player2' | 'tie';
  onContinue: () => void;
}

const getModeInfo = (mode: GameMode) => {
  switch (mode) {
    case 'timeAttack':
      return {
        name: 'Time Attack',
        icon: Zap,
        color: 'purple',
        description: '15s per question, quick thinking!',
      };
    case 'moneyDrop':
      return {
        name: 'Money Drop',
        icon: DollarSign,
        color: 'green',
        description: 'Bet $1M wisely across answers',
      };
    case 'categories':
      return {
        name: 'Categories',
        icon: Target,
        color: 'blue',
        description: 'Strategic category selection',
      };
    case 'countdown':
      return {
        name: 'Countdown',
        icon: Timer,
        color: 'orange',
        description: 'Type as many answers as you can!',
      };
    case 'clues':
      return {
        name: 'Clue Game',
        icon: Eye,
        color: 'indigo',
        description: 'Guess with fewer clues for more points',
      };
    case 'survival':
      return {
        name: 'Survival',
        icon: Target,
        color: 'red',
        description: 'Stay alive as long as you can!',
      };
    case 'buzzer':
      return {
        name: 'Buzzer Battle',
        icon: Zap,
        color: 'yellow',
        description: 'Be the fastest to buzz in!',
      };
    case 'footballJeopardy':
      return {
        name: 'Football Jeopardy',
        icon: Target,
        color: 'blue',
        description: 'Choose your category wisely!',
      };
    case 'trueFalse':
      return {
        name: 'True or False',
        icon: Target,
        color: 'cyan',
        description: 'Quick true/false decisions!',
      };
    case 'emojiGuess':
      return {
        name: 'Emoji Guess',
        icon: Eye,
        color: 'pink',
        description: 'Decode the emoji clues!',
      };
    case 'putInOrder':
      return {
        name: 'Put In Order',
        icon: Target,
        color: 'teal',
        description: 'Arrange items in the correct order!',
      };
  }
};

export function RoundTransitionScreen({
  roundNumber,
  totalRounds,
  nextMode,
  player1,
  player2,
  lastRoundWinner,
  onContinue,
}: RoundTransitionScreenProps) {
  const modeInfo = getModeInfo(nextMode);
  const Icon = modeInfo.icon;

  useEffect(() => {
    // Auto-continue after 4 seconds
    const timer = setTimeout(() => {
      onContinue();
    }, 4000);

    return () => clearTimeout(timer);
  }, [onContinue]);

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-md space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
        {/* Round Header */}
        <div className="text-center">
          <h1 className="text-3xl mb-2">Round {roundNumber}/{totalRounds}</h1>
          <p className="text-muted-foreground">
            First to {Math.ceil(totalRounds / 2)} rounds wins
          </p>
        </div>

        {/* Last Round Result */}
        {lastRoundWinner && roundNumber > 1 && (
          <Card className="border-2 border-primary/30">
            <CardContent className="pt-4 pb-4">
              <div className="text-center">
                <p className="text-sm text-muted-foreground mb-2">
                  {lastRoundWinner === 'tie' ? `Round ${roundNumber - 1} Result` : `Round ${roundNumber - 1} Winner`}
                </p>
                {lastRoundWinner === 'tie' ? (
                  <div className="flex items-center justify-center gap-3">
                    <span className="text-2xl">{player1.avatar}</span>
                    <span className="text-lg text-muted-foreground">Tie</span>
                    <span className="text-2xl">{player2.avatar}</span>
                  </div>
                ) : (
                  <div className="flex items-center justify-center gap-2">
                    <span className="text-2xl">
                      {lastRoundWinner === 'player1' ? player1.avatar : player2.avatar}
                    </span>
                    <span className="text-lg">
                      {lastRoundWinner === 'player1' ? player1.username : player2.username}
                    </span>
                    <Trophy className="size-5 text-yellow-500" />
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Score Display */}
        <Card>
          <CardContent className="pt-4 pb-4">
            <div className="grid grid-cols-3 gap-3 items-center">
              {/* Player 1 */}
              <div className="text-center">
                <div className="text-3xl mb-1">{player1.avatar}</div>
                <div className="text-sm mb-1">{player1.username}</div>
                <Badge variant={player1.roundsWon >= Math.ceil(totalRounds / 2) ? 'default' : 'outline'}>
                  {player1.roundsWon} {player1.roundsWon === 1 ? 'win' : 'wins'}
                </Badge>
              </div>

              {/* VS */}
              <div className="text-center">
                <div className="text-2xl text-muted-foreground">VS</div>
              </div>

              {/* Player 2 */}
              <div className="text-center">
                <div className="text-3xl mb-1">{player2.avatar}</div>
                <div className="text-sm mb-1">{player2.username}</div>
                <Badge variant={player2.roundsWon >= Math.ceil(totalRounds / 2) ? 'default' : 'outline'}>
                  {player2.roundsWon} {player2.roundsWon === 1 ? 'win' : 'wins'}
                </Badge>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Next Game Mode */}
        <Card className={`border-2 border-${modeInfo.color}-500/30 bg-gradient-to-br from-${modeInfo.color}-500/5 to-${modeInfo.color}-500/10`}>
          <CardContent className="pt-6 pb-6">
            <div className="text-center space-y-3">
              <div className={`inline-flex size-16 items-center justify-center rounded-xl bg-${modeInfo.color}-500/20`}>
                <Icon className={`size-8 text-${modeInfo.color}-500`} />
              </div>
              <div>
                <h3 className="mb-1">Next Mode: {modeInfo.name}</h3>
                <p className="text-sm text-muted-foreground">{modeInfo.description}</p>
              </div>
              <Badge className={`bg-${modeInfo.color}-500 text-white`}>
                Get Ready!
              </Badge>
            </div>
          </CardContent>
        </Card>

        {/* Loading indicator */}
        <div className="text-center">
          <p className="text-sm text-muted-foreground">Starting in a moment...</p>
        </div>
      </div>
    </div>
  );
}
