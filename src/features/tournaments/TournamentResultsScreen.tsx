import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Trophy, TrendingUp } from 'lucide-react';

interface TournamentResultsScreenProps {
  won: boolean;
  playerScore: number;
  opponentScore: number;
  opponentName: string;
  opponentAvatar: string;
  currentPlayerAvatar: string;
  tournamentName: string;
  round: string;
  onContinue: () => void;
  onExit: () => void;
  /** Number of questions the player answered correctly */
  correctAnswers?: number;
  /** Total number of questions in the match */
  totalQuestions?: number;
  /** Maximum possible score (used for accuracy calculation) */
  maxScore?: number;
  /** Total time in seconds the player spent answering */
  totalTimeSeconds?: number;
  /** Number of questions the player answered (for average speed) */
  answeredCount?: number;
}

const getNextRound = (currentRound: string): string => {
  const roundProgression: Record<string, string> = {
    'Round of 64': 'Round of 32',
    'Round of 32': 'Round of 16',
    'Round of 16': 'Quarter Finals',
    'Quarter Finals': 'Semi Finals',
    'Semi Finals': 'Finals',
    'Finals': 'Champion',
  };
  return roundProgression[currentRound] ?? 'Next Round';
};

export function TournamentResultsScreen({
  won,
  playerScore,
  opponentScore,
  opponentName,
  opponentAvatar,
  currentPlayerAvatar,
  tournamentName,
  round,
  onContinue,
  onExit,
  correctAnswers = 0,
  totalQuestions = 10,
  maxScore = 10000,
  totalTimeSeconds = 0,
  answeredCount = totalQuestions,
}: TournamentResultsScreenProps) {
  const scoreDifference = Math.abs(playerScore - opponentScore);

  // Compute derived stats
  const accuracy = totalQuestions > 0 ? Math.floor((correctAnswers / totalQuestions) * 100) : 0;
  const averageSpeed = answeredCount > 0 ? (totalTimeSeconds / answeredCount).toFixed(1) : '0.0';

  return (
    <div className="min-h-screen bg-background pb-20 flex items-center justify-center p-4">
      <div className="w-full max-w-md space-y-4">
        {/* Result Header */}
        <Card className={`border-2 bg-gradient-to-br ${
          won 
            ? 'from-green-500/10 to-emerald-500/10 border-green-500/30'
            : 'from-red-500/10 to-orange-500/10 border-red-500/30'
        }`}>
          <CardContent className="pt-8 pb-8 text-center">
            <div className="text-6xl mb-4">
              {won ? '🏆' : '😔'}
            </div>
            <div className="text-3xl mb-2">
              {won ? 'Victory!' : 'Defeated'}
            </div>
            <div className="text-sm text-muted-foreground mb-4">
              {tournamentName} - {round}
            </div>
            <Badge variant={won ? "default" : "outline"} className="text-lg px-4 py-1">
              {won ? 'You advance to the next round!' : 'Tournament Over'}
            </Badge>
          </CardContent>
        </Card>

        {/* Score Comparison */}
        <Card>
          <CardContent className="pt-6 pb-6">
            <div className="grid grid-cols-3 gap-4 items-center">
              {/* Player */}
              <div className="text-center">
                <div className="text-3xl mb-2">{currentPlayerAvatar}</div>
                <div className="text-sm text-muted-foreground mb-1">You</div>
                <div className="text-2xl text-primary">{playerScore}</div>
                {won && (
                  <div className="mt-1">
                    <TrendingUp className="size-4 text-green-500 inline" />
                  </div>
                )}
              </div>

              {/* VS */}
              <div className="text-center">
                <div className="text-xs text-muted-foreground mb-1">Final Score</div>
                <div className="text-lg">VS</div>
                <div className="text-xs text-muted-foreground mt-1">
                  {scoreDifference} point difference
                </div>
              </div>

              {/* Opponent */}
              <div className="text-center">
                <div className="text-3xl mb-2">{opponentAvatar}</div>
                <div className="text-sm text-muted-foreground mb-1 truncate">{opponentName}</div>
                <div className="text-2xl">{opponentScore}</div>
                {!won && (
                  <div className="mt-1">
                    <TrendingUp className="size-4 text-green-500 inline" />
                  </div>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Stats */}
        <Card>
          <CardContent className="pt-4 pb-4">
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="text-sm text-muted-foreground">Questions Answered</div>
                <div className="text-sm">{correctAnswers}/{totalQuestions}</div>
              </div>
              <div className="flex items-center justify-between">
                <div className="text-sm text-muted-foreground">Your Accuracy</div>
                <div className="text-sm">{accuracy}%</div>
              </div>
              <div className="flex items-center justify-between">
                <div className="text-sm text-muted-foreground">Average Speed</div>
                <div className="text-sm">{averageSpeed}s per question</div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* What's Next */}
        {won && (
          <Card className="bg-gradient-to-br from-yellow-500/10 to-orange-500/10 border-yellow-500/20">
            <CardContent className="pt-4 pb-4">
              <div className="flex items-start gap-3">
                <Trophy className="size-5 text-yellow-500 shrink-0 mt-0.5" />
                <div className="text-sm">
                  <div className="mb-1">Next Round: {getNextRound(round)}</div>
                  <div className="text-xs text-muted-foreground">
                    Get ready for your next match. The competition gets tougher!
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Action Buttons */}
        <div className="space-y-2">
          {won ? (
            <Button onClick={onContinue} className="w-full" size="lg">
              Continue to Next Round
            </Button>
          ) : (
            <Button onClick={onExit} className="w-full" size="lg" variant="outline">
              Back to Tournaments
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
